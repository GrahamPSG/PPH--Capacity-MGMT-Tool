# PRP-008: Crew Assignments

## Status
🔲 Not Started

## Priority
P1 - High

## Objective
Implement crew assignment system with employee-to-phase mapping, hours allocation tracking, lead designation, validation against employee availability, and actual hours worked recording.

## Scope

### Files to Create
- `prisma/migrations/XXX_add_crew_assignment_model.sql` - CrewAssignment table migration
- `src/app/api/assignments/route.ts` - List assignments
- `src/app/api/assignments/[id]/route.ts` - Get, update, delete assignment
- `src/app/api/phases/[id]/assignments/route.ts` - Get/create assignments for phase
- `src/app/api/employees/[id]/assignments/route.ts` - Get employee assignments
- `src/services/assignments/AssignmentService.ts` - Assignment business logic
- `src/services/assignments/AssignmentValidator.ts` - Assignment validation
- `src/services/assignments/ConflictDetector.ts` - Scheduling conflict detection
- `src/services/assignments/HoursCalculator.ts` - Hours calculations
- `src/hooks/useAssignments.ts` - React Query hooks
- `src/components/assignments/AssignmentList.tsx` - Assignment list
- `src/components/assignments/AssignmentForm.tsx` - Create/edit form
- `src/components/assignments/CrewBuilder.tsx` - Drag-and-drop crew builder
- `src/components/assignments/EmployeeSelector.tsx` - Employee selection UI
- `src/components/assignments/HoursTracker.tsx` - Hours tracking UI
- `tests/unit/services/AssignmentService.test.ts` - Service tests
- `tests/unit/services/ConflictDetector.test.ts` - Conflict detection tests
- `tests/unit/services/HoursCalculator.test.ts` - Hours calculation tests
- `tests/integration/api/assignments.test.ts` - API tests
- `tests/e2e/crew-assignment.spec.ts` - E2E tests

### Database Schema Updates
```typescript
// From spec.md - CrewAssignment model
model CrewAssignment {
  id                 String       @id @default(uuid())
  phaseId            String
  employeeId         String
  assignmentDate     DateTime
  hoursAllocated     Float
  actualHoursWorked  Float?
  role               EmployeeType
  isLead             Boolean      @default(false)
  notes              String?
  createdAt          DateTime     @default(now())
  createdBy          String

  phase              ProjectPhase @relation(fields: [phaseId], references: [id])
  employee           Employee     @relation(fields: [employeeId], references: [id])

  @@unique([phaseId, employeeId, assignmentDate])
}
```

## Implementation Steps

1. **Create Database Migration**
   - Add CrewAssignment model to Prisma schema
   - Add foreign keys to ProjectPhase and Employee
   - Add unique constraint (phase + employee + date)
   - Generate and run migration
   - Create seed data (500 assignments across phases)
   - Add indexes on phaseId, employeeId, assignmentDate

2. **Implement Assignment Service Layer**
   - CRUD operations with validation
   - Validate employee exists and is active
   - Validate phase exists and is not completed
   - Validate employee role matches assignment role
   - Check employee availability dates
   - Calculate hours allocated vs. available
   - Track actual hours worked
   - Lead assignment validation (one lead per phase per day)

3. **Build Conflict Detector**
   - Check for double-booking (same employee, overlapping dates)
   - Validate hours don't exceed employee maxHoursPerWeek
   - Check division matching (employee vs. phase)
   - Validate role requirements (foreman, journeyman, apprentice)
   - Generate conflict warnings before assignment
   - Return detailed conflict information

4. **Create Hours Calculator**
   - Calculate total hours allocated per employee per week
   - Calculate remaining capacity per employee
   - Track actual vs. allocated hours variance
   - Calculate phase labor costs (hours × rates)
   - Generate utilization reports
   - Calculate overtime hours (>40/week)

5. **Build API Routes**
   - GET /api/phases/:id/assignments - List assignments for phase
   - POST /api/phases/:id/assignments - Create assignment with validation
   - GET /api/employees/:id/assignments - List employee assignments
   - GET /api/assignments/:id - Get assignment details
   - PUT /api/assignments/:id - Update assignment (hours, actual hours)
   - DELETE /api/assignments/:id - Delete assignment
   - POST /api/assignments/validate - Validate assignment before creation
   - GET /api/assignments?startDate=X&endDate=Y - List by date range

6. **Build React Components**
   - AssignmentList with calendar view
   - AssignmentForm with conflict warnings
   - CrewBuilder with drag-and-drop from employee pool
   - EmployeeSelector with filtering and availability
   - HoursTracker with daily/weekly entry
   - ConflictIndicator with resolution suggestions
   - Lead badge indicator

7. **Implement React Query Hooks**
   - usePhaseAssignments(phaseId) - List assignments for phase
   - useEmployeeAssignments(employeeId) - List employee assignments
   - useCreateAssignment() - Create mutation with validation
   - useUpdateAssignment() - Update mutation
   - useDeleteAssignment() - Delete mutation
   - useValidateAssignment() - Validation query
   - useEmployeeAvailability(employeeId, dateRange) - Availability check

## Acceptance Criteria

- [ ] Crew assignments can be created for phases
- [ ] Employees can be assigned to multiple phases (if no conflicts)
- [ ] Assignment dates must fall within phase dates
- [ ] Employee role must match assignment role requirement
- [ ] Hours allocated are tracked per assignment
- [ ] Actual hours worked can be recorded
- [ ] Only one lead can be assigned per phase per day
- [ ] Double-booking is detected and prevented
- [ ] Employee max hours per week is validated
- [ ] Division matching is enforced (employee vs. phase)
- [ ] Employee availability dates are checked
- [ ] Assignment list filters by date range, phase, employee
- [ ] Hours calculator shows utilization per employee
- [ ] All assignment tests pass (unit, integration, E2E)
- [ ] Audit trail tracks all assignment changes

## Validation Steps

```bash
# 1. Run database migration
npx prisma migrate dev --name add_crew_assignment_model

# 2. Verify migration
npx prisma studio
# Check CrewAssignment table with foreign keys

# 3. Seed test assignments
npx prisma db seed
# Should create 500 assignments across phases

# 4. Start dev server
npm run dev

# 5. Test assignment creation
curl -X POST http://localhost:3000/api/phases/phase-1-uuid/assignments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "employee-1-uuid",
    "assignmentDate": "2024-02-05T00:00:00Z",
    "hoursAllocated": 8,
    "role": "JOURNEYMAN",
    "isLead": false
  }'
# Should create assignment

# 6. Test conflict detection
curl -X POST http://localhost:3000/api/assignments/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phaseId": "phase-2-uuid",
    "employeeId": "employee-1-uuid",
    "assignmentDate": "2024-02-05T00:00:00Z",
    "hoursAllocated": 8
  }'
# Should return conflict warning (double-booking)

# 7. Test lead assignment validation
curl -X POST http://localhost:3000/api/phases/phase-1-uuid/assignments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "employee-2-uuid",
    "assignmentDate": "2024-02-05T00:00:00Z",
    "hoursAllocated": 8,
    "role": "FOREMAN",
    "isLead": true
  }'
# Should create lead assignment

curl -X POST http://localhost:3000/api/phases/phase-1-uuid/assignments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "employee-3-uuid",
    "assignmentDate": "2024-02-05T00:00:00Z",
    "hoursAllocated": 8,
    "role": "FOREMAN",
    "isLead": true
  }'
# Should return error (only one lead per phase per day)

# 8. Test actual hours tracking
curl -X PUT http://localhost:3000/api/assignments/assignment-1-uuid \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"actualHoursWorked": 8.5}'
# Should update actual hours

# 9. Run unit tests
npm run test -- tests/unit/services/AssignmentService.test.ts
npm run test -- tests/unit/services/ConflictDetector.test.ts
npm run test -- tests/unit/services/HoursCalculator.test.ts
# All tests should pass

# 10. Run integration tests
npm run test:ci -- tests/integration/api/assignments.test.ts
# All API tests should pass

# 11. Run E2E tests
npm run test:e2e -- tests/e2e/crew-assignment.spec.ts
# Assignment creation and conflict detection flows pass
```

## Expected Output

```
✓ CrewAssignment model created and migrated
✓ 500 test assignments seeded across phases
✓ POST /api/phases/:id/assignments creates assignment
✓ Double-booking detected and prevented
✓ Lead assignment validated (one per phase per day)
✓ Employee role matching validated
✓ Hours allocated vs. max hours validated
✓ Division matching enforced
✓ Actual hours can be tracked
✓ Conflict warnings provide resolution suggestions
✓ All assignment tests passing (45/45)
```

## Conflict Detection Rules

```typescript
const ConflictRules = {
  DOUBLE_BOOKING: {
    check: 'Same employee assigned to multiple phases on same date',
    severity: 'HIGH',
    resolution: 'Choose different date or different employee'
  },
  MAX_HOURS_EXCEEDED: {
    check: 'Total weekly hours > employee maxHoursPerWeek',
    severity: 'MEDIUM',
    resolution: 'Reduce hours or assign different employee'
  },
  DIVISION_MISMATCH: {
    check: 'Employee division != phase division',
    severity: 'HIGH',
    resolution: 'Assign employee from matching division'
  },
  ROLE_MISMATCH: {
    check: 'Employee type != assignment role',
    severity: 'HIGH',
    resolution: 'Assign employee with correct role'
  },
  UNAVAILABLE: {
    check: 'Assignment date outside employee availability',
    severity: 'CRITICAL',
    resolution: 'Employee not available on this date'
  },
  MULTIPLE_LEADS: {
    check: 'More than one lead assigned to phase on same date',
    severity: 'HIGH',
    resolution: 'Only one lead allowed per phase per day'
  }
};
```

## Related PRPs
- Depends on: PRP-005 (Employee Management), PRP-007 (Project Phases)
- Blocks: PRP-009 (Schedule Conflict Detection), PRP-013 (Capacity Calculator), PRP-014 (Labor Forecast)

## Estimated Time
6-7 hours

## Notes
- Assignment dates should default to phase start date
- Hours allocated should default to 8 hours/day
- Lead assignment should auto-set role to FOREMAN
- Consider bulk assignment creation for entire phase duration
- Track assignment creation source (manual vs. auto-scheduled)
- Generate alerts when actual hours significantly differ from allocated
- Support recurring assignments (e.g., same crew for entire phase)

## Rollback Plan
If validation fails:
1. Verify CrewAssignment model matches spec.md interface
2. Check foreign key relationships to Phase and Employee
3. Test conflict detection logic thoroughly
4. Verify hours calculation formulas
5. Check unique constraint enforcement
6. Test lead assignment validation
7. Revert migration: `npx prisma migrate reset`
