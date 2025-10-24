import { getSession as getAuth0Session } from './auth0';
import { NextRequest, NextResponse } from 'next/server';
import type { Session } from '@auth0/nextjs-auth0';
import prisma from '@/lib/prisma/client';
import { UserRole } from '@prisma/client';

export interface UserSession extends Session {
  user: {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
    role?: UserRole;
    divisionAccess?: string[];
    userId?: string;
  };
}

/**
 * Get the current user session with database user data
 */
export async function getUserSession(
  req: NextRequest,
  res: NextResponse
): Promise<UserSession | null> {
  try {
    const session = await getAuth0Session(req, res);
    if (!session) return null;

    // Fetch user from database using auth0Id
    const dbUser = await prisma.user.findUnique({
      where: { auth0Id: session.user.sub },
      select: {
        id: true,
        role: true,
        divisionAccess: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    if (!dbUser || !dbUser.isActive) {
      return null;
    }

    // Merge database data with session
    return {
      ...session,
      user: {
        ...session.user,
        role: dbUser.role,
        divisionAccess: dbUser.divisionAccess,
        userId: dbUser.id,
        name: `${dbUser.firstName} ${dbUser.lastName}`,
      },
    } as UserSession;
  } catch (error) {
    console.error('Error fetching user session:', error);
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(session: UserSession | null, requiredRoles: UserRole[]): boolean {
  if (!session || !session.user.role) return false;
  return requiredRoles.includes(session.user.role);
}

/**
 * Check if user has access to division
 */
export function hasDivisionAccess(session: UserSession | null, division: string): boolean {
  if (!session || !session.user.divisionAccess) return false;
  return session.user.divisionAccess.includes(division);
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(auth0Id: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { auth0Id },
      data: { lastLoginAt: new Date() },
    });
  } catch (error) {
    console.error('Error updating last login:', error);
  }
}