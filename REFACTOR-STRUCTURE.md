# Proposed Module Structure

Target architecture for the modular monolith refactoring.

## Design Principles

1. **Single Responsibility** - Each file does one thing well
2. **Clear Interfaces** - Export only what's needed
3. **Domain Boundaries** - Group by business domain, not technical layer
4. **Testable** - Each module can be tested in isolation
5. **Future-Ready** - Clean boundaries for potential microservice extraction

---

## Backend Structure

### Current (After Phase 3)
```
backend/
├── server.js              # 520 lines - entry point, setup, route registration
├── routes/                # Route definitions by domain (4521 lines total)
│   ├── index.js           # Route registration orchestrator (54 lines)
│   ├── public.js          # Public API routes (181 lines)
│   ├── admin-static.js    # Admin portal static files (125 lines)
│   ├── watchdog.js        # Watchdog proxy routes (114 lines)
│   ├── bootstrap.js       # Bootstrap routes (250 lines)
│   ├── auth.js            # Auth routes (327 lines)
│   ├── matters.js         # Matters CRUD (506 lines)
│   ├── notes.js           # Private notes (166 lines)
│   ├── attachments.js     # Attachments (378 lines)
│   ├── settings.js        # Storage, drain, AI settings (909 lines)
│   ├── users.js           # Admin users (118 lines)
│   ├── api-keys.js        # API key management (196 lines)
│   ├── sample-data.js     # Sample data generation (816 lines)
│   ├── wipe.js            # Wipe operations (496 lines)
│   ├── backup.js          # Backup/restore (238 lines)
│   └── audit-log.js       # Audit log viewing (147 lines)
├── services/              # Business logic services
│   └── sample-data-service.js  # AI generation logic (326 lines)
├── db/                    # Database layer (already refactored)
│   ├── index.js           # Entry point
│   ├── schema.js          # Table creation SQL
│   ├── migrations.js      # Schema migrations
│   └── queries/           # Query objects by domain
├── lib/                   # Shared utilities (already refactored)
│   ├── constants.js       # DEFAULT_APP_SETTINGS, INPUT_LIMITS
│   ├── validation.js      # Input validation helpers
│   └── helpers.js         # getClientIP, etc.
├── audit.js               # Audit logging (OK)
├── auth.js                # Auth utilities (OK)
├── backup.js              # Backup logic (OK)
├── storage.js             # Storage abstraction (OK)
├── sample-templates.js    # Sample data templates (OK)
├── legal-docs.js          # Document generation (OK)
├── scopes.js              # API scope definitions (OK)
└── watchdog.js            # Watchdog process (OK)
```

### Proposed
```
backend/
├── server.js              # Entry point only (~100 lines)
├── app.js                 # App factory and plugin registration (~150 lines)
│
├── routes/                # Route definitions by domain
│   ├── index.js           # Route registration orchestrator
│   ├── public.js          # /api/* public routes (health, status, matters read)
│   ├── auth.js            # /admin/api/auth/* routes
│   ├── bootstrap.js       # Bootstrap routes
│   ├── matters.js         # /admin/api/matters/* routes
│   ├── notes.js           # /admin/api/notes/* routes
│   ├── attachments.js     # /admin/api/attachments/* routes
│   ├── settings.js        # /admin/api/settings/* routes
│   ├── users.js           # /admin/api/users/* routes
│   ├── api-keys.js        # /admin/api/api-keys/* routes
│   ├── sample-data.js     # /admin/api/data/* routes (sample generation)
│   ├── wipe.js            # /admin/api/data/wipe* routes
│   ├── backup.js          # /admin/api/backup/* routes
│   ├── audit-log.js       # /admin/api/audit-log/* routes
│   └── admin-static.js    # Static file serving for admin portal
│
├── services/              # Business logic layer
│   ├── matter-service.js  # Matter CRUD logic
│   ├── note-service.js    # Note CRUD logic
│   ├── attachment-service.js
│   ├── settings-service.js
│   ├── sample-data-service.js  # Sample data generation logic
│   └── wipe-service.js    # Data wipe operations
│
├── db/                    # Database layer
│   ├── index.js           # Database initialization, exports all query objects
│   ├── schema.js          # Table creation SQL
│   ├── migrations.js      # Schema migrations
│   └── queries/           # Query objects by domain
│       ├── settings.js    # settingsDb
│       ├── matters.js     # mattersDb
│       ├── users.js       # adminUsersDb
│       ├── sessions.js    # adminSessionsDb
│       ├── bootstrap.js   # adminBootstrapTokensDb
│       ├── api-keys.js    # apiKeysDb
│       ├── notes.js       # privateNotesDb
│       ├── attachments.js # attachmentsDb
│       └── audit-log.js   # auditLogDb
│
├── middleware/            # Fastify middleware
│   ├── auth.js            # Authentication middleware
│   ├── rate-limit.js      # Rate limiting config
│   └── security-headers.js
│
├── lib/                   # Shared utilities
│   ├── constants.js       # DEFAULT_APP_SETTINGS, INPUT_LIMITS
│   ├── validation.js      # Input validation helpers
│   └── helpers.js         # getClientIP, etc.
│
├── integrations/          # External service integrations
│   ├── claude.js          # Anthropic SDK wrapper
│   └── (s3 logic stays in storage.js)
│
├── audit.js               # Keep as-is (well-structured)
├── auth.js                # Keep password/JWT utilities (move middleware to middleware/)
├── backup.js              # Keep as-is (well-structured)
├── storage.js             # Keep as-is (well-structured)
├── sample-templates.js    # Keep as-is
├── legal-docs.js          # Keep as-is
├── scopes.js              # Keep as-is
└── watchdog.js            # Keep as-is (separate process)
```

### Route File Pattern
```javascript
// routes/matters.js
import { mattersDb, privateNotesDb, attachmentsDb } from '../db/index.js';
import { logInfoFromRequest, logErrorFromRequest } from '../audit.js';
import { ACTION_TYPES, ENTITY_TYPES } from '../audit.js';

export default async function matterRoutes(fastify, opts) {
  const { adminAuthMiddleware } = opts;

  // GET /admin/api/matters
  fastify.get('/admin/api/matters', {
    preHandler: adminAuthMiddleware
  }, async (request) => {
    const { page, limit, search, sort, order } = request.query;
    // ... handler logic
  });

  // POST /admin/api/matters
  fastify.post('/admin/api/matters', {
    preHandler: adminAuthMiddleware
  }, async (request, reply) => {
    // ... handler logic
  });

  // ... more routes
}
```

### DB Query Object Pattern
```javascript
// db/queries/matters.js
export function createMattersDb(db, saveDatabase) {
  return {
    getAll() {
      const result = db.exec('SELECT * FROM matters ORDER BY matter_date DESC');
      // ...
    },

    getById(id) {
      // ...
    },

    create(data) {
      // ...
      saveDatabase();
    },

    // ... more methods
  };
}
```

---

## Admin Frontend Structure

### Current
```
admin/js/
├── api.js                 # 677 lines - all API calls
├── app.js                 # App init
├── auth.js                # Auth utilities
├── bootstrap.js           # Bootstrap flow
├── display-utils.js       # Formatting
├── modal.js               # Modal system
├── router.js              # SPA router
└── components/
    ├── analytics.js
    ├── audit-log.js       # 918 lines
    ├── dashboard.js
    ├── matter-detail.js   # 1679 lines
    ├── matters.js         # 1560 lines
    ├── system-info.js
    ├── tracker-settings.js
    ├── data-management/   # Already modularized
    └── security/          # Already modularized
```

### Proposed
```
admin/js/
├── api/                   # API client split by domain
│   ├── index.js           # Main AdminAPI class (orchestrator)
│   ├── auth.js            # Auth API methods
│   ├── matters.js         # Matter API methods
│   ├── notes.js           # Note API methods
│   ├── attachments.js     # Attachment API methods
│   ├── settings.js        # Settings API methods
│   ├── users.js           # User API methods
│   └── data.js            # Sample data, wipe, backup API methods
│
├── components/
│   ├── matter-detail/     # Split into focused files
│   │   ├── index.js       # Route handler, orchestrator
│   │   ├── view.js        # Main matter view rendering
│   │   ├── notes.js       # Notes section + CRUD
│   │   ├── attachments.js # Attachments section + CRUD
│   │   └── edit-modal.js  # Edit matter modal
│   │
│   ├── matters/           # Split into focused files
│   │   ├── index.js       # Route handler, orchestrator
│   │   ├── table.js       # Table rendering
│   │   ├── columns.js     # Column definitions
│   │   ├── bulk-ops.js    # Bulk operations
│   │   ├── export.js      # Export functionality
│   │   └── modals.js      # Create/edit modals
│   │
│   ├── audit-log/         # Split similar to above
│   │   ├── index.js
│   │   ├── table.js
│   │   ├── filters.js
│   │   └── export.js
│   │
│   ├── data-management/   # Keep as-is (already modularized)
│   ├── security/          # Keep as-is (already modularized)
│   ├── analytics.js       # Keep as-is (small)
│   ├── dashboard.js       # Keep as-is (small)
│   ├── system-info.js     # Keep as-is
│   └── tracker-settings.js
│
├── app.js                 # Keep as-is
├── auth.js                # Keep as-is
├── bootstrap.js           # Keep as-is
├── display-utils.js       # Keep as-is
├── modal.js               # Keep as-is
└── router.js              # Keep as-is
```

---

## Public Frontend Structure

### Current
```
frontend/
├── app.js      # 1552 lines - everything
├── modal.js    # Modal utilities
├── index.html
└── styles.css
```

### Proposed
```
frontend/
├── app.js              # Main entry (~300 lines) - init, render orchestration
├── api.js              # API functions (~200 lines)
├── state.js            # State object and management (~100 lines)
├── themes.js           # All 10 theme definitions (~200 lines)
├── render/
│   ├── crt.js          # CRT themes render - 8 themes share this (~300 lines)
│   ├── modern.js       # MINIMAL 2025 theme render (~250 lines)
│   ├── retro.js        # GEOCITIES 1996 theme render (~250 lines)
│   └── shared.js       # Shared render helpers (~100 lines)
├── handlers.js         # UI event handlers (~200 lines)
├── utils.js            # DISPLAY utilities (~100 lines)
├── modal.js            # Keep as-is
├── index.html
└── styles.css
```

**Theme inventory (10 total):**
- 8 CRT themes (share one render): AMBER, NUCLEAR, MAINFRAME, VAPOR, DEFCON, PAPER, CYBERPUNK, HAZMAT
- 1 modern theme (own render): MINIMAL 2025
- 1 retro theme (own render): GEOCITIES 1996

---

## Module Size Guidelines

### Target Sizes
| Type | Max Lines | Max Functions | Max Imports |
|------|-----------|---------------|-------------|
| Route file | 300 | 15 | 10 |
| Service file | 250 | 12 | 8 |
| Query object | 200 | 15 | 5 |
| Component file | 400 | 20 | 10 |
| Utility file | 150 | 10 | 5 |

### When to Split
- File exceeds max lines target
- More than 3 distinct concerns in one file
- Function exceeds 50 lines
- File has more than 15 functions

---

## Interface Contracts

### Route to Service
```javascript
// Routes call services, services return data or throw
const matter = await matterService.create(request.body);
return reply.code(201).send({ success: true, matter });
```

### Service to DB
```javascript
// Services call query objects, handle business logic
const matter = mattersDb.getById(id);
if (!matter) throw new NotFoundError('Matter not found');
```

### Component to API
```javascript
// Components call API client, handle UI
try {
  const matters = await api.getMatters({ page, limit });
  renderTable(matters);
} catch (error) {
  showError(error.message);
}
```

---

## Export Patterns

### Named Exports for Functions
```javascript
// lib/validation.js
export function validateStringLength(value, field, max) { }
export function validateCost(value) { }
```

### Default Export for Route Plugins
```javascript
// routes/matters.js
export default async function matterRoutes(fastify, opts) { }
```

### Factory Functions for DB Objects
```javascript
// db/queries/matters.js
export function createMattersDb(db, saveDatabase) {
  return { /* methods */ };
}
```

---

## Migration Strategy

The modular structure is designed to allow incremental migration:

1. **Phase 1**: Extract constants and utilities (no behavior change) ✅ **COMPLETE**
2. **Phase 2**: Extract DB query objects (one at a time) ✅ **COMPLETE**
3. **Phase 3**: Extract routes (one domain at a time) ✅ **COMPLETE**
4. **Phase 4**: Extract services for complex business logic (partial - sample-data-service.js done)
5. **Phase 5**: Split frontend components
6. **Phase 6**: Split admin components

Each phase can be done independently, tested, and deployed before moving to the next.

### Phase 3 Results (Routes Extraction)
- server.js reduced from 5392 lines to 520 lines (90% reduction)
- 15 route files + 1 service file created
- All 391 tests passing
