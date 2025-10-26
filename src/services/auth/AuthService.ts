import { UserRole } from '@prisma/client';
import { NextRequest } from 'next/server';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  division?: string;
}

// Mock auth for development - replace with real auth in production
export async function verifyAuth(request: NextRequest): Promise<AuthUser | null> {
  // In development, always return a mock admin user
  if (process.env.NODE_ENV === 'development' && process.env.ENABLE_AUTH !== 'true') {
    return {
      id: 'dev-user-001',
      email: 'admin@pphmechanical.com',
      name: 'Development Admin',
      role: UserRole.OWNER,
      division: 'BOTH'
    };
  }

  // Production auth would go here (Auth0, Azure AD, etc.)
  // For now, return mock user to allow testing
  return {
    id: 'dev-user-001',
    email: 'admin@pphmechanical.com',
    name: 'Development Admin',
    role: UserRole.OWNER,
    division: 'BOTH'
  };
}

export function requireAuth(roles?: UserRole[]) {
  return async (request: NextRequest) => {
    const user = await verifyAuth(request);

    if (!user) {
      return { authorized: false, error: 'Unauthorized' };
    }

    if (roles && !roles.includes(user.role)) {
      return { authorized: false, error: 'Forbidden' };
    }

    return { authorized: true, user };
  };
}