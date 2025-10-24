# PRP-020: Excel Export

## Status
🔲 Not Started

## Priority
P2 - Medium (Reporting feature)

## Objective
Implement comprehensive Excel export functionality for reports, dashboards, and data tables with multi-sheet support, formatting, charts, and automated report generation.

## Scope

### Files to Create
- `src/services/export/excel-export.service.ts` - Excel export orchestration
- `src/services/export/formatters/project-formatter.ts` - Project data formatter
- `src/services/export/formatters/capacity-formatter.ts` - Capacity data formatter
- `src/services/export/formatters/financial-formatter.ts` - Financial data formatter
- `src/services/export/formatters/report-formatter.ts` - Report formatter
- `src/services/export/generators/chart-generator.ts` - Excel chart generation
- `src/app/api/export/excel/route.ts` - Excel export API endpoint
- `src/app/api/export/projects/route.ts` - Project export endpoint
- `src/app/api/export/capacity/route.ts` - Capacity export endpoint
- `src/app/api/export/financial/route.ts` - Financial export endpoint
- `src/components/export/ExportButton.tsx` - Export button component
- `src/components/export/ExportDialog.tsx` - Export options dialog
- `src/hooks/useExcelExport.ts` - Export hook
- `src/lib/excel/writer.ts` - Excel writing utilities
- `src/lib/excel/styling.ts` - Excel styling utilities
- `tests/services/excel-export.test.ts` - Export service tests
- `tests/lib/excel/writer.test.ts` - Writer tests

## Implementation Steps

1. **Set Up ExcelJS for Writing**
   - Configure ExcelJS for creating workbooks
   - Create utility functions for writing data
   - Support formatting and styling
   - Handle large datasets with streaming

2. **Create Data Formatters**
   - Transform database models to Excel rows
   - Format dates consistently (MM/DD/YYYY)
   - Format currency with $ and 2 decimals
   - Format percentages with % symbol
   - Handle null values appropriately

3. **Implement Multi-Sheet Exports**
   - Create workbooks with multiple sheets
   - Summary sheet with key metrics
   - Detail sheets for entity data
   - Charts sheet with visualizations
   - Notes sheet with export metadata

4. **Add Excel Formatting**
   - Header row styling (bold, background color)
   - Alternating row colors for readability
   - Column auto-width based on content
   - Number formatting for currency and dates
   - Conditional formatting for thresholds
   - Freeze header rows

5. **Generate Excel Charts**
   - Bar charts for project budgets
   - Line charts for cash flow
   - Pie charts for capacity by division
   - Combo charts for variance analysis
   - Embed charts in Excel workbook

6. **Create Export Presets**
   - **Project Summary**: All projects with key metrics
   - **Capacity Report**: Employee utilization and allocation
   - **Financial Report**: SOV, expenses, cash flow
   - **Schedule Report**: Gantt data export
   - **Custom Export**: User-defined fields and filters

7. **Implement Export API Endpoints**
   - POST /api/export/excel - Generic export
   - GET /api/export/projects - Export all projects
   - GET /api/export/capacity - Export capacity data
   - GET /api/export/financial - Export financial data
   - POST /api/export/custom - Custom export with filters

8. **Add Export UI Components**
   - Export button on data tables
   - Export dialog with format options
   - Preview before export
   - Progress indicator for large exports
   - Download completed file

9. **Create Scheduled Exports**
   - Weekly automated reports via email
   - Monthly executive summary
   - End-of-month financial close export
   - Custom schedule configuration

## Acceptance Criteria

- [ ] Excel files (.xlsx) generated successfully with data
- [ ] Multi-sheet workbooks created with summary and detail sheets
- [ ] Formatting applied consistently (headers, currency, dates)
- [ ] Charts embedded in Excel workbooks
- [ ] Column widths auto-adjusted for content
- [ ] Large datasets (10,000+ rows) export efficiently (<60 seconds)
- [ ] Export presets available for common reports
- [ ] Custom exports support field selection and filtering
- [ ] Export button integrated into all major data tables
- [ ] Progress indicator shows export status
- [ ] Scheduled exports deliver reports via email
- [ ] Export metadata included (generated date, user, filters)
- [ ] All tests pass with >80% coverage

## Validation Steps

```bash
# 1. Run unit tests
npm test -- tests/services/excel-export.test.ts
npm test -- tests/lib/excel/writer.test.ts

# 2. Start dev server
npm run dev

# 3. Test basic export
# Navigate to Projects page
# Click "Export to Excel" button
# Verify Excel file downloads
# Open file and verify data is correct

# 4. Test multi-sheet export
# Export "Full Financial Report"
# Open Excel file
# Verify multiple sheets (Summary, SOV, Expenses, Cash Flow)
# Verify data matches application

# 5. Test formatting
# Export any report
# Verify headers are bold with background color
# Verify currency formatted as $X,XXX.XX
# Verify dates formatted as MM/DD/YYYY
# Verify columns auto-sized correctly

# 6. Test charts
# Export "Capacity Report"
# Open Excel file
# Verify chart sheet exists
# Verify charts display correctly

# 7. Test large export
# Export all projects (if >1000 records)
# Verify progress indicator shows
# Verify export completes successfully
# Verify all data included

# 8. Test custom export
# Open Export Dialog
# Select specific fields to export
# Apply filters (e.g., only active projects)
# Export and verify only selected data included

# 9. Test API endpoints
curl -X POST http://localhost:3000/api/export/projects \
  -H "Content-Type: application/json" \
  -d '{"format": "xlsx"}' \
  --output projects.xlsx
# Should download Excel file

# 10. Test scheduled export
# Configure weekly export to email
# Manually trigger scheduled export
# Verify email received with attachment
# Verify Excel file is correct

# 11. Verify Excel file integrity
# Open exported files in Excel, Google Sheets, LibreOffice
# Verify compatibility across platforms

# 12. Run integration tests
npm run test:ci
```

## Expected Output

```
✓ ExcelJS configured for creating .xlsx workbooks
✓ Data formatters for all entity types
✓ Multi-sheet workbooks with summary and details
✓ Excel formatting with styling and auto-width
✓ Charts embedded in workbooks
✓ Export presets for common reports
✓ Custom export with field selection
✓ Export UI integrated into data tables
✓ Scheduled exports via email
✓ All tests passing (>80% coverage)
```

## Export Preset Examples

### Project Summary Export
```
Sheets:
  - Summary: Count, total value, by division
  - Projects: All project details
  - Phases: All phase details
  - Charts: Budget distribution, timeline
```

### Capacity Report Export
```
Sheets:
  - Summary: Total capacity, utilization %
  - By Division: Capacity breakdown
  - By Employee: Individual allocations
  - Charts: Utilization over time, by division
```

### Financial Report Export
```
Sheets:
  - Summary: Total billed, total expenses, profit
  - SOV: Schedule of values detail
  - Expenses: All expenses by project
  - Cash Flow: 90-day projection
  - Charts: Cash flow trend, profit by project
```

## Related PRPs
- Depends on: PRP-002 (Database Foundation), PRP-016 (Schedule of Values)
- Related: PRP-019 (Excel Import), PRP-027 (Reporting Engine)
- Blocks: None (optional feature)

## Estimated Time
8-10 hours

## Notes
- Use ExcelJS library for creating Excel files
- Support only .xlsx (modern Excel) format for exports
- Limit export to 50,000 rows per sheet (Excel limitation)
- Use streaming for exports >10,000 rows to reduce memory
- Generate files server-side, not client-side (better performance)
- Cache generated exports for 1 hour (if requested again, serve from cache)
- Include export metadata footer (Generated on DATE by USER)
- Add watermark for confidential reports
- Support export to Google Sheets (future enhancement)
- Consider adding CSV export as lightweight alternative
- Log all exports to audit log
- Compress large Excel files before download (zip)
- Support exporting filtered/sorted data as displayed in UI

## Rollback Plan
If validation fails:
1. Check ExcelJS installation: `npm list exceljs`
2. Verify data formatters return correct structure
3. Test with small dataset first (10 rows)
4. Check styling utilities apply correctly
5. Verify chart generation with sample data
6. Test file download in different browsers
7. Check memory usage for large exports (use streaming if needed)
8. Verify Excel file opens in Microsoft Excel
9. Test compatibility with Google Sheets and LibreOffice
10. Review error handling for missing data
