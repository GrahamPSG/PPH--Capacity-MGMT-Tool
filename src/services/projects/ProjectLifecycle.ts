import { ProjectStatus } from '@prisma/client';
import prisma from '@/lib/prisma/client';

interface TransitionValidation {
  valid: boolean;
  reason?: string;
}

interface Project {
  id: string;
  status: ProjectStatus;
  foremanId: string | null;
  startDate: Date;
  contractAmount: any;
}

export class ProjectLifecycle {
  /**
   * Define valid status transitions
   */
  private static readonly STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
    [ProjectStatus.QUOTED]: [ProjectStatus.AWARDED, ProjectStatus.CANCELLED],
    [ProjectStatus.AWARDED]: [ProjectStatus.IN_PROGRESS, ProjectStatus.ON_HOLD, ProjectStatus.CANCELLED],
    [ProjectStatus.IN_PROGRESS]: [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED],
    [ProjectStatus.ON_HOLD]: [ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED],
    [ProjectStatus.COMPLETED]: [], // Terminal state
    [ProjectStatus.CANCELLED]: [] // Terminal state
  };

  /**
   * Validate if a status transition is allowed
   */
  static async validateStatusTransition(
    project: Project,
    newStatus: ProjectStatus
  ): Promise<TransitionValidation> {
    // Check if transition is allowed
    const allowedTransitions = this.STATUS_TRANSITIONS[project.status];
    if (!allowedTransitions.includes(newStatus)) {
      return {
        valid: false,
        reason: `Cannot transition from ${project.status} to ${newStatus}`
      };
    }

    // Apply business rules for specific transitions
    const validation = await this.validateBusinessRules(project, newStatus);
    if (!validation.valid) {
      return validation;
    }

    return { valid: true };
  }

  /**
   * Validate business rules for status transitions
   */
  private static async validateBusinessRules(
    project: Project,
    newStatus: ProjectStatus
  ): Promise<TransitionValidation> {
    switch (newStatus) {
      case ProjectStatus.IN_PROGRESS:
        return this.validateStartProject(project);

      case ProjectStatus.COMPLETED:
        return await this.validateCompleteProject(project);

      case ProjectStatus.ON_HOLD:
        return this.validateHoldProject(project);

      case ProjectStatus.CANCELLED:
        return this.validateCancelProject(project);

      case ProjectStatus.AWARDED:
        return this.validateAwardProject(project);

      default:
        return { valid: true };
    }
  }

  /**
   * Validate requirements for starting a project
   */
  private static validateStartProject(project: Project): TransitionValidation {
    // Must have a foreman assigned
    if (!project.foremanId) {
      return {
        valid: false,
        reason: 'Project must have a foreman assigned before starting'
      };
    }

    // Must have a valid start date
    if (!project.startDate) {
      return {
        valid: false,
        reason: 'Project must have a start date before starting'
      };
    }

    // Start date should not be too far in the future
    const today = new Date();
    const startDate = new Date(project.startDate);
    const daysDiff = Math.floor((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 90) {
      return {
        valid: false,
        reason: 'Project start date is more than 90 days in the future'
      };
    }

    return { valid: true };
  }

  /**
   * Validate requirements for completing a project
   */
  private static async validateCompleteProject(project: Project): Promise<TransitionValidation> {
    // Check if all phases are completed
    const incompletePhasesCount = await prisma.projectPhase.count({
      where: {
        projectId: project.id,
        status: {
          not: 'COMPLETED'
        }
      }
    });

    if (incompletePhasesCount > 0) {
      return {
        valid: false,
        reason: `Cannot complete project: ${incompletePhasesCount} phases are not completed`
      };
    }

    // Check if there are outstanding expenses
    const unapprovedExpenses = await prisma.projectExpense.count({
      where: {
        projectId: project.id,
        approvedBy: null
      }
    });

    if (unapprovedExpenses > 0) {
      return {
        valid: false,
        reason: `Cannot complete project: ${unapprovedExpenses} expenses pending approval`
      };
    }

    return { valid: true };
  }

  /**
   * Validate requirements for putting project on hold
   */
  private static validateHoldProject(project: Project): TransitionValidation {
    // Can only hold active projects
    if (project.status !== ProjectStatus.AWARDED && project.status !== ProjectStatus.IN_PROGRESS) {
      return {
        valid: false,
        reason: 'Can only put active projects on hold'
      };
    }

    return { valid: true };
  }

  /**
   * Validate requirements for cancelling a project
   */
  private static validateCancelProject(project: Project): TransitionValidation {
    // Cannot cancel completed projects
    if (project.status === ProjectStatus.COMPLETED) {
      return {
        valid: false,
        reason: 'Cannot cancel a completed project'
      };
    }

    return { valid: true };
  }

  /**
   * Validate requirements for awarding a project
   */
  private static validateAwardProject(project: Project): TransitionValidation {
    // Must have contract amount
    if (!project.contractAmount || Number(project.contractAmount) <= 0) {
      return {
        valid: false,
        reason: 'Project must have a valid contract amount before awarding'
      };
    }

    return { valid: true };
  }

  /**
   * Get next valid statuses for a project
   */
  static getNextValidStatuses(currentStatus: ProjectStatus): ProjectStatus[] {
    return this.STATUS_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Check if a status is terminal
   */
  static isTerminalStatus(status: ProjectStatus): boolean {
    return status === ProjectStatus.COMPLETED || status === ProjectStatus.CANCELLED;
  }

  /**
   * Check if a status is active
   */
  static isActiveStatus(status: ProjectStatus): boolean {
    return status === ProjectStatus.IN_PROGRESS || status === ProjectStatus.AWARDED;
  }

  /**
   * Get status display information
   */
  static getStatusInfo(status: ProjectStatus) {
    const statusInfo: Record<ProjectStatus, { label: string; color: string; icon: string }> = {
      [ProjectStatus.QUOTED]: {
        label: 'Quoted',
        color: 'gray',
        icon: 'quote'
      },
      [ProjectStatus.AWARDED]: {
        label: 'Awarded',
        color: 'blue',
        icon: 'trophy'
      },
      [ProjectStatus.IN_PROGRESS]: {
        label: 'In Progress',
        color: 'yellow',
        icon: 'clock'
      },
      [ProjectStatus.ON_HOLD]: {
        label: 'On Hold',
        color: 'orange',
        icon: 'pause'
      },
      [ProjectStatus.COMPLETED]: {
        label: 'Completed',
        color: 'green',
        icon: 'check'
      },
      [ProjectStatus.CANCELLED]: {
        label: 'Cancelled',
        color: 'red',
        icon: 'x'
      }
    };

    return statusInfo[status];
  }
}