# PRP-011: Monday Sync Service

## Status
🔲 Not Started

## Priority
P1 - High

## Objective
Build bi-directional synchronization service between internal system and Monday.com with field mapping, conflict resolution, scheduled sync, manual triggers, and comprehensive sync logging.

## Scope

### Files to Create
- `prisma/migrations/XXX_add_monday_sync_model.sql` - MondaySync table migration
- `src/services/monday/MondaySyncService.ts` - Main sync orchestration
- `src/services/monday/FieldMapper.ts` - Field mapping logic
- `src/services/monday/ConflictResolver.ts` - Conflict resolution
- `src/services/monday/SyncScheduler.ts` - Scheduled sync logic
- `src/services/monday/ProjectMapper.ts` - Project-to-Monday mapping
- `src/services/monday/PhaseMapper.ts` - Phase-to-Group mapping
- `src/app/api/monday/sync/route.ts` - Manual sync trigger
- `src/app/api/monday/sync/[id]/route.ts` - Get sync status
- `src/app/api/monday/sync/history/route.ts` - Sync history
- `src/app/api/monday/mapping/route.ts` - Field mapping configuration
- `src/hooks/useMondaySync.ts` - React Query hooks
- `src/components/monday/SyncPanel.tsx` - Sync control panel
- `src/components/monday/SyncStatus.tsx` - Sync status display
- `src/components/monday/MappingEditor.tsx` - Field mapping editor
- `src/components/monday/ConflictResolution.tsx` - Conflict resolution UI
- `tests/unit/services/MondaySyncService.test.ts` - Service tests
- `tests/unit/services/FieldMapper.test.ts` - Mapper tests
- `tests/unit/services/ConflictResolver.test.ts` - Conflict tests
- `tests/integration/api/monday-sync.test.ts` - API tests
- `tests/e2e/monday-sync.spec.ts` - E2E tests

### Database Schema Updates
```typescript
// From spec.md - MondaySync model
model MondaySync {
  id             String     @id @default(uuid())
  syncType       SyncType
  status         SyncStatus
  projectId      String?
  boardId        String
  itemsProcessed Int        @default(0)
  itemsFailed    Int        @default(0)
  startedAt      DateTime   @default(now())
  completedAt    DateTime?
  errorLog       String?
  triggeredBy    String
}

enum SyncType {
  MANUAL
  SCHEDULED
  WEBHOOK
}

enum SyncStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  PARTIAL
}
```

## Implementation Steps

1. **Create Database Migration**
   - Add MondaySync model to Prisma schema
   - Add SyncType and SyncStatus enums
   - Generate and run migration
   - Add indexes on projectId, boardId, status, startedAt
   - Track sync history for auditing

2. **Build Sync Orchestration Service**
   - Coordinate sync process (push and pull)
   - Track sync progress (items processed, failed)
   - Handle errors gracefully
   - Update sync status in database
   - Generate sync reports
   - Support project-specific and full syncs

3. **Implement Field Mapper**
   - Map Project fields to Monday Item fields
   - Map ProjectPhase fields to Monday Group fields
   - Support custom field mappings
   - Transform data types (dates, enums, numbers)
   - Handle missing fields gracefully
   - Validate mapped data before sync

4. **Create Conflict Resolver**
   - Detect conflicts (both sides modified)
   - Apply resolution strategy (Monday wins, System wins, Manual)
   - Log conflicts for review
   - Notify users of conflicts
   - Support manual conflict resolution
   - Track conflict resolution history

5. **Build Sync Scheduler**
   - Schedule automatic sync every 3 hours (configurable)
   - Use cron job or scheduled task
   - Queue sync jobs to avoid overlaps
   - Retry failed syncs
   - Notify on sync failures
   - Track sync metrics (success rate, duration)

6. **Implement Mapping Logic**
   - **Project → Monday Item**:
     - name → item name
     - status → status column
     - startDate → date column
     - contractAmount → numbers column
     - foremanId → person column
   - **ProjectPhase → Monday Group**:
     - name → group title
     - startDate/endDate → timeline
     - progressPercentage → progress column
     - status → status column

7. **Build API Routes**
   - POST /api/monday/sync - Trigger manual sync
   - POST /api/monday/sync/project/:id - Sync specific project
   - GET /api/monday/sync/:id - Get sync status
   - GET /api/monday/sync/history - Get sync history with filters
   - PUT /api/monday/mapping - Update field mappings
   - GET /api/monday/mapping - Get current mappings
   - POST /api/monday/sync/resolve-conflict - Resolve conflict manually

8. **Build React Components**
   - SyncPanel with manual sync trigger
   - SyncStatus with real-time progress
   - MappingEditor with field selectors
   - ConflictResolution with side-by-side comparison
   - SyncHistory with filterable table
   - Auto-refresh during active sync

## Acceptance Criteria

- [ ] MondaySync model is created and migrated
- [ ] Projects can be pushed to Monday.com as Items
- [ ] ProjectPhases can be pushed to Monday.com as Groups
- [ ] Monday.com Items can be pulled and mapped to Projects
- [ ] Monday.com Groups can be pulled and mapped to ProjectPhases
- [ ] Field mappings are configurable
- [ ] Data type transformations work correctly
- [ ] Conflicts are detected when both sides modified
- [ ] Conflict resolution strategy is applied correctly
- [ ] Manual conflict resolution is supported
- [ ] Scheduled sync runs every 3 hours
- [ ] Sync progress is tracked in database
- [ ] Sync history is queryable
- [ ] Sync errors are logged with details
- [ ] All Monday sync tests pass (unit, integration, E2E)

## Validation Steps

```bash
# 1. Run database migration
npx prisma migrate dev --name add_monday_sync_model

# 2. Verify migration
npx prisma studio
# Check MondaySync table

# 3. Configure field mappings
curl -X PUT http://localhost:3000/api/monday/mapping \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fieldMappings": [
      {"mondayField": "name", "systemField": "name"},
      {"mondayField": "status", "systemField": "status"},
      {"mondayField": "timeline", "systemField": "startDate,endDate"}
    ]
  }'
# Should update mappings

# 4. Test manual sync (push)
curl -X POST http://localhost:3000/api/monday/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"direction": "push", "boardId": "12345"}'
# Should start sync job

# 5. Check sync status
curl -X GET http://localhost:3000/api/monday/sync/sync-uuid \
  -H "Authorization: Bearer $TOKEN"
# Should return sync progress

# 6. Test project-specific sync
curl -X POST http://localhost:3000/api/monday/sync/project/PRJ-001 \
  -H "Authorization: Bearer $TOKEN"
# Should sync only that project

# 7. Test sync history
curl -X GET "http://localhost:3000/api/monday/sync/history?status=COMPLETED&limit=10" \
  -H "Authorization: Bearer $TOKEN"
# Should return recent syncs

# 8. Test conflict detection
# Modify project in system and Monday.com
# Run sync
curl -X POST http://localhost:3000/api/monday/sync
# Should detect conflict

# 9. Run unit tests
npm run test -- tests/unit/services/MondaySyncService.test.ts
npm run test -- tests/unit/services/FieldMapper.test.ts
npm run test -- tests/unit/services/ConflictResolver.test.ts
# All tests should pass

# 10. Run integration tests
npm run test:ci -- tests/integration/api/monday-sync.test.ts
# Should use mock Monday client

# 11. Run E2E tests
npm run test:e2e -- tests/e2e/monday-sync.spec.ts
# Sync flows pass with mock client
```

## Expected Output

```
✓ MondaySync model created and migrated
✓ Projects pushed to Monday.com as Items
✓ ProjectPhases pushed as Groups
✓ Monday Items pulled and mapped to Projects
✓ Field mappings configurable and working
✓ Data transformations accurate
✓ Conflicts detected correctly
✓ Conflict resolution strategies applied
✓ Scheduled sync runs every 3 hours
✓ Sync progress tracked in database
✓ Sync history queryable
✓ All Monday sync tests passing (36/36)
```

## Field Mapping Configuration

```typescript
const DefaultFieldMappings = {
  // Project → Monday Item
  project: [
    { mondayField: 'name', systemField: 'name', transform: null },
    { mondayField: 'status', systemField: 'status', transform: mapProjectStatus },
    { mondayField: 'timeline', systemField: 'startDate,endDate', transform: mapDateRange },
    { mondayField: 'numbers', systemField: 'contractAmount', transform: formatCurrency },
    { mondayField: 'people', systemField: 'foremanId', transform: mapEmployeeToMondayUser },
    { mondayField: 'text', systemField: 'clientName', transform: null },
    { mondayField: 'dropdown', systemField: 'division', transform: mapDivision }
  ],

  // ProjectPhase → Monday Group
  phase: [
    { mondayField: 'title', systemField: 'name', transform: null },
    { mondayField: 'color', systemField: 'status', transform: mapPhaseStatusColor }
  ],

  // Phase progress → Monday Item (within group)
  phaseProgress: [
    { mondayField: 'status', systemField: 'status', transform: mapPhaseStatus },
    { mondayField: 'progress', systemField: 'progressPercentage', transform: null },
    { mondayField: 'timeline', systemField: 'startDate,endDate', transform: mapDateRange },
    { mondayField: 'numbers', systemField: 'laborHours', transform: null }
  ]
};
```

## Conflict Resolution Strategies

```typescript
enum ConflictResolution {
  MONDAY_WINS = 'monday_wins',     // Monday.com data overwrites system
  SYSTEM_WINS = 'system_wins',     // System data overwrites Monday.com
  MANUAL = 'manual'                // User decides per conflict
}

interface ConflictDetection {
  detect(systemData: any, mondayData: any): Conflict[];
  resolve(conflict: Conflict, strategy: ConflictResolution): ResolvedData;
}

interface Conflict {
  field: string;
  systemValue: any;
  mondayValue: any;
  systemModifiedAt: Date;
  mondayModifiedAt: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}
```

## Sync Scheduling

```typescript
class SyncScheduler {
  private interval: number = 3 * 60 * 60 * 1000; // 3 hours in ms

  startScheduledSync() {
    setInterval(async () => {
      console.log('Starting scheduled Monday.com sync...');
      const sync = await this.syncService.syncAll({
        syncType: 'SCHEDULED',
        triggeredBy: 'system'
      });
      console.log(`Sync completed: ${sync.status}`);
    }, this.interval);
  }

  async runManualSync(userId: string, projectId?: string) {
    return this.syncService.sync({
      syncType: 'MANUAL',
      triggeredBy: userId,
      projectId
    });
  }
}
```

## Related PRPs
- Depends on: PRP-006 (Project Core), PRP-007 (Project Phases), PRP-010 (Monday API Client)
- Blocks: PRP-012 (Monday Webhooks)

## Estimated Time
8-9 hours

## Notes
- Sync should be idempotent (can run multiple times safely)
- Store Monday.com board/item IDs in Project table for reference
- Log all sync operations for debugging
- Consider incremental sync (only modified items) for performance
- Track last sync timestamp per project
- Implement sync queue to prevent concurrent syncs
- Generate sync reports for management visibility
- Consider conflict resolution notification via email/Slack

## Rollback Plan
If validation fails:
1. Verify MondaySync model matches spec.md interface
2. Check field mapping transformations
3. Test conflict detection logic
4. Verify Monday.com client integration
5. Check sync status tracking
6. Test scheduled sync job
7. Disable scheduled sync and use manual only
8. Revert migration: `npx prisma migrate reset`
