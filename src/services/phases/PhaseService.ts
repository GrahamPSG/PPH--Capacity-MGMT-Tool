import prisma from '@/lib/prisma/client';
import { Division, PhaseStatus, Prisma } from '@prisma/client';
import { PhaseValidator } from './PhaseValidator';
import { DependencyResolver } from './DependencyResolver';

export interface CreatePhaseInput {
  projectId: string;
  name: string;
  division: Division;
  startDate: Date;
  endDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  requiredCrewSize?: number;
  requiredForeman?: boolean;
  requiredJourneymen?: number;
  requiredApprentices?: number;
  dependencies?: string[];
  mondayGroupId?: string;
}

export interface UpdatePhaseInput {
  name?: string;
  division?: Division;
  startDate?: Date;
  endDate?: Date;
  actualStartDate?: Date | null;
  actualEndDate?: Date | null;
  requiredCrewSize?: number;
  requiredForeman?: boolean;
  requiredJourneymen?: number;
  requiredApprentices?: number;
  dependencies?: string[];
  status?: PhaseStatus;
  mondayGroupId?: string | null;
}

export class PhaseService {
  /**
   * Calculate duration in business days
   */
  private static calculateDuration(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude weekends
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Calculate labor hours from crew requirements
   */
  private static calculateLaborHours(
    duration: number,
    requiredForeman: boolean,
    requiredJourneymen: number,
    requiredApprentices: number
  ): number {
    const totalCrew = (requiredForeman ? 1 : 0) + requiredJourneymen + requiredApprentices;
    return totalCrew * duration * 8; // 8 hours per day
  }

  /**
   * Get next phase number for project
   */
  private static async getNextPhaseNumber(projectId: string): Promise<number> {
    const lastPhase = await prisma.projectPhase.findFirst({
      where: { projectId },
      orderBy: { phaseNumber: 'desc' },
      select: { phaseNumber: true }
    });

    return (lastPhase?.phaseNumber || 0) + 1;
  }

  /**
   * Create a new phase
   */
  static async createPhase(data: CreatePhaseInput, userId: string) {
    const validation = PhaseValidator.validateCreate(data);
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
    }

    // Verify project exists and get its dates
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
      select: { startDate: true, endDate: true }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Validate phase dates are within project dates
    if (data.startDate < project.startDate || data.endDate > project.endDate) {
      throw new Error('Phase dates must be within project date range');
    }

    // Validate dependencies if provided
    if (data.dependencies && data.dependencies.length > 0) {
      const validation = await DependencyResolver.validateDependencies(
        data.projectId,
        data.dependencies
      );
      if (!validation.valid) {
        throw new Error(validation.reason);
      }
    }

    const phaseNumber = await this.getNextPhaseNumber(data.projectId);
    const duration = this.calculateDuration(data.startDate, data.endDate);
    const laborHours = this.calculateLaborHours(
      duration,
      data.requiredForeman || true,
      data.requiredJourneymen || 0,
      data.requiredApprentices || 0
    );

    return await prisma.$transaction(async (tx) => {
      const phase = await tx.projectPhase.create({
        data: {
          projectId: data.projectId,
          phaseNumber,
          name: data.name,
          division: data.division,
          startDate: data.startDate,
          endDate: data.endDate,
          actualStartDate: data.actualStartDate,
          actualEndDate: data.actualEndDate,
          duration,
          progressPercentage: 0,
          requiredCrewSize: data.requiredCrewSize ||
            (data.requiredForeman ? 1 : 0) + (data.requiredJourneymen || 0) + (data.requiredApprentices || 0),
          requiredForeman: data.requiredForeman !== false,
          requiredJourneymen: data.requiredJourneymen || 0,
          requiredApprentices: data.requiredApprentices || 0,
          laborHours,
          status: PhaseStatus.NOT_STARTED,
          dependencies: data.dependencies || [],
          mondayGroupId: data.mondayGroupId,
          updatedBy: userId
        },
        include: {
          project: true,
          assignments: true
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'ProjectPhase',
          entityId: phase.id,
          action: 'CREATE',
          userId,
          changes: { created: data },
          ipAddress: '0.0.0.0',
          userAgent: 'API'
        }
      });

      return phase;
    });
  }

  /**
   * Get all phases for a project
   */
  static async getProjectPhases(projectId: string) {
    return await prisma.projectPhase.findMany({
      where: { projectId },
      orderBy: { phaseNumber: 'asc' },
      include: {
        assignments: {
          include: {
            employee: true
          }
        }
      }
    });
  }

  /**
   * Get a single phase by ID
   */
  static async getPhaseById(id: string) {
    return await prisma.projectPhase.findUnique({
      where: { id },
      include: {
        project: true,
        assignments: {
          include: {
            employee: true
          }
        },
        expenses: true
      }
    });
  }

  /**
   * Update a phase
   */
  static async updatePhase(id: string, data: UpdatePhaseInput, userId: string) {
    const validation = PhaseValidator.validateUpdate(data);
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
    }

    const existingPhase = await prisma.projectPhase.findUnique({
      where: { id },
      include: { project: true }
    });

    if (!existingPhase) {
      return null;
    }

    // Validate phase dates if being updated
    if (data.startDate || data.endDate) {
      const startDate = data.startDate || existingPhase.startDate;
      const endDate = data.endDate || existingPhase.endDate;

      if (startDate < existingPhase.project.startDate || endDate > existingPhase.project.endDate) {
        throw new Error('Phase dates must be within project date range');
      }
    }

    // Validate dependencies if being updated
    if (data.dependencies !== undefined) {
      const validation = await DependencyResolver.validateDependencies(
        existingPhase.projectId,
        data.dependencies,
        id
      );
      if (!validation.valid) {
        throw new Error(validation.reason);
      }
    }

    // Recalculate duration and labor hours if dates or crew changed
    let duration = existingPhase.duration;
    let laborHours = existingPhase.laborHours;

    if (data.startDate || data.endDate) {
      const startDate = data.startDate || existingPhase.startDate;
      const endDate = data.endDate || existingPhase.endDate;
      duration = this.calculateDuration(startDate, endDate);
    }

    if (data.requiredForeman !== undefined ||
        data.requiredJourneymen !== undefined ||
        data.requiredApprentices !== undefined ||
        data.startDate || data.endDate) {
      laborHours = this.calculateLaborHours(
        duration,
        data.requiredForeman ?? existingPhase.requiredForeman,
        data.requiredJourneymen ?? existingPhase.requiredJourneymen,
        data.requiredApprentices ?? existingPhase.requiredApprentices
      );
    }

    return await prisma.$transaction(async (tx) => {
      const phase = await tx.projectPhase.update({
        where: { id },
        data: {
          ...data,
          duration,
          laborHours,
          updatedBy: userId,
          requiredCrewSize: data.requiredForeman !== undefined ||
                           data.requiredJourneymen !== undefined ||
                           data.requiredApprentices !== undefined
            ? (data.requiredForeman ?? existingPhase.requiredForeman ? 1 : 0) +
              (data.requiredJourneymen ?? existingPhase.requiredJourneymen) +
              (data.requiredApprentices ?? existingPhase.requiredApprentices)
            : undefined
        },
        include: {
          project: true,
          assignments: true
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'ProjectPhase',
          entityId: id,
          action: 'UPDATE',
          userId,
          changes: { before: existingPhase, after: data },
          ipAddress: '0.0.0.0',
          userAgent: 'API'
        }
      });

      // Auto-set DELAYED status if actual end date exceeds planned
      if (phase.actualEndDate && phase.actualEndDate > phase.endDate) {
        await tx.projectPhase.update({
          where: { id },
          data: { status: PhaseStatus.DELAYED }
        });
      }

      return phase;
    });
  }

  /**
   * Update phase progress
   */
  static async updatePhaseProgress(id: string, progressPercentage: number, userId: string) {
    if (progressPercentage < 0 || progressPercentage > 100) {
      throw new Error('Progress percentage must be between 0 and 100');
    }

    const phase = await prisma.projectPhase.findUnique({
      where: { id }
    });

    if (!phase) {
      throw new Error('Phase not found');
    }

    // Auto-update status based on progress
    let newStatus = phase.status;
    if (progressPercentage === 0 && phase.status === PhaseStatus.IN_PROGRESS) {
      newStatus = PhaseStatus.NOT_STARTED;
    } else if (progressPercentage > 0 && progressPercentage < 100 && phase.status === PhaseStatus.NOT_STARTED) {
      newStatus = PhaseStatus.IN_PROGRESS;
    } else if (progressPercentage === 100) {
      newStatus = PhaseStatus.COMPLETED;
    }

    return await prisma.$transaction(async (tx) => {
      const updatedPhase = await tx.projectPhase.update({
        where: { id },
        data: {
          progressPercentage,
          status: newStatus,
          updatedBy: userId,
          actualStartDate: progressPercentage > 0 && !phase.actualStartDate ? new Date() : phase.actualStartDate,
          actualEndDate: progressPercentage === 100 && !phase.actualEndDate ? new Date() : phase.actualEndDate
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'ProjectPhase',
          entityId: id,
          action: 'UPDATE',
          userId,
          changes: {
            progressUpdate: {
              from: phase.progressPercentage,
              to: progressPercentage
            }
          },
          ipAddress: '0.0.0.0',
          userAgent: 'API'
        }
      });

      // Update project overall progress
      await this.updateProjectProgress(phase.projectId, tx);

      return updatedPhase;
    });
  }

  /**
   * Update project overall progress based on phases
   */
  private static async updateProjectProgress(projectId: string, tx: Prisma.TransactionClient) {
    const phases = await tx.projectPhase.findMany({
      where: { projectId },
      select: { progressPercentage: true }
    });

    if (phases.length === 0) return;

    const overallProgress = phases.reduce((sum, phase) => sum + phase.progressPercentage, 0) / phases.length;

    // Update project with overall progress
    await tx.project.update({
      where: { id: projectId },
      data: {
        // Store in notes for now, as we don't have a progressPercentage field on Project
        notes: `Overall Progress: ${overallProgress.toFixed(1)}%`
      }
    });
  }

  /**
   * Delete a phase
   */
  static async deletePhase(id: string, userId: string) {
    const phase = await prisma.projectPhase.findUnique({
      where: { id },
      include: {
        assignments: true
      }
    });

    if (!phase) {
      throw new Error('Phase not found');
    }

    // Check if phase has dependencies
    const dependentPhases = await prisma.projectPhase.count({
      where: {
        projectId: phase.projectId,
        dependencies: { has: id }
      }
    });

    if (dependentPhases > 0) {
      throw new Error('Cannot delete phase: other phases depend on it');
    }

    // Check if phase has assignments
    if (phase.assignments.length > 0) {
      throw new Error('Cannot delete phase: crew assignments exist');
    }

    return await prisma.$transaction(async (tx) => {
      await tx.projectPhase.delete({
        where: { id }
      });

      // Renumber remaining phases
      const remainingPhases = await tx.projectPhase.findMany({
        where: {
          projectId: phase.projectId,
          phaseNumber: { gt: phase.phaseNumber }
        },
        orderBy: { phaseNumber: 'asc' }
      });

      for (const remainingPhase of remainingPhases) {
        await tx.projectPhase.update({
          where: { id: remainingPhase.id },
          data: { phaseNumber: remainingPhase.phaseNumber - 1 }
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'ProjectPhase',
          entityId: id,
          action: 'DELETE',
          userId,
          changes: { deleted: phase },
          ipAddress: '0.0.0.0',
          userAgent: 'API'
        }
      });

      return { success: true };
    });
  }

  /**
   * Update phase status
   */
  static async updatePhaseStatus(id: string, status: PhaseStatus, userId: string) {
    const phase = await prisma.projectPhase.findUnique({
      where: { id }
    });

    if (!phase) {
      throw new Error('Phase not found');
    }

    // Validate status transition
    const validTransitions: Record<PhaseStatus, PhaseStatus[]> = {
      [PhaseStatus.NOT_STARTED]: [PhaseStatus.IN_PROGRESS, PhaseStatus.BLOCKED],
      [PhaseStatus.IN_PROGRESS]: [PhaseStatus.COMPLETED, PhaseStatus.DELAYED, PhaseStatus.BLOCKED],
      [PhaseStatus.DELAYED]: [PhaseStatus.IN_PROGRESS, PhaseStatus.BLOCKED],
      [PhaseStatus.BLOCKED]: [PhaseStatus.NOT_STARTED],
      [PhaseStatus.COMPLETED]: []
    };

    if (!validTransitions[phase.status].includes(status)) {
      throw new Error(`Cannot transition from ${phase.status} to ${status}`);
    }

    // Business rule validations
    if (status === PhaseStatus.IN_PROGRESS) {
      // Check dependencies are completed
      if (phase.dependencies.length > 0) {
        const incompleteDeps = await prisma.projectPhase.count({
          where: {
            id: { in: phase.dependencies },
            status: { not: PhaseStatus.COMPLETED }
          }
        });

        if (incompleteDeps > 0) {
          throw new Error('Cannot start phase: dependencies not completed');
        }
      }
    }

    if (status === PhaseStatus.COMPLETED && phase.progressPercentage < 100) {
      throw new Error('Cannot complete phase: progress is not 100%');
    }

    return await prisma.projectPhase.update({
      where: { id },
      data: {
        status,
        updatedBy: userId,
        actualStartDate: status === PhaseStatus.IN_PROGRESS && !phase.actualStartDate
          ? new Date()
          : phase.actualStartDate,
        actualEndDate: status === PhaseStatus.COMPLETED && !phase.actualEndDate
          ? new Date()
          : phase.actualEndDate
      }
    });
  }

  /**
   * Get phase dependencies
   */
  static async getPhaseDependencies(id: string) {
    const phase = await prisma.projectPhase.findUnique({
      where: { id },
      select: {
        dependencies: true,
        projectId: true
      }
    });

    if (!phase) {
      throw new Error('Phase not found');
    }

    if (phase.dependencies.length === 0) {
      return [];
    }

    return await prisma.projectPhase.findMany({
      where: {
        id: { in: phase.dependencies }
      },
      orderBy: { phaseNumber: 'asc' }
    });
  }

  /**
   * Get phases by status
   */
  static async getPhasesByStatus(status: PhaseStatus) {
    return await prisma.projectPhase.findMany({
      where: { status },
      include: {
        project: true
      },
      orderBy: [
        { startDate: 'asc' },
        { phaseNumber: 'asc' }
      ]
    });
  }
}