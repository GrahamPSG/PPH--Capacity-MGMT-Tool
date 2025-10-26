# Notification System Quick Start Guide

## Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install @sendgrid/mail firebase-admin twilio
```

### 2. Run Database Migration
```bash
npx prisma migrate dev --name add_notification_system
npx prisma generate
```

### 3. Configure Environment Variables

Add to your `.env` file:

```env
# Required: Email notifications
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@pphcapacity.com

# Optional: Push notifications
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project",...}

# Optional: SMS notifications
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Seed Default Templates

Create a script or run in your app initialization:

```typescript
import { notificationTemplates } from '@/services/notifications';

async function seedTemplates() {
  await notificationTemplates.seedDefaultTemplates();
  console.log('Default notification templates seeded!');
}

seedTemplates();
```

## Basic Usage

### Send a Simple Notification

```typescript
import { notificationService } from '@/services/notifications';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '@/types/notifications';

// Send email notification
await notificationService.createNotification({
  userId: 'user-123',
  type: NotificationType.PROJECT_UPDATE,
  channel: NotificationChannel.EMAIL,
  priority: NotificationPriority.NORMAL,
  title: 'Project Updated',
  message: 'Your project has been updated',
});

// Send in-app notification
await notificationService.createNotification({
  userId: 'user-123',
  type: NotificationType.ALERT,
  channel: NotificationChannel.IN_APP,
  priority: NotificationPriority.HIGH,
  title: 'Capacity Warning',
  message: 'Your division is at 95% capacity',
  actionUrl: '/capacity',
  actionLabel: 'View Details',
});
```

### Get User's Notifications

```typescript
// Get unread notifications
const notifications = await notificationService.getNotifications({
  userId: 'user-123',
  isRead: false,
  limit: 10,
});

// Get unread count
const count = await notificationService.getUnreadCount('user-123');
```

### Mark as Read

```typescript
// Mark single notification as read
await notificationService.markAsRead('notification-id');

// Mark all as read
await notificationService.markAllAsRead('user-123');
```

### Manage User Preferences

```typescript
import { notificationPreferences } from '@/services/notifications';

// Get preferences
const prefs = await notificationPreferences.getPreferences('user-123');

// Update preferences
await notificationPreferences.updatePreferences('user-123', {
  emailEnabled: true,
  pushEnabled: false,
  quietHoursEnabled: true,
  quietHoursStart: 22, // 10 PM
  quietHoursEnd: 7,    // 7 AM
});

// Set quiet hours
await notificationPreferences.setQuietHours('user-123', 22, 7);
```

## API Usage

### Get Notifications
```bash
curl -X GET "http://localhost:3000/api/notifications?isRead=false&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Unread Count
```bash
curl -X GET "http://localhost:3000/api/notifications/unread-count" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Mark as Read
```bash
curl -X PUT "http://localhost:3000/api/notifications/notification-id" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Preferences
```bash
curl -X GET "http://localhost:3000/api/notifications/preferences" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Preferences
```bash
curl -X PUT "http://localhost:3000/api/notifications/preferences" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emailEnabled": true,
    "pushEnabled": false,
    "quietHoursEnabled": true,
    "quietHoursStart": 22,
    "quietHoursEnd": 7
  }'
```

## Common Scenarios

### Send Alert Notification

Alerts automatically trigger notifications! Just create an alert:

```typescript
import { AlertService } from '@/services/alerts/AlertService';

const alertService = new AlertService();

await alertService.createAlert({
  type: 'CAPACITY_WARNING',
  severity: 'HIGH',
  title: 'Division Capacity Warning',
  message: 'Plumbing division is at 95% capacity',
  userId: 'user-123',
});

// Notification is automatically sent based on severity!
```

### Send Project Update Notification

```typescript
// When project is updated
await notificationService.createNotification({
  userId: projectManager.id,
  type: NotificationType.PROJECT_UPDATE,
  channel: NotificationChannel.EMAIL,
  priority: NotificationPriority.NORMAL,
  title: `Project Updated: ${project.name}`,
  message: `Project "${project.name}" has been updated by ${updatedBy.name}`,
  projectId: project.id,
  actionUrl: `/projects/${project.id}`,
  actionLabel: 'View Project',
  templateId: 'project-update-email',
  templateVars: {
    userName: projectManager.name,
    projectName: project.name,
    projectCode: project.code,
    updateType: 'Status Changed',
    changes: 'Status changed from IN_PROGRESS to COMPLETED',
    updatedBy: updatedBy.name,
    timestamp: new Date().toISOString(),
    projectUrl: `/projects/${project.id}`,
  },
});
```

### Send Bulk Notifications

```typescript
// Notify all managers about system maintenance
const managers = await prisma.user.findMany({
  where: { role: { in: ['OWNER', 'MANAGER'] } },
});

const notifications = managers.map((manager) => ({
  userId: manager.id,
  type: NotificationType.SYSTEM_MESSAGE,
  channel: NotificationChannel.EMAIL,
  priority: NotificationPriority.HIGH,
  title: 'Scheduled Maintenance',
  message: 'System will be down for maintenance on Sunday from 2-4 AM',
}));

const result = await notificationService.sendBulkNotifications(notifications);
console.log(`Sent: ${result.successful}, Failed: ${result.failed}`);
```

### Check Before Sending

```typescript
// Check if user will receive this notification
const shouldReceive = await notificationPreferences.shouldReceiveNotification(
  'user-123',
  NotificationType.PROJECT_UPDATE,
  NotificationChannel.EMAIL,
  NotificationPriority.NORMAL
);

if (shouldReceive) {
  await notificationService.createNotification({...});
}
```

## Testing

### Run Tests
```bash
npm test src/services/notifications
```

### Test Email Provider
```typescript
import { EmailProvider } from '@/services/notifications/providers/EmailProvider';

const provider = new EmailProvider();

// Verify configuration
const isConfigured = await provider.verify();
console.log('Email configured:', isConfigured);

// Test send
const result = await provider.send({
  to: 'test@example.com',
  subject: 'Test Email',
  text: 'This is a test',
});
console.log('Email sent:', result.success);
```

## Monitoring

### Check Queue Status
```typescript
import { notificationQueue } from '@/services/notifications';

const stats = await notificationQueue.getStats();
console.log('Queue Stats:', {
  pending: stats.pending,
  processing: stats.processing,
  failed: stats.failed,
  completed: stats.completed,
  avgRetries: stats.avgRetryCount,
});

// Check for overdue items
const overdue = await notificationQueue.getOverdueItems();
if (overdue.length > 0) {
  console.warn(`${overdue.length} notifications are overdue!`);
}
```

### Start Queue Processor (Optional)

For production, you may want to run a background processor:

```typescript
import { notificationQueue, notificationService } from '@/services/notifications';

// Start processing queue every 5 seconds
notificationQueue.startProcessing(async (items) => {
  console.log(`Processing ${items.length} notifications...`);

  for (const item of items) {
    await notificationQueue.markProcessing(item.id);

    try {
      await notificationService.sendNotification(item.notificationId);
      await notificationQueue.markCompleted(item.id);
    } catch (error) {
      await notificationQueue.markFailed(item.id, error.message);
    }
  }
}, 5000);

// Stop processing when app shuts down
process.on('SIGTERM', () => {
  notificationQueue.stopProcessing();
});
```

## Cleanup

### Clean Old Notifications
```typescript
// Delete read notifications older than 30 days
const deleted = await notificationService.cleanup(30);
console.log(`Deleted ${deleted} old notifications`);

// Clean old queue items
const queueDeleted = await notificationQueue.cleanup(7);
console.log(`Deleted ${queueDeleted} old queue items`);
```

## Troubleshooting

### Notifications Not Sending?

1. **Check user preferences**
   ```typescript
   const prefs = await notificationPreferences.getPreferences('user-123');
   console.log('Email enabled:', prefs.emailEnabled);
   ```

2. **Check provider configuration**
   ```typescript
   const provider = new EmailProvider();
   const configured = await provider.verify();
   console.log('Provider configured:', configured);
   ```

3. **Check queue**
   ```typescript
   const stats = await notificationQueue.getStats();
   console.log('Failed notifications:', stats.failed);
   ```

4. **Check notification history**
   ```typescript
   const history = await prisma.notificationHistory.findMany({
     where: { status: 'FAILED' },
     orderBy: { createdAt: 'desc' },
     take: 10,
   });
   console.log('Recent failures:', history);
   ```

### Email Not Configured?

If SendGrid is not set up, notifications will still be created but marked as failed. To test without email:

```typescript
// Use IN_APP channel for testing
await notificationService.createNotification({
  userId: 'user-123',
  type: NotificationType.ALERT,
  channel: NotificationChannel.IN_APP, // No external service needed
  title: 'Test Notification',
  message: 'This is a test',
});
```

## Best Practices

1. **Always use templates** for consistency
2. **Set appropriate priorities** - reserve URGENT for true emergencies
3. **Respect user preferences** - the system handles this automatically
4. **Monitor queue health** - check stats regularly
5. **Clean up regularly** - run cleanup jobs weekly
6. **Test in development** - use IN_APP channel for testing
7. **Handle errors gracefully** - catch and log notification failures
8. **Use bulk send** for multiple recipients - more efficient

## Next Steps

1. Customize default templates in `NotificationTemplates.ts`
2. Add WebSocket support for real-time in-app notifications
3. Create custom templates for your specific use cases
4. Set up monitoring and alerting for notification failures
5. Configure production email domain in SendGrid
6. Set up Firebase for push notifications
7. Configure Twilio for SMS notifications

## Support

For issues or questions:
- Check the full documentation in `src/services/notifications/README.md`
- Review test cases in `__tests__/NotificationService.test.ts`
- Check the implementation summary in `NOTIFICATION_SYSTEM_SUMMARY.md`

Happy notifying!
