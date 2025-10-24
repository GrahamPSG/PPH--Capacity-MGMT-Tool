# PRP-012: Monday Webhooks

## Status
🔲 Not Started

## Priority
P2 - Medium

## Objective
Implement Monday.com webhook endpoints for real-time synchronization of project updates, enabling instant notification when items or groups change in Monday.com boards.

## Scope

### Files to Create
- `src/app/api/monday/webhook/route.ts` - Webhook receiver endpoint
- `src/services/monday/WebhookHandler.ts` - Webhook processing logic
- `src/services/monday/WebhookValidator.ts` - Signature validation
- `src/services/monday/WebhookProcessor.ts` - Event processing
- `src/lib/monday/WebhookTypes.ts` - Webhook type definitions
- `src/services/monday/WebhookQueue.ts` - Async webhook processing queue
- `src/hooks/useWebhooks.ts` - React Query hooks
- `src/components/monday/WebhookStatus.tsx` - Webhook status display
- `src/components/monday/WebhookLog.tsx` - Webhook event log
- `tests/unit/services/WebhookHandler.test.ts` - Handler tests
- `tests/unit/services/WebhookValidator.test.ts` - Validator tests
- `tests/integration/api/webhook.test.ts` - Webhook endpoint tests
- `tests/e2e/webhook-processing.spec.ts` - E2E tests

### Webhook Events to Handle
```typescript
enum MondayWebhookEvent {
  ITEM_CREATED = 'create_pulse',
  ITEM_UPDATED = 'update_column_value',
  ITEM_DELETED = 'delete_pulse',
  ITEM_NAME_CHANGED = 'change_name',
  GROUP_CREATED = 'create_group',
  GROUP_UPDATED = 'update_group',
  GROUP_DELETED = 'delete_group',
  STATUS_CHANGED = 'change_status_column_value',
  DATE_CHANGED = 'change_date_column_value'
}
```

## Implementation Steps

1. **Create Webhook Endpoint**
   - POST /api/monday/webhook - Receive webhook events
   - Validate webhook signature from Monday.com
   - Parse webhook payload
   - Queue webhook for async processing
   - Return 200 OK immediately
   - Log all webhook events

2. **Implement Webhook Validator**
   - Verify Monday.com signature
   - Check webhook authenticity
   - Validate payload structure
   - Reject invalid webhooks
   - Log validation failures
   - Protect against replay attacks

3. **Build Webhook Handler**
   - Route events to appropriate processors
   - Handle ITEM_CREATED → Create/update Project
   - Handle ITEM_UPDATED → Update Project fields
   - Handle ITEM_DELETED → Mark Project as cancelled
   - Handle GROUP_CREATED → Create/update ProjectPhase
   - Handle GROUP_UPDATED → Update ProjectPhase
   - Handle GROUP_DELETED → Delete ProjectPhase
   - Handle STATUS_CHANGED → Update Project/Phase status

4. **Create Webhook Queue**
   - Use Redis queue for async processing
   - Prevent webhook processing from blocking endpoint
   - Retry failed webhook processing
   - Track webhook processing status
   - Handle duplicate webhooks (idempotency)
   - Monitor queue depth

5. **Implement Event Processors**
   - **ItemCreatedProcessor**: Create new Project from Monday item
   - **ItemUpdatedProcessor**: Update Project fields from Monday
   - **ItemDeletedProcessor**: Mark Project as cancelled
   - **GroupCreatedProcessor**: Create new ProjectPhase
   - **StatusChangedProcessor**: Update Project/Phase status
   - Apply conflict resolution strategy
   - Update lastMondaySync timestamp

6. **Build Webhook Management UI**
   - Register webhooks with Monday.com API
   - Display active webhooks
   - Show webhook event log
   - Test webhook delivery
   - Disable/enable webhooks
   - Monitor webhook health

7. **Write Comprehensive Tests**
   - Unit tests for webhook validation
   - Unit tests for event processors
   - Integration tests with mock Monday payloads
   - Test idempotency (duplicate events)
   - Test error scenarios
   - E2E tests with webhook simulation

## Acceptance Criteria

- [ ] Webhook endpoint receives POST requests from Monday.com
- [ ] Webhook signature is validated correctly
- [ ] Invalid webhooks are rejected
- [ ] Webhook events are queued for async processing
- [ ] Endpoint returns 200 OK within 3 seconds
- [ ] ITEM_CREATED events create or update Projects
- [ ] ITEM_UPDATED events update Project fields
- [ ] ITEM_DELETED events mark Projects as cancelled
- [ ] GROUP_CREATED events create ProjectPhases
- [ ] STATUS_CHANGED events update status correctly
- [ ] Duplicate webhooks are handled (idempotent)
- [ ] Failed webhook processing is retried
- [ ] All webhook events are logged
- [ ] Webhooks can be registered via API
- [ ] All webhook tests pass (unit, integration, E2E)

## Validation Steps

```bash
# 1. Start dev server with ngrok for testing
npm run dev
ngrok http 3000
# Copy ngrok URL for webhook registration

# 2. Register webhook with Monday.com
curl -X POST http://localhost:3000/api/monday/webhooks/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "boardId": "12345",
    "url": "https://your-ngrok-url.ngrok.io/api/monday/webhook",
    "event": "update_column_value"
  }'
# Should return webhook ID

# 3. Test webhook endpoint with mock payload
curl -X POST http://localhost:3000/api/monday/webhook \
  -H "Content-Type: application/json" \
  -H "X-Monday-Signature: test-signature" \
  -d '{
    "event": {
      "type": "update_column_value",
      "itemId": "123",
      "boardId": "456",
      "columnId": "status",
      "value": "In Progress"
    }
  }'
# Should return 200 OK

# 4. Verify webhook processing
# Check database for updated project
npx prisma studio
# Verify project status updated

# 5. Test duplicate webhook (idempotency)
# Send same webhook payload twice
curl -X POST http://localhost:3000/api/monday/webhook -d @webhook.json
curl -X POST http://localhost:3000/api/monday/webhook -d @webhook.json
# Second request should be ignored

# 6. Test invalid signature
curl -X POST http://localhost:3000/api/monday/webhook \
  -H "X-Monday-Signature: invalid" \
  -d @webhook.json
# Should return 401 Unauthorized

# 7. Check webhook logs
curl -X GET http://localhost:3000/api/monday/webhooks/logs \
  -H "Authorization: Bearer $TOKEN"
# Should show recent webhook events

# 8. Run unit tests
npm run test -- tests/unit/services/WebhookHandler.test.ts
npm run test -- tests/unit/services/WebhookValidator.test.ts
# All tests should pass

# 9. Run integration tests
npm run test:ci -- tests/integration/api/webhook.test.ts
# Webhook endpoint tests pass

# 10. Run E2E tests
npm run test:e2e -- tests/e2e/webhook-processing.spec.ts
# Webhook processing flows pass
```

## Expected Output

```
✓ Webhook endpoint created at /api/monday/webhook
✓ Webhook signature validation working
✓ Invalid webhooks rejected
✓ Webhook events queued for async processing
✓ Endpoint responds within 3 seconds
✓ ITEM_CREATED creates/updates Projects
✓ ITEM_UPDATED updates Project fields
✓ STATUS_CHANGED updates status correctly
✓ Duplicate webhooks handled (idempotent)
✓ Failed processing retried (max 3 attempts)
✓ All webhooks logged
✓ All webhook tests passing (24/24)
```

## Webhook Payload Examples

```typescript
// ITEM_CREATED payload
{
  "event": {
    "type": "create_pulse",
    "userId": "12345",
    "boardId": "456",
    "pulseId": "789",
    "pulseName": "New Project",
    "columnValues": {
      "status": "Awarded",
      "timeline": "2024-02-01 - 2024-05-15",
      "numbers": "125000"
    }
  }
}

// ITEM_UPDATED payload
{
  "event": {
    "type": "update_column_value",
    "userId": "12345",
    "boardId": "456",
    "pulseId": "789",
    "columnId": "status",
    "value": {
      "label": "In Progress"
    },
    "previousValue": {
      "label": "Awarded"
    }
  }
}

// STATUS_CHANGED payload
{
  "event": {
    "type": "change_status_column_value",
    "userId": "12345",
    "boardId": "456",
    "pulseId": "789",
    "columnId": "status",
    "value": {
      "index": 2,
      "label": "In Progress"
    }
  }
}
```

## Webhook Signature Validation

```typescript
class WebhookValidator {
  validateSignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  validatePayload(payload: any): boolean {
    return (
      payload.event &&
      payload.event.type &&
      payload.event.boardId &&
      payload.event.pulseId
    );
  }
}
```

## Webhook Queue Processing

```typescript
class WebhookQueue {
  async enqueue(webhook: WebhookEvent): Promise<void> {
    await this.redis.lpush('webhooks', JSON.stringify(webhook));
    this.processQueue(); // Start processing
  }

  async processQueue(): Promise<void> {
    while (true) {
      const webhook = await this.redis.rpop('webhooks');
      if (!webhook) break;

      try {
        await this.processWebhook(JSON.parse(webhook));
      } catch (error) {
        // Retry logic
        await this.retryWebhook(webhook, error);
      }
    }
  }

  async retryWebhook(webhook: string, error: Error, attempt = 1): Promise<void> {
    if (attempt > 3) {
      // Max retries exceeded, log error
      console.error('Webhook processing failed after 3 retries:', error);
      return;
    }

    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    await this.enqueue(JSON.parse(webhook));
  }
}
```

## Idempotency Strategy

```typescript
interface WebhookEvent {
  id: string; // Unique event ID from Monday.com
  type: string;
  timestamp: Date;
  processed: boolean;
}

class IdempotencyChecker {
  async isDuplicate(eventId: string): Promise<boolean> {
    // Check if event already processed (use Redis cache)
    const exists = await this.redis.get(`webhook:${eventId}`);
    return exists !== null;
  }

  async markProcessed(eventId: string): Promise<void> {
    // Mark event as processed for 24 hours
    await this.redis.setex(`webhook:${eventId}`, 86400, 'processed');
  }
}
```

## Related PRPs
- Depends on: PRP-006 (Project Core), PRP-007 (Project Phases), PRP-010 (Monday API Client), PRP-011 (Monday Sync Service)
- Blocks: None

## Estimated Time
5-6 hours

## Notes
- Webhooks must respond within 3 seconds or Monday.com will retry
- Use async queue to process webhooks without blocking response
- Store webhook secret in environment variable
- Use ngrok or similar for local webhook testing
- Monday.com retries failed webhooks up to 3 times
- Implement idempotency to handle duplicate events
- Log all webhook events for debugging and auditing
- Consider rate limiting webhook endpoint to prevent abuse
- Monitor webhook queue depth and processing time

## Rollback Plan
If validation fails:
1. Verify webhook signature validation logic
2. Check webhook endpoint is publicly accessible (ngrok)
3. Test with Monday.com webhook testing tool
4. Verify webhook payload parsing
5. Check Redis queue connection
6. Test idempotency logic
7. Disable webhook processing and rely on scheduled sync
8. Remove webhook registrations from Monday.com
