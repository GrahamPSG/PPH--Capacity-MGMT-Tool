# PRP-023: Project UI Components

## Status
🔲 Not Started

## Priority
P1 - High (Core user interface)

## Objective
Create comprehensive, reusable project UI components including list views, detail views, forms, and mobile-responsive layouts with consistent styling and behavior.

## Scope

### Files to Create
- `src/components/projects/ProjectList.tsx` - Project list table view
- `src/components/projects/ProjectCard.tsx` - Project card component
- `src/components/projects/ProjectGrid.tsx` - Grid layout for cards
- `src/components/projects/ProjectDetail.tsx` - Project detail page
- `src/components/projects/ProjectForm.tsx` - Create/edit project form
- `src/components/projects/ProjectHeader.tsx` - Project detail header
- `src/components/projects/ProjectTabs.tsx` - Tabbed navigation
- `src/components/projects/ProjectMetrics.tsx` - Key metrics display
- `src/components/projects/ProjectTimeline.tsx` - Project timeline
- `src/components/projects/ProjectTeam.tsx` - Team member list
- `src/components/projects/ProjectPhases.tsx` - Phase list component
- `src/components/projects/PhaseCard.tsx` - Individual phase card
- `src/components/projects/PhaseForm.tsx` - Create/edit phase form
- `src/components/projects/ProjectFilters.tsx` - Filter controls
- `src/components/projects/ProjectSearch.tsx` - Search component
- `src/components/projects/ProjectActions.tsx` - Action menu dropdown
- `src/components/projects/StatusBadge.tsx` - Status indicator
- `src/components/projects/DivisionBadge.tsx` - Division indicator
- `src/hooks/useProjects.ts` - Project data hook
- `src/hooks/useProjectDetail.ts` - Single project hook
- `tests/components/projects/ProjectList.test.tsx` - List tests
- `tests/components/projects/ProjectForm.test.tsx` - Form tests

## Implementation Steps

1. **Create Project List Component**
   - Data table with sortable columns
   - Columns: Name, Job Number, Division, Status, Start Date, Contract Value
   - Pagination (25/50/100 per page)
   - Row click to navigate to detail
   - Bulk actions (delete, export, status change)
   - Responsive collapse on mobile

2. **Build Project Card Component**
   - Compact card layout for grid view
   - Show key info: name, status, division, budget
   - Progress bar for completion percentage
   - Quick actions (edit, delete, view)
   - Color-coded by status or division
   - Hover effects

3. **Implement Project Detail Page**
   - Header with project name and key actions
   - Tabbed interface:
     - Overview: metrics, timeline, team
     - Phases: phase list with Gantt
     - Financials: SOV, expenses, cash flow
     - Documents: file uploads
     - Activity: audit log
   - Sticky header on scroll
   - Breadcrumb navigation

4. **Create Project Form**
   - Multi-step form wizard:
     - Step 1: Basic info (name, job number, division)
     - Step 2: Dates and budget
     - Step 3: Team assignments
     - Step 4: Review and submit
   - Field validation with error messages
   - Auto-save drafts
   - Cancel confirmation dialog

5. **Build Phase Components**
   - Phase list with expandable details
   - Phase card showing progress and dates
   - Phase form for create/edit
   - Drag-to-reorder phases
   - Mark phase complete action
   - Dependency indicator

6. **Implement Filtering and Search**
   - Filter by division, status, date range
   - Advanced filters (budget range, team member)
   - Full-text search across name, job number, notes
   - Clear all filters button
   - Save filter presets
   - Show active filter badges

7. **Create Responsive Layouts**
   - Desktop: table view default
   - Tablet: grid view with cards
   - Mobile: list view with stacked cards
   - Breakpoints: 640px, 768px, 1024px
   - Touch-friendly buttons and controls
   - Optimized for both portrait and landscape

8. **Add Status and Division Badges**
   - Color-coded status badges
   - Division badges with icons
   - Tooltip on hover with full description
   - Consistent styling across app

9. **Implement Action Menus**
   - Dropdown menu with actions:
     - Edit project
     - Duplicate project
     - Archive project
     - Delete project
     - Export project data
   - Permission-based action visibility
   - Confirmation dialogs for destructive actions

## Acceptance Criteria

- [ ] Project list displays all projects with correct data
- [ ] Sorting and pagination work correctly
- [ ] Project cards show key metrics in grid layout
- [ ] Project detail page loads with all tabs functional
- [ ] Project form validates inputs and shows clear errors
- [ ] Phase components allow creating, editing, reordering phases
- [ ] Filtering and search return accurate results
- [ ] Responsive layouts work on desktop, tablet, mobile
- [ ] Status and division badges display with correct colors
- [ ] Action menus show appropriate actions based on permissions
- [ ] All components follow design system (Tailwind + shadcn/ui)
- [ ] All tests pass with >80% coverage
- [ ] Components are accessible (ARIA labels, keyboard navigation)

## Validation Steps

```bash
# 1. Run component tests
npm test -- tests/components/projects/

# 2. Start dev server
npm run dev

# 3. Test project list
# Navigate to /projects
# Verify all projects display in table
# Test sorting by clicking column headers
# Test pagination (next/previous/page numbers)
# Test bulk actions (select multiple, delete)

# 4. Test project grid view
# Switch to grid view
# Verify cards display correctly
# Test card hover effects
# Click card to navigate to detail

# 5. Test project detail page
# Click a project to open detail
# Verify all tabs load (Overview, Phases, Financials, etc.)
# Test sticky header scrolls correctly
# Test breadcrumb navigation

# 6. Test project form
# Click "New Project" button
# Fill out multi-step form
# Test validation (try submitting with empty fields)
# Submit form
# Verify project created in database

# 7. Test phase components
# On project detail, go to Phases tab
# Add new phase
# Edit existing phase
# Drag to reorder phases
# Mark phase as complete

# 8. Test filtering and search
# Use division filter
# Verify only matching projects shown
# Use status filter
# Search for project by name
# Test clearing all filters

# 9. Test responsive design
# Resize browser to mobile width (375px)
# Verify layout adapts to mobile
# Verify touch targets are large enough (44px min)
# Test on actual mobile device if available

# 10. Test action menus
# Click action menu on project
# Verify actions appear
# Test "Edit" action
# Test "Delete" action with confirmation

# 11. Test accessibility
npm run test:a11y
# Run axe accessibility tests
# Test keyboard navigation (Tab, Enter, Escape)
# Test screen reader announcements

# 12. Test with different user roles
# Login as Foreman (limited permissions)
# Verify some actions hidden
# Login as Owner (full permissions)
# Verify all actions visible

# 13. Run integration tests
npm run test:ci
```

## Expected Output

```
✓ Project list with sorting and pagination
✓ Project card component for grid layout
✓ Project detail page with tabbed interface
✓ Project form with multi-step wizard
✓ Phase components with CRUD operations
✓ Filtering and search functionality
✓ Responsive layouts for all screen sizes
✓ Status and division badges
✓ Action menus with permission-based visibility
✓ All components accessible (WCAG AA compliant)
✓ All tests passing (>80% coverage)
```

## Design Specifications

### Color Coding for Status
```typescript
const STATUS_COLORS = {
  QUOTED: 'bg-gray-100 text-gray-800',
  AWARDED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-green-100 text-green-800',
  ON_HOLD: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-red-100 text-red-800'
}
```

### Responsive Breakpoints
```typescript
const BREAKPOINTS = {
  mobile: '640px',   // Stack cards vertically
  tablet: '768px',   // 2-column grid
  desktop: '1024px', // Table view, 3-column grid
  wide: '1280px'     // 4-column grid
}
```

### Form Validation Rules
```typescript
const PROJECT_VALIDATION = {
  name: { required: true, minLength: 3, maxLength: 200 },
  jobNumber: { required: true, pattern: /^J-\d{4}-\d{3}$/ },
  division: { required: true, enum: Division },
  contractValue: { required: true, min: 0, max: 100000000 },
  startDate: { required: true },
  endDate: { required: true, afterField: 'startDate' }
}
```

## Related PRPs
- Depends on: PRP-004 (Project Management), PRP-001 (Project Initialization)
- Related: PRP-021 (Gantt Chart), PRP-026 (Mobile Optimization)
- Blocks: None (can be implemented independently)

## Estimated Time
12-14 hours

## Notes
- Use shadcn/ui components as base (Table, Card, Form, Dialog)
- Customize with Tailwind classes for branding
- Use React Query for data fetching and caching
- Implement optimistic updates for better UX
- Use Zustand for local UI state (filters, view mode)
- Consider virtualization for very long project lists (>1000)
- Add skeleton loaders for better perceived performance
- Implement infinite scroll as alternative to pagination
- Use Framer Motion for smooth animations
- Support keyboard shortcuts (Cmd+K for search, N for new project)
- Add empty states with helpful messages and CTAs
- Consider split view for comparing projects side-by-side
- Add "Recently Viewed" quick access
- Implement undo/redo for project edits

## Rollback Plan
If validation fails:
1. Check shadcn/ui components installed correctly
2. Verify Tailwind CSS configured properly
3. Test components in isolation with Storybook
4. Check React Query setup and cache configuration
5. Test form validation schema with sample data
6. Verify responsive breakpoints in browser DevTools
7. Test on actual devices (iOS/Android) if mobile issues
8. Check accessibility with axe DevTools
9. Review component prop types and TypeScript errors
10. Test with different data volumes (empty, 1 item, 100 items, 10000 items)
