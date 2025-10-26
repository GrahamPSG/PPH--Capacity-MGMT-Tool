import prisma from '@/lib/prisma/client';
import { CSVParser, ProjectCSVRow, PhaseCSVRow, EmployeeCSVRow } from './CSVParser';
import {
  ProjectType,
  ProjectStatus,
  Division,
  Subdivision,
  PhaseType,
  PhaseStatus,
  EmployeeType
} from '@prisma/client';

export interface ImportResult {
  success: boolean;
  imported: {
    projects?: number;
    phases?: number;
    employees?: number;
  };
  failed: {
    projects?: number;
    phases?: number;
    employees?: number;
  };
  errors: Array<{
    type: string;
    message: string;
    details?: any;
  }>;
}

export class DataImporter {
  static async importProjects(
    csvContent: string,
    userId: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: { projects: 0 },
      failed: { projects: 0 },
      errors: []
    };

    try {
      const parseResult = CSVParser.parseProjects(csvContent);

      if (parseResult.errors.length > 0) {
        result.errors.push({
          type: 'PARSE_ERROR',
          message: `CSV parsing failed with ${parseResult.errors.length} errors`,
          details: parseResult.errors
        });
        result.failed.projects = parseResult.errors.length;
        return result;
      }

      // Import projects in transaction
      await prisma.$transaction(async (tx) => {
        for (const row of parseResult.data) {
          try {
            await tx.project.create({
              data: {
                name: row.name,
                type: row.type as ProjectType,
                division: row.division as Division,
                subdivision: row.subdivision as Subdivision,
                status: row.status as ProjectStatus,
                clientName: row.clientName,
                location: row.location,
                startDate: new Date(row.startDate),
                endDate: new Date(row.endDate),
                estimatedHours: row.estimatedHours,
                actualHours: row.actualHours || 0,
                budget: row.budget || 0,
                actualCost: row.actualCost || 0,
                projectManagerId: userId,
                createdById: userId,
                updatedById: userId,
                notes: row.notes
              }
            });
            result.imported.projects!++;
          } catch (error) {
            result.failed.projects!++;
            result.errors.push({
              type: 'IMPORT_ERROR',
              message: `Failed to import project: ${row.name}`,
              details: error
            });
          }
        }
      });

      result.success = result.imported.projects! > 0;
    } catch (error) {
      result.errors.push({
        type: 'TRANSACTION_ERROR',
        message: 'Database transaction failed',
        details: error
      });
    }

    return result;
  }

  static async importPhases(
    csvContent: string,
    userId: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: { phases: 0 },
      failed: { phases: 0 },
      errors: []
    };

    try {
      const parseResult = CSVParser.parsePhases(csvContent);

      if (parseResult.errors.length > 0) {
        result.errors.push({
          type: 'PARSE_ERROR',
          message: `CSV parsing failed with ${parseResult.errors.length} errors`,
          details: parseResult.errors
        });
        result.failed.phases = parseResult.errors.length;
        return result;
      }

      // Import phases in transaction
      await prisma.$transaction(async (tx) => {
        for (const row of parseResult.data) {
          try {
            // Find project by name
            const project = await tx.project.findFirst({
              where: { name: row.projectName }
            });

            if (!project) {
              result.failed.phases!++;
              result.errors.push({
                type: 'PROJECT_NOT_FOUND',
                message: `Project not found: ${row.projectName}`
              });
              continue;
            }

            // Map phase type based on division
            let phaseType: PhaseType;
            if (project.division === Division.PLUMBING) {
              // Map common phase names to plumbing phases
              const phaseTypeMap: Record<string, PhaseType> = {
                'UNDERGROUND': PhaseType.UNDERGROUND,
                'ROUGH_TOP_OUT': PhaseType.ROUGH_TOP_OUT,
                'ROUGH_IN': PhaseType.ROUGH_IN,
                'FINISH': PhaseType.FINISH,
                'SITE_UTILITIES': PhaseType.SITE_UTILITIES,
                'FIXTURE_SETTING': PhaseType.FIXTURE_SETTING,
                'EQUIPMENT_INSTALLATION': PhaseType.EQUIPMENT_INSTALLATION,
                'TESTING': PhaseType.TESTING,
                'INSULATION': PhaseType.INSULATION,
                'COMMISSIONING': PhaseType.COMMISSIONING,
                'PUNCH_LIST': PhaseType.PUNCH_LIST,
                'WARRANTY': PhaseType.WARRANTY
              };
              phaseType = phaseTypeMap[row.phaseType] || PhaseType.ROUGH_IN;
            } else {
              // Map to HVAC phases
              const phaseTypeMap: Record<string, PhaseType> = {
                'ROUGH_IN': PhaseType.ROUGH_IN,
                'EQUIPMENT_SETTING': PhaseType.EQUIPMENT_SETTING,
                'DUCTWORK': PhaseType.DUCTWORK,
                'PIPING': PhaseType.PIPING,
                'INSULATION': PhaseType.INSULATION,
                'STARTUP': PhaseType.STARTUP,
                'TESTING_BALANCING': PhaseType.TESTING_BALANCING,
                'COMMISSIONING': PhaseType.COMMISSIONING,
                'PUNCH_LIST': PhaseType.PUNCH_LIST,
                'WARRANTY': PhaseType.WARRANTY
              };
              phaseType = phaseTypeMap[row.phaseType] || PhaseType.ROUGH_IN;
            }

            await tx.projectPhase.create({
              data: {
                projectId: project.id,
                phaseType: phaseType,
                name: row.name,
                status: row.status as PhaseStatus,
                startDate: new Date(row.startDate),
                endDate: new Date(row.endDate),
                crewRequirements: {
                  foreman: row.foremanRequired,
                  journeymen: row.journeymenRequired,
                  apprentices: row.apprenticesRequired,
                  total: row.foremanRequired + row.journeymenRequired + row.apprenticesRequired
                },
                actualProgress: row.progress || 0,
                createdById: userId,
                updatedById: userId,
                notes: row.notes
              }
            });
            result.imported.phases!++;
          } catch (error) {
            result.failed.phases!++;
            result.errors.push({
              type: 'IMPORT_ERROR',
              message: `Failed to import phase: ${row.name}`,
              details: error
            });
          }
        }
      });

      result.success = result.imported.phases! > 0;
    } catch (error) {
      result.errors.push({
        type: 'TRANSACTION_ERROR',
        message: 'Database transaction failed',
        details: error
      });
    }

    return result;
  }

  static async importEmployees(
    csvContent: string,
    userId: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: { employees: 0 },
      failed: { employees: 0 },
      errors: []
    };

    try {
      const parseResult = CSVParser.parseEmployees(csvContent);

      if (parseResult.errors.length > 0) {
        result.errors.push({
          type: 'PARSE_ERROR',
          message: `CSV parsing failed with ${parseResult.errors.length} errors`,
          details: parseResult.errors
        });
        result.failed.employees = parseResult.errors.length;
        return result;
      }

      // Import employees in transaction
      await prisma.$transaction(async (tx) => {
        for (const row of parseResult.data) {
          try {
            // Check if employee already exists
            const existing = await tx.employee.findFirst({
              where: {
                OR: [
                  { email: row.email },
                  { employeeCode: row.employeeCode }
                ]
              }
            });

            if (existing) {
              // Update existing employee
              await tx.employee.update({
                where: { id: existing.id },
                data: {
                  name: row.name,
                  role: row.role as EmployeeType,
                  division: row.division as Division,
                  subdivision: row.subdivision as Subdivision,
                  phone: row.phone,
                  maxHoursPerWeek: row.maxHoursPerWeek,
                  hourlyRate: row.hourlyRate,
                  isActive: row.isActive,
                  updatedById: userId
                }
              });
            } else {
              // Create new employee
              await tx.employee.create({
                data: {
                  name: row.name,
                  email: row.email,
                  employeeCode: row.employeeCode,
                  role: row.role as EmployeeType,
                  division: row.division as Division,
                  subdivision: row.subdivision as Subdivision,
                  phone: row.phone,
                  maxHoursPerWeek: row.maxHoursPerWeek,
                  hourlyRate: row.hourlyRate,
                  hireDate: row.hireDate ? new Date(row.hireDate) : undefined,
                  isActive: row.isActive,
                  createdById: userId,
                  updatedById: userId
                }
              });
            }
            result.imported.employees!++;
          } catch (error) {
            result.failed.employees!++;
            result.errors.push({
              type: 'IMPORT_ERROR',
              message: `Failed to import employee: ${row.name}`,
              details: error
            });
          }
        }
      });

      result.success = result.imported.employees! > 0;
    } catch (error) {
      result.errors.push({
        type: 'TRANSACTION_ERROR',
        message: 'Database transaction failed',
        details: error
      });
    }

    return result;
  }

  // Validate import without saving
  static async validateImport(
    csvContent: string,
    type: 'projects' | 'phases' | 'employees'
  ): Promise<{
    valid: boolean;
    errors: any[];
    warnings: any[];
    rowCount: number;
  }> {
    let parseResult;

    switch (type) {
      case 'projects':
        parseResult = CSVParser.parseProjects(csvContent);
        break;
      case 'phases':
        parseResult = CSVParser.parsePhases(csvContent);
        break;
      case 'employees':
        parseResult = CSVParser.parseEmployees(csvContent);
        break;
    }

    return {
      valid: parseResult.errors.length === 0,
      errors: parseResult.errors,
      warnings: parseResult.warnings,
      rowCount: parseResult.data.length
    };
  }
}