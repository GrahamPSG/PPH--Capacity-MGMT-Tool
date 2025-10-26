/**
 * EmailProvider
 *
 * Email notification provider using SendGrid
 * Can be easily swapped for other providers (AWS SES, Mailgun, etc.)
 */

import {
  IEmailProvider,
  EmailPayload,
  NotificationResult,
  BulkNotificationResult,
} from '@/types/notifications';

export class EmailProvider implements IEmailProvider {
  name = 'sendgrid';
  private apiKey: string;
  private fromEmail: string;
  private enabled: boolean;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || '';
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@pphcapacity.com';
    this.enabled = !!this.apiKey;
  }

  /**
   * Send a single email
   */
  async send(payload: EmailPayload): Promise<NotificationResult> {
    if (!this.enabled) {
      console.warn('Email provider not configured - skipping email send');
      return {
        success: false,
        error: 'Email provider not configured',
        provider: this.name,
        timestamp: new Date(),
      };
    }

    try {
      // Use SendGrid API
      const sgMail = await this.getSendGridClient();

      const msg = {
        to: payload.to,
        from: payload.from || this.fromEmail,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        cc: payload.cc,
        bcc: payload.bcc,
        replyTo: payload.replyTo,
        attachments: payload.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          type: att.contentType,
        })),
      };

      const response = await sgMail.send(msg);

      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
        provider: this.name,
        timestamp: new Date(),
      };
    } catch (error: any) {
      console.error('Email send failed:', error);

      return {
        success: false,
        error: error.message || 'Failed to send email',
        provider: this.name,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulk(payloads: EmailPayload[]): Promise<BulkNotificationResult> {
    const results: NotificationResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const payload of payloads) {
      const result = await this.send(payload);
      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return {
      totalSent: payloads.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Verify provider configuration
   */
  async verify(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      // Test SendGrid API key by making a request
      const sgMail = await this.getSendGridClient();
      // SendGrid doesn't have a dedicated verify endpoint,
      // so we just check if the client initializes properly
      return true;
    } catch (error) {
      console.error('Email provider verification failed:', error);
      return false;
    }
  }

  /**
   * Get SendGrid client
   */
  private async getSendGridClient(): Promise<any> {
    // Lazy load SendGrid to avoid bundling if not used
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(this.apiKey);
    return sgMail;
  }

  /**
   * Send template email (using SendGrid templates)
   */
  async sendTemplate(
    to: string | string[],
    templateId: string,
    dynamicData: Record<string, any>
  ): Promise<NotificationResult> {
    if (!this.enabled) {
      return {
        success: false,
        error: 'Email provider not configured',
        provider: this.name,
        timestamp: new Date(),
      };
    }

    try {
      const sgMail = await this.getSendGridClient();

      const msg = {
        to,
        from: this.fromEmail,
        templateId,
        dynamicTemplateData: dynamicData,
      };

      const response = await sgMail.send(msg);

      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
        provider: this.name,
        timestamp: new Date(),
      };
    } catch (error: any) {
      console.error('Template email send failed:', error);

      return {
        success: false,
        error: error.message || 'Failed to send template email',
        provider: this.name,
        timestamp: new Date(),
      };
    }
  }
}
