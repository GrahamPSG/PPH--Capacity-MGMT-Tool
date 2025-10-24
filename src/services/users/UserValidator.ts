import { UserRole, Division } from '@prisma/client';
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');
const phoneSchema = z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Phone must be XXX-XXX-XXXX format').optional();

const createUserSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  role: z.nativeEnum(UserRole),
  divisionAccess: z.array(z.nativeEnum(Division)).min(1, 'At least one division required'),
  phoneNumber: phoneSchema,
  auth0Id: z.string().min(1, 'Auth0 ID is required'),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  role: z.nativeEnum(UserRole).optional(),
  divisionAccess: z.array(z.nativeEnum(Division)).min(1).optional(),
  phoneNumber: phoneSchema,
  isActive: z.boolean().optional(),
});

export class UserValidator {
  static validateCreate(data: any) {
    try {
      createUserSchema.parse(data);
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
      updateUserSchema.parse(data);
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

  static canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.OWNER]: 5,
      [UserRole.MANAGER]: 4,
      [UserRole.PROJECT_MANAGER]: 3,
      [UserRole.FOREMAN]: 2,
      [UserRole.READ_ONLY]: 1,
    };

    // Only owners can assign owner role
    if (targetRole === UserRole.OWNER && assignerRole !== UserRole.OWNER) {
      return false;
    }

    // Users can only assign roles at or below their level
    return roleHierarchy[assignerRole] >= roleHierarchy[targetRole];
  }
}