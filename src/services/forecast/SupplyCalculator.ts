import { prisma } from '@/lib/prisma/client';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { LaborSupply } from './LaborForecastService';

export class SupplyCalculator {
  private readonly STANDARD_HOURS_PER_WEEK = 40;

  /**
   * Calculate weekly labor supply for a division
   */
  async calculateWeeklySupply(
    division: string,
    weekStarting: Date
  ): Promise<LaborSupply> {
    const weekEnd = endOfWeek(weekStarting);

    // Get all active employees in the division who are available during this week
    const employees = await prisma.employee.findMany({
      where: {
        division: division as any,
        isActive: true,
        availabilityStart: { lte: weekEnd },
        OR: [
          { availabilityEnd: null },
          { availabilityEnd: { gte: weekStarting } },
        ],
      },
      include: {
        assignments: {
          where: {
            assignmentDate: {
              gte: weekStarting,
              lte: weekEnd,
            },
          },
        },
      },
    });

    // Calculate available hours by employee type
    let foremenHours = 0;
    let journeymenHours = 0;
    let apprenticeHours = 0;
    let totalHours = 0;
    let availableEmployees = 0;

    for (const employee of employees) {
      // Calculate available hours for this employee
      const maxHours = Number(employee.maxHoursPerWeek) || this.STANDARD_HOURS_PER_WEEK;

      // Subtract already assigned hours
      const assignedHours = employee.assignments.reduce(
        (sum, a) => sum + a.hoursAllocated,
        0
      );

      const availableHours = Math.max(0, maxHours - assignedHours);

      if (availableHours > 0) {
        availableEmployees++;

        switch (employee.employeeType) {
          case 'FOREMAN':
            foremenHours += availableHours;
            break;
          case 'JOURNEYMAN':
            journeymenHours += availableHours;
            break;
          case 'APPRENTICE':
            apprenticeHours += availableHours;
            break;
        }

        totalHours += availableHours;
      }
    }

    return {
      totalHours,
      foremenHours,
      journeymenHours,
      apprenticeHours,
      employeeCount: employees.length,
      availableEmployees,
    };
  }

  /**
   * Project future supply changes
   */
  async projectFutureSupply(
    division: string,
    weeksAhead: number
  ): Promise<Map<string, LaborSupply>> {
    const supplyMap = new Map<string, LaborSupply>();
    const currentWeek = startOfWeek(new Date());

    for (let i = 0; i < weeksAhead; i++) {
      const weekStart = new Date(currentWeek);
      weekStart.setDate(weekStart.getDate() + (i * 7));

      const supply = await this.calculateWeeklySupply(division, weekStart);
      supplyMap.set(weekStart.toISOString(), supply);
    }

    return supplyMap;
  }

  /**
   * Calculate supply changes based on hiring/termination plans
   */
  async calculateSupplyWithChanges(
    division: string,
    weekStarting: Date,
    plannedHires: { type: string; count: number; startDate: Date }[],
    plannedTerminations: { employeeId: string; date: Date }[]
  ): Promise<LaborSupply> {
    // Get base supply
    const baseSupply = await this.calculateWeeklySupply(division, weekStarting);

    // Adjust for planned hires
    for (const hire of plannedHires) {
      if (hire.startDate <= weekStarting) {
        const additionalHours = hire.count * this.STANDARD_HOURS_PER_WEEK;

        switch (hire.type) {
          case 'FOREMAN':
            baseSupply.foremenHours += additionalHours;
            break;
          case 'JOURNEYMAN':
            baseSupply.journeymenHours += additionalHours;
            break;
          case 'APPRENTICE':
            baseSupply.apprenticeHours += additionalHours;
            break;
        }

        baseSupply.totalHours += additionalHours;
        baseSupply.employeeCount += hire.count;
        baseSupply.availableEmployees += hire.count;
      }
    }

    // Adjust for planned terminations
    for (const termination of plannedTerminations) {
      if (termination.date <= weekStarting) {
        // This would need to look up the employee type and adjust accordingly
        // Simplified for now
        baseSupply.totalHours -= this.STANDARD_HOURS_PER_WEEK;
        baseSupply.employeeCount -= 1;
      }
    }

    return baseSupply;
  }
}