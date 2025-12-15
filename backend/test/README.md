# Testing

This directory contains tests for the Legal Tracker backend.

## Running Tests

```bash
# Run all tests (unit + integration)
npm test

# Run tests in watch mode
npm run test:watch

# Run only unit tests
node --test test/unit.test.js

# Run only integration tests
node --test test/api.test.js
```

## Test Files

- **`unit.test.js`** - Unit tests for utility functions and business logic (8 tests)
- **`api.test.js`** - Full API integration tests (10 tests)

## Current Status

✅ **Unit tests** - Fully functional, test core logic
✅ **API integration tests** - Fully functional, test all endpoints

## Test Coverage

### Unit Tests (8 tests)
- Date calculations
- Cost calculations
- String parsing (floats, IP addresses)
- Environment variable handling

### Integration Tests (10 tests)
- Health check endpoint
- Status endpoint
- Incidents list endpoint
- Create incident
- Update incident
- Delete incident
- 404 error handling
- Settings: update lifetime spent
- Settings: add to lifetime spent
- Settings: set last incident date

## How It Works

The integration tests use an in-memory SQLite database and create a fresh server instance for each test run:

```javascript
// test/api.test.js
import { createServer } from '../server.js';

before(async () => {
  // Create test server with in-memory database
  server = await createServer({
    logger: false,           // Suppress logs
    dbPath: ':memory:',      // Use RAM instead of disk
    requireAuth: false       // Disable auth for tests
  });

  // Start on random port
  await server.listen({ port: 0, host: '127.0.0.1' });
});

after(async () => {
  await server.close();
});
```

This provides:
- **Isolation** - Each test run uses a fresh database
- **Speed** - In-memory database is very fast
- **No side effects** - Tests don't affect production data
- **Reliability** - No shared state between runs
