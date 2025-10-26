# Notification System

Comprehensive notification system for the PPH Capacity Management Tool with support for multiple channels (Email, In-App, Push, SMS), real-time updates, batch processing, and user preferences.

## Features

- **Multi-Channel Support**: Email, In-App, Push Notifications, SMS
- **User Preferences**: Per-user notification settings with quiet hours
- **Priority-Based Queue**: URGENT, HIGH, NORMAL, LOW priorities
- **Retry Logic**: Automatic retry with exponential backoff
- **Batch Processing**: Group notifications to reduce noise
- **Templates**: Reusable templates with variable substitution
- **History Tracking**: Complete audit trail of all notifications
- **Real-Time Updates**: WebSocket support for in-app notifications (requires implementation)

## Architecture

```
notifications/
├── NotificationService.ts       # Main service for creating/sending notifications
├── NotificationQueue.ts         # Queue management with retry logic
├── NotificationTemplates.ts     # Template engine with variable substitution
├── NotificationPreferences.ts   # User preference management
├── providers/
│   ├── EmailProvider.ts        # SendGrid email provider
│   ├── PushProvider.ts         # Firebase Cloud Messaging provider
│   └── SmsProvider.ts          # Twilio SMS provider
└── __tests__/
    └── NotificationService.test.ts
```

## Usage

### Creating a Notification

```typescript
import { notificationService } from '@/services/notifications';
import { NotificationType, NotificationChannel, NotificationPriority } from '@/types/notifications';

// Create and send a notification
const notification = await notificationService.createNotification({
  userId: 'user-123',
  type: NotificationType.ALERT,
  channel: NotificationChannel.EMAIL,
  priority: NotificationPriority.HIGH,
  title: 'Capacity Warning',
  message: 'Division is at 95% capacity',
  actionUrl: '/capacity/dashboard',
  actionLabel: 'View Dashboard',
});
```

### Using Templates

```typescript
import { notificationTemplates } from '@/services/notifications';

// Get a template
const template = await notificationTemplates.getTemplate(
  'alert-email',
  NotificationChannel.EMAIL
);

// Render template with variables
const rendered = notificationTemplates.renderTemplate(
  template.bodyTemplate,
  {
    userName: 'John Doe',
    alertType: 'CAPACITY_WARNING',
    severity: 'HIGH',
    title: 'Capacity Alert',
    message: 'Division at 95% capacity',
    timestamp: new Date().toISOString(),
  }
);
```

### Managing User Preferences

```typescript
import { notificationPreferences } from '@/services/notifications';

// Get user preferences
const prefs = await notificationPreferences.getPreferences('user-123');

// Update preferences
await notificationPreferences.updatePreferences('user-123', {
  emailEnabled: true,
  pushEnabled: false,
  quietHoursEnabled: true,
  quietHoursStart: 22, // 10 PM
  quietHoursEnd: 7,    // 7 AM
  minimumPriority: NotificationPriority.HIGH,
});

// Set quiet hours
await notificationPreferences.setQuietHours('user-123', 22, 7, true);

// Check if user should receive notification
const shouldReceive = await notificationPreferences.shouldReceiveNotification(
  'user-123',
  NotificationType.PROJECT_UPDATE,
  NotificationChannel.EMAIL,
  NotificationPriority.NORMAL
);
```

### Working with the Queue

```typescript
import { notificationQueue } from '@/services/notifications';

// Add to queue
await notificationQueue.enqueue(
  'notification-id',
  NotificationPriority.HIGH,
  new Date() // scheduled for
);

// Get queue stats
const stats = await notificationQueue.getStats();
console.log(`Pending: ${stats.pending}, Failed: ${stats.failed}`);

// Start queue processor
await notificationQueue.startProcessing(async (items) => {
  for (const item of items) {
    await notificationQueue.markProcessing(item.id);

    try {
      await notificationService.sendNotification(item.notificationId);
      await notificationQueue.markCompleted(item.id);
    } catch (error) {
      await notificationQueue.markFailed(item.id, error.message);
    }
  }
}, 5000); // Process every 5 seconds
```

### Bulk Notifications

```typescript
// Send to multiple users
const result = await notificationService.sendBulkNotifications([
  {
    userId: 'user-1',
    type: NotificationType.SYSTEM_MESSAGE,
    channel: NotificationChannel.EMAIL,
    title: 'System Maintenance',
    message: 'Scheduled maintenance on Sunday',
  },
  {
    userId: 'user-2',
    type: NotificationType.SYSTEM_MESSAGE,
    channel: NotificationChannel.EMAIL,
    title: 'System Maintenance',
    message: 'Scheduled maintenance on Sunday',
  },
]);

console.log(`Sent: ${result.successful}, Failed: ${result.failed}`);
```

## API Routes

### Get Notifications
```
GET /api/notifications
Query params: type, channel, priority, status, isRead, limit, offset
```

### Send Notification
```
POST /api/notifications/send
Body: { userId, type, channel, title, message, ... }
Requires: Manager+ role
```

### Get Unread Count
```
GET /api/notifications/unread-count
```

### Mark as Read
```
PUT /api/notifications/[id]
```

### Delete Notification
```
DELETE /api/notifications/[id]
```

### Mark All Read
```
POST /api/notifications/mark-all-read
```

### Get Preferences
```
GET /api/notifications/preferences
```

### Update Preferences
```
PUT /api/notifications/preferences
Body: { emailEnabled, pushEnabled, quietHoursStart, ... }
```

### Get History
```
GET /api/notifications/history
Query params: notificationId, channel, status, provider, limit, offset
Requires: Owner/Manager role for other users' history
```

### Bulk Send
```
POST /api/notifications/bulk-send
Body: { notifications: [...] }
Requires: Owner/Manager role
Max: 100 notifications per request
```

## Environment Variables

```env
# Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@pphcapacity.com

# Push Notifications (Firebase)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Database Schema

The notification system uses the following Prisma models:

- `Notification` - Main notification records
- `NotificationPreference` - User preferences
- `NotificationHistory` - Delivery history and tracking
- `NotificationTemplate` - Reusable templates
- `NotificationQueue` - Queue management

## Notification Types

- `ALERT` - System alerts and warnings
- `PROJECT_UPDATE` - Project changes
- `PHASE_UPDATE` - Phase progress updates
- `ASSIGNMENT_CHANGE` - Crew assignment changes
- `SCHEDULE_CONFLICT` - Scheduling conflicts
- `CAPACITY_WARNING` - Capacity warnings
- `CASH_FLOW_ALERT` - Cash flow issues
- `MONDAY_SYNC` - Monday.com sync status
- `SYSTEM_MESSAGE` - System announcements
- `WEEKLY_DIGEST` - Weekly summaries
- `REMINDER` - General reminders

## Channels

- `EMAIL` - Email notifications via SendGrid
- `IN_APP` - In-app notifications (stored in database)
- `PUSH` - Push notifications via Firebase Cloud Messaging
- `SMS` - SMS notifications via Twilio

## Priority Levels

- `URGENT` - Immediate delivery, bypasses quiet hours
- `HIGH` - High priority, delivered quickly
- `NORMAL` - Standard priority
- `LOW` - Low priority, may be batched

## Best Practices

1. **Use Templates**: Create reusable templates for common notifications
2. **Respect Preferences**: Always check user preferences before sending
3. **Set Priorities**: Use appropriate priority levels
4. **Batch When Possible**: Group related notifications to reduce noise
5. **Monitor Queue**: Regularly check queue stats and clear old items
6. **Handle Failures**: Implement proper error handling and logging
7. **Test Thoroughly**: Test all channels before deploying
8. **Clean Up**: Regularly clean up old notifications and history

## Integration Example

### With Alert System

```typescript
import { AlertService } from '@/services/alerts/AlertService';
import { notificationService } from '@/services/notifications';

class AlertService {
  async createAlert(data: CreateAlertDto) {
    // Create alert
    const alert = await prisma.alert.create({ data });

    // Send notification
    await notificationService.createNotification({
      userId: alert.userId,
      type: NotificationType.ALERT,
      channel: NotificationChannel.EMAIL,
      priority: this.mapSeverityToPriority(alert.severity),
      title: alert.title,
      message: alert.message,
      alertId: alert.id,
      actionUrl: `/alerts/${alert.id}`,
      actionLabel: 'View Alert',
    });

    return alert;
  }

  private mapSeverityToPriority(severity: string): NotificationPriority {
    switch (severity) {
      case 'CRITICAL': return NotificationPriority.URGENT;
      case 'HIGH': return NotificationPriority.HIGH;
      case 'MEDIUM': return NotificationPriority.NORMAL;
      default: return NotificationPriority.LOW;
    }
  }
}
```

## Testing

```bash
# Run notification service tests
npm test src/services/notifications

# Run specific test file
npm test NotificationService.test.ts

# Run with coverage
npm test:ci
```

## Monitoring

Monitor notification delivery rates, failures, and queue health:

```typescript
import { notificationQueue } from '@/services/notifications';

// Get queue statistics
const stats = await notificationQueue.getStats();

// Monitor metrics
console.log('Queue Health:', {
  pending: stats.pending,
  processing: stats.processing,
  failed: stats.failed,
  avgRetries: stats.avgRetryCount,
  byPriority: stats.byPriority,
});

// Get overdue items
const overdue = await notificationQueue.getOverdueItems();
if (overdue.length > 0) {
  console.warn(`${overdue.length} notifications are overdue`);
}
```

## Troubleshooting

### Notifications Not Sending

1. Check user preferences
2. Verify provider configuration (API keys, etc.)
3. Check queue status
4. Review error logs in notification history

### High Queue Backlog

1. Increase processing frequency
2. Check for failing notifications causing retries
3. Review batch size settings
4. Consider scaling notification workers

### Template Rendering Issues

1. Verify all required variables are provided
2. Check template syntax
3. Test with sample data
4. Review template validation

## Future Enhancements

- [ ] WebSocket integration for real-time in-app notifications
- [ ] Advanced batching with smart grouping
- [ ] A/B testing for notification templates
- [ ] Machine learning for optimal send times
- [ ] Multi-language template support
- [ ] Rich media attachments
- [ ] Notification scheduling UI
- [ ] Analytics dashboard
