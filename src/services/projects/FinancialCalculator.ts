import prisma from '@/lib/prisma/client';
import { BillingStatus } from '@prisma/client';

export interface ProjectFinancialSummary {
  projectId: string;
  contractAmount: number;
  totalExpenses: number;
  totalBilled: number;
  totalPaid: number;
  budgetRemaining: number;
  budgetUtilization: number;
  profitMargin: number;
  cashFlow: number;
  overdueAmount: number;
}

export interface CashFlowProjection {
  date: Date;
  expectedIncome: number;
  expectedExpenses: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
}

export interface ProgressBilling {
  projectId: string;
  totalContract: number;
  completionPercentage: number;
  billingPercentage: number;
  amountEarned: number;
  amountBilled: number;
  amountRemaining: number;
  overbilling: number;
  underbilling: number;
}

export class FinancialCalculator {
  /**
   * Calculate project financial summary
   */
  static async calculateProjectSummary(projectId: string): Promise<ProjectFinancialSummary> {
    const [project, expenses, scheduleOfValues] = await prisma.$transaction([
      prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          contractAmount: true
        }
      }),
      prisma.projectExpense.aggregate({
        where: { projectId },
        _sum: { amount: true }
      }),
      prisma.scheduleOfValues.findMany({
        where: { projectId },
        select: {
          value: true,
          status: true
        }
      })
    ]);

    if (!project) {
      throw new Error('Project not found');
    }

    const contractAmount = Number(project.contractAmount);
    const totalExpenses = Number(expenses._sum.amount || 0);

    // Calculate billing amounts
    const totalBilled = scheduleOfValues
      .filter(sov => sov.status !== BillingStatus.SCHEDULED)
      .reduce((sum, sov) => sum + Number(sov.value), 0);

    const totalPaid = scheduleOfValues
      .filter(sov => sov.status === BillingStatus.PAID)
      .reduce((sum, sov) => sum + Number(sov.value), 0);

    const overdueAmount = scheduleOfValues
      .filter(sov => sov.status === BillingStatus.OVERDUE)
      .reduce((sum, sov) => sum + Number(sov.value), 0);

    const budgetRemaining = contractAmount - totalExpenses;
    const budgetUtilization = contractAmount > 0 ? (totalExpenses / contractAmount) * 100 : 0;
    const profitMargin = contractAmount > 0
      ? ((contractAmount - totalExpenses) / contractAmount) * 100
      : 0;
    const cashFlow = totalPaid - totalExpenses;

    return {
      projectId,
      contractAmount,
      totalExpenses,
      totalBilled,
      totalPaid,
      budgetRemaining,
      budgetUtilization,
      profitMargin,
      cashFlow,
      overdueAmount
    };
  }

  /**
   * Calculate progress billing
   */
  static async calculateProgressBilling(projectId: string): Promise<ProgressBilling> {
    const [project, phases, scheduleOfValues] = await prisma.$transaction([
      prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          contractAmount: true
        }
      }),
      prisma.projectPhase.findMany({
        where: { projectId },
        select: {
          progressPercentage: true
        }
      }),
      prisma.scheduleOfValues.findMany({
        where: { projectId },
        select: {
          value: true,
          billingPercentage: true,
          status: true
        }
      })
    ]);

    if (!project) {
      throw new Error('Project not found');
    }

    const totalContract = Number(project.contractAmount);

    // Calculate overall project completion
    const completionPercentage = phases.length > 0
      ? phases.reduce((sum, phase) => sum + phase.progressPercentage, 0) / phases.length
      : 0;

    // Calculate billing percentage
    const billingPercentage = scheduleOfValues.length > 0
      ? scheduleOfValues
        .filter(sov => sov.status !== BillingStatus.SCHEDULED)
        .reduce((sum, sov) => sum + sov.billingPercentage, 0)
      : 0;

    const amountEarned = (totalContract * completionPercentage) / 100;
    const amountBilled = scheduleOfValues
      .filter(sov => sov.status !== BillingStatus.SCHEDULED)
      .reduce((sum, sov) => sum + Number(sov.value), 0);

    const amountRemaining = totalContract - amountBilled;
    const overbilling = Math.max(0, amountBilled - amountEarned);
    const underbilling = Math.max(0, amountEarned - amountBilled);

    return {
      projectId,
      totalContract,
      completionPercentage,
      billingPercentage,
      amountEarned,
      amountBilled,
      amountRemaining,
      overbilling,
      underbilling
    };
  }

  /**
   * Generate cash flow projection
   */
  static async generateCashFlowProjection(
    projectId: string,
    months = 6
  ): Promise<CashFlowProjection[]> {
    const [project, scheduleOfValues, plannedExpenses] = await prisma.$transaction([
      prisma.project.findUnique({
        where: { id: projectId },
        select: {
          startDate: true,
          endDate: true,
          contractAmount: true
        }
      }),
      prisma.scheduleOfValues.findMany({
        where: { projectId },
        orderBy: { billingDate: 'asc' },
        select: {
          value: true,
          billingDate: true,
          status: true
        }
      }),
      prisma.projectExpense.findMany({
        where: { projectId },
        orderBy: { date: 'asc' },
        select: {
          amount: true,
          date: true
        }
      })
    ]);

    if (!project) {
      throw new Error('Project not found');
    }

    const projections: CashFlowProjection[] = [];
    const today = new Date();
    let cumulativeCashFlow = 0;

    for (let i = 0; i < months; i++) {
      const projectionDate = new Date(today);
      projectionDate.setMonth(projectionDate.getMonth() + i);

      const monthStart = new Date(projectionDate.getFullYear(), projectionDate.getMonth(), 1);
      const monthEnd = new Date(projectionDate.getFullYear(), projectionDate.getMonth() + 1, 0);

      // Calculate expected income for the month
      const expectedIncome = scheduleOfValues
        .filter(sov => {
          const billingDate = new Date(sov.billingDate);
          return billingDate >= monthStart &&
                 billingDate <= monthEnd &&
                 sov.status === BillingStatus.SCHEDULED;
        })
        .reduce((sum, sov) => sum + Number(sov.value), 0);

      // Calculate expected expenses for the month
      const expectedExpenses = plannedExpenses
        .filter(exp => {
          const expDate = new Date(exp.date);
          return expDate >= monthStart && expDate <= monthEnd;
        })
        .reduce((sum, exp) => sum + Number(exp.amount), 0);

      const netCashFlow = expectedIncome - expectedExpenses;
      cumulativeCashFlow += netCashFlow;

      projections.push({
        date: monthStart,
        expectedIncome,
        expectedExpenses,
        netCashFlow,
        cumulativeCashFlow
      });
    }

    return projections;
  }

  /**
   * Calculate budget variance
   */
  static async calculateBudgetVariance(projectId: string) {
    const [project, expensesByCategory] = await prisma.$transaction([
      prisma.project.findUnique({
        where: { id: projectId },
        select: {
          contractAmount: true
        }
      }),
      prisma.projectExpense.groupBy({
        by: ['category'],
        where: { projectId },
        _sum: { amount: true }
      })
    ]);

    if (!project) {
      throw new Error('Project not found');
    }

    const contractAmount = Number(project.contractAmount);

    // Standard budget allocation percentages
    const budgetAllocation = {
      LABOR: 0.40,      // 40% for labor
      MATERIALS: 0.35,  // 35% for materials
      EQUIPMENT: 0.10,  // 10% for equipment
      SUBCONTRACTOR: 0.10, // 10% for subcontractors
      OTHER: 0.05       // 5% for other
    };

    const variances = expensesByCategory.map(expense => {
      const category = expense.category;
      const actual = Number(expense._sum.amount || 0);
      const budgeted = contractAmount * budgetAllocation[category];
      const variance = budgeted - actual;
      const variancePercentage = budgeted > 0 ? (variance / budgeted) * 100 : 0;

      return {
        category,
        budgeted,
        actual,
        variance,
        variancePercentage,
        status: variance < 0 ? 'OVER_BUDGET' : 'WITHIN_BUDGET'
      };
    });

    return {
      projectId,
      contractAmount,
      variances,
      totalVariance: variances.reduce((sum, v) => sum + v.variance, 0)
    };
  }

  /**
   * Calculate project ROI
   */
  static async calculateROI(projectId: string) {
    const summary = await this.calculateProjectSummary(projectId);

    const revenue = summary.contractAmount;
    const costs = summary.totalExpenses;
    const profit = revenue - costs;
    const roi = costs > 0 ? (profit / costs) * 100 : 0;

    return {
      projectId,
      revenue,
      costs,
      profit,
      roi,
      profitMargin: summary.profitMargin
    };
  }

  /**
   * Get financial health indicators
   */
  static async getFinancialHealthIndicators(projectId: string) {
    const [summary, progressBilling, variance] = await Promise.all([
      this.calculateProjectSummary(projectId),
      this.calculateProgressBilling(projectId),
      this.calculateBudgetVariance(projectId)
    ]);

    const indicators = {
      budgetHealth: summary.budgetUtilization <= 80 ? 'HEALTHY' :
                   summary.budgetUtilization <= 95 ? 'WARNING' : 'CRITICAL',

      billingHealth: progressBilling.underbilling > progressBilling.totalContract * 0.1 ? 'UNDERBILLED' :
                    progressBilling.overbilling > progressBilling.totalContract * 0.1 ? 'OVERBILLED' :
                    'BALANCED',

      cashFlowHealth: summary.cashFlow > 0 ? 'POSITIVE' :
                     summary.cashFlow > -summary.contractAmount * 0.1 ? 'NEUTRAL' :
                     'NEGATIVE',

      profitHealth: summary.profitMargin >= 20 ? 'EXCELLENT' :
                   summary.profitMargin >= 10 ? 'GOOD' :
                   summary.profitMargin >= 5 ? 'FAIR' : 'POOR',

      overdueHealth: summary.overdueAmount === 0 ? 'HEALTHY' :
                    summary.overdueAmount < summary.contractAmount * 0.1 ? 'WARNING' :
                    'CRITICAL'
    };

    return {
      projectId,
      indicators,
      metrics: {
        budgetUtilization: summary.budgetUtilization,
        profitMargin: summary.profitMargin,
        cashFlow: summary.cashFlow,
        overdueAmount: summary.overdueAmount,
        underbilling: progressBilling.underbilling,
        overbilling: progressBilling.overbilling
      }
    };
  }
}