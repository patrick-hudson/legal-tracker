# Test Suite

Organized test suite for the Legal Matters backend.

## Directory Structure

```
test/
├── helpers/
│   └── setup.js          # Shared test utilities
├── auth/
│   ├── login.test.js     # Login/logout authentication
│   └── password.test.js  # Password change functionality
├── matters/
│   ├── admin-crud.test.js    # Admin matter management
│   ├── api.test.js           # Public API endpoints
│   ├── consistency.test.js   # Data consistency
│   ├── drain.test.js         # Drain calculation
│   ├── integration.test.js   # Integration tests
│   └── validation.test.js    # Edge cases and validation
├── private-notes/
│   └── crud.test.js      # Private notes CRUD operations
├── attachments/
│   └── storage.test.js   # Attachment storage and handling
├── audit-log/
│   └── logging.test.js   # Audit log functionality
├── data-management/
│   ├── backup.test.js    # Backup and restore
│   ├── settings.test.js  # Settings management
│   └── wipe.test.js      # Bootstrap and wipe operations
├── sample-data/
│   └── generation.test.js  # Sample data generation
├── security/
│   ├── rate-limit.test.js      # Rate limiting
│   └── vulnerabilities.test.js # Security vulnerability tests
└── utils/
    ├── display-utils.test.js   # Display utility functions
    └── unit.test.js            # Unit tests for utilities
```

## Running Tests

Run all tests:
```bash
npm test
```

Run tests with watch mode:
```bash
npm run test:watch
```

Run a specific test file:
```bash
npm test -- test/auth/login.test.js
```

Run tests matching a pattern:
```bash
npm test -- --test-name-pattern="password"
```

Run tests in a specific directory:
```bash
npm test -- 'test/auth/*.test.js'
```

## Test Configuration

- Tests use Node.js built-in test runner
- In-memory SQLite database for isolation
- Concurrent execution (4 parallel) for performance
- Each test file is independent and runnable alone

## Shared Test Helpers

Import from `helpers/setup.js`:

```javascript
import {
    createTestServer,     // Create server with in-memory DB
    createTestAdmin,      // Create admin user
    loginAsAdmin,         // Login and get auth cookie
    setupTestEnvironment, // Full setup with server + admin + login
    hashForLogin,         // Hash password for login
    adminGet,             // Authenticated GET request
    adminPost,            // Authenticated POST request
    adminPut,             // Authenticated PUT request
    adminDelete,          // Authenticated DELETE request
    createTestMatter,     // Create a test matter
    TEST_ADMIN_USERNAME,
    TEST_ADMIN_PASSWORD,
    TEST_PASSWORD_SALT
} from '../helpers/setup.js';
```

## Writing Tests

### Basic Test Structure

```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { setupTestEnvironment } from '../helpers/setup.js';

describe('Feature > Subfeature', () => {
    let server, baseURL, adminCookie;

    before(async () => {
        const env = await setupTestEnvironment();
        server = env.server;
        baseURL = env.baseURL;
        adminCookie = env.adminCookie;
    });

    after(async () => {
        await server.close();
    });

    it('should do specific thing', async () => {
        // Test implementation
        assert.strictEqual(actual, expected);
    });
});
```

### Naming Conventions

- Use descriptive `describe` blocks: `'Feature > Subfeature'`
- Use clear `it` descriptions: `'should reject invalid input'`
- File names indicate what's being tested
