import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma/client';
import { format } from 'date-fns';

export class ExcelExportService {
  /**
   * Export projects to Excel
   */
  async exportProjects(filters?: {
    division?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Buffer> {
    const projects = await prisma.project.findMany({
      where: {
        ...(filters?.division && { division: filters.division as any }),
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.startDate && { startDate: { gte: filters.startDate } }),
        ...(filters?.endDate && { endDate: { lte: filters.endDate } }),
      },
      include: {
        foreman: true,
        phases: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    const data = projects.map(project => ({
      projectCode: project.projectCode,
      name: project.name,
      type: project.type,
      division: project.division,
      status: project.status,
      contractAmount: Number(project.contractAmount),
      startDate: format(project.startDate, 'yyyy-MM-dd'),
      endDate: format(project.endDate, 'yyyy-MM-dd'),
      actualStartDate: project.actualStartDate ? format(project.actualStartDate, 'yyyy-MM-dd') : '',
      actualEndDate: project.actualEndDate ? format(project.actualEndDate, 'yyyy-MM-dd') : '',
      clientName: project.clientName,
      clientContact: project.clientContact || '',
      foremanName: project.foreman ? `${project.foreman.firstName} ${project.foreman.lastName}` : '',
      crewSize: project.crewSize,
      phaseCount: project.phases.length,
      address: project.address || '',
      notes: project.notes || '',
      createdAt: format(project.createdAt, 'yyyy-MM-dd'),
      updatedAt: format(project.updatedAt, 'yyyy-MM-dd'),
    }));

    return this.createWorkbook(data, 'Projects');
  }

  /**
   * Export project phases to Excel
   */
  async exportPhases(projectId?: string): Promise<Buffer> {
    const phases = await prisma.projectPhase.findMany({
      where: projectId ? { projectId } : {},
      include: {
        project: true,
        assignments: {
          include: { employee: true },
        },
      },
      orderBy: [
        { projectId: 'asc' },
        { phaseNumber: 'asc' },
      ],
    });

    const data = phases.map(phase => ({
      projectCode: phase.project.projectCode,
      projectName: phase.project.name,
      phaseNumber: phase.phaseNumber,
      name: phase.name,
      division: phase.division,
      status: phase.status,
      startDate: format(phase.startDate, 'yyyy-MM-dd'),
      endDate: format(phase.endDate, 'yyyy-MM-dd'),
      actualStartDate: phase.actualStartDate ? format(phase.actualStartDate, 'yyyy-MM-dd') : '',
      actualEndDate: phase.actualEndDate ? format(phase.actualEndDate, 'yyyy-MM-dd') : '',
      duration: phase.duration,
      progressPercentage: phase.progressPercentage,
      laborHours: phase.laborHours,
      requiredCrewSize: phase.requiredCrewSize,
      requiredForeman: phase.requiredForeman ? 'Yes' : 'No',
      requiredJourneymen: phase.requiredJourneymen,
      requiredApprentices: phase.requiredApprentices,
      assignedEmployees: phase.assignments.length,
      dependencies: phase.dependencies.join(', '),
      lastUpdated: format(phase.lastUpdated, 'yyyy-MM-dd'),
    }));

    return this.createWorkbook(data, 'Project Phases');
  }

  /**
   * Export employees to Excel
   */
  async exportEmployees(division?: string): Promise<Buffer> {
    const employees = await prisma.employee.findMany({
      where: division ? { division: division as any } : {},
      include: {
        assignments: true,
      },
      orderBy: [
        { division: 'asc' },
        { employeeType: 'asc' },
        { lastName: 'asc' },
      ],
    });

    const data = employees.map(emp => ({
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      division: emp.division,
      employeeType: emp.employeeType,
      hourlyRate: Number(emp.hourlyRate),
      overtimeRate: Number(emp.overtimeRate),
      maxHoursPerWeek: emp.maxHoursPerWeek,
      skills: emp.skills.join(', '),
      certifications: emp.certifications.join(', '),
      availabilityStart: format(emp.availabilityStart, 'yyyy-MM-dd'),
      availabilityEnd: emp.availabilityEnd ? format(emp.availabilityEnd, 'yyyy-MM-dd') : '',
      isActive: emp.isActive ? 'Yes' : 'No',
      totalAssignments: emp.assignments.length,
      createdAt: format(emp.createdAt, 'yyyy-MM-dd'),
      updatedAt: format(emp.updatedAt, 'yyyy-MM-dd'),
    }));

    return this.createWorkbook(data, 'Employees');
  }

  /**
   * Export capacity report to Excel
   */
  async exportCapacityReport(
    division: string,
    startDate: Date,
    endDate: Date
  ): Promise<Buffer> {
    // Get capacity snapshots
    const snapshots = await prisma.capacitySnapshot.findMany({
      where: {
        division: division as any,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    const data = snapshots.map(snapshot => ({
      date: format(snapshot.date, 'yyyy-MM-dd'),
      division: snapshot.division,
      totalEmployees: snapshot.totalEmployees,
      availableHours: snapshot.availableHours,
      scheduledHours: snapshot.scheduledHours,
      remainingHours: snapshot.availableHours - snapshot.scheduledHours,
      utilizationPercentage: snapshot.utilizationPercentage,
      foremanCount: snapshot.foremanCount,
      journeymanCount: snapshot.journeymanCount,
      apprenticeCount: snapshot.apprenticeCount,
      projectCount: snapshot.projectCount,
      criticalProjects: snapshot.criticalProjects.length,
      generatedAt: format(snapshot.generatedAt, 'yyyy-MM-dd HH:mm'),
    }));

    return this.createWorkbook(data, 'Capacity Report');
  }

  /**
   * Export financial report to Excel
   */
  async exportFinancialReport(projectId?: string): Promise<Buffer> {
    const where = projectId ? { projectId } : {};

    const [scheduleValues, expenses] = await Promise.all([
      prisma.scheduleOfValues.findMany({
        where,
        include: { project: true },
        orderBy: [
          { projectId: 'asc' },
          { lineNumber: 'asc' },
        ],
      }),
      prisma.projectExpense.findMany({
        where,
        include: { project: true },
        orderBy: [
          { projectId: 'asc' },
          { date: 'asc' },
        ],
      }),
    ]);

    // Create workbook with multiple sheets
    const workbook = XLSX.utils.book_new();

    // Schedule of Values sheet
    const sovData = scheduleValues.map(sov => ({
      projectCode: sov.project.projectCode,
      projectName: sov.project.name,
      lineNumber: sov.lineNumber,
      description: sov.description,
      value: Number(sov.value),
      billingPercentage: sov.billingPercentage,
      billingDate: format(sov.billingDate, 'yyyy-MM-dd'),
      actualBillingDate: sov.actualBillingDate ? format(sov.actualBillingDate, 'yyyy-MM-dd') : '',
      invoiceNumber: sov.invoiceNumber || '',
      status: sov.status,
      notes: sov.notes || '',
    }));

    const sovSheet = XLSX.utils.json_to_sheet(sovData);
    XLSX.utils.book_append_sheet(workbook, sovSheet, 'Schedule of Values');

    // Expenses sheet
    const expenseData = expenses.map(exp => ({
      projectCode: exp.project.projectCode,
      projectName: exp.project.name,
      category: exp.category,
      description: exp.description,
      amount: Number(exp.amount),
      date: format(exp.date, 'yyyy-MM-dd'),
      vendorName: exp.vendorName || '',
      invoiceNumber: exp.invoiceNumber || '',
      createdAt: format(exp.createdAt, 'yyyy-MM-dd'),
    }));

    const expenseSheet = XLSX.utils.json_to_sheet(expenseData);
    XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expenses');

    // Convert to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.from(buffer);
  }

  /**
   * Generate template Excel file
   */
  generateTemplate(templateType: 'projects' | 'phases' | 'employees'): Buffer {
    const templates = {
      projects: [
        {
          projectCode: 'PROJ-001',
          name: 'Sample Project',
          type: 'MULTIFAMILY',
          division: 'PLUMBING_MULTIFAMILY',
          status: 'QUOTED',
          contractAmount: 100000,
          startDate: '2025-01-01',
          endDate: '2025-03-31',
          clientName: 'Sample Client',
          clientContact: 'contact@example.com',
          foremanName: 'John Smith',
          crewSize: 5,
          address: '123 Main St',
          notes: 'Sample notes',
        },
      ],
      phases: [
        {
          projectCode: 'PROJ-001',
          phaseNumber: 1,
          name: 'Rough-in Phase',
          division: 'PLUMBING_MULTIFAMILY',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
          duration: 30,
          laborHours: 240,
          requiredCrewSize: 5,
          requiredForeman: true,
          requiredJourneymen: 3,
          requiredApprentices: 1,
        },
      ],
      employees: [
        {
          employeeCode: 'EMP-001',
          firstName: 'John',
          lastName: 'Smith',
          division: 'PLUMBING_MULTIFAMILY',
          employeeType: 'FOREMAN',
          hourlyRate: 50,
          overtimeRate: 75,
          maxHoursPerWeek: 40,
          skills: 'Plumbing, HVAC',
          certifications: 'Licensed Plumber',
          availabilityStart: '2025-01-01',
          availabilityEnd: '',
        },
      ],
    };

    const data = templates[templateType];
    return this.createWorkbook(data, `${templateType}_template`);
  }

  /**
   * Create Excel workbook from data
   */
  private createWorkbook(data: any[], sheetName: string): Buffer {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Auto-size columns
    const colWidths = this.calculateColumnWidths(data);
    worksheet['!cols'] = colWidths;

    // Add filters
    if (data.length > 0) {
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.from(buffer);
  }

  /**
   * Calculate column widths based on data
   */
  private calculateColumnWidths(data: any[]): { wch: number }[] {
    if (data.length === 0) return [];

    const headers = Object.keys(data[0]);
    return headers.map(header => {
      const maxLength = Math.max(
        header.length,
        ...data.map(row => String(row[header] || '').length)
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
  }
}