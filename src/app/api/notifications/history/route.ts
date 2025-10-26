/**
 * Notification History API Routes
 *
 * GET /api/notifications/history - Get notification history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma/client';
import {
  NotificationChannel,
  NotificationStatus,
} from '@/types/notifications';
import { UserRole } from '@prisma/client';

/**
 * GET /api/notifications/history - Get notification history
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession(req, NextResponse.next());
    if (!session || !session.user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    // Only allow managers and above to see all history
    const isManager = [UserRole.OWNER, UserRole.MANAGER].includes(
      session.user.role!
    );

    const filters: any = {
      ...(isManager && searchParams.get('userId')
        ? { userId: searchParams.get('userId') }
        : { userId: session.user.userId }),
      ...(searchParams.get('notificationId') && {
        notificationId: searchParams.get('notificationId'),
      }),
      ...(searchParams.get('channel') && {
        channel: searchParams.get('channel') as NotificationChannel,
      }),
      ...(searchParams.get('status') && {
        status: searchParams.get('status') as NotificationStatus,
      }),
      ...(searchParams.get('provider') && {
        provider: searchParams.get('provider'),
      }),
    };

    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 100;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0;

    const history = await prisma.notificationHistory.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({
      history,
      count: history.length,
    });
  } catch (error: any) {
    console.error('Error fetching notification history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
