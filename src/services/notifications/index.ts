/**
 * Notification System Exports
 *
 * Central export file for all notification services and utilities
 */

// Main Services
export { NotificationService, notificationService } from './NotificationService';
export { NotificationQueue, notificationQueue } from './NotificationQueue';
export { NotificationTemplates, notificationTemplates } from './NotificationTemplates';
export { NotificationPreferences, notificationPreferences } from './NotificationPreferences';

// Providers
export { EmailProvider } from './providers/EmailProvider';
export { PushProvider } from './providers/PushProvider';
export { SmsProvider } from './providers/SmsProvider';

// Types (re-export for convenience)
export * from '@/types/notifications';
