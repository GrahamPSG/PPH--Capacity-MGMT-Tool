import { z } from 'zod';
import { ProjectType, ProjectStatus, Division } from '@prisma/client';

const ProjectCreateSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.nativeEnum(ProjectType),
  division: z.nativeEnum(Division),
  status: z.nativeEnum(ProjectStatus).optional(),
  contractAmount: z.number().min(0).max(10000000), // Max $10M
  startDate: z.date(),
  endDate: z.date(),
  actualStartDate: z.date().optional(),
  actualEndDate: z.date().optional(),
  foremanId: z.string().uuid().optional(),
  crewSize: z.number().min(0).max(20).optional(),
  address: z.string().max(500).optional(),
  clientName: z.string().min(1).max(200),
  clientContact: z.string().max(200).optional(),
  mondayBoardId: z.string().optional(),
  mondayItemId: z.string().optional(),
  notes: z.string().max(5000).optional()
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate']
}).refine((data) => {
  if (data.actualStartDate && data.actualEndDate) {
    return data.actualEndDate > data.actualStartDate;
  }
  return true;
}, {
  message: 'Actual end date must be after actual start date',
  path: ['actualEndDate']
});

const ProjectUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.nativeEnum(ProjectType).optional(),
  division: z.nativeEnum(Division).optional(),
  contractAmount: z.number().min(0).max(10000000).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  actualStartDate: z.date().nullable().optional(),
  actualEndDate: z.date().nullable().optional(),
  foremanId: z.string().uuid().nullable().optional(),
  crewSize: z.number().min(0).max(20).optional(),
  address: z.string().max(500).nullable().optional(),
  clientName: z.string().min(1).max(200).optional(),
  clientContact: z.string().max(200).nullable().optional(),
  mondayBoardId: z.string().nullable().optional(),
  mondayItemId: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional()
});

export class ProjectValidator {
  static validateCreate(data: any) {
    try {
      const validated = ProjectCreateSchema.parse(data);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      return {
        success: false,
        errors: ['Validation failed']
      };
    }
  }

  static validateUpdate(data: any) {
    try {
      const validated = ProjectUpdateSchema.parse(data);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      return {
        success: false,
        errors: ['Validation failed']
      };
    }
  }

  static validateProjectCode(code: string): boolean {
    return /^PRJ-\d{3}$/.test(code);
  }

  static validateContractAmount(amount: number): boolean {
    return amount >= 0 && amount <= 10000000;
  }

  static validateCrewSize(size: number): boolean {
    return size >= 0 && size <= 20;
  }

  static validateDateRange(startDate: Date, endDate: Date): boolean {
    return endDate > startDate;
  }
}