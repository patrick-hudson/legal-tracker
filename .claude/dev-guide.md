# Claude Development Guide for Legal Matters

## Testing Authenticated Admin API Endpoints

The admin API requires JWT authentication via cookies. Here are the ways to test:

### Option 1: Direct Database Query (BEST for reading data)
```bash
# From the backend directory - no server needed, no auth needed
node -e "
import { createDatabase } from './db.js';
const db = await createDatabase('./data/tracker.db');

// Example: Get audit log entries
const entries = db.auditLogDb.getAll({ limit: 10 });
console.log(JSON.stringify(entries, null, 2));
"
```

### Option 2: Get token from browser (for curl testing)
1. Log into the admin panel in your browser
2. Open DevTools (F12) > Application > Cookies > localhost
3. Copy the `admin_token` value
4. Use it with curl:
```bash
TOKEN="<paste-token-here>"
curl -s -H "Cookie: admin_token=$TOKEN" "http://localhost:3000/admin/api/audit-log?limit=5" | jq .
```

### Option 3: Use fastify.inject() (for programmatic testing)
```bash
# From the backend directory - creates isolated server instance
node -e "
import { createServer } from './server.js';
const fastify = await createServer({ logger: false });
await fastify.ready();

// For public (non-auth) endpoints:
const response = await fastify.inject({
  method: 'GET',
  url: '/api/status'
});
console.log(response.json());

await fastify.close();
"
```

### Why curl with auto-generated tokens doesn't work
The server uses sql.js which loads the database into memory at startup. Tokens created
by external scripts won't be recognized until the server restarts and reloads the DB.
Use Option 1 (direct DB query) or Option 2 (browser token) instead.

## Database Location
- **Production database**: `./data/tracker.db`
- **Test databases**: Created in-memory or temp files by test suite

## Common Database Helpers
```javascript
import { createDatabase } from './db.js';
const db = await createDatabase('./data/tracker.db');

// Available helpers:
db.settingsDb.get(key)
db.settingsDb.set(key, value)
db.settingsDb.getAll()

db.mattersDb.getAll()
db.mattersDb.getById(id)
db.mattersDb.create(data)

db.auditLogDb.getAll({ page, limit, level, userId, entityType })
db.auditLogDb.getById(id)
db.auditLogDb.create(entry)

db.adminUsersDb.getAll()
db.adminUsersDb.getByUsername(username)

db.privateNotesDb.getByMatterId(matterId)
db.attachmentsDb.getByMatterId(matterId)
```

## Running Tests
```bash
# From the backend directory
npm test                    # Run all tests
npm test -- --grep "audit"  # Run tests matching pattern
```

## Server Ports
- **Main server**: 3000 (configurable via PORT env)
- **Watchdog API**: 3001 (configurable via WATCHDOG_PORT env)

## Important Notes
- Never try to curl authenticated `/admin/api/*` endpoints without a valid token - it will always return 401
- Use direct database queries or fastify.inject() for testing
- The test suite handles authentication internally
