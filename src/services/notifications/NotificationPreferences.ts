/**
 * NotificationPreferences
 *
 * Manages user notification preferences and settings
 */

import { prisma } from '@/lib/prisma/client';
import {
  INotificationPreference,
  CreateNotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
  NotificationChannel,
  NotificationType,
  NotificationPriority,
} from '@/types/notifications';

export class NotificationPreferences {
  /**
   * Get user's notification preferences
   */
  async getPreferences(userId: string): Promise<INotificationPreference> {
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    return preferences as INotificationPreference;
  }

  /**
   * Create default notification preferences for a new user
   */
  async createDefaultPreferences(
    userId: string
  ): Promise<INotificationPreference> {
    const preferences = await prisma.notificationPreference.create({
      data: {
        userId,
        emailEnabled: true,
        inAppEnabled: true,
        pushEnabled: false,
        smsEnabled: false,
        alertNotifications: true,
        projectUpdates: true,
        phaseUpdates: true,
        assignmentChanges: true,
        scheduleConflicts: true,
        capacityWarnings: true,
        cashFlowAlerts: true,
        mondaySync: false,
        weeklyDigest: true,
        digestFrequency: 'WEEKLY',
        quietHoursEnabled: false,
        minimumPriority: 'NORMAL',
        batchNotifications: false,
        batchWindowMinutes: 15,
      },
    });

    return preferences as INotificationPreference;
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(
    userId: string,
    data: UpdateNotificationPreferenceDto
  ): Promise<INotificationPreference> {
    // Ensure preferences exist
    await this.getPreferences(userId);

    const preferences = await prisma.notificationPreference.update({
      where: { userId },
      data,
    });

    return preferences as INotificationPreference;
  }

  /**
   * Check if a user should receive a notification based on their preferences
   */
  async shouldReceiveNotification(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
    priority: NotificationPriority
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    // Check if channel is enabled
    if (!this.isChannelEnabled(preferences, channel)) {
      return false;
    }

    // Check if notification type is enabled
    if (!this.isTypeEnabled(preferences, type)) {
      return false;
    }

    // Check priority threshold
    if (!this.meetsPriorityThreshold(preferences, priority)) {
      return false;
    }

    // Check quiet hours
    if (this.isInQuietHours(preferences)) {
      // Allow urgent notifications during quiet hours
      return priority === NotificationPriority.URGENT;
    }

    return true;
  }

  /**
   * Check if a specific channel is enabled
   */
  private isChannelEnabled(
    preferences: INotificationPreference,
    channel: NotificationChannel
  ): boolean {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return preferences.emailEnabled;
      case NotificationChannel.IN_APP:
        return preferences.inAppEnabled;
      case NotificationChannel.PUSH:
        return preferences.pushEnabled;
      case NotificationChannel.SMS:
        return preferences.smsEnabled;
      default:
        return false;
    }
  }

  /**
   * Check if a specific notification type is enabled
   */
  private isTypeEnabled(
    preferences: INotificationPreference,
    type: NotificationType
  ): boolean {
    switch (type) {
      case NotificationType.ALERT:
        return preferences.alertNotifications;
      case NotificationType.PROJECT_UPDATE:
        return preferences.projectUpdates;
      case NotificationType.PHASE_UPDATE:
        return preferences.phaseUpdates;
      case NotificationType.ASSIGNMENT_CHANGE:
        return preferences.assignmentChanges;
      case NotificationType.SCHEDULE_CONFLICT:
        return preferences.scheduleConflicts;
      case NotificationType.CAPACITY_WARNING:
        return preferences.capacityWarnings;
      case NotificationType.CASH_FLOW_ALERT:
        return preferences.cashFlowAlerts;
      case NotificationType.MONDAY_SYNC:
        return preferences.mondaySync;
      case NotificationType.WEEKLY_DIGEST:
        return preferences.weeklyDigest;
      case NotificationType.SYSTEM_MESSAGE:
      case NotificationType.REMINDER:
        return true; // Always send system messages and reminders
      default:
        return true;
    }
  }

  /**
   * Check if notification meets the minimum priority threshold
   */
  private meetsPriorityThreshold(
    preferences: INotificationPreference,
    priority: NotificationPriority
  ): boolean {
    const priorityLevels = {
      [NotificationPriority.LOW]: 0,
      [NotificationPriority.NORMAL]: 1,
      [NotificationPriority.HIGH]: 2,
      [NotificationPriority.URGENT]: 3,
    };

    const notificationLevel = priorityLevels[priority];
    const thresholdLevel = priorityLevels[preferences.minimumPriority];

    return notificationLevel >= thresholdLevel;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(preferences: INotificationPreference): boolean {
    if (!preferences.quietHoursEnabled) {
      return false;
    }

    if (
      preferences.quietHoursStart === null ||
      preferences.quietHoursStart === undefined ||
      preferences.quietHoursEnd === null ||
      preferences.quietHoursEnd === undefined
    ) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();

    const start = preferences.quietHoursStart;
    const end = preferences.quietHoursEnd;

    // Handle cases where quiet hours span midnight
    if (start < end) {
      return currentHour >= start && currentHour < end;
    } else {
      return currentHour >= start || currentHour < end;
    }
  }

  /**
   * Check if user wants batched notifications
   */
  async shouldBatchNotifications(userId: string): Promise<{
    enabled: boolean;
    windowMinutes: number;
  }> {
    const preferences = await this.getPreferences(userId);

    return {
      enabled: preferences.batchNotifications,
      windowMinutes: preferences.batchWindowMinutes,
    };
  }

  /**
   * Get enabled channels for a user
   */
  async getEnabledChannels(userId: string): Promise<NotificationChannel[]> {
    const preferences = await this.getPreferences(userId);
    const channels: NotificationChannel[] = [];

    if (preferences.emailEnabled) {
      channels.push(NotificationChannel.EMAIL);
    }
    if (preferences.inAppEnabled) {
      channels.push(NotificationChannel.IN_APP);
    }
    if (preferences.pushEnabled) {
      channels.push(NotificationChannel.PUSH);
    }
    if (preferences.smsEnabled) {
      channels.push(NotificationChannel.SMS);
    }

    return channels;
  }

  /**
   * Enable or disable a specific channel
   */
  async toggleChannel(
    userId: string,
    channel: NotificationChannel,
    enabled: boolean
  ): Promise<INotificationPreference> {
    const updateData: UpdateNotificationPreferenceDto = {};

    switch (channel) {
      case NotificationChannel.EMAIL:
        updateData.emailEnabled = enabled;
        break;
      case NotificationChannel.IN_APP:
        updateData.inAppEnabled = enabled;
        break;
      case NotificationChannel.PUSH:
        updateData.pushEnabled = enabled;
        break;
      case NotificationChannel.SMS:
        updateData.smsEnabled = enabled;
        break;
    }

    return this.updatePreferences(userId, updateData);
  }

  /**
   * Set quiet hours
   */
  async setQuietHours(
    userId: string,
    startHour: number,
    endHour: number,
    enabled: boolean = true
  ): Promise<INotificationPreference> {
    // Validate hours
    if (
      startHour < 0 ||
      startHour > 23 ||
      endHour < 0 ||
      endHour > 23
    ) {
      throw new Error('Hours must be between 0 and 23');
    }

    return this.updatePreferences(userId, {
      quietHoursStart: startHour,
      quietHoursEnd: endHour,
      quietHoursEnabled: enabled,
    });
  }

  /**
   * Disable quiet hours
   */
  async disableQuietHours(userId: string): Promise<INotificationPreference> {
    return this.updatePreferences(userId, {
      quietHoursEnabled: false,
    });
  }

  /**
   * Set digest frequency
   */
  async setDigestFrequency(
    userId: string,
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'NEVER'
  ): Promise<INotificationPreference> {
    return this.updatePreferences(userId, {
      digestFrequency: frequency,
      weeklyDigest: frequency !== 'NEVER',
    });
  }

  /**
   * Set minimum priority
   */
  async setMinimumPriority(
    userId: string,
    priority: NotificationPriority
  ): Promise<INotificationPreference> {
    return this.updatePreferences(userId, {
      minimumPriority: priority,
    });
  }

  /**
   * Enable or disable batched notifications
   */
  async setBatchNotifications(
    userId: string,
    enabled: boolean,
    windowMinutes?: number
  ): Promise<INotificationPreference> {
    const updateData: UpdateNotificationPreferenceDto = {
      batchNotifications: enabled,
    };

    if (windowMinutes !== undefined) {
      if (windowMinutes < 5 || windowMinutes > 120) {
        throw new Error('Batch window must be between 5 and 120 minutes');
      }
      updateData.batchWindowMinutes = windowMinutes;
    }

    return this.updatePreferences(userId, updateData);
  }

  /**
   * Bulk update notification type preferences
   */
  async bulkUpdateTypePreferences(
    userId: string,
    preferences: {
      alertNotifications?: boolean;
      projectUpdates?: boolean;
      phaseUpdates?: boolean;
      assignmentChanges?: boolean;
      scheduleConflicts?: boolean;
      capacityWarnings?: boolean;
      cashFlowAlerts?: boolean;
      mondaySync?: boolean;
      weeklyDigest?: boolean;
    }
  ): Promise<INotificationPreference> {
    return this.updatePreferences(userId, preferences);
  }

  /**
   * Reset preferences to defaults
   */
  async resetToDefaults(userId: string): Promise<INotificationPreference> {
    await prisma.notificationPreference.delete({
      where: { userId },
    });

    return this.createDefaultPreferences(userId);
  }
}

export const notificationPreferences = new NotificationPreferences();
