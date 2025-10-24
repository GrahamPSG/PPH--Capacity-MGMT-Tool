# PRP-021: Gantt Chart Component

## Status
🔲 Not Started

## Priority
P2 - Medium (Visualization feature)

## Objective
Implement interactive Gantt chart component for project scheduling with zoom levels, drag-and-drop rescheduling, dependency visualization, and real-time updates.

## Scope

### Files to Create
- `src/components/gantt/GanttChart.tsx` - Main Gantt chart component
- `src/components/gantt/GanttTimeline.tsx` - Timeline header component
- `src/components/gantt/GanttRow.tsx` - Individual task row
- `src/components/gantt/GanttBar.tsx` - Task bar component
- `src/components/gantt/GanttDependency.tsx` - Dependency line component
- `src/components/gantt/GanttControls.tsx` - Zoom and filter controls
- `src/components/gantt/GanttTooltip.tsx` - Task detail tooltip
- `src/hooks/useGantt.ts` - Gantt data and interaction hook
- `src/lib/gantt/calculations.ts` - Position and size calculations
- `src/lib/gantt/dependencies.ts` - Dependency path calculations
- `src/lib/gantt/zoom.ts` - Zoom level utilities
- `src/services/scheduling/gantt.service.ts` - Gantt data service
- `tests/components/gantt/GanttChart.test.tsx` - Component tests
- `tests/lib/gantt/calculations.test.ts` - Calculation tests

### Dependencies to Install
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install date-fns
```

## Implementation Steps

1. **Set Up Gantt Chart Canvas**
   - Create scrollable SVG canvas
   - Implement virtual scrolling for performance
   - Set up coordinate system
   - Handle responsive sizing
   - Support horizontal and vertical scrolling

2. **Implement Timeline Header**
   - Render date labels (day, week, month, quarter)
   - Support multiple zoom levels (hour, day, week, month)
   - Show today marker line
   - Highlight weekends and holidays
   - Display month/year separators

3. **Create Task Bars**
   - Render tasks as horizontal bars
   - Show task duration visually
   - Color code by status (not started, in progress, completed)
   - Show progress percentage within bar
   - Display task name on bar
   - Handle overlapping tasks

4. **Implement Drag-and-Drop**
   - Drag task bars to reschedule
   - Resize bars to adjust duration
   - Snap to grid (day boundaries)
   - Show preview while dragging
   - Update database on drop
   - Validate constraints (dependencies)

5. **Add Dependency Lines**
   - Draw lines between dependent tasks
   - Support 4 dependency types:
     - Finish-to-Start (FS)
     - Start-to-Start (SS)
     - Finish-to-Finish (FF)
     - Start-to-Finish (SF)
   - Highlight critical path
   - Show dependency slack/lag
   - Animate dependency creation

6. **Implement Zoom Controls**
   - Zoom levels: Hour, Day, Week, Month, Quarter
   - Zoom in/out buttons
   - Fit to screen
   - Zoom to selection
   - Remember user preference

7. **Add Filtering and Grouping**
   - Filter by division, status, project
   - Group by project, phase, employee
   - Collapse/expand groups
   - Show/hide completed tasks
   - Search tasks by name

8. **Create Interactive Features**
   - Click task to view details
   - Tooltip on hover showing task info
   - Right-click context menu
   - Keyboard navigation
   - Select multiple tasks
   - Bulk reschedule

9. **Add Real-Time Updates**
   - Listen for task updates via WebSocket
   - Animate task changes
   - Show who is editing tasks
   - Refresh data on focus

## Acceptance Criteria

- [ ] Gantt chart displays all project phases as task bars
- [ ] Timeline header shows appropriate labels for current zoom level
- [ ] Drag-and-drop rescheduling works smoothly with validation
- [ ] Task bars resize to adjust duration
- [ ] Dependencies render correctly with lines connecting tasks
- [ ] Critical path highlighted in distinct color
- [ ] Zoom controls allow switching between 5 zoom levels
- [ ] Today marker line is visible and updates daily
- [ ] Tooltips show task details on hover
- [ ] Virtual scrolling handles 1000+ tasks efficiently
- [ ] Filtering and grouping options work correctly
- [ ] Changes save to database and sync in real-time
- [ ] All tests pass with >80% coverage

## Validation Steps

```bash
# 1. Install dependencies
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities date-fns

# 2. Run component tests
npm test -- tests/components/gantt/GanttChart.test.tsx

# 3. Run calculation tests
npm test -- tests/lib/gantt/calculations.test.ts

# 4. Start dev server
npm run dev

# 5. Test basic rendering
# Navigate to project with phases
# Open Gantt view
# Verify all phases display as bars
# Verify timeline header shows dates

# 6. Test zoom controls
# Click zoom in/out buttons
# Verify timeline updates (day -> week -> month)
# Verify task bars scale appropriately
# Test "Fit to Screen" button

# 7. Test drag-and-drop
# Drag a task bar to new date
# Verify preview shows during drag
# Drop task
# Verify task updates in database
# Refresh page and verify change persisted

# 8. Test duration resize
# Grab right edge of task bar
# Drag to extend or shorten duration
# Verify end date updates correctly

# 9. Test dependencies
# Create dependency between two tasks
# Verify line draws correctly
# Move dependent task
# Verify line updates
# Verify constraint validation (can't move before predecessor)

# 10. Test critical path
# Create project with multiple dependent tasks
# Verify critical path highlighted in red/bold
# Change duration of critical task
# Verify critical path updates

# 11. Test filtering
# Filter by division
# Verify only tasks for that division shown
# Filter by status
# Verify completed tasks hidden (if filtered)

# 12. Test performance
# Load project with 500+ phases
# Verify smooth scrolling (60fps)
# Verify no lag during drag/drop

# 13. Test real-time updates
# Open Gantt in two browser windows
# Update task in one window
# Verify update appears in other window

# 14. Run integration tests
npm run test:ci
```

## Expected Output

```
✓ Interactive Gantt chart component
✓ Timeline header with multiple zoom levels
✓ Drag-and-drop task rescheduling
✓ Dependency lines with 4 types
✓ Critical path highlighting
✓ Zoom controls (5 levels)
✓ Filtering and grouping options
✓ Tooltips with task details
✓ Virtual scrolling for performance
✓ Real-time updates via WebSocket
✓ All tests passing (>80% coverage)
```

## Technical Details

### Gantt Calculations
```typescript
// Calculate task bar position
const startX = (taskStartDate - timelineStartDate) / millisecondsPerPixel
const width = taskDuration / millisecondsPerPixel

// Calculate dependency line path
const path = `M ${task1EndX} ${task1Y}
              L ${task1EndX + 10} ${task1Y}
              L ${task1EndX + 10} ${task2Y}
              L ${task2StartX} ${task2Y}`
```

### Zoom Levels
```typescript
const ZOOM_LEVELS = {
  HOUR: { pixelsPerDay: 480, label: 'Hour' },
  DAY: { pixelsPerDay: 20, label: 'Day' },
  WEEK: { pixelsPerDay: 3, label: 'Week' },
  MONTH: { pixelsPerDay: 1, label: 'Month' },
  QUARTER: { pixelsPerDay: 0.33, label: 'Quarter' }
}
```

### Dependency Types
```typescript
enum DependencyType {
  FINISH_TO_START = 'FS',  // Most common: Task B starts when Task A finishes
  START_TO_START = 'SS',    // Task B starts when Task A starts
  FINISH_TO_FINISH = 'FF',  // Task B finishes when Task A finishes
  START_TO_FINISH = 'SF'    // Rare: Task B finishes when Task A starts
}
```

## Related PRPs
- Depends on: PRP-004 (Project Management), PRP-024 (WebSocket Real-time)
- Related: PRP-022 (Capacity Dashboard), PRP-026 (Mobile Optimization)
- Blocks: None (optional feature)

## Estimated Time
12-14 hours

## Notes
- Use SVG for rendering (better for lines and scaling)
- Consider using canvas for very large datasets (>2000 tasks)
- Implement virtual scrolling to only render visible tasks
- Cache calculated positions for performance
- Use RAF (requestAnimationFrame) for smooth animations
- Support keyboard shortcuts (arrow keys to navigate, +/- to zoom)
- Consider adding export Gantt to image (PNG/PDF)
- Add print stylesheet for printing Gantt charts
- Support baseline comparison (planned vs actual)
- Show milestone markers (diamonds)
- Support recurring tasks (future enhancement)
- Add resource leveling algorithm (future enhancement)
- Consider using library like bryntum-gantt or frappe-gantt as reference

## Rollback Plan
If validation fails:
1. Check @dnd-kit installation and compatibility
2. Verify SVG rendering in target browsers
3. Test with small dataset first (10 tasks)
4. Check calculation utilities independently
5. Verify date-fns functions correctly
6. Test drag-and-drop without persistence first
7. Review dependency line path calculations
8. Check virtual scrolling implementation
9. Test performance with Chrome DevTools Performance tab
10. Verify WebSocket connection for real-time updates
