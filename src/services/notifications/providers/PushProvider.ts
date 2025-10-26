/**
 * PushProvider
 *
 * Push notification provider using Firebase Cloud Messaging (FCM)
 */

import {
  IPushProvider,
  PushPayload,
  NotificationResult,
  BulkNotificationResult,
} from '@/types/notifications';

export class PushProvider implements IPushProvider {
  name = 'fcm';
  private enabled: boolean;
  private serviceAccount: any;

  constructor() {
    this.enabled = !!process.env.FIREBASE_SERVICE_ACCOUNT;

    if (this.enabled && process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        this.serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (error) {
        console.error('Failed to parse Firebase service account:', error);
        this.enabled = false;
      }
    }
  }

  /**
   * Send a single push notification
   */
  async send(payload: PushPayload): Promise<NotificationResult> {
    if (!this.enabled) {
      console.warn('Push provider not configured - skipping push notification');
      return {
        success: false,
        error: 'Push provider not configured',
        provider: this.name,
        timestamp: new Date(),
      };
    }

    try {
      const admin = await this.getFirebaseAdmin();

      const message: any = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: payload.priority || 'normal',
          notification: {
            icon: payload.icon,
            sound: payload.sound || 'default',
            clickAction: payload.clickAction,
          },
        },
        apns: {
          payload: {
            aps: {
              badge: payload.badge ? parseInt(payload.badge) : undefined,
              sound: payload.sound || 'default',
            },
          },
        },
        webpush: {
          notification: {
            icon: payload.icon,
            badge: payload.badge,
          },
          fcmOptions: {
            link: payload.clickAction,
          },
        },
      };

      // Send to single token or multiple tokens
      let response;
      if (Array.isArray(payload.token)) {
        message.tokens = payload.token;
        response = await admin.messaging().sendMulticast(message);
      } else {
        message.token = payload.token;
        response = await admin.messaging().send(message);
      }

      return {
        success: true,
        messageId: typeof response === 'string' ? response : response.messageId,
        provider: this.name,
        timestamp: new Date(),
      };
    } catch (error: any) {
      console.error('Push notification send failed:', error);

      return {
        success: false,
        error: error.message || 'Failed to send push notification',
        provider: this.name,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Send bulk push notifications
   */
  async sendBulk(payloads: PushPayload[]): Promise<BulkNotificationResult> {
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
      const admin = await this.getFirebaseAdmin();
      // Just check if we can initialize the admin SDK
      return !!admin.messaging();
    } catch (error) {
      console.error('Push provider verification failed:', error);
      return false;
    }
  }

  /**
   * Get Firebase Admin SDK instance
   */
  private async getFirebaseAdmin(): Promise<any> {
    // Lazy load Firebase Admin to avoid bundling if not used
    const admin = require('firebase-admin');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(this.serviceAccount),
      });
    }

    return admin;
  }

  /**
   * Subscribe token to topic
   */
  async subscribeToTopic(
    tokens: string | string[],
    topic: string
  ): Promise<NotificationResult> {
    if (!this.enabled) {
      return {
        success: false,
        error: 'Push provider not configured',
        provider: this.name,
        timestamp: new Date(),
      };
    }

    try {
      const admin = await this.getFirebaseAdmin();
      const tokenArray = Array.isArray(tokens) ? tokens : [tokens];

      const response = await admin.messaging().subscribeToTopic(tokenArray, topic);

      return {
        success: response.successCount > 0,
        messageId: `Subscribed ${response.successCount} tokens to ${topic}`,
        provider: this.name,
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to subscribe to topic',
        provider: this.name,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Unsubscribe token from topic
   */
  async unsubscribeFromTopic(
    tokens: string | string[],
    topic: string
  ): Promise<NotificationResult> {
    if (!this.enabled) {
      return {
        success: false,
        error: 'Push provider not configured',
        provider: this.name,
        timestamp: new Date(),
      };
    }

    try {
      const admin = await this.getFirebaseAdmin();
      const tokenArray = Array.isArray(tokens) ? tokens : [tokens];

      const response = await admin.messaging().unsubscribeFromTopic(tokenArray, topic);

      return {
        success: response.successCount > 0,
        messageId: `Unsubscribed ${response.successCount} tokens from ${topic}`,
        provider: this.name,
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to unsubscribe from topic',
        provider: this.name,
        timestamp: new Date(),
      };
    }
  }
}
