import prisma from '@/lib/prisma/client';
import { EmployeeType, PhaseStatus, Prisma } from '@prisma/client';
import { AssignmentValidator } from './AssignmentValidator';
import { ConflictDetector } from './ConflictDetector';

export interface CreateAssignmentInput {
  phaseId: string;
  employeeId: string;
  assignmentDate: Date;
  hoursAllocated: number;
  actualHoursWorked?: number;
  role: EmployeeType;
  isLead?: boolean;
  notes?: string;
}

export interface UpdateAssignmentInput {
  hoursAllocated?: number;
  actualHoursWorked?: number;
  role?: EmployeeType;
  isLead?: boolean;
  notes?: string;
}

export class AssignmentService {
  /**
   * Create a new assignment
   */
  static async createAssignment(data: CreateAssignmentInput, userId: string) {
    const validation = AssignmentValidator.validateCreate(data);
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
    }

    // Verify employee exists and is active
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId }
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    if (!employee.isActive) {
      throw new Error('Employee is not active');
    }

    // Verify phase exists and is not completed
    const phase = await prisma.projectPhase.findUnique({
      where: { id: data.phaseId },
      include: { project: true }
    });

    if (!phase) {
      throw new Error('Phase not found');
    }

    if (phase.status === PhaseStatus.COMPLETED) {
      throw new Error('Cannot assign crew to completed phase');
    }

    // Check for conflicts
    const conflicts = await ConflictDetector.detectConflicts({
      employeeId: data.employeeId,
      phaseId: data.phaseId,
      assignmentDate: data.assignmentDate,
      hoursAllocated: data.hoursAllocated
    });

    if (conflicts.length > 0) {
      throw new Error(`Assignment conflicts detected: ${conflicts.map(c => c.reason).join(', ')}`);
    }

    // Validate employee role matches assignment role
    if (employee.employeeType !== data.role) {
      throw new Error(`Employee type (${employee.employeeType}) does not match assignment role (${data.role})`);
    }

    // Check if phase already has a lead for this date
    if (data.isLead) {
      const existingLead = await prisma.crewAssignment.findFirst({
        where: {
          phaseId: data.phaseId,
          assignmentDate: data.assignmentDate,
          isLead: true
        }
      });

      if (existingLead) {
        throw new Error('Phase already has a lead assigned for this date');
      }
    }

    // Validate assignment date is within phase dates
    if (data.assignmentDate < phase.startDate || data.assignmentDate > phase.endDate) {
      throw new Error('Assignment date must be within phase date range');
    }

    return await prisma.$transaction(async (tx) => {
      const assignment = await tx.crewAssignment.create({
        data: {
          phaseId: data.phaseId,
          employeeId: data.employeeId,
          assignmentDate: data.assignmentDate,
          hoursAllocated: data.hoursAllocated,
          actualHoursWorked: data.actualHoursWorked,
          role: data.role,
          isLead: data.isLead || false,
          notes: data.notes,
          createdBy: userId
        },
        include: {
          employee: true,
          phase: {
            include: {
              project: true
            }
          }
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'CrewAssignment',
          entityId: assignment.id,
          action: 'CREATE',
          userId,
          changes: { created: data },
          ipAddress: '0.0.0.0',
          userAgent: 'API'
        }
      });

      return assignment;
    });
  }

  /**
   * Get assignments for a phase
   */
  static async getPhaseAssignments(phaseId: string) {
    return await prisma.crewAssignment.findMany({
      where: { phaseId },
      orderBy: [
        { assignmentDate: 'asc' },
        { isLead: 'desc' },
        { employee: { lastName: 'asc' } }
      ],
      include: {
        employee: true
      }
    });
  }

  /**
   * Get assignments for an employee
   */
  static async getEmployeeAssignments(
    employeeId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const where: Prisma.CrewAssignmentWhereInput = {
      employeeId
    };

    if (startDate || endDate) {
      where.assignmentDate = {};
      if (startDate) where.assignmentDate.gte = startDate;
      if (endDate) where.assignmentDate.lte = endDate;
    }

    return await prisma.crewAssignment.findMany({
      where,
      orderBy: { assignmentDate: 'asc' },
      include: {
        phase: {
          include: {
            project: true
          }
        }
      }
    });
  }

  /**
   * Get a single assignment
   */
  static async getAssignmentById(id: string) {
    return await prisma.crewAssignment.findUnique({
      where: { id },
      include: {
        employee: true,
        phase: {
          include: {
            project: true
          }
        }
      }
    });
  }

  /**
   * Update an assignment
   */
  static async updateAssignment(id: string, data: UpdateAssignmentInput, userId: string) {
    const validation = AssignmentValidator.validateUpdate(data);
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
    }

    const existingAssignment = await prisma.crewAssignment.findUnique({
      where: { id },
      include: {
        phase: true,
        employee: true
      }
    });

    if (!existingAssignment) {
      return null;
    }

    // Check if changing to lead when one already exists
    if (data.isLead && !existingAssignment.isLead) {
      const existingLead = await prisma.crewAssignment.findFirst({
        where: {
          phaseId: existingAssignment.phaseId,
          assignmentDate: existingAssignment.assignmentDate,
          isLead: true,
          id: { not: id }
        }
      });

      if (existingLead) {
        throw new Error('Phase already has a lead assigned for this date');
      }
    }

    // Check for conflicts if hours are being updated
    if (data.hoursAllocated && data.hoursAllocated !== existingAssignment.hoursAllocated) {
      const conflicts = await ConflictDetector.detectConflicts({
        employeeId: existingAssignment.employeeId,
        phaseId: existingAssignment.phaseId,
        assignmentDate: existingAssignment.assignmentDate,
        hoursAllocated: data.hoursAllocated,
        excludeAssignmentId: id
      });

      if (conflicts.length > 0) {
        throw new Error(`Assignment conflicts detected: ${conflicts.map(c => c.reason).join(', ')}`);
      }
    }

    return await prisma.$transaction(async (tx) => {
      const assignment = await tx.crewAssignment.update({
        where: { id },
        data,
        include: {
          employee: true,
          phase: {
            include: {
              project: true
            }
          }
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'CrewAssignment',
          entityId: id,
          action: 'UPDATE',
          userId,
          changes: { before: existingAssignment, after: data },
          ipAddress: '0.0.0.0',
          userAgent: 'API'
        }
      });

      return assignment;
    });
  }

  /**
   * Delete an assignment
   */
  static async deleteAssignment(id: string, userId: string) {
    const assignment = await prisma.crewAssignment.findUnique({
      where: { id }
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    return await prisma.$transaction(async (tx) => {
      await tx.crewAssignment.delete({
        where: { id }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'CrewAssignment',
          entityId: id,
          action: 'DELETE',
          userId,
          changes: { deleted: assignment },
          ipAddress: '0.0.0.0',
          userAgent: 'API'
        }
      });

      return { success: true };
    });
  }

  /**
   * Validate an assignment before creation
   */
  static async validateAssignment(data: CreateAssignmentInput) {
    try {
      // Run basic validation
      const validation = AssignmentValidator.validateCreate(data);
      if (!validation.success) {
        return {
          valid: false,
          errors: validation.errors
        };
      }

      // Check for conflicts
      const conflicts = await ConflictDetector.detectConflicts({
        employeeId: data.employeeId,
        phaseId: data.phaseId,
        assignmentDate: data.assignmentDate,
        hoursAllocated: data.hoursAllocated
      });

      if (conflicts.length > 0) {
        return {
          valid: false,
          errors: conflicts.map(c => c.reason),
          conflicts
        };
      }

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Get assignments by date range
   */
  static async getAssignmentsByDateRange(startDate: Date, endDate: Date) {
    return await prisma.crewAssignment.findMany({
      where: {
        assignmentDate: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: [
        { assignmentDate: 'asc' },
        { phase: { project: { projectCode: 'asc' } } },
        { phase: { phaseNumber: 'asc' } }
      ],
      include: {
        employee: true,
        phase: {
          include: {
            project: true
          }
        }
      }
    });
  }

  /**
   * Bulk create assignments
   */
  static async bulkCreateAssignments(assignments: CreateAssignmentInput[], userId: string) {
    const results = {
      created: [] as any[],
      failed: [] as { data: CreateAssignmentInput; error: string }[]
    };

    for (const assignmentData of assignments) {
      try {
        const assignment = await this.createAssignment(assignmentData, userId);
        results.created.push(assignment);
      } catch (error: any) {
        results.failed.push({
          data: assignmentData,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Copy assignments from one week to another
   */
  static async copyWeekAssignments(
    sourceStartDate: Date,
    targetStartDate: Date,
    phaseId: string,
    userId: string
  ) {
    // Get source week assignments
    const sourceEndDate = new Date(sourceStartDate);
    sourceEndDate.setDate(sourceEndDate.getDate() + 6);

    const sourceAssignments = await prisma.crewAssignment.findMany({
      where: {
        phaseId,
        assignmentDate: {
          gte: sourceStartDate,
          lte: sourceEndDate
        }
      }
    });

    // Calculate day offset
    const dayOffset = Math.floor(
      (targetStartDate.getTime() - sourceStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Create new assignments
    const newAssignments = sourceAssignments.map(assignment => ({
      phaseId: assignment.phaseId,
      employeeId: assignment.employeeId,
      assignmentDate: new Date(
        assignment.assignmentDate.getTime() + dayOffset * 24 * 60 * 60 * 1000
      ),
      hoursAllocated: assignment.hoursAllocated,
      role: assignment.role,
      isLead: assignment.isLead,
      notes: assignment.notes
    }));

    return await this.bulkCreateAssignments(newAssignments, userId);
  }

  /**
   * Get crew summary for a phase
   */
  static async getPhaseCrewSummary(phaseId: string) {
    const assignments = await prisma.crewAssignment.findMany({
      where: { phaseId },
      include: { employee: true }
    });

    const summary = {
      totalAssignments: assignments.length,
      uniqueEmployees: new Set(assignments.map(a => a.employeeId)).size,
      totalHoursAllocated: assignments.reduce((sum, a) => sum + a.hoursAllocated, 0),
      totalActualHours: assignments.reduce((sum, a) => sum + (a.actualHoursWorked || 0), 0),
      byRole: {
        FOREMAN: assignments.filter(a => a.role === EmployeeType.FOREMAN).length,
        JOURNEYMAN: assignments.filter(a => a.role === EmployeeType.JOURNEYMAN).length,
        APPRENTICE: assignments.filter(a => a.role === EmployeeType.APPRENTICE).length
      },
      leads: assignments.filter(a => a.isLead).map(a => ({
        date: a.assignmentDate,
        employee: a.employee
      }))
    };

    return summary;
  }
}