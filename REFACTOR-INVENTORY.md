# Refactoring Inventory

Analysis of large files and their concerns, serving as the foundation for modular refactoring.

## Large Files Inventory

### Backend Files

| File | Lines | Functions | Priority | Concerns |
|------|-------|-----------|----------|----------|
| server.js | 5447 | 172 | **Critical** | Routes (85+), middleware, helpers, config, startup |
| db.js | 1499 | 59 | **High** | Schema, migrations, 8 query objects, helpers |
| storage.js | 728 | 65 | Medium | Filesystem class, S3 class, factory functions, validation |
| audit.js | 539 | 27 | Medium | Log levels, action/entity types, 15+ logging functions |
| backup.js | 524 | 59 | Medium | Create backup, preview, restore, stats |
| sample-templates.js | 515 | 56 | Low | Word banks, generators, templates |
| auth.js | 498 | 27 | Medium | Password hashing, JWT, API keys, middleware, scopes |
| watchdog.js | 418 | 68 | Low | Process manager, file watching, HTTP server |
| scopes.js | 411 | 10 | Low | Scope definitions, presets, route mappings |

### Admin Frontend Files

| File | Lines | Functions | Priority | Concerns |
|------|-------|-----------|----------|----------|
| matter-detail.js | 1679 | 83 | **High** | Detail view, notes CRUD, attachments CRUD, edit modal |
| matters.js | 1560 | 115 | **High** | List view, bulk operations, export, create modal |
| backup-storage.js | 1778 | 65 | **High** | Storage config, backup create, restore |
| ai-settings.js | 1462 | 60 | Medium | AI config, sample generation, preview |
| audit-log.js | 918 | 43 | Medium | Log viewer, filters, export, detail modal |
| api.js | 677 | 75 | Medium | 75 API methods in one class |
| wipe-data.js | 464 | 60 | Low | Wipe operations, confirmations |
| system-info.js | 436 | 42 | Low | Version info, system stats |

### Public Frontend (REFACTORED)

| File | Lines | Functions | Priority | Status |
|------|-------|-----------|----------|--------|
| app.js | 60 | 2 | ~~High~~ | **DONE** - Entry point only |
| utils.js | 71 | 6 | - | NEW - DISPLAY utilities |
| themes.js | 131 | 0 | - | NEW - Theme definitions |
| state.js | 147 | 4 | - | NEW - State management |
| api.js | 203 | 9 | - | NEW - API functions |
| handlers.js | 214 | 17 | - | NEW - Event handlers |
| render/index.js | 41 | 1 | - | NEW - Render orchestrator |
| render/shared.js | 104 | 5 | - | NEW - Shared helpers |
| render/crt.js | 252 | 1 | - | NEW - CRT renderer |
| render/modern.js | 218 | 1 | - | NEW - Modern renderer |
| render/retro.js | 232 | 1 | - | NEW - Retro renderer |
| modal.js | 385 | 27 | Low | Unchanged |

---

## Detailed Analysis

### 1. server.js (5447 lines) - CRITICAL

The server.js file is by far the largest and most problematic. It contains:

#### Current Structure (mixed together)
```
Lines 1-74:     Imports and constants
Lines 75-169:   Server setup (plugins, middleware, error handler)
Lines 170-368:  Public API routes (5 routes)
Lines 369-585:  Admin portal static serving (8 routes)
Lines 586-686:  Watchdog routes (3 routes)
Lines 687-921:  Bootstrap routes (4 routes)
Lines 922-1200: Auth routes (8 routes)
Lines 1201-1720: Matters CRUD routes (13 routes)
Lines 1721-1870: Private notes routes (4 routes)
Lines 1871-2236: Attachments routes (6 routes)
Lines 2237-2588: Storage settings routes (5 routes)
Lines 2589-2946: General settings routes (10 routes)
Lines 2947-3088: AI/Claude routes (5 routes)
Lines 3089-3116: Analytics routes (1 route)
Lines 3117-3219: User management routes (5 routes)
Lines 3220-3398: API keys routes (4 routes)
Lines 3399-4295: Sample data routes (3 routes + 600+ lines of generation logic)
Lines 4296-4946: Wipe operations (5 routes)
Lines 4947-5158: Backup/restore routes (5 routes)
Lines 5159-5305: Audit log routes (5 routes)
Lines 5306-5447: Server startup logic
```

#### Identified Route Groups for Extraction
| Domain | Routes | Lines | Dependencies |
|--------|--------|-------|--------------|
| Public API | 5 | ~200 | settingsDb, mattersDb |
| Auth & Bootstrap | 12 | ~550 | adminUsersDb, adminSessionsDb, auth.js |
| Matters | 13 | ~450 | mattersDb, audit.js |
| Notes | 4 | ~150 | privateNotesDb, audit.js |
| Attachments | 6 | ~350 | attachmentsDb, storage.js, audit.js |
| Settings | 15 | ~700 | settingsDb, Anthropic SDK |
| Users & Sessions | 5 | ~100 | adminUsersDb, adminSessionsDb |
| API Keys | 4 | ~180 | apiKeysDb, scopes.js |
| Sample Data | 4 | ~900 | All DBs, Claude SDK |
| Wipe Operations | 5 | ~650 | All DBs |
| Backup/Restore | 5 | ~200 | backup.js |
| Audit Log | 5 | ~150 | auditLogDb |

#### Helper Functions Embedded in server.js
- `validateStringLength()` - validation helper
- `getClientIP()` - request helper
- `serveStaticFile()` - file serving helper
- `getAiSettingsForType()` - AI config helper
- `generateClaudeDescriptions()` - sample data helper
- `buildDescriptionPrompt()` - AI prompt builder
- Multiple inline sample data generation functions (~500 lines)

---

### 2. db.js (1499 lines) - HIGH PRIORITY

Contains all database logic in a single file:

#### Current Structure
```
Lines 1-18:     Imports, sql.js initialization
Lines 19-170:   Schema creation (9 tables, indexes)
Lines 171-267:  Migrations (column additions)
Lines 268-302:  settingsDb object (4 methods)
Lines 303-430:  mattersDb object (12 methods)
Lines 431-547:  adminUsersDb object (10 methods)
Lines 548-632:  adminSessionsDb object (8 methods)
Lines 633-701:  adminBootstrapTokensDb object (6 methods)
Lines 702-840:  apiKeysDb object (10 methods)
Lines 841-971:  privateNotesDb object (12 methods)
Lines 972-1164: attachmentsDb object (15 methods)
Lines 1165-1482: auditLogDb object (18 methods)
Lines 1483-1498: resetAllSequences, exports
```

#### Query Objects (8 total)
| Object | Methods | Responsibility |
|--------|---------|----------------|
| settingsDb | 4 | Key-value settings store |
| mattersDb | 12 | Matter CRUD + stats |
| adminUsersDb | 10 | User management |
| adminSessionsDb | 8 | Session management |
| adminBootstrapTokensDb | 6 | Bootstrap token management |
| apiKeysDb | 10 | API key management |
| privateNotesDb | 12 | Notes CRUD |
| attachmentsDb | 15 | Attachment records |
| auditLogDb | 18 | Audit log queries |

---

### 3. frontend/app.js (1552 lines) - HIGH PRIORITY

Single-file vanilla JS frontend:

#### Current Structure
```
Lines 1-81:     Constants (DISPLAY utilities)
Lines 82-220:   Theme definitions (8 themes)
Lines 221-301:  Message constants
Lines 302-346:  State object
Lines 347-541:  API functions (10 functions)
Lines 542-635:  Utility functions (7 functions)
Lines 636-843:  renderModern() - main render function
Lines 844-1064: renderRetro() - alternate render
Lines 1065-1333: render() - orchestrator + sub-renders
Lines 1334-1508: UI event handlers (17 functions)
Lines 1509-1552: Initialization + window exports
```

#### Identified Modules
| Module | Functions | Lines |
|--------|-----------|-------|
| Display utilities | 6 | ~70 |
| Theme system | N/A | ~130 |
| API client | 10 | ~200 |
| State management | N/A | ~50 |
| Rendering | 3 | ~700 |
| Event handlers | 17 | ~200 |

---

### 4. Admin Components - HIGH PRIORITY

#### matter-detail.js (1679 lines)
```
Lines 1-45:     Imports, state
Lines 46-250:   renderMatterView() - main view
Lines 251-450:  Notes section rendering
Lines 451-650:  Attachments section rendering
Lines 651-850:  Edit matter modal
Lines 851-1050: Notes CRUD handlers
Lines 1051-1250: Attachments CRUD handlers
Lines 1251-1450: File preview functionality
Lines 1451-1679: Event setup
```

**Split candidates:**
- Matter view rendering
- Notes management
- Attachments management
- Edit modal

#### matters.js (1560 lines)
```
Lines 1-130:    Column definitions
Lines 131-350:  Table rendering
Lines 351-550:  Pagination
Lines 551-750:  Search/filter
Lines 751-950:  Bulk operations
Lines 951-1150: Create/Edit modal
Lines 1151-1350: Export functionality
Lines 1351-1560: Event handlers
```

**Split candidates:**
- Column configuration
- Table renderer
- Pagination logic
- Bulk operations
- Export functionality

#### api.js (677 lines)
Single AdminAPI class with 75 methods - could be split by domain:
- Auth methods (5)
- Matter methods (8)
- Note methods (4)
- Attachment methods (6)
- Settings methods (15)
- User/Session methods (6)
- Sample data methods (5)
- Backup methods (4)
- Audit methods (5)
- API key methods (4)

---

## Dependency Graph

```
server.js
    ├── db.js (createDatabase)
    ├── audit.js (logging functions)
    ├── auth.js (middleware, password utils)
    ├── storage.js (file storage)
    ├── backup.js (backup/restore)
    ├── legal-docs.js (PDF generation)
    ├── sample-templates.js (data templates)
    └── scopes.js (RBAC)

db.js
    └── (no local dependencies)

storage.js
    └── audit.js (storage logging)

backup.js
    └── (uses db object passed in)

auth.js
    └── scopes.js (scope validation)

frontend/app.js
    └── modal.js

admin/js/api.js
    └── (no local dependencies)

admin/js/components/*
    ├── api.js
    ├── display-utils.js
    └── modal.js
```

---

## Test Coverage Analysis

```
backend/test/
├── attachments/       (storage.test.js)
├── audit-log/         (logging.test.js)
├── auth/              (api-keys.test.js, password.test.js)
├── data-management/   (backup.test.js, settings.test.js, wipe.test.js)
├── helpers/           (setup.js - test utilities)
├── matters/           (api.test.js, consistency.test.js, integration.test.js, validation.test.js)
├── private-notes/     (crud.test.js)
├── sample-data/       (generation.test.js)
├── security/          (vulnerabilities.test.js)
└── utils/             (display-utils.test.js)
```

Test coverage is organized by domain, which aligns well with proposed module boundaries. Key observation: tests use `setupTestEnvironment()` from helpers/setup.js, which creates isolated server instances.

---

## Existing Good Patterns

### 1. Admin Data Management (already modularized)
```
admin/js/components/data-management/
├── index.js           # Route dispatcher
├── shared.js          # Shared state and utilities
├── overview.js        # Dashboard view
├── ai-settings.js     # AI configuration
├── backup-storage.js  # Storage/backup
└── wipe-data.js       # Wipe operations
```

### 2. Admin Security (already modularized)
```
admin/js/components/security/
├── index.js           # Route dispatcher
├── shared.js          # Shared utilities
├── overview.js        # Security dashboard
├── account.js         # Account settings
└── api-keys.js        # API key management
```

### 3. API Client Pattern (admin/js/api.js)
Single class with domain-grouped methods, clear request abstraction.

### 4. Test Helpers Pattern (backend/test/helpers/setup.js)
Centralized test utilities with `setupTestEnvironment()`, `createTestServer()`, `adminPost()`, etc.

---

## Problem Patterns to Fix

### 1. server.js Route Proliferation
85+ routes defined inline with business logic mixed in. No separation between:
- Route definition
- Request validation
- Business logic
- Response formatting

### 2. Sample Data Generation in Routes
~600 lines of sample data generation logic embedded in route handlers instead of a separate service.

### 3. db.js Query Object Bloat
All 8 query objects in one file. Each is well-isolated but the file is unwieldy.

### 4. frontend/app.js Monolith
Entire vanilla JS app in one file mixing:
- State management
- API calls
- DOM rendering
- Event handling
- Theme logic

---

## Summary: Refactoring Priorities

### Immediate (Critical)
1. **server.js** - Extract routes into domain files
2. **db.js** - Split query objects into domain files

### Near-term (High)
3. **frontend/app.js** - Extract modules while keeping vanilla JS
4. **matter-detail.js** - Split into focused components
5. **matters.js** - Split into focused components

### Future (Medium)
6. **api.js** - Consider splitting by domain
7. **backup-storage.js** - Already large, monitor
8. **ai-settings.js** - Already large, monitor
