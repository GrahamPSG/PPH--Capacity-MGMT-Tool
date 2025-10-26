/**
 * Bulk Send API Route
 *
 * POST /api/notifications/bulk-send - Send notifications to multiple users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth/session';
import { notificationService } from '@/services/notifications/NotificationService';
import { CreateNotificationDto } from '@/types/notifications';
import { UserRole } from '@prisma/client';

/**
 * POST /api/notifications/bulk-send - Send bulk notifications
 * Requires Owner or Manager role
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession(req, NextResponse.next());
    if (!session || !session.user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only Owner/Manager can send bulk notifications
    if (![UserRole.OWNER, UserRole.MANAGER].includes(session.user.role!)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    if (!Array.isArray(body.notifications) || body.notifications.length === 0) {
      return NextResponse.json(
        { error: 'notifications array is required' },
        { status: 400 }
      );
    }

    // Limit bulk sends to prevent abuse
    if (body.notifications.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 notifications per bulk send' },
        { status: 400 }
      );
    }

    const notifications: CreateNotificationDto[] = body.notifications.map(
      (notif: any) => ({
        userId: notif.userId,
        type: notif.type,
        channel: notif.channel,
        priority: notif.priority,
        title: notif.title,
        message: notif.message,
        data: notif.data,
        templateId: notif.templateId,
        templateVars: notif.templateVars,
        projectId: notif.projectId,
        phaseId: notif.phaseId,
        alertId: notif.alertId,
        actionUrl: notif.actionUrl,
        actionLabel: notif.actionLabel,
        expiresAt: notif.expiresAt ? new Date(notif.expiresAt) : undefined,
        scheduledFor: notif.scheduledFor
          ? new Date(notif.scheduledFor)
          : undefined,
      })
    );

    const result = await notificationService.sendBulkNotifications(notifications);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error sending bulk notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send bulk notifications' },
      { status: 500 }
    );
  }
}
