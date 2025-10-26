import { prisma } from '@/lib/prisma/client';
import { DemandCalculator } from './DemandCalculator';
import { SupplyCalculator } from './SupplyCalculator';
import { DeficitAnalyzer } from './DeficitAnalyzer';
import { RecommendationEngine } from './RecommendationEngine';
import { ConfidenceCalculator } from './ConfidenceCalculator';
import { startOfWeek, addWeeks, format } from 'date-fns';

export interface ForecastConfig {
  forecastWeeks: number;
  minConfidence: number;
  includeQuotedProjects: boolean;
  bufferPercentage: number;
}

export interface WeeklyForecast {
  weekStarting: Date;
  division: string;
  demand: LaborDemand;
  supply: LaborSupply;
  deficit: LaborDeficit;
  recommendations: string[];
  confidence: number;
}

export interface LaborDemand {
  totalHours: number;
  foremenHours: number;
  journeymenHours: number;
  apprenticeHours: number;
  projectCount: number;
  phaseCount: number;
}

export interface LaborSupply {
  totalHours: number;
  foremenHours: number;
  journeymenHours: number;
  apprenticeHours: number;
  employeeCount: number;
  availableEmployees: number;
}

export interface LaborDeficit {
  totalDeficit: number;
  foremenDeficit: number;
  journeymenDeficit: number;
  apprenticeDeficit: number;
  isDeficit: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ForecastSummary {
  division: string;
  forecastDate: Date;
  forecastPeriod: {
    start: Date;
    end: Date;
    weeks: number;
  };
  weeklyForecasts: WeeklyForecast[];
  aggregates: {
    totalDemand: number;
    totalSupply: number;
    totalDeficit: number;
    deficitWeeks: number;
    criticalWeeks: number;
    averageConfidence: number;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export class LaborForecastService {
  private demandCalculator: DemandCalculator;
  private supplyCalculator: SupplyCalculator;
  private deficitAnalyzer: DeficitAnalyzer;
  private recommendationEngine: RecommendationEngine;
  private confidenceCalculator: ConfidenceCalculator;

  private defaultConfig: ForecastConfig = {
    forecastWeeks: 13, // 3 months
    minConfidence: 60,
    includeQuotedProjects: true,
    bufferPercentage: 10, // 10% safety buffer
  };

  constructor(config?: Partial<ForecastConfig>) {
    this.demandCalculator = new DemandCalculator();
    this.supplyCalculator = new SupplyCalculator();
    this.deficitAnalyzer = new DeficitAnalyzer();
    this.recommendationEngine = new RecommendationEngine();
    this.confidenceCalculator = new ConfidenceCalculator();

    if (config) {
      this.defaultConfig = { ...this.defaultConfig, ...config };
    }
  }

  /**
   * Generate labor forecast for a division
   */
  async generateForecast(
    division: string,
    startDate: Date = new Date(),
    config?: Partial<ForecastConfig>
  ): Promise<ForecastSummary> {
    const forecastConfig = { ...this.defaultConfig, ...config };
    const weeklyForecasts: WeeklyForecast[] = [];

    // Generate forecast for each week
    const forecastStart = startOfWeek(startDate);
    for (let i = 0; i < forecastConfig.forecastWeeks; i++) {
      const weekStart = addWeeks(forecastStart, i);
      const forecast = await this.generateWeeklyForecast(
        division,
        weekStart,
        forecastConfig
      );
      weeklyForecasts.push(forecast);
    }

    // Calculate aggregates
    const aggregates = this.calculateAggregates(weeklyForecasts);

    // Generate recommendations
    const recommendations = await this.recommendationEngine.generateRecommendations(
      weeklyForecasts,
      division
    );

    // Save forecast to database
    await this.saveForecast(division, weeklyForecasts);

    return {
      division,
      forecastDate: new Date(),
      forecastPeriod: {
        start: forecastStart,
        end: addWeeks(forecastStart, forecastConfig.forecastWeeks),
        weeks: forecastConfig.forecastWeeks,
      },
      weeklyForecasts,
      aggregates,
      recommendations,
    };
  }

  /**
   * Generate forecast for a specific week
   */
  private async generateWeeklyForecast(
    division: string,
    weekStarting: Date,
    config: ForecastConfig
  ): Promise<WeeklyForecast> {
    // Calculate demand
    const demand = await this.demandCalculator.calculateWeeklyDemand(
      division,
      weekStarting,
      config.includeQuotedProjects
    );

    // Apply buffer to demand
    const bufferedDemand = this.applyBuffer(demand, config.bufferPercentage);

    // Calculate supply
    const supply = await this.supplyCalculator.calculateWeeklySupply(
      division,
      weekStarting
    );

    // Analyze deficit
    const deficit = this.deficitAnalyzer.analyzeDeficit(bufferedDemand, supply);

    // Generate recommendations for this week
    const recommendations = await this.recommendationEngine.generateWeeklyRecommendations(
      deficit,
      division,
      weekStarting
    );

    // Calculate confidence
    const confidence = await this.confidenceCalculator.calculateConfidence(
      demand,
      supply,
      weekStarting
    );

    return {
      weekStarting,
      division,
      demand: bufferedDemand,
      supply,
      deficit,
      recommendations,
      confidence,
    };
  }

  /**
   * Get existing forecast or generate new one
   */
  async getForecast(
    division: string,
    forceRegenerate: boolean = false
  ): Promise<ForecastSummary> {
    if (!forceRegenerate) {
      // Check for existing recent forecast
      const recentForecast = await this.getRecentForecast(division);
      if (recentForecast) {
        return recentForecast;
      }
    }

    // Generate new forecast
    return this.generateForecast(division);
  }

  /**
   * Get labor deficits for a division
   */
  async getDeficits(
    division: string,
    thresholdHours: number = 0
  ): Promise<WeeklyForecast[]> {
    const forecast = await this.getForecast(division);

    return forecast.weeklyForecasts.filter(
      wf => wf.deficit.isDeficit && wf.deficit.totalDeficit > thresholdHours
    );
  }

  /**
   * Get critical labor shortages across all divisions
   */
  async getCriticalShortages(): Promise<{
    division: string;
    week: Date;
    deficit: LaborDeficit;
    impact: string;
  }[]> {
    const divisions = [
      'PLUMBING_MULTIFAMILY',
      'PLUMBING_COMMERCIAL',
      'PLUMBING_CUSTOM',
      'HVAC_MULTIFAMILY',
      'HVAC_COMMERCIAL',
      'HVAC_CUSTOM',
    ];

    const criticalShortages: any[] = [];

    for (const division of divisions) {
      const forecast = await this.getForecast(division);

      const critical = forecast.weeklyForecasts
        .filter(wf => wf.deficit.severity === 'CRITICAL' || wf.deficit.severity === 'HIGH')
        .map(wf => ({
          division,
          week: wf.weekStarting,
          deficit: wf.deficit,
          impact: this.calculateImpact(wf.deficit, division),
        }));

      criticalShortages.push(...critical);
    }

    // Sort by week and severity
    return criticalShortages.sort((a, b) => {
      if (a.week.getTime() !== b.week.getTime()) {
        return a.week.getTime() - b.week.getTime();
      }
      return this.getSeverityScore(b.deficit.severity) - this.getSeverityScore(a.deficit.severity);
    });
  }

  /**
   * Generate hiring plan based on forecasts
   */
  async generateHiringPlan(
    division: string,
    planHorizonWeeks: number = 12
  ): Promise<{
    division: string;
    recommendations: {
      foremen: number;
      journeymen: number;
      apprentices: number;
      contractors: number;
      timeline: string;
      estimatedCost: number;
      justification: string[];
    };
  }> {
    const forecast = await this.generateForecast(division, new Date(), {
      forecastWeeks: planHorizonWeeks,
    });

    // Analyze persistent deficits
    const persistentDeficits = this.analyzePersistentDeficits(forecast.weeklyForecasts);

    // Calculate hiring needs
    const hiringNeeds = this.calculateHiringNeeds(persistentDeficits);

    // Estimate costs
    const estimatedCost = this.estimateHiringCosts(hiringNeeds);

    // Generate justification
    const justification = this.generateHiringJustification(
      forecast,
      persistentDeficits,
      hiringNeeds
    );

    return {
      division,
      recommendations: {
        ...hiringNeeds,
        timeline: this.determineHiringTimeline(persistentDeficits),
        estimatedCost,
        justification,
      },
    };
  }

  /**
   * Apply buffer percentage to demand
   */
  private applyBuffer(demand: LaborDemand, bufferPercentage: number): LaborDemand {
    const multiplier = 1 + (bufferPercentage / 100);

    return {
      totalHours: demand.totalHours * multiplier,
      foremenHours: demand.foremenHours * multiplier,
      journeymenHours: demand.journeymenHours * multiplier,
      apprenticeHours: demand.apprenticeHours * multiplier,
      projectCount: demand.projectCount,
      phaseCount: demand.phaseCount,
    };
  }

  /**
   * Calculate aggregate metrics
   */
  private calculateAggregates(forecasts: WeeklyForecast[]): any {
    const totalDemand = forecasts.reduce((sum, f) => sum + f.demand.totalHours, 0);
    const totalSupply = forecasts.reduce((sum, f) => sum + f.supply.totalHours, 0);
    const totalDeficit = forecasts.reduce((sum, f) => sum + f.deficit.totalDeficit, 0);
    const deficitWeeks = forecasts.filter(f => f.deficit.isDeficit).length;
    const criticalWeeks = forecasts.filter(
      f => f.deficit.severity === 'CRITICAL' || f.deficit.severity === 'HIGH'
    ).length;
    const averageConfidence =
      forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length;

    return {
      totalDemand,
      totalSupply,
      totalDeficit,
      deficitWeeks,
      criticalWeeks,
      averageConfidence,
    };
  }

  /**
   * Save forecast to database
   */
  private async saveForecast(
    division: string,
    weeklyForecasts: WeeklyForecast[]
  ): Promise<void> {
    const forecastDate = new Date();

    for (const forecast of weeklyForecasts) {
      await prisma.laborForecast.upsert({
        where: {
          division_weekStarting_forecastDate: {
            division: division as any,
            weekStarting: forecast.weekStarting,
            forecastDate,
          },
        },
        update: {
          requiredHours: forecast.demand.totalHours,
          availableHours: forecast.supply.totalHours,
          deficit: forecast.deficit.totalDeficit,
          requiredForemen: Math.ceil(forecast.demand.foremenHours / 40),
          requiredJourneymen: Math.ceil(forecast.demand.journeymenHours / 40),
          requiredApprentices: Math.ceil(forecast.demand.apprenticeHours / 40),
          recommendations: forecast.recommendations,
          confidence: forecast.confidence,
        },
        create: {
          division: division as any,
          forecastDate,
          weekStarting: forecast.weekStarting,
          requiredHours: forecast.demand.totalHours,
          availableHours: forecast.supply.totalHours,
          deficit: forecast.deficit.totalDeficit,
          requiredForemen: Math.ceil(forecast.demand.foremenHours / 40),
          requiredJourneymen: Math.ceil(forecast.demand.journeymenHours / 40),
          requiredApprentices: Math.ceil(forecast.demand.apprenticeHours / 40),
          recommendations: forecast.recommendations,
          confidence: forecast.confidence,
        },
      });
    }
  }

  /**
   * Get recent forecast from database
   */
  private async getRecentForecast(division: string): Promise<ForecastSummary | null> {
    // Check if we have a forecast generated in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentForecasts = await prisma.laborForecast.findMany({
      where: {
        division: division as any,
        generatedAt: {
          gte: oneDayAgo,
        },
      },
      orderBy: {
        weekStarting: 'asc',
      },
    });

    if (recentForecasts.length === 0) {
      return null;
    }

    // Convert database records to forecast summary
    // This is a simplified version - you'd need to reconstruct the full structure
    return null; // For now, always regenerate
  }

  /**
   * Analyze persistent deficits
   */
  private analyzePersistentDeficits(forecasts: WeeklyForecast[]): any {
    const deficitWeeks = forecasts.filter(f => f.deficit.isDeficit);

    if (deficitWeeks.length === 0) {
      return null;
    }

    // Calculate average deficit by type
    const avgForemenDeficit =
      deficitWeeks.reduce((sum, f) => sum + f.deficit.foremenDeficit, 0) / deficitWeeks.length;
    const avgJourneymenDeficit =
      deficitWeeks.reduce((sum, f) => sum + f.deficit.journeymenDeficit, 0) / deficitWeeks.length;
    const avgApprenticeDeficit =
      deficitWeeks.reduce((sum, f) => sum + f.deficit.apprenticeDeficit, 0) / deficitWeeks.length;

    return {
      weeksWithDeficit: deficitWeeks.length,
      totalWeeks: forecasts.length,
      deficitPercentage: (deficitWeeks.length / forecasts.length) * 100,
      avgForemenDeficit,
      avgJourneymenDeficit,
      avgApprenticeDeficit,
    };
  }

  /**
   * Calculate hiring needs based on deficits
   */
  private calculateHiringNeeds(persistentDeficits: any): any {
    if (!persistentDeficits) {
      return {
        foremen: 0,
        journeymen: 0,
        apprentices: 0,
        contractors: 0,
      };
    }

    // Calculate full-time hires needed (40 hours/week)
    const foremen = Math.ceil(persistentDeficits.avgForemenDeficit / 40);
    const journeymen = Math.ceil(persistentDeficits.avgJourneymenDeficit / 40);
    const apprentices = Math.ceil(persistentDeficits.avgApprenticeDeficit / 40);

    // If deficit is less than 50% of weeks, use contractors
    const useContractors = persistentDeficits.deficitPercentage < 50;
    const contractors = useContractors
      ? Math.ceil((persistentDeficits.avgForemenDeficit +
                   persistentDeficits.avgJourneymenDeficit) / 40)
      : 0;

    return {
      foremen: useContractors ? 0 : foremen,
      journeymen: useContractors ? 0 : journeymen,
      apprentices,
      contractors,
    };
  }

  /**
   * Estimate hiring costs
   */
  private estimateHiringCosts(hiringNeeds: any): number {
    const ANNUAL_COSTS = {
      foreman: 100000,
      journeyman: 75000,
      apprentice: 45000,
      contractor: 120000, // Higher hourly rate
    };

    return (
      hiringNeeds.foremen * ANNUAL_COSTS.foreman +
      hiringNeeds.journeymen * ANNUAL_COSTS.journeyman +
      hiringNeeds.apprentices * ANNUAL_COSTS.apprentice +
      hiringNeeds.contractors * ANNUAL_COSTS.contractor
    );
  }

  /**
   * Generate hiring justification
   */
  private generateHiringJustification(
    forecast: ForecastSummary,
    persistentDeficits: any,
    hiringNeeds: any
  ): string[] {
    const justification: string[] = [];

    if (persistentDeficits?.deficitPercentage > 75) {
      justification.push(
        `Critical: ${persistentDeficits.deficitPercentage.toFixed(0)}% of weeks show labor deficit`
      );
    }

    if (forecast.aggregates.criticalWeeks > 0) {
      justification.push(
        `${forecast.aggregates.criticalWeeks} weeks with critical/high severity deficits`
      );
    }

    if (hiringNeeds.foremen > 0) {
      justification.push(
        `Need ${hiringNeeds.foremen} additional foremen to meet project leadership requirements`
      );
    }

    if (hiringNeeds.contractors > 0) {
      justification.push(
        `Recommend ${hiringNeeds.contractors} contractors for flexible capacity`
      );
    }

    const utilizationRate = (forecast.aggregates.totalDemand / forecast.aggregates.totalSupply) * 100;
    if (utilizationRate > 100) {
      justification.push(
        `Division operating at ${utilizationRate.toFixed(0)}% utilization - unsustainable`
      );
    }

    return justification;
  }

  /**
   * Determine hiring timeline
   */
  private determineHiringTimeline(persistentDeficits: any): string {
    if (!persistentDeficits) {
      return 'No immediate hiring needed';
    }

    if (persistentDeficits.deficitPercentage > 75) {
      return 'Immediate - within 2 weeks';
    } else if (persistentDeficits.deficitPercentage > 50) {
      return 'Short-term - within 1 month';
    } else {
      return 'Medium-term - within 3 months';
    }
  }

  /**
   * Calculate impact of deficit
   */
  private calculateImpact(deficit: LaborDeficit, division: string): string {
    if (deficit.severity === 'CRITICAL') {
      return 'Projects at risk of delay, overtime costs will exceed budget';
    } else if (deficit.severity === 'HIGH') {
      return 'Capacity constraints will require overtime or rescheduling';
    } else if (deficit.severity === 'MEDIUM') {
      return 'Limited flexibility for new projects or changes';
    } else {
      return 'Minor capacity constraints, manageable with current resources';
    }
  }

  /**
   * Get severity score for sorting
   */
  private getSeverityScore(severity: string): number {
    const scores: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };
    return scores[severity] || 0;
  }
}