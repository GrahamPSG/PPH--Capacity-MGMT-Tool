import { z } from 'zod';
import { Division, PhaseStatus } from '@prisma/client';

const CreatePhaseSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(200),
  division: z.nativeEnum(Division),
  startDate: z.date(),
  endDate: z.date(),
  actualStartDate: z.date().optional(),
  actualEndDate: z.date().optional(),
  requiredCrewSize: z.number().min(0).max(50).optional(),
  requiredForeman: z.boolean().optional(),
  requiredJourneymen: z.number().min(0).max(20).optional(),
  requiredApprentices: z.number().min(0).max(10).optional(),
  dependencies: z.array(z.string().uuid()).optional(),
  mondayGroupId: z.string().optional()
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

const UpdatePhaseSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  division: z.nativeEnum(Division).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  actualStartDate: z.date().nullable().optional(),
  actualEndDate: z.date().nullable().optional(),
  requiredCrewSize: z.number().min(0).max(50).optional(),
  requiredForeman: z.boolean().optional(),
  requiredJourneymen: z.number().min(0).max(20).optional(),
  requiredApprentices: z.number().min(0).max(10).optional(),
  dependencies: z.array(z.string().uuid()).optional(),
  status: z.nativeEnum(PhaseStatus).optional(),
  mondayGroupId: z.string().nullable().optional()
});

const ProgressUpdateSchema = z.object({
  progressPercentage: z.number().min(0).max(100)
});

export class PhaseValidator {
  static validateCreate(data: any) {
    try {
      const validated = CreatePhaseSchema.parse(data);
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
      const validated = UpdatePhaseSchema.parse(data);
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

  static validateProgressUpdate(data: any) {
    try {
      const validated = ProgressUpdateSchema.parse(data);
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

  static validateCrewRequirements(
    requiredForeman: boolean,
    requiredJourneymen: number,
    requiredApprentices: number
  ): boolean {
    // At least one crew member required
    const totalCrew = (requiredForeman ? 1 : 0) + requiredJourneymen + requiredApprentices;
    return totalCrew > 0;
  }

  static validateLaborHours(laborHours: number): boolean {
    return laborHours > 0 && laborHours <= 10000; // Max 10,000 hours per phase
  }

  static validateDuration(duration: number): boolean {
    return duration > 0 && duration <= 365; // Max 1 year per phase
  }
}