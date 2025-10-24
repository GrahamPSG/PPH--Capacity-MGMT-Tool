# PRP-005: Employee Management

## Status
🔲 Not Started

## Priority
P0 - Critical

## Objective
Build employee management system with CRUD operations, skills tracking, certifications management, availability scheduling, and assignment history tracking.

## Scope

### Files to Create
- `prisma/migrations/XXX_add_employee_model.sql` - Employee table migration
- `src/app/api/employees/route.ts` - List and create employees
- `src/app/api/employees/[id]/route.ts` - Get, update, delete employee
- `src/app/api/employees/[id]/availability/route.ts` - Get availability
- `src/app/api/employees/[id]/assignments/route.ts` - Get assignment history
- `src/app/api/employees/[id]/skills/route.ts` - Manage skills
- `src/app/api/employees/[id]/certifications/route.ts` - Manage certifications
- `src/services/employees/EmployeeService.ts` - Employee business logic
- `src/services/employees/AvailabilityCalculator.ts` - Availability calculations
- `src/services/employees/EmployeeValidator.ts` - Employee validation
- `src/hooks/useEmployees.ts` - React Query hooks
- `src/components/employees/EmployeeList.tsx` - Employee list with filters
- `src/components/employees/EmployeeForm.tsx` - Create/edit form
- `src/components/employees/SkillsManager.tsx` - Skills management UI
- `src/components/employees/CertificationsManager.tsx` - Certifications UI
- `src/components/employees/AvailabilityCalendar.tsx` - Availability view
- `tests/unit/services/EmployeeService.test.ts` - Service tests
- `tests/unit/services/AvailabilityCalculator.test.ts` - Availability tests
- `tests/integration/api/employees.test.ts` - API tests
- `tests/e2e/employee-management.spec.ts` - E2E tests

### Database Schema Updates
```typescript
// From spec.md - Employee model
model Employee {
  id                String       @id @default(uuid())
  employeeCode      String       @unique
  firstName         String
  lastName          String
  division          Division
  employeeType      EmployeeType
  hourlyRate        Float
  overtimeRate      Float
  maxHoursPerWeek   Int          @default(40)
  skills            String[]
  certifications    String[]
  availabilityStart DateTime
  availabilityEnd   DateTime?
  isActive          Boolean      @default(true)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
}

enum EmployeeType {
  FOREMAN
  JOURNEYMAN
  APPRENTICE
}

enum Division {
  PLUMBING_MULTIFAMILY
  PLUMBING_COMMERCIAL
  PLUMBING_CUSTOM
  HVAC_MULTIFAMILY
  HVAC_COMMERCIAL
  HVAC_CUSTOM
}
```

## Implementation Steps

1. **Create Database Migration**
   - Add Employee model to Prisma schema
   - Add Division and EmployeeType enums
   - Generate and run migration
   - Create seed data (20 employees across divisions)
   - Add indexes on employeeCode, division, isActive

2. **Implement Employee Service Layer**
   - CRUD operations with validation
   - Skills and certifications management
   - Availability date range calculations
   - Assignment history retrieval
   - Active/inactive status management
   - Audit logging for all mutations

3. **Build Availability Calculator**
   - Calculate available hours per week
   - Factor in maxHoursPerWeek limits
   - Handle availability date ranges
   - Account for existing assignments
   - Generate availability reports by division

4. **Create API Routes**
   - GET /api/employees - List with filters (division, type, skills, active)
   - POST /api/employees - Create with validation
   - GET /api/employees/:id - Get details
   - PUT /api/employees/:id - Update details
   - DELETE /api/employees/:id - Soft delete
   - GET /api/employees/:id/availability - Available hours
   - GET /api/employees/:id/assignments - Assignment history
   - PUT /api/employees/:id/skills - Update skills array
   - PUT /api/employees/:id/certifications - Update certifications

5. **Build React Components**
   - EmployeeList with advanced filtering
   - EmployeeForm with rate calculations
   - SkillsManager with predefined skill list
   - CertificationsManager with expiration tracking
   - AvailabilityCalendar with visual timeline
   - Employee card with quick stats

6. **Implement React Query Hooks**
   - useEmployees(filters) - List with filters
   - useEmployee(id) - Single employee
   - useCreateEmployee() - Create mutation
   - useUpdateEmployee() - Update mutation
   - useDeleteEmployee() - Delete mutation
   - useEmployeeAvailability(id) - Availability data
   - Cache invalidation on mutations

7. **Add Authorization Checks**
   - Owners and Managers can manage all employees
   - Project Managers can view employees
   - Foremen can view employees in their division
   - Validate division access on all operations

## Acceptance Criteria

- [ ] Employees can be created with all required fields
- [ ] Employee codes are unique and auto-generated
- [ ] Employees can be assigned to one of 6 divisions
- [ ] Employee types (Foreman, Journeyman, Apprentice) are validated
- [ ] Hourly rate and overtime rate are tracked
- [ ] Max hours per week defaults to 40, can be customized
- [ ] Skills can be added/removed from predefined list
- [ ] Certifications can be managed with expiration dates
- [ ] Availability date ranges are tracked
- [ ] Employee list filters by division, type, skills, and active status
- [ ] Availability calculator shows available hours per employee
- [ ] Assignment history displays past and current projects
- [ ] All employee tests pass (unit, integration, E2E)
- [ ] Soft delete preserves employee history

## Validation Steps

```bash
# 1. Run database migration
npx prisma migrate dev --name add_employee_model

# 2. Verify migration
npx prisma studio
# Check Employee table with all fields

# 3. Seed test employees
npx prisma db seed
# Should create 20 employees across divisions

# 4. Start dev server
npm run dev

# 5. Test employee creation
curl -X POST http://localhost:3000/api/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeCode": "EMP001",
    "firstName": "John",
    "lastName": "Doe",
    "division": "PLUMBING_MULTIFAMILY",
    "employeeType": "JOURNEYMAN",
    "hourlyRate": 35.50,
    "overtimeRate": 53.25,
    "maxHoursPerWeek": 40,
    "skills": ["Rough-in", "PEX Installation"],
    "certifications": ["Journeyman License"],
    "availabilityStart": "2024-01-01T00:00:00Z"
  }'
# Should create employee with ID

# 6. Test filtering
curl -X GET "http://localhost:3000/api/employees?division=PLUMBING_MULTIFAMILY&employeeType=JOURNEYMAN" \
  -H "Authorization: Bearer $TOKEN"
# Should return filtered employees

# 7. Test availability calculation
curl -X GET http://localhost:3000/api/employees/EMP001/availability \
  -H "Authorization: Bearer $TOKEN"
# Should return available hours this week

# 8. Run unit tests
npm run test -- tests/unit/services/EmployeeService.test.ts
npm run test -- tests/unit/services/AvailabilityCalculator.test.ts
# All tests should pass

# 9. Run integration tests
npm run test:ci -- tests/integration/api/employees.test.ts
# All API tests should pass

# 10. Run E2E tests
npm run test:e2e -- tests/e2e/employee-management.spec.ts
# Employee CRUD flows pass
```

## Expected Output

```
✓ Employee model created and migrated
✓ 20 test employees seeded across 6 divisions
✓ GET /api/employees returns filtered list
✓ POST /api/employees creates new employee
✓ PUT /api/employees/:id updates employee
✓ Skills and certifications can be managed
✓ Availability calculator shows correct hours
✓ Assignment history displays correctly
✓ Division-based filtering works
✓ Employee type validation enforced
✓ All employee tests passing (32/32)
```

## Predefined Skills by Division

```typescript
const SkillsByDivision = {
  PLUMBING_MULTIFAMILY: [
    'Rough-in', 'Topout', 'PEX Installation', 'Copper Soldering',
    'ABS/PVC', 'Fixture Installation', 'Pressure Testing'
  ],
  PLUMBING_COMMERCIAL: [
    'Cast Iron', 'Medical Gas', 'Backflow Prevention',
    'Commercial Fixtures', 'Underground Utilities', 'Fire Sprinkler'
  ],
  PLUMBING_CUSTOM: [
    'Radiant Heating', 'High-End Fixtures', 'Water Treatment',
    'Hydronic Systems', 'Tankless Water Heaters'
  ],
  HVAC_MULTIFAMILY: [
    'Split System', 'Package Unit', 'Ductwork',
    'Ventilation', 'Gas Piping', 'Refrigerant Handling'
  ],
  HVAC_COMMERCIAL: [
    'Rooftop Units', 'Chiller Systems', 'VRF Systems',
    'Building Automation', 'Air Balancing', 'Controls'
  ],
  HVAC_CUSTOM: [
    'Geothermal', 'Zoning Systems', 'High Efficiency',
    'Mini-Split', 'Humidification', 'Air Purification'
  ]
};
```

## Related PRPs
- Depends on: PRP-002 (Database Foundation), PRP-003 (Authentication Setup)
- Blocks: PRP-008 (Crew Assignments), PRP-009 (Schedule Conflict Detection), PRP-013 (Capacity Calculator)

## Estimated Time
6-7 hours

## Notes
- Employee codes should auto-increment (EMP001, EMP002, etc.)
- Overtime rate typically 1.5x hourly rate, but allow custom values
- Consider adding employee photos via S3 (future enhancement)
- Track certification expiration dates for compliance alerts
- Skills list should be expandable by Owners/Managers
- Availability calendar should show visual timeline with assignments

## Rollback Plan
If validation fails:
1. Verify Employee model matches spec.md interface
2. Check enum values for Division and EmployeeType
3. Test availability calculator logic
4. Verify skills/certifications array handling
5. Check soft delete implementation
6. Revert migration: `npx prisma migrate reset`
