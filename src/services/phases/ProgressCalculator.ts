import prisma from '@/lib/prisma/client';
import { PhaseStatus } from '@prisma/client';

export interface PhaseProgress {
  phaseId: string;
  phaseName: string;
  plannedHours: number;
  actualHours: number;
  progressPercentage: number;
  estimatedCompletionDate: Date | null;
  isDelayed: boolean;
  delayDays: number;
}

export interface ProjectProgress {
  projectId: string;
  totalPhases: number;
  completedPhases: number;
  inProgressPhases: number;
  overallProgress: number;
  estimatedCompletionDate: Date | null;
  criticalPhases: PhaseProgress[];
}

export class ProgressCalculator {
  /**
   * Calculate phase progress from crew assignments
   */
  static async calculatePhaseProgressFromAssignments(phaseId: string): Promise<PhaseProgress> {
    const phase = await prisma.projectPhase.findUnique({
      where: { id: phaseId },
      include: {
        assignments: true
      }
    });

    if (!phase) {
      throw new Error('Phase not found');
    }

    // Calculate actual hours worked
    const actualHours = phase.assignments.reduce(
      (sum, assignment) => sum + (assignment.actualHoursWorked || 0),
      0
    );

    // Calculate progress percentage
    const progressPercentage = phase.laborHours > 0
      ? Math.min(100, (actualHours / phase.laborHours) * 100)
      : 0;

    // Estimate completion date
    let estimatedCompletionDate: Date | null = null;
    if (progressPercentage > 0 && progressPercentage < 100) {
      const remainingHours = phase.laborHours - actualHours;
      const dailyCapacity = phase.requiredCrewSize * 8; // 8 hours per day
      const remainingDays = Math.ceil(remainingHours / dailyCapacity);

      estimatedCompletionDate = new Date();
      estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + remainingDays);
    } else if (progressPercentage === 100) {
      estimatedCompletionDate = phase.actualEndDate || phase.endDate;
    }

    // Check if delayed
    const today = new Date();
    const isDelayed = today > phase.endDate && phase.status !== PhaseStatus.COMPLETED;
    const delayDays = isDelayed
      ? Math.ceil((today.getTime() - phase.endDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      phaseId: phase.id,
      phaseName: phase.name,
      plannedHours: phase.laborHours,
      actualHours,
      progressPercentage,
      estimatedCompletionDate,
      isDelayed,
      delayDays
    };
  }

  /**
   * Calculate project overall progress
   */
  static async calculateProjectProgress(projectId: string): Promise<ProjectProgress> {
    const phases = await prisma.projectPhase.findMany({
      where: { projectId },
      include: {
        assignments: true
      }
    });

    if (phases.length === 0) {
      return {
        projectId,
        totalPhases: 0,
        completedPhases: 0,
        inProgressPhases: 0,
        overallProgress: 0,
        estimatedCompletionDate: null,
        criticalPhases: []
      };
    }

    // Count phases by status
    const completedPhases = phases.filter(p => p.status === PhaseStatus.COMPLETED).length;
    const inProgressPhases = phases.filter(p => p.status === PhaseStatus.IN_PROGRESS).length;

    // Calculate overall progress
    const totalProgress = phases.reduce((sum, phase) => sum + phase.progressPercentage, 0);
    const overallProgress = totalProgress / phases.length;

    // Calculate phase progress for critical phases
    const criticalPhases: PhaseProgress[] = [];
    let latestCompletionDate: Date | null = null;

    for (const phase of phases) {
      if (phase.status !== PhaseStatus.COMPLETED) {
        const progress = await this.calculatePhaseProgressFromAssignments(phase.id);

        if (progress.isDelayed || phase.status === PhaseStatus.BLOCKED) {
          criticalPhases.push(progress);
        }

        if (progress.estimatedCompletionDate) {
          if (!latestCompletionDate || progress.estimatedCompletionDate > latestCompletionDate) {
            latestCompletionDate = progress.estimatedCompletionDate;
          }
        }
      }
    }

    return {
      projectId,
      totalPhases: phases.length,
      completedPhases,
      inProgressPhases,
      overallProgress,
      estimatedCompletionDate: latestCompletionDate,
      criticalPhases
    };
  }

  /**
   * Detect delays in phase execution
   */
  static async detectPhaseDelays(projectId?: string) {
    const where = projectId ? { projectId } : {};

    const phases = await prisma.projectPhase.findMany({
      where: {
        ...where,
        status: {
          in: [PhaseStatus.IN_PROGRESS, PhaseStatus.NOT_STARTED]
        }
      }
    });

    const today = new Date();
    const delayedPhases = [];

    for (const phase of phases) {
      // Check if phase should have started
      if (phase.status === PhaseStatus.NOT_STARTED && phase.startDate < today) {
        delayedPhases.push({
          phase,
          type: 'START_DELAY',
          delayDays: Math.ceil((today.getTime() - phase.startDate.getTime()) / (1000 * 60 * 60 * 24))
        });
      }

      // Check if phase is overdue
      if (phase.status === PhaseStatus.IN_PROGRESS && phase.endDate < today) {
        const progress = await this.calculatePhaseProgressFromAssignments(phase.id);
        if (progress.progressPercentage < 100) {
          delayedPhases.push({
            phase,
            type: 'COMPLETION_DELAY',
            delayDays: Math.ceil((today.getTime() - phase.endDate.getTime()) / (1000 * 60 * 60 * 24)),
            progressPercentage: progress.progressPercentage
          });
        }
      }
    }

    return delayedPhases;
  }

  /**
   * Calculate completion forecast
   */
  static async calculateCompletionForecast(phaseId: string) {
    const phase = await prisma.projectPhase.findUnique({
      where: { id: phaseId },
      include: {
        assignments: {
          orderBy: { assignmentDate: 'desc' },
          take: 7 // Last week's assignments
        }
      }
    });

    if (!phase) {
      throw new Error('Phase not found');
    }

    // Calculate average daily progress from recent assignments
    const recentHours = phase.assignments.reduce(
      (sum, a) => sum + (a.actualHoursWorked || 0),
      0
    );
    const daysWithWork = new Set(
      phase.assignments.map(a => a.assignmentDate.toISOString().split('T')[0])
    ).size;

    if (daysWithWork === 0) {
      return {
        phaseId,
        forecastedCompletionDate: null,
        confidenceLevel: 0,
        remainingDays: null,
        averageDailyProgress: 0
      };
    }

    const averageDailyHours = recentHours / daysWithWork;
    const currentProgress = await this.calculatePhaseProgressFromAssignments(phaseId);
    const remainingHours = phase.laborHours - currentProgress.actualHours;

    if (averageDailyHours === 0) {
      return {
        phaseId,
        forecastedCompletionDate: null,
        confidenceLevel: 0,
        remainingDays: null,
        averageDailyProgress: 0
      };
    }

    const remainingDays = Math.ceil(remainingHours / averageDailyHours);
    const forecastedCompletionDate = new Date();
    forecastedCompletionDate.setDate(forecastedCompletionDate.getDate() + remainingDays);

    // Calculate confidence level based on consistency of recent progress
    const progressVariance = this.calculateProgressVariance(phase.assignments.map(a => a.actualHoursWorked || 0));
    const confidenceLevel = Math.max(0, Math.min(100, 100 - progressVariance * 10));

    return {
      phaseId,
      forecastedCompletionDate,
      confidenceLevel,
      remainingDays,
      averageDailyProgress: (averageDailyHours / phase.laborHours) * 100
    };
  }

  /**
   * Calculate variance in progress (for confidence calculation)
   */
  private static calculateProgressVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Generate progress report for project
   */
  static async generateProgressReport(projectId: string) {
    const [project, phases, expenses] = await prisma.$transaction([
      prisma.project.findUnique({
        where: { id: projectId }
      }),
      prisma.projectPhase.findMany({
        where: { projectId },
        include: {
          assignments: true
        }
      }),
      prisma.projectExpense.aggregate({
        where: { projectId },
        _sum: { amount: true }
      })
    ]);

    if (!project) {
      throw new Error('Project not found');
    }

    const projectProgress = await this.calculateProjectProgress(projectId);
    const delayedPhases = await this.detectPhaseDelays(projectId);

    // Calculate phase-level details
    const phaseDetails = await Promise.all(
      phases.map(async (phase) => {
        const progress = await this.calculatePhaseProgressFromAssignments(phase.id);
        const forecast = await this.calculateCompletionForecast(phase.id);

        return {
          phaseNumber: phase.phaseNumber,
          name: phase.name,
          status: phase.status,
          progress: progress.progressPercentage,
          plannedHours: phase.laborHours,
          actualHours: progress.actualHours,
          isDelayed: progress.isDelayed,
          delayDays: progress.delayDays,
          forecastedCompletion: forecast.forecastedCompletionDate,
          confidence: forecast.confidenceLevel
        };
      })
    );

    // Calculate budget utilization
    const contractAmount = Number(project.contractAmount);
    const totalExpenses = Number(expenses._sum.amount || 0);
    const budgetUtilization = contractAmount > 0 ? (totalExpenses / contractAmount) * 100 : 0;

    return {
      project: {
        id: project.id,
        code: project.projectCode,
        name: project.name,
        status: project.status
      },
      summary: {
        overallProgress: projectProgress.overallProgress,
        completedPhases: projectProgress.completedPhases,
        totalPhases: projectProgress.totalPhases,
        estimatedCompletion: projectProgress.estimatedCompletionDate,
        budgetUtilization,
        delayedPhases: delayedPhases.length
      },
      phases: phaseDetails,
      criticalIssues: [
        ...delayedPhases.map(d => ({
          type: d.type,
          phase: d.phase.name,
          severity: d.delayDays > 7 ? 'HIGH' : 'MEDIUM',
          description: `Phase delayed by ${d.delayDays} days`
        })),
        ...projectProgress.criticalPhases
          .filter(p => p.isDelayed)
          .map(p => ({
            type: 'CRITICAL_PATH_DELAY',
            phase: p.phaseName,
            severity: 'HIGH',
            description: `Critical path phase delayed by ${p.delayDays} days`
          }))
      ],
      generatedAt: new Date()
    };
  }
}