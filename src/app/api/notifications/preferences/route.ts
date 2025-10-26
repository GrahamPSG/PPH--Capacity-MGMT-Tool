/**
 * Notification Preferences API Routes
 *
 * GET /api/notifications/preferences - Get user's notification preferences
 * PUT /api/notifications/preferences - Update user's notification preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth/session';
import { notificationPreferences } from '@/services/notifications/NotificationPreferences';
import { UpdateNotificationPreferenceDto } from '@/types/notifications';

/**
 * GET /api/notifications/preferences - Get user's notification preferences
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession(req, NextResponse.next());
    if (!session || !session.user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await notificationPreferences.getPreferences(
      session.user.userId
    );

    return NextResponse.json(preferences);
  } catch (error: any) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/preferences - Update user's notification preferences
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getUserSession(req, NextResponse.next());
    if (!session || !session.user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const updateData: UpdateNotificationPreferenceDto = {
      emailEnabled: body.emailEnabled,
      inAppEnabled: body.inAppEnabled,
      pushEnabled: body.pushEnabled,
      smsEnabled: body.smsEnabled,
      alertNotifications: body.alertNotifications,
      projectUpdates: body.projectUpdates,
      phaseUpdates: body.phaseUpdates,
      assignmentChanges: body.assignmentChanges,
      scheduleConflicts: body.scheduleConflicts,
      capacityWarnings: body.capacityWarnings,
      cashFlowAlerts: body.cashFlowAlerts,
      mondaySync: body.mondaySync,
      weeklyDigest: body.weeklyDigest,
      digestFrequency: body.digestFrequency,
      quietHoursStart: body.quietHoursStart,
      quietHoursEnd: body.quietHoursEnd,
      quietHoursEnabled: body.quietHoursEnabled,
      minimumPriority: body.minimumPriority,
      batchNotifications: body.batchNotifications,
      batchWindowMinutes: body.batchWindowMinutes,
    };

    const preferences = await notificationPreferences.updatePreferences(
      session.user.userId,
      updateData
    );

    return NextResponse.json(preferences);
  } catch (error: any) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
