import prisma from '@/lib/prisma/client';
import { startOfWeek, endOfWeek, differenceInWeeks } from 'date-fns';

export interface EmployeeHoursSummary {
  employeeId: string;
  employeeName: string;
  totalAllocatedHours: number;
  totalActualHours: number;
  regularHours: number;
  overtimeHours: number;
  utilizationPercentage: number;
  laborCost: number;
  overtimeCost: number;
}

export interface PhaseLabor {
  phaseId: string;
  phaseName: string;
  plannedHours: number;
  allocatedHours: number;
  actualHours: number;
  laborCost: number;
  variance: number;
  completionPercentage: number;
}

export interface WeeklyCapacity {
  weekStarting: Date;
  totalEmployees: number;
  totalCapacity: number;
  allocatedHours: number;
  actualHours: number;
  availableHours: number;
  utilizationRate: number;
  overtimeHours: number;
}

export class HoursCalculator {
  /**
   * Calculate total hours for an employee in a given period
   */
  static async calculateEmployeeHours(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EmployeeHoursSummary> {
    const [employee, assignments] = await prisma.$transaction([
      prisma.employee.findUnique({
        where: { id: employeeId }
      }),
      prisma.crewAssignment.findMany({
        where: {
          employeeId,
          assignmentDate: {
            gte: startDate,
            lte: endDate
          }
        }
      })
    ]);

    if (!employee) {
      throw new Error('Employee not found');
    }

    const totalAllocatedHours = assignments.reduce((sum, a) => sum + a.hoursAllocated, 0);
    const totalActualHours = assignments.reduce((sum, a) => sum + (a.actualHoursWorked || 0), 0);

    // Calculate weekly breakdown for overtime
    const weeks = Math.ceil(differenceInWeeks(endDate, startDate)) + 1;
    let regularHours = 0;
    let overtimeHours = 0;

    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      const weekEnd = endOfWeek(weekStart);

      const weekAssignments = assignments.filter(a =>
        a.assignmentDate >= weekStart && a.assignmentDate <= weekEnd
      );

      const weekHours = weekAssignments.reduce((sum, a) => sum + (a.actualHoursWorked || a.hoursAllocated), 0);

      if (weekHours > 40) {
        regularHours += 40;
        overtimeHours += weekHours - 40;
      } else {
        regularHours += weekHours;
      }
    }

    const hourlyRate = Number(employee.hourlyRate);
    const overtimeRate = Number(employee.overtimeRate);

    const laborCost = (regularHours * hourlyRate) + (overtimeHours * overtimeRate);
    const regularCost = regularHours * hourlyRate;
    const overtimeCost = overtimeHours * overtimeRate;

    const maxPossibleHours = weeks * employee.maxHoursPerWeek;
    const utilizationPercentage = maxPossibleHours > 0
      ? (totalAllocatedHours / maxPossibleHours) * 100
      : 0;

    return {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      totalAllocatedHours,
      totalActualHours,
      regularHours,
      overtimeHours,
      utilizationPercentage,
      laborCost: regularCost,
      overtimeCost
    };
  }

  /**
   * Calculate labor costs for a phase
   */
  static async calculatePhaseLaborCost(phaseId: string): Promise<PhaseLabor> {
    const [phase, assignments] = await prisma.$transaction([
      prisma.projectPhase.findUnique({
        where: { id: phaseId }
      }),
      prisma.crewAssignment.findMany({
        where: { phaseId },
        include: { employee: true }
      })
    ]);

    if (!phase) {
      throw new Error('Phase not found');
    }

    let totalCost = 0;
    const allocatedHours = assignments.reduce((sum, a) => sum + a.hoursAllocated, 0);
    const actualHours = assignments.reduce((sum, a) => sum + (a.actualHoursWorked || 0), 0);

    // Calculate cost per assignment
    for (const assignment of assignments) {
      const hours = assignment.actualHoursWorked || assignment.hoursAllocated;
      const rate = Number(assignment.employee.hourlyRate);

      // Simple calculation without overtime for phase-level
      totalCost += hours * rate;
    }

    const variance = allocatedHours > 0
      ? ((actualHours - allocatedHours) / allocatedHours) * 100
      : 0;

    const completionPercentage = phase.laborHours > 0
      ? (actualHours / phase.laborHours) * 100
      : 0;

    return {
      phaseId,
      phaseName: phase.name,
      plannedHours: phase.laborHours,
      allocatedHours,
      actualHours,
      laborCost: totalCost,
      variance,
      completionPercentage
    };
  }

  /**
   * Calculate remaining capacity for employees
   */
  static async calculateRemainingCapacity(
    employeeIds: string[],
    startDate: Date,
    endDate: Date
  ) {
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        isActive: true
      }
    });

    const assignments = await prisma.crewAssignment.findMany({
      where: {
        employeeId: { in: employeeIds },
        assignmentDate: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Group assignments by employee
    const assignmentsByEmployee = new Map<string, typeof assignments>();
    assignments.forEach(a => {
      const current = assignmentsByEmployee.get(a.employeeId) || [];
      current.push(a);
      assignmentsByEmployee.set(a.employeeId, current);
    });

    const capacityData = employees.map(employee => {
      const empAssignments = assignmentsByEmployee.get(employee.id) || [];
      const allocatedHours = empAssignments.reduce((sum, a) => sum + a.hoursAllocated, 0);

      const weeks = Math.ceil(differenceInWeeks(endDate, startDate)) + 1;
      const totalCapacity = weeks * employee.maxHoursPerWeek;
      const remainingCapacity = Math.max(0, totalCapacity - allocatedHours);
      const utilizationRate = totalCapacity > 0 ? (allocatedHours / totalCapacity) * 100 : 0;

      return {
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employeeType: employee.employeeType,
        division: employee.division,
        totalCapacity,
        allocatedHours,
        remainingCapacity,
        utilizationRate,
        isAvailable: remainingCapacity > 0
      };
    });

    return capacityData;
  }

  /**
   * Generate utilization report for a division
   */
  static async generateUtilizationReport(
    division: string,
    startDate: Date,
    endDate: Date
  ) {
    const employees = await prisma.employee.findMany({
      where: {
        division,
        isActive: true
      }
    });

    const employeeIds = employees.map(e => e.id);
    const employeeHours = await Promise.all(
      employeeIds.map(id => this.calculateEmployeeHours(id, startDate, endDate))
    );

    const totalAllocated = employeeHours.reduce((sum, e) => sum + e.totalAllocatedHours, 0);
    const totalActual = employeeHours.reduce((sum, e) => sum + e.totalActualHours, 0);
    const totalRegular = employeeHours.reduce((sum, e) => sum + e.regularHours, 0);
    const totalOvertime = employeeHours.reduce((sum, e) => sum + e.overtimeHours, 0);
    const totalLaborCost = employeeHours.reduce((sum, e) => sum + e.laborCost, 0);
    const totalOvertimeCost = employeeHours.reduce((sum, e) => sum + e.overtimeCost, 0);

    const weeks = Math.ceil(differenceInWeeks(endDate, startDate)) + 1;
    const maxCapacity = employees.reduce((sum, e) => sum + (e.maxHoursPerWeek * weeks), 0);
    const overallUtilization = maxCapacity > 0 ? (totalAllocated / maxCapacity) * 100 : 0;

    return {
      division,
      period: { startDate, endDate },
      summary: {
        totalEmployees: employees.length,
        totalAllocatedHours: totalAllocated,
        totalActualHours: totalActual,
        totalRegularHours: totalRegular,
        totalOvertimeHours: totalOvertime,
        totalLaborCost,
        totalOvertimeCost,
        totalCost: totalLaborCost + totalOvertimeCost,
        overallUtilization,
        averageUtilization: employeeHours.reduce((sum, e) => sum + e.utilizationPercentage, 0) / employeeHours.length
      },
      employees: employeeHours,
      topPerformers: employeeHours
        .sort((a, b) => b.totalActualHours - a.totalActualHours)
        .slice(0, 5),
      underutilized: employeeHours
        .filter(e => e.utilizationPercentage < 60)
        .sort((a, b) => a.utilizationPercentage - b.utilizationPercentage)
    };
  }

  /**
   * Calculate weekly capacity and utilization
   */
  static async calculateWeeklyCapacity(
    startDate: Date,
    weeks: number = 4
  ): Promise<WeeklyCapacity[]> {
    const capacityData: WeeklyCapacity[] = [];

    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      const weekEnd = endOfWeek(weekStart);

      const [employees, assignments] = await prisma.$transaction([
        prisma.employee.count({
          where: { isActive: true }
        }),
        prisma.crewAssignment.findMany({
          where: {
            assignmentDate: {
              gte: weekStart,
              lte: weekEnd
            }
          }
        })
      ]);

      const allocatedHours = assignments.reduce((sum, a) => sum + a.hoursAllocated, 0);
      const actualHours = assignments.reduce((sum, a) => sum + (a.actualHoursWorked || 0), 0);

      // Assume 40 hours per week per employee
      const totalCapacity = employees * 40;
      const availableHours = Math.max(0, totalCapacity - allocatedHours);
      const utilizationRate = totalCapacity > 0 ? (allocatedHours / totalCapacity) * 100 : 0;

      // Calculate overtime (hours beyond 40 per employee per week)
      const employeeWeekHours = new Map<string, number>();
      assignments.forEach(a => {
        const current = employeeWeekHours.get(a.employeeId) || 0;
        employeeWeekHours.set(a.employeeId, current + a.hoursAllocated);
      });

      let overtimeHours = 0;
      employeeWeekHours.forEach(hours => {
        if (hours > 40) {
          overtimeHours += hours - 40;
        }
      });

      capacityData.push({
        weekStarting: weekStart,
        totalEmployees: employees,
        totalCapacity,
        allocatedHours,
        actualHours,
        availableHours,
        utilizationRate,
        overtimeHours
      });
    }

    return capacityData;
  }

  /**
   * Calculate variance between allocated and actual hours
   */
  static async calculateHoursVariance(
    phaseId?: string,
    projectId?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const where: any = {};

    if (phaseId) where.phaseId = phaseId;
    if (projectId) {
      const phases = await prisma.projectPhase.findMany({
        where: { projectId },
        select: { id: true }
      });
      where.phaseId = { in: phases.map(p => p.id) };
    }
    if (startDate || endDate) {
      where.assignmentDate = {};
      if (startDate) where.assignmentDate.gte = startDate;
      if (endDate) where.assignmentDate.lte = endDate;
    }

    const assignments = await prisma.crewAssignment.findMany({
      where,
      include: {
        employee: true,
        phase: {
          include: {
            project: true
          }
        }
      }
    });

    const variance = assignments.map(a => ({
      assignmentId: a.id,
      project: a.phase.project.name,
      phase: a.phase.name,
      employee: `${a.employee.firstName} ${a.employee.lastName}`,
      date: a.assignmentDate,
      allocatedHours: a.hoursAllocated,
      actualHours: a.actualHoursWorked || 0,
      variance: (a.actualHoursWorked || 0) - a.hoursAllocated,
      variancePercentage: a.hoursAllocated > 0
        ? (((a.actualHoursWorked || 0) - a.hoursAllocated) / a.hoursAllocated) * 100
        : 0
    }));

    const totalAllocated = variance.reduce((sum, v) => sum + v.allocatedHours, 0);
    const totalActual = variance.reduce((sum, v) => sum + v.actualHours, 0);
    const totalVariance = totalActual - totalAllocated;
    const overallVariancePercentage = totalAllocated > 0
      ? (totalVariance / totalAllocated) * 100
      : 0;

    return {
      assignments: variance,
      summary: {
        totalAssignments: variance.length,
        totalAllocatedHours: totalAllocated,
        totalActualHours: totalActual,
        totalVariance,
        overallVariancePercentage,
        overAllocated: variance.filter(v => v.variance < -1).length,
        underAllocated: variance.filter(v => v.variance > 1).length,
        onTarget: variance.filter(v => Math.abs(v.variance) <= 1).length
      }
    };
  }
}