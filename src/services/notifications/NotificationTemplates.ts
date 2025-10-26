/**
 * NotificationTemplates
 *
 * Manages notification templates with variable substitution and multi-language support
 */

import { prisma } from '@/lib/prisma/client';
import {
  NotificationType,
  NotificationChannel,
  INotificationTemplate,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
} from '@/types/notifications';

export class NotificationTemplates {
  /**
   * Get a template by name
   */
  async getTemplate(
    name: string,
    channel: NotificationChannel,
    language: string = 'en'
  ): Promise<INotificationTemplate | null> {
    const template = await prisma.notificationTemplate.findFirst({
      where: {
        name,
        channel,
        language,
        isActive: true,
      },
    });

    return template as INotificationTemplate | null;
  }

  /**
   * Get all templates by type
   */
  async getTemplatesByType(
    type: NotificationType,
    channel?: NotificationChannel
  ): Promise<INotificationTemplate[]> {
    const templates = await prisma.notificationTemplate.findMany({
      where: {
        type,
        ...(channel && { channel }),
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return templates as INotificationTemplate[];
  }

  /**
   * Create a new template
   */
  async createTemplate(
    data: CreateNotificationTemplateDto
  ): Promise<INotificationTemplate> {
    const template = await prisma.notificationTemplate.create({
      data: {
        name: data.name,
        type: data.type,
        channel: data.channel,
        subject: data.subject,
        bodyTemplate: data.bodyTemplate,
        htmlTemplate: data.htmlTemplate,
        variables: data.variables,
        language: data.language || 'en',
        isActive: data.isActive !== undefined ? data.isActive : true,
        description: data.description,
      },
    });

    return template as INotificationTemplate;
  }

  /**
   * Update a template
   */
  async updateTemplate(
    id: string,
    data: UpdateNotificationTemplateDto
  ): Promise<INotificationTemplate> {
    const template = await prisma.notificationTemplate.update({
      where: { id },
      data,
    });

    return template as INotificationTemplate;
  }

  /**
   * Delete a template (soft delete by deactivating)
   */
  async deleteTemplate(id: string): Promise<void> {
    await prisma.notificationTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Render a template with variables
   */
  renderTemplate(
    template: string,
    variables: Record<string, any>
  ): string {
    let rendered = template;

    // Replace {{variable}} patterns
    Object.keys(variables).forEach((key) => {
      const value = variables[key];
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    });

    // Handle conditional blocks {{#if variable}}...{{/if}}
    rendered = this.handleConditionals(rendered, variables);

    // Handle loops {{#each array}}...{{/each}}
    rendered = this.handleLoops(rendered, variables);

    return rendered;
  }

  /**
   * Handle conditional blocks in templates
   */
  private handleConditionals(
    template: string,
    variables: Record<string, any>
  ): string {
    const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;

    return template.replace(ifRegex, (match, variable, content) => {
      return variables[variable] ? content : '';
    });
  }

  /**
   * Handle loop blocks in templates
   */
  private handleLoops(
    template: string,
    variables: Record<string, any>
  ): string {
    const eachRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;

    return template.replace(eachRegex, (match, variable, itemTemplate) => {
      const array = variables[variable];

      if (!Array.isArray(array)) {
        return '';
      }

      return array
        .map((item, index) => {
          let rendered = itemTemplate;

          // Replace {{this}} with item value
          rendered = rendered.replace(/{{this}}/g, String(item));

          // Replace {{@index}} with index
          rendered = rendered.replace(/{{@index}}/g, String(index));

          // If item is an object, replace its properties
          if (typeof item === 'object' && item !== null) {
            Object.keys(item).forEach((key) => {
              const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
              rendered = rendered.replace(regex, String(item[key]));
            });
          }

          return rendered;
        })
        .join('');
    });
  }

  /**
   * Validate template variables
   */
  validateVariables(
    template: INotificationTemplate,
    variables: Record<string, any>
  ): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    template.variables.forEach((variable) => {
      if (!(variable in variables)) {
        missing.push(variable);
      }
    });

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Seed default templates
   */
  async seedDefaultTemplates(): Promise<void> {
    const defaultTemplates: CreateNotificationTemplateDto[] = [
      // Alert Notification - Email
      {
        name: 'alert-email',
        type: NotificationType.ALERT,
        channel: NotificationChannel.EMAIL,
        subject: 'Alert: {{title}}',
        bodyTemplate: `Hi {{userName}},

An alert has been triggered:

Alert Type: {{alertType}}
Severity: {{severity}}
Title: {{title}}
Message: {{message}}

{{#if projectName}}
Project: {{projectName}}
{{/if}}

{{#if actionUrl}}
View Details: {{actionUrl}}
{{/if}}

This alert was generated at {{timestamp}}.

Best regards,
PPH Capacity Management System`,
        htmlTemplate: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert { padding: 15px; border-radius: 5px; margin: 20px 0; }
    .alert-critical { background-color: #fee; border-left: 4px solid #c00; }
    .alert-high { background-color: #ffd; border-left: 4px solid #f80; }
    .alert-medium { background-color: #ffe; border-left: 4px solid: #fa0; }
    .alert-low { background-color: #eff; border-left: 4px solid #0af; }
    .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Alert Notification</h2>
    <div class="alert alert-{{severity}}">
      <h3>{{title}}</h3>
      <p><strong>Type:</strong> {{alertType}}</p>
      <p><strong>Severity:</strong> {{severity}}</p>
      <p>{{message}}</p>
      {{#if projectName}}
      <p><strong>Project:</strong> {{projectName}}</p>
      {{/if}}
    </div>
    {{#if actionUrl}}
    <p><a href="{{actionUrl}}" class="button">View Details</a></p>
    {{/if}}
    <div class="footer">
      <p>Generated at {{timestamp}}</p>
      <p>PPH Capacity Management System</p>
    </div>
  </div>
</body>
</html>`,
        variables: ['userName', 'alertType', 'severity', 'title', 'message', 'timestamp'],
        description: 'Email template for alert notifications',
      },

      // Alert Notification - In-App
      {
        name: 'alert-inapp',
        type: NotificationType.ALERT,
        channel: NotificationChannel.IN_APP,
        bodyTemplate: '{{message}}',
        variables: ['message'],
        description: 'In-app template for alert notifications',
      },

      // Project Update - Email
      {
        name: 'project-update-email',
        type: NotificationType.PROJECT_UPDATE,
        channel: NotificationChannel.EMAIL,
        subject: 'Project Update: {{projectName}}',
        bodyTemplate: `Hi {{userName}},

The project "{{projectName}}" ({{projectCode}}) has been updated:

Update Type: {{updateType}}
Changes: {{changes}}
Updated By: {{updatedBy}}
Timestamp: {{timestamp}}

{{#if projectUrl}}
View Project: {{projectUrl}}
{{/if}}

Best regards,
PPH Capacity Management System`,
        variables: ['userName', 'projectName', 'projectCode', 'updateType', 'changes', 'updatedBy', 'timestamp'],
        description: 'Email template for project updates',
      },

      // Phase Update - Email
      {
        name: 'phase-update-email',
        type: NotificationType.PHASE_UPDATE,
        channel: NotificationChannel.EMAIL,
        subject: 'Phase Update: {{phaseName}}',
        bodyTemplate: `Hi {{userName}},

The phase "{{phaseName}}" in project "{{projectName}}" has been updated:

Update Type: {{updateType}}
{{#if progress}}Progress: {{progress}}%{{/if}}
{{#if status}}Status: {{status}}{{/if}}
Updated By: {{updatedBy}}

{{#if phaseUrl}}
View Phase: {{phaseUrl}}
{{/if}}

Best regards,
PPH Capacity Management System`,
        variables: ['userName', 'phaseName', 'projectName', 'updateType', 'updatedBy'],
        description: 'Email template for phase updates',
      },

      // Assignment Change - Email
      {
        name: 'assignment-change-email',
        type: NotificationType.ASSIGNMENT_CHANGE,
        channel: NotificationChannel.EMAIL,
        subject: 'Assignment Change: {{phaseName}}',
        bodyTemplate: `Hi {{userName}},

Your crew assignment has been {{changeType}}:

Employee: {{employeeName}}
Phase: {{phaseName}}
Project: {{projectName}}
Date: {{date}}
{{#if hours}}Hours: {{hours}}{{/if}}

{{#if assignmentUrl}}
View Assignment: {{assignmentUrl}}
{{/if}}

Best regards,
PPH Capacity Management System`,
        variables: ['userName', 'employeeName', 'phaseName', 'projectName', 'changeType', 'date'],
        description: 'Email template for assignment changes',
      },

      // Schedule Conflict - Email
      {
        name: 'schedule-conflict-email',
        type: NotificationType.SCHEDULE_CONFLICT,
        channel: NotificationChannel.EMAIL,
        subject: 'Schedule Conflict Detected',
        bodyTemplate: `Hi {{userName}},

A schedule conflict has been detected:

Employee: {{employeeName}}
Date: {{conflictDate}}
Conflict Type: {{conflictType}}

Conflicting Projects:
{{#each projects}}
- {{this}}
{{/each}}

{{#if resolutionUrl}}
Resolve Conflict: {{resolutionUrl}}
{{/if}}

Please review and resolve this conflict as soon as possible.

Best regards,
PPH Capacity Management System`,
        variables: ['userName', 'employeeName', 'conflictDate', 'conflictType', 'projects'],
        description: 'Email template for schedule conflicts',
      },

      // Capacity Warning - Email
      {
        name: 'capacity-warning-email',
        type: NotificationType.CAPACITY_WARNING,
        channel: NotificationChannel.EMAIL,
        subject: 'Capacity Warning: {{division}}',
        bodyTemplate: `Hi {{userName}},

A capacity warning has been triggered for {{division}}:

Utilization: {{utilizationPercentage}}%
Available Hours: {{availableHours}}
Scheduled Hours: {{scheduledHours}}
Date: {{date}}

The division is {{#if overCapacity}}over capacity{{else}}approaching capacity{{/if}}.

{{#if dashboardUrl}}
View Capacity Dashboard: {{dashboardUrl}}
{{/if}}

Please review resource allocation to prevent scheduling conflicts.

Best regards,
PPH Capacity Management System`,
        variables: ['userName', 'division', 'utilizationPercentage', 'availableHours', 'scheduledHours', 'date'],
        description: 'Email template for capacity warnings',
      },

      // Cash Flow Alert - Email
      {
        name: 'cashflow-alert-email',
        type: NotificationType.CASH_FLOW_ALERT,
        channel: NotificationChannel.EMAIL,
        subject: 'Cash Flow Alert',
        bodyTemplate: `Hi {{userName}},

A cash flow alert has been triggered:

Amount: ${{amount}}
Date: {{date}}
Reason: {{reason}}
{{#if projectName}}Project: {{projectName}}{{/if}}

{{#if reportUrl}}
View Cash Flow Report: {{reportUrl}}
{{/if}}

Please review and take appropriate action.

Best regards,
PPH Capacity Management System`,
        variables: ['userName', 'amount', 'date', 'reason'],
        description: 'Email template for cash flow alerts',
      },

      // Weekly Digest - Email
      {
        name: 'weekly-digest-email',
        type: NotificationType.WEEKLY_DIGEST,
        channel: NotificationChannel.EMAIL,
        subject: 'Weekly Digest: {{weekStart}} - {{weekEnd}}',
        bodyTemplate: `Hi {{userName}},

Here's your weekly summary for {{weekStart}} - {{weekEnd}}:

SUMMARY:
- Active Projects: {{summary.projectsActive}}
- Phases Completed: {{summary.phasesCompleted}}
- Hours Scheduled: {{summary.hoursScheduled}}
- Alerts Generated: {{summary.alertsGenerated}}

HIGHLIGHTS:
{{#each highlights}}
- {{this}}
{{/each}}

UPCOMING DEADLINES:
{{#each upcomingDeadlines}}
- {{project}} - {{deadline}} ({{daysRemaining}} days remaining)
{{/each}}

Have a great week!

Best regards,
PPH Capacity Management System`,
        variables: ['userName', 'weekStart', 'weekEnd', 'summary', 'highlights', 'upcomingDeadlines'],
        description: 'Email template for weekly digest',
      },
    ];

    // Create templates if they don't exist
    for (const templateData of defaultTemplates) {
      const existing = await prisma.notificationTemplate.findFirst({
        where: {
          name: templateData.name,
          channel: templateData.channel,
        },
      });

      if (!existing) {
        await this.createTemplate(templateData);
      }
    }
  }
}

export const notificationTemplates = new NotificationTemplates();
