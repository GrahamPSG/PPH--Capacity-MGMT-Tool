/**
 * Unread Count API Route
 *
 * GET /api/notifications/unread-count - Get count of unread notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth/session';
import { notificationService } from '@/services/notifications/NotificationService';

/**
 * GET /api/notifications/unread-count - Get unread notification count
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession(req, NextResponse.next());
    if (!session || !session.user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await notificationService.getUnreadCount(session.user.userId);

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch unread count' },
      { status: 500 }
    );
  }
}
