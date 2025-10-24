# PRP-006: Project Core

## Status
🔲 Not Started

## Priority
P0 - Critical

## Objective
Implement core project management functionality including CRUD operations, lifecycle state management, financial tracking, and integration with Monday.com board references.

## Scope

### Files to Create
- `prisma/migrations/XXX_add_project_model.sql` - Project table migration
- `src/app/api/projects/route.ts` - List and create projects
- `src/app/api/projects/[id]/route.ts` - Get, update, delete project
- `src/app/api/projects/[id]/status/route.ts` - Update project status
- `src/app/api/projects/[id]/schedule-values/route.ts` - Schedule of values
- `src/app/api/projects/[id]/expenses/route.ts` - Project expenses
- `src/services/projects/ProjectService.ts` - Project business logic
- `src/services/projects/ProjectValidator.ts` - Project validation
- `src/services/projects/FinancialCalculator.ts` - Financial calculations
- `src/services/projects/ProjectLifecycle.ts` - Status transitions
- `src/hooks/useProjects.ts` - React Query hooks
- `src/components/projects/ProjectList.tsx` - Project list with filters
- `src/components/projects/ProjectCard.tsx` - Project card component
- `src/components/projects/ProjectForm.tsx` - Create/edit form
- `src/components/projects/ProjectStatusBadge.tsx` - Status indicator
- `src/components/projects/FinancialSummary.tsx` - Financial overview
- `src/app/projects/page.tsx` - Projects list page
- `src/app/projects/[id]/page.tsx` - Project details page
- `tests/unit/services/ProjectService.test.ts` - Service tests
- `tests/unit/services/FinancialCalculator.test.ts` - Financial tests
- `tests/unit/services/ProjectLifecycle.test.ts` - Lifecycle tests
- `tests/integration/api/projects.test.ts` - API tests
- `tests/e2e/project-management.spec.ts` - E2E tests

### Database Schema Updates
```typescript
// From spec.md - Project model
model Project {
  id                String        @id @default(uuid())
  projectCode       String        @unique
  name              String
  type              ProjectType
  division          Division
  status            ProjectStatus
  contractAmount    Float
  startDate         DateTime
  endDate           DateTime
  actualStartDate   DateTime?
  actualEndDate     DateTime?
  foremanId         String
  crewSize          Int
  address           String?
  clientName        String
  clientContact     String?
  mondayBoardId     String?
  mondayItemId      String?
  lastMondaySync    DateTime?
  notes             String?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  createdById       String
  modifiedById      String
}

enum ProjectType {
  MULTIFAMILY
  COMMERCIAL
  CUSTOM_HOME
}

enum ProjectStatus {
  QUOTED
  AWARDED
  IN_PROGRESS
  ON_HOLD
  COMPLETED
  CANCELLED
}
```

## Implementation Steps

1. **Create Database Migration**
   - Add Project model to Prisma schema
   - Add ProjectType and ProjectStatus enums
   - Generate and run migration
   - Create seed data (30 projects across statuses)
   - Add indexes on projectCode, division, status, foremanId

2. **Implement Project Service Layer**
   - CRUD operations with validation
   - Project code auto-generation (PRJ-001, PRJ-002, etc.)
   - Status transition validation (lifecycle rules)
   - Financial calculations (budget, spent, remaining)
   - Monday.com reference tracking
   - Audit logging for all mutations

3. **Build Project Lifecycle Manager**
   - Define valid status transitions
   - QUOTED → AWARDED → IN_PROGRESS → COMPLETED
   - Allow ON_HOLD from any active status
   - Allow CANCELLED from QUOTED or AWARDED
   - Validate business rules before transitions
   - Trigger alerts on status changes

4. **Create Financial Calculator**
   - Contract amount tracking
   - Actual costs aggregation
   - Budget variance calculations
   - Progress billing calculations
   - Cash flow projections
   - Financial health indicators

5. **Build API Routes**
   - GET /api/projects - List with filters (status, division, foreman, type)
   - POST /api/projects - Create with validation
   - GET /api/projects/:id - Get full details
   - PUT /api/projects/:id - Update details
   - DELETE /api/projects/:id - Soft delete (set status=CANCELLED)
   - PUT /api/projects/:id/status - Update status with lifecycle validation
   - GET /api/projects/:id/schedule-values - Get billing schedule
   - GET /api/projects/:id/expenses - Get project expenses
   - Pagination support (50 projects per page)

6. **Build React Components**
   - ProjectList with Kanban and Table views
   - ProjectCard with key metrics
   - ProjectForm with multi-step wizard
   - ProjectStatusBadge with color coding
   - FinancialSummary with charts
   - ProjectTimeline with Gantt view
   - Search and filter panel

7. **Create React Query Hooks**
   - useProjects(filters) - List with filters
   - useProject(id) - Single project with related data
   - useCreateProject() - Create mutation
   - useUpdateProject() - Update mutation
   - useDeleteProject() - Delete mutation
   - useProjectStatus(id) - Status update mutation
   - Optimistic updates and cache invalidation

## Acceptance Criteria

- [ ] Projects can be created with all required fields
- [ ] Project codes are unique and auto-generated
- [ ] Projects can be assigned to one of 3 types (Multifamily, Commercial, Custom Home)
- [ ] Projects can be assigned to one of 6 divisions
- [ ] Project status follows valid lifecycle transitions
- [ ] Contract amount and dates are tracked
- [ ] Foreman assignment is validated against Employee table
- [ ] Crew size is tracked and validated (1-20)
- [ ] Monday.com board/item IDs can be stored
- [ ] Project list filters by status, division, foreman, type
- [ ] Project list supports Kanban and Table views
- [ ] Financial summary shows budget, spent, remaining
- [ ] Only authorized users can create/edit projects
- [ ] All project tests pass (unit, integration, E2E)
- [ ] Audit trail tracks all project changes

## Validation Steps

```bash
# 1. Run database migration
npx prisma migrate dev --name add_project_model

# 2. Verify migration
npx prisma studio
# Check Project table with all fields and enums

# 3. Seed test projects
npx prisma db seed
# Should create 30 projects across statuses

# 4. Start dev server
npm run dev

# 5. Test project creation
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Riverside Apartments - Building A",
    "type": "MULTIFAMILY",
    "division": "PLUMBING_MULTIFAMILY",
    "status": "AWARDED",
    "contractAmount": 125000.00,
    "startDate": "2024-02-01T00:00:00Z",
    "endDate": "2024-05-15T00:00:00Z",
    "foremanId": "employee-uuid",
    "crewSize": 5,
    "clientName": "Riverside Development LLC",
    "address": "123 River St, Portland, OR"
  }'
# Should create project with auto-generated code

# 6. Test status transition
curl -X PUT http://localhost:3000/api/projects/PRJ-001/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
# Should update status to IN_PROGRESS

# 7. Test invalid status transition
curl -X PUT http://localhost:3000/api/projects/PRJ-001/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "QUOTED"}'
# Should return 400 error (invalid transition)

# 8. Test filtering
curl -X GET "http://localhost:3000/api/projects?status=IN_PROGRESS&division=PLUMBING_MULTIFAMILY" \
  -H "Authorization: Bearer $TOKEN"
# Should return filtered projects

# 9. Run unit tests
npm run test -- tests/unit/services/ProjectService.test.ts
npm run test -- tests/unit/services/ProjectLifecycle.test.ts
npm run test -- tests/unit/services/FinancialCalculator.test.ts
# All tests should pass

# 10. Run integration tests
npm run test:ci -- tests/integration/api/projects.test.ts
# All API tests should pass

# 11. Run E2E tests
npm run test:e2e -- tests/e2e/project-management.spec.ts
# Project CRUD and status transition flows pass
```

## Expected Output

```
✓ Project model created and migrated
✓ 30 test projects seeded across statuses
✓ GET /api/projects returns filtered list
✓ POST /api/projects creates project with auto-code
✓ PUT /api/projects/:id updates project
✓ PUT /api/projects/:id/status validates transitions
✓ Invalid status transitions blocked
✓ Financial calculations accurate
✓ Foreman assignment validated
✓ Monday.com references stored
✓ All project tests passing (42/42)
```

## Project Lifecycle Rules

```typescript
const StatusTransitions = {
  QUOTED: ['AWARDED', 'CANCELLED'],
  AWARDED: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [], // Terminal state
  CANCELLED: [] // Terminal state
};

// Business rules
const TransitionRules = {
  QUOTED_TO_AWARDED: 'Contract must be signed',
  AWARDED_TO_IN_PROGRESS: 'Must have foreman and start date',
  IN_PROGRESS_TO_COMPLETED: 'All phases must be completed',
  ANY_TO_ON_HOLD: 'Requires reason and approval',
  ANY_TO_CANCELLED: 'Requires owner approval'
};
```

## Related PRPs
- Depends on: PRP-002 (Database Foundation), PRP-003 (Authentication Setup), PRP-004 (User Management), PRP-005 (Employee Management)
- Blocks: PRP-007 (Project Phases), PRP-008 (Crew Assignments), PRP-013 (Capacity Calculator), PRP-014 (Labor Forecast)

## Estimated Time
7-8 hours

## Notes
- Project codes should auto-increment: PRJ-001, PRJ-002, etc.
- Contract amount should support up to $10M (validation)
- Crew size typically 2-10, but allow up to 20
- Track createdBy and modifiedBy for audit trail
- Monday.com sync status tracked via lastMondaySync timestamp
- Consider adding project photos/documents via S3 (future)
- Financial summary should include progress billing percentage

## Rollback Plan
If validation fails:
1. Verify Project model matches spec.md interface
2. Check enum values for ProjectType and ProjectStatus
3. Test lifecycle transition logic
4. Verify foreman FK relationship to Employee table
5. Check financial calculation formulas
6. Test audit logging integration
7. Revert migration: `npx prisma migrate reset`
