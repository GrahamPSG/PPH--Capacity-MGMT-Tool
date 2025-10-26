import { LaborDemand, LaborSupply, LaborDeficit } from './LaborForecastService';

export class DeficitAnalyzer {
  /**
   * Analyze deficit between demand and supply
   */
  analyzeDeficit(demand: LaborDemand, supply: LaborSupply): LaborDeficit {
    const totalDeficit = demand.totalHours - supply.totalHours;
    const foremenDeficit = demand.foremenHours - supply.foremenHours;
    const journeymenDeficit = demand.journeymenHours - supply.journeymenHours;
    const apprenticeDeficit = demand.apprenticeHours - supply.apprenticeHours;

    const isDeficit = totalDeficit > 0;
    const severity = this.calculateSeverity(totalDeficit, supply.totalHours);

    return {
      totalDeficit: Math.max(0, totalDeficit),
      foremenDeficit: Math.max(0, foremenDeficit),
      journeymenDeficit: Math.max(0, journeymenDeficit),
      apprenticeDeficit: Math.max(0, apprenticeDeficit),
      isDeficit,
      severity,
    };
  }

  /**
   * Calculate deficit severity
   */
  private calculateSeverity(deficit: number, supply: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (deficit <= 0) return 'LOW';

    const deficitPercentage = supply > 0 ? (deficit / supply) * 100 : 100;

    if (deficitPercentage >= 50) return 'CRITICAL';
    if (deficitPercentage >= 25) return 'HIGH';
    if (deficitPercentage >= 10) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Identify critical deficit periods
   */
  identifyCriticalPeriods(deficits: LaborDeficit[]): number[] {
    const criticalIndexes: number[] = [];

    deficits.forEach((deficit, index) => {
      if (deficit.severity === 'CRITICAL' || deficit.severity === 'HIGH') {
        criticalIndexes.push(index);
      }
    });

    return criticalIndexes;
  }

  /**
   * Calculate cumulative deficit over time
   */
  calculateCumulativeDeficit(deficits: LaborDeficit[]): number[] {
    const cumulative: number[] = [];
    let runningTotal = 0;

    for (const deficit of deficits) {
      runningTotal += deficit.totalDeficit;
      cumulative.push(runningTotal);
    }

    return cumulative;
  }
}