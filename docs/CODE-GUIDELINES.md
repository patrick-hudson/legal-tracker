# Code Guidelines

Standards for file organization, naming, and development practices.

## File Size Limits

### Hard Limits
| Type | Max Lines | Action When Exceeded |
|------|-----------|---------------------|
| Route file | 300 | Split by sub-resource |
| Service file | 250 | Extract helper functions |
| Query object | 200 | Consider if methods belong elsewhere |
| Component file | 400 | Split into sub-components |
| Utility file | 150 | Group into modules |
| Any file | 500 | Mandatory split |

### Soft Limits (Targets)
| Type | Target Lines | Functions |
|------|--------------|-----------|
| Route file | 200 | 10-12 |
| Service file | 150 | 8-10 |
| Query object | 150 | 10-12 |
| Component file | 300 | 15 |
| Utility file | 100 | 8 |

## When to Split a File

### Automatic Triggers
- File exceeds 500 lines
- More than 15 functions in one file
- More than 10 imports
- More than 3 distinct concerns

### Judgment Calls
- Function exceeds 50 lines -> extract helpers
- Similar logic in multiple places -> extract shared module
- Testing requires mocking too many dependencies -> split
- File name needs "and" (e.g., "users-and-sessions.js") -> split

## Directory Structure

### Backend Pattern
```
backend/
├── server.js          # Entry point only
├── app.js             # App factory
├── routes/            # Route handlers (thin, delegate to services)
├── services/          # Business logic
├── db/
│   ├── index.js       # Database initialization
│   └── queries/       # Query objects by domain
├── middleware/        # Express/Fastify middleware
├── lib/               # Shared utilities
└── integrations/      # External service wrappers
```

### Frontend Pattern
```
frontend/
├── app.js             # Entry point
├── api.js             # API client
├── state.js           # State management
├── render/            # Rendering functions
├── handlers.js        # Event handlers
└── utils.js           # Utilities
```

### Admin Pattern
```
admin/js/
├── api/               # API client modules
├── components/
│   ├── {name}/        # Complex components (split)
│   │   ├── index.js   # Entry point
│   │   ├── view.js    # Rendering
│   │   └── ...
│   └── {name}.js      # Simple components (single file)
└── ...
```

## Naming Conventions

### Files
```
kebab-case.js           # All JavaScript files
{domain}-service.js     # Service files
{domain}.js             # Route files, query files, components
```

### Functions
```javascript
// Route handlers: verb + noun
getMatters()
createMatter()
deleteMatter()

// Utilities: descriptive action
formatCurrency()
validateEmail()
parseQueryParams()

// Event handlers: handle + event
handleSubmit()
handleClick()
```

### Variables
```javascript
// Constants: SCREAMING_SNAKE_CASE
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const DEFAULT_PAGE_SIZE = 25;

// Local variables: camelCase
const userId = request.params.id;
const isValid = validateInput(data);

// Private/internal: leading underscore (optional)
const _internalState = {};
```

## Import Organization

### Order
```javascript
// 1. Node.js built-ins
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

// 2. External packages
import Fastify from 'fastify';
import bcrypt from 'bcrypt';

// 3. Internal modules (absolute paths from project root)
import { createDatabase } from './db/index.js';
import { logInfo } from './audit.js';

// 4. Relative imports (same directory or children)
import { validateInput } from './validation.js';
```

### Rules
- Always include `.js` extension (ES modules)
- Prefer named exports over default exports (except route plugins)
- Group related imports
- No circular dependencies

## Export Patterns

### Named Exports (Preferred)
```javascript
// lib/validation.js
export function validateEmail(email) { }
export function validatePassword(password) { }
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

### Default Export (Routes and Components)
```javascript
// routes/matters.js
export default async function matterRoutes(fastify, opts) { }

// components/matters/index.js
export default async function renderMatters(container) { }
```

### Factory Functions (DB Objects)
```javascript
// db/queries/matters.js
export function createMattersDb(db, saveDatabase) {
  return {
    getAll() { },
    getById(id) { },
    // ...
  };
}
```

## Function Structure

### Route Handler Pattern
```javascript
fastify.post('/admin/api/matters', {
  preHandler: adminAuthMiddleware
}, async (request, reply) => {
  // 1. Extract input
  const { matter_date, note, cost } = request.body;

  // 2. Validate
  if (!matter_date) {
    return reply.code(400).send({ error: 'BAD_REQUEST', message: 'matter_date is required' });
  }

  // 3. Business logic (or delegate to service)
  const matter = mattersDb.create({
    matter_date,
    note: note || '',
    cost: Math.round((cost || 0) * 100)
  });

  // 4. Log action
  logInfoFromRequest(request, {
    actionType: ACTION_TYPES.CREATE,
    entityType: ENTITY_TYPES.MATTER,
    entityId: matter.id,
    summary: `Created matter #${matter.id}`
  });

  // 5. Return response
  return reply.code(201).send({ success: true, matter });
});
```

### Service Function Pattern
```javascript
export function createMatter(data, context) {
  // 1. Validate business rules
  if (!data.matter_date) {
    throw new ValidationError('matter_date is required');
  }

  // 2. Transform data
  const matterData = {
    matter_date: data.matter_date,
    note: data.note || '',
    cost: Math.round((data.cost || 0) * 100)
  };

  // 3. Persist
  const matter = mattersDb.create(matterData);

  // 4. Side effects (logging, events)
  logInfo({
    ...context,
    actionType: ACTION_TYPES.CREATE,
    entityType: ENTITY_TYPES.MATTER,
    entityId: matter.id,
    summary: `Created matter #${matter.id}`
  });

  return matter;
}
```

## Error Handling

### HTTP Errors in Routes
```javascript
// Use reply.code().send() for HTTP errors
return reply.code(404).send({
  error: 'NOT_FOUND',
  message: 'Matter not found'
});

return reply.code(400).send({
  error: 'BAD_REQUEST',
  message: 'Invalid input'
});

return reply.code(403).send({
  error: 'FORBIDDEN',
  message: 'Insufficient permissions'
});
```

### Business Errors in Services
```javascript
// Throw errors, let routes catch and format
if (!matter) {
  throw new NotFoundError('Matter not found');
}

if (!isValid) {
  throw new ValidationError('Invalid cost value');
}
```

### Error Logging
```javascript
// Always log errors to audit log
try {
  // operation
} catch (error) {
  logErrorFromRequest(request, {
    error,
    entityType: ENTITY_TYPES.MATTER,
    summary: `Failed to create matter: ${error.message}`
  });
  return reply.code(500).send({
    error: 'INTERNAL_ERROR',
    message: error.message
  });
}
```

## Testing Guidelines

### Test File Location
```
backend/test/
├── {domain}/
│   ├── api.test.js       # API route tests
│   ├── service.test.js   # Service logic tests
│   └── ...
└── helpers/
    └── setup.js          # Shared test utilities
```

### Test Structure
```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { setupTestEnvironment, adminPost } from '../helpers/setup.js';

describe('Matters > API', () => {
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

  it('should create a matter', async () => {
    const response = await adminPost(baseURL, '/matters', {
      matter_date: new Date().toISOString(),
      note: 'Test matter',
      cost: 100
    }, adminCookie);

    assert.strictEqual(response.status, 201);
    const data = await response.json();
    assert.ok(data.matter.id);
  });
});
```

### Run Tests
```bash
# Run all tests
npm test

# Run specific domain
npm test -- backend/test/matters/

# Run single file
npm test -- backend/test/matters/api.test.js
```

## Code Smells to Avoid

### 1. God Functions
```javascript
// Bad: Function does everything
async function handleMatterRequest(request, reply) {
  // validation, business logic, persistence, logging, response formatting
  // 100+ lines...
}

// Good: Split responsibilities
async function handleMatterRequest(request, reply) {
  const data = validateMatterInput(request.body);
  const matter = await matterService.create(data, getUserContext(request));
  return reply.code(201).send({ success: true, matter });
}
```

### 2. Deep Nesting
```javascript
// Bad: Multiple levels of nesting
if (condition1) {
  if (condition2) {
    if (condition3) {
      // actual logic
    }
  }
}

// Good: Early returns
if (!condition1) return;
if (!condition2) return;
if (!condition3) return;
// actual logic
```

### 3. Magic Numbers
```javascript
// Bad
if (password.length < 12) { }
const timeout = 300000;

// Good
const MIN_PASSWORD_LENGTH = 12;
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

if (password.length < MIN_PASSWORD_LENGTH) { }
const timeout = SESSION_TIMEOUT_MS;
```

### 4. Copy-Paste Code
```javascript
// Bad: Repeated error handling
fastify.get('/matters', async (request, reply) => {
  try { /* ... */ } catch (error) {
    logErrorFromRequest(request, { error, /* same pattern */ });
    return reply.code(500).send({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

// Good: Extract shared logic
// Use Fastify's error handler or create a wrapper
```

## Comments Guidelines

### When to Comment
- Complex business logic that isn't obvious
- Workarounds for known issues (include ticket/issue link)
- "Why" decisions that aren't clear from code

### When NOT to Comment
- Self-explanatory code
- What the code does (let the code speak)
- Commented-out code (delete it)

### Example
```javascript
// Bad comment
// Loop through matters
for (const matter of matters) { }

// Good comment
// Cost is stored in cents, convert to dollars for API response
// This matches the frontend expectation (see frontend/app.js:357)
return matters.map(m => ({ ...m, cost: m.cost / 100 }));
```

## Review Checklist

Before submitting code:
- [ ] File is under size limit
- [ ] Functions are under 50 lines
- [ ] No circular dependencies
- [ ] Tests pass
- [ ] No console.log statements (use audit logging)
- [ ] Error handling is consistent
- [ ] Imports are organized
- [ ] No magic numbers
- [ ] No commented-out code
