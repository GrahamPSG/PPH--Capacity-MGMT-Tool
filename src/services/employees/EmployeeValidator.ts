import { EmployeeType, Division } from '@prisma/client';
import { z } from 'zod';

const employeeCodeSchema = z.string()
  .regex(/^EMP\d{3,6}$/, 'Employee code must be in format EMP### (e.g., EMP001)');

const createEmployeeSchema = z.object({
  employeeCode: employeeCodeSchema,
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  division: z.nativeEnum(Division),
  employeeType: z.nativeEnum(EmployeeType),
  hourlyRate: z.number().min(15, 'Hourly rate must be at least $15').max(200),
  overtimeRate: z.number().min(15).max(300).optional(),
  maxHoursPerWeek: z.number().min(10).max(60).optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  availabilityStart: z.date(),
  availabilityEnd: z.date().optional(),
});

const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  division: z.nativeEnum(Division).optional(),
  employeeType: z.nativeEnum(EmployeeType).optional(),
  hourlyRate: z.number().min(15).max(200).optional(),
  overtimeRate: z.number().min(15).max(300).optional(),
  maxHoursPerWeek: z.number().min(10).max(60).optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  availabilityStart: z.date().optional(),
  availabilityEnd: z.date().nullable().optional(),
  isActive: z.boolean().optional(),
});

export class EmployeeValidator {
  static validateCreate(data: any) {
    try {
      createEmployeeSchema.parse(data);

      // Additional business rule validations
      if (data.availabilityEnd && data.availabilityEnd < data.availabilityStart) {
        return {
          isValid: false,
          errors: ['Availability end date must be after start date'],
        };
      }

      if (data.overtimeRate && data.overtimeRate < data.hourlyRate) {
        return {
          isValid: false,
          errors: ['Overtime rate must be greater than or equal to hourly rate'],
        };
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map(e => `${e.path}: ${e.message}`),
        };
      }
      return { isValid: false, errors: ['Unknown validation error'] };
    }
  }

  static validateUpdate(data: any) {
    try {
      updateEmployeeSchema.parse(data);

      // Additional business rule validations
      if (data.availabilityEnd !== undefined &&
          data.availabilityEnd !== null &&
          data.availabilityStart &&
          data.availabilityEnd < data.availabilityStart) {
        return {
          isValid: false,
          errors: ['Availability end date must be after start date'],
        };
      }

      if (data.overtimeRate !== undefined &&
          data.hourlyRate !== undefined &&
          data.overtimeRate < data.hourlyRate) {
        return {
          isValid: false,
          errors: ['Overtime rate must be greater than or equal to hourly rate'],
        };
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map(e => `${e.path}: ${e.message}`),
        };
      }
      return { isValid: false, errors: ['Unknown validation error'] };
    }
  }

  static validateSkillsAndCertifications(skills: string[], certifications: string[]) {
    const errors: string[] = [];

    // Validate skills
    if (skills.length > 20) {
      errors.push('Maximum 20 skills allowed');
    }
    if (skills.some(s => s.length > 50)) {
      errors.push('Each skill must be 50 characters or less');
    }

    // Validate certifications
    if (certifications.length > 10) {
      errors.push('Maximum 10 certifications allowed');
    }
    if (certifications.some(c => c.length > 100)) {
      errors.push('Each certification must be 100 characters or less');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static getMinimumWageByType(employeeType: EmployeeType): number {
    switch (employeeType) {
      case EmployeeType.FOREMAN:
        return 50;
      case EmployeeType.JOURNEYMAN:
        return 35;
      case EmployeeType.APPRENTICE:
        return 20;
      default:
        return 15;
    }
  }
}