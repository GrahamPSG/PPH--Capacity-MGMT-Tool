# PRP-019: Excel Import

## Status
🔲 Not Started

## Priority
P2 - Medium (Efficiency feature)

## Objective
Implement robust Excel import system with template validation, bulk data import, error reporting, and data transformation for projects, employees, schedules, and expenses.

## Scope

### Files to Create
- `src/services/import/excel-import.service.ts` - Excel import orchestration
- `src/services/import/validators/template-validator.ts` - Template validation
- `src/services/import/parsers/project-parser.ts` - Project data parser
- `src/services/import/parsers/employee-parser.ts` - Employee data parser
- `src/services/import/parsers/schedule-parser.ts` - Schedule data parser
- `src/services/import/parsers/expense-parser.ts` - Expense data parser
- `src/services/import/transformers/data-transformer.ts` - Data transformation
- `src/app/api/import/excel/route.ts` - Excel import API endpoint
- `src/app/api/import/validate/route.ts` - Template validation endpoint
- `src/app/api/import/templates/route.ts` - Download templates endpoint
- `src/components/import/ExcelImporter.tsx` - Import UI component
- `src/components/import/ImportWizard.tsx` - Multi-step import wizard
- `src/components/import/ErrorReport.tsx` - Error display component
- `src/components/import/FieldMapper.tsx` - Column mapping UI
- `src/hooks/useExcelImport.ts` - Import hook
- `src/lib/excel/reader.ts` - Excel file reading utilities
- `src/lib/excel/validator.ts` - Validation rules
- `public/templates/project-import-template.xlsx` - Project template
- `public/templates/employee-import-template.xlsx` - Employee template
- `public/templates/schedule-import-template.xlsx` - Schedule template
- `tests/services/excel-import.test.ts` - Import service tests
- `tests/lib/excel/validator.test.ts` - Validator tests

## Implementation Steps

1. **Set Up ExcelJS**
   - Configure ExcelJS library
   - Create utility functions for reading Excel files
   - Support .xlsx and .xls formats
   - Handle large files (>10MB) with streaming

2. **Create Import Templates**
   - Design standardized Excel templates
   - Include headers with data types
   - Add sample data rows
   - Include data validation in templates
   - Add instructions sheet

3. **Implement Template Validator**
   - Verify template format matches expected schema
   - Check required columns present
   - Validate column headers
   - Verify sheet names
   - Check data types in columns

4. **Build Data Parsers**
   - Parse each row into typed objects
   - Handle missing or null values
   - Transform data formats (dates, numbers, enums)
   - Validate business rules
   - Collect validation errors

5. **Create Field Mapping UI**
   - Allow users to map Excel columns to database fields
   - Auto-detect common mappings
   - Preview data before import
   - Show validation errors
   - Allow skipping invalid rows

6. **Implement Bulk Import**
   - Transaction-based imports (all or nothing)
   - Progress tracking for large imports
   - Batch processing (500 rows at a time)
   - Duplicate detection
   - Update existing records or create new

7. **Add Error Reporting**
   - Detailed error messages per row
   - Export error report as Excel
   - Row-level validation results
   - Summary statistics (X succeeded, Y failed)

8. **Create Import Wizard**
   - Step 1: Upload file
   - Step 2: Validate template
   - Step 3: Map fields
   - Step 4: Preview data
   - Step 5: Import and review results

## Acceptance Criteria

- [ ] Excel files (.xlsx, .xls) can be uploaded and parsed
- [ ] Template validation detects missing or incorrect columns
- [ ] All 4 entity types (projects, employees, schedules, expenses) supported
- [ ] Field mapping UI allows custom column mapping
- [ ] Data transformation handles dates, numbers, and enums correctly
- [ ] Validation errors reported with row numbers and details
- [ ] Bulk import processes 1000+ rows efficiently (<30 seconds)
- [ ] Transaction rollback on import failure (no partial imports)
- [ ] Duplicate detection prevents creating duplicate records
- [ ] Error report can be downloaded as Excel file
- [ ] Progress indicator shows import status
- [ ] Import templates available for download
- [ ] All tests pass with >80% coverage

## Validation Steps

```bash
# 1. Generate import templates
npm run generate:templates
# Should create 4 Excel templates in public/templates/

# 2. Run unit tests
npm test -- tests/services/excel-import.test.ts
npm test -- tests/lib/excel/validator.test.ts

# 3. Start dev server
npm run dev

# 4. Test template download
# Navigate to Import page
# Click "Download Template" for each entity type
# Verify templates download correctly

# 5. Test project import
# Fill out project-import-template.xlsx with test data
# Upload via Import Wizard
# Verify validation passes
# Complete import
# Verify projects created in database

# 6. Test validation errors
# Upload template with invalid data (e.g., invalid date, missing required field)
# Verify errors displayed with row numbers
# Verify error report can be downloaded

# 7. Test field mapping
# Upload Excel with custom column names
# Use Field Mapper to map columns
# Verify data imported correctly

# 8. Test duplicate detection
# Import same file twice
# Verify system detects duplicates
# Verify option to skip or update existing records

# 9. Test large file import
# Create Excel with 2000+ rows
# Upload and import
# Verify progress indicator works
# Verify import completes successfully

# 10. Test transaction rollback
# Create Excel with 100 rows, make row 50 invalid
# Start import
# Verify import fails and no records created (rollback)

# 11. Test API endpoints
curl -X POST http://localhost:3000/api/import/validate \
  -F "file=@test.xlsx"
# Should return validation results

curl http://localhost:3000/api/import/templates/projects
# Should download project template

# 12. Run integration tests
npm run test:ci
```

## Expected Output

```
✓ ExcelJS configured for reading .xlsx and .xls files
✓ 4 import templates created and available for download
✓ Template validator detects format issues
✓ Data parsers for all 4 entity types
✓ Field mapping UI with auto-detection
✓ Bulk import with transaction support
✓ Error reporting with detailed messages
✓ Import wizard with 5 steps
✓ Progress tracking for large imports
✓ All tests passing (>80% coverage)
```

## Template Structure Examples

### Project Import Template
```
Columns: Project Name | Job Number | Division | Start Date | End Date | Contract Value | Status
Sample: New Hospital | J-2024-001 | PLUMBING_COMMERCIAL | 2024-01-15 | 2024-12-31 | 500000 | AWARDED
```

### Employee Import Template
```
Columns: First Name | Last Name | Division | Role | Hourly Rate | Start Date
Sample: John | Smith | HVAC_MULTIFAMILY | Journeyman | 45.50 | 2024-01-01
```

### Schedule Import Template
```
Columns: Project Job Number | Phase Name | Start Date | End Date | Labor Hours | Notes
Sample: J-2024-001 | Rough-In | 2024-02-01 | 2024-03-15 | 800 | First floor
```

## Related PRPs
- Depends on: PRP-002 (Database Foundation), PRP-004 (Project Management)
- Related: PRP-020 (Excel Export), PRP-027 (Reporting Engine)
- Blocks: None (optional feature)

## Estimated Time
10-12 hours

## Notes
- Use ExcelJS library (not xlsx library) for better TypeScript support
- Support both .xlsx (modern) and .xls (legacy Excel 97-2003) formats
- Limit file size to 25MB to prevent server overload
- Use streaming for files >5MB to reduce memory usage
- Store uploaded files temporarily (24 hour TTL) for re-import if needed
- Log all imports to audit log with user, timestamp, and record count
- Consider virus scanning for uploaded files in production
- Add import from Google Sheets via public URL (future enhancement)
- Support CSV import as alternative to Excel
- Validate data types before attempting database insert
- Use Prisma transactions for atomic imports
- Show preview of first 10 rows before full import

## Rollback Plan
If validation fails:
1. Check ExcelJS installation: `npm list exceljs`
2. Verify templates exist in public/templates/
3. Test with small sample file first
4. Check file upload size limits in Next.js config
5. Verify database connection for bulk inserts
6. Test validation rules independently
7. Check transaction support in Prisma client
8. Review error handling in parsers
9. Test with known good Excel files
10. Check memory usage for large files (use streaming if >5MB)
