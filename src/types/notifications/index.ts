/**
 * Notification System Types
 *
 * Comprehensive type definitions for the notification system
 */

import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  QueueStatus,
  DigestFrequency,
} from '@prisma/client';

export {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  QueueStatus,
  DigestFrequency,
};

// ==========================================
// NOTIFICATION INTERFACES
// ==========================================

export interface INotification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  templateId?: string;
  templateVars?: Record<string, any>;
  status: NotificationStatus;
  isRead: boolean;
  readAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  projectId?: string;
  phaseId?: string;
  alertId?: string;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationPreference {
  id: string;
  userId: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  alertNotifications: boolean;
  projectUpdates: boolean;
  phaseUpdates: boolean;
  assignmentChanges: boolean;
  scheduleConflicts: boolean;
  capacityWarnings: boolean;
  cashFlowAlerts: boolean;
  mondaySync: boolean;
  weeklyDigest: boolean;
  digestFrequency: DigestFrequency;
  quietHoursStart?: number;
  quietHoursEnd?: number;
  quietHoursEnabled: boolean;
  minimumPriority: NotificationPriority;
  batchNotifications: boolean;
  batchWindowMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationHistory {
  id: string;
  notificationId: string;
  userId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  attemptNumber: number;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  provider?: string;
  providerId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface INotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  bodyTemplate: string;
  htmlTemplate?: string;
  variables: string[];
  language: string;
  isActive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationQueue {
  id: string;
  notificationId: string;
  priority: NotificationPriority;
  scheduledFor: Date;
  processedAt?: Date;
  status: QueueStatus;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  errorLog?: string;
  createdAt: Date;
}

// ==========================================
// DTO (Data Transfer Objects)
// ==========================================

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority?: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  templateId?: string;
  templateVars?: Record<string, any>;
  projectId?: string;
  phaseId?: string;
  alertId?: string;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: Date;
  scheduledFor?: Date;
}

export interface UpdateNotificationDto {
  status?: NotificationStatus;
  isRead?: boolean;
  errorMessage?: string;
  retryCount?: number;
}

export interface CreateNotificationPreferenceDto {
  userId: string;
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  pushEnabled?: boolean;
  smsEnabled?: boolean;
  alertNotifications?: boolean;
  projectUpdates?: boolean;
  phaseUpdates?: boolean;
  assignmentChanges?: boolean;
  scheduleConflicts?: boolean;
  capacityWarnings?: boolean;
  cashFlowAlerts?: boolean;
  mondaySync?: boolean;
  weeklyDigest?: boolean;
  digestFrequency?: DigestFrequency;
  quietHoursStart?: number;
  quietHoursEnd?: number;
  quietHoursEnabled?: boolean;
  minimumPriority?: NotificationPriority;
  batchNotifications?: boolean;
  batchWindowMinutes?: number;
}

export interface UpdateNotificationPreferenceDto extends Partial<CreateNotificationPreferenceDto> {}

export interface CreateNotificationTemplateDto {
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  bodyTemplate: string;
  htmlTemplate?: string;
  variables: string[];
  language?: string;
  isActive?: boolean;
  description?: string;
}

export interface UpdateNotificationTemplateDto extends Partial<CreateNotificationTemplateDto> {}

// ==========================================
// QUERY FILTERS
// ==========================================

export interface NotificationFilters {
  userId?: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
  status?: NotificationStatus;
  isRead?: boolean;
  projectId?: string;
  phaseId?: string;
  alertId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface NotificationHistoryFilters {
  notificationId?: string;
  userId?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  provider?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

// ==========================================
// NOTIFICATION PAYLOAD TYPES
// ==========================================

export interface EmailPayload {
  to: string | string[];
  from?: string;
  subject: string;
  text: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: {
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }[];
}

export interface PushPayload {
  token: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  icon?: string;
  badge?: string;
  sound?: string;
  clickAction?: string;
  priority?: 'normal' | 'high';
}

export interface SmsPayload {
  to: string | string[];
  body: string;
  from?: string;
}

export interface InAppPayload {
  userId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
}

// ==========================================
// NOTIFICATION RESULT TYPES
// ==========================================

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  messageId?: string;
  provider?: string;
  timestamp: Date;
  error?: string;
}

export interface BulkNotificationResult {
  totalSent: number;
  successful: number;
  failed: number;
  results: NotificationResult[];
}

// ==========================================
// DIGEST & BATCH TYPES
// ==========================================

export interface DigestNotification {
  userId: string;
  frequency: DigestFrequency;
  notifications: INotification[];
  summary: {
    total: number;
    byType: Record<NotificationType, number>;
    bySeverity: Record<NotificationPriority, number>;
  };
  generatedAt: Date;
}

export interface BatchNotification {
  userId: string;
  notifications: INotification[];
  batchedAt: Date;
  windowMinutes: number;
}

// ==========================================
// PROVIDER INTERFACES
// ==========================================

export interface INotificationProvider {
  name: string;
  send(payload: any): Promise<NotificationResult>;
  sendBulk?(payloads: any[]): Promise<BulkNotificationResult>;
  verify?(): Promise<boolean>;
}

export interface IEmailProvider extends INotificationProvider {
  send(payload: EmailPayload): Promise<NotificationResult>;
  sendBulk(payloads: EmailPayload[]): Promise<BulkNotificationResult>;
}

export interface IPushProvider extends INotificationProvider {
  send(payload: PushPayload): Promise<NotificationResult>;
  sendBulk(payloads: PushPayload[]): Promise<BulkNotificationResult>;
}

export interface ISmsProvider extends INotificationProvider {
  send(payload: SmsPayload): Promise<NotificationResult>;
  sendBulk(payloads: SmsPayload[]): Promise<BulkNotificationResult>;
}

// ==========================================
// TEMPLATE VARIABLE TYPES
// ==========================================

export interface AlertNotificationVars {
  alertType: string;
  severity: string;
  title: string;
  message: string;
  projectName?: string;
  phaseName?: string;
  actionUrl?: string;
  timestamp: string;
}

export interface ProjectUpdateVars {
  projectName: string;
  projectCode: string;
  updateType: string;
  changes: string;
  updatedBy: string;
  timestamp: string;
  projectUrl?: string;
}

export interface PhaseUpdateVars {
  phaseName: string;
  projectName: string;
  updateType: string;
  progress?: number;
  status?: string;
  updatedBy: string;
  timestamp: string;
  phaseUrl?: string;
}

export interface AssignmentChangeVars {
  employeeName: string;
  phaseName: string;
  projectName: string;
  changeType: string;
  date: string;
  hours?: number;
  assignmentUrl?: string;
}

export interface ScheduleConflictVars {
  employeeName: string;
  conflictDate: string;
  projects: string[];
  conflictType: string;
  resolutionUrl?: string;
}

export interface CapacityWarningVars {
  division: string;
  utilizationPercentage: number;
  availableHours: number;
  scheduledHours: number;
  date: string;
  dashboardUrl?: string;
}

export interface CashFlowAlertVars {
  amount: number;
  date: string;
  reason: string;
  projectName?: string;
  reportUrl?: string;
}

export interface WeeklyDigestVars {
  userName: string;
  weekStart: string;
  weekEnd: string;
  summary: {
    projectsActive: number;
    phasesCompleted: number;
    hoursScheduled: number;
    alertsGenerated: number;
  };
  highlights: string[];
  upcomingDeadlines: {
    project: string;
    deadline: string;
    daysRemaining: number;
  }[];
}

// ==========================================
// UTILITY TYPES
// ==========================================

export type NotificationTypeMapping = {
  [key in NotificationType]: {
    defaultPriority: NotificationPriority;
    defaultChannels: NotificationChannel[];
    requiresAction: boolean;
    expiresInHours?: number;
  };
};

export type ChannelConfig = {
  [key in NotificationChannel]: {
    enabled: boolean;
    provider?: string;
    rateLimitPerMinute?: number;
    batchSize?: number;
  };
};
