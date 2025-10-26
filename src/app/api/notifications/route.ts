/**
 * Notifications API Routes
 *
 * GET  /api/notifications - Get user's notifications
 * POST /api/notifications/send - Send a new notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth/session';
import { notificationService } from '@/services/notifications/NotificationService';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  CreateNotificationDto,
} from '@/types/notifications';
import { UserRole } from '@prisma/client';

/**
 * GET /api/notifications - Get user's notifications
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession(req, NextResponse.next());
    if (!session || !session.user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const filters = {
      userId: session.user.userId,
      type: searchParams.get('type') as NotificationType | undefined,
      channel: searchParams.get('channel') as NotificationChannel | undefined,
      priority: searchParams.get('priority') as NotificationPriority | undefined,
      status: searchParams.get('status') as NotificationStatus | undefined,
      isRead: searchParams.get('isRead') === 'true' ? true :
              searchParams.get('isRead') === 'false' ? false : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    const notifications = await notificationService.getNotifications(filters);

    return NextResponse.json({
      notifications,
      count: notifications.length,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/send - Send a new notification
 * Requires Manager+ role
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession(req, NextResponse.next());
    if (!session || !session.user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only Manager+ can send notifications manually
    if (
      ![UserRole.OWNER, UserRole.MANAGER, UserRole.PROJECT_MANAGER].includes(
        session.user.role!
      )
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    const notificationData: CreateNotificationDto = {
      userId: body.userId,
      type: body.type,
      channel: body.channel,
      priority: body.priority,
      title: body.title,
      message: body.message,
      data: body.data,
      templateId: body.templateId,
      templateVars: body.templateVars,
      projectId: body.projectId,
      phaseId: body.phaseId,
      alertId: body.alertId,
      actionUrl: body.actionUrl,
      actionLabel: body.actionLabel,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
    };

    const notification = await notificationService.createNotification(notificationData);

    return NextResponse.json(notification, { status: 201 });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}
