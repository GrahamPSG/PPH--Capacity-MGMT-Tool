import prisma from '@/lib/prisma/client';
import { EmployeeType, Division, Prisma } from '@prisma/client';
import { EmployeeValidator } from './EmployeeValidator';

export interface CreateEmployeeInput {
  employeeCode: string;
  firstName: string;
  lastName: string;
  division: Division;
  employeeType: EmployeeType;
  hourlyRate: number;
  overtimeRate?: number;
  maxHoursPerWeek?: number;
  skills?: string[];
  certifications?: string[];
  availabilityStart: Date;
  availabilityEnd?: Date;
}

export interface UpdateEmployeeInput {
  firstName?: string;
  lastName?: string;
  division?: Division;
  employeeType?: EmployeeType;
  hourlyRate?: number;
  overtimeRate?: number;
  maxHoursPerWeek?: number;
  skills?: string[];
  certifications?: string[];
  availabilityStart?: Date;
  availabilityEnd?: Date | null;
  isActive?: boolean;
}

export interface EmployeeFilters {
  division?: Division;
  employeeType?: EmployeeType;
  skill?: string;
  certification?: string;
  isActive?: boolean;
  availableOnly?: boolean;
  search?: string;
}

export class EmployeeService {
  /**
   * Get all employees with optional filters
   */
  static async getEmployees(filters: EmployeeFilters = {}) {
    const where: Prisma.EmployeeWhereInput = {};

    if (filters.division) where.division = filters.division;
    if (filters.employeeType) where.employeeType = filters.employeeType;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    if (filters.skill) {
      where.skills = { has: filters.skill };
    }

    if (filters.certification) {
      where.certifications = { has: filters.certification };
    }

    if (filters.availableOnly) {
      const now = new Date();
      where.AND = [
        { availabilityStart: { lte: now } },
        {
          OR: [
            { availabilityEnd: null },
            { availabilityEnd: { gte: now } },
          ],
        },
      ];
    }

    if (filters.search) {
      where.OR = [
        { employeeCode: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.employee.findMany({
      where,
      orderBy: [
        { employeeType: 'asc' },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
      include: {
        assignments: {
          where: {
            assignmentDate: {
              gte: new Date(new Date().setDate(new Date().getDate() - 7)),
            },
          },
          select: {
            id: true,
            assignmentDate: true,
            hoursAllocated: true,
            phase: {
              select: {
                name: true,
                project: { select: { name: true } },
              },
            },
          },
        },
        _count: {
          select: { assignments: true },
        },
      },
    });
  }

  /**
   * Get employee by ID with full details
   */
  static async getEmployeeById(id: string) {
    return prisma.employee.findUnique({
      where: { id },
      include: {
        assignments: {
          orderBy: { assignmentDate: 'desc' },
          take: 10,
          include: {
            phase: {
              include: {
                project: true,
              },
            },
          },
        },
        foremanProjects: {
          where: { status: 'IN_PROGRESS' },
        },
      },
    });
  }

  /**
   * Create new employee
   */
  static async createEmployee(data: CreateEmployeeInput, createdBy: string) {
    // Validate input
    const validation = EmployeeValidator.validateCreate(data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Check if employee code already exists
    const existing = await prisma.employee.findUnique({
      where: { employeeCode: data.employeeCode },
    });
    if (existing) {
      throw new Error(`Employee code ${data.employeeCode} already exists`);
    }

    // Set default overtime rate if not provided
    const overtimeRate = data.overtimeRate || data.hourlyRate * 1.5;

    // Create employee with audit log
    const employee = await prisma.$transaction(async (tx) => {
      const newEmployee = await tx.employee.create({
        data: {
          ...data,
          overtimeRate,
          maxHoursPerWeek: data.maxHoursPerWeek || 40,
          skills: data.skills || [],
          certifications: data.certifications || [],
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'Employee',
          entityId: newEmployee.id,
          action: 'CREATE',
          userId: createdBy,
          changes: data,
          ipAddress: '0.0.0.0',
          userAgent: 'EmployeeService',
        },
      });

      return newEmployee;
    });

    return employee;
  }

  /**
   * Update employee
   */
  static async updateEmployee(id: string, data: UpdateEmployeeInput, updatedBy: string) {
    // Validate input
    const validation = EmployeeValidator.validateUpdate(data);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Get current employee for audit
    const currentEmployee = await prisma.employee.findUnique({ where: { id } });
    if (!currentEmployee) {
      throw new Error('Employee not found');
    }

    // Update employee with audit log
    const employee = await prisma.$transaction(async (tx) => {
      const updatedEmployee = await tx.employee.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'Employee',
          entityId: id,
          action: 'UPDATE',
          userId: updatedBy,
          changes: {
            before: currentEmployee,
            after: data,
          },
          ipAddress: '0.0.0.0',
          userAgent: 'EmployeeService',
        },
      });

      return updatedEmployee;
    });

    return employee;
  }

  /**
   * Delete employee (soft delete)
   */
  static async deleteEmployee(id: string, deletedBy: string) {
    // Check if employee has active assignments
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        assignments: {
          where: {
            assignmentDate: { gte: new Date() },
          },
          take: 1,
        },
        foremanProjects: {
          where: { status: 'IN_PROGRESS' },
          take: 1,
        },
      },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    if (employee.assignments.length > 0) {
      throw new Error('Cannot delete employee with future assignments');
    }

    if (employee.foremanProjects.length > 0) {
      throw new Error('Cannot delete employee who is foreman on active projects');
    }

    // Soft delete
    return this.updateEmployee(id, { isActive: false }, deletedBy);
  }

  /**
   * Get employees by division
   */
  static async getEmployeesByDivision(division: Division) {
    return prisma.employee.findMany({
      where: { division, isActive: true },
      orderBy: [{ employeeType: 'asc' }, { lastName: 'asc' }],
    });
  }

  /**
   * Get available employees for a date range
   */
  static async getAvailableEmployees(
    startDate: Date,
    endDate: Date,
    division?: Division
  ) {
    const where: Prisma.EmployeeWhereInput = {
      isActive: true,
      availabilityStart: { lte: startDate },
      OR: [
        { availabilityEnd: null },
        { availabilityEnd: { gte: endDate } },
      ],
    };

    if (division) where.division = division;

    const employees = await prisma.employee.findMany({
      where,
      include: {
        assignments: {
          where: {
            assignmentDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    });

    // Calculate remaining availability
    return employees.map(emp => {
      const totalAssignedHours = emp.assignments.reduce(
        (sum, a) => sum + a.hoursAllocated,
        0
      );
      const availableHours = emp.maxHoursPerWeek - totalAssignedHours;

      return {
        ...emp,
        availableHours: Math.max(0, availableHours),
      };
    });
  }

  /**
   * Update employee skills
   */
  static async updateSkills(id: string, skills: string[], updatedBy: string) {
    return this.updateEmployee(id, { skills }, updatedBy);
  }

  /**
   * Update employee certifications
   */
  static async updateCertifications(
    id: string,
    certifications: string[],
    updatedBy: string
  ) {
    return this.updateEmployee(id, { certifications }, updatedBy);
  }
}