/**
 * NotificationService
 *
 * Main service for managing notifications with email, in-app, push, and SMS support
 * Includes real-time updates, batch processing, and notification history tracking
 */

import { prisma } from '@/lib/prisma/client';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  INotification,
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationFilters,
  NotificationResult,
  BulkNotificationResult,
  EmailPayload,
  PushPayload,
  SmsPayload,
  InAppPayload,
} from '@/types/notifications';
import { notificationPreferences } from './NotificationPreferences';
import { notificationQueue } from './NotificationQueue';
import { notificationTemplates } from './NotificationTemplates';
import { EmailProvider } from './providers/EmailProvider';
import { PushProvider } from './providers/PushProvider';
import { SmsProvider } from './providers/SmsProvider';

export class NotificationService {
  private emailProvider: EmailProvider;
  private pushProvider: PushProvider;
  private smsProvider: SmsProvider;

  constructor() {
    this.emailProvider = new EmailProvider();
    this.pushProvider = new PushProvider();
    this.smsProvider = new SmsProvider();
  }

  /**
   * Create and send a notification
   */
  async createNotification(
    data: CreateNotificationDto
  ): Promise<INotification> {
    // Check user preferences
    const shouldReceive = await notificationPreferences.shouldReceiveNotification(
      data.userId,
      data.type,
      data.channel,
      data.priority || NotificationPriority.NORMAL
    );

    if (!shouldReceive) {
      console.log(`Notification skipped due to user preferences: ${data.userId}`);
      return this.createSkippedNotification(data);
    }

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        channel: data.channel,
        priority: data.priority || NotificationPriority.NORMAL,
        title: data.title,
        message: data.message,
        data: data.data || {},
        templateId: data.templateId,
        templateVars: data.templateVars || {},
        status: NotificationStatus.PENDING,
        projectId: data.projectId,
        phaseId: data.phaseId,
        alertId: data.alertId,
        actionUrl: data.actionUrl,
        actionLabel: data.actionLabel,
        expiresAt: data.expiresAt,
      },
    });

    // Add to queue
    await notificationQueue.enqueue(
      notification.id,
      notification.priority as NotificationPriority,
      data.scheduledFor
    );

    // Process immediately for urgent notifications
    if (notification.priority === NotificationPriority.URGENT) {
      await this.sendNotification(notification.id);
    }

    return notification as INotification;
  }

  /**
   * Create a skipped notification record (for audit purposes)
   */
  private async createSkippedNotification(
    data: CreateNotificationDto
  ): Promise<INotification> {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        channel: data.channel,
        priority: data.priority || NotificationPriority.NORMAL,
        title: data.title,
        message: data.message,
        data: data.data || {},
        status: NotificationStatus.CANCELLED,
      },
    });

    return notification as INotification;
  }

  /**
   * Send a notification
   */
  async sendNotification(notificationId: string): Promise<NotificationResult> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: { user: true },
    });

    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    // Update status to sending
    await this.updateNotification(notificationId, {
      status: NotificationStatus.SENDING,
    });

    try {
      let result: NotificationResult;

      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          result = await this.sendEmail(notification);
          break;
        case NotificationChannel.IN_APP:
          result = await this.sendInApp(notification);
          break;
        case NotificationChannel.PUSH:
          result = await this.sendPush(notification);
          break;
        case NotificationChannel.SMS:
          result = await this.sendSms(notification);
          break;
        default:
          throw new Error(`Unsupported channel: ${notification.channel}`);
      }

      // Update notification status
      if (result.success) {
        await this.updateNotification(notificationId, {
          status: NotificationStatus.SENT,
        });
        await prisma.notification.update({
          where: { id: notificationId },
          data: { sentAt: new Date() },
        });
      } else {
        await this.updateNotification(notificationId, {
          status: NotificationStatus.FAILED,
          errorMessage: result.error,
        });
        await prisma.notification.update({
          where: { id: notificationId },
          data: { failedAt: new Date() },
        });
      }

      // Record in history
      await this.recordHistory(notificationId, notification.channel, result);

      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';

      await this.updateNotification(notificationId, {
        status: NotificationStatus.FAILED,
        errorMessage,
      });

      await prisma.notification.update({
        where: { id: notificationId },
        data: { failedAt: new Date() },
      });

      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(notification: any): Promise<NotificationResult> {
    const payload: EmailPayload = {
      to: notification.user.email,
      subject: notification.title,
      text: notification.message,
      html: await this.renderEmailHtml(notification),
    };

    return this.emailProvider.send(payload);
  }

  /**
   * Send in-app notification
   */
  private async sendInApp(notification: any): Promise<NotificationResult> {
    // In-app notifications are already in the database
    // Just mark as sent and emit real-time event if WebSocket is available

    // TODO: Emit WebSocket event for real-time updates
    // io.to(notification.userId).emit('notification', notification);

    return {
      success: true,
      notificationId: notification.id,
      provider: 'in-app',
      timestamp: new Date(),
    };
  }

  /**
   * Send push notification
   */
  private async sendPush(notification: any): Promise<NotificationResult> {
    // Get user's push tokens from preferences or separate table
    const pushToken = await this.getUserPushToken(notification.userId);

    if (!pushToken) {
      return {
        success: false,
        error: 'No push token found for user',
        timestamp: new Date(),
      };
    }

    const payload: PushPayload = {
      token: pushToken,
      title: notification.title,
      body: notification.message,
      data: notification.data,
      clickAction: notification.actionUrl,
      priority: notification.priority === NotificationPriority.URGENT ? 'high' : 'normal',
    };

    return this.pushProvider.send(payload);
  }

  /**
   * Send SMS notification
   */
  private async sendSms(notification: any): Promise<NotificationResult> {
    const phoneNumber = notification.user.phoneNumber;

    if (!phoneNumber) {
      return {
        success: false,
        error: 'No phone number found for user',
        timestamp: new Date(),
      };
    }

    const payload: SmsPayload = {
      to: phoneNumber,
      body: `${notification.title}\n\n${notification.message}`,
    };

    return this.smsProvider.send(payload);
  }

  /**
   * Render email HTML using template
   */
  private async renderEmailHtml(notification: any): Promise<string> {
    if (notification.templateId) {
      const template = await notificationTemplates.getTemplate(
        notification.templateId,
        NotificationChannel.EMAIL
      );

      if (template && template.htmlTemplate) {
        return notificationTemplates.renderTemplate(
          template.htmlTemplate,
          notification.templateVars || {}
        );
      }
    }

    // Default HTML wrapper
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 5px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            ${notification.actionUrl ? `<p><a href="${notification.actionUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">${notification.actionLabel || 'View Details'}</a></p>` : ''}
          </div>
          <div class="footer">
            <p>PPH Capacity Management System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get user's push token
   */
  private async getUserPushToken(userId: string): Promise<string | null> {
    // TODO: Implement push token storage and retrieval
    // This would typically be stored in a separate table or user preferences
    return null;
  }

  /**
   * Record notification attempt in history
   */
  private async recordHistory(
    notificationId: string,
    channel: NotificationChannel,
    result: NotificationResult
  ): Promise<void> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) return;

    await prisma.notificationHistory.create({
      data: {
        notificationId,
        userId: notification.userId,
        channel,
        status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        attemptNumber: notification.retryCount + 1,
        sentAt: result.success ? new Date() : undefined,
        failedAt: !result.success ? new Date() : undefined,
        errorMessage: result.error,
        provider: result.provider,
        providerId: result.messageId,
        metadata: {},
      },
    });
  }

  /**
   * Update notification
   */
  async updateNotification(
    id: string,
    data: UpdateNotificationDto
  ): Promise<INotification> {
    const notification = await prisma.notification.update({
      where: { id },
      data,
    });

    return notification as INotification;
  }

  /**
   * Get notifications with filters
   */
  async getNotifications(
    filters: NotificationFilters
  ): Promise<INotification[]> {
    const notifications = await prisma.notification.findMany({
      where: {
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.type && { type: filters.type }),
        ...(filters.channel && { channel: filters.channel }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.status && { status: filters.status }),
        ...(filters.isRead !== undefined && { isRead: filters.isRead }),
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.phaseId && { phaseId: filters.phaseId }),
        ...(filters.alertId && { alertId: filters.alertId }),
        ...(filters.createdAfter && { createdAt: { gte: filters.createdAfter } }),
        ...(filters.createdBefore && { createdAt: { lte: filters.createdBefore } }),
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: filters.offset || 0,
      take: filters.limit || 50,
    });

    return notifications as INotification[];
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(id: string): Promise<INotification | null> {
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    return notification as INotification | null;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<INotification> {
    const notification = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return notification as INotification;
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(ids: string[]): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string): Promise<void> {
    await prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
        status: { in: [NotificationStatus.SENT, NotificationStatus.DELIVERED] },
      },
    });
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    notifications: CreateNotificationDto[]
  ): Promise<BulkNotificationResult> {
    const results: NotificationResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const notificationData of notifications) {
      try {
        const notification = await this.createNotification(notificationData);
        const result = await this.sendNotification(notification.id);

        results.push(result);

        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error: any) {
        failed++;
        results.push({
          success: false,
          error: error.message || 'Unknown error',
          timestamp: new Date(),
        });
      }
    }

    return {
      totalSent: notifications.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Clean up old notifications
   */
  async cleanup(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: { lte: cutoffDate },
        isRead: true,
      },
    });

    return result.count;
  }
}

export const notificationService = new NotificationService();
