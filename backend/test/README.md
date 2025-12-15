# Test Suite

## Test Files

- `api.test.js` - API endpoint tests
- `admin.test.js` - Admin portal and authentication tests
- `comprehensive.test.js` - End-to-end integration tests
- `unit.test.js` - Unit tests for utility functions
- `validation-report.test.js` - Generates detailed validation report

## Validation Report

The validation report (`test-validation-report.json`) is automatically generated on each CI run and provides detailed evidence of test execution.

### Viewing the Report

The report is available in two ways:

1. **In Repository**: [backend/test-validation-report.json](../test-validation-report.json)
   - Updated automatically on each push to main/master
   - Shows the most recent validation run

2. **GitHub Actions Artifacts**
   - Go to Actions tab → select a workflow run
   - Download "validation-report" artifact
   - Contains report for that specific run

### Report Contents

Each validation entry includes:
- Full HTTP request (method, URL, headers, body)
- Full HTTP response (status, headers, body, timing)
- Database state before and after operations
- Step-by-step execution log with timestamps
- Expected vs actual comparisons for all assertions
- Individual verification for bulk operations

### Running Locally

Generate the validation report:
```bash
npm test -- test/validation-report.test.js
```

The report will be written to `backend/test-validation-report.json`.

### Report Format

The JSON report is log-ingest ready and includes:
- `report_metadata` - Generation timestamp, duration, test count
- `summary` - Pass/fail statistics
- `validations` - Array of test results with full execution details

See [VALIDATION_REPORT_SUMMARY.md](../VALIDATION_REPORT_SUMMARY.md) for detailed examples.
