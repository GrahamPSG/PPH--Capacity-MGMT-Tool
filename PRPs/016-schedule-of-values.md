# PRP-016: Schedule of Values (SOV)

## Status
🔲 Not Started

## Priority
P1 - High (Core financial feature)

## Objective
Implement Schedule of Values (SOV) tracking system for project billing schedules, invoice tracking, payment milestones, and variance analysis.

## Scope

### Files to Create
- `src/services/financial/sov.service.ts` - SOV calculation and tracking
- `src/services/financial/billing.service.ts` - Billing schedule logic
- `src/services/financial/invoice.service.ts` - Invoice tracking
- `src/app/api/projects/[id]/sov/route.ts` - SOV API endpoints
- `src/app/api/projects/[id]/invoices/route.ts` - Invoice API endpoints
- `src/components/projects/SOVTable.tsx` - SOV display component
- `src/components/projects/InvoiceTracker.tsx` - Invoice tracking UI
- `src/components/projects/BillingSchedule.tsx` - Billing schedule component
- `src/hooks/useSOV.ts` - SOV data hook
- `src/lib/calculations/sov.ts` - SOV calculation utilities
- `tests/services/sov.test.ts` - SOV service tests
- `tests/components/SOVTable.test.tsx` - SOV component tests

### Database Extensions
- `ScheduleOfValues` model (already in schema)
- `ProjectExpense` model (already in schema)
- Add indexes for performance queries

## Implementation Steps

1. **Create SOV Service**
   - CRUD operations for SOV line items
   - Calculate completed percentage
   - Track billed vs actual costs
   - Calculate retention amounts
   - Generate billing projections

2. **Implement Billing Schedule Logic**
   - Phase-based billing calculation
   - Milestone payment tracking
   - Progress billing calculations
   - Payment terms handling
   - Net 30/45/60 support

3. **Build Invoice Tracking System**
   - Invoice creation and management
   - Payment status tracking
   - Aging analysis (30/60/90 days)
   - Reconciliation with actual costs
   - Payment reminder system

4. **Create SOV Components**
   - Editable SOV table with inline editing
   - Progress bar visualizations
   - Billing schedule calendar view
   - Invoice status dashboard
   - Payment timeline chart

5. **Implement Variance Analysis**
   - Compare billed vs actual
   - Budget variance calculations
   - Cost overrun detection
   - Profitability tracking
   - Trend analysis

6. **Add API Endpoints**
   - GET /api/projects/[id]/sov - Get SOV for project
   - POST /api/projects/[id]/sov - Create SOV line item
   - PATCH /api/projects/[id]/sov/[lineId] - Update SOV item
   - GET /api/projects/[id]/invoices - Get invoice history
   - POST /api/projects/[id]/invoices - Create invoice

7. **Create Reports**
   - SOV summary report
   - Billing forecast report
   - Payment aging report
   - Retention tracking report

## Acceptance Criteria

- [ ] SOV line items can be created, edited, and deleted
- [ ] Billing percentages automatically calculate from phase completion
- [ ] Invoice tracking shows payment status (pending, paid, overdue)
- [ ] Retention amounts (5% or 10%) calculate correctly
- [ ] Payment aging analysis shows 30/60/90 day buckets
- [ ] Variance analysis compares billed vs actual costs
- [ ] SOV table supports inline editing with validation
- [ ] Billing schedule projects future payment dates
- [ ] All SOV calculations match accounting standards
- [ ] Payment reminders trigger at configured intervals
- [ ] API endpoints return correct data with proper validation
- [ ] All tests pass with >80% coverage

## Validation Steps

```bash
# 1. Run database migration (if schema changes)
npx prisma migrate dev --name add_sov_indexes

# 2. Run unit tests
npm test -- tests/services/sov.test.ts
npm test -- tests/lib/calculations/sov.test.ts

# 3. Run component tests
npm test -- tests/components/SOVTable.test.tsx

# 4. Start dev server
npm run dev

# 5. Test SOV creation
# Navigate to project detail page
# Add SOV line items
# Verify calculations are correct

# 6. Test billing schedule
# Create billing milestones
# Verify payment dates calculate correctly
# Test Net 30/45/60 terms

# 7. Test invoice tracking
# Create test invoice
# Mark as paid
# Verify aging calculation

# 8. Test variance analysis
# Add actual costs to project
# Compare against SOV billed amounts
# Verify variance calculations

# 9. Run integration tests
npm run test:ci

# 10. Check API endpoints
curl http://localhost:3000/api/projects/test-id/sov
# Should return SOV data

# 11. Verify retention calculations
# Test 5% and 10% retention
# Verify amounts held back correctly
```

## Expected Output

```
✓ SOV service with full CRUD operations
✓ Billing schedule generator
✓ Invoice tracker with aging analysis
✓ SOV table component with inline editing
✓ API endpoints for SOV and invoices
✓ Variance analysis calculations
✓ All tests passing (>80% coverage)
✓ SOV reports generated correctly
```

## Key Calculations

### Billing Percentage
```typescript
billingPercentage = (completedAmount / totalContractValue) * 100
```

### Retention Amount
```typescript
retentionAmount = billedAmount * retentionRate // 5% or 10%
netBilled = billedAmount - retentionAmount
```

### Variance
```typescript
variance = billedAmount - actualCost
variancePercentage = (variance / billedAmount) * 100
```

### Aging Buckets
```typescript
current = invoices where dueDate >= today
aging30 = invoices where dueDate between today-30 and today
aging60 = invoices where dueDate between today-60 and today-30
aging90 = invoices where dueDate < today-60
```

## Related PRPs
- Depends on: PRP-002 (Database Foundation), PRP-004 (Project Management)
- Blocks: PRP-017 (Cash Flow Projection), PRP-018 (Financial Alerts)
- Related: PRP-027 (Reporting Engine)

## Estimated Time
8-10 hours

## Notes
- Follow construction industry SOV standards (AIA G702/G703)
- Support both fixed-price and time & materials billing
- Retention release typically at project completion or substantial completion
- Consider integration with accounting software (QuickBooks, Sage)
- Store all financial amounts as Decimal type for precision
- Log all SOV changes to audit log

## Rollback Plan
If validation fails:
1. Check database schema for ScheduleOfValues and ProjectExpense models
2. Verify Decimal precision for financial amounts
3. Test calculations with known values
4. Check API endpoints with Postman/curl
5. Review frontend validation rules
6. Verify retention rate configuration (typically 5% or 10%)
7. Check date calculations for billing schedule
8. Rollback migration if schema changes cause issues: `npx prisma migrate resolve --rolled-back [migration_name]`
