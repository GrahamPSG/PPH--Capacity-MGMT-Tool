# PRP-017: Cash Flow Projection

## Status
🔲 Not Started

## Priority
P1 - High (Critical financial planning tool)

## Objective
Implement cash flow projection algorithms with scenario modeling, variance analysis, and forecasting to help owners make informed financial decisions.

## Scope

### Files to Create
- `src/services/financial/cashflow.service.ts` - Cash flow calculation engine
- `src/services/financial/projection.service.ts` - Projection algorithms
- `src/services/financial/scenario.service.ts` - Scenario modeling
- `src/app/api/cashflow/projection/route.ts` - Projection API endpoints
- `src/app/api/cashflow/scenarios/route.ts` - Scenario API endpoints
- `src/components/cashflow/ProjectionChart.tsx` - Cash flow chart
- `src/components/cashflow/ScenarioModeler.tsx` - Scenario builder
- `src/components/cashflow/VarianceAnalysis.tsx` - Variance display
- `src/components/cashflow/CashFlowDashboard.tsx` - Main dashboard
- `src/hooks/useCashFlow.ts` - Cash flow data hook
- `src/lib/calculations/cashflow.ts` - Calculation utilities
- `src/lib/algorithms/projection.ts` - Projection algorithms
- `tests/services/cashflow.test.ts` - Service tests
- `tests/lib/algorithms/projection.test.ts` - Algorithm tests
- `tests/components/ProjectionChart.test.tsx` - Component tests

### Database Extensions
```prisma
model CashFlowProjection {
  id            String   @id @default(uuid())
  projectId     String?
  date          DateTime
  projectedIn   Decimal  @db.Decimal(12, 2)
  projectedOut  Decimal  @db.Decimal(12, 2)
  actualIn      Decimal? @db.Decimal(12, 2)
  actualOut     Decimal? @db.Decimal(12, 2)
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  project       Project? @relation(fields: [projectId], references: [id])
}

model CashFlowScenario {
  id              String   @id @default(uuid())
  name            String
  description     String?
  assumptions     Json
  projections     Json
  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  user            User     @relation(fields: [createdBy], references: [id])
}
```

## Implementation Steps

1. **Create Cash Flow Calculation Engine**
   - Calculate daily/weekly/monthly cash position
   - Track incoming payments from SOV
   - Track outgoing expenses (labor, materials, overhead)
   - Calculate net cash flow
   - Running balance calculations

2. **Implement Projection Algorithms**
   - Historical trend analysis
   - Linear projection
   - Weighted moving average
   - Seasonal adjustment
   - Project-based forecasting
   - Confidence intervals

3. **Build Scenario Modeling System**
   - Create custom scenarios
   - Adjust key assumptions (payment terms, labor costs, etc.)
   - Compare multiple scenarios side-by-side
   - Best case / worst case / most likely scenarios
   - Sensitivity analysis

4. **Implement Variance Analysis**
   - Compare projected vs actual cash flow
   - Calculate variance amounts and percentages
   - Identify trends and patterns
   - Root cause analysis
   - Forecast accuracy tracking

5. **Create Visualization Components**
   - Line chart for cash flow over time
   - Waterfall chart for cash flow changes
   - Area chart showing cash reserves
   - Scenario comparison charts
   - Variance heatmaps

6. **Add API Endpoints**
   - GET /api/cashflow/projection - Get projections
   - POST /api/cashflow/projection - Generate projection
   - GET /api/cashflow/scenarios - List scenarios
   - POST /api/cashflow/scenarios - Create scenario
   - PATCH /api/cashflow/scenarios/[id] - Update scenario
   - GET /api/cashflow/variance - Get variance analysis

7. **Implement Alert System Integration**
   - Low cash balance warnings
   - Negative cash flow alerts
   - Large variance notifications
   - Opportunity alerts (surplus cash)

## Acceptance Criteria

- [ ] Cash flow projections calculate for 30, 60, 90, and 180 days
- [ ] Projections based on SOV billing schedule and expense forecasts
- [ ] Scenario modeling allows creating multiple "what-if" scenarios
- [ ] Variance analysis compares projected vs actual with detailed breakdown
- [ ] Charts display cash flow trends with zoom and pan controls
- [ ] Confidence intervals shown for projection uncertainty
- [ ] Historical data used to improve projection accuracy
- [ ] Scenarios can be saved, edited, and compared
- [ ] API endpoints return correct calculations with proper validation
- [ ] Alerts trigger when cash flow falls below configured thresholds
- [ ] Reports can be exported to PDF and Excel
- [ ] All tests pass with >80% coverage

## Validation Steps

```bash
# 1. Run database migration
npx prisma migrate dev --name add_cashflow_models

# 2. Seed test data
npm run prisma:seed

# 3. Run algorithm tests
npm test -- tests/lib/algorithms/projection.test.ts

# 4. Run service tests
npm test -- tests/services/cashflow.test.ts

# 5. Start dev server
npm run dev

# 6. Test projection generation
# Navigate to cash flow dashboard
# Generate 90-day projection
# Verify calculations match expected values

# 7. Test scenario modeling
# Create "Best Case" scenario (faster payments)
# Create "Worst Case" scenario (delayed payments)
# Compare scenarios side-by-side
# Verify differences are calculated correctly

# 8. Test variance analysis
# Add actual cash flow data
# Compare against projections
# Verify variance calculations

# 9. Test visualization
# Verify charts render correctly
# Test zoom and pan controls
# Export chart as PNG/PDF

# 10. Test API endpoints
curl http://localhost:3000/api/cashflow/projection?days=90
# Should return 90-day projection

# 11. Test alert integration
# Set low balance threshold to $50,000
# Create projection that goes below threshold
# Verify alert triggers

# 12. Run integration tests
npm run test:ci
```

## Expected Output

```
✓ Cash flow projection engine with multiple algorithms
✓ Scenario modeling with custom assumptions
✓ Variance analysis with detailed breakdowns
✓ Interactive charts with zoom/pan controls
✓ API endpoints for projections and scenarios
✓ Alert integration for low cash warnings
✓ All tests passing (>80% coverage)
✓ Accurate projections based on historical data
```

## Key Algorithms

### Simple Projection
```typescript
projection = currentBalance + expectedInflows - expectedOutflows
```

### Weighted Moving Average
```typescript
weights = [0.5, 0.3, 0.2] // Most recent has highest weight
projection = sum(historicalCashFlow[i] * weights[i])
```

### Trend-Based Projection
```typescript
trend = linearRegression(historicalCashFlow)
projection = lastActual + (trend * daysAhead)
```

### Scenario Adjustment
```typescript
scenarioProjection = baseProjection * assumptionMultiplier
// e.g., Best Case: multiply inflows by 1.1, outflows by 0.9
```

### Confidence Interval
```typescript
standardDeviation = calculateStdDev(historicalVariance)
confidenceInterval = projection ± (1.96 * standardDeviation) // 95% CI
```

## Related PRPs
- Depends on: PRP-016 (Schedule of Values), PRP-004 (Project Management)
- Blocks: PRP-018 (Financial Alerts)
- Related: PRP-027 (Reporting Engine), PRP-022 (Capacity Dashboard)

## Estimated Time
10-12 hours

## Notes
- Use historical data from at least 6 months for accurate projections
- Update projections weekly or when significant changes occur
- Store all amounts as Decimal type for precision
- Consider seasonal variations in construction (weather impacts)
- Include overhead and indirect costs in projections
- Support multiple projection methods (conservative, aggressive, balanced)
- Log all projection runs for audit trail
- Consider cash flow from multiple divisions separately
- Factor in typical payment delays (Net 30 often pays at 45+ days)

## Rollback Plan
If validation fails:
1. Verify database migrations applied correctly
2. Check calculation accuracy with manual spreadsheet comparison
3. Test with known historical data
4. Verify API responses with Postman
5. Check algorithm implementation against specifications
6. Review chart rendering with different data ranges
7. Test scenario calculations independently
8. Rollback migration if needed: `npx prisma migrate resolve --rolled-back [migration_name]`
9. Verify Decimal precision maintained throughout calculations
