# PRP-014: Labor Forecast

## Status
🔲 Not Started

## Priority
P1 - High

## Objective
Build intelligent labor forecasting system that predicts future capacity needs, identifies labor deficits, generates hiring recommendations, and provides confidence-rated forecasts by division and week.

## Scope

### Files to Create
- `prisma/migrations/XXX_add_labor_forecast_model.sql` - LaborForecast table migration
- `src/services/forecast/LaborForecastService.ts` - Main forecasting engine
- `src/services/forecast/DemandCalculator.ts` - Calculate future labor demand
- `src/services/forecast/SupplyCalculator.ts` - Calculate available labor supply
- `src/services/forecast/DeficitAnalyzer.ts` - Identify labor deficits
- `src/services/forecast/RecommendationEngine.ts` - Generate hiring recommendations
- `src/services/forecast/ConfidenceCalculator.ts` - Calculate forecast confidence
- `src/app/api/forecast/route.ts` - Get labor forecasts
- `src/app/api/forecast/generate/route.ts` - Generate new forecast
- `src/app/api/forecast/deficit/route.ts` - Get labor deficits
- `src/app/api/forecast/recommendations/route.ts` - Get hiring recommendations
- `src/hooks/useForecast.ts` - React Query hooks
- `src/components/forecast/ForecastDashboard.tsx` - Main forecast dashboard
- `src/components/forecast/DemandChart.tsx` - Demand visualization
- `src/components/forecast/DeficitAlert.tsx` - Deficit alerts
- `src/components/forecast/RecommendationPanel.tsx` - Recommendations UI
- `src/components/forecast/ConfidenceBadge.tsx` - Confidence indicator
- `src/components/forecast/WeeklyBreakdown.tsx` - Weekly forecast table
- `tests/unit/services/LaborForecastService.test.ts` - Service tests
- `tests/unit/services/DemandCalculator.test.ts` - Demand tests
- `tests/unit/services/DeficitAnalyzer.test.ts` - Deficit tests
- `tests/unit/services/RecommendationEngine.test.ts` - Recommendation tests
- `tests/integration/api/forecast.test.ts` - API tests
- `tests/e2e/forecast-dashboard.spec.ts` - E2E tests

### Database Schema Updates
```typescript
// From spec.md - LaborForecast model
model LaborForecast {
  id                    String   @id @default(uuid())
  division              Division
  forecastDate          DateTime // Date forecast was generated
  weekStarting          DateTime // Week being forecasted
  requiredHours         Float
  availableHours        Float
  deficit               Float    // Negative = surplus, Positive = deficit
  requiredForemen       Int
  requiredJourneymen    Int
  requiredApprentices   Int
  recommendations       String[] // Array of recommendation strings
  confidence            Float    // 0-100
  generatedAt           DateTime @default(now())

  @@unique([division, weekStarting, forecastDate])
}
```

## Implementation Steps

1. **Create Database Migration**
   - Add LaborForecast model to Prisma schema
   - Generate and run migration
   - Add indexes on division, weekStarting, forecastDate
   - Set up automatic forecast generation (weekly)

2. **Build Demand Calculator**
   - Calculate labor demand from project phases
   - Project future demand based on project schedules
   - Factor in phase dependencies
   - Account for project probability (QUOTED projects)
   - Calculate demand by employee type
   - Generate 13-week rolling forecast

3. **Create Supply Calculator**
   - Calculate available labor supply
   - Factor in employee availability dates
   - Account for maxHoursPerWeek limits
   - Consider existing assignments
   - Project supply changes (hires, terminations)
   - Calculate supply by employee type

4. **Implement Deficit Analyzer**
   - Compare demand vs. supply by week
   - Identify weeks with labor deficit
   - Calculate deficit magnitude (hours, headcount)
   - Break down by employee type
   - Prioritize critical deficits
   - Generate deficit timeline

5. **Build Recommendation Engine**
   - Generate hiring recommendations
   - Recommend contractor usage
   - Suggest project rescheduling
   - Recommend overtime usage
   - Calculate cost impact of recommendations
   - Prioritize recommendations by ROI

6. **Create Confidence Calculator**
   - Calculate forecast confidence (0-100)
   - Factor in data quality
   - Account for project status (QUOTED vs. AWARDED)
   - Consider historical accuracy
   - Weight recent data more heavily
   - Decrease confidence for distant weeks

7. **Build API Routes**
   - POST /api/forecast/generate - Generate new forecast
   - GET /api/forecast?division=X&weeks=13 - Get forecast
   - GET /api/forecast/deficit?division=X - Get deficits
   - GET /api/forecast/recommendations?division=X - Get recommendations
   - GET /api/forecast/summary - Executive summary
   - GET /api/forecast/export - Export to Excel

8. **Build React Components**
   - ForecastDashboard with key metrics
   - DemandChart with supply/demand overlay
   - DeficitAlert with severity indicators
   - RecommendationPanel with action items
   - ConfidenceBadge with color coding
   - WeeklyBreakdown with detailed table
   - Export forecast to PDF/Excel

## Acceptance Criteria

- [ ] LaborForecast model is created and migrated
- [ ] Labor demand is calculated from project phases
- [ ] Labor supply is calculated from employee availability
- [ ] Deficit is calculated as demand - supply
- [ ] Forecast is generated for 13 weeks ahead
- [ ] Forecast is broken down by employee type
- [ ] Deficit weeks are identified and flagged
- [ ] Hiring recommendations are generated
- [ ] Recommendations include cost impact
- [ ] Forecast confidence is calculated (0-100)
- [ ] Confidence accounts for project status
- [ ] Weekly forecasts are displayed in dashboard
- [ ] Deficit alerts are shown for critical weeks
- [ ] Forecast can be exported to Excel
- [ ] All forecast tests pass (unit, integration, E2E)

## Validation Steps

```bash
# 1. Run database migration
npx prisma migrate dev --name add_labor_forecast_model

# 2. Verify migration
npx prisma studio
# Check LaborForecast table

# 3. Generate forecast for division
curl -X POST http://localhost:3000/api/forecast/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "division": "PLUMBING_MULTIFAMILY",
    "weeks": 13
  }'
# Should generate 13-week forecast

# 4. Get forecast data
curl -X GET "http://localhost:3000/api/forecast?division=PLUMBING_MULTIFAMILY&weeks=13" \
  -H "Authorization: Bearer $TOKEN"
# Should return 13 weeks of forecast

# 5. Get labor deficits
curl -X GET "http://localhost:3000/api/forecast/deficit?division=PLUMBING_MULTIFAMILY" \
  -H "Authorization: Bearer $TOKEN"
# Should return weeks with labor deficit

# 6. Get hiring recommendations
curl -X GET "http://localhost:3000/api/forecast/recommendations?division=PLUMBING_MULTIFAMILY" \
  -H "Authorization: Bearer $TOKEN"
# Should return hiring recommendations

# 7. Get executive summary
curl -X GET http://localhost:3000/api/forecast/summary \
  -H "Authorization: Bearer $TOKEN"
# Should return summary across all divisions

# 8. Export forecast to Excel
curl -X GET "http://localhost:3000/api/forecast/export?division=PLUMBING_MULTIFAMILY" \
  -H "Authorization: Bearer $TOKEN" \
  --output forecast.xlsx
# Should download Excel file

# 9. Run unit tests
npm run test -- tests/unit/services/LaborForecastService.test.ts
npm run test -- tests/unit/services/DemandCalculator.test.ts
npm run test -- tests/unit/services/DeficitAnalyzer.test.ts
npm run test -- tests/unit/services/RecommendationEngine.test.ts
# All tests should pass

# 10. Run integration tests
npm run test:ci -- tests/integration/api/forecast.test.ts
# All API tests should pass

# 11. Run E2E tests
npm run test:e2e -- tests/e2e/forecast-dashboard.spec.ts
# Dashboard loads and displays forecast
```

## Expected Output

```
✓ LaborForecast model created and migrated
✓ Demand calculated from project phases
✓ Supply calculated from employee availability
✓ Deficit calculated correctly (demand - supply)
✓ 13-week forecast generated
✓ Employee type breakdown accurate
✓ Deficit weeks identified
✓ Hiring recommendations generated
✓ Cost impact calculated
✓ Forecast confidence computed
✓ Confidence factors in project status
✓ Dashboard displays forecast correctly
✓ Deficit alerts shown
✓ All forecast tests passing (35/35)
```

## Forecast Calculation Formulas

```typescript
class LaborForecastService {
  // Generate 13-week forecast for a division
  async generateForecast(division: Division, weeks: number = 13): Promise<LaborForecast[]> {
    const forecasts: LaborForecast[] = [];
    const today = new Date();

    for (let i = 0; i < weeks; i++) {
      const weekStart = this.getWeekStart(today, i);

      // Calculate demand from project phases
      const demand = await this.demandCalculator.calculateDemand(division, weekStart);

      // Calculate supply from employees
      const supply = await this.supplyCalculator.calculateSupply(division, weekStart);

      // Calculate deficit
      const deficit = demand.totalHours - supply.totalHours;

      // Generate recommendations if deficit
      const recommendations = deficit > 0
        ? await this.recommendationEngine.generate(division, deficit, demand)
        : [];

      // Calculate confidence
      const confidence = this.confidenceCalculator.calculate(division, weekStart, i);

      forecasts.push({
        division,
        forecastDate: today,
        weekStarting: weekStart,
        requiredHours: demand.totalHours,
        availableHours: supply.totalHours,
        deficit,
        requiredForemen: demand.foremen,
        requiredJourneymen: demand.journeymen,
        requiredApprentices: demand.apprentices,
        recommendations,
        confidence
      });
    }

    // Save to database
    await this.saveForecastsToDB(forecasts);

    return forecasts;
  }
}
```

## Demand Calculation

```typescript
class DemandCalculator {
  async calculateDemand(division: Division, weekStart: Date): Promise<LaborDemand> {
    // Get all phases active during this week
    const phases = await this.getActivePha ses(division, weekStart);

    let totalHours = 0;
    let foremen = 0;
    let journeymen = 0;
    let apprentices = 0;

    for (const phase of phases) {
      // Calculate hours needed for this phase this week
      const weekHours = this.calculatePhaseWeeklyHours(phase, weekStart);

      totalHours += weekHours;

      // Add crew requirements
      if (phase.requiredForeman) foremen += 1;
      journeymen += phase.requiredJourneymen;
      apprentices += phase.requiredApprentices;

      // Adjust for project probability
      if (phase.project.status === 'QUOTED') {
        totalHours *= 0.5; // 50% probability QUOTED projects get awarded
      }
    }

    return { totalHours, foremen, journeymen, apprentices };
  }

  calculatePhaseWeeklyHours(phase: ProjectPhase, weekStart: Date): number {
    // Calculate overlap between phase and week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const overlapDays = this.calculateOverlapDays(
      phase.startDate,
      phase.endDate,
      weekStart,
      weekEnd
    );

    // Daily hours = laborHours / duration
    const dailyHours = phase.laborHours / phase.duration;

    return dailyHours * overlapDays;
  }
}
```

## Confidence Calculation

```typescript
class ConfidenceCalculator {
  calculate(division: Division, weekStart: Date, weeksOut: number): number {
    let confidence = 100;

    // Decrease confidence for distant weeks
    confidence -= weeksOut * 5; // -5% per week

    // Adjust based on project status
    const phases = this.getActivePhases(division, weekStart);
    const quotedPercentage = this.getQuotedPercentage(phases);
    confidence -= quotedPercentage * 30; // Up to -30% for quoted projects

    // Adjust based on data quality
    const dataQuality = this.assessDataQuality(division);
    confidence *= dataQuality; // 0-1 multiplier

    // Clamp to 0-100 range
    return Math.max(0, Math.min(100, confidence));
  }

  getQuotedPercentage(phases: ProjectPhase[]): number {
    const quoted = phases.filter(p => p.project.status === 'QUOTED').length;
    return quoted / phases.length;
  }

  assessDataQuality(division: Division): number {
    // Check for missing data
    const employees = this.getEmployees(division);
    const hasCompleteData = employees.every(e =>
      e.hourlyRate && e.maxHoursPerWeek && e.employeeType
    );

    return hasCompleteData ? 1.0 : 0.8;
  }
}
```

## Recommendation Engine

```typescript
class RecommendationEngine {
  async generate(division: Division, deficit: number, demand: LaborDemand): Promise<string[]> {
    const recommendations: string[] = [];

    // Calculate headcount deficit
    const headcountDeficit = Math.ceil(deficit / 40); // 40 hours per week per employee

    // Hiring recommendation
    if (headcountDeficit > 0) {
      const breakdown = this.calculateHiringBreakdown(demand);
      recommendations.push(
        `Hire ${headcountDeficit} employees: ${breakdown.foremen} foremen, ${breakdown.journeymen} journeymen, ${breakdown.apprentices} apprentices`
      );
    }

    // Contractor recommendation
    if (deficit > 0 && deficit < 80) {
      recommendations.push(
        `Consider using contractors for ${Math.ceil(deficit / 8)} days of work`
      );
    }

    // Overtime recommendation
    const overtimeCost = this.calculateOvertimeCost(division, deficit);
    const hiringCost = this.calculateHiringCost(headcountDeficit);

    if (overtimeCost < hiringCost) {
      recommendations.push(
        `Approve overtime: $${overtimeCost.toLocaleString()} (cheaper than hiring)`
      );
    }

    // Project rescheduling recommendation
    const reschedulable = await this.findReschedulableProjects(division);
    if (reschedulable.length > 0) {
      recommendations.push(
        `Consider rescheduling ${reschedulable.length} low-priority projects`
      );
    }

    return recommendations;
  }
}
```

## Deficit Severity Levels

```typescript
const DeficitSeverity = {
  LOW: { threshold: 40, color: 'yellow', action: 'Monitor' },        // 1 employee deficit
  MEDIUM: { threshold: 120, color: 'orange', action: 'Plan hiring' }, // 3 employee deficit
  HIGH: { threshold: 240, color: 'red', action: 'Hire urgently' },    // 6 employee deficit
  CRITICAL: { threshold: 400, color: 'purple', action: 'Emergency hiring' } // 10+ employee deficit
};

function getDeficitSeverity(deficit: number): string {
  if (deficit < 40) return 'LOW';
  if (deficit < 120) return 'MEDIUM';
  if (deficit < 240) return 'HIGH';
  return 'CRITICAL';
}
```

## Related PRPs
- Depends on: PRP-005 (Employee Management), PRP-007 (Project Phases), PRP-013 (Capacity Calculator)
- Blocks: PRP-015 (Alert System)

## Estimated Time
7-8 hours

## Notes
- Generate forecasts weekly on Sundays
- Forecast 13 weeks (one quarter) into the future
- Archive forecasts older than 6 months
- Track forecast accuracy vs. actuals for improvement
- Send weekly forecast summary to management via email
- Consider seasonal patterns in forecasting (future)
- Factor in historical project win rates for QUOTED projects
- Include confidence intervals in forecast visualization
- Export forecasts to Excel for offline analysis

## Rollback Plan
If validation fails:
1. Verify LaborForecast model matches spec.md interface
2. Check demand calculation formulas
3. Test supply calculation logic
4. Verify deficit calculation (demand - supply)
5. Test confidence calculation
6. Check recommendation engine logic
7. Test with known project/employee data
8. Revert migration: `npx prisma migrate reset`
