# PRP-022: Capacity Dashboard

## Status
🔲 Not Started

## Priority
P1 - High (Core capacity feature)

## Objective
Implement comprehensive capacity dashboard with heatmaps, utilization charts, real-time updates, and forecasting to visualize labor allocation across divisions and projects.

## Scope

### Files to Create
- `src/components/capacity/CapacityDashboard.tsx` - Main dashboard component
- `src/components/capacity/CapacityHeatmap.tsx` - Heatmap visualization
- `src/components/capacity/UtilizationChart.tsx` - Utilization bar/line chart
- `src/components/capacity/DivisionBreakdown.tsx` - Division capacity breakdown
- `src/components/capacity/EmployeeCard.tsx` - Employee capacity card
- `src/components/capacity/ForecastChart.tsx` - Capacity forecast chart
- `src/components/capacity/CapacityFilters.tsx` - Filter controls
- `src/components/capacity/CapacityMetrics.tsx` - Key metrics display
- `src/hooks/useCapacity.ts` - Capacity data hook
- `src/services/capacity/capacity-calc.service.ts` - Capacity calculations
- `src/services/capacity/forecast.service.ts` - Forecasting logic
- `src/app/api/capacity/dashboard/route.ts` - Dashboard API endpoint
- `src/app/api/capacity/heatmap/route.ts` - Heatmap data endpoint
- `src/lib/calculations/utilization.ts` - Utilization calculation utilities
- `tests/services/capacity-calc.test.ts` - Capacity service tests
- `tests/components/CapacityDashboard.test.tsx` - Dashboard tests

### Database Extensions
```prisma
model CapacitySnapshot {
  id                String   @id @default(uuid())
  date              DateTime
  division          Division
  totalCapacity     Int      // Total available hours
  allocatedCapacity Int      // Hours allocated to projects
  utilization       Decimal  @db.Decimal(5, 2) // Percentage
  employeeCount     Int
  projectCount      Int
  createdAt         DateTime @default(now())

  @@unique([date, division])
  @@index([date])
  @@index([division])
}
```

## Implementation Steps

1. **Create Capacity Calculation Service**
   - Calculate total capacity (employees × 40 hours/week)
   - Calculate allocated capacity (sum of crew assignments)
   - Calculate utilization percentage
   - Calculate available capacity
   - Group by division, employee, project
   - Calculate overtime allocation

2. **Implement Capacity Heatmap**
   - Grid layout: rows = divisions/employees, columns = weeks
   - Color coding: green (underutilized) → yellow (optimal) → red (overallocated)
   - Thresholds: <70% green, 70-90% yellow, 90-110% orange, >110% red
   - Hover tooltip showing exact percentage
   - Click to drill down into detail
   - Support week, month, quarter views

3. **Build Utilization Charts**
   - Stacked bar chart by division
   - Line chart showing utilization trend over time
   - Combo chart: capacity (bars) + utilization % (line)
   - Show target utilization line (e.g., 85%)
   - Highlight over/under capacity
   - Support date range selection

4. **Create Division Breakdown**
   - Card for each division showing:
     - Total capacity
     - Allocated capacity
     - Utilization percentage
     - Employee count
     - Active project count
   - Visual gauge for utilization
   - Color-coded status indicator
   - Click to view division details

5. **Implement Employee Capacity Cards**
   - List all employees with capacity info
   - Show allocation across projects
   - Mini chart showing weekly allocation
   - Flag overallocated employees (>40 hrs/week)
   - Show available capacity
   - Support sorting and filtering

6. **Add Capacity Forecasting**
   - Project capacity needs for next 3/6/12 months
   - Based on awarded and quoted projects
   - Show confidence intervals
   - Alert on projected overallocation
   - Hiring recommendations
   - Scenario planning

7. **Create Real-Time Updates**
   - WebSocket integration for live updates
   - Refresh when crew assignments change
   - Animate capacity changes
   - Show "Updated X seconds ago" indicator
   - Auto-refresh every 5 minutes

8. **Add Dashboard Filters**
   - Filter by division
   - Filter by date range
   - Filter by employee role
   - Filter by project status
   - Filter by capacity threshold
   - Save filter presets

9. **Implement Key Metrics**
   - Overall utilization percentage
   - Total available capacity
   - Capacity gap (needed - available)
   - Top 5 most utilized employees
   - Divisions at risk
   - Projected capacity in 30/60/90 days

## Acceptance Criteria

- [ ] Capacity dashboard displays utilization across all divisions
- [ ] Heatmap color codes capacity levels correctly (green/yellow/red)
- [ ] Utilization charts show trends over time
- [ ] Division breakdown cards show key metrics accurately
- [ ] Employee capacity cards list all employees with allocation
- [ ] Capacity forecast projects needs for 3/6/12 months
- [ ] Real-time updates reflect crew assignment changes immediately
- [ ] Filters allow narrowing data by division, date, role
- [ ] Overallocated employees (>100%) clearly highlighted
- [ ] Dashboard loads in <2 seconds with 200+ employees
- [ ] Key metrics calculate correctly
- [ ] All tests pass with >80% coverage

## Validation Steps

```bash
# 1. Run database migration
npx prisma migrate dev --name add_capacity_snapshot

# 2. Run unit tests
npm test -- tests/services/capacity-calc.test.ts

# 3. Run component tests
npm test -- tests/components/CapacityDashboard.test.tsx

# 4. Start dev server with WebSocket support
npm run dev

# 5. Seed capacity data
npm run seed:capacity
# Creates test employees and assignments

# 6. Test dashboard rendering
# Navigate to /capacity/dashboard
# Verify heatmap displays
# Verify division cards show metrics
# Verify employee list loads

# 7. Test heatmap interaction
# Hover over heatmap cell
# Verify tooltip shows exact percentage
# Click cell
# Verify drills down to detail view

# 8. Test utilization chart
# Verify chart displays correctly
# Select different date ranges
# Verify data updates
# Test zoom controls

# 9. Test filters
# Filter by specific division
# Verify only that division's data shown
# Filter by date range
# Verify data updates correctly

# 10. Test real-time updates
# Open dashboard in two browser windows
# Create crew assignment in one window
# Verify capacity updates in other window
# Verify animation plays

# 11. Test capacity forecast
# Navigate to forecast view
# Verify 3/6/12 month projections displayed
# Verify confidence intervals shown
# Test scenario adjustments

# 12. Test performance
# Load dashboard with 200+ employees
# Verify loads in <2 seconds
# Verify smooth scrolling
# Check browser performance metrics

# 13. Test API endpoints
curl http://localhost:3000/api/capacity/dashboard?division=PLUMBING_COMMERCIAL
# Should return capacity metrics

curl http://localhost:3000/api/capacity/heatmap?weeks=12
# Should return heatmap data

# 14. Run integration tests
npm run test:ci
```

## Expected Output

```
✓ Capacity dashboard with comprehensive metrics
✓ Heatmap with color-coded utilization levels
✓ Utilization charts (bar, line, combo)
✓ Division breakdown with key metrics
✓ Employee capacity cards with allocation details
✓ Capacity forecasting for 3/6/12 months
✓ Real-time updates via WebSocket
✓ Filtering and sorting controls
✓ Performance optimized (<2 second load)
✓ All tests passing (>80% coverage)
```

## Key Calculations

### Utilization Percentage
```typescript
totalCapacity = employeeCount * 40 hours/week
allocatedCapacity = sum(crewAssignments.hoursPerWeek)
utilization = (allocatedCapacity / totalCapacity) * 100
```

### Capacity Gap
```typescript
capacityGap = requiredCapacity - availableCapacity
// Positive gap = need more capacity (hiring)
// Negative gap = excess capacity (opportunity)
```

### Forecast Calculation
```typescript
// Based on awarded + quoted projects (weighted by probability)
forecastedDemand = sum(awardedProjects.laborHours) +
                   sum(quotedProjects.laborHours * winProbability)
```

### Color Thresholds
```typescript
const COLOR_THRESHOLDS = {
  underutilized: { max: 70, color: '#10B981' },   // Green
  optimal: { min: 70, max: 90, color: '#F59E0B' }, // Yellow
  high: { min: 90, max: 110, color: '#F97316' },   // Orange
  overallocated: { min: 110, color: '#EF4444' }    // Red
}
```

## Related PRPs
- Depends on: PRP-005 (Capacity Management), PRP-024 (WebSocket Real-time)
- Related: PRP-021 (Gantt Chart), PRP-027 (Reporting Engine)
- Blocks: None (can be implemented independently)

## Estimated Time
10-12 hours

## Notes
- Target utilization is typically 80-85% (allows for flexibility)
- 100% utilization is actually concerning (no buffer for changes)
- Consider vacation, holidays, training in capacity calculations
- Overtime should be tracked separately (flag if >5% of total)
- Include bench time (employees not on projects) in metrics
- Consider skill matching (not just hours available)
- Factor in ramp-up time for new employees (50% capacity first month)
- Show both billable and non-billable capacity
- Consider implementing capacity planning AI (ML-based forecasting)
- Cache heatmap calculations (15-minute TTL)
- Use Redis for real-time capacity updates
- Support CSV export of capacity data
- Add notifications when division exceeds capacity

## Rollback Plan
If validation fails:
1. Verify database migration for CapacitySnapshot model
2. Check capacity calculation formulas
3. Test with small dataset first (10 employees)
4. Verify heatmap rendering with sample data
5. Check chart library integration (Chart.js or Recharts)
6. Test WebSocket connection for real-time updates
7. Review filter logic independently
8. Check API endpoint responses
9. Test performance with Chrome DevTools
10. Verify color threshold calculations
