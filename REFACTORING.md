# Refactoring Summary

This document describes the refactoring work done to enable integration testing.

## What Changed

### 1. Database Module ([backend/db.js](backend/db.js))

**Before:**
- Created a single global database instance
- Hardcoded file path to `data/tracker.db`

**After:**
- Exported `createDatabase(dbPath)` function
- Allows creating database instances with custom paths
- Supports in-memory databases (`:memory:`) for testing
- Maintains backwards compatibility with default export

**Key Changes:**
```javascript
// New: Configurable database creation
export function createDatabase(dbPath = join(__dirname, 'data', 'tracker.db')) {
  // ... creates and returns { db, settingsDb, incidentsDb }
}

// Backwards compatible: Default instance
const defaultDb = createDatabase();
export const { settingsDb, incidentsDb } = defaultDb;
```

### 2. Server Module ([backend/server.js](backend/server.js))

**Before:**
- Server started immediately on import
- No way to create server instance programmatically
- Fixed configuration from environment variables

**After:**
- Exported `createServer(options)` function
- Server only starts when run directly (not when imported)
- Configurable options for testing
- Returns Fastify instance for programmatic control

**Key Changes:**
```javascript
// New: Exported server factory function
export async function createServer(options = {}) {
  const {
    logger = true,
    dbPath,                    // Custom database path
    requireAuth = ...,
    allowedIPs = ...,
   apiKey = ...,
    corsOrigin = ...
  } = options;

  // Create database instance with custom path
  const { settingsDb, incidentsDb } = createDatabase(dbPath);

  // ... setup routes ...

  return fastify;  // Return instance without starting
}

// Only start when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const fastify = await createServer();
  await fastify.listen({ port: PORT, host: HOST });
}
```

### 3. Integration Tests ([backend/test/api.test.js](backend/test/api.test.js))

**Before:**
- Tests were skipped by default
- Attempted to connect to external server
- No server lifecycle management

**After:**
- Fully functional integration tests
- Creates test server programmatically
- Uses in-memory database for test isolation
- Proper setup/teardown with before/after hooks

**Key Features:**
```javascript
let server;

before(async () => {
  server = await createServer({
    logger: false,           // Suppress logs
    dbPath: ':memory:',      // In-memory database
    requireAuth: false       // Disable auth for tests
  });

  // Start on random port
  await server.listen({ port: 0, host: '127.0.0.1' });
});

after(async () => {
  await server.close();
});
```

## Test Coverage

### Unit Tests (8 tests) ✅
- Date calculations
- Cost calculations
- String parsing
- Environment variable handling

### Integration Tests (10 tests) ✅
- Health check endpoint
- Status endpoint
- Incidents CRUD operations
- Settings updates
- Error handling (404s)

## Running Tests

```bash
# All tests (unit + integration)
npm test

# Unit tests only (no dependencies required)
node --test test/unit.test.js

# Integration tests only
node --test test/api.test.js

# Watch mode
npm run test:watch
```

## Benefits

1. **Testability** - Can now test the full API without external dependencies
2. **Isolation** - Each test run uses fresh in-memory database
3. **Speed** - In-memory database is much faster than file-based
4. **Reliability** - No shared state between test runs
5. **CI/CD** - Can run integration tests in GitHub Actions without complex setup
6. **Maintainability** - Server creation is now a pure function

## Backwards Compatibility

All changes are backwards compatible:

- ✅ Existing code using `import { settingsDb, incidentsDb } from './db.js'` still works
- ✅ Running `npm start` still starts the server normally
- ✅ Environment variables still work as before
- ✅ Production deployment unchanged

## Database Library Change

**Update:** We switched from `better-sqlite3` to `sql.js` to avoid native compilation issues.

### Why sql.js?

- ✅ **No compilation required** - Pure JavaScript/WebAssembly
- ✅ **Works on any Node.js version** - Including v25+
- ✅ **Easy installation** - `npm install` just works
- ✅ **Cross-platform** - No Python or build tools needed

### Trade-offs

- Slightly slower than native better-sqlite3
- Manual persistence (auto-saves after each write)
- API is async (requires `await`)

See [DATABASE.md](DATABASE.md) for full details on the database implementation.

## Node.js Version

The integration tests require Node.js 18+ (for built-in test runner and fetch).

With sql.js, any Node.js version works - even the latest v25!

## Next Steps

### Optional Improvements

1. **Add more test cases**
   - Authentication/authorization tests
   - Edge cases and error scenarios
   - Performance tests

2. **Add code coverage**
   ```bash
   npm install --save-dev c8
   # Add to package.json: "test:coverage": "c8 npm test"
   ```

3. **Add E2E tests**
   - Use Playwright or Cypress for frontend testing
   - Test full user workflows

4. **Database migrations**
   - Add versioned schema migrations
   - Test migration up/down functionality

5. **Mock external dependencies**
   - If you add external APIs, mock them in tests
   - Use tools like `nock` for HTTP mocking
