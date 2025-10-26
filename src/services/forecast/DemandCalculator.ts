import { prisma } from '@/lib/prisma/client';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { LaborDemand } from './LaborForecastService';

export class DemandCalculator {
  /**
   * Calculate weekly labor demand for a division
   */
  async calculateWeeklyDemand(
    division: string,
    weekStarting: Date,
    includeQuotedProjects: boolean = true
  ): Promise<LaborDemand> {
    const weekEnd = endOfWeek(weekStarting);

    // Get all active phases that overlap with this week
    const phases = await prisma.projectPhase.findMany({
      where: {
        division: division as any,
        status: {
          in: ['NOT_STARTED', 'IN_PROGRESS', 'DELAYED'],
        },
        startDate: { lte: weekEnd },
        endDate: { gte: weekStarting },
        project: {
          status: includeQuotedProjects
            ? { in: ['QUOTED', 'AWARDED', 'IN_PROGRESS'] }
            : { in: ['AWARDED', 'IN_PROGRESS'] },
        },
      },
      include: {
        project: true,
      },
    });

    // Calculate demand by employee type
    let foremenHours = 0;
    let journeymenHours = 0;
    let apprenticeHours = 0;
    let totalHours = 0;

    for (const phase of phases) {
      // Calculate weekly hours for this phase
      const phaseWeeklyHours = this.calculatePhaseWeeklyHours(phase, weekStarting, weekEnd);

      // Apply probability factor for QUOTED projects
      const probabilityFactor = phase.project.status === 'QUOTED' ? 0.5 : 1.0;
      const adjustedHours = phaseWeeklyHours * probabilityFactor;

      // Distribute hours by employee type based on phase requirements
      if (phase.requiredForeman) {
        foremenHours += adjustedHours * 0.2; // 20% foreman time
      }

      journeymenHours += adjustedHours * 0.5; // 50% journeymen time
      apprenticeHours += adjustedHours * 0.3; // 30% apprentice time

      totalHours += adjustedHours;
    }

    return {
      totalHours,
      foremenHours,
      journeymenHours,
      apprenticeHours,
      projectCount: new Set(phases.map(p => p.projectId)).size,
      phaseCount: phases.length,
    };
  }

  /**
   * Calculate hours for a phase in a specific week
   */
  private calculatePhaseWeeklyHours(phase: any, weekStart: Date, weekEnd: Date): number {
    // Calculate the overlap between phase and week
    const phaseStart = new Date(phase.startDate);
    const phaseEnd = new Date(phase.endDate);

    const overlapStart = phaseStart > weekStart ? phaseStart : weekStart;
    const overlapEnd = phaseEnd < weekEnd ? phaseEnd : weekEnd;

    // Calculate working days in overlap (excluding weekends)
    const workingDays = this.calculateWorkingDays(overlapStart, overlapEnd);

    // Calculate daily hours based on phase labor hours and duration
    const dailyHours = phase.laborHours / phase.duration;

    return workingDays * dailyHours;
  }

  /**
   * Calculate working days between two dates
   */
  private calculateWorkingDays(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Project future demand based on pipeline
   */
  async projectFutureDemand(
    division: string,
    weeksAhead: number
  ): Promise<Map<string, LaborDemand>> {
    const demandMap = new Map<string, LaborDemand>();
    const currentWeek = startOfWeek(new Date());

    for (let i = 0; i < weeksAhead; i++) {
      const weekStart = new Date(currentWeek);
      weekStart.setDate(weekStart.getDate() + (i * 7));

      const demand = await this.calculateWeeklyDemand(division, weekStart, true);
      demandMap.set(weekStart.toISOString(), demand);
    }

    return demandMap;
  }
}