/**
 * Performance Metrics Service
 * Calculates and tracks KPIs for capacity management
 */

import { prisma } from '@/lib/prisma/client';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfQuarter,
  endOfQuarter,
  subMonths,
  differenceInDays,
  format
} from 'date-fns';

export interface MetricValue {
  value: number;
  trend: number; // Percentage change from previous period
  status: 'good' | 'warning' | 'critical';
  unit?: string;
}

export interface PerformanceMetrics {
  // Utilization Metrics
  overallUtilization: MetricValue;
  divisionUtilization: Record<string, MetricValue>;
  employeeUtilization: MetricValue;

  // Project Metrics
  activeProjects: MetricValue;
  projectsOnSchedule: MetricValue;
  projectCompletionRate: MetricValue;
  averageProjectDuration: MetricValue;

  // Financial Metrics
  totalRevenue: MetricValue;
  revenuePerEmployee: MetricValue;
  profitMargin: MetricValue;
  cashFlowStatus: MetricValue;
  outstandingInvoices: MetricValue;

  // Resource Metrics
  totalCapacityHours: MetricValue;
  utilizedHours: MetricValue;
  availableHours: MetricValue;
  overtimeHours: MetricValue;

  // Quality Metrics
  scheduleAdherence: MetricValue;
  reworkRate: MetricValue;
  clientSatisfaction: MetricValue;

  // Efficiency Metrics
  plannedVsActualHours: MetricValue;
  resourceAllocationEfficiency: MetricValue;
  crossDivisionCollaboration: MetricValue;

  // Risk Metrics
  atRiskProjects: MetricValue;
  capacityRiskScore: MetricValue;
  scheduleConflicts: MetricValue;
}

export interface MetricsPeriod {
  start: Date;
  end: Date;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

export interface MetricsFilter {
  period: MetricsPeriod;
  division?: string;
  projectTypes?: string[];
  excludeInactive?: boolean;
}

export class PerformanceMetricsService {
  async getMetrics(filter: MetricsFilter): Promise<PerformanceMetrics> {
    const { period } = filter;
    const previousPeriod = this.getPreviousPeriod(period);

    // Fetch all necessary data in parallel
    const [
      utilizationData,
      projectData,
      financialData,
      resourceData,
      qualityData,
      riskData
    ] = await Promise.all([
      this.calculateUtilizationMetrics(period, filter),
      this.calculateProjectMetrics(period, filter),
      this.calculateFinancialMetrics(period, filter),
      this.calculateResourceMetrics(period, filter),
      this.calculateQualityMetrics(period, filter),
      this.calculateRiskMetrics(period, filter)
    ]);

    // Calculate previous period metrics for trends
    const [
      prevUtilization,
      prevProjects,
      prevFinancial
    ] = await Promise.all([
      this.calculateUtilizationMetrics(previousPeriod, filter),
      this.calculateProjectMetrics(previousPeriod, filter),
      this.calculateFinancialMetrics(previousPeriod, filter)
    ]);

    return {
      // Utilization Metrics
      overallUtilization: this.createMetric(
        utilizationData.overall,
        prevUtilization.overall,
        '%',
        { good: [70, 85], warning: [60, 70], critical: [0, 60] }
      ),
      divisionUtilization: this.createDivisionMetrics(
        utilizationData.byDivision,
        prevUtilization.byDivision
      ),
      employeeUtilization: this.createMetric(
        utilizationData.employeeAverage,
        prevUtilization.employeeAverage,
        '%'
      ),

      // Project Metrics
      activeProjects: this.createMetric(
        projectData.active,
        prevProjects.active
      ),
      projectsOnSchedule: this.createMetric(
        projectData.onSchedule,
        prevProjects.onSchedule,
        '%'
      ),
      projectCompletionRate: this.createMetric(
        projectData.completionRate,
        prevProjects.completionRate,
        '%'
      ),
      averageProjectDuration: this.createMetric(
        projectData.avgDuration,
        prevProjects.avgDuration,
        'days'
      ),

      // Financial Metrics
      totalRevenue: this.createMetric(
        financialData.revenue,
        prevFinancial.revenue,
        '$'
      ),
      revenuePerEmployee: this.createMetric(
        financialData.revenuePerEmployee,
        prevFinancial.revenuePerEmployee,
        '$'
      ),
      profitMargin: this.createMetric(
        financialData.profitMargin,
        prevFinancial.profitMargin,
        '%'
      ),
      cashFlowStatus: this.createMetric(
        financialData.cashFlow,
        prevFinancial.cashFlow,
        '$'
      ),
      outstandingInvoices: this.createMetric(
        financialData.outstanding,
        prevFinancial.outstanding,
        '$'
      ),

      // Resource Metrics
      totalCapacityHours: this.createMetric(resourceData.totalCapacity, 0, 'hrs'),
      utilizedHours: this.createMetric(resourceData.utilized, 0, 'hrs'),
      availableHours: this.createMetric(resourceData.available, 0, 'hrs'),
      overtimeHours: this.createMetric(resourceData.overtime, 0, 'hrs'),

      // Quality Metrics
      scheduleAdherence: this.createMetric(qualityData.scheduleAdherence, 0, '%'),
      reworkRate: this.createMetric(qualityData.reworkRate, 0, '%'),
      clientSatisfaction: this.createMetric(qualityData.satisfaction, 0, '/5'),

      // Efficiency Metrics
      plannedVsActualHours: this.createMetric(qualityData.plannedVsActual, 0, '%'),
      resourceAllocationEfficiency: this.createMetric(qualityData.allocationEfficiency, 0, '%'),
      crossDivisionCollaboration: this.createMetric(qualityData.collaboration, 0, '%'),

      // Risk Metrics
      atRiskProjects: this.createMetric(riskData.atRisk, 0),
      capacityRiskScore: this.createMetric(riskData.capacityRisk, 0, '/100'),
      scheduleConflicts: this.createMetric(riskData.conflicts, 0)
    };
  }

  private async calculateUtilizationMetrics(
    period: MetricsPeriod,
    filter: MetricsFilter
  ) {
    const assignments = await prisma.crewAssignment.findMany({
      where: {
        assignmentDate: {
          gte: period.start,
          lte: period.end
        },
        ...(filter.division && {
          phase: {
            project: {
              division: filter.division
            }
          }
        })
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

    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        ...(filter.division && { currentDivision: filter.division })
      }
    });

    const workDays = this.getWorkDays(period.start, period.end);
    const totalCapacity = employees.length * 8 * workDays; // 8 hours per day
    const totalUtilized = assignments.reduce((sum, a) => sum + a.hoursAllocated, 0);

    // Calculate by division
    const byDivision: Record<string, number> = {};
    const divisionAssignments = assignments.reduce((acc, assignment) => {
      const division = assignment.phase.project.division;
      if (!acc[division]) acc[division] = 0;
      acc[division] += assignment.hoursAllocated;
      return acc;
    }, {} as Record<string, number>);

    const divisionEmployees = employees.reduce((acc, emp) => {
      const division = emp.currentDivision || 'Unassigned';
      if (!acc[division]) acc[division] = 0;
      acc[division]++;
      return acc;
    }, {} as Record<string, number>);

    Object.keys(divisionEmployees).forEach(division => {
      const capacity = divisionEmployees[division] * 8 * workDays;
      const utilized = divisionAssignments[division] || 0;
      byDivision[division] = (utilized / capacity) * 100;
    });

    return {
      overall: (totalUtilized / totalCapacity) * 100,
      byDivision,
      employeeAverage: totalUtilized / employees.length / workDays
    };
  }

  private async calculateProjectMetrics(
    period: MetricsPeriod,
    filter: MetricsFilter
  ) {
    const projects = await prisma.project.findMany({
      where: {
        ...(filter.division && { division: filter.division }),
        ...(filter.projectTypes && { projectType: { in: filter.projectTypes } })
      },
      include: {
        phases: true
      }
    });

    const activeProjects = projects.filter(p =>
      p.status === 'ACTIVE' || p.status === 'IN_PROGRESS'
    );

    const completedInPeriod = projects.filter(p =>
      p.status === 'COMPLETED' &&
      p.updatedAt >= period.start &&
      p.updatedAt <= period.end
    );

    const onSchedule = activeProjects.filter(p => {
      const plannedEnd = p.expectedCompletionDate;
      const estimatedEnd = this.estimateCompletionDate(p);
      return !plannedEnd || !estimatedEnd || estimatedEnd <= plannedEnd;
    });

    const durations = completedInPeriod.map(p => {
      const start = p.createdAt;
      const end = p.updatedAt;
      return differenceInDays(end, start);
    });

    return {
      active: activeProjects.length,
      onSchedule: (onSchedule.length / Math.max(activeProjects.length, 1)) * 100,
      completionRate: (completedInPeriod.length / Math.max(projects.length, 1)) * 100,
      avgDuration: durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0
    };
  }

  private async calculateFinancialMetrics(
    period: MetricsPeriod,
    filter: MetricsFilter
  ) {
    const projects = await prisma.project.findMany({
      where: {
        ...(filter.division && { division: filter.division }),
        updatedAt: {
          gte: period.start,
          lte: period.end
        }
      },
      include: {
        expenses: true
      }
    });

    const employees = await prisma.employee.count({
      where: {
        isActive: true,
        ...(filter.division && { currentDivision: filter.division })
      }
    });

    const revenue = projects.reduce((sum, p) => sum + (p.totalProjectValue || 0), 0);
    const costs = projects.reduce((sum, p) =>
      sum + p.expenses.reduce((s, e) => s + e.amount, 0), 0
    );

    const invoiced = projects.reduce((sum, p) => sum + (p.invoicedAmount || 0), 0);
    const received = projects.reduce((sum, p) => sum + (p.receivedAmount || 0), 0);

    return {
      revenue,
      revenuePerEmployee: revenue / Math.max(employees, 1),
      profitMargin: revenue > 0 ? ((revenue - costs) / revenue) * 100 : 0,
      cashFlow: received - costs,
      outstanding: invoiced - received
    };
  }

  private async calculateResourceMetrics(
    period: MetricsPeriod,
    filter: MetricsFilter
  ) {
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        ...(filter.division && { currentDivision: filter.division })
      }
    });

    const assignments = await prisma.crewAssignment.findMany({
      where: {
        assignmentDate: {
          gte: period.start,
          lte: period.end
        }
      }
    });

    const workDays = this.getWorkDays(period.start, period.end);
    const standardHours = 8 * workDays;
    const totalCapacity = employees.length * standardHours;

    const utilizedByEmployee = assignments.reduce((acc, a) => {
      if (!acc[a.employeeId]) acc[a.employeeId] = 0;
      acc[a.employeeId] += a.hoursAllocated;
      return acc;
    }, {} as Record<string, number>);

    const overtime = Object.values(utilizedByEmployee).reduce((sum, hours) => {
      return sum + Math.max(0, hours - standardHours);
    }, 0);

    const utilized = assignments.reduce((sum, a) => sum + a.hoursAllocated, 0);

    return {
      totalCapacity,
      utilized,
      available: totalCapacity - utilized,
      overtime
    };
  }

  private async calculateQualityMetrics(
    period: MetricsPeriod,
    filter: MetricsFilter
  ) {
    const phases = await prisma.phase.findMany({
      where: {
        startDate: {
          lte: period.end
        },
        endDate: {
          gte: period.start
        },
        ...(filter.division && {
          project: {
            division: filter.division
          }
        })
      },
      include: {
        assignments: true
      }
    });

    let onSchedulePhases = 0;
    let totalPhases = phases.length;
    let plannedHours = 0;
    let actualHours = 0;

    phases.forEach(phase => {
      const isOnSchedule = !phase.endDate || phase.progress < 100 ||
        new Date() <= phase.endDate;
      if (isOnSchedule) onSchedulePhases++;

      plannedHours += phase.estimatedHours || 0;
      actualHours += phase.assignments.reduce((sum, a) => sum + a.hoursAllocated, 0);
    });

    // Calculate cross-division collaboration
    const crossDivisionProjects = await prisma.project.count({
      where: {
        phases: {
          some: {
            assignments: {
              some: {
                employee: {
                  currentDivision: {
                    not: undefined
                  }
                }
              }
            }
          }
        }
      }
    });

    const totalProjects = await prisma.project.count({
      where: {
        status: { in: ['ACTIVE', 'IN_PROGRESS'] }
      }
    });

    return {
      scheduleAdherence: (onSchedulePhases / Math.max(totalPhases, 1)) * 100,
      reworkRate: 5, // Placeholder - would need rework tracking
      satisfaction: 4.2, // Placeholder - would need satisfaction surveys
      plannedVsActual: plannedHours > 0
        ? (actualHours / plannedHours) * 100
        : 100,
      allocationEfficiency: 85, // Placeholder - complex calculation
      collaboration: (crossDivisionProjects / Math.max(totalProjects, 1)) * 100
    };
  }

  private async calculateRiskMetrics(
    period: MetricsPeriod,
    filter: MetricsFilter
  ) {
    const alerts = await prisma.alert.count({
      where: {
        createdAt: {
          gte: period.start,
          lte: period.end
        },
        severity: 'HIGH',
        status: 'ACTIVE'
      }
    });

    const projects = await prisma.project.findMany({
      where: {
        status: { in: ['ACTIVE', 'IN_PROGRESS'] },
        ...(filter.division && { division: filter.division })
      },
      include: {
        phases: {
          include: {
            assignments: true
          }
        }
      }
    });

    const atRiskProjects = projects.filter(p => {
      // Project is at risk if behind schedule or over budget
      const behindSchedule = p.phases.some(phase =>
        phase.progress < this.expectedProgress(phase)
      );
      const overBudget = (p.invoicedAmount || 0) > (p.totalProjectValue || 0) * 0.9;
      return behindSchedule || overBudget;
    });

    // Calculate capacity risk score (0-100)
    const utilizationMetrics = await this.calculateUtilizationMetrics(period, filter);
    let capacityRisk = 0;
    if (utilizationMetrics.overall > 95) capacityRisk = 80;
    else if (utilizationMetrics.overall > 90) capacityRisk = 60;
    else if (utilizationMetrics.overall > 85) capacityRisk = 40;
    else if (utilizationMetrics.overall < 50) capacityRisk = 30;
    else capacityRisk = 20;

    return {
      atRisk: atRiskProjects.length,
      capacityRisk,
      conflicts: alerts
    };
  }

  private createMetric(
    value: number,
    previousValue: number,
    unit?: string,
    thresholds?: {
      good: [number, number];
      warning: [number, number];
      critical: [number, number];
    }
  ): MetricValue {
    const trend = previousValue !== 0
      ? ((value - previousValue) / previousValue) * 100
      : 0;

    let status: 'good' | 'warning' | 'critical' = 'good';
    if (thresholds) {
      if (value >= thresholds.good[0] && value <= thresholds.good[1]) {
        status = 'good';
      } else if (value >= thresholds.warning[0] && value <= thresholds.warning[1]) {
        status = 'warning';
      } else {
        status = 'critical';
      }
    }

    return {
      value: Math.round(value * 100) / 100,
      trend: Math.round(trend * 10) / 10,
      status,
      unit
    };
  }

  private createDivisionMetrics(
    current: Record<string, number>,
    previous: Record<string, number>
  ): Record<string, MetricValue> {
    const result: Record<string, MetricValue> = {};

    Object.keys(current).forEach(division => {
      result[division] = this.createMetric(
        current[division],
        previous[division] || 0,
        '%',
        { good: [70, 85], warning: [60, 70], critical: [0, 60] }
      );
    });

    return result;
  }

  private getPreviousPeriod(period: MetricsPeriod): MetricsPeriod {
    const duration = differenceInDays(period.end, period.start);
    const start = new Date(period.start.getTime() - duration * 24 * 60 * 60 * 1000);
    const end = new Date(period.end.getTime() - duration * 24 * 60 * 60 * 1000);

    return {
      start,
      end,
      type: period.type
    };
  }

  private getWorkDays(start: Date, end: Date): number {
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

  private estimateCompletionDate(project: any): Date | null {
    if (!project.phases || project.phases.length === 0) return null;

    const avgProgress = project.phases.reduce((sum: number, p: any) =>
      sum + (p.progress || 0), 0
    ) / project.phases.length;

    if (avgProgress === 0) return null;

    const daysElapsed = differenceInDays(new Date(), project.createdAt);
    const estimatedTotalDays = (daysElapsed / avgProgress) * 100;
    const remainingDays = estimatedTotalDays - daysElapsed;

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + remainingDays);

    return estimatedDate;
  }

  private expectedProgress(phase: any): number {
    if (!phase.startDate || !phase.endDate) return 0;

    const total = differenceInDays(phase.endDate, phase.startDate);
    const elapsed = differenceInDays(new Date(), phase.startDate);

    if (elapsed < 0) return 0;
    if (elapsed > total) return 100;

    return (elapsed / total) * 100;
  }

  async getHistoricalMetrics(
    metricType: keyof PerformanceMetrics,
    periods: number = 12,
    periodType: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<Array<{ period: string; value: number; trend: number }>> {
    const results = [];
    const now = new Date();

    for (let i = periods - 1; i >= 0; i--) {
      let start: Date, end: Date;

      switch (periodType) {
        case 'daily':
          start = new Date(now);
          start.setDate(start.getDate() - i);
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setHours(23, 59, 59, 999);
          break;
        case 'weekly':
          start = startOfWeek(new Date());
          start.setDate(start.getDate() - (i * 7));
          end = endOfWeek(start);
          break;
        case 'monthly':
          start = startOfMonth(new Date());
          start.setMonth(start.getMonth() - i);
          end = endOfMonth(start);
          break;
      }

      const period: MetricsPeriod = { start, end, type: periodType };
      const metrics = await this.getMetrics({ period });

      const metric = metrics[metricType];
      if (metric && typeof metric === 'object' && 'value' in metric) {
        results.push({
          period: format(start, periodType === 'daily' ? 'MMM dd' : 'MMM yyyy'),
          value: metric.value,
          trend: metric.trend
        });
      }
    }

    return results;
  }

  async exportMetricsReport(filter: MetricsFilter): Promise<Buffer> {
    const metrics = await this.getMetrics(filter);
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    // Overview sheet
    const overviewData = [
      ['Performance Metrics Report'],
      ['Period:', `${filter.period.start.toDateString()} - ${filter.period.end.toDateString()}`],
      [],
      ['Metric', 'Value', 'Trend %', 'Status'],
      ['Overall Utilization', metrics.overallUtilization.value, metrics.overallUtilization.trend, metrics.overallUtilization.status],
      ['Active Projects', metrics.activeProjects.value, metrics.activeProjects.trend, metrics.activeProjects.status],
      ['Projects On Schedule', metrics.projectsOnSchedule.value, metrics.projectsOnSchedule.trend, metrics.projectsOnSchedule.status],
      ['Total Revenue', metrics.totalRevenue.value, metrics.totalRevenue.trend, metrics.totalRevenue.status],
      ['Profit Margin', metrics.profitMargin.value, metrics.profitMargin.trend, metrics.profitMargin.status],
      ['At Risk Projects', metrics.atRiskProjects.value, metrics.atRiskProjects.trend, metrics.atRiskProjects.status]
    ];

    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

    // Division breakdown sheet
    const divisionData = [
      ['Division Utilization'],
      ['Division', 'Utilization %', 'Trend %', 'Status']
    ];

    Object.entries(metrics.divisionUtilization).forEach(([division, metric]) => {
      divisionData.push([division, metric.value, metric.trend, metric.status]);
    });

    const divisionSheet = XLSX.utils.aoa_to_sheet(divisionData);
    XLSX.utils.book_append_sheet(workbook, divisionSheet, 'By Division');

    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }
}

export const performanceMetricsService = new PerformanceMetricsService();