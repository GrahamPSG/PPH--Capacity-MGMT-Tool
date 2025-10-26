/**
 * Capacity Calculator Service
 *
 * Calculates labor capacity, utilization, and availability
 * for divisions across different time periods
 */

import prisma from '@/lib/prisma/client';
import { Division, EmployeeType, PhaseStatus } from '@prisma/client';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachMonthOfInterval, format } from 'date-fns';

export interface CapacityData {
  period: string;
  startDate: Date;
  endDate: Date;
  division: Division;
  availableHours: number;
  requiredHours: number;
  assignedHours: number;
  utilization: number;
  employeeCount: {
    foremen: number;
    journeymen: number;
    apprentices: number;
    total: number;
  };
  projectCount: number;
  phaseCount: number;
  deficit: number;
}

export interface MonthlyCapacity {
  month: string;
  year: number;
  plumbing: {
    multifamily: CapacityData | null;
    commercial: CapacityData | null;
    custom: CapacityData | null;
  };
  hvac: {
    multifamily: CapacityData | null;
    commercial: CapacityData | null;
    custom: CapacityData | null;
  };
  totals: {
    plumbingUtilization: number;
    hvacUtilization: number;
    overallUtilization: number;
  };
}

export class CapacityCalculator {
  /**
   * Calculate monthly capacity for a date range
   */
  static async calculateMonthlyCapacity(
    startDate: Date,
    endDate: Date,
    division?: Division
  ): Promise<MonthlyCapacity[]> {
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const results: MonthlyCapacity[] = [];

    for (const monthStart of months) {
      const monthEnd = endOfMonth(monthStart);
      const monthData = await this.calculateMonthCapacity(monthStart, monthEnd, division);
      results.push(monthData);
    }

    return results;
  }

  /**
   * Calculate capacity for a single month
   */
  private static async calculateMonthCapacity(
    monthStart: Date,
    monthEnd: Date,
    filterDivision?: Division
  ): Promise<MonthlyCapacity> {
    const divisions = filterDivision ? [filterDivision] : Object.values(Division);
    const monthCapacity: MonthlyCapacity = {
      month: format(monthStart, 'MMMM'),
      year: monthStart.getFullYear(),
      plumbing: {
        multifamily: null,
        commercial: null,
        custom: null
      },
      hvac: {
        multifamily: null,
        commercial: null,
        custom: null
      },
      totals: {
        plumbingUtilization: 0,
        hvacUtilization: 0,
        overallUtilization: 0
      }
    };

    let totalPlumbingAvailable = 0;
    let totalPlumbingRequired = 0;
    let totalHvacAvailable = 0;
    let totalHvacRequired = 0;

    for (const division of divisions) {
      const capacityData = await this.calculateDivisionCapacity(
        monthStart,
        monthEnd,
        division
      );

      // Organize by division type
      if (division.startsWith('PLUMBING')) {
        if (division === Division.PLUMBING_MULTIFAMILY) {
          monthCapacity.plumbing.multifamily = capacityData;
        } else if (division === Division.PLUMBING_COMMERCIAL) {
          monthCapacity.plumbing.commercial = capacityData;
        } else if (division === Division.PLUMBING_CUSTOM) {
          monthCapacity.plumbing.custom = capacityData;
        }
        totalPlumbingAvailable += capacityData.availableHours;
        totalPlumbingRequired += capacityData.requiredHours;
      } else if (division.startsWith('HVAC')) {
        if (division === Division.HVAC_MULTIFAMILY) {
          monthCapacity.hvac.multifamily = capacityData;
        } else if (division === Division.HVAC_COMMERCIAL) {
          monthCapacity.hvac.commercial = capacityData;
        } else if (division === Division.HVAC_CUSTOM) {
          monthCapacity.hvac.custom = capacityData;
        }
        totalHvacAvailable += capacityData.availableHours;
        totalHvacRequired += capacityData.requiredHours;
      }
    }

    // Calculate totals
    monthCapacity.totals.plumbingUtilization =
      totalPlumbingAvailable > 0
        ? Math.round((totalPlumbingRequired / totalPlumbingAvailable) * 100)
        : 0;

    monthCapacity.totals.hvacUtilization =
      totalHvacAvailable > 0
        ? Math.round((totalHvacRequired / totalHvacAvailable) * 100)
        : 0;

    const totalAvailable = totalPlumbingAvailable + totalHvacAvailable;
    const totalRequired = totalPlumbingRequired + totalHvacRequired;

    monthCapacity.totals.overallUtilization =
      totalAvailable > 0
        ? Math.round((totalRequired / totalAvailable) * 100)
        : 0;

    return monthCapacity;
  }

  /**
   * Calculate capacity for a specific division
   */
  private static async calculateDivisionCapacity(
    startDate: Date,
    endDate: Date,
    division: Division
  ): Promise<CapacityData> {
    // Get active employees in division
    const employees = await prisma.employee.findMany({
      where: {
        division,
        isActive: true,
        availabilityStart: { lte: endDate },
        OR: [
          { availabilityEnd: null },
          { availabilityEnd: { gte: startDate } }
        ]
      }
    });

    // Calculate available hours (assuming 40 hours/week, 4.33 weeks/month)
    const weeksInPeriod = 4.33; // Average weeks per month
    const availableHours = employees.reduce((total, emp) => {
      return total + (emp.maxHoursPerWeek || 40) * weeksInPeriod;
    }, 0);

    // Get phases in this period
    const phases = await prisma.projectPhase.findMany({
      where: {
        division,
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } }
            ]
          }
        ],
        status: {
          notIn: [PhaseStatus.COMPLETED, PhaseStatus.BLOCKED]
        }
      },
      include: {
        project: true,
        assignments: true
      }
    });

    // Calculate required hours based on phases
    const requiredHours = phases.reduce((total, phase) => {
      // Calculate overlap days within the month
      const phaseStart = phase.startDate > startDate ? phase.startDate : startDate;
      const phaseEnd = phase.endDate < endDate ? phase.endDate : endDate;
      const overlapDays = Math.ceil((phaseEnd.getTime() - phaseStart.getTime()) / (1000 * 60 * 60 * 24));
      const totalPhaseDays = Math.ceil((phase.endDate.getTime() - phase.startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Prorate labor hours based on overlap
      const proratedHours = totalPhaseDays > 0
        ? (phase.laborHours * overlapDays / totalPhaseDays)
        : 0;

      return total + proratedHours;
    }, 0);

    // Calculate assigned hours from actual assignments
    const assignments = await prisma.crewAssignment.findMany({
      where: {
        phase: {
          division,
          project: {
            status: {
              notIn: ['CANCELLED', 'COMPLETED']
            }
          }
        },
        assignmentDate: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const assignedHours = assignments.reduce((total, assignment) => {
      return total + assignment.hoursAllocated;
    }, 0);

    // Count employees by type
    const employeeCount = {
      foremen: employees.filter(e => e.employeeType === EmployeeType.FOREMAN).length,
      journeymen: employees.filter(e => e.employeeType === EmployeeType.JOURNEYMAN).length,
      apprentices: employees.filter(e => e.employeeType === EmployeeType.APPRENTICE).length,
      total: employees.length
    };

    // Count unique projects and phases
    const uniqueProjectIds = new Set(phases.map(p => p.projectId));
    const projectCount = uniqueProjectIds.size;
    const phaseCount = phases.length;

    // Calculate utilization and deficit
    const utilization = availableHours > 0
      ? Math.round((requiredHours / availableHours) * 100)
      : 0;

    const deficit = Math.max(0, requiredHours - availableHours);

    return {
      period: format(startDate, 'MMM yyyy'),
      startDate,
      endDate,
      division,
      availableHours: Math.round(availableHours),
      requiredHours: Math.round(requiredHours),
      assignedHours: Math.round(assignedHours),
      utilization,
      employeeCount,
      projectCount,
      phaseCount,
      deficit: Math.round(deficit)
    };
  }

  /**
   * Get capacity forecast for upcoming months
   */
  static async getCapacityForecast(
    months: number = 6,
    division?: Division
  ): Promise<MonthlyCapacity[]> {
    const startDate = startOfMonth(new Date());
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    return this.calculateMonthlyCapacity(startDate, endOfMonth(endDate), division);
  }

  /**
   * Calculate weekly capacity for detailed view
   */
  static async calculateWeeklyCapacity(
    startDate: Date,
    endDate: Date,
    division: Division
  ): Promise<CapacityData[]> {
    const results: CapacityData[] = [];
    let currentWeek = startOfWeek(startDate);

    while (currentWeek <= endDate) {
      const weekEnd = endOfWeek(currentWeek);
      const weekCapacity = await this.calculateDivisionCapacity(
        currentWeek,
        weekEnd,
        division
      );
      results.push(weekCapacity);
      currentWeek = new Date(currentWeek.setDate(currentWeek.getDate() + 7));
    }

    return results;
  }

  /**
   * Get critical capacity periods (over 90% utilization)
   */
  static async getCriticalPeriods(
    startDate: Date,
    endDate: Date,
    threshold: number = 90
  ): Promise<CapacityData[]> {
    const monthlyData = await this.calculateMonthlyCapacity(startDate, endDate);
    const criticalPeriods: CapacityData[] = [];

    monthlyData.forEach(month => {
      // Check plumbing divisions
      if (month.plumbing.multifamily?.utilization >= threshold) {
        criticalPeriods.push(month.plumbing.multifamily);
      }
      if (month.plumbing.commercial?.utilization >= threshold) {
        criticalPeriods.push(month.plumbing.commercial);
      }
      if (month.plumbing.custom?.utilization >= threshold) {
        criticalPeriods.push(month.plumbing.custom);
      }

      // Check HVAC divisions
      if (month.hvac.multifamily?.utilization >= threshold) {
        criticalPeriods.push(month.hvac.multifamily);
      }
      if (month.hvac.commercial?.utilization >= threshold) {
        criticalPeriods.push(month.hvac.commercial);
      }
      if (month.hvac.custom?.utilization >= threshold) {
        criticalPeriods.push(month.hvac.custom);
      }
    });

    return criticalPeriods;
  }
}