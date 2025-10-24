# PRP-015: Alert System

## Status
🔲 Not Started

## Priority
P1 - High

## Objective
Build comprehensive alert and notification system for monitoring critical events, threshold violations, project delays, capacity warnings, sync failures, and sending real-time notifications to users.

## Scope

### Files to Create
- `prisma/migrations/XXX_add_alert_model.sql` - Alert table migration
- `src/services/alerts/AlertService.ts` - Main alert management
- `src/services/alerts/AlertMonitor.ts` - Continuous monitoring
- `src/services/alerts/ThresholdChecker.ts` - Threshold validation
- `src/services/alerts/NotificationService.ts` - Send notifications
- `src/services/alerts/AlertRules.ts` - Alert rule definitions
- `src/app/api/alerts/route.ts` - List and create alerts
- `src/app/api/alerts/[id]/route.ts` - Get, update alert
- `src/app/api/alerts/[id]/read/route.ts` - Mark as read
- `src/app/api/alerts/[id]/resolve/route.ts` - Resolve alert
- `src/app/api/alerts/unread/route.ts` - Get unread count
- `src/hooks/useAlerts.ts` - React Query hooks
- `src/components/alerts/AlertBell.tsx` - Alert notification bell
- `src/components/alerts/AlertList.tsx` - Alert list component
- `src/components/alerts/AlertCard.tsx` - Individual alert card
- `src/components/alerts/AlertBadge.tsx` - Alert severity badge
- `src/components/alerts/AlertPanel.tsx` - Sliding alert panel
- `tests/unit/services/AlertService.test.ts` - Service tests
- `tests/unit/services/AlertMonitor.test.ts` - Monitor tests
- `tests/unit/services/ThresholdChecker.test.ts` - Threshold tests
- `tests/integration/api/alerts.test.ts` - API tests
- `tests/e2e/alert-system.spec.ts` - E2E tests

### Database Schema Updates
```typescript
// From spec.md - Alert model
model Alert {
  id           String        @id @default(uuid())
  type         AlertType
  severity     AlertSeverity
  title        String
  message      String
  projectId    String?
  phaseId      String?
  userId       String?
  triggerValue Float?
  threshold    Float?
  isRead       Boolean       @default(false)
  isResolved   Boolean       @default(false)
  createdAt    DateTime      @default(now())
  resolvedAt   DateTime?
  resolvedBy   String?
}

enum AlertType {
  SCHEDULE_CONFLICT
  CAPACITY_WARNING
  CASH_FLOW_ISSUE
  PROJECT_DELAY
  SYNC_FAILURE
  MISSING_FOREMAN
  OVER_BUDGET
}

enum AlertSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

## Implementation Steps

1. **Create Database Migration**
   - Add Alert model to Prisma schema
   - Add AlertType and AlertSeverity enums
   - Generate and run migration
   - Add indexes on userId, type, severity, isRead, createdAt
   - Set up alert retention policy (archive after 90 days)

2. **Build Alert Service**
   - CRUD operations for alerts
   - Create alerts from various triggers
   - Mark alerts as read
   - Resolve alerts with resolution notes
   - Filter alerts by type, severity, status
   - Assign alerts to users
   - Track alert history

3. **Implement Alert Monitor**
   - Continuous background monitoring
   - Check thresholds every 5 minutes
   - Detect schedule conflicts
   - Monitor capacity utilization
   - Check project delays
   - Monitor sync failures
   - Detect missing foreman assignments
   - Check budget overruns

4. **Create Threshold Checker**
   - Define alert thresholds
   - Capacity utilization > 95%
   - Project delay > 3 days
   - Budget variance > 10%
   - Labor deficit > 80 hours/week
   - Sync failure > 2 consecutive attempts
   - Check thresholds against current values
   - Generate alerts when thresholds exceeded

5. **Build Notification Service**
   - Send email notifications
   - Send in-app notifications
   - Send Slack notifications (optional)
   - Group notifications by severity
   - Digest notifications (daily summary)
   - User notification preferences
   - Delivery tracking

6. **Define Alert Rules**
   - **Schedule Conflict**: Double-booking detected
   - **Capacity Warning**: Utilization > 95%
   - **Cash Flow Issue**: Negative cash flow forecast
   - **Project Delay**: Actual end > planned end
   - **Sync Failure**: Monday.com sync failed
   - **Missing Foreman**: Phase requires foreman, none assigned
   - **Over Budget**: Actual costs > contract amount

7. **Build API Routes**
   - GET /api/alerts - List alerts with filters
   - POST /api/alerts - Create alert manually
   - GET /api/alerts/:id - Get alert details
   - PUT /api/alerts/:id/read - Mark as read
   - PUT /api/alerts/:id/resolve - Resolve alert
   - GET /api/alerts/unread - Get unread count
   - GET /api/alerts/stats - Get alert statistics
   - DELETE /api/alerts/:id - Delete alert (admin only)

8. **Build React Components**
   - AlertBell with unread count badge
   - AlertList with filtering and sorting
   - AlertCard with action buttons
   - AlertBadge with severity colors
   - AlertPanel with sliding drawer
   - Real-time alert updates via WebSocket
   - Toast notifications for critical alerts

## Acceptance Criteria

- [ ] Alert model is created and migrated
- [ ] Alerts can be created manually or automatically
- [ ] Alert types cover all critical events
- [ ] Alert severity is calculated correctly
- [ ] Alerts can be marked as read
- [ ] Alerts can be resolved with notes
- [ ] Unread alert count is displayed
- [ ] Alert monitoring runs continuously in background
- [ ] Thresholds are checked every 5 minutes
- [ ] Schedule conflicts generate alerts
- [ ] Capacity warnings generated when utilization > 95%
- [ ] Project delays generate alerts
- [ ] Missing foreman assignments generate alerts
- [ ] Email notifications sent for HIGH and CRITICAL alerts
- [ ] In-app notifications shown in real-time
- [ ] All alert tests pass (unit, integration, E2E)

## Validation Steps

```bash
# 1. Run database migration
npx prisma migrate dev --name add_alert_model

# 2. Verify migration
npx prisma studio
# Check Alert table with all fields

# 3. Test alert creation
curl -X POST http://localhost:3000/api/alerts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CAPACITY_WARNING",
    "severity": "HIGH",
    "title": "Plumbing Multifamily Over Capacity",
    "message": "Division utilization at 98% for week of Feb 5",
    "triggerValue": 98,
    "threshold": 95
  }'
# Should create alert

# 4. Test alert listing
curl -X GET "http://localhost:3000/api/alerts?isRead=false&severity=HIGH" \
  -H "Authorization: Bearer $TOKEN"
# Should return unread HIGH severity alerts

# 5. Test mark as read
curl -X PUT http://localhost:3000/api/alerts/alert-uuid/read \
  -H "Authorization: Bearer $TOKEN"
# Should mark alert as read

# 6. Test resolve alert
curl -X PUT http://localhost:3000/api/alerts/alert-uuid/resolve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Hired 2 journeymen to cover gap"}'
# Should resolve alert

# 7. Test unread count
curl -X GET http://localhost:3000/api/alerts/unread \
  -H "Authorization: Bearer $TOKEN"
# Should return unread count

# 8. Test alert statistics
curl -X GET http://localhost:3000/api/alerts/stats \
  -H "Authorization: Bearer $TOKEN"
# Should return alert counts by type and severity

# 9. Trigger automatic alerts
# Create double-booking scenario
# Should auto-generate SCHEDULE_CONFLICT alert

# 10. Run unit tests
npm run test -- tests/unit/services/AlertService.test.ts
npm run test -- tests/unit/services/AlertMonitor.test.ts
npm run test -- tests/unit/services/ThresholdChecker.test.ts
# All tests should pass

# 11. Run integration tests
npm run test:ci -- tests/integration/api/alerts.test.ts
# All API tests should pass

# 12. Run E2E tests
npm run test:e2e -- tests/e2e/alert-system.spec.ts
# Alert creation and resolution flows pass
```

## Expected Output

```
✓ Alert model created and migrated
✓ Alerts created manually and automatically
✓ Alert types cover all critical events
✓ Alert severity calculated correctly
✓ Alerts marked as read successfully
✓ Alerts resolved with notes
✓ Unread count displayed correctly
✓ Alert monitoring running in background
✓ Thresholds checked every 5 minutes
✓ Schedule conflicts generate alerts
✓ Capacity warnings generated
✓ Email notifications sent
✓ In-app notifications shown
✓ All alert tests passing (32/32)
```

## Alert Rules Configuration

```typescript
const AlertRules = {
  SCHEDULE_CONFLICT: {
    severity: 'CRITICAL',
    threshold: null,
    check: (employee, date) => {
      const assignments = getAssignments(employee, date);
      return assignments.length > 1;
    },
    notification: ['email', 'in-app'],
    assignTo: ['project_manager', 'manager']
  },

  CAPACITY_WARNING: {
    severity: 'HIGH',
    threshold: 95, // Utilization percentage
    check: (division, date) => {
      const utilization = calculateUtilization(division, date);
      return utilization > 95;
    },
    notification: ['email', 'in-app'],
    assignTo: ['manager', 'owner']
  },

  PROJECT_DELAY: {
    severity: 'MEDIUM',
    threshold: 3, // Days delayed
    check: (project) => {
      const delay = calculateDelay(project);
      return delay > 3;
    },
    notification: ['in-app'],
    assignTo: ['project_manager', 'foreman']
  },

  MISSING_FOREMAN: {
    severity: 'HIGH',
    threshold: null,
    check: (phase) => {
      const foreman = getForeman(phase);
      return phase.requiredForeman && !foreman;
    },
    notification: ['email', 'in-app'],
    assignTo: ['project_manager', 'manager']
  },

  OVER_BUDGET: {
    severity: 'CRITICAL',
    threshold: 10, // Percentage over budget
    check: (project) => {
      const variance = calculateBudgetVariance(project);
      return variance > 10;
    },
    notification: ['email', 'in-app'],
    assignTo: ['project_manager', 'manager', 'owner']
  },

  SYNC_FAILURE: {
    severity: 'MEDIUM',
    threshold: 2, // Consecutive failures
    check: (syncHistory) => {
      const failures = getConsecutiveFailures(syncHistory);
      return failures >= 2;
    },
    notification: ['email'],
    assignTo: ['owner']
  }
};
```

## Alert Monitor Background Job

```typescript
class AlertMonitor {
  private interval: NodeJS.Timeout | null = null;

  start() {
    // Run every 5 minutes
    this.interval = setInterval(() => {
      this.runChecks();
    }, 5 * 60 * 1000);

    console.log('Alert monitor started');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('Alert monitor stopped');
  }

  async runChecks() {
    console.log('Running alert checks...');

    // Check schedule conflicts
    await this.checkScheduleConflicts();

    // Check capacity warnings
    await this.checkCapacityWarnings();

    // Check project delays
    await this.checkProjectDelays();

    // Check missing foreman
    await this.checkMissingForeman();

    // Check budget overruns
    await this.checkBudgetOverruns();

    // Check sync failures
    await this.checkSyncFailures();

    console.log('Alert checks completed');
  }

  async checkScheduleConflicts() {
    const conflicts = await this.conflictDetector.detectAll();

    for (const conflict of conflicts) {
      // Check if alert already exists
      const exists = await this.alertService.findExisting({
        type: 'SCHEDULE_CONFLICT',
        employeeId: conflict.employeeId,
        date: conflict.date
      });

      if (!exists) {
        await this.alertService.create({
          type: 'SCHEDULE_CONFLICT',
          severity: 'CRITICAL',
          title: 'Schedule Conflict Detected',
          message: `Employee ${conflict.employeeName} assigned to multiple projects on ${conflict.date}`,
          employeeId: conflict.employeeId
        });
      }
    }
  }

  async checkCapacityWarnings() {
    const divisions = ['PLUMBING_MULTIFAMILY', 'PLUMBING_COMMERCIAL', /* ... */];

    for (const division of divisions) {
      const utilization = await this.capacityCalculator.calculateUtilization(division, new Date());

      if (utilization > 95) {
        await this.alertService.create({
          type: 'CAPACITY_WARNING',
          severity: 'HIGH',
          title: `${division} Over Capacity`,
          message: `Division utilization at ${utilization.toFixed(1)}%`,
          triggerValue: utilization,
          threshold: 95
        });
      }
    }
  }
}
```

## Notification Templates

```typescript
const EmailTemplates = {
  SCHEDULE_CONFLICT: {
    subject: 'URGENT: Schedule Conflict Detected',
    body: `
      A schedule conflict has been detected:

      Employee: {{employeeName}}
      Date: {{date}}
      Projects: {{projectNames}}

      Please resolve this conflict immediately.
    `
  },

  CAPACITY_WARNING: {
    subject: 'Capacity Warning: {{division}}',
    body: `
      The {{division}} division is approaching capacity:

      Current Utilization: {{utilization}}%
      Threshold: 95%
      Week: {{weekStarting}}

      Consider hiring or rescheduling projects.
    `
  },

  MISSING_FOREMAN: {
    subject: 'Missing Foreman Assignment',
    body: `
      A project phase requires a foreman but none is assigned:

      Project: {{projectName}}
      Phase: {{phaseName}}
      Start Date: {{startDate}}

      Please assign a foreman before the phase starts.
    `
  }
};
```

## Alert Severity Colors

```typescript
const AlertSeverityColors = {
  LOW: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: 'info'
  },
  MEDIUM: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    icon: 'warning'
  },
  HIGH: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-200',
    icon: 'alert-triangle'
  },
  CRITICAL: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: 'alert-circle'
  }
};
```

## Related PRPs
- Depends on: PRP-006 (Project Core), PRP-008 (Crew Assignments), PRP-009 (Schedule Conflict Detection), PRP-013 (Capacity Calculator), PRP-014 (Labor Forecast)
- Blocks: None

## Estimated Time
6-7 hours

## Notes
- Alert monitor should run as background job (cron or worker process)
- Implement alert deduplication to avoid spam
- Archive resolved alerts after 90 days
- Track alert response time metrics
- Consider Slack integration for critical alerts (future)
- Allow users to configure notification preferences
- Implement alert snoozing (postpone for X hours)
- Track alert resolution effectiveness
- Generate weekly alert summary reports

## Rollback Plan
If validation fails:
1. Verify Alert model matches spec.md interface
2. Check alert rule configurations
3. Test threshold calculations
4. Verify notification service integration
5. Check alert monitor background job
6. Test alert deduplication logic
7. Disable alert monitor and create alerts manually only
8. Revert migration: `npx prisma migrate reset`
