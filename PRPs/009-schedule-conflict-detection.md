# PRP-009: Schedule Conflict Detection

## Status
🔲 Not Started

## Priority
P1 - High

## Objective
Build comprehensive scheduling conflict detection system with double-booking prevention, capacity validation, real-time conflict alerts, and automated resolution suggestions.

## Scope

### Files to Create
- `src/services/scheduling/ConflictDetectionService.ts` - Main conflict detection logic
- `src/services/scheduling/CapacityValidator.ts` - Capacity validation
- `src/services/scheduling/DoubleBookingDetector.ts` - Double-booking detection
- `src/services/scheduling/ConflictResolver.ts` - Resolution suggestions
- `src/app/api/scheduling/conflicts/route.ts` - List all conflicts
- `src/app/api/scheduling/validate/route.ts` - Validate assignment before creation
- `src/app/api/scheduling/resolve/route.ts` - Get resolution suggestions
- `src/hooks/useConflictDetection.ts` - React Query hooks
- `src/components/scheduling/ConflictPanel.tsx` - Conflict display panel
- `src/components/scheduling/ConflictBadge.tsx` - Conflict indicator
- `src/components/scheduling/ResolutionSuggestions.tsx` - Resolution UI
- `src/components/scheduling/CapacityGauge.tsx` - Capacity visualization
- `src/components/scheduling/ScheduleValidator.tsx` - Pre-assignment validation
- `tests/unit/services/ConflictDetectionService.test.ts` - Service tests
- `tests/unit/services/CapacityValidator.test.ts` - Capacity tests
- `tests/unit/services/DoubleBookingDetector.test.ts` - Double-booking tests
- `tests/unit/services/ConflictResolver.test.ts` - Resolver tests
- `tests/integration/api/scheduling.test.ts` - API tests
- `tests/e2e/conflict-detection.spec.ts` - E2E tests

### Conflict Types to Detect
```typescript
enum ConflictType {
  DOUBLE_BOOKING = 'DOUBLE_BOOKING',           // Employee assigned to multiple phases same day
  OVER_CAPACITY = 'OVER_CAPACITY',             // Division capacity exceeded
  MISSING_FOREMAN = 'MISSING_FOREMAN',         // Phase requires foreman, none assigned
  INSUFFICIENT_CREW = 'INSUFFICIENT_CREW',     // Crew size below phase requirements
  SKILL_MISMATCH = 'SKILL_MISMATCH',          // Employee lacks required skills
  DIVISION_MISMATCH = 'DIVISION_MISMATCH',     // Employee division != phase division
  HOURS_EXCEEDED = 'HOURS_EXCEEDED',           // Employee weekly hours > maxHoursPerWeek
  UNAVAILABLE = 'UNAVAILABLE',                 // Employee outside availability dates
  MULTIPLE_LEADS = 'MULTIPLE_LEADS',           // Multiple leads on same phase same day
  OVERLAPPING_PHASES = 'OVERLAPPING_PHASES'    // Phase dates conflict with dependencies
}

enum ConflictSeverity {
  LOW = 'LOW',           // Warning, can proceed
  MEDIUM = 'MEDIUM',     // Should be resolved
  HIGH = 'HIGH',         // Strongly recommend fixing
  CRITICAL = 'CRITICAL'  // Must be resolved before proceeding
}
```

## Implementation Steps

1. **Build Conflict Detection Service**
   - Scan all assignments for conflicts
   - Run validation checks on new assignments
   - Calculate conflict severity based on business rules
   - Generate conflict descriptions
   - Track conflict history
   - Cache conflict results for performance

2. **Implement Double-Booking Detector**
   - Check if employee assigned to multiple phases same day
   - Account for partial day assignments (hours)
   - Detect overlapping time ranges
   - Consider travel time between phases
   - Generate alternate employee suggestions
   - Calculate impact on affected phases

3. **Create Capacity Validator**
   - Calculate total division capacity by date
   - Track available vs. scheduled hours
   - Validate against utilization thresholds (>100% = overbooked)
   - Forecast capacity deficits
   - Generate capacity reports by division/week
   - Recommend hiring or contractor needs

4. **Build Conflict Resolver**
   - Generate resolution suggestions for each conflict type
   - Suggest alternate employees (same role, available)
   - Suggest alternate dates (when employee available)
   - Suggest crew size adjustments
   - Calculate cost impact of resolutions
   - Prioritize suggestions by feasibility

5. **Create API Routes**
   - GET /api/scheduling/conflicts - List all active conflicts
   - GET /api/scheduling/conflicts/:type - Filter by conflict type
   - POST /api/scheduling/validate - Validate assignment before creation
   - POST /api/scheduling/resolve - Get resolution suggestions
   - GET /api/scheduling/capacity - Get division capacity report
   - GET /api/scheduling/conflicts/employee/:id - Employee-specific conflicts
   - GET /api/scheduling/conflicts/phase/:id - Phase-specific conflicts

6. **Build React Components**
   - ConflictPanel with grouped conflicts
   - ConflictBadge with severity color coding
   - ResolutionSuggestions with one-click apply
   - CapacityGauge with visual indicators
   - ScheduleValidator with real-time feedback
   - ConflictTimeline showing conflict evolution
   - Auto-refresh when assignments change

7. **Implement Real-Time Alerts**
   - Detect conflicts when creating/updating assignments
   - Show warnings before saving
   - Allow override for LOW severity (with confirmation)
   - Block save for CRITICAL conflicts
   - Send notifications to affected users
   - Track conflict resolution in audit log

## Acceptance Criteria

- [ ] Double-booking is detected when employee assigned to overlapping phases
- [ ] Division capacity is validated against available workforce
- [ ] Missing foreman assignments are flagged on phases that require them
- [ ] Insufficient crew size is detected (actual < required)
- [ ] Employee skill mismatches are identified
- [ ] Division mismatches are prevented
- [ ] Employee weekly hours limits are enforced
- [ ] Employee availability dates are checked
- [ ] Multiple lead assignments are prevented
- [ ] Overlapping phase dependencies are detected
- [ ] Conflict severity is calculated correctly
- [ ] Resolution suggestions are generated for all conflict types
- [ ] Users can validate assignments before creating them
- [ ] Conflicts are displayed in real-time on scheduling UI
- [ ] All conflict detection tests pass (unit, integration, E2E)

## Validation Steps

```bash
# 1. Start dev server
npm run dev

# 2. Test double-booking detection
curl -X POST http://localhost:3000/api/scheduling/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phaseId": "phase-1-uuid",
    "employeeId": "employee-1-uuid",
    "assignmentDate": "2024-02-05T00:00:00Z",
    "hoursAllocated": 8
  }'
# Should return conflict if employee already assigned that day

# 3. Test capacity validation
curl -X GET "http://localhost:3000/api/scheduling/capacity?division=PLUMBING_MULTIFAMILY&date=2024-02-05" \
  -H "Authorization: Bearer $TOKEN"
# Should return capacity percentage and available hours

# 4. Test conflict listing
curl -X GET http://localhost:3000/api/scheduling/conflicts \
  -H "Authorization: Bearer $TOKEN"
# Should return all active conflicts

# 5. Test conflict filtering
curl -X GET "http://localhost:3000/api/scheduling/conflicts?type=DOUBLE_BOOKING&severity=CRITICAL" \
  -H "Authorization: Bearer $TOKEN"
# Should return filtered conflicts

# 6. Test resolution suggestions
curl -X POST http://localhost:3000/api/scheduling/resolve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conflictType": "DOUBLE_BOOKING",
    "phaseId": "phase-1-uuid",
    "employeeId": "employee-1-uuid",
    "assignmentDate": "2024-02-05T00:00:00Z"
  }'
# Should return alternate employees or dates

# 7. Test employee-specific conflicts
curl -X GET http://localhost:3000/api/scheduling/conflicts/employee/employee-1-uuid \
  -H "Authorization: Bearer $TOKEN"
# Should return conflicts for specific employee

# 8. Run unit tests
npm run test -- tests/unit/services/ConflictDetectionService.test.ts
npm run test -- tests/unit/services/CapacityValidator.test.ts
npm run test -- tests/unit/services/DoubleBookingDetector.test.ts
npm run test -- tests/unit/services/ConflictResolver.test.ts
# All tests should pass

# 9. Run integration tests
npm run test:ci -- tests/integration/api/scheduling.test.ts
# All API tests should pass

# 10. Run E2E tests
npm run test:e2e -- tests/e2e/conflict-detection.spec.ts
# Conflict detection and resolution flows pass
```

## Expected Output

```
✓ Double-booking detection works correctly
✓ Capacity validation calculates correctly
✓ Missing foreman flagged on required phases
✓ Insufficient crew detected
✓ Skill mismatches identified
✓ Division mismatches prevented
✓ Weekly hours limits enforced
✓ Availability dates checked
✓ Multiple leads prevented
✓ Overlapping phases detected
✓ Conflict severity calculated correctly
✓ Resolution suggestions generated
✓ All conflict detection tests passing (52/52)
```

## Conflict Detection Rules

```typescript
const ConflictRules = {
  DOUBLE_BOOKING: {
    severity: 'CRITICAL',
    check: (employee, date) => {
      const assignments = getAssignmentsByEmployeeAndDate(employee, date);
      return assignments.length > 1;
    },
    resolution: ['Suggest alternate employee', 'Suggest alternate date', 'Split hours'],
    allowOverride: false
  },

  OVER_CAPACITY: {
    severity: 'HIGH',
    check: (division, date) => {
      const utilization = calculateUtilization(division, date);
      return utilization > 100;
    },
    resolution: ['Hire contractor', 'Reschedule phases', 'Extend timeline'],
    allowOverride: false
  },

  MISSING_FOREMAN: {
    severity: 'HIGH',
    check: (phase) => {
      const foreman = getForeman(phase);
      return phase.requiredForeman && !foreman;
    },
    resolution: ['Assign available foreman', 'Delay phase start'],
    allowOverride: false
  },

  INSUFFICIENT_CREW: {
    severity: 'MEDIUM',
    check: (phase) => {
      const crew = getCrew(phase);
      return crew.length < phase.requiredCrewSize;
    },
    resolution: ['Assign more employees', 'Adjust crew requirements'],
    allowOverride: true
  },

  HOURS_EXCEEDED: {
    severity: 'MEDIUM',
    check: (employee, week) => {
      const totalHours = calculateWeeklyHours(employee, week);
      return totalHours > employee.maxHoursPerWeek;
    },
    resolution: ['Reduce hours', 'Assign alternate employee', 'Approve overtime'],
    allowOverride: true
  }
};
```

## Resolution Strategies

```typescript
interface ResolutionSuggestion {
  type: 'ALTERNATE_EMPLOYEE' | 'ALTERNATE_DATE' | 'ADJUST_HOURS' | 'SPLIT_ASSIGNMENT';
  description: string;
  employeeId?: string;
  alternateDate?: Date;
  adjustedHours?: number;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  autoApplicable: boolean;
}

const ResolutionStrategies = {
  DOUBLE_BOOKING: [
    {
      type: 'ALTERNATE_EMPLOYEE',
      description: 'Assign available employee with same role',
      query: () => findAvailableEmployees(role, division, date),
      autoApplicable: true
    },
    {
      type: 'ALTERNATE_DATE',
      description: 'Move assignment to next available date',
      query: () => findNextAvailableDate(employee, phase),
      autoApplicable: false
    }
  ],

  OVER_CAPACITY: [
    {
      type: 'HIRE_CONTRACTOR',
      description: 'Suggest hiring contractor for overflow',
      query: () => calculateContractorNeed(division, week),
      autoApplicable: false
    },
    {
      type: 'RESCHEDULE',
      description: 'Reschedule low-priority phases',
      query: () => findReschedulablePha ses(division, week),
      autoApplicable: false
    }
  ]
};
```

## Related PRPs
- Depends on: PRP-005 (Employee Management), PRP-007 (Project Phases), PRP-008 (Crew Assignments)
- Blocks: PRP-013 (Capacity Calculator), PRP-015 (Alert System)

## Estimated Time
6-7 hours

## Notes
- Conflict detection should run automatically on every assignment create/update
- Cache conflict results for 5 minutes to reduce database load
- Consider batch conflict detection for performance (run nightly)
- Resolution suggestions should be ranked by feasibility
- Track conflict resolution history for analytics
- Generate weekly conflict reports for management
- Consider machine learning for better resolution suggestions (future)

## Rollback Plan
If validation fails:
1. Verify conflict detection rules match business requirements
2. Test each conflict type independently
3. Check resolution suggestion logic
4. Verify capacity calculation formulas
5. Test severity assignment logic
6. Check performance with large datasets (1000+ assignments)
7. Disable conflict detection service if blocking operations
