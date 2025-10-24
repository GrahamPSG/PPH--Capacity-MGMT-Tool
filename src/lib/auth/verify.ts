import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';

// Temporary mock authentication for development
// TODO: Replace with actual Auth0 implementation
export async function verifyAuth(request: NextRequest) {
  // For now, return a mock user
  // In production, this would verify JWT token from Auth0
  return {
    id: 'dev-user-id',
    email: 'dev@parisplumbingheating.com',
    role: UserRole.OWNER,
    firstName: 'Dev',
    lastName: 'User'
  };
}