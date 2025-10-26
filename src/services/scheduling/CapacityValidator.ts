import { prisma } from '@/lib/prisma/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

export interface CapacityCheck {
  division: string;
  date: Date;
  totalEmployees: number;
  availableHours: number;
  scheduledHours: number;
  remainingHours: number;
  utilizationPercentage: number;
  hasCapacity: boolean;
  employeeBreakdown: EmployeeTypeBreakdown;
  criticalProjects: string[];
  recommendations: string[];
}

interface EmployeeTypeBreakdown {
  foreman: { available: number; scheduled: number };
  journeyman: { available: number; scheduled: number };
  apprentice: { available: number; scheduled: number };
}

export interface CapacityForecast {
  division: string;
  startDate: Date;
  endDate: Date;
  dailyCapacity: DailyCapacity[];
  weeklyCapacity: WeeklyCapacity[];
  deficitDates: Date[];
  recommendations: string[];
}

interface DailyCapacity {
  date: Date;
  availableHours: number;
  scheduledHours: number;
  utilizationPercentage: number;
  hasDeficit: boolean;
}

interface WeeklyCapacity {
  weekStart: Date;
  totalAvailable: number;
  totalScheduled: number;
  averageUtilization: number;
  peakUtilization: number;
}

export class CapacityValidator {
  private readonly STANDARD_HOURS_PER_DAY = 8;
  private readonly OVERTIME_THRESHOLD = 0.9; // 90% utilization triggers overtime consideration
  private readonly CRITICAL_THRESHOLD = 1.0; // 100% is over capacity

  /**
   * Validate division capacity for a specific date
   */
  async validateDivisionCapacity(
    division: string,
    date: Date,
    additionalHours: number = 0
  ): Promise<CapacityCheck> {
    // Get all active employees in the division
    const employees = await prisma.employee.findMany({
      where: {
        division: division as any,
        isActive: true,
        availabilityStart: { lte: date },
        OR: [
          { availabilityEnd: null },
          { availabilityEnd: { gte: date } },
        ],
      },
      include: {
        assignments: {
          where: {
            assignmentDate: {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lte: new Date(date.setHours(23, 59, 59, 999)),
            },
          },
          include: {
            phase: {
              include: {
                project: true,
              },
            },
          },
        },
      },
    });

    // Calculate available hours
    const availableHours = employees.length * this.STANDARD_HOURS_PER_DAY;

    // Calculate scheduled hours
    const scheduledHours = employees.reduce(
      (total, emp) =>
        total + emp.assignments.reduce((sum, a) => sum + a.hoursAllocated, 0),
      0
    ) + additionalHours;

    // Calculate remaining capacity
    const remainingHours = availableHours - scheduledHours;
    const utilizationPercentage = availableHours > 0
      ? (scheduledHours / availableHours) * 100
      : 0;

    // Break down by employee type
    const employeeBreakdown = this.calculateEmployeeBreakdown(employees);

    // Identify critical projects (those at risk due to capacity constraints)
    const criticalProjects = this.identifyCriticalProjects(employees);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      utilizationPercentage,
      remainingHours,
      employeeBreakdown
    );

    return {
      division,
      date,
      totalEmployees: employees.length,
      availableHours,
      scheduledHours,
      remainingHours,
      utilizationPercentage,
      hasCapacity: remainingHours >= 0 && utilizationPercentage < this.CRITICAL_THRESHOLD * 100,
      employeeBreakdown,
      criticalProjects,
      recommendations,
    };
  }

  /**
   * Forecast capacity for a date range
   */
  async forecastCapacity(
    division: string,
    startDate: Date,
    endDate: Date
  ): Promise<CapacityForecast> {
    const dailyCapacity: DailyCapacity[] = [];
    const deficitDates: Date[] = [];

    // Calculate daily capacity
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const capacity = await this.validateDivisionCapacity(division, new Date(currentDate));

      const daily: DailyCapacity = {
        date: new Date(currentDate),
        availableHours: capacity.availableHours,
        scheduledHours: capacity.scheduledHours,
        utilizationPercentage: capacity.utilizationPercentage,
        hasDeficit: capacity.scheduledHours > capacity.availableHours,
      };

      dailyCapacity.push(daily);

      if (daily.hasDeficit) {
        deficitDates.push(new Date(currentDate));
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate weekly aggregates
    const weeklyCapacity = this.aggregateWeeklyCapacity(dailyCapacity);

    // Generate forecast recommendations
    const recommendations = this.generateForecastRecommendations(
      dailyCapacity,
      weeklyCapacity,
      deficitDates
    );

    return {
      division,
      startDate,
      endDate,
      dailyCapacity,
      weeklyCapacity,
      deficitDates,
      recommendations,
    };
  }

  /**
   * Calculate total division capacity by week
   */
  async calculateWeeklyCapacity(
    division: string,
    weekStart: Date
  ): Promise<WeeklyCapacity> {
    const weekEnd = endOfWeek(weekStart);
    const forecast = await this.forecastCapacity(division, weekStart, weekEnd);

    return forecast.weeklyCapacity[0];
  }

  /**
   * Validate capacity against utilization thresholds
   */
  async validateUtilizationThresholds(
    division: string,
    date: Date,
    thresholds: {
      warning: number;
      critical: number;
    } = { warning: 80, critical: 100 }
  ): Promise<{
    status: 'OK' | 'WARNING' | 'CRITICAL';
    utilization: number;
    message: string;
  }> {
    const capacity = await this.validateDivisionCapacity(division, date);

    if (capacity.utilizationPercentage >= thresholds.critical) {
      return {
        status: 'CRITICAL',
        utilization: capacity.utilizationPercentage,
        message: `Division is over capacity at ${capacity.utilizationPercentage.toFixed(1)}%`,
      };
    }

    if (capacity.utilizationPercentage >= thresholds.warning) {
      return {
        status: 'WARNING',
        utilization: capacity.utilizationPercentage,
        message: `Division approaching capacity at ${capacity.utilizationPercentage.toFixed(1)}%`,
      };
    }

    return {
      status: 'OK',
      utilization: capacity.utilizationPercentage,
      message: `Division has adequate capacity at ${capacity.utilizationPercentage.toFixed(1)}%`,
    };
  }

  /**
   * Generate capacity report for management
   */
  async generateCapacityReport(
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const divisions = ['PLUMBING_MULTIFAMILY', 'PLUMBING_COMMERCIAL', 'PLUMBING_CUSTOM',
                       'HVAC_MULTIFAMILY', 'HVAC_COMMERCIAL', 'HVAC_CUSTOM'];

    const report: any = {
      period: {
        start: startDate,
        end: endDate,
      },
      divisions: {},
      summary: {
        totalAvailableHours: 0,
        totalScheduledHours: 0,
        overallUtilization: 0,
        divisionsAtRisk: [],
        criticalDates: [],
      },
    };

    for (const division of divisions) {
      const forecast = await this.forecastCapacity(division, startDate, endDate);

      const totalAvailable = forecast.dailyCapacity.reduce(
        (sum, d) => sum + d.availableHours,
        0
      );
      const totalScheduled = forecast.dailyCapacity.reduce(
        (sum, d) => sum + d.scheduledHours,
        0
      );

      report.divisions[division] = {
        totalAvailable,
        totalScheduled,
        utilizationPercentage: (totalScheduled / totalAvailable) * 100,
        deficitDates: forecast.deficitDates,
        weeklyBreakdown: forecast.weeklyCapacity,
      };

      report.summary.totalAvailableHours += totalAvailable;
      report.summary.totalScheduledHours += totalScheduled;

      if (forecast.deficitDates.length > 0) {
        report.summary.divisionsAtRisk.push(division);
        report.summary.criticalDates.push(...forecast.deficitDates);
      }
    }

    report.summary.overallUtilization =
      (report.summary.totalScheduledHours / report.summary.totalAvailableHours) * 100;

    return report;
  }

  /**
   * Recommend hiring or contractor needs based on capacity deficits
   */
  async recommendStaffingNeeds(
    division: string,
    forecastPeriodDays: number = 30
  ): Promise<{
    recommendedHires: number;
    contractorHours: number;
    estimatedCost: number;
    justification: string[];
  }> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + forecastPeriodDays);

    const forecast = await this.forecastCapacity(division, startDate, endDate);

    // Calculate total deficit
    const totalDeficit = forecast.dailyCapacity.reduce(
      (sum, d) => sum + Math.max(0, d.scheduledHours - d.availableHours),
      0
    );

    // Calculate average daily deficit
    const averageDailyDeficit = totalDeficit / forecastPeriodDays;

    // Recommendations
    const recommendedHires = Math.floor(averageDailyDeficit / this.STANDARD_HOURS_PER_DAY);
    const contractorHours = totalDeficit - (recommendedHires * this.STANDARD_HOURS_PER_DAY * forecastPeriodDays);

    // Estimate costs (example rates)
    const EMPLOYEE_DAILY_COST = 400; // $50/hour * 8 hours
    const CONTRACTOR_HOURLY_RATE = 75;

    const estimatedCost =
      recommendedHires * EMPLOYEE_DAILY_COST * forecastPeriodDays +
      contractorHours * CONTRACTOR_HOURLY_RATE;

    const justification = [];

    if (recommendedHires > 0) {
      justification.push(
        `Hire ${recommendedHires} new employee(s) to address consistent capacity deficit`
      );
    }

    if (contractorHours > 0) {
      justification.push(
        `Engage contractors for ${contractorHours.toFixed(0)} hours to handle peak periods`
      );
    }

    if (forecast.deficitDates.length > forecastPeriodDays * 0.3) {
      justification.push(
        `Over 30% of days show capacity deficit, indicating chronic understaffing`
      );
    }

    return {
      recommendedHires,
      contractorHours,
      estimatedCost,
      justification,
    };
  }

  /**
   * Calculate employee type breakdown
   */
  private calculateEmployeeBreakdown(employees: any[]): EmployeeTypeBreakdown {
    const breakdown: EmployeeTypeBreakdown = {
      foreman: { available: 0, scheduled: 0 },
      journeyman: { available: 0, scheduled: 0 },
      apprentice: { available: 0, scheduled: 0 },
    };

    employees.forEach(emp => {
      const type = emp.employeeType.toLowerCase();
      if (breakdown[type as keyof EmployeeTypeBreakdown]) {
        breakdown[type as keyof EmployeeTypeBreakdown].available += this.STANDARD_HOURS_PER_DAY;
        breakdown[type as keyof EmployeeTypeBreakdown].scheduled += emp.assignments.reduce(
          (sum: number, a: any) => sum + a.hoursAllocated,
          0
        );
      }
    });

    return breakdown;
  }

  /**
   * Identify critical projects at risk due to capacity constraints
   */
  private identifyCriticalProjects(employees: any[]): string[] {
    const projectMap = new Map<string, number>();

    employees.forEach(emp => {
      emp.assignments.forEach((a: any) => {
        const projectId = a.phase.project.id;
        projectMap.set(projectId, (projectMap.get(projectId) || 0) + 1);
      });
    });

    // Projects with multiple assignments are considered critical
    return Array.from(projectMap.entries())
      .filter(([_, count]) => count > 3)
      .map(([projectId]) => projectId);
  }

  /**
   * Generate capacity recommendations
   */
  private generateRecommendations(
    utilization: number,
    remainingHours: number,
    breakdown: EmployeeTypeBreakdown
  ): string[] {
    const recommendations: string[] = [];

    if (utilization > 100) {
      recommendations.push('Division is over capacity - immediate action required');
      recommendations.push('Consider hiring contractors or rescheduling non-critical work');
    } else if (utilization > 90) {
      recommendations.push('Division approaching capacity limit');
      recommendations.push('Plan for overtime or additional resources');
    }

    if (breakdown.foreman.scheduled >= breakdown.foreman.available) {
      recommendations.push('Foreman capacity exhausted - assign journeyman as lead or hire additional foreman');
    }

    if (remainingHours < 16) {
      recommendations.push('Less than 2 person-days of capacity remaining');
    }

    return recommendations;
  }

  /**
   * Aggregate daily capacity into weekly summaries
   */
  private aggregateWeeklyCapacity(dailyCapacity: DailyCapacity[]): WeeklyCapacity[] {
    const weeklyMap = new Map<string, DailyCapacity[]>();

    dailyCapacity.forEach(day => {
      const weekStart = startOfWeek(day.date);
      const weekKey = format(weekStart, 'yyyy-MM-dd');

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, []);
      }
      weeklyMap.get(weekKey)!.push(day);
    });

    return Array.from(weeklyMap.entries()).map(([weekKey, days]) => {
      const totalAvailable = days.reduce((sum, d) => sum + d.availableHours, 0);
      const totalScheduled = days.reduce((sum, d) => sum + d.scheduledHours, 0);
      const averageUtilization = days.reduce((sum, d) => sum + d.utilizationPercentage, 0) / days.length;
      const peakUtilization = Math.max(...days.map(d => d.utilizationPercentage));

      return {
        weekStart: new Date(weekKey),
        totalAvailable,
        totalScheduled,
        averageUtilization,
        peakUtilization,
      };
    });
  }

  /**
   * Generate forecast recommendations
   */
  private generateForecastRecommendations(
    dailyCapacity: DailyCapacity[],
    weeklyCapacity: WeeklyCapacity[],
    deficitDates: Date[]
  ): string[] {
    const recommendations: string[] = [];

    const overCapacityDays = dailyCapacity.filter(d => d.hasDeficit).length;
    const totalDays = dailyCapacity.length;
    const deficitPercentage = (overCapacityDays / totalDays) * 100;

    if (deficitPercentage > 50) {
      recommendations.push(`Critical: ${deficitPercentage.toFixed(0)}% of days show capacity deficit`);
      recommendations.push('Immediate hiring or project rescheduling required');
    } else if (deficitPercentage > 25) {
      recommendations.push(`Warning: ${deficitPercentage.toFixed(0)}% of days show capacity deficit`);
      recommendations.push('Consider contractor support for peak periods');
    }

    const peakWeek = weeklyCapacity.reduce(
      (max, week) => week.peakUtilization > max.peakUtilization ? week : max,
      weeklyCapacity[0]
    );

    if (peakWeek && peakWeek.peakUtilization > 100) {
      recommendations.push(
        `Week of ${format(peakWeek.weekStart, 'MMM d')} shows ${peakWeek.peakUtilization.toFixed(0)}% peak utilization`
      );
    }

    if (deficitDates.length > 0) {
      const consecutiveDeficits = this.findConsecutiveDates(deficitDates);
      if (consecutiveDeficits.length > 0) {
        recommendations.push(
          `${consecutiveDeficits.length} periods of consecutive capacity deficits identified`
        );
      }
    }

    return recommendations;
  }

  /**
   * Find consecutive dates in deficit
   */
  private findConsecutiveDates(dates: Date[]): Date[][] {
    if (dates.length === 0) return [];

    const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
    const consecutive: Date[][] = [];
    let current: Date[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const diff = sorted[i].getTime() - sorted[i - 1].getTime();
      const daysDiff = diff / (1000 * 60 * 60 * 24);

      if (daysDiff === 1) {
        current.push(sorted[i]);
      } else {
        if (current.length > 1) {
          consecutive.push(current);
        }
        current = [sorted[i]];
      }
    }

    if (current.length > 1) {
      consecutive.push(current);
    }

    return consecutive;
  }
}