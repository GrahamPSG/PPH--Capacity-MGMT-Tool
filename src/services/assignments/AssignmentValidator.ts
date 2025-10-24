import { z } from 'zod';
import { EmployeeType } from '@prisma/client';

const CreateAssignmentSchema = z.object({
  phaseId: z.string().uuid(),
  employeeId: z.string().uuid(),
  assignmentDate: z.date(),
  hoursAllocated: z.number().min(0.5).max(16), // Min 30 mins, max 16 hours
  actualHoursWorked: z.number().min(0).max(24).optional(),
  role: z.nativeEnum(EmployeeType),
  isLead: z.boolean().optional(),
  notes: z.string().max(500).optional()
});

const UpdateAssignmentSchema = z.object({
  hoursAllocated: z.number().min(0.5).max(16).optional(),
  actualHoursWorked: z.number().min(0).max(24).optional(),
  role: z.nativeEnum(EmployeeType).optional(),
  isLead: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional()
});

export class AssignmentValidator {
  static validateCreate(data: any) {
    try {
      const validated = CreateAssignmentSchema.parse(data);
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
      const validated = UpdateAssignmentSchema.parse(data);
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

  static validateHoursAllocated(hours: number): boolean {
    return hours >= 0.5 && hours <= 16;
  }

  static validateActualHours(hours: number): boolean {
    return hours >= 0 && hours <= 24;
  }

  static validateWeeklyHours(weeklyHours: number, maxHours: number): boolean {
    return weeklyHours <= maxHours;
  }
}