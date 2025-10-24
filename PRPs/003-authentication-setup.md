# PRP-003: Authentication Setup

## Status
🔲 Not Started

## Priority
P0 - Critical

## Objective
Configure Auth0 authentication with JWT validation, implement role-based access control middleware, and set up session management.

## Scope

### Files to Create
- `src/lib/auth/auth0.ts` - Auth0 configuration
- `src/lib/auth/session.ts` - Session management
- `src/lib/auth/middleware.ts` - Auth middleware
- `src/lib/auth/rbac.ts` - Role-based access control
- `src/app/api/auth/[...auth0]/route.ts` - Auth0 callback routes
- `tests/auth/auth0.test.ts` - Auth0 integration tests
- `tests/auth/rbac.test.ts` - RBAC tests
- `tests/middleware/auth.test.ts` - Middleware tests

### Environment Variables Needed
```env
AUTH0_SECRET=
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_AUDIENCE=
```

## Implementation Steps

1. **Configure Auth0 SDK**
   - Initialize `@auth0/nextjs-auth0`
   - Set up callback routes
   - Configure session management
   - Set session duration (12 hours active, 7 days refresh)

2. **Create Auth Middleware**
   - JWT validation
   - Session checking
   - User role extraction
   - Route protection

3. **Implement RBAC System**
   - Define permission matrix (from spec.md)
   - Create role checking utilities
   - Add permission decorators
   - Test all 5 roles

4. **Write Authentication Tests**
   - Test login flow
   - Test JWT validation
   - Test session expiry
   - Test role-based access

5. **Create Protected Route Example**
   - Example protected API route
   - Example protected page
   - Redirect to login if unauthenticated

## Acceptance Criteria

- [ ] Users can log in via Auth0
- [ ] JWT tokens are validated correctly
- [ ] Sessions persist for 12 hours
- [ ] Refresh tokens work for 7 days
- [ ] All 5 roles (Owner, Manager, PM, Foreman, Read-Only) function correctly
- [ ] Protected routes redirect to login
- [ ] Logout clears session completely
- [ ] RBAC middleware blocks unauthorized access
- [ ] All authentication tests pass

## Role-Based Access Matrix

```typescript
// From spec.md
| Feature                    | Owner | Manager | PM  | Foreman | Read-Only |
|---------------------------|-------|---------|-----|---------|-----------|
| View All Projects         | ✓     | ✓       | ✓   | Own     | ✓         |
| Create/Edit Projects      | ✓     | ✓       | ✓   | ✗       | ✗         |
| View Cash Flow            | ✓     | ✓       | ✗   | ✗       | ✗         |
| Manage Employees          | ✓     | ✓       | ✗   | ✗       | ✗         |
| Assign Crews              | ✓     | ✓       | ✓   | Own     | ✗         |
| Update Phase Progress     | ✓     | ✓       | ✓   | ✓       | ✗         |
| View Reports              | ✓     | ✓       | ✓   | Own     | Limited   |
| Export Data               | ✓     | ✓       | ✓   | ✗       | ✗         |
| System Configuration      | ✓     | ✗       | ✗   | ✗       | ✗         |
```

## Validation Steps

```bash
# 1. Set up Auth0 tenant
# - Create application in Auth0 dashboard
# - Configure callback URLs
# - Get credentials

# 2. Add credentials to .env.local
# Copy values from Auth0 dashboard

# 3. Start dev server
npm run dev

# 4. Test login flow
# Visit http://localhost:3000/api/auth/login
# Should redirect to Auth0 login page

# 5. Complete login
# Should redirect back with session cookie

# 6. Test protected route
# Visit protected page - should see content
# Logout and visit again - should redirect to login

# 7. Run auth tests
npm run test -- tests/auth
# All tests should pass

# 8. Test each role
# Create users with different roles
# Verify permissions match matrix
```

## Expected Output

```
✓ Auth0 login redirects correctly
✓ JWT tokens validated successfully
✓ Sessions persist correctly
✓ All 5 roles have correct permissions
✓ Protected routes block unauthenticated users
✓ All authentication tests passing
```

## Security Considerations

- Use HTTP-only cookies for session tokens
- Enable CSRF protection
- Set secure cookie flags in production
- Implement rate limiting on auth endpoints (1000 req/hour)
- Log all authentication events
- MFA optional for Managers, required for Owners

## Related PRPs
- Depends on: PRP-002 (Database Foundation)
- Blocks: PRP-004 (User Management), all feature PRPs

## Estimated Time
4-5 hours

## Notes
- Test with multiple browsers to verify session isolation
- Document Auth0 setup steps for production deployment
- Store user roles in database, sync from Auth0 metadata

## Rollback Plan
If validation fails:
1. Verify Auth0 credentials in .env.local
2. Check callback URLs match Auth0 dashboard
3. Clear cookies and try login again
4. Check Auth0 logs for errors
