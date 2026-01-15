# Refactoring Plan

Ordered extraction plans for transforming the codebase into a modular monolith.

## Overview

This plan breaks down the refactoring into phases, ordered by risk (lowest first) and dependency (foundational extractions first).

---

## Phase 1: Backend Utilities (Low Risk)

### 1.1 Extract Constants
**Estimated effort:** Small

**Source:** server.js lines 42-62, 189-196

**New File:** `backend/lib/constants.js`

```javascript
// backend/lib/constants.js
export const DEFAULT_APP_SETTINGS = {
  lifetime_spent: '0',
  drain_rate_cents_per_second: '0',
  auto_drain_enabled: 'false',
  claude_api_key: '',
  claude_key_validated: 'false',
  claude_model: '',
  ai_spice_level: '1',
  ai_custom_prompt: '',
  ai_spice_matters: '',
  ai_spice_notes: '',
  ai_spice_attachments: '',
  ai_spice_audit_log: '',
  ai_prompt_matters: '',
  ai_prompt_notes: '',
  ai_prompt_attachments: '',
  ai_prompt_audit_log: ''
};

export const INPUT_LIMITS = {
  username: 100,
  password: 1000,
  email: 255,
  note: 10000,
  confirmationString: 100
};

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

**Steps:**
1. Create `backend/lib/` directory
2. Create `backend/lib/constants.js`
3. Add exports
4. Update imports in server.js
5. Run tests
6. Remove old code from server.js

**Tests:** Existing tests should pass unchanged

---

### 1.2 Extract Validation Helpers
**Estimated effort:** Small

**Source:** server.js lines 198-203

**New File:** `backend/lib/validation.js`

```javascript
// backend/lib/validation.js
import { INPUT_LIMITS } from './constants.js';

export function validateStringLength(value, fieldName, maxLength) {
  if (value && value.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
}

export function validateUsername(username) {
  validateStringLength(username, 'Username', INPUT_LIMITS.username);
}

// ... etc
```

**Steps:**
1. Create `backend/lib/validation.js`
2. Move `validateStringLength` function
3. Update imports in server.js
4. Run tests

---

### 1.3 Extract Request Helpers
**Estimated effort:** Small

**Source:** server.js lines 205-217

**New File:** `backend/lib/helpers.js`

```javascript
// backend/lib/helpers.js
export function getClientIP(request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIP = request.headers['x-real-ip'];
  if (realIP) {
    return realIP;
  }
  return request.ip;
}
```

**Steps:**
1. Create `backend/lib/helpers.js`
2. Move `getClientIP` function
3. Update imports in server.js
4. Run tests

---

## Phase 2: Database Query Objects (Medium Risk)

### 2.1 Create Database Directory Structure
**Estimated effort:** Small

**New Files:**
- `backend/db/index.js` - Main entry point
- `backend/db/schema.js` - Table creation
- `backend/db/migrations.js` - Migration logic

**Steps:**
1. Create `backend/db/` directory
2. Create `backend/db/queries/` subdirectory
3. Create empty index.js that will re-export everything

---

### 2.2 Extract settingsDb
**Estimated effort:** Small

**Source:** db.js lines 276-302

**New File:** `backend/db/queries/settings.js`

```javascript
// backend/db/queries/settings.js
export function createSettingsDb(db, saveDatabase) {
  return {
    get(key) {
      const result = db.exec('SELECT value FROM settings WHERE key = ?', [key]);
      if (result.length > 0 && result[0].values.length > 0) {
        return result[0].values[0][0];
      }
      return null;
    },

    set(key, value) {
      db.run(`
        INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `, [key, String(value)]);
      saveDatabase();
    },

    getAll() {
      const result = db.exec('SELECT key, value FROM settings');
      if (result.length > 0) {
        const rows = result[0].values.map(([key, value]) => ({ key, value }));
        return Object.fromEntries(rows.map(r => [r.key, r.value]));
      }
      return {};
    },

    delete(key) {
      db.run('DELETE FROM settings WHERE key = ?', [key]);
      saveDatabase();
    }
  };
}
```

**Steps:**
1. Create `backend/db/queries/settings.js`
2. Move settingsDb creation logic
3. Update db.js to import and use
4. Run tests (especially settings.test.js)

---

### 2.3 Extract mattersDb
**Estimated effort:** Medium

**Source:** db.js lines 303-430

**New File:** `backend/db/queries/matters.js`

**Steps:**
1. Create `backend/db/queries/matters.js`
2. Move mattersDb creation logic (12 methods)
3. Update db.js to import and use
4. Run tests (matters/*.test.js)

---

### 2.4 Extract Remaining Query Objects
**Estimated effort:** Medium each

Extract in this order:
1. `adminUsersDb` -> `backend/db/queries/users.js`
2. `adminSessionsDb` -> `backend/db/queries/sessions.js`
3. `adminBootstrapTokensDb` -> `backend/db/queries/bootstrap.js`
4. `apiKeysDb` -> `backend/db/queries/api-keys.js`
5. `privateNotesDb` -> `backend/db/queries/notes.js`
6. `attachmentsDb` -> `backend/db/queries/attachments.js`
7. `auditLogDb` -> `backend/db/queries/audit-log.js`

Each follows the same pattern as 2.2 and 2.3.

---

### 2.5 Extract Schema and Migrations
**Estimated effort:** Medium

**Source:** db.js lines 51-267

**New Files:**
- `backend/db/schema.js` - CREATE TABLE statements
- `backend/db/migrations.js` - ALTER TABLE migrations

**Steps:**
1. Move schema creation SQL to schema.js
2. Move migration logic to migrations.js
3. Update db.js to use these modules
4. Run all tests

---

## Phase 3: Route Extraction (Medium-High Risk)

### 3.1 Create Route Infrastructure
**Estimated effort:** Small

**New Files:**
- `backend/routes/index.js` - Route registration orchestrator
- `backend/app.js` - App factory (separate from entry point)

```javascript
// backend/routes/index.js
import publicRoutes from './public.js';
import authRoutes from './auth.js';
import matterRoutes from './matters.js';
// ... etc

export default async function registerRoutes(fastify, opts) {
  await fastify.register(publicRoutes, opts);
  await fastify.register(authRoutes, opts);
  await fastify.register(matterRoutes, opts);
  // ... etc
}
```

---

### 3.2 Extract Public Routes
**Estimated effort:** Small

**Source:** server.js lines 222-367

**New File:** `backend/routes/public.js`

Routes to extract:
- GET /api/health
- GET /api/config
- GET /api/version
- GET /api/status
- GET /api/matters

**Steps:**
1. Create `backend/routes/public.js`
2. Move 5 route handlers
3. Update server.js to register routes
4. Run tests

---

### 3.3 Extract Auth Routes
**Estimated effort:** Medium

**Source:** server.js lines 922-1200

**New File:** `backend/routes/auth.js`

Routes to extract:
- GET /admin/api/auth/validate
- POST /admin/api/auth/login
- POST /admin/api/auth/logout
- GET /admin/api/auth/me
- POST /admin/api/auth/change-password
- POST /admin/api/auth/nuke-all-sessions

**Steps:**
1. Create `backend/routes/auth.js`
2. Move route handlers
3. Update server.js
4. Run auth tests

---

### 3.4 Extract Matters Routes
**Estimated effort:** Medium

**Source:** server.js lines 1201-1720

**New File:** `backend/routes/matters.js`

Routes to extract (13 routes):
- GET/POST /admin/api/matters
- POST /admin/api/matters/bulk
- DELETE /admin/api/matters/bulk
- GET /admin/api/matters/export
- GET/PUT/DELETE /admin/api/matters/:id
- GET /admin/api/matters/:id/timeline

---

### 3.5 Extract Remaining Route Groups
**Estimated effort:** Medium each

Extract in this order (by dependency):
1. `bootstrap.js` - Bootstrap routes (4 routes)
2. `notes.js` - Note routes (4 routes)
3. `attachments.js` - Attachment routes (6 routes)
4. `settings.js` - Settings routes (15 routes)
5. `users.js` - User management routes (5 routes)
6. `api-keys.js` - API key routes (4 routes)
7. `sample-data.js` - Sample data routes (4 routes) + extract generation logic
8. `wipe.js` - Wipe operation routes (5 routes)
9. `backup.js` - Backup routes (5 routes)
10. `audit-log.js` - Audit log routes (5 routes)
11. `admin-static.js` - Static file serving (8 routes)

---

### 3.6 Extract Sample Data Service
**Estimated effort:** Medium-Large

**Source:** server.js lines 3450-4200 (~750 lines of generation logic)

**New File:** `backend/services/sample-data-service.js`

This is the largest piece of embedded business logic. Extract:
- `getAiSettingsForType()`
- `generateClaudeDescriptions()`
- `buildDescriptionPrompt()`
- All sample generation functions

---

## Phase 4: Frontend Modularization

### 4.1 Extract Public Frontend Modules
**Estimated effort:** Medium

**Source:** frontend/app.js (1552 lines)

**New Files:**
```
frontend/
├── api.js      # API functions (~200 lines)
├── state.js    # State management (~100 lines)
├── themes.js   # All 10 theme definitions (~200 lines)
├── utils.js    # DISPLAY utilities (~100 lines)
├── handlers.js # Event handlers (~200 lines)
└── render/
    ├── crt.js      # CRT themes (8 themes share this)
    ├── modern.js   # MINIMAL 2025 theme
    ├── retro.js    # GEOCITIES 1996 theme
    └── shared.js   # Shared render helpers
```

**Theme inventory:** 10 themes total
- 8 CRT themes (AMBER, NUCLEAR, MAINFRAME, VAPOR, DEFCON, PAPER, CYBERPUNK, HAZMAT)
- 1 modern theme (MINIMAL 2025) - has unique card-based layout
- 1 retro theme (GEOCITIES 1996) - has unique 90s styling

**Steps:**
1. Extract utils.js (DISPLAY object, lines 14-81)
2. Extract themes.js (all 10 themes, lines 82-220)
3. Extract state.js (state object, lines 302-346)
4. Extract api.js (fetch functions, lines 347-541)
5. Extract handlers.js (UI handlers, lines 1334-1508)
6. Extract render/shared.js (common render helpers)
7. Extract render/crt.js (CRT theme render function)
8. Extract render/modern.js (modern theme render)
9. Extract render/retro.js (retro theme render)
10. Update app.js to import and orchestrate
11. Test all 10 themes in browser

---

### 4.2 Extract Admin API Client
**Estimated effort:** Medium

**Source:** admin/js/api.js (677 lines, 75 methods)

**New Structure:**
```
admin/js/api/
├── index.js       # Main class, re-exports
├── auth.js        # Auth methods
├── matters.js     # Matter methods
├── notes.js       # Note methods
├── attachments.js # Attachment methods
├── settings.js    # Settings methods
├── users.js       # User methods
└── data.js        # Sample data, backup, wipe methods
```

---

### 4.3 Split matter-detail.js
**Estimated effort:** Medium

**Source:** admin/js/components/matter-detail.js (1679 lines)

**New Structure:**
```
admin/js/components/matter-detail/
├── index.js       # Route handler
├── view.js        # Main view
├── notes.js       # Notes section
├── attachments.js # Attachments section
└── edit-modal.js  # Edit modal
```

---

### 4.4 Split matters.js
**Estimated effort:** Medium

**Source:** admin/js/components/matters.js (1560 lines)

**New Structure:**
```
admin/js/components/matters/
├── index.js      # Route handler
├── table.js      # Table rendering
├── columns.js    # Column definitions
├── bulk-ops.js   # Bulk operations
├── export.js     # Export functionality
└── modals.js     # Create/edit modals
```

---

## Phase 5: Middleware Extraction

### 5.1 Extract Auth Middleware
**Estimated effort:** Small

**Source:** auth.js (middleware functions)

**New File:** `backend/middleware/auth.js`

Move:
- `createAdminAuthMiddleware()`
- `createHybridAuthMiddleware()`
- `autoRequireScope()`
- `requireScope()`

Keep in auth.js:
- Password hashing functions
- Token generation functions
- API key functions

---

### 5.2 Extract Security Headers Middleware
**Estimated effort:** Small

**Source:** server.js lines 137-147

**New File:** `backend/middleware/security-headers.js`

---

## Execution Order Summary

### Round 1: Foundation (No Dependencies)
1. [1.1] Extract constants
2. [1.2] Extract validation helpers
3. [1.3] Extract request helpers

### Round 2: Database Layer (Depends on Round 1)
1. [2.1] Create database directory structure
2. [2.2] Extract settingsDb
3. [2.3] Extract mattersDb
4. [2.4] Extract remaining query objects
5. [2.5] Extract schema and migrations

### Round 3: Routes (Depends on Round 2)
1. [3.1] Create route infrastructure
2. [3.2] Extract public routes
3. [3.3] Extract auth routes
4. [3.4] Extract matters routes
5. [3.5] Extract remaining routes
6. [3.6] Extract sample data service

### Round 4: Frontend (Independent)
1. [4.1] Extract public frontend modules
2. [4.2] Extract admin API client
3. [4.3] Split matter-detail.js
4. [4.4] Split matters.js

### Round 5: Middleware (Depends on Round 3)
1. [5.1] Extract auth middleware
2. [5.2] Extract security headers middleware

---

## Verification Checklist

After each extraction:
- [ ] All existing tests pass
- [ ] No circular dependencies introduced
- [ ] Exports are properly defined
- [ ] Imports use correct paths
- [ ] File size is within guidelines
- [ ] Functions are properly named
- [ ] No duplicate code

After complete phase:
- [ ] Application starts without errors
- [ ] All routes work correctly
- [ ] Database operations work
- [ ] Authentication works
- [ ] No console errors in browser
- [ ] Performance is unchanged

---

## Rollback Strategy

Each extraction should:
1. Be done in a separate commit
2. Include both old and new code initially
3. Switch imports once verified
4. Remove old code in final commit

If issues arise:
1. Revert to previous commit
2. Investigate in development
3. Fix issues before re-attempting

---

## Notes for Implementation

### Import Path Convention
```javascript
// Relative imports within same directory
import { foo } from './bar.js';

// Relative imports from parent
import { foo } from '../lib/constants.js';

// Always include .js extension (ES modules)
```

### Testing After Each Change
```bash
# Run specific test file
npm test -- backend/test/matters/api.test.js

# Run domain tests
npm test -- backend/test/matters/

# Run all tests
npm test
```

### Commit Message Format
```
[REFACTOR] Extract {module} from {source}

- Move {what} to {where}
- Update imports in {files}
- No behavior changes
```
