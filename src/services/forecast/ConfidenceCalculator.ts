import { LaborDemand, LaborSupply } from './LaborForecastService';
import { differenceInWeeks } from 'date-fns';

export class ConfidenceCalculator {
  /**
   * Calculate forecast confidence based on various factors
   */
  async calculateConfidence(
    demand: LaborDemand,
    supply: LaborSupply,
    weekStarting: Date
  ): Promise<number> {
    const factors: { weight: number; score: number }[] = [];

    // Factor 1: Time distance (closer = more confident)
    const weeksOut = differenceInWeeks(weekStarting, new Date());
    const timeFactor = Math.max(0, 100 - (weeksOut * 5)); // -5% per week out
    factors.push({ weight: 0.3, score: timeFactor });

    // Factor 2: Project count (more projects = more stable demand)
    const projectFactor = Math.min(100, demand.projectCount * 20);
    factors.push({ weight: 0.2, score: projectFactor });

    // Factor 3: Supply stability (more available employees = more confident)
    const supplyFactor = supply.availableEmployees > 0
      ? Math.min(100, (supply.availableEmployees / supply.employeeCount) * 100)
      : 0;
    factors.push({ weight: 0.2, score: supplyFactor });

    // Factor 4: Historical accuracy (would need historical data)
    const historicalFactor = 75; // Placeholder - would calculate from past forecasts
    factors.push({ weight: 0.2, score: historicalFactor });

    // Factor 5: Data completeness
    const dataFactor = this.calculateDataCompleteness(demand, supply);
    factors.push({ weight: 0.1, score: dataFactor });

    // Calculate weighted average
    const confidence = factors.reduce(
      (sum, factor) => sum + (factor.weight * factor.score),
      0
    );

    return Math.round(Math.max(0, Math.min(100, confidence)));
  }

  /**
   * Calculate data completeness score
   */
  private calculateDataCompleteness(demand: LaborDemand, supply: LaborSupply): number {
    let score = 100;

    // Penalize if missing data
    if (demand.phaseCount === 0) score -= 20;
    if (supply.employeeCount === 0) score -= 20;
    if (demand.totalHours === 0) score -= 10;
    if (supply.totalHours === 0) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Get confidence level description
   */
  getConfidenceLevel(confidence: number): {
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    color: string;
  } {
    if (confidence >= 80) {
      return {
        level: 'HIGH',
        description: 'High confidence forecast',
        color: 'green',
      };
    } else if (confidence >= 60) {
      return {
        level: 'MEDIUM',
        description: 'Moderate confidence forecast',
        color: 'yellow',
      };
    } else {
      return {
        level: 'LOW',
        description: 'Low confidence forecast - interpret with caution',
        color: 'red',
      };
    }
  }
}