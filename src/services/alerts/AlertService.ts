import { prisma } from '@/lib/prisma/client';
import { AlertMonitor } from './AlertMonitor';
import { AlertRules } from './AlertRules';
import { notificationService } from '@/services/notifications';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '@/types/notifications';

export enum AlertType {
  SCHEDULE_CONFLICT = 'SCHEDULE_CONFLICT',
  CAPACITY_WARNING = 'CAPACITY_WARNING',
  CASH_FLOW_ISSUE = 'CASH_FLOW_ISSUE',
  PROJECT_DELAY = 'PROJECT_DELAY',
  SYNC_FAILURE = 'SYNC_FAILURE',
  MISSING_FOREMAN = 'MISSING_FOREMAN',
  OVER_BUDGET = 'OVER_BUDGET',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  projectId?: string;
  phaseId?: string;
  userId?: string;
  triggerValue?: number;
  threshold?: number;
  isRead: boolean;
  isResolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  metadata?: Record<string, any>;
}

export interface CreateAlertDto {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  projectId?: string;
  phaseId?: string;
  userId?: string;
  triggerValue?: number;
  threshold?: number;
  metadata?: Record<string, any>;
}

export class AlertService {
  private monitor: AlertMonitor;
  private alertRules: AlertRules;

  constructor() {
    this.monitor = new AlertMonitor();
    this.alertRules = new AlertRules();
  }

  /**
   * Create a new alert
   */
  async createAlert(data: CreateAlertDto): Promise<Alert> {
    // Check if similar alert already exists
    const existingAlert = await this.checkDuplicateAlert(data);
    if (existingAlert) {
      return existingAlert;
    }

    // Create the alert
    const alert = await prisma.alert.create({
      data: {
        type: data.type,
        severity: data.severity,
        title: data.title,
        message: data.message,
        projectId: data.projectId,
        phaseId: data.phaseId,
        userId: data.userId,
        triggerValue: data.triggerValue,
        threshold: data.threshold,
      },
    });

    // Send notifications using notification system
    if (data.userId) {
      await this.sendAlertNotification(alert as Alert);
    }

    // Track in monitoring system
    this.monitor.trackAlert(alert as Alert);

    return alert as Alert;
  }

  /**
   * Get all alerts with filters
   */
  async getAlerts(filters: {
    type?: AlertType;
    severity?: AlertSeverity;
    userId?: string;
    projectId?: string;
    isRead?: boolean;
    isResolved?: boolean;
    limit?: number;
  }): Promise<Alert[]> {
    const alerts = await prisma.alert.findMany({
      where: {
        ...(filters.type && { type: filters.type }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.isRead !== undefined && { isRead: filters.isRead }),
        ...(filters.isResolved !== undefined && { isResolved: filters.isResolved }),
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
      take: filters.limit || 100,
      include: {
        project: true,
        phase: true,
        user: true,
      },
    });

    return alerts as any;
  }

  /**
   * Get unread alert count for a user
   */
  async getUnreadCount(userId?: string): Promise<number> {
    const count = await prisma.alert.count({
      where: {
        isRead: false,
        isResolved: false,
        ...(userId && { userId }),
      },
    });

    return count;
  }

  /**
   * Mark alert as read
   */
  async markAsRead(alertId: string): Promise<Alert> {
    const alert = await prisma.alert.update({
      where: { id: alertId },
      data: { isRead: true },
    });

    return alert as Alert;
  }

  /**
   * Mark multiple alerts as read
   */
  async markMultipleAsRead(alertIds: string[]): Promise<void> {
    await prisma.alert.updateMany({
      where: { id: { in: alertIds } },
      data: { isRead: true },
    });
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy: string): Promise<Alert> {
    const alert = await prisma.alert.update({
      where: { id: alertId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      },
    });

    // Stop monitoring if it was being tracked
    this.monitor.stopTracking(alertId);

    return alert as Alert;
  }

  /**
   * Check for duplicate alerts
   */
  private async checkDuplicateAlert(data: CreateAlertDto): Promise<Alert | null> {
    const recentAlert = await prisma.alert.findFirst({
      where: {
        type: data.type,
        projectId: data.projectId,
        phaseId: data.phaseId,
        isResolved: false,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Within last hour
        },
      },
    });

    return recentAlert as Alert | null;
  }

  /**
   * Create capacity warning alert
   */
  async createCapacityWarning(
    division: string,
    date: Date,
    utilizationPercentage: number
  ): Promise<Alert> {
    return this.createAlert({
      type: AlertType.CAPACITY_WARNING,
      severity: utilizationPercentage >= 100 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
      title: `Capacity Warning: ${division}`,
      message: `Division ${division} is at ${utilizationPercentage.toFixed(1)}% capacity on ${date.toDateString()}`,
      triggerValue: utilizationPercentage,
      threshold: 90,
      metadata: { division, date: date.toISOString() },
    });
  }

  /**
   * Create project delay alert
   */
  async createProjectDelayAlert(
    projectId: string,
    projectName: string,
    delayDays: number
  ): Promise<Alert> {
    return this.createAlert({
      type: AlertType.PROJECT_DELAY,
      severity: delayDays > 14 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
      title: `Project Delay: ${projectName}`,
      message: `Project ${projectName} is delayed by ${delayDays} days`,
      projectId,
      triggerValue: delayDays,
      threshold: 7,
    });
  }

  /**
   * Create cash flow issue alert
   */
  async createCashFlowAlert(
    amount: number,
    date: Date,
    reason: string
  ): Promise<Alert> {
    return this.createAlert({
      type: AlertType.CASH_FLOW_ISSUE,
      severity: amount < 0 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
      title: 'Cash Flow Warning',
      message: `${reason}. Projected shortfall of $${Math.abs(amount).toLocaleString()} on ${date.toDateString()}`,
      triggerValue: amount,
      threshold: 0,
      metadata: { date: date.toISOString(), reason },
    });
  }

  /**
   * Create sync failure alert
   */
  async createSyncFailureAlert(
    syncType: string,
    error: string,
    boardId?: string
  ): Promise<Alert> {
    return this.createAlert({
      type: AlertType.SYNC_FAILURE,
      severity: AlertSeverity.MEDIUM,
      title: `Monday.com Sync Failed`,
      message: `${syncType} sync failed: ${error}`,
      metadata: { syncType, error, boardId },
    });
  }

  /**
   * Get alerts summary
   */
  async getAlertsSummary(): Promise<{
    total: number;
    unread: number;
    critical: number;
    byType: Record<string, number>;
    recentAlerts: Alert[];
  }> {
    const [total, unread, critical, byType, recentAlerts] = await Promise.all([
      prisma.alert.count(),
      prisma.alert.count({ where: { isRead: false } }),
      prisma.alert.count({ where: { severity: 'CRITICAL', isResolved: false } }),
      this.getAlertsByType(),
      this.getAlerts({ limit: 5 }),
    ]);

    return {
      total,
      unread,
      critical,
      byType,
      recentAlerts,
    };
  }

  /**
   * Get alerts grouped by type
   */
  private async getAlertsByType(): Promise<Record<string, number>> {
    const alerts = await prisma.alert.groupBy({
      by: ['type'],
      _count: true,
      where: { isResolved: false },
    });

    return alerts.reduce((acc, item) => {
      acc[item.type] = item._count;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Run alert checks
   */
  async runAlertChecks(): Promise<void> {
    // Check capacity alerts
    await this.checkCapacityAlerts();

    // Check project delays
    await this.checkProjectDelays();

    // Check cash flow issues
    await this.checkCashFlowIssues();

    // Check missing foremen
    await this.checkMissingForemen();
  }

  /**
   * Check for capacity alerts
   */
  private async checkCapacityAlerts(): Promise<void> {
    const divisions = [
      'PLUMBING_MULTIFAMILY',
      'PLUMBING_COMMERCIAL',
      'PLUMBING_CUSTOM',
      'HVAC_MULTIFAMILY',
      'HVAC_COMMERCIAL',
      'HVAC_CUSTOM',
    ];

    for (const division of divisions) {
      const utilization = await this.calculateUtilization(division);

      if (utilization > 90) {
        await this.createCapacityWarning(
          division,
          new Date(),
          utilization
        );
      }
    }
  }

  /**
   * Check for project delays
   */
  private async checkProjectDelays(): Promise<void> {
    const projects = await prisma.project.findMany({
      where: {
        status: 'IN_PROGRESS',
        endDate: { lt: new Date() },
        actualEndDate: null,
      },
    });

    for (const project of projects) {
      const delayDays = Math.ceil(
        (new Date().getTime() - project.endDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (delayDays > 0) {
        await this.createProjectDelayAlert(
          project.id,
          project.name,
          delayDays
        );
      }
    }
  }

  /**
   * Check for cash flow issues
   */
  private async checkCashFlowIssues(): Promise<void> {
    // This would integrate with cash flow projection service
    // Simplified for now
    const projectedCashFlow = await this.getProjectedCashFlow();

    if (projectedCashFlow < 0) {
      await this.createCashFlowAlert(
        projectedCashFlow,
        new Date(),
        'Projected negative cash flow'
      );
    }
  }

  /**
   * Check for missing foremen
   */
  private async checkMissingForemen(): Promise<void> {
    const phases = await prisma.projectPhase.findMany({
      where: {
        requiredForeman: true,
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
      },
      include: {
        assignments: {
          include: { employee: true },
        },
      },
    });

    for (const phase of phases) {
      const hasForeman = phase.assignments.some(
        a => a.employee.employeeType === 'FOREMAN' && a.isLead
      );

      if (!hasForeman) {
        await this.createAlert({
          type: AlertType.MISSING_FOREMAN,
          severity: AlertSeverity.HIGH,
          title: `Missing Foreman: ${phase.name}`,
          message: `Phase "${phase.name}" requires a foreman but none is assigned`,
          phaseId: phase.id,
        });
      }
    }
  }

  /**
   * Calculate division utilization
   */
  private async calculateUtilization(division: string): Promise<number> {
    // Simplified calculation - would use CapacityValidator in real implementation
    const employees = await prisma.employee.count({
      where: { division: division as any, isActive: true },
    });

    const assignments = await prisma.crewAssignment.count({
      where: {
        employee: { division: division as any },
        assignmentDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (employees === 0) return 0;
    return (assignments / (employees * 5)) * 100; // 5 days per week
  }

  /**
   * Get projected cash flow (simplified)
   */
  private async getProjectedCashFlow(): Promise<number> {
    // This would integrate with financial services
    // Returning mock value for now
    return 50000;
  }

  /**
   * Send notification for an alert
   */
  private async sendAlertNotification(alert: Alert): Promise<void> {
    const priority = this.mapSeverityToPriority(alert.severity);
    const notificationType = this.mapAlertTypeToNotificationType(alert.type);

    // Determine channels based on severity
    const channels: NotificationChannel[] = [NotificationChannel.IN_APP];

    if (alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.HIGH) {
      channels.push(NotificationChannel.EMAIL);
    }

    if (alert.severity === AlertSeverity.CRITICAL) {
      // For critical alerts, also send push notification if available
      channels.push(NotificationChannel.PUSH);
    }

    // Send notification on each channel
    for (const channel of channels) {
      try {
        await notificationService.createNotification({
          userId: alert.userId!,
          type: notificationType,
          channel,
          priority,
          title: alert.title,
          message: alert.message,
          alertId: alert.id,
          projectId: alert.projectId || undefined,
          phaseId: alert.phaseId || undefined,
          actionUrl: this.getAlertActionUrl(alert),
          actionLabel: 'View Alert',
          data: {
            alertType: alert.type,
            severity: alert.severity,
            triggerValue: alert.triggerValue,
            threshold: alert.threshold,
          },
        });
      } catch (error) {
        console.error(`Failed to send ${channel} notification for alert ${alert.id}:`, error);
      }
    }
  }

  /**
   * Map alert severity to notification priority
   */
  private mapSeverityToPriority(severity: AlertSeverity): NotificationPriority {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return NotificationPriority.URGENT;
      case AlertSeverity.HIGH:
        return NotificationPriority.HIGH;
      case AlertSeverity.MEDIUM:
        return NotificationPriority.NORMAL;
      case AlertSeverity.LOW:
        return NotificationPriority.LOW;
      default:
        return NotificationPriority.NORMAL;
    }
  }

  /**
   * Map alert type to notification type
   */
  private mapAlertTypeToNotificationType(alertType: AlertType): NotificationType {
    switch (alertType) {
      case AlertType.SCHEDULE_CONFLICT:
        return NotificationType.SCHEDULE_CONFLICT;
      case AlertType.CAPACITY_WARNING:
        return NotificationType.CAPACITY_WARNING;
      case AlertType.CASH_FLOW_ISSUE:
        return NotificationType.CASH_FLOW_ALERT;
      case AlertType.PROJECT_DELAY:
      case AlertType.OVER_BUDGET:
        return NotificationType.PROJECT_UPDATE;
      case AlertType.SYNC_FAILURE:
        return NotificationType.MONDAY_SYNC;
      default:
        return NotificationType.ALERT;
    }
  }

  /**
   * Get action URL for alert
   */
  private getAlertActionUrl(alert: Alert): string {
    if (alert.projectId) {
      return `/projects/${alert.projectId}`;
    }
    if (alert.phaseId) {
      return `/phases/${alert.phaseId}`;
    }
    return `/alerts/${alert.id}`;
  }
}