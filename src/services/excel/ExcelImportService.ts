import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

// Define schemas for different import types
const ProjectImportSchema = z.object({
  projectCode: z.string(),
  name: z.string(),
  type: z.enum(['MULTIFAMILY', 'COMMERCIAL', 'CUSTOM_HOME']),
  division: z.enum([
    'PLUMBING_MULTIFAMILY',
    'PLUMBING_COMMERCIAL',
    'PLUMBING_CUSTOM',
    'HVAC_MULTIFAMILY',
    'HVAC_COMMERCIAL',
    'HVAC_CUSTOM',
  ]),
  status: z.enum(['QUOTED', 'AWARDED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
  contractAmount: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  clientName: z.string(),
  clientContact: z.string().optional(),
  foremanName: z.string().optional(),
  crewSize: z.number().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

const PhaseImportSchema = z.object({
  projectCode: z.string(),
  phaseNumber: z.number(),
  name: z.string(),
  division: z.enum([
    'PLUMBING_MULTIFAMILY',
    'PLUMBING_COMMERCIAL',
    'PLUMBING_CUSTOM',
    'HVAC_MULTIFAMILY',
    'HVAC_COMMERCIAL',
    'HVAC_CUSTOM',
  ]),
  startDate: z.string(),
  endDate: z.string(),
  duration: z.number(),
  laborHours: z.number(),
  requiredCrewSize: z.number(),
  requiredForeman: z.boolean(),
  requiredJourneymen: z.number(),
  requiredApprentices: z.number(),
});

const EmployeeImportSchema = z.object({
  employeeCode: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  division: z.enum([
    'PLUMBING_MULTIFAMILY',
    'PLUMBING_COMMERCIAL',
    'PLUMBING_CUSTOM',
    'HVAC_MULTIFAMILY',
    'HVAC_COMMERCIAL',
    'HVAC_CUSTOM',
  ]),
  employeeType: z.enum(['FOREMAN', 'JOURNEYMAN', 'APPRENTICE']),
  hourlyRate: z.number(),
  overtimeRate: z.number(),
  maxHoursPerWeek: z.number().default(40),
  skills: z.string().optional(),
  certifications: z.string().optional(),
  availabilityStart: z.string(),
  availabilityEnd: z.string().optional(),
});

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: ImportError[];
  data?: any[];
}

interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

export class ExcelImportService {
  /**
   * Import projects from Excel file
   */
  async importProjects(buffer: Buffer): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
      errors: [],
      data: [],
    };

    try {
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      result.totalRows = jsonData.length;

      for (let i = 0; i < jsonData.length; i++) {
        try {
          const row = jsonData[i] as any;
          const validatedData = ProjectImportSchema.parse(row);

          // Check if project already exists
          const existingProject = await prisma.project.findUnique({
            where: { projectCode: validatedData.projectCode },
          });

          if (existingProject) {
            // Update existing project
            const updated = await prisma.project.update({
              where: { id: existingProject.id },
              data: {
                name: validatedData.name,
                type: validatedData.type,
                division: validatedData.division,
                status: validatedData.status,
                contractAmount: validatedData.contractAmount,
                startDate: new Date(validatedData.startDate),
                endDate: new Date(validatedData.endDate),
                clientName: validatedData.clientName,
                clientContact: validatedData.clientContact,
                crewSize: validatedData.crewSize || 0,
                address: validatedData.address,
                notes: validatedData.notes,
              },
            });
            result.data?.push(updated);
          } else {
            // Create new project
            const created = await prisma.project.create({
              data: {
                projectCode: validatedData.projectCode,
                name: validatedData.name,
                type: validatedData.type,
                division: validatedData.division,
                status: validatedData.status,
                contractAmount: validatedData.contractAmount,
                startDate: new Date(validatedData.startDate),
                endDate: new Date(validatedData.endDate),
                clientName: validatedData.clientName,
                clientContact: validatedData.clientContact,
                crewSize: validatedData.crewSize || 0,
                address: validatedData.address,
                notes: validatedData.notes,
                createdById: 'system', // Would use actual user ID
                modifiedById: 'system',
              },
            });
            result.data?.push(created);
          }

          result.successfulRows++;
        } catch (error) {
          result.failedRows++;
          result.errors.push({
            row: i + 2, // +2 for header and 0-index
            message: error instanceof Error ? error.message : 'Unknown error',
            data: jsonData[i],
          });
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        row: 0,
        message: `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  /**
   * Import project phases from Excel file
   */
  async importPhases(buffer: Buffer): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
      errors: [],
      data: [],
    };

    try {
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      result.totalRows = jsonData.length;

      for (let i = 0; i < jsonData.length; i++) {
        try {
          const row = jsonData[i] as any;
          const validatedData = PhaseImportSchema.parse(row);

          // Find the project
          const project = await prisma.project.findUnique({
            where: { projectCode: validatedData.projectCode },
          });

          if (!project) {
            throw new Error(`Project with code ${validatedData.projectCode} not found`);
          }

          // Check if phase already exists
          const existingPhase = await prisma.projectPhase.findFirst({
            where: {
              projectId: project.id,
              phaseNumber: validatedData.phaseNumber,
            },
          });

          if (existingPhase) {
            // Update existing phase
            const updated = await prisma.projectPhase.update({
              where: { id: existingPhase.id },
              data: {
                name: validatedData.name,
                division: validatedData.division,
                startDate: new Date(validatedData.startDate),
                endDate: new Date(validatedData.endDate),
                duration: validatedData.duration,
                laborHours: validatedData.laborHours,
                requiredCrewSize: validatedData.requiredCrewSize,
                requiredForeman: validatedData.requiredForeman,
                requiredJourneymen: validatedData.requiredJourneymen,
                requiredApprentices: validatedData.requiredApprentices,
              },
            });
            result.data?.push(updated);
          } else {
            // Create new phase
            const created = await prisma.projectPhase.create({
              data: {
                projectId: project.id,
                phaseNumber: validatedData.phaseNumber,
                name: validatedData.name,
                division: validatedData.division,
                startDate: new Date(validatedData.startDate),
                endDate: new Date(validatedData.endDate),
                duration: validatedData.duration,
                laborHours: validatedData.laborHours,
                requiredCrewSize: validatedData.requiredCrewSize,
                requiredForeman: validatedData.requiredForeman,
                requiredJourneymen: validatedData.requiredJourneymen,
                requiredApprentices: validatedData.requiredApprentices,
                updatedBy: 'system',
              },
            });
            result.data?.push(created);
          }

          result.successfulRows++;
        } catch (error) {
          result.failedRows++;
          result.errors.push({
            row: i + 2,
            message: error instanceof Error ? error.message : 'Unknown error',
            data: jsonData[i],
          });
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        row: 0,
        message: `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  /**
   * Import employees from Excel file
   */
  async importEmployees(buffer: Buffer): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
      errors: [],
      data: [],
    };

    try {
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      result.totalRows = jsonData.length;

      for (let i = 0; i < jsonData.length; i++) {
        try {
          const row = jsonData[i] as any;
          const validatedData = EmployeeImportSchema.parse(row);

          // Check if employee already exists
          const existingEmployee = await prisma.employee.findUnique({
            where: { employeeCode: validatedData.employeeCode },
          });

          const employeeData = {
            employeeCode: validatedData.employeeCode,
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            division: validatedData.division,
            employeeType: validatedData.employeeType,
            hourlyRate: validatedData.hourlyRate,
            overtimeRate: validatedData.overtimeRate,
            maxHoursPerWeek: validatedData.maxHoursPerWeek,
            skills: validatedData.skills?.split(',').map(s => s.trim()) || [],
            certifications: validatedData.certifications?.split(',').map(c => c.trim()) || [],
            availabilityStart: new Date(validatedData.availabilityStart),
            availabilityEnd: validatedData.availabilityEnd ? new Date(validatedData.availabilityEnd) : null,
          };

          if (existingEmployee) {
            // Update existing employee
            const updated = await prisma.employee.update({
              where: { id: existingEmployee.id },
              data: employeeData,
            });
            result.data?.push(updated);
          } else {
            // Create new employee
            const created = await prisma.employee.create({
              data: employeeData,
            });
            result.data?.push(created);
          }

          result.successfulRows++;
        } catch (error) {
          result.failedRows++;
          result.errors.push({
            row: i + 2,
            message: error instanceof Error ? error.message : 'Unknown error',
            data: jsonData[i],
          });
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        row: 0,
        message: `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  /**
   * Validate Excel file format
   */
  validateTemplate(buffer: Buffer, templateType: 'projects' | 'phases' | 'employees'): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        errors.push('No sheets found in Excel file');
        return { isValid: false, errors };
      }

      const worksheet = workbook.Sheets[sheetName];
      const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];

      const requiredHeaders: Record<string, string[]> = {
        projects: ['projectCode', 'name', 'type', 'division', 'status', 'contractAmount', 'startDate', 'endDate', 'clientName'],
        phases: ['projectCode', 'phaseNumber', 'name', 'division', 'startDate', 'endDate', 'duration', 'laborHours'],
        employees: ['employeeCode', 'firstName', 'lastName', 'division', 'employeeType', 'hourlyRate', 'overtimeRate'],
      };

      const required = requiredHeaders[templateType];
      const missing = required.filter(h => !headers.includes(h));

      if (missing.length > 0) {
        errors.push(`Missing required columns: ${missing.join(', ')}`);
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Failed to validate template: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors };
    }
  }
}