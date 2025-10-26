import { WeeklyForecast, LaborDeficit } from './LaborForecastService';
import { format } from 'date-fns';

export class RecommendationEngine {
  /**
   * Generate recommendations for a set of weekly forecasts
   */
  async generateRecommendations(
    weeklyForecasts: WeeklyForecast[],
    division: string
  ): Promise<{
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  }> {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    // Analyze deficit patterns
    const deficitWeeks = weeklyForecasts.filter(wf => wf.deficit.isDeficit);
    const criticalWeeks = weeklyForecasts.filter(
      wf => wf.deficit.severity === 'CRITICAL' || wf.deficit.severity === 'HIGH'
    );

    // Immediate recommendations (next 2 weeks)
    const immediateForecasts = weeklyForecasts.slice(0, 2);
    for (const forecast of immediateForecasts) {
      if (forecast.deficit.severity === 'CRITICAL') {
        immediate.push(`Critical capacity shortage week of ${format(forecast.weekStarting, 'MMM d')} - approve overtime or hire contractors immediately`);
      }
      if (forecast.deficit.foremenDeficit > 0) {
        immediate.push(`Foreman shortage week of ${format(forecast.weekStarting, 'MMM d')} - assign lead journeyman or reschedule phases`);
      }
    }

    // Short-term recommendations (2-6 weeks)
    const shortTermForecasts = weeklyForecasts.slice(2, 6);
    const avgShortTermDeficit = this.calculateAverageDeficit(shortTermForecasts);

    if (avgShortTermDeficit > 80) {
      shortTerm.push(`Average deficit of ${avgShortTermDeficit.toFixed(0)} hours/week over next month - initiate hiring process`);
    }

    if (criticalWeeks.length > 2) {
      shortTerm.push(`${criticalWeeks.length} weeks with critical/high deficits - consider contractor agreements`);
    }

    // Long-term recommendations (6+ weeks)
    const longTermForecasts = weeklyForecasts.slice(6);
    const persistentDeficit = this.analyzePersistentDeficit(weeklyForecasts);

    if (persistentDeficit) {
      longTerm.push(`Persistent capacity deficit detected - recommend hiring ${persistentDeficit.foremen} foremen, ${persistentDeficit.journeymen} journeymen`);
    }

    // Division-specific recommendations
    if (division.includes('HVAC') && this.isSummerPeak(weeklyForecasts)) {
      shortTerm.push('Summer peak season approaching - secure additional HVAC technicians');
    }

    return { immediate, shortTerm, longTerm };
  }

  /**
   * Generate weekly-specific recommendations
   */
  async generateWeeklyRecommendations(
    deficit: LaborDeficit,
    division: string,
    weekStarting: Date
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (deficit.isDeficit) {
      const totalDeficit = deficit.totalDeficit;

      if (totalDeficit <= 40) {
        recommendations.push('Approve overtime for existing crew');
      } else if (totalDeficit <= 80) {
        recommendations.push('Hire 1-2 contractors for the week');
      } else {
        recommendations.push(`Significant deficit (${totalDeficit.toFixed(0)}h) - reschedule non-critical work or hire multiple contractors`);
      }

      if (deficit.foremenDeficit > 0) {
        recommendations.push('Assign experienced journeyman as lead');
      }

      if (deficit.apprenticeDeficit > 20) {
        recommendations.push('Contact trade school for apprentice placement');
      }
    }

    return recommendations;
  }

  /**
   * Calculate average deficit
   */
  private calculateAverageDeficit(forecasts: WeeklyForecast[]): number {
    if (forecasts.length === 0) return 0;

    const totalDeficit = forecasts.reduce(
      (sum, f) => sum + f.deficit.totalDeficit,
      0
    );

    return totalDeficit / forecasts.length;
  }

  /**
   * Analyze persistent deficit patterns
   */
  private analyzePersistentDeficit(forecasts: WeeklyForecast[]): {
    foremen: number;
    journeymen: number;
    apprentices: number;
  } | null {
    const deficitWeeks = forecasts.filter(f => f.deficit.isDeficit);

    if (deficitWeeks.length < forecasts.length * 0.5) {
      return null; // Less than 50% deficit, no persistent issue
    }

    const avgForemenDeficit = deficitWeeks.reduce(
      (sum, f) => sum + f.deficit.foremenDeficit,
      0
    ) / deficitWeeks.length;

    const avgJourneymenDeficit = deficitWeeks.reduce(
      (sum, f) => sum + f.deficit.journeymenDeficit,
      0
    ) / deficitWeeks.length;

    const avgApprenticeDeficit = deficitWeeks.reduce(
      (sum, f) => sum + f.deficit.apprenticeDeficit,
      0
    ) / deficitWeeks.length;

    return {
      foremen: Math.ceil(avgForemenDeficit / 40),
      journeymen: Math.ceil(avgJourneymenDeficit / 40),
      apprentices: Math.ceil(avgApprenticeDeficit / 40),
    };
  }

  /**
   * Check if forecasts include summer peak season
   */
  private isSummerPeak(forecasts: WeeklyForecast[]): boolean {
    return forecasts.some(f => {
      const month = f.weekStarting.getMonth();
      return month >= 5 && month <= 8; // June through September
    });
  }
}