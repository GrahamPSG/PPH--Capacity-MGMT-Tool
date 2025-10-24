# PRP-018: Financial Alerts

## Status
🔲 Not Started

## Priority
P1 - High (Proactive risk management)

## Objective
Implement intelligent financial alert system for cash flow warnings, budget overruns, payment delays, and opportunity notifications with configurable thresholds and delivery channels.

## Scope

### Files to Create
- `src/services/alerts/financial-alerts.service.ts` - Financial alert logic
- `src/services/alerts/alert-evaluator.service.ts` - Alert condition evaluator
- `src/services/alerts/notification.service.ts` - Notification delivery
- `src/app/api/alerts/financial/route.ts` - Alert API endpoints
- `src/app/api/alerts/config/route.ts` - Alert configuration endpoints
- `src/components/alerts/AlertCenter.tsx` - Alert management UI
- `src/components/alerts/AlertConfig.tsx` - Alert configuration UI
- `src/components/alerts/AlertCard.tsx` - Individual alert display
- `src/components/alerts/AlertBadge.tsx` - Alert notification badge
- `src/hooks/useAlerts.ts` - Alert data hook
- `src/lib/alerts/conditions.ts` - Alert condition definitions
- `src/lib/alerts/formatters.ts` - Alert message formatters
- `tests/services/financial-alerts.test.ts` - Service tests
- `tests/lib/alerts/conditions.test.ts` - Condition tests

### Database Extensions
```prisma
enum AlertType {
  CASH_FLOW_LOW
  CASH_FLOW_NEGATIVE
  BUDGET_OVERRUN
  PAYMENT_OVERDUE
  INVOICE_AGING
  PROJECT_DELAYED
  LABOR_OVERALLOCATION
  OPPORTUNITY_SURPLUS
}

enum AlertSeverity {
  INFO
  WARNING
  CRITICAL
}

enum AlertStatus {
  ACTIVE
  ACKNOWLEDGED
  RESOLVED
  DISMISSED
}

model AlertConfig {
  id              String        @id @default(uuid())
  type            AlertType
  enabled         Boolean       @default(true)
  threshold       Decimal?      @db.Decimal(12, 2)
  thresholdUnit   String?       // 'currency', 'percentage', 'days'
  notifyEmail     Boolean       @default(true)
  notifyInApp     Boolean       @default(true)
  notifySlack     Boolean       @default(false)
  recipients      String[]      // User IDs
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

// Alert model already exists in schema, add status field
```

## Implementation Steps

1. **Create Alert Condition Evaluator**
   - Define alert conditions for each type
   - Evaluate conditions against current data
   - Calculate alert severity
   - Determine alert priority
   - Prevent duplicate alerts

2. **Implement Financial Alert Types**
   - **Cash Flow Low**: Balance below threshold (e.g., <$100k)
   - **Cash Flow Negative**: Projected negative balance
   - **Budget Overrun**: Costs exceed budget by X%
   - **Payment Overdue**: Invoice past due >30 days
   - **Invoice Aging**: High amount in 60+ day bucket
   - **Project Delayed**: Behind schedule impacting cash flow
   - **Labor Overallocation**: Crew costs exceed budget
   - **Opportunity Surplus**: Excess cash for investment

3. **Build Notification Delivery System**
   - In-app notifications with real-time updates
   - Email notifications (digest and immediate)
   - Slack webhook integration
   - SMS notifications (optional, Twilio)
   - Push notifications for mobile PWA

4. **Create Alert Management UI**
   - Alert center showing all active alerts
   - Alert detail view with context
   - Acknowledge/dismiss actions
   - Alert history and audit trail
   - Snooze functionality

5. **Implement Alert Configuration**
   - Per-user alert preferences
   - Threshold configuration
   - Notification channel selection
   - Recipient management
   - Schedule (business hours only, 24/7)

6. **Add Scheduled Alert Evaluation**
   - Cron job to check conditions
   - Run every 15 minutes for critical alerts
   - Daily digest for non-critical alerts
   - Real-time evaluation for major changes

7. **Create Alert Analytics**
   - Alert frequency reports
   - Response time tracking
   - Alert effectiveness metrics
   - False positive rate
   - Most common alert types

## Acceptance Criteria

- [ ] All 8 financial alert types implemented and functional
- [ ] Alert conditions evaluate correctly based on configurable thresholds
- [ ] Alerts delivered via in-app, email, and Slack channels
- [ ] Alert severity (INFO, WARNING, CRITICAL) calculated accurately
- [ ] Users can acknowledge, resolve, or dismiss alerts
- [ ] Alert configuration UI allows customizing thresholds and recipients
- [ ] No duplicate alerts generated for same condition
- [ ] Alert history maintained with full audit trail
- [ ] Scheduled evaluation runs reliably every 15 minutes
- [ ] Real-time alerts trigger immediately for critical conditions
- [ ] Alert badge shows unread count in navigation
- [ ] All tests pass with >80% coverage

## Validation Steps

```bash
# 1. Run database migration
npx prisma migrate dev --name add_alert_enhancements

# 2. Run unit tests
npm test -- tests/services/financial-alerts.test.ts
npm test -- tests/lib/alerts/conditions.test.ts

# 3. Start dev server with Redis (for cron jobs)
docker compose up -d redis
npm run dev

# 4. Test Cash Flow Low alert
# In database, set a project with cash balance < threshold
# Wait for alert evaluation (or trigger manually)
# Verify alert appears in Alert Center

# 5. Test Budget Overrun alert
# Create project with budget $100k
# Add expenses totaling $115k (15% overrun)
# Verify alert triggers

# 6. Test Payment Overdue alert
# Create invoice with due date 35 days ago
# Verify alert appears

# 7. Test notification delivery
# Configure alert to send email + Slack
# Trigger alert condition
# Verify email received (check Mailhog at http://localhost:8025)
# Verify Slack message sent (if webhook configured)

# 8. Test alert actions
# Acknowledge an alert
# Verify status changes to ACKNOWLEDGED
# Resolve an alert
# Verify status changes to RESOLVED

# 9. Test alert configuration
# Navigate to Alert Settings
# Change threshold for Cash Flow Low from $100k to $50k
# Verify alert only triggers below $50k

# 10. Test duplicate prevention
# Trigger same condition multiple times
# Verify only one alert created (not duplicates)

# 11. Test API endpoints
curl http://localhost:3000/api/alerts/financial
# Should return active alerts

curl -X POST http://localhost:3000/api/alerts/financial/[id]/acknowledge
# Should acknowledge alert

# 12. Run integration tests
npm run test:ci
```

## Expected Output

```
✓ 8 financial alert types fully implemented
✓ Alert condition evaluator with threshold support
✓ Multi-channel notification delivery (in-app, email, Slack)
✓ Alert management UI with acknowledge/resolve actions
✓ Alert configuration with customizable thresholds
✓ Scheduled evaluation running every 15 minutes
✓ Real-time alerts for critical conditions
✓ Alert analytics and reporting
✓ All tests passing (>80% coverage)
✓ No duplicate alerts generated
```

## Alert Condition Examples

### Cash Flow Low
```typescript
condition: currentCashBalance < threshold
severity: balance < 0 ? CRITICAL : balance < threshold * 0.5 ? WARNING : INFO
message: "Cash balance is $X, below threshold of $Y"
```

### Budget Overrun
```typescript
condition: (actualCost - budget) / budget * 100 > thresholdPercentage
severity: overrun > 20% ? CRITICAL : overrun > 10% ? WARNING : INFO
message: "Project budget exceeded by X% ($Y over budget)"
```

### Payment Overdue
```typescript
condition: daysOverdue > threshold
severity: daysOverdue > 60 ? CRITICAL : daysOverdue > 30 ? WARNING : INFO
message: "Invoice #X is Y days overdue ($Z)"
```

### Opportunity Surplus
```typescript
condition: projectedCashSurplus > threshold
severity: INFO
message: "Projected cash surplus of $X in next 30 days"
```

## Related PRPs
- Depends on: PRP-016 (Schedule of Values), PRP-017 (Cash Flow Projection)
- Blocks: None (can be implemented independently)
- Related: PRP-024 (WebSocket Real-time), PRP-027 (Reporting Engine)

## Estimated Time
8-10 hours

## Notes
- Rate limit alert notifications (max 1 per type per hour for same condition)
- Support alert snooze (1 hour, 1 day, 1 week)
- Include action buttons in alerts (e.g., "View Project", "Review Invoice")
- Store alert preferences per user (some users may want fewer alerts)
- Consider time zones for scheduled delivery
- Log all alert triggers to audit log
- Allow alerts to be marked as false positives (improves ML later)
- Consider implementing alert escalation (if not resolved in X days, notify manager)
- Support alert templates for customizing messages
- Store all threshold amounts as Decimal type

## Rollback Plan
If validation fails:
1. Verify database migrations applied correctly
2. Check Redis connection for scheduled jobs
3. Test alert conditions with known data
4. Verify email delivery with Mailhog
5. Check Slack webhook configuration
6. Test notification service independently
7. Review alert evaluation frequency
8. Check for duplicate alerts in database
9. Rollback migration if needed: `npx prisma migrate resolve --rolled-back [migration_name]`
10. Verify alert badge count calculations
