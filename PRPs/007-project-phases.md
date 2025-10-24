# PRP-007: Project Phases

## Status
🔲 Not Started

## Priority
P0 - Critical

## Objective
Implement project phase management with dependency tracking, progress monitoring, crew requirements, labor hour calculations, and Monday.com group synchronization.

## Scope

### Files to Create
- `prisma/migrations/XXX_add_project_phase_model.sql` - ProjectPhase table migration
- `src/app/api/phases/route.ts` - List phases
- `src/app/api/phases/[id]/route.ts` - Get, update, delete phase
- `src/app/api/phases/[id]/progress/route.ts` - Update phase progress
- `src/app/api/projects/[id]/phases/route.ts` - Get/create phases for project
- `src/services/phases/PhaseService.ts` - Phase business logic
- `src/services/phases/PhaseValidator.ts` - Phase validation
- `src/services/phases/DependencyResolver.ts` - Phase dependency logic
- `src/services/phases/ProgressCalculator.ts` - Progress calculations
- `src/hooks/usePhases.ts` - React Query hooks
- `src/components/phases/PhaseList.tsx` - Phase list component
- `src/components/phases/PhaseForm.tsx` - Create/edit form
- `src/components/phases/PhaseTimeline.tsx` - Visual timeline
- `src/components/phases/DependencyGraph.tsx` - Dependency visualization
- `src/components/phases/ProgressTracker.tsx` - Progress indicator
- `src/components/phases/CrewRequirements.tsx` - Crew requirements UI
- `tests/unit/services/PhaseService.test.ts` - Service tests
- `tests/unit/services/DependencyResolver.test.ts` - Dependency tests
- `tests/unit/services/ProgressCalculator.test.ts` - Progress tests
- `tests/integration/api/phases.test.ts` - API tests
- `tests/e2e/phase-management.spec.ts` - E2E tests

### Database Schema Updates
```typescript
// From spec.md - ProjectPhase model
model ProjectPhase {
  id                  String      @id @default(uuid())
  projectId           String
  phaseNumber         Int
  name                String
  division            Division
  startDate           DateTime
  endDate             DateTime
  actualStartDate     DateTime?
  actualEndDate       DateTime?
  duration            Int         // days
  progressPercentage  Float       @default(0)
  requiredCrewSize    Int
  requiredForeman     Boolean     @default(true)
  requiredJourneymen  Int
  requiredApprentices Int
  laborHours          Float
  status              PhaseStatus
  dependencies        String[]    // Phase IDs
  mondayGroupId       String?
  lastUpdated         DateTime    @updatedAt
  updatedBy           String

  @@unique([projectId, phaseNumber])
}

enum PhaseStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  DELAYED
  BLOCKED
}
```

## Implementation Steps

1. **Create Database Migration**
   - Add ProjectPhase model to Prisma schema
   - Add PhaseStatus enum
   - Add foreign key to Project
   - Generate and run migration
   - Create seed data (150 phases across projects)
   - Add indexes on projectId, status, startDate

2. **Implement Phase Service Layer**
   - CRUD operations with validation
   - Phase numbering within project (auto-increment)
   - Dependency validation (no circular dependencies)
   - Progress percentage calculations
   - Crew requirements validation
   - Labor hours calculations
   - Status updates with business rules

3. **Build Dependency Resolver**
   - Validate phase dependencies (must be same project)
   - Detect circular dependencies
   - Calculate critical path
   - Determine phase start constraints
   - Auto-update dependent phase dates
   - Generate dependency graph data

4. **Create Progress Calculator**
   - Calculate phase progress from crew assignments
   - Factor in actual hours worked vs. estimated
   - Update project overall progress
   - Detect delays (actual vs. planned)
   - Calculate completion forecast
   - Generate progress reports

5. **Build API Routes**
   - GET /api/projects/:id/phases - List phases for project
   - POST /api/projects/:id/phases - Create phase with validation
   - GET /api/phases/:id - Get phase details
   - PUT /api/phases/:id - Update phase
   - DELETE /api/phases/:id - Delete phase (cascade check)
   - PUT /api/phases/:id/progress - Update progress percentage
   - GET /api/phases/:id/dependencies - Get dependency graph
   - Validate phase dates against project dates

6. **Build React Components**
   - PhaseList with timeline view
   - PhaseForm with dependency selector
   - PhaseTimeline with Gantt chart
   - DependencyGraph with D3.js visualization
   - ProgressTracker with percentage indicator
   - CrewRequirements with role breakdown
   - Drag-and-drop phase reordering

7. **Implement React Query Hooks**
   - useProjectPhases(projectId) - List phases for project
   - usePhase(id) - Single phase
   - useCreatePhase() - Create mutation
   - useUpdatePhase() - Update mutation
   - useDeletePhase() - Delete mutation
   - useUpdateProgress(id) - Progress mutation
   - Cache invalidation on mutations

## Acceptance Criteria

- [ ] Phases can be created for projects
- [ ] Phase numbers are unique within a project
- [ ] Phases can have dependencies on other phases (same project)
- [ ] Circular dependencies are detected and prevented
- [ ] Phase dates must fall within project dates
- [ ] Phase duration is calculated from start/end dates
- [ ] Crew requirements specify foreman, journeymen, apprentices
- [ ] Labor hours are calculated from crew size and duration
- [ ] Progress percentage can be updated (0-100)
- [ ] Phase status follows lifecycle rules
- [ ] Dependent phases are auto-updated when dates change
- [ ] Critical path is calculated correctly
- [ ] Phase deletion checks for dependencies
- [ ] Monday.com group ID can be stored for sync
- [ ] All phase tests pass (unit, integration, E2E)

## Validation Steps

```bash
# 1. Run database migration
npx prisma migrate dev --name add_project_phase_model

# 2. Verify migration
npx prisma studio
# Check ProjectPhase table with all fields

# 3. Seed test phases
npx prisma db seed
# Should create 150 phases across 30 projects

# 4. Start dev server
npm run dev

# 5. Test phase creation
curl -X POST http://localhost:3000/api/projects/PRJ-001/phases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rough-in - 1st Floor",
    "division": "PLUMBING_MULTIFAMILY",
    "startDate": "2024-02-01T00:00:00Z",
    "endDate": "2024-02-15T00:00:00Z",
    "requiredForeman": true,
    "requiredJourneymen": 3,
    "requiredApprentices": 2,
    "dependencies": []
  }'
# Should create phase with phaseNumber 1

# 6. Test dependency creation
curl -X POST http://localhost:3000/api/projects/PRJ-001/phases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Topout - 1st Floor",
    "division": "PLUMBING_MULTIFAMILY",
    "startDate": "2024-02-16T00:00:00Z",
    "endDate": "2024-02-28T00:00:00Z",
    "requiredForeman": true,
    "requiredJourneymen": 3,
    "requiredApprentices": 1,
    "dependencies": ["phase-1-uuid"]
  }'
# Should create phase 2 with dependency on phase 1

# 7. Test circular dependency detection
curl -X PUT http://localhost:3000/api/phases/phase-1-uuid \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dependencies": ["phase-2-uuid"]}'
# Should return 400 error (circular dependency)

# 8. Test progress update
curl -X PUT http://localhost:3000/api/phases/phase-1-uuid/progress \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"progressPercentage": 65.5}'
# Should update progress to 65.5%

# 9. Run unit tests
npm run test -- tests/unit/services/PhaseService.test.ts
npm run test -- tests/unit/services/DependencyResolver.test.ts
npm run test -- tests/unit/services/ProgressCalculator.test.ts
# All tests should pass

# 10. Run integration tests
npm run test:ci -- tests/integration/api/phases.test.ts
# All API tests should pass

# 11. Run E2E tests
npm run test:e2e -- tests/e2e/phase-management.spec.ts
# Phase CRUD and dependency flows pass
```

## Expected Output

```
✓ ProjectPhase model created and migrated
✓ 150 test phases seeded across 30 projects
✓ GET /api/projects/:id/phases returns phases
✓ POST /api/projects/:id/phases creates phase
✓ Phase numbers auto-increment within project
✓ Dependencies validated (same project only)
✓ Circular dependencies detected and blocked
✓ Progress updates work correctly
✓ Crew requirements calculated
✓ Labor hours calculated from crew and duration
✓ Critical path calculated correctly
✓ All phase tests passing (38/38)
```

## Phase Lifecycle Rules

```typescript
const PhaseStatusTransitions = {
  NOT_STARTED: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['COMPLETED', 'DELAYED', 'BLOCKED'],
  DELAYED: ['IN_PROGRESS', 'BLOCKED'],
  BLOCKED: ['NOT_STARTED'], // Unblock
  COMPLETED: [] // Terminal state
};

// Business rules
const PhaseRules = {
  START_PHASE: 'All dependency phases must be completed',
  COMPLETE_PHASE: 'Progress must be 100%',
  BLOCK_PHASE: 'Requires reason and notification',
  DELAY_PHASE: 'Auto-set when actualEndDate > endDate'
};
```

## Typical Phase Breakdown Examples

```typescript
// Multifamily Plumbing Project
const MultifamilyPhases = [
  'Underground Rough-in',
  'Vertical Rough-in - 1st Floor',
  'Vertical Rough-in - 2nd Floor',
  'Vertical Rough-in - 3rd Floor',
  'Topout - 1st Floor',
  'Topout - 2nd Floor',
  'Topout - 3rd Floor',
  'Fixture Installation - 1st Floor',
  'Fixture Installation - 2nd Floor',
  'Fixture Installation - 3rd Floor',
  'Final Inspection and Testing'
];

// Commercial HVAC Project
const CommercialHVACPhases = [
  'Equipment Delivery and Staging',
  'Rooftop Unit Installation',
  'Ductwork - Main Distribution',
  'Ductwork - Branch Runs',
  'Ductwork - Diffusers and Grilles',
  'Control Wiring',
  'Gas Piping',
  'Startup and Commissioning',
  'Air Balancing',
  'Final Testing and Training'
];
```

## Related PRPs
- Depends on: PRP-006 (Project Core)
- Blocks: PRP-008 (Crew Assignments), PRP-009 (Schedule Conflict Detection), PRP-011 (Monday Sync Service), PRP-013 (Capacity Calculator)

## Estimated Time
7-8 hours

## Notes
- Phase numbers should be 1-indexed and sequential
- Duration is calculated as business days (excluding weekends)
- Labor hours = (foreman + journeymen + apprentices) × duration × 8 hours/day
- Progress can be manually set or auto-calculated from crew assignments
- Consider adding phase templates for common project types (future)
- Dependency graph should use topological sort for rendering
- Phase dates should auto-adjust when project dates change

## Rollback Plan
If validation fails:
1. Verify ProjectPhase model matches spec.md interface
2. Check dependency validation logic (no circular deps)
3. Test phase numbering within projects
4. Verify labor hours calculation formula
5. Check progress percentage validation (0-100)
6. Test cascade delete behavior
7. Revert migration: `npx prisma migrate reset`
