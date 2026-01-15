# Testing & CI/CD Setup

This document describes the testing infrastructure and CI/CD pipeline for the Legal Tracker project.

## Quick Start

```bash
# Install dependencies (if not already done)
cd backend
npm install

# Run tests
npm test

# Run tests in watch mode (auto-reruns on file changes)
npm run test:watch
```

## Test Structure

### Current Tests

All tests are located in `backend/test/`:

1. **Unit Tests** (`unit.test.js`) ✅
   - Date calculations
   - Cost calculations
   - String parsing (IPs, floats)
   - Environment variable handling
   - **Status**: Fully functional

2. **API Integration Tests** (`api.test.js`) ⚠️
   - Health check endpoint
   - Status endpoint
   - Matters endpoint
   - **Status**: Skipped by default (requires server refactoring)

### Running Integration Tests

Integration tests are skipped by default. To enable them:

```bash
ENABLE_INTEGRATION_TESTS=true npm test
```

Note: These tests require the server to be refactored to export the Fastify instance. See `backend/test/README.md` for implementation details.

## GitHub Actions CI

### What It Does

The CI workflow (`.github/workflows/ci.yml`) automatically runs on:
- Every push to `main` or `master`
- Every pull request to `main` or `master`

### CI Jobs

1. **Test Job**
   - Tests across Node.js versions: 18.x, 20.x, 22.x
   - Installs dependencies with `npm ci` (faster, more reliable)
   - Runs linter (if configured)
   - Runs test suite
   - Validates build (if configured)

2. **Frontend Validation**
   - Checks that required frontend files exist
   - Ensures `index.html` and `app.js` are present

### Adding a Status Badge

Add this to your README to show CI status:

```markdown
![CI](https://github.com/YOUR_USERNAME/legal-tracker/workflows/CI/badge.svg)
```

Replace `YOUR_USERNAME` with your GitHub username.

## Writing New Tests

### Unit Tests

Add new test files to `backend/test/` with the `.test.js` extension:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('My Feature', () => {
  it('should do something', () => {
    const result = myFunction();
    assert.strictEqual(result, expectedValue);
  });
});
```

### Test Framework

This project uses Node.js built-in test runner (available in Node 18+):
- No external dependencies needed
- Fast and lightweight
- Built-in assertion library
- Watch mode support

## Future Improvements

### Integration Testing

To enable full API integration tests:

1. **Refactor server.js**
   ```javascript
   export function createServer(options = {}) {
     const fastify = Fastify({ ...defaultOptions, ...options });
     // ... setup routes
     return fastify;
   }
   ```

2. **Update tests**
   ```javascript
   import { createServer } from '../server.js';

   let server;

   before(async () => {
     server = createServer({ logger: false });
     await server.listen({ port: 0, host: '127.0.0.1' });
   });

   after(async () => {
     await server.close();
   });
   ```

3. **Use in-memory database**
   - Configure SQLite to use `:memory:` for tests
   - Prevents test pollution
   - Faster test execution

### Code Coverage

To add coverage reporting:

```bash
# Install c8 (coverage tool for Node.js)
npm install --save-dev c8

# Update package.json
"test:coverage": "c8 npm test"
```

### End-to-End Testing

For browser-based E2E testing:
- Consider Playwright or Cypress
- Test full user workflows
- Validate UI behavior

## Troubleshooting

### Tests failing locally but pass in CI

- Check Node.js version matches CI (use `nvm use 20`)
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for environment-specific configuration

### CI failing on GitHub

- Check the Actions tab in your GitHub repository
- Review the build logs for specific errors
- Ensure all dependencies are in `package.json` (not just local installs)

### Database locked errors in tests

- Make sure tests clean up properly
- Use in-memory database for testing
- Don't run tests against production database

## Best Practices

1. **Keep tests fast** - Unit tests should run in milliseconds
2. **Test behavior, not implementation** - Focus on what, not how
3. **One assertion per test** - Makes failures easier to debug
4. **Use descriptive test names** - `should calculate total cost correctly`
5. **Clean up after tests** - Close connections, delete test data
6. **Don't test external services** - Mock API calls and databases

## Resources

- [Node.js Test Runner Docs](https://nodejs.org/api/test.html)
- [Fastify Testing Guide](https://www.fastify.io/docs/latest/Guides/Testing/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
