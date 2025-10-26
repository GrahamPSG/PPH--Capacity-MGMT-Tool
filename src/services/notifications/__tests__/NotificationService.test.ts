/**
 * NotificationService Tests
 */

import { NotificationService } from '../NotificationService';
import { notificationPreferences } from '../NotificationPreferences';
import { notificationQueue } from '../NotificationQueue';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  CreateNotificationDto,
} from '@/types/notifications';

// Mock Prisma client
jest.mock('@/lib/prisma/client', () => ({
  prisma: {
    notification: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    notificationHistory: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../NotificationPreferences');
jest.mock('../NotificationQueue');
jest.mock('../NotificationTemplates');

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification when user preferences allow', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1',
        type: NotificationType.ALERT,
        channel: NotificationChannel.EMAIL,
        priority: NotificationPriority.HIGH,
        title: 'Test Alert',
        message: 'Test message',
        status: 'PENDING',
        isRead: false,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (notificationPreferences.shouldReceiveNotification as jest.Mock).mockResolvedValue(
        true
      );
      (notificationQueue.enqueue as jest.Mock).mockResolvedValue({});

      const { prisma } = require('@/lib/prisma/client');
      prisma.notification.create.mockResolvedValue(mockNotification);

      const data: CreateNotificationDto = {
        userId: 'user-1',
        type: NotificationType.ALERT,
        channel: NotificationChannel.EMAIL,
        priority: NotificationPriority.HIGH,
        title: 'Test Alert',
        message: 'Test message',
      };

      const result = await service.createNotification(data);

      expect(result).toEqual(mockNotification);
      expect(prisma.notification.create).toHaveBeenCalled();
      expect(notificationQueue.enqueue).toHaveBeenCalledWith(
        'notif-1',
        NotificationPriority.HIGH,
        undefined
      );
    });

    it('should skip notification when user preferences do not allow', async () => {
      (notificationPreferences.shouldReceiveNotification as jest.Mock).mockResolvedValue(
        false
      );

      const { prisma } = require('@/lib/prisma/client');
      const mockSkippedNotification = {
        id: 'notif-2',
        status: 'CANCELLED',
      };
      prisma.notification.create.mockResolvedValue(mockSkippedNotification);

      const data: CreateNotificationDto = {
        userId: 'user-1',
        type: NotificationType.WEEKLY_DIGEST,
        channel: NotificationChannel.EMAIL,
        title: 'Weekly Digest',
        message: 'Your weekly summary',
      };

      const result = await service.createNotification(data);

      expect(result.status).toBe('CANCELLED');
      expect(notificationQueue.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('getNotifications', () => {
    it('should fetch notifications with filters', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: NotificationType.ALERT,
          isRead: false,
        },
        {
          id: 'notif-2',
          userId: 'user-1',
          type: NotificationType.PROJECT_UPDATE,
          isRead: false,
        },
      ];

      const { prisma } = require('@/lib/prisma/client');
      prisma.notification.findMany.mockResolvedValue(mockNotifications);

      const filters = {
        userId: 'user-1',
        isRead: false,
        limit: 10,
      };

      const result = await service.getNotifications(filters);

      expect(result).toEqual(mockNotifications);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            isRead: false,
          }),
        })
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const mockNotification = {
        id: 'notif-1',
        isRead: true,
        readAt: new Date(),
      };

      const { prisma } = require('@/lib/prisma/client');
      prisma.notification.update.mockResolvedValue(mockNotification);

      const result = await service.markAsRead('notif-1');

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for a user', async () => {
      const { prisma } = require('@/lib/prisma/client');
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      await service.markAllAsRead('user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      const { prisma } = require('@/lib/prisma/client');
      prisma.notification.count.mockResolvedValue(7);

      const count = await service.getUnreadCount('user-1');

      expect(count).toBe(7);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          isRead: false,
          status: { in: ['SENT', 'DELIVERED'] },
        },
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      const { prisma } = require('@/lib/prisma/client');
      prisma.notification.delete.mockResolvedValue({ id: 'notif-1' });

      await service.deleteNotification('notif-1');

      expect(prisma.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
      });
    });
  });

  describe('cleanup', () => {
    it('should delete old read notifications', async () => {
      const { prisma } = require('@/lib/prisma/client');
      prisma.notification.deleteMany.mockResolvedValue({ count: 15 });

      const count = await service.cleanup(30);

      expect(count).toBe(15);
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lte: expect.any(Date) },
          isRead: true,
        },
      });
    });
  });
});
