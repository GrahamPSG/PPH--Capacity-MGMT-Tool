# PRP-004: User Management

## Status
🔲 Not Started

## Priority
P0 - Critical

## Objective
Implement comprehensive user management system with CRUD operations, role assignment, division access control, and audit logging for all user actions.

## Scope

### Files to Create
- `prisma/migrations/XXX_add_user_model.sql` - User table migration
- `src/app/api/users/route.ts` - List and create users
- `src/app/api/users/[id]/route.ts` - Get, update, delete user
- `src/app/api/users/[id]/divisions/route.ts` - Manage division access
- `src/app/api/users/[id]/activate/route.ts` - Activate/deactivate user
- `src/services/users/UserService.ts` - User business logic
- `src/services/users/UserValidator.ts` - User validation rules
- `src/hooks/useUsers.ts` - React Query hooks for users
- `src/components/users/UserList.tsx` - User list component
- `src/components/users/UserForm.tsx` - User create/edit form
- `src/components/users/UserRoleSelector.tsx` - Role selection component
- `src/components/users/DivisionAccessManager.tsx` - Division access UI
- `tests/unit/services/UserService.test.ts` - Service tests
- `tests/integration/api/users.test.ts` - API integration tests
- `tests/e2e/user-management.spec.ts` - E2E user management tests

### Database Schema Updates
```typescript
// From spec.md - User model
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  firstName     String
  lastName      String
  role          UserRole
  divisionAccess Division[]
  phoneNumber   String?
  auth0Id       String    @unique
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?
  isActive      Boolean   @default(true)
}

enum UserRole {
  OWNER
  MANAGER
  PROJECT_MANAGER
  FOREMAN
  READ_ONLY
}
```

## Implementation Steps

1. **Create Database Migration**
   - Add User model to Prisma schema
   - Generate and run migration
   - Create seed data for initial users
   - Add indexes on email, auth0Id, role

2. **Implement User Service Layer**
   - CRUD operations with Prisma
   - Role assignment validation
   - Division access management
   - Active/inactive status toggle
   - Audit log integration for all mutations

3. **Build API Routes**
   - GET /api/users - List with filtering by role, division, status
   - POST /api/users - Create user with role validation
   - GET /api/users/:id - Get user details
   - PUT /api/users/:id - Update user (restrict role changes)
   - DELETE /api/users/:id - Soft delete (set isActive=false)
   - PUT /api/users/:id/divisions - Update division access
   - POST /api/users/:id/activate - Toggle active status

4. **Create React Components**
   - UserList with sorting, filtering, pagination
   - UserForm with validation (email, role, divisions)
   - UserRoleSelector with permission preview
   - DivisionAccessManager with checkbox tree
   - Confirmation dialogs for delete/deactivate

5. **Implement React Query Hooks**
   - useUsers() - List with filters
   - useUser(id) - Single user
   - useCreateUser() - Create mutation
   - useUpdateUser() - Update mutation
   - useDeleteUser() - Delete mutation
   - Optimistic updates for better UX

6. **Add Authorization Middleware**
   - Only Owners can create/edit/delete users
   - Users can view own profile
   - Managers can view users in their divisions
   - Implement RBAC checks on all endpoints

7. **Write Comprehensive Tests**
   - Unit tests for UserService (validation, business logic)
   - Integration tests for all API endpoints
   - E2E tests for user creation, editing, deletion flows
   - Test role-based access restrictions

## Acceptance Criteria

- [ ] Owners can create new users with any role
- [ ] User email addresses are validated and unique
- [ ] Users can be assigned one of 5 roles (Owner, Manager, PM, Foreman, Read-Only)
- [ ] Division access can be assigned and updated
- [ ] Users can be activated/deactivated (soft delete)
- [ ] All user mutations are logged in audit trail
- [ ] Non-owners cannot create or edit users
- [ ] Users can view and edit their own profile (except role)
- [ ] User list supports filtering by role, division, and active status
- [ ] User list supports pagination (50 users per page)
- [ ] All user tests pass (unit, integration, E2E)
- [ ] Auth0 ID is synced correctly with user records

## Validation Steps

```bash
# 1. Run database migration
npx prisma migrate dev --name add_user_model

# 2. Verify migration
npx prisma studio
# Check that User table exists with correct columns

# 3. Seed test users
npx prisma db seed
# Should create 5 users (one per role)

# 4. Start dev server
npm run dev

# 5. Test API endpoints
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"
# Should return list of users

curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","firstName":"Test","lastName":"User","role":"PROJECT_MANAGER","divisionAccess":["PLUMBING_MULTIFAMILY"]}'
# Should create new user

# 6. Test role-based access
# Login as Manager - attempt to create user
# Should return 403 Forbidden

# 7. Run unit tests
npm run test -- tests/unit/services/UserService.test.ts
# All tests should pass

# 8. Run integration tests
npm run test:ci -- tests/integration/api/users.test.ts
# All API tests should pass

# 9. Run E2E tests
npm run test:e2e -- tests/e2e/user-management.spec.ts
# User creation, editing, deletion flows pass

# 10. Verify audit logging
# Check AuditLog table for user creation/update events
```

## Expected Output

```
✓ User model created and migrated
✓ 5 test users seeded (one per role)
✓ GET /api/users returns filtered user list
✓ POST /api/users creates new user with validation
✓ PUT /api/users/:id updates user details
✓ Division access can be assigned
✓ Users can be activated/deactivated
✓ Only Owners can manage users
✓ All mutations logged in audit trail
✓ All user tests passing (24/24)
```

## Role-Based Access Rules

```typescript
// User Management Permissions
const UserPermissions = {
  OWNER: ['create', 'read', 'update', 'delete', 'assignRole'],
  MANAGER: ['read'], // Can view users in their divisions
  PROJECT_MANAGER: ['read'], // Can view own profile only
  FOREMAN: ['read'], // Can view own profile only
  READ_ONLY: ['read'] // Can view own profile only
};
```

## Related PRPs
- Depends on: PRP-002 (Database Foundation), PRP-003 (Authentication Setup)
- Blocks: PRP-006 (Project Core), PRP-013 (Capacity Calculator)

## Estimated Time
5-6 hours

## Notes
- User deletion should be soft delete (isActive=false) to preserve audit history
- Email changes should require verification flow (future enhancement)
- Consider adding user profile photos via S3 (future enhancement)
- Division access should be validated against available divisions
- Role changes should require elevated permissions and confirmation

## Rollback Plan
If validation fails:
1. Check Prisma schema matches User interface from spec.md
2. Verify Auth0 ID is being synced correctly
3. Test role-based access middleware
4. Check audit log entries are being created
5. Revert migration: `npx prisma migrate reset`
