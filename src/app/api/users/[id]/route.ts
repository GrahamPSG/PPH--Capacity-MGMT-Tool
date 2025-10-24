import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/users/UserService';
import { getUserSession } from '@/lib/auth/session';
import { UserRole } from '@prisma/client';

/**
 * GET /api/users/[id] - Get user by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getUserSession(req, NextResponse.next());
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserService.getUserById(params.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Users can view their own profile, managers can view all
    const canView =
      user.id === session.user.userId ||
      [UserRole.OWNER, UserRole.MANAGER].includes(session.user.role!);

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/[id] - Update user (Manager+ only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getUserSession(req, NextResponse.next());
    if (!session || !session.user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission
    if (![UserRole.OWNER, UserRole.MANAGER].includes(session.user.role!)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await req.json();
    const user = await UserService.updateUser(params.id, data, session.user.userId);

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/users/[id] - Soft delete user (Owner only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getUserSession(req, NextResponse.next());
    if (!session || !session.user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners can delete users
    if (session.user.role !== UserRole.OWNER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await UserService.deleteUser(params.id, session.user.userId);

    return NextResponse.json({ message: 'User deactivated' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 400 }
    );
  }
}