/**
 * Notification Detail API Routes
 *
 * GET    /api/notifications/[id] - Get a notification by ID
 * PUT    /api/notifications/[id]/mark-read - Mark notification as read
 * DELETE /api/notifications/[id] - Delete a notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth/session';
import { notificationService } from '@/services/notifications/NotificationService';

/**
 * GET /api/notifications/[id] - Get a notification by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getUserSession(req, NextResponse.next());
    if (!session || !session.user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notification = await notificationService.getNotificationById(params.id);

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Ensure user can only access their own notifications
    if (notification.userId !== session.user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(notification);
  } catch (error: any) {
    console.error('Error fetching notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notification' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/[id] - Mark notification as read
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

    // Check if notification exists and belongs to user
    const existing = await notificationService.getNotificationById(params.id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (existing.userId !== session.user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const notification = await notificationService.markAsRead(params.id);

    return NextResponse.json(notification);
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/[id] - Delete a notification
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

    // Check if notification exists and belongs to user
    const existing = await notificationService.getNotificationById(params.id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (existing.userId !== session.user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await notificationService.deleteNotification(params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
