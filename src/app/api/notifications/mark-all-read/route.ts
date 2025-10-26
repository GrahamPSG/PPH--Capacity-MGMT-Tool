/**
 * Mark All Read API Route
 *
 * POST /api/notifications/mark-all-read - Mark all notifications as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth/session';
import { notificationService } from '@/services/notifications/NotificationService';

/**
 * POST /api/notifications/mark-all-read - Mark all notifications as read
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession(req, NextResponse.next());
    if (!session || !session.user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await notificationService.markAllAsRead(session.user.userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error marking all as read:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark all as read' },
      { status: 500 }
    );
  }
}
