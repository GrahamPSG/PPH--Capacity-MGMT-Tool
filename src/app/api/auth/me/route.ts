import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth/session';
import { getRolePermissions } from '@/lib/auth/rbac';

/**
 * Get current user profile with permissions
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession(req, NextResponse.next());

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const permissions = session.user.role
      ? getRolePermissions(session.user.role)
      : [];

    return NextResponse.json({
      user: {
        id: session.user.userId,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        divisionAccess: session.user.divisionAccess,
        picture: session.user.picture,
      },
      permissions,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}