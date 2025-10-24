import { NextRequest, NextResponse } from 'next/server';
// import { withApiAuthRequired } from './auth0';
import { getUserSession, hasRole } from './session';
import { hasPermission, Permission } from './rbac';
import { UserRole } from '@prisma/client';

export interface AuthMiddlewareOptions {
  requiredRoles?: UserRole[];
  requiredPermissions?: Permission[];
  requireAll?: boolean; // If true, user must have ALL permissions
}

/**
 * Middleware to protect API routes with role-based access control
 */
export function withAuth(options: AuthMiddlewareOptions = {}) {
  return async function middleware(req: NextRequest) {
    try {
      // First check if user is authenticated
      const session = await getUserSession(req, NextResponse.next());

      if (!session) {
        return NextResponse.json(
          { error: 'Unauthorized - Please login' },
          { status: 401 }
        );
      }

      const userRole = session.user.role;

      if (!userRole) {
        return NextResponse.json(
          { error: 'Unauthorized - No role assigned' },
          { status: 403 }
        );
      }

      // Check role requirements
      if (options.requiredRoles && options.requiredRoles.length > 0) {
        if (!hasRole(session, options.requiredRoles)) {
          return NextResponse.json(
            { error: 'Forbidden - Insufficient role privileges' },
            { status: 403 }
          );
        }
      }

      // Check permission requirements
      if (options.requiredPermissions && options.requiredPermissions.length > 0) {
        const hasRequiredPermissions = options.requireAll
          ? options.requiredPermissions.every(p => hasPermission(userRole, p))
          : options.requiredPermissions.some(p => hasPermission(userRole, p));

        if (!hasRequiredPermissions) {
          return NextResponse.json(
            { error: 'Forbidden - Insufficient permissions' },
            { status: 403 }
          );
        }
      }

      // Add user info to request headers for downstream use
      const headers = new Headers(req.headers);
      headers.set('x-user-id', session.user.userId || '');
      headers.set('x-user-role', userRole);
      headers.set('x-user-email', session.user.email);

      return NextResponse.next({
        request: {
          headers,
        },
      });
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper to require specific roles
 */
export function requireRoles(...roles: UserRole[]) {
  return withAuth({ requiredRoles: roles });
}

/**
 * Helper to require specific permissions
 */
export function requirePermissions(...permissions: Permission[]) {
  return withAuth({ requiredPermissions: permissions });
}

/**
 * Helper to require all specified permissions
 */
export function requireAllPermissions(...permissions: Permission[]) {
  return withAuth({ requiredPermissions: permissions, requireAll: true });
}

/**
 * Preset middleware for common access patterns
 */
export const requireOwner = requireRoles(UserRole.OWNER);
export const requireManager = requireRoles(UserRole.OWNER, UserRole.MANAGER);
export const requireProjectManager = requireRoles(
  UserRole.OWNER,
  UserRole.MANAGER,
  UserRole.PROJECT_MANAGER
);
export const requireForeman = requireRoles(
  UserRole.OWNER,
  UserRole.MANAGER,
  UserRole.PROJECT_MANAGER,
  UserRole.FOREMAN
);