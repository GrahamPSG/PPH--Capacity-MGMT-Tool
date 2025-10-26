/**
 * SmsProvider
 *
 * SMS notification provider using Twilio
 */

import {
  ISmsProvider,
  SmsPayload,
  NotificationResult,
  BulkNotificationResult,
} from '@/types/notifications';

export class SmsProvider implements ISmsProvider {
  name = 'twilio';
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private enabled: boolean;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
    this.enabled = !!(this.accountSid && this.authToken && this.fromNumber);
  }

  /**
   * Send a single SMS
   */
  async send(payload: SmsPayload): Promise<NotificationResult> {
    if (!this.enabled) {
      console.warn('SMS provider not configured - skipping SMS send');
      return {
        success: false,
        error: 'SMS provider not configured',
        provider: this.name,
        timestamp: new Date(),
      };
    }

    try {
      const twilio = await this.getTwilioClient();

      const message = await twilio.messages.create({
        body: payload.body,
        to: Array.isArray(payload.to) ? payload.to[0] : payload.to,
        from: payload.from || this.fromNumber,
      });

      return {
        success: true,
        messageId: message.sid,
        provider: this.name,
        timestamp: new Date(),
      };
    } catch (error: any) {
      console.error('SMS send failed:', error);

      return {
        success: false,
        error: error.message || 'Failed to send SMS',
        provider: this.name,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulk(payloads: SmsPayload[]): Promise<BulkNotificationResult> {
    const results: NotificationResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const payload of payloads) {
      // If payload has multiple recipients, send to each
      const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

      for (const recipient of recipients) {
        const result = await this.send({
          ...payload,
          to: recipient,
        });

        results.push(result);

        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      }
    }

    return {
      totalSent: results.length,
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
      const twilio = await this.getTwilioClient();
      // Verify by fetching account details
      await twilio.api.accounts(this.accountSid).fetch();
      return true;
    } catch (error) {
      console.error('SMS provider verification failed:', error);
      return false;
    }
  }

  /**
   * Get Twilio client
   */
  private async getTwilioClient(): Promise<any> {
    // Lazy load Twilio to avoid bundling if not used
    const twilio = require('twilio');
    return twilio(this.accountSid, this.authToken);
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId: string): Promise<{
    status: string;
    errorCode?: string;
    errorMessage?: string;
  }> {
    if (!this.enabled) {
      throw new Error('SMS provider not configured');
    }

    try {
      const twilio = await this.getTwilioClient();
      const message = await twilio.messages(messageId).fetch();

      return {
        status: message.status,
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage,
      };
    } catch (error: any) {
      throw new Error(`Failed to get message status: ${error.message}`);
    }
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Format phone number to E.164
   */
  formatPhoneNumber(phoneNumber: string, defaultCountryCode: string = '+1'): string {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // If it starts with country code, add +
    if (cleaned.length >= 10) {
      if (!cleaned.startsWith('1') && defaultCountryCode === '+1') {
        cleaned = '1' + cleaned;
      }
      return '+' + cleaned;
    }

    throw new Error('Invalid phone number format');
  }
}
