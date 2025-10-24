# PRP-027: Reporting Engine

## Status
🔲 Not Started

## Priority
P2 - Medium (Business intelligence feature)

## Objective
Build comprehensive reporting engine with PDF generation, scheduled reports, custom report builder, and executive dashboards for data-driven decision making.

## Scope

### Files to Create
- `src/services/reports/report-generator.service.ts` - Report generation orchestration
- `src/services/reports/pdf-generator.service.ts` - PDF generation using Puppeteer
- `src/services/reports/schedulers/report-scheduler.service.ts` - Scheduled report delivery
- `src/services/reports/templates/executive-summary.ts` - Executive summary template
- `src/services/reports/templates/capacity-report.ts` - Capacity report template
- `src/services/reports/templates/financial-report.ts` - Financial report template
- `src/services/reports/templates/project-status.ts` - Project status template
- `src/app/api/reports/generate/route.ts` - Generate report endpoint
- `src/app/api/reports/schedule/route.ts` - Schedule report endpoint
- `src/app/api/reports/templates/route.ts` - List templates endpoint
- `src/components/reports/ReportBuilder.tsx` - Custom report builder UI
- `src/components/reports/ReportPreview.tsx` - Report preview component
- `src/components/reports/ReportScheduler.tsx` - Schedule configuration UI
- `src/components/reports/ReportLibrary.tsx` - Saved reports library
- `src/hooks/useReports.ts` - Reports data hook
- `src/lib/reports/formatters.ts` - Data formatting utilities
- `src/lib/reports/charts.ts` - Chart generation for PDFs
- `tests/services/report-generator.test.ts` - Report tests
- `tests/services/pdf-generator.test.ts` - PDF generation tests

### Database Extensions
```prisma
model Report {
  id          String       @id @default(uuid())
  name        String
  description String?
  type        ReportType
  template    String
  filters     Json?
  schedule    Json?        // Cron expression + recipients
  createdBy   String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  user        User         @relation(fields: [createdBy], references: [id])
}

enum ReportType {
  EXECUTIVE_SUMMARY
  CAPACITY_REPORT
  FINANCIAL_REPORT
  PROJECT_STATUS
  CUSTOM
}

model ReportRun {
  id          String   @id @default(uuid())
  reportId    String
  status      String   // PENDING, RUNNING, COMPLETED, FAILED
  fileUrl     String?
  generatedAt DateTime @default(now())
  report      Report   @relation(fields: [reportId], references: [id])
}
```

### Dependencies to Install
```bash
npm install puppeteer
npm install chart.js chartjs-node-canvas
npm install node-cron
npm install nodemailer
npm install handlebars
```

## Implementation Steps

1. **Set Up PDF Generation**
   - Install and configure Puppeteer
   - Create HTML templates with Handlebars
   - Convert HTML to PDF with Puppeteer
   - Add headers, footers, page numbers
   - Support charts and images in PDFs
   - Optimize for print (page breaks, margins)

2. **Create Report Templates**
   - **Executive Summary**: High-level metrics, KPIs, trends
   - **Capacity Report**: Utilization, allocation, forecast
   - **Financial Report**: SOV, cash flow, P&L
   - **Project Status**: Active projects, milestones, risks
   - Each template with sections, charts, tables

3. **Build Report Generator Service**
   - Fetch data based on report type
   - Apply filters and date ranges
   - Format data for template
   - Generate charts as images
   - Render HTML from template
   - Convert to PDF
   - Upload to storage (S3/MinIO)

4. **Implement Report Scheduler**
   - Use node-cron for scheduling
   - Support cron expressions (daily, weekly, monthly)
   - Generate reports automatically
   - Email reports to recipients
   - Store report runs in database
   - Retry failed runs

5. **Create Custom Report Builder**
   - Drag-and-drop report sections
   - Select data sources (projects, capacity, financials)
   - Choose visualizations (table, chart, metric)
   - Apply filters and grouping
   - Preview before saving
   - Save as template for reuse

6. **Add Report Library**
   - List all saved reports
   - Filter by type, creator, date
   - Quick actions (generate, schedule, edit, delete)
   - Favorite reports
   - Clone report to modify
   - Share report with team

7. **Implement Chart Generation**
   - Use chartjs-node-canvas for server-side charts
   - Support chart types: bar, line, pie, combo
   - Match app styling in report charts
   - Export charts as PNG for PDFs
   - Responsive chart sizing

8. **Add Email Delivery**
   - Configure Nodemailer with SMTP
   - Email template for report delivery
   - Attach PDF to email
   - Include report summary in body
   - Support multiple recipients
   - Track email delivery status

9. **Create Report API Endpoints**
   - POST /api/reports/generate - Generate on-demand
   - GET /api/reports - List saved reports
   - POST /api/reports - Create new report
   - PATCH /api/reports/[id] - Update report
   - POST /api/reports/[id]/schedule - Schedule report
   - GET /api/reports/[id]/runs - Get run history

## Acceptance Criteria

- [ ] PDF reports generate successfully with proper formatting
- [ ] All 4 standard report templates implemented and functional
- [ ] Custom report builder allows creating reports with drag-and-drop
- [ ] Scheduled reports run automatically at configured times
- [ ] Reports delivered via email with PDF attachment
- [ ] Charts render correctly in PDF reports
- [ ] Report library shows all saved reports with filters
- [ ] Report generation handles large datasets (10,000+ records)
- [ ] PDFs include headers, footers, page numbers, branding
- [ ] Failed report runs retry automatically (3 attempts)
- [ ] All API endpoints return correct data with validation
- [ ] All tests pass with >80% coverage

## Validation Steps

```bash
# 1. Install report dependencies
npm install puppeteer chart.js chartjs-node-canvas node-cron nodemailer handlebars

# 2. Run report generator tests
npm test -- tests/services/report-generator.test.ts

# 3. Run PDF generator tests
npm test -- tests/services/pdf-generator.test.ts

# 4. Start dev server
npm run dev

# 5. Test Executive Summary report
# Navigate to Reports page
# Select "Executive Summary" template
# Click "Generate Report"
# Verify PDF downloads
# Open PDF and verify:
#   - All sections present
#   - Charts render correctly
#   - Data is accurate
#   - Headers/footers/page numbers

# 6. Test Capacity Report
# Generate Capacity Report
# Verify utilization charts
# Verify division breakdown
# Verify employee allocation table

# 7. Test Financial Report
# Generate Financial Report
# Verify SOV summary
# Verify cash flow projection chart
# Verify expense breakdown

# 8. Test custom report builder
# Navigate to Report Builder
# Drag sections to canvas
# Select data sources
# Apply filters
# Preview report
# Save report
# Generate report

# 9. Test report scheduling
# Open Report Scheduler
# Select report to schedule
# Set schedule (e.g., "Every Monday at 9 AM")
# Add email recipients
# Save schedule
# Manually trigger scheduled job
# Verify email received with PDF

# 10. Test large dataset
# Generate report with 5000+ projects
# Verify generation completes (<60 seconds)
# Verify PDF file size reasonable (<10MB)

# 11. Test API endpoints
curl -X POST http://localhost:3000/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"type": "EXECUTIVE_SUMMARY", "filters": {}}' \
  --output report.pdf
# Should download PDF

curl http://localhost:3000/api/reports
# Should list saved reports

# 12. Test email delivery
# Configure SMTP settings (use Mailhog for local testing)
# Schedule report
# Trigger scheduled job
# Check Mailhog (http://localhost:8025) for email

# 13. Run integration tests
npm run test:ci
```

## Expected Output

```
✓ PDF generator with Puppeteer
✓ 4 standard report templates (Executive, Capacity, Financial, Project)
✓ Custom report builder with drag-and-drop
✓ Report scheduler with cron support
✓ Email delivery with PDF attachments
✓ Chart generation for PDFs
✓ Report library with saved reports
✓ API endpoints for report management
✓ Report runs tracked in database
✓ All tests passing (>80% coverage)
```

## Report Template Example

### Executive Summary Sections
1. **Key Metrics**
   - Total active projects
   - Total contract value
   - Overall utilization
   - Cash position
2. **Charts**
   - Revenue trend (6 months)
   - Utilization by division
   - Project pipeline
3. **Alerts & Risks**
   - Overallocated divisions
   - Low cash flow warnings
   - Delayed projects
4. **Top Projects**
   - Highest value projects
   - Recently awarded
   - Nearing completion

### Capacity Report Sections
1. **Summary Metrics**
   - Total capacity
   - Allocated capacity
   - Available capacity
   - Utilization %
2. **Charts**
   - Utilization heatmap
   - Trend over 12 weeks
   - By division comparison
3. **Tables**
   - Division breakdown
   - Top utilized employees
   - Available employees
4. **Forecast**
   - 30/60/90 day projection
   - Hiring recommendations

## Related PRPs
- Depends on: PRP-016 (Schedule of Values), PRP-017 (Cash Flow Projection), PRP-022 (Capacity Dashboard)
- Related: PRP-020 (Excel Export), PRP-018 (Financial Alerts)
- Blocks: None (optional feature)

## Estimated Time
12-14 hours

## Notes
- Run Puppeteer in headless mode for performance
- Consider using Puppeteer serverless for cloud deployments (AWS Lambda)
- Cache chart images for 15 minutes to avoid regenerating
- Limit concurrent report generations to 3 to prevent server overload
- Store generated PDFs in S3/MinIO with 30-day retention
- Use Handlebars for template flexibility
- Support custom branding (logo, colors) per organization
- Consider watermarking PDFs (confidential, draft, etc.)
- Add report versioning (compare reports over time)
- Support exporting raw data as CSV in addition to PDF
- Log all report generations to audit log
- Monitor report generation time and optimize slow reports
- Consider using workers/queue for long-running reports
- Support drill-down links in PDF (if viewing digitally)

## Performance Considerations
- **Small Reports** (<10 pages): <5 seconds
- **Medium Reports** (10-50 pages): <15 seconds
- **Large Reports** (50+ pages): <60 seconds
- Use pagination for large datasets
- Generate charts asynchronously
- Cache frequently accessed data (15-minute TTL)

## Rollback Plan
If validation fails:
1. Check Puppeteer installation: `npm list puppeteer`
2. Verify Puppeteer can launch browser (may need Chrome/Chromium)
3. Test HTML template rendering without PDF conversion
4. Check chart generation independently
5. Verify Handlebars template syntax
6. Test with small dataset first (10 records)
7. Check SMTP configuration for email delivery
8. Verify node-cron expressions are valid
9. Test report storage (S3/MinIO) connectivity
10. Review Puppeteer logs for errors
