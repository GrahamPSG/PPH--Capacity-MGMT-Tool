# PRP-002: Database Foundation

## Status
🔲 Not Started

## Priority
P0 - Critical

## Objective
Set up PostgreSQL database with Prisma ORM, create complete schema based on spec.md, and establish database testing infrastructure.

## Scope

### Files to Create
- `prisma/schema.prisma` - Complete database schema
- `prisma/migrations/` - Migration files
- `prisma/seed.ts` - Database seeding script
- `src/lib/prisma/client.ts` - Prisma client singleton
- `tests/database/schema.test.ts` - Schema validation tests
- `tests/database/connection.test.ts` - Connection pooling tests

### Schema Models (from spec.md)
All models from the specification:
- User, Employee
- Project, ProjectPhase, CrewAssignment
- ScheduleOfValues, ProjectExpense
- CapacitySnapshot, LaborForecast
- MondaySync, Alert, AuditLog

## Implementation Steps

1. **Create Prisma Schema**
   - Define all models with exact fields from spec.md
   - Add indexes for performance
   - Configure cascade deletes
   - Add unique constraints

2. **Write Schema Tests**
   - Test model relationships
   - Test constraints and validations
   - Test cascade behavior
   - Test default values

3. **Run Initial Migration**
   - Generate migration files
   - Apply to local database
   - Verify all tables created

4. **Create Seed Script**
   - Sample users for each role
   - Sample employees across divisions
   - Sample projects with phases
   - Test data for development

5. **Create Prisma Client**
   - Singleton pattern for client
   - Logging configuration
   - Connection pooling setup

## Acceptance Criteria

- [ ] All models from spec.md are defined in schema
- [ ] Schema validation tests pass
- [ ] Migration runs successfully against PostgreSQL 16
- [ ] Seed script creates sample data
- [ ] Prisma Studio connects and displays all tables
- [ ] Foreign key constraints work correctly
- [ ] Cascade deletes function as expected
- [ ] Indexes are created for performance-critical queries

## Validation Steps

```bash
# 1. Ensure Docker PostgreSQL is running
docker compose up -d postgres

# 2. Generate Prisma client
npx prisma generate

# 3. Run migration
npx prisma migrate dev --name initial_schema

# 4. Verify in Prisma Studio
npx prisma studio
# Should see all tables with correct columns

# 5. Run database tests
npm run test -- tests/database
# All tests should pass

# 6. Seed database
npm run prisma:seed
# Should create sample data

# 7. Verify seed data
npx prisma studio
# Should see populated tables
```

## Expected Output

```
✓ Prisma schema with 13+ models
✓ Migration applied successfully
✓ All database tests passing
✓ Seed data created for development
✓ Prisma Studio accessible at http://localhost:5555
```

## Key Enums

```prisma
enum UserRole {
  OWNER
  MANAGER
  PROJECT_MANAGER
  FOREMAN
  READ_ONLY
}

enum Division {
  PLUMBING_MULTIFAMILY
  PLUMBING_COMMERCIAL
  PLUMBING_CUSTOM
  HVAC_MULTIFAMILY
  HVAC_COMMERCIAL
  HVAC_CUSTOM
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

## Related PRPs
- Depends on: PRP-001 (Project Initialization)
- Blocks: PRP-003 (Authentication), PRP-004 (User Management)

## Estimated Time
4-5 hours

## Notes
- Use UUID for all IDs
- Add `createdAt` and `updatedAt` to all models
- Use Decimal type for financial amounts
- Index foreign keys and frequently queried fields

## Rollback Plan
If validation fails:
1. Check PostgreSQL is running: `docker compose ps`
2. Check connection string in .env.local
3. Reset database: `npx prisma migrate reset`
4. Verify schema syntax with `npx prisma validate`
