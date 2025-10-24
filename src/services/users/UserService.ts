import prisma from '@/lib/prisma/client';
import { UserRole, Division, Prisma } from '@prisma/client';
import { UserValidator } from './UserValidator';

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  divisionAccess: Division[];
  phoneNumber?: string;
  auth0Id: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  divisionAccess?: Division[];
  phoneNumber?: string;
  isActive?: boolean;
}

export interface UserFilters {
  role?: UserRole;
  division?: Division;
  isActive?: boolean;
  search?: string;
}

export class UserService {
  /**
   * Get all users with optional filters
   */
  static async getUsers(filters: UserFilters = {}) {
    const where: Prisma.UserWhereInput = {};

    if (filters.role) where.role = filters.role;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.division) {
      where.divisionAccess = { has: filters.division };
    }
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.user.findMany({
      where,
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        divisionAccess: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        createdProjects: { select: { id: true, name: true } },
        alerts: { where: { isResolved: false }, take: 5 },
      },
    });
  }

  /**
   * Create new user
   */
  static async createUser(data: CreateUserInput, createdBy: string) {
    // Validate input
    const validation = UserValidator.validateCreate(data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Create user with audit log
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          divisionAccess: data.divisionAccess,
          phoneNumber: data.phoneNumber,
          auth0Id: data.auth0Id,
          isActive: true,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'User',
          entityId: newUser.id,
          action: 'CREATE',
          userId: createdBy,
          changes: data,
          ipAddress: '0.0.0.0',
          userAgent: 'UserService',
        },
      });

      return newUser;
    });

    return user;
  }

  /**
   * Update user
   */
  static async updateUser(id: string, data: UpdateUserInput, updatedBy: string) {
    // Validate input
    const validation = UserValidator.validateUpdate(data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Get current user for audit
    const currentUser = await prisma.user.findUnique({ where: { id } });
    if (!currentUser) {
      throw new Error('User not found');
    }

    // Update user with audit log
    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'User',
          entityId: id,
          action: 'UPDATE',
          userId: updatedBy,
          changes: {
            before: currentUser,
            after: data,
          },
          ipAddress: '0.0.0.0',
          userAgent: 'UserService',
        },
      });

      return updatedUser;
    });

    return user;
  }

  /**
   * Toggle user active status
   */
  static async toggleUserStatus(id: string, updatedBy: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }

    return this.updateUser(
      id,
      { isActive: !user.isActive },
      updatedBy
    );
  }

  /**
   * Update user division access
   */
  static async updateDivisionAccess(
    id: string,
    divisions: Division[],
    updatedBy: string
  ) {
    return this.updateUser(id, { divisionAccess: divisions }, updatedBy);
  }

  /**
   * Delete user (soft delete)
   */
  static async deleteUser(id: string, deletedBy: string) {
    // Check if user can be deleted
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        createdProjects: { take: 1 },
        assignments: { take: 1 },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.createdProjects.length > 0) {
      throw new Error('Cannot delete user with associated projects');
    }

    if (user.assignments.length > 0) {
      throw new Error('Cannot delete user with active assignments');
    }

    // Soft delete
    return this.updateUser(id, { isActive: false }, deletedBy);
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: UserRole) {
    return prisma.user.findMany({
      where: { role, isActive: true },
      orderBy: { lastName: 'asc' },
    });
  }

  /**
   * Get users with division access
   */
  static async getUsersWithDivisionAccess(division: Division) {
    return prisma.user.findMany({
      where: {
        divisionAccess: { has: division },
        isActive: true,
      },
      orderBy: { lastName: 'asc' },
    });
  }
}