# PRP-013: Capacity Calculator

## Status
🔲 Not Started

## Priority
P0 - Critical

## Objective
Build comprehensive capacity calculation engine for analyzing labor utilization, forecasting capacity needs, generating snapshots, and providing division-level capacity insights.

## Scope

### Files to Create
- `prisma/migrations/XXX_add_capacity_snapshot_model.sql` - CapacitySnapshot table migration
- `src/services/capacity/CapacityCalculator.ts` - Main capacity calculation engine
- `src/services/capacity/UtilizationCalculator.ts` - Utilization percentage calculations
- `src/services/capacity/SnapshotGenerator.ts` - Capacity snapshot generation
- `src/services/capacity/DivisionAnalyzer.ts` - Division-level analysis
- `src/services/capacity/CriticalProjectDetector.ts` - Detect projects needing attention
- `src/app/api/capacity/current/route.ts` - Get current capacity
- `src/app/api/capacity/snapshot/route.ts` - Generate capacity snapshot
- `src/app/api/capacity/utilization/route.ts` - Get utilization report
- `src/app/api/capacity/division/[division]/route.ts` - Division-specific capacity
- `src/app/api/capacity/history/route.ts` - Historical capacity data
- `src/hooks/useCapacity.ts` - React Query hooks
- `src/components/capacity/CapacityDashboard.tsx` - Main capacity dashboard
- `src/components/capacity/UtilizationChart.tsx` - Utilization visualization
- `src/components/capacity/DivisionBreakdown.tsx` - Division breakdown
- `src/components/capacity/CapacityGauge.tsx` - Capacity gauge indicator
- `src/components/capacity/CriticalProjects.tsx` - Critical projects list
- `src/components/capacity/HistoricalTrends.tsx` - Historical trends chart
- `tests/unit/services/CapacityCalculator.test.ts` - Calculator tests
- `tests/unit/services/UtilizationCalculator.test.ts` - Utilization tests
- `tests/unit/services/SnapshotGenerator.test.ts` - Snapshot tests
- `tests/integration/api/capacity.test.ts` - API tests
- `tests/e2e/capacity-dashboard.spec.ts` - E2E tests

### Database Schema Updates
```typescript
// From spec.md - CapacitySnapshot model
model CapacitySnapshot {
  id                    String   @id @default(uuid())
  date                  DateTime
  division              Division
  totalEmployees        Int
  availableHours        Float
  scheduledHours        Float
  utilizationPercentage Float
  foremanCount          Int
  journeymanCount       Int
  apprenticeCount       Int
  projectCount          Int
  criticalProjects      String[] // Project IDs
  generatedAt           DateTime @default(now())

  @@unique([date, division])
}
```

## Implementation Steps

1. **Create Database Migration**
   - Add CapacitySnapshot model to Prisma schema
   - Generate and run migration
   - Add indexes on date, division, generatedAt
   - Set up automatic snapshot generation (daily)

2. **Build Capacity Calculator**
   - Calculate total employee hours by division
   - Factor in employee maxHoursPerWeek
   - Factor in employee availability dates
   - Calculate scheduled hours from crew assignments
   - Calculate available hours (total - scheduled)
   - Calculate utilization percentage
   - Break down by employee type (foreman, journeyman, apprentice)

3. **Implement Utilization Calculator**
   - Calculate utilization percentage per division
   - Calculate utilization by employee type
   - Calculate utilization by date range (week, month)
   - Identify over-utilized divisions (>100%)
   - Identify under-utilized divisions (<70%)
   - Generate utilization trends over time

4. **Create Snapshot Generator**
   - Generate daily capacity snapshots
   - Capture division-level metrics
   - Identify critical projects (high priority, low capacity)
   - Store snapshot in database
   - Archive old snapshots (>6 months)
   - Run nightly via cron job

5. **Build Division Analyzer**
   - Analyze capacity by division
   - Compare divisions (utilization, headcount)
   - Identify bottleneck divisions
   - Recommend resource allocation
   - Generate division reports
   - Track division trends over time

6. **Implement Critical Project Detector**
   - Detect projects with insufficient crew assignments
   - Detect projects exceeding capacity
   - Detect projects with missing foreman
   - Detect projects delayed due to capacity
   - Prioritize critical projects
   - Generate actionable recommendations

7. **Build API Routes**
   - GET /api/capacity/current - Current capacity all divisions
   - GET /api/capacity/current?division=X - Division-specific
   - POST /api/capacity/snapshot - Generate snapshot on-demand
   - GET /api/capacity/utilization?startDate=X&endDate=Y - Utilization report
   - GET /api/capacity/division/:division - Division analysis
   - GET /api/capacity/history?division=X&days=90 - Historical data
   - GET /api/capacity/critical-projects - Projects needing attention

8. **Build React Components**
   - CapacityDashboard with key metrics
   - UtilizationChart with Recharts
   - DivisionBreakdown with comparison
   - CapacityGauge with color coding
   - CriticalProjects with alerts
   - HistoricalTrends with line charts
   - Export capacity reports to PDF/Excel

## Acceptance Criteria

- [ ] CapacitySnapshot model is created and migrated
- [ ] Capacity calculator computes total employee hours by division
- [ ] Employee maxHoursPerWeek is factored into calculations
- [ ] Employee availability dates are factored in
- [ ] Scheduled hours are calculated from crew assignments
- [ ] Available hours = total hours - scheduled hours
- [ ] Utilization percentage = scheduled / total * 100
- [ ] Utilization is calculated by employee type
- [ ] Daily capacity snapshots are generated automatically
- [ ] Capacity dashboard displays current metrics
- [ ] Division-level analysis available
- [ ] Critical projects are identified and flagged
- [ ] Historical capacity trends are queryable
- [ ] Over/under-utilized divisions are detected
- [ ] All capacity tests pass (unit, integration, E2E)

## Validation Steps

```bash
# 1. Run database migration
npx prisma migrate dev --name add_capacity_snapshot_model

# 2. Verify migration
npx prisma studio
# Check CapacitySnapshot table

# 3. Test current capacity calculation
curl -X GET http://localhost:3000/api/capacity/current \
  -H "Authorization: Bearer $TOKEN"
# Should return current capacity for all divisions

# 4. Test division-specific capacity
curl -X GET "http://localhost:3000/api/capacity/current?division=PLUMBING_MULTIFAMILY" \
  -H "Authorization: Bearer $TOKEN"
# Should return capacity for that division

# 5. Generate snapshot on-demand
curl -X POST http://localhost:3000/api/capacity/snapshot \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date": "2024-02-05T00:00:00Z"}'
# Should create snapshot for that date

# 6. Test utilization report
curl -X GET "http://localhost:3000/api/capacity/utilization?startDate=2024-02-01&endDate=2024-02-29" \
  -H "Authorization: Bearer $TOKEN"
# Should return utilization by division for date range

# 7. Test division analysis
curl -X GET http://localhost:3000/api/capacity/division/PLUMBING_MULTIFAMILY \
  -H "Authorization: Bearer $TOKEN"
# Should return detailed division analysis

# 8. Test historical data
curl -X GET "http://localhost:3000/api/capacity/history?division=PLUMBING_MULTIFAMILY&days=90" \
  -H "Authorization: Bearer $TOKEN"
# Should return 90 days of snapshots

# 9. Test critical projects detection
curl -X GET http://localhost:3000/api/capacity/critical-projects \
  -H "Authorization: Bearer $TOKEN"
# Should return projects needing attention

# 10. Run unit tests
npm run test -- tests/unit/services/CapacityCalculator.test.ts
npm run test -- tests/unit/services/UtilizationCalculator.test.ts
npm run test -- tests/unit/services/SnapshotGenerator.test.ts
# All tests should pass

# 11. Run integration tests
npm run test:ci -- tests/integration/api/capacity.test.ts
# All API tests should pass

# 12. Run E2E tests
npm run test:e2e -- tests/e2e/capacity-dashboard.spec.ts
# Dashboard loads and displays correct data
```

## Expected Output

```
✓ CapacitySnapshot model created and migrated
✓ Current capacity calculated correctly
✓ Employee hours factored with maxHoursPerWeek
✓ Availability dates factored in
✓ Scheduled hours calculated from assignments
✓ Available hours computed correctly
✓ Utilization percentage accurate
✓ Employee type breakdown correct
✓ Daily snapshots generated automatically
✓ Division analysis working
✓ Critical projects detected
✓ Historical trends queryable
✓ All capacity tests passing (40/40)
```

## Capacity Calculation Formulas

```typescript
class CapacityCalculator {
  // Calculate total available hours for a division on a date
  calculateAvailableHours(division: Division, date: Date): number {
    const employees = this.getActiveEmployees(division, date);

    let totalHours = 0;
    for (const employee of employees) {
      // Check if employee available on this date
      if (this.isAvailable(employee, date)) {
        // Use maxHoursPerWeek, default 40
        const dailyHours = (employee.maxHoursPerWeek || 40) / 5; // Assuming 5-day week
        totalHours += dailyHours;
      }
    }

    return totalHours;
  }

  // Calculate scheduled hours for a division on a date
  calculateScheduledHours(division: Division, date: Date): number {
    const assignments = this.getAssignmentsByDivisionAndDate(division, date);

    return assignments.reduce((sum, assignment) => {
      return sum + assignment.hoursAllocated;
    }, 0);
  }

  // Calculate utilization percentage
  calculateUtilization(division: Division, date: Date): number {
    const available = this.calculateAvailableHours(division, date);
    const scheduled = this.calculateScheduledHours(division, date);

    if (available === 0) return 0;

    return (scheduled / available) * 100;
  }

  // Calculate weekly capacity
  calculateWeeklyCapacity(division: Division, weekStart: Date): CapacityReport {
    const weekDays = this.getWeekDays(weekStart);

    let totalAvailable = 0;
    let totalScheduled = 0;

    for (const day of weekDays) {
      totalAvailable += this.calculateAvailableHours(division, day);
      totalScheduled += this.calculateScheduledHours(division, day);
    }

    return {
      availableHours: totalAvailable,
      scheduledHours: totalScheduled,
      utilizationPercentage: (totalScheduled / totalAvailable) * 100
    };
  }
}
```

## Critical Project Detection

```typescript
interface CriticalProject {
  projectId: string;
  reason: CriticalReason;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
}

enum CriticalReason {
  INSUFFICIENT_CREW = 'Crew size below requirements',
  MISSING_FOREMAN = 'No foreman assigned',
  OVER_CAPACITY = 'Division capacity exceeded',
  DELAYED = 'Project behind schedule',
  UNDER_STAFFED = 'Not enough employees assigned'
}

class CriticalProjectDetector {
  detectCriticalProjects(division: Division, date: Date): CriticalProject[] {
    const projects = this.getActiveProjects(division);
    const critical: CriticalProject[] = [];

    for (const project of projects) {
      // Check for missing foreman
      if (!this.hasForeman(project, date)) {
        critical.push({
          projectId: project.id,
          reason: CriticalReason.MISSING_FOREMAN,
          severity: 'HIGH',
          recommendation: 'Assign available foreman immediately'
        });
      }

      // Check for insufficient crew
      const phase = this.getCurrentPhase(project, date);
      if (phase) {
        const assignedCrew = this.getCrewSize(phase, date);
        if (assignedCrew < phase.requiredCrewSize) {
          critical.push({
            projectId: project.id,
            reason: CriticalReason.INSUFFICIENT_CREW,
            severity: 'MEDIUM',
            recommendation: `Assign ${phase.requiredCrewSize - assignedCrew} more employees`
          });
        }
      }
    }

    return critical;
  }
}
```

## Utilization Thresholds

```typescript
const UtilizationThresholds = {
  UNDER_UTILIZED: 70,   // < 70% - Look for more work
  OPTIMAL: 85,          // 70-85% - Ideal utilization
  HIGH: 95,             // 85-95% - Monitor closely
  OVER_UTILIZED: 100,   // 95-100% - At capacity
  CRITICAL: 110         // > 100% - Overbooked, need action
};

function getUtilizationStatus(percentage: number): string {
  if (percentage < 70) return 'Under-Utilized';
  if (percentage < 85) return 'Optimal';
  if (percentage < 95) return 'High Utilization';
  if (percentage <= 100) return 'At Capacity';
  return 'Over-Capacity (Critical)';
}
```

## Related PRPs
- Depends on: PRP-005 (Employee Management), PRP-007 (Project Phases), PRP-008 (Crew Assignments)
- Blocks: PRP-014 (Labor Forecast)

## Estimated Time
7-8 hours

## Notes
- Capacity calculations should run in background to avoid blocking UI
- Cache capacity results for 5 minutes to reduce database load
- Generate snapshots nightly at midnight
- Archive snapshots older than 6 months to separate table
- Utilization over 100% indicates overbooking
- Utilization under 70% indicates underutilization
- Consider factoring in PTO/vacation days (future)
- Track capacity trends to predict hiring needs
- Export capacity reports to Excel for management

## Rollback Plan
If validation fails:
1. Verify CapacitySnapshot model matches spec.md interface
2. Check capacity calculation formulas
3. Test with known employee/assignment data
4. Verify utilization percentage calculations
5. Check snapshot generation cron job
6. Test critical project detection logic
7. Revert migration: `npx prisma migrate reset`
