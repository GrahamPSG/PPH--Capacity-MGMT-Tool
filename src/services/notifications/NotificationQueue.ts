/**
 * NotificationQueue
 *
 * Manages notification queue with priority-based processing, retry logic,
 * rate limiting, and batch optimization
 */

import { prisma } from '@/lib/prisma/client';
import {
  NotificationPriority,
  NotificationStatus,
  QueueStatus,
  INotificationQueue,
} from '@/types/notifications';

interface QueueConfig {
  maxRetries: number;
  retryDelayMinutes: number[];
  batchSize: number;
  rateLimitPerMinute: number;
}

export class NotificationQueue {
  private config: QueueConfig;
  private processing: boolean = false;

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      maxRetries: config?.maxRetries || 3,
      retryDelayMinutes: config?.retryDelayMinutes || [1, 5, 15],
      batchSize: config?.batchSize || 10,
      rateLimitPerMinute: config?.rateLimitPerMinute || 60,
    };
  }

  /**
   * Add a notification to the queue
   */
  async enqueue(
    notificationId: string,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    scheduledFor?: Date
  ): Promise<INotificationQueue> {
    const queueItem = await prisma.notificationQueue.create({
      data: {
        notificationId,
        priority,
        scheduledFor: scheduledFor || new Date(),
        status: QueueStatus.PENDING,
        attemptCount: 0,
        maxAttempts: this.config.maxRetries,
      },
    });

    return queueItem as INotificationQueue;
  }

  /**
   * Get next batch of notifications to process
   */
  async getNextBatch(batchSize?: number): Promise<INotificationQueue[]> {
    const size = batchSize || this.config.batchSize;
    const now = new Date();

    // Get pending items that are due for processing
    const items = await prisma.notificationQueue.findMany({
      where: {
        status: QueueStatus.PENDING,
        scheduledFor: { lte: now },
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: now } },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledFor: 'asc' },
      ],
      take: size,
    });

    return items as INotificationQueue[];
  }

  /**
   * Mark queue item as processing
   */
  async markProcessing(queueId: string): Promise<INotificationQueue> {
    const item = await prisma.notificationQueue.update({
      where: { id: queueId },
      data: {
        status: QueueStatus.PROCESSING,
        attemptCount: { increment: 1 },
      },
    });

    return item as INotificationQueue;
  }

  /**
   * Mark queue item as completed
   */
  async markCompleted(queueId: string): Promise<void> {
    await prisma.notificationQueue.update({
      where: { id: queueId },
      data: {
        status: QueueStatus.COMPLETED,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Mark queue item as failed and schedule retry if applicable
   */
  async markFailed(
    queueId: string,
    error: string
  ): Promise<INotificationQueue> {
    const item = await prisma.notificationQueue.findUnique({
      where: { id: queueId },
    });

    if (!item) {
      throw new Error(`Queue item ${queueId} not found`);
    }

    // Check if we should retry
    const shouldRetry = item.attemptCount < item.maxAttempts;

    if (shouldRetry) {
      const nextRetryAt = this.calculateNextRetryTime(item.attemptCount);

      const updated = await prisma.notificationQueue.update({
        where: { id: queueId },
        data: {
          status: QueueStatus.PENDING,
          nextRetryAt,
          errorLog: error,
        },
      });

      return updated as INotificationQueue;
    } else {
      // Max retries exceeded, mark as failed permanently
      const updated = await prisma.notificationQueue.update({
        where: { id: queueId },
        data: {
          status: QueueStatus.FAILED,
          processedAt: new Date(),
          errorLog: error,
        },
      });

      // Also mark the notification as failed
      await prisma.notification.update({
        where: { id: item.notificationId },
        data: {
          status: NotificationStatus.FAILED,
          failedAt: new Date(),
          errorMessage: error,
        },
      });

      return updated as INotificationQueue;
    }
  }

  /**
   * Calculate next retry time based on attempt count
   */
  private calculateNextRetryTime(attemptCount: number): Date {
    const delayMinutes =
      this.config.retryDelayMinutes[attemptCount] ||
      this.config.retryDelayMinutes[this.config.retryDelayMinutes.length - 1];

    const nextRetryAt = new Date();
    nextRetryAt.setMinutes(nextRetryAt.getMinutes() + delayMinutes);

    return nextRetryAt;
  }

  /**
   * Cancel a queued notification
   */
  async cancel(queueId: string): Promise<void> {
    await prisma.notificationQueue.update({
      where: { id: queueId },
      data: {
        status: QueueStatus.CANCELLED,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
    byPriority: Record<NotificationPriority, number>;
    avgRetryCount: number;
  }> {
    const [pending, processing, completed, failed, cancelled, byPriority, avgRetries] =
      await Promise.all([
        prisma.notificationQueue.count({
          where: { status: QueueStatus.PENDING },
        }),
        prisma.notificationQueue.count({
          where: { status: QueueStatus.PROCESSING },
        }),
        prisma.notificationQueue.count({
          where: { status: QueueStatus.COMPLETED },
        }),
        prisma.notificationQueue.count({
          where: { status: QueueStatus.FAILED },
        }),
        prisma.notificationQueue.count({
          where: { status: QueueStatus.CANCELLED },
        }),
        this.getStatsByPriority(),
        this.getAverageRetryCount(),
      ]);

    return {
      pending,
      processing,
      completed,
      failed,
      cancelled,
      byPriority,
      avgRetryCount: avgRetries,
    };
  }

  /**
   * Get queue statistics by priority
   */
  private async getStatsByPriority(): Promise<
    Record<NotificationPriority, number>
  > {
    const stats = await prisma.notificationQueue.groupBy({
      by: ['priority'],
      _count: true,
      where: {
        status: { in: [QueueStatus.PENDING, QueueStatus.PROCESSING] },
      },
    });

    const result: Record<NotificationPriority, number> = {
      [NotificationPriority.LOW]: 0,
      [NotificationPriority.NORMAL]: 0,
      [NotificationPriority.HIGH]: 0,
      [NotificationPriority.URGENT]: 0,
    };

    stats.forEach((stat) => {
      result[stat.priority as NotificationPriority] = stat._count;
    });

    return result;
  }

  /**
   * Get average retry count
   */
  private async getAverageRetryCount(): Promise<number> {
    const result = await prisma.notificationQueue.aggregate({
      _avg: { attemptCount: true },
      where: {
        status: { in: [QueueStatus.COMPLETED, QueueStatus.FAILED] },
      },
    });

    return result._avg.attemptCount || 0;
  }

  /**
   * Clean up old completed/failed queue items
   */
  async cleanup(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.notificationQueue.deleteMany({
      where: {
        status: { in: [QueueStatus.COMPLETED, QueueStatus.FAILED, QueueStatus.CANCELLED] },
        processedAt: { lte: cutoffDate },
      },
    });

    return result.count;
  }

  /**
   * Get queued notifications for a specific notification ID
   */
  async getByNotificationId(notificationId: string): Promise<INotificationQueue | null> {
    const item = await prisma.notificationQueue.findFirst({
      where: { notificationId },
      orderBy: { createdAt: 'desc' },
    });

    return item as INotificationQueue | null;
  }

  /**
   * Requeue a failed notification
   */
  async requeue(queueId: string, priority?: NotificationPriority): Promise<INotificationQueue> {
    const item = await prisma.notificationQueue.findUnique({
      where: { id: queueId },
    });

    if (!item) {
      throw new Error(`Queue item ${queueId} not found`);
    }

    const updated = await prisma.notificationQueue.update({
      where: { id: queueId },
      data: {
        status: QueueStatus.PENDING,
        priority: priority || item.priority,
        attemptCount: 0,
        nextRetryAt: null,
        scheduledFor: new Date(),
        errorLog: null,
      },
    });

    // Also update the notification status
    await prisma.notification.update({
      where: { id: item.notificationId },
      data: {
        status: NotificationStatus.PENDING,
        errorMessage: null,
      },
    });

    return updated as INotificationQueue;
  }

  /**
   * Get pending count by priority
   */
  async getPendingCountByPriority(
    priority: NotificationPriority
  ): Promise<number> {
    return prisma.notificationQueue.count({
      where: {
        status: QueueStatus.PENDING,
        priority,
      },
    });
  }

  /**
   * Update priority for pending queue items
   */
  async updatePriority(
    queueId: string,
    priority: NotificationPriority
  ): Promise<INotificationQueue> {
    const item = await prisma.notificationQueue.update({
      where: { id: queueId },
      data: { priority },
    });

    return item as INotificationQueue;
  }

  /**
   * Get overdue items (scheduled but not processed)
   */
  async getOverdueItems(): Promise<INotificationQueue[]> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const items = await prisma.notificationQueue.findMany({
      where: {
        status: QueueStatus.PENDING,
        scheduledFor: { lte: oneHourAgo },
      },
      orderBy: [{ priority: 'desc' }, { scheduledFor: 'asc' }],
    });

    return items as INotificationQueue[];
  }

  /**
   * Start queue processing loop
   */
  async startProcessing(
    processor: (items: INotificationQueue[]) => Promise<void>,
    intervalMs: number = 5000
  ): Promise<void> {
    if (this.processing) {
      console.warn('Queue processing is already running');
      return;
    }

    this.processing = true;
    console.log('Starting notification queue processor');

    const processLoop = async () => {
      if (!this.processing) {
        return;
      }

      try {
        const batch = await this.getNextBatch();

        if (batch.length > 0) {
          await processor(batch);
        }
      } catch (error) {
        console.error('Error processing notification queue:', error);
      }

      if (this.processing) {
        setTimeout(processLoop, intervalMs);
      }
    };

    processLoop();
  }

  /**
   * Stop queue processing
   */
  stopProcessing(): void {
    this.processing = false;
    console.log('Stopping notification queue processor');
  }

  /**
   * Check if queue is processing
   */
  isProcessing(): boolean {
    return this.processing;
  }
}

export const notificationQueue = new NotificationQueue();
