import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/users/UserService';
import { getUserSession } from '@/lib/auth/session';
import { UserRole, Division } from '@prisma/client';

/**
 * GET /api/users - List all users with filters
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession(req, NextResponse.next());
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filters = {
      role: searchParams.get('role') as UserRole | undefined,
      division: searchParams.get('division') as Division | undefined,
      isActive: searchParams.get('isActive') === 'true' ? true :
                searchParams.get('isActive') === 'false' ? false : undefined,
      search: searchParams.get('search') || undefined,
    };

    const users = await UserService.getUsers(filters);
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users - Create new user (Manager+ only)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession(req, NextResponse.next());
    if (!session || !session.user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create users
    if (![UserRole.OWNER, UserRole.MANAGER].includes(session.user.role!)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await req.json();
    const user = await UserService.createUser(data, session.user.userId);

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 400 }
    );
  }
}