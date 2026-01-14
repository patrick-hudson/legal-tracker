# Changelog

All notable changes to LEGAL MATTER (Legal Expense Governance Allocation Ledger Management Application for Tracking Time, Expenses, Retainers) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [0.11.10] - 2026-01-14

### Added

- **Unified sample data generation with AI as optional enhancement**: Harmonized generation system that works fully without AI
  - New centralized word banks in `backend/data/sample-templates/` with JSON files for all data types
  - 140+ matter descriptions with template-based generation for more variety
  - 20 lawyers and 20 opposing counsel with realistic firm names
  - 20 individual and 30 company client names
  - 100+ private note templates organized by interaction type (phone_call, email, meeting, court_appearance, filing, letter_sent, letter_received, note)
  - Full document templates for 8 legal document types with placeholder substitution
  - 60+ audit log templates across all severity levels (INFO, WARNING, ERROR, SECURITY, DEBUG)
  - New `sample-templates.js` module provides clean API for accessing word banks
  - Backend refactored to use centralized templates instead of embedded static data
  - Legal document placeholder generation now uses realistic templates
  - Generation works fully without Claude API configuration
  - AI becomes an optional "enhancement layer" with clear UI indication
  - Success messages now show "(AI enhanced)" or "(templates)" to indicate generation mode

- **Per-type AI spice settings**: Each generation type (Matters, Notes, Attachments, Audit Log) can now have its own spice level
  - New "Per-Type Spice Settings" section in AI Settings page with individual controls
  - Each type can use the default spice level or have a custom override
  - Visual indicators show which types have custom settings ("Custom" badge and orange border)
  - "Apply Default to All" button to set all types to match the current default
  - "Reset All to Default" button to clear all custom overrides
  - Individual "reset" links per type to clear specific overrides
  - Backend `getAiSettingsForType()` helper centralizes settings resolution
  - New API endpoints: `PUT /admin/api/settings/ai/type` and `POST /admin/api/settings/ai/apply-default-to-all`
  - Per-type settings excluded from backups (like other AI settings)

---

## [0.11.9] - 2026-01-14

---

## [0.11.8] - 2026-01-10

---

## [0.11.7] - 2026-01-09

### Added

- **Full backup and restore functionality**: Comprehensive backup system for all data
  - Create backup as ZIP archive containing manifest.json, database.json, and attachment files
  - Backup includes all matters, private notes, attachments (files + metadata), settings, and admin users
  - Optional audit log backup (excluded by default due to size)
  - AI settings (Claude API key, model, spice level, custom prompt) excluded from backups for security
  - S3 storage supports two modes: full backup (downloads files) or references only (metadata only)
  - Preview uploaded backup before restore to verify contents and see warnings
  - Restore backup with confirmation ("RESTORE BACKUP") to prevent accidental data loss
  - Storage backend mismatch handling: filesystem→S3 uploads files, S3→filesystem extracts files
  - All sessions invalidated after restore, forcing re-login for security
  - New UI section in Data Management page with Create Backup (blue) and Restore Backup (purple) cards
  - Progress indicators for backup creation and restore operations

---

## [0.11.6] - 2026-01-09

### Added

- **Attachments column on matters list**: New "Docs" column shows document/attachment count per matter
  - Blue document icon displayed when matter has attachments
  - Shows count badge when matter has multiple attachments
  - Hover tooltip shows exact count (e.g., "3 documents")
  - Column is hideable and follows same pattern as private notes column

- **Context-aware private notes generation**: AI-generated private notes now reference the matter's description
  - New `generateContextualPrivateNotes()` function processes matters in batches (default 10 per API call)
  - Each note specifically relates to its matter's description rather than being generic
  - Scales efficiently for hundreds of matters with isolated batch failure handling
  - Falls back to static notes per-matter if AI fails for specific batches

### Fixed

- **Audit log action types for auth events**: Fixed `logSecurity()` function to preserve the original action type (login, login_failed, logout) instead of overriding all security events with `security_event`

- **Comprehensive wipe settings functionality**: "Wipe Settings" now properly clears all data and resets ID sequences
  - Wipes all matters, private notes, and attachments (including storage backend files)
  - Resets all SQLite auto-increment ID sequences to 0 (next created records start at ID 1)
  - Clears audit log entries except the wipe action itself
  - Wipe action logged with user info and timestamp preserved in audit log
  - "Wipe Matters" also now properly wipes attachments and private notes

- **Server restart redirect behavior**: Fixed countdown redirect after server restart
  - Increased redirect delay from 7 to 8 seconds to accommodate server restart time
  - Changed from URL navigation to page reload to prevent countdown hanging when already on target page

- **Storage file deletion on all delete operations**: Fixed orphaned files remaining after matter deletion
  - Full database wipe (`/admin/api/data/wipe`) now deletes attachment files from storage
  - Bulk matter delete now deletes associated attachment files
  - Public API matter delete now deletes associated attachment files
  - All endpoints now properly clean up both filesystem and S3 storage

---

## [0.11.5] - 2026-01-09

### Added

- **Audit log filtering and search**: Comprehensive filtering capabilities for audit log
  - Text search across summary and details fields with debounce
  - Multi-select level filter pills (ERROR, SECURITY, WARNING, INFO, DEBUG)
  - Date range filters (start/end date)
  - Dropdown filters for user, action type, and entity type
  - Quick filter buttons: "Errors Only", "Last Hour", "Last 24h", "Last 7 Days"
  - "Clear All" button when filters are active
  - All filters combinable with AND logic

- **Audit log stats dashboard**: Header stats row with key metrics
  - Total entries count (filtered or total)
  - Errors in last 24 hours with visual indicator
  - Security events in last 24 hours with visual indicator
  - Warnings in last 24 hours with visual indicator
  - Info events in last 24 hours counter

- **Audit log auto-refresh**: Real-time monitoring with automatic updates
  - Manual refresh button with spinning indicator
  - Auto-refresh toggle (polls every 10 seconds when enabled)
  - Auto-refresh stops when navigating away from audit log page
  - Indicator shows when auto-refresh is active

- **Audit log CSV export**: Export filtered audit log entries
  - Exports with current filter settings applied
  - Includes timestamp, level, username, action_type, entity_type, entity_id, summary, ip_address, duration_ms
  - Auto-named with current date

- **Audit log sample data generation**: Generate test audit log entries
  - New section in sample data modal: "Audit Log Entries"
  - Configurable entry count (50-500) and date range
  - 30+ static entry templates covering all log levels
  - Optional AI-generated entries with spice level support
  - Realistic timestamp distribution weighted toward business hours
  - `POST /admin/api/data/populate-audit-log` endpoint
  - `bulkCreate()` method for efficient batch inserts

- **Audit log API enhancements**:
  - `GET /admin/api/audit-log/filters` returns distinct users, action types, entity types
  - `GET /admin/api/audit-log/stats` returns errors/warnings count for last 24h
  - `GET /admin/api/audit-log/export` generates CSV download
  - Updated main endpoint to support `levels` (comma-separated), `search`, `startDate`, `endDate`, `username`, `actionType`, `entityType` parameters

### Changed

- Audit log UI now loads filter options and stats on initial render
- Advanced filters section is collapsible (shows "(active)" when filters applied)
- Level filter changed from dropdown to multi-select pill buttons
- Debug mode badge now shows tooltip explaining how to enable debug mode in System Information
- Sample data generation response now includes `_enabled` flags to clarify what options were requested
- **Server restart UX**: Restart button now shows countdown and automatically redirects to login page after 7 seconds (allows time for graceful shutdown and restart)

### Fixed

- **Login/logout events now logged at SECURITY level**: Login, logout, and failed login attempts are now correctly logged at SECURITY level instead of INFO level for proper security audit trail
- **Settings link in audit log header**: Fixed navigation to System Information settings (was missing leading slash in hash route)
- **Database persistence on restart**: Removed watchdog's separate database connection that was overwriting the server's database on restart. The watchdog and server were each loading their own in-memory copy of the SQLite database, causing data loss when either saved. Now only the server manages the database.
- **Graceful shutdown handling**: Server now saves database synchronously on SIGTERM/SIGINT before shutdown. Watchdog tracks intentional restarts separately from crashes to prevent false "crash" logs when server is restarted via admin UI.
- **Comprehensive sample data audit logging**: Added detailed audit log entries throughout sample data generation:
  - Each matter creation logged with ID, note, cost, date, lawyer info
  - Private notes generation logged with matter ID, note count, AI vs static source
  - Attachment generation logged with matter ID, document type, filename, size
  - AI API calls logged with request/response details
  - Summary log includes all matter IDs, percentages requested vs generated

---

## [0.11.5] - 2026-01-09

### Added

- **Claude API call logging**: Wrapper function for logging all Claude API interactions
  - `callClaudeWithLogging()` logs request before call and response after
  - Captures model, duration, token usage, content length
  - Sanitizes sensitive fields (apiKey, secretAccessKey, password, token)

- **Storage operation logging**: Debug-level logging for file storage operations
  - `logStoragePut()`, `logStorageGet()`, `logStorageDelete()` functions
  - `logStorageError()` for error-level storage failures
  - Tracks storage key, size, content type, and duration
  - Works with both filesystem and S3 storage backends

- **Audit log debug mode UI enhancements**:
  - Debug mode ON/OFF indicator badge in header (links to System Info)
  - Purple banner when debug mode is active
  - Purple left border and muted background for DEBUG entries
  - Copy buttons for request/response JSON in expanded view
  - Max height with overflow scroll on expanded sections

### Changed

- Legal document generation now uses `callClaudeWithLogging()` for audit trail
- All storage operations now receive user context for proper attribution
- Server API calls pass user context through to logging functions

---

## [0.11.4] - 2026-01-09

### Added

- **Audit log pagination controls**: Enhanced navigation for audit log entries
  - Configurable page size (25, 50, 100, 200) with preference saved to database
  - "Goto Page" input box for direct page navigation
  - Top and bottom navigation buttons for easier access
  - Default page size changed to 25 entries

- **API request payload logging**: Request bodies now included in DEBUG-level API logs
  - Captures request body/payload in preHandler hook
  - Sanitizes sensitive fields (password, apiKey, secret, token) with `[REDACTED]`
  - Response status code included in log details

- **Default settings initialization**: New database defaults for audit settings
  - `audit_log_level`: defaults to 'INFO'
  - `log_api_requests`: defaults to 'false'
  - `audit_log_page_size`: defaults to '25'

### Fixed

- **Audit log row expansion bug**: Clicking rows caused exponential expansion
  - Event listeners were being duplicated on each table reload
  - Now properly removes old handler before attaching new one
  - Clicks on expanded detail rows no longer toggle parent

---

## [0.11.3] - 2026-01-09

### Added

- **SECURITY audit log level**: New log level for security-related events
  - Sits between ERROR and WARNING in severity (always logged)
  - Orange badge and left border styling in audit log UI
  - Filter option in audit log dropdown
  - `logSecurity()` and `logSecurityFromRequest()` functions

- **Token validation endpoint**: Detects and clears stale admin tokens
  - `GET /admin/api/auth/validate` checks token and session validity
  - Automatically clears invalid/expired tokens from browser
  - Logs security events when stale tokens are detected
  - Called automatically when login page is shown

- **API request logging**: Optional DEBUG-level logging for all admin API requests
  - New "Log API Requests" toggle in System Info settings
  - Requires both DEBUG log level and explicit opt-in
  - Logs method, URL, query params, status code, and duration
  - Skips noisy endpoints (validate, watchdog status)

### Fixed

- **Logout now clears admin_token cookie**: Previously only invalidated session in database
- **Audit log filter fix**: Level filter was sending `level=undefined` as string literal

---

## [0.11.2] - 2026-01-09

### Added

- **Watchdog Process Manager**: Lightweight process manager for server lifecycle control
  - HTTP API on port 3001 with status, restart, and file changes endpoints
  - Automatic crash recovery with 2-second delay before restart
  - File change detection tracks modifications since last restart
  - Audit log integration logs all restart events with reasons
  - Admin UI shows server status, uptime, restart count, and pending changes
  - One-click restart button in System Info page
  - Yellow warning banner shows modified files needing restart
  - Graceful shutdown on SIGINT/SIGTERM

---

## [0.11.1] - 2026-01-09

### Added

- **Global Error Handling**: Comprehensive error and warning logging
  - Fastify global error handler catches all route errors with stack traces
  - Process-level handlers for uncaught exceptions and unhandled rejections
  - Errors logged to audit log before crashing for debugging
  - Error entries visually distinguished with red left border in audit log UI
  - Copy button for stack traces in expanded audit log view

### Changed

- **Console statements replaced**: Converted console.log/error/warn to audit logging
  - Claude API errors now logged to audit log
  - S3 storage fallback warning logged to audit log
  - Matter descriptions loading failure logged as warning
  - Audit system fallbacks still use console (intentional for bootstrap)

---

## [0.11.0] - 2026-01-09

### Added

- **Audit Log Level Configuration**: Added setting to control minimum audit log level
  - New dropdown in System Info page under "Audit Log Settings"
  - Options: Error only, Warning and above, Info and above (default), Debug (all events)
  - Lower levels include all higher severity events
  - Setting persisted via `audit_log_level` setting key

---

## [0.10.1] - 2026-01-09

### Fixed

- **Frontend Button Handlers**: Fixed all buttons broken in frontend (theme picker, log matter, view history, etc.)
  - Exposed UI functions to window object for inline onclick handlers
  - Functions were inaccessible after ES module conversion since module scope doesn't expose to global scope

---

## [0.10.0] - 2026-01-09

### Added

#### Audit Logging System
- **Comprehensive Audit Trail**: Track all admin actions and system events
  - INFO level logging for CRUD operations, settings changes, auth events
  - WARNING level for suspicious activity or near-failures
  - ERROR level with stack traces for exceptions
  - DEBUG level for detailed diagnostic information
- **Database Table**: New `audit_log` table with columns:
  - `id`, `timestamp`, `level` (ERROR/WARNING/INFO/DEBUG)
  - `user_id`, `username` for action attribution
  - `action_type`, `entity_type`, `entity_id` for categorization
  - `summary` for human-readable description
  - `request`, `response`, `details` (JSON) for structured data
  - `ip_address`, `duration_ms`, `stack_trace` for diagnostics
- **Logged Operations**:
  - Matter CRUD: create, update, delete
  - Private note CRUD: create, update, delete
  - Attachment operations: upload, update, delete
  - Auth events: login success, login failure (wrong password, user not found, account locked), logout
  - Settings changes: generic settings, storage settings, AI settings, Claude API key
  - Data operations: wipe matters, wipe matters+settings, wipe everything, sample data generation
- **Graceful Failure**: Logging errors never break main operations
- **Admin API Endpoints**:
  - `GET /admin/api/audit-log` - Paginated list with filters (level, userId, entityType, entityId)
  - `GET /admin/api/audit-log/:id` - Single entry details
- **Admin UI Page**: New "Audit Log" page in admin navigation
  - Paginated table with 50 entries per page
  - Level filter dropdown (All/Error/Warning/Info/Debug)
  - Color-coded level badges
  - Expandable rows for details, request/response data, and stack traces
  - Timestamp, user, action type, entity, and summary columns

---

## [0.9.4] - 2026-01-09

### Added

#### Enhanced Matter Fields
- **Counsel Tracking**: Add lawyer and opposing counsel information to matters
  - Lawyer name and firm
  - Opposing counsel name and firm
  - Case/matter number (external reference)
- **Edit Matter Modal**: Expanded with sections for counsel information
- **Matter Detail View**: Display counsel information when populated

#### Private Notes Enhancements
- **Interaction Tracking**: New fields for private notes
  - Interaction date (separate from created_at)
  - Interaction type: Note, Phone Call, Email, Meeting, Court Appearance, Filing, Letter Sent, Letter Received, Other
- **Add Note Modal**: Date picker and type dropdown
- **Visual Icons**: Color-coded icons for each interaction type in timeline

#### Attachment Metadata
- **Document Tracking**: New fields for attachments
  - Document date (when document was dated/received/sent)
  - Direction: Incoming (received), Outgoing (sent), Internal
- **Upload Modal**: Capture document date and direction during upload
- **Direction Badges**: Visual indicators in timeline view

#### Timeline View
- **Unified Activity Timeline**: New section in matter detail view
  - Aggregates private notes and attachments chronologically
  - Sort by date (interaction date for notes, document date for attachments)
  - Toggle between newest-first and oldest-first
  - Visual distinction between notes and attachments
  - Type badges for notes (phone call, email, meeting, etc.)
  - Direction badges for attachments (incoming, outgoing, internal)
  - Empty state for matters with no activity
- **Improved Timeline Display**: Enhanced visual presentation
  - Grouped by month/year with section headers
  - Vertical line connecting entries within each month
  - Color-coded dots matching interaction type
  - Collapsed by default, expandable with state persistence

#### Collapsible Sections
- **Matter Detail Collapsible Panels**: All main sections are now collapsible
  - Timeline section: collapsed by default
  - Attachments section: expanded by default
  - Private Notes section: expanded by default
  - State persisted via localStorage
  - Chevron animation on toggle
  - Action buttons remain visible when collapsed

#### Matter Attachments System
- **File Upload Support**: Upload PDF, DOC, DOCX, RTF, and TXT files to matters
  - Max file size: 25MB
  - Server-side file type validation (extension and MIME type)
  - Filename sanitization to prevent path traversal attacks
  - Upload progress indicator with status feedback
- **Attachments UI**: New "Attachments" section in matter detail view
  - File list with icons by type (PDF red, DOC blue, others gray)
  - Shows filename, size, upload date, and uploader
  - Preview button for PDF and text files (opens in modal)
  - Download button per attachment (streams file)
  - Delete button with confirmation modal
  - Flowbite-style tooltips on all action buttons
  - Empty state with helpful guidance

#### Storage Abstraction Layer
- **Dual Backend Support**: Filesystem and S3-compatible storage backends
  - Filesystem backend (default): Stores files in `./data/uploads`
  - S3 backend: Supports AWS S3, MinIO, Backblaze B2, Wasabi
- **S3 Settings UI**: New "File Storage" section on Security page
  - Storage backend toggle (Filesystem / S3)
  - S3 configuration: Access Key, Secret Key, Bucket, Region, Endpoint
  - Path-style addressing toggle for MinIO compatibility
  - "Test Connection" button with validation feedback
  - Settings cannot be saved until test passes
- **Comprehensive Setup Guide**: Expandable help modal with instructions for:
  - AWS S3 setup (bucket creation, IAM policy, access keys)
  - MinIO self-hosted setup
  - Backblaze B2 setup
  - Wasabi setup
  - Troubleshooting common errors

#### LLM-Generated Legal Documents
- **AI Document Generation**: Generate realistic PDF legal documents via Claude API
  - Document types: Demand letters, Cease & Desist, Complaints, Motions to Dismiss, Settlement Offers, Invoices, Retainer Agreements, Deposition Summaries
  - Spice level affects document tone (Professional to Eldritch Horror)
  - Proper legal formatting with headers, case numbers, signature blocks
- **Placeholder Documents**: Static fallback PDFs when Claude API is not configured
- **Sample Data Integration**: Generate AI attachments during sample data population
  - "Generate AI legal documents" checkbox in sample data modal
  - Configurable percentage of matters that receive documents
  - One document per matter (random type)
  - Warning about API call volume for large datasets

#### Sample Data Enhancements
- **Counsel Information Generation**: Auto-populate lawyer and opposing counsel info
  - Configurable percentage of matters with our lawyer info (default: 40%)
  - Configurable percentage of matters with opposing counsel info (default: 30%)
  - Static pool of realistic lawyer names and firm names
- **Case Number Generation**: Auto-generate case/matter numbers
  - Configurable percentage of matters with case numbers (default: 50%)
  - Format: YYYY-PREFIX-##### (e.g., 2025-CV-12345)
  - Prefixes: CV, CR, FA, PR, BK, AP, MC
- **Private Notes Enhancements**: Notes now include interaction metadata
  - Random interaction dates (0-60 days after matter date)
  - Interaction type based on note content (phone call, email, meeting, etc.)
  - Static pool of notes with pre-assigned types
- **Attachment Metadata**: Generated attachments include tracking fields
  - Document date (0-30 days after matter date)
  - Direction (weighted: incoming 40%, internal 40%, outgoing 20%)

#### Database Schema
- New `matter_attachments` table with:
  - Foreign key to matters (cascade delete)
  - Original filename, content type, size tracking
  - Storage backend and storage key for file retrieval
  - Created by user tracking

#### API Endpoints
- `GET /admin/api/matters/:id/attachments` - List attachments for matter
- `POST /admin/api/matters/:id/attachments` - Upload attachment (multipart/form-data)
- `GET /admin/api/attachments/:id/download` - Stream file download
- `DELETE /admin/api/attachments/:id` - Delete attachment from storage and DB
- `GET /admin/api/settings/storage` - Get storage configuration
- `PUT /admin/api/settings/storage` - Update storage settings
- `POST /admin/api/settings/storage/test` - Test storage connection

### Changed

- Matter detail endpoint now includes attachments array
- Matter delete now cleans up attachment files from storage
- Sample data populate endpoint accepts new options:
  - `generateAttachments` and `attachmentsPercentage` for document generation
  - `lawyerPercentage`, `opposingCounselPercentage`, `caseNumberPercentage` for counsel/case number generation
- Private notes now support `interaction_date` and `interaction_type` fields
- Attachments now support `document_date` and `direction` fields
- Edit attachment modal added to modify document metadata

### Fixed

- **Matters Table Row Click Navigation**: Fixed bug where clicking on a row would navigate to the wrong matter
  - Switched from individual event listeners per row to event delegation on tbody
  - Prevents issues with duplicate event listeners when table is refreshed

### Changed

- **Test Infrastructure**: Improved test performance by adding `disableRateLimit` option to `createServer()`
  - Rate limiting can now be disabled for tests that don't need it
  - Removed 13-35 second delays that were working around rate limits
  - Test suite runs in ~29 seconds (down from ~110 seconds)
  - Created dedicated `rate-limit.test.js` for testing rate limiting in isolation
  - All test files updated to use `disableRateLimit: true`

---

## [0.7.2] - 2026-01-09

### Added

- **Persistent Row Selection**: Row selection in matters table now persists across navigation
  - Selection stored in sessionStorage (clears when browser closes)
  - Survives page navigation, refresh, sorting, and filtering
  - Selection cleared after successful export or clicking "Deselect All"
  - Gracefully handles previously selected rows that no longer exist

---

## [0.7.1] - 2026-01-09

### Added

- **Delete Rows in Add Multiple Modal**: Users can now remove individual rows before submitting
  - X button on each row to delete it from the form
  - Button disabled when only one row remains (at least one row required)
  - No confirmation needed since data hasn't been saved yet

---

## [0.7.0] - 2026-01-09

### Added

#### Enhanced Export Functionality
- **HTML Export Format**: Export matters as a self-contained HTML document
  - Fully styled, printable document with embedded CSS (no external dependencies)
  - Dark/light theme toggle button with localStorage persistence
  - Expandable private notes sections - click to show/hide notes per matter
  - Professional table layout with alternating row colors
  - Print-friendly styles (theme toggle hidden, all notes expanded in print)
  - Footer with application branding
- **JSON Export Format**: Export matters as JSON in addition to CSV
  - Format selector (CSV/JSON/HTML radio buttons) in export modal
  - JSON output includes properly structured data with nested private notes array
  - Private notes in JSON include: id, note_content, created_by, created_at, updated_at
- **Row Selection Export**: Export respects table row selection
  - "Export selected matters only" checkbox when rows are selected
  - Blue info banner shows count of selected matters
  - Uncheck to export all matters instead
- **Private Notes in Export**: Option to include private notes in exports (default: checked)
  - CSV: Notes concatenated with pipe separator, includes author and date metadata
  - JSON: Full note objects as nested array per matter
- **Auto-Clear Selection**: Selection automatically clears after successful export
  - All checkboxes unchecked
  - Bulk actions bar hidden

#### New API Parameters
- `GET /admin/api/matters/export` now accepts:
  - `format` - 'csv' (default) or 'json'
  - `ids` - Comma-separated list of matter IDs to export
  - `includePrivateNotes` - 'true' to include private notes

#### Tests
- **4 new tests** for JSON export functionality:
  - JSON format validation and structure
  - JSON with private notes
  - Selected matters JSON export
  - Content-type verification

### Changed
- **Export Button Label**: Changed from "Export CSV" to "Export" since both CSV and JSON formats are supported
- **Export Modal**: Renamed from "Export Matters to CSV" to "Export Matters"
- **Export Button**: Now triggers configurable export modal instead of direct CSV download
- **Private Notes Option**: "Include private notes" checkbox now only appears when selected matters actually have private notes
- **Export Filenames**: Now use detailed timestamps (YYYY-MM-DD_HH-MM-SS) to prevent duplicate filenames on consecutive exports
- **Export Respects Column Visibility**: Export now only includes columns currently visible in the table
  - Hidden columns via "Columns" dropdown are excluded from CSV/JSON export
  - Column order in export matches current table column order
- **Sort Indicators**: Column headers now show sort direction arrows when sorted

### Fixed
- **Columns Button**: Fixed columns settings dropdown not responding to clicks
  - Prevented duplicate event listener accumulation
  - Fixed document click listener for closing dropdown
- **Column Sorting**: Fixed sorting breaking after first click
  - Header now properly regenerates with sort indicators after each sort
  - Event listeners correctly re-attached after header update
- **Null Safety**: Added defensive null checks for select-all checkbox operations
  - Prevents errors when checkbox column is hidden

---

## [0.6.0] - 2026-01-05

### Added

#### Admin-Only Private Notes (Major Feature)
- **Private Notes System**: Internal notes visible only to admin users, attached to matters
  - One-to-many relationship: each matter can have multiple private notes
  - Notes include content, timestamp, and creator tracking
  - Automatic cascade delete when parent matter is deleted

#### Database Schema
- **`private_notes` table**: New table with columns:
  - `id` (PRIMARY KEY)
  - `matter_id` (FOREIGN KEY to matters with ON DELETE CASCADE)
  - `note_content` (TEXT)
  - `created_by_user_id` (FOREIGN KEY to admin_users)
  - `created_at`, `updated_at` (DATETIME)

#### New API Endpoints
- `GET /admin/api/matters/:id` - Get single matter with private notes included
- `PUT /admin/api/matters/:id` - Update single matter
- `DELETE /admin/api/matters/:id` - Delete matter (cascade deletes notes)
- `GET /admin/api/matters/:matterId/notes` - List all notes for a matter
- `POST /admin/api/matters/:matterId/notes` - Add a note to a matter
- `PUT /admin/api/notes/:noteId` - Update a note
- `DELETE /admin/api/notes/:noteId` - Delete a note

#### Admin UI Enhancements
- **Matter Detail View**: New dedicated page for viewing/editing individual matters
  - Accessible via clickable table rows or "View" link in matters list
  - Shows all matter fields with edit/delete functionality
  - Private Notes section with add/edit/delete capabilities
  - Search and sort for private notes (by date, author, recently updated)
  - "Admin Only" badge clearly marks notes as internal
  - Back navigation to matters list
- **Dynamic Routing**: Router now supports parameterized routes (e.g., `/matters/:id`)
- **Clickable Matter Rows**: Table rows in matters list are now clickable for quick navigation

#### Modular Column System for Matters Table
- **Configurable Columns**: Matters table now supports customizable columns
  - "Columns" button in the toolbar opens configuration dropdown
  - Toggle visibility of columns: ID, Date & Time, Note, Cost, Private Notes indicator
  - Checkbox and Actions columns are always visible (not hideable)
- **Column Reordering**: Drag-and-drop or use up/down arrows to reorder columns
- **Persistent Preferences**: Column order and visibility saved to localStorage
- **Reset to Default**: Button to restore default column configuration

#### Private Notes Indicator Column
- **Notes Column**: New column in matters list showing private notes count
  - Lock icon header indicates admin-only content
  - Amber chat bubble icon appears when matter has notes
  - Count badge shows when matter has 2+ notes
  - Hover tooltip shows exact note count

#### Sample Data Generation with Notes
- **Private Notes Generation**: Option to generate private notes alongside sample matters
  - Percentage slider (0-100%) to control what fraction of matters get notes
  - Min/max notes per matter configuration (default: 1-3)
  - Uses Claude AI for note content when AI is enabled, falls back to static notes
  - 28 static fallback notes covering various legal scenarios
- **Generation Progress**: Loading toast shows "+ notes" when generating with notes enabled
- **Success Feedback**: Toast message displays count of notes generated

#### Tests
- **20+ new tests** for private notes functionality covering:
  - CRUD operations (create, read, update, delete)
  - Access control (admin-only, public API exclusion)
  - Error handling (404s, validation)
  - Cascade delete behavior
  - Sample data generation with notes
  - Wipe operations include notes

### Changed
- **Matters List**: Added "View" action link and clickable rows
- **Matters Table**: Refactored to use column configuration object
  - Each column defined with: key, label, sortable, hideable, render functions
  - Dynamic header and row generation based on visible columns
- **Wipe Operations**: All wipe endpoints now also delete private notes
- **API Client** (`admin/js/api.js`): Added all private notes methods and updated `populateSampleData()` with notes options
- **Router** (`admin/js/router.js`): Added dynamic route pattern matching for matter detail pages

### Removed
- **Days Since Previous Field**: Removed from matter detail view due to limited utility

---

## [0.5.1] - 2026-01-05

### Added
- **Level 8 - THE FINAL FORM**: Ultimate spice level that transcends legal reality with zalgo text, time paradoxes, interdimensional disputes, and sentient contracts (pulsing skull button)
- **Persistent loading toast**: Shows "Generating X matters... please wait" with spinner during sample data generation, stays visible until operation completes

### Changed
- **Spice levels 6-8 prompt restructuring**: High spice levels now use completely custom prompt templates instead of appending instructions to base prompt, ensuring consistently chaotic output
- Updated help text for spice levels from "6-7 may cause existential dread" to "6+ may cause existential dread"
- Improved AI descriptions hint text in generation modal for clarity

### Fixed
- Spice levels 6 and 7 producing professional output instead of chaotic descriptions (prompts were falling back to level 1)

---

## [0.5.0] - 2026-01-05

### Added

#### Claude AI Integration (Major Feature)
- **Anthropic SDK Integration**: Added `@anthropic-ai/sdk` (v0.71.2) for native Claude API support
- **API Key Management**:
  - Secure API key input with show/hide toggle
  - Real-time validation against Claude API before storing
  - Compact validated state UI (green banner with checkmark)
  - Clear key functionality with confirmation modal
- **Dynamic Model Fetching**:
  - Automatically fetches available Claude models from API
  - Model dropdown populated based on account access
  - Model selection auto-saves on change
- **AI Description Generation**:
  - Generate AI-powered matter descriptions for sample data
  - 8 spice levels controlling tone (Professional → THE FINAL FORM)
  - Custom prompt override with `{count}` placeholder support
  - Preview functionality (generate 5 samples without saving)
  - Descriptions used in sample data population when enabled

#### Spice Levels (AI Tone Control)
- **Level 1 - Professional**: Formal corporate tone
- **Level 2 - Dry Humor**: Subtle, understated wit
- **Level 3 - Witty**: Mild sarcasm and wordplay
- **Level 4 - Dramatic**: Theatrical, slightly absurd
- **Level 5 - Unhinged**: Wildly creative and entertaining
- **Level 6 - Chaotic Evil**: Maximum depravity with mandatory puns and sarcasm (red button)
- **Level 7 - Eldritch Horror**: Cosmic legal nightmare fuel (gradient button)
- **Level 8 - THE FINAL FORM**: Transcendent chaos combining puns, existential dread, cosmic horror, and bureaucratic nightmares (pulsing skull button)

#### New API Endpoints
- `POST /admin/api/settings/claude-api-key/validate-and-save` - Validate and store API key
- `DELETE /admin/api/settings/claude-api-key` - Clear stored API key
- `GET /admin/api/claude/models` - List available Claude models
- `PUT /admin/api/settings/ai` - Save AI settings (model, spice level, custom prompt)
- `POST /admin/api/claude/preview-descriptions` - Generate preview descriptions

#### Sample Data Generation Enhancements
- Advanced options modal for fine-grained control:
  - Date range (start/end dates)
  - Cost range (min/max dollars)
  - Whole dollars only toggle
  - AI descriptions toggle (requires Claude setup)
  - Spice level override for generation
- Quick generate button for fast data population
- Progress feedback during generation
- Static matter descriptions file (`backend/data/matter-descriptions.json`) with fallback descriptions

#### Modal System Enhancements
- `showCustomModal()` function for arbitrary HTML content modals with configurable buttons
- Modal size options (sm, md, lg, xl)
- `onOpen` callback for post-render initialization
- `escapeHtml()` function now exported for external use

#### UX Improvements
- Enter key support for confirmation modals (focuses confirm button, Enter confirms)
- Enter key support for wipe confirmation inputs (Enter triggers the wipe button)
- Collapsible AI configuration section (state persisted via localStorage)
- Toast notifications for auto-save operations
- Loading spinners with `.spinner-sm` CSS class for inline use
- Collapsible details sections for wipe operation descriptions (reduces visual clutter)

#### Documentation
- Comprehensive CHANGELOG.md documenting all versions from pre-release to current
- Full Claude AI integration documentation in ADMIN.md
- API endpoints documentation for all new routes
- Spice levels reference table

### Changed
- **Data Management Page**: Complete redesign with AI integration section
- **API Client** (`admin/js/api.js`):
  - Added all Claude-related API methods
  - `populateSampleData()` now accepts options object with advanced parameters
  - Content-Type header only set when request has a body (fixes DELETE requests)
- **Settings Response**: Now includes `hasClaudeApiKey`, `isClaudeKeyValidated`, and `aiSettings` object
- **DEFAULT_APP_SETTINGS**: Extended with Claude/AI settings (claude_api_key, claude_key_validated, claude_model, ai_spice_level, ai_custom_prompt)
- **Sample Data Generation** (`/admin/api/data/populate-sample`):
  - Accepts advanced options (date range, cost range, wholeDollarsOnly, useAiDescriptions, spiceLevelOverride)
  - Response includes `used_ai_descriptions` flag
  - Costs are now randomly generated within configurable range instead of hardcoded values
- **Security Page** (`admin/js/components/security.js`): Simplified Change Password form layout
- **Confirmation Modals**: Focus now defaults to confirm button (previously cancel) for easier Enter key confirmation
- Claude API key UI: validated state shows compact green banner instead of input field
- "Clear key" button replaced with subtle link text
- Description Settings notice dynamically updates based on state
- Wipe operation cards now use collapsible `<details>` sections for impact descriptions

### Fixed
- DELETE requests failing with "Body cannot be empty when content-type is set to 'application/json'" error
- Description Settings section not updating notice text after API key validation

---

## [0.4.0] - 2026-01-05

> **Note**: This is a MINOR version bump that should have occurred in v0.3.3 (custom modals feature). The cost display fix below is a PATCH-level change.

### Fixed
- Admin panel cost display showing values 100x too low (costs stored in cents were not being divided for display)

---

## [0.3.3] - 2026-01-05

### Changed
- Replace all native `alert()` and `confirm()` dialogs with custom HTML/CSS modals
- Admin panel modals use Flowbite styling
- Frontend modals use theme-aware vanilla CSS
- Frontend `app.js` now uses ES modules

---

## [0.3.2] - 2026-01-05

### Changed
- Drop Node.js 18 support (reached End of Life)
- Minimum supported Node.js version is now 20

---

## [0.3.1] - 2026-01-05

### Fixed
- `NaN:NaN:NaN` time display when `last_matter_date` is invalid
- `INVALID DATE` display now shows proper placeholder
- `null` showing for record streak (`max_streak`)
- Matter cost display bug (was not dividing by 100)

### Added
- `DISPLAY` utility object to frontend with safe formatting helpers
- `display-utils.js` module for admin panel with centralized formatters
- Unit tests for display utilities (83 tests)

### Changed
- Use nullish coalescing (`??`) instead of `||` for proper zero handling

---

## [0.3.0] - 2026-01-05

### Changed
- Minor version bump for accumulated features

---

## [0.2.5] - 2026-01-05

### Added
- Live drain rate preview that updates $/hour and $/day as user types
- "Unsaved changes" indicator when form values differ from persisted state
- Visible Enabled/Disabled status badge next to Drain Settings header
- Loading state to save button during API calls
- `POST /admin/api/data/wipe-matters-and-settings` endpoint
- `DEFAULT_APP_SETTINGS` constant as canonical source of defaults
- `ENABLE_WIPE_MATTERS_AND_SETTINGS` env flag for production safety
- `HOST` env variable documentation to `.env.example`
- Dynamic version display in admin footer
- System info footer with environment details
- Configurable environment setting

### Changed
- Redesign Data Management page with 4-column grid layout
- Add Sample Data, Wipe Matters, Wipe + Reset, Factory Reset cards
- Uniform type-to-confirm pattern across all wipe operations
- Detailed descriptions of what each wipe operation deletes/preserves
- Split admin settings into four dedicated pages:
  - **Security**: API keys, authentication settings, password management
  - **Tracker Settings**: Drain rate configuration, display settings
  - **Data Management**: Sample data population, wipe functionalities
  - **System Information**: Version info, environment configuration
- Updated sidebar navigation with new menu items and icons
- Drain rate label now explicitly shows units (cents/second)
- Default `drain_rate` changed to 0
- Default `auto_drain_enabled` changed to false

### Removed
- Validation report generation from CI

---

## [0.2.4] - 2026-01-05

### Added
- Bootstrap token validation endpoint (`/admin/api/bootstrap/validate-token`)
- Bootstrap page-load validation that automatically refreshes invalid tokens
- `POST /admin/api/data/wipe-matters` endpoint to delete all matter records while preserving admin users, sessions, and settings
- Wipe matters UI in settings with orange-themed danger zone styling
- Comprehensive tests for token validation and wipe matters APIs

### Fixed
- Race condition where bootstrap tokens were invalidated before the bootstrap page could use them

### Changed
- Rename drain settings keys for clarity:
  - `drain_rate_cents` → `drain_rate_cents_per_second`
  - `drain_enabled` → `auto_drain_enabled`

---

## [0.2.3] - 2026-01-05

### Fixed
- Minor release for version synchronization

---

## [0.2.2] - 2026-01-05

### Added
- Bootstrap token validation endpoint
- Wipe matters functionality
- Bootstrap page auto-refresh for invalid tokens

---

## [0.2.1] - 2025-12-16

### Fixed
- Password change tests to handle session invalidation and rate limiting
- Password change and logout session invalidation

### Added
- Visible token field to bootstrap form
- Comprehensive E2E security tests for attack vector validation

### Changed
- Improve bootstrap error messages to specify which field is missing
- Fix error message to display 'password' instead of 'hashedPassword'
- Implement client-side password hashing for bootstrap setup
- Add missing route for bootstrap.html page

### Security
- Security hardening: fix critical vulnerabilities and add protections
  - Path traversal vulnerability in static file serving (FIXED)
  - Rate limiting on authentication endpoints (login: 5/min, bootstrap: 10/5min)
  - Input length validation (username: 100, password: 1000, email: 255, note: 10KB)
  - Security headers (CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)

---

## [0.2.0] - 2025-12-15

This is the first tagged release with semantic versioning. Prior to this, the project underwent significant development establishing the core functionality.

### Added
- **Admin Authentication System**
  - JWT-based authentication with bcrypt password hashing
  - CLI tools for creating admin users (`create-admin.js`, `create-admin-simple.js`)
  - HTTP-only cookies for secure session management
  - Password change functionality

- **Complete Wipe + Secure Bootstrap Flow**
  - "Wipe Everything" database reset requiring "WIPE EVERYTHING" confirmation
  - Reset to pristine fresh install state
  - One-time secure admin bootstrap with cryptographic tokens (SHA-256)
  - Bootstrap tokens: single-use, 60-minute expiration
  - Strong password policy (12+ chars, 3+ criteria)
  - Production safety with `ENABLE_DB_RESET` env flag

- **Sample Data Management System**
  - `/backend/samples/` directory with 4 JSON datasets (small, medium, large, extra-large)
  - `GET /admin/api/data/samples` endpoint to list available sample files
  - `POST /admin/api/data/populate-sample` endpoint supporting file-based and generated data
  - Admin UI dropdown to select sample datasets or generate custom counts

- **CSS Consolidation**
  - External CSS stylesheet for better organization
  - Refactor inline styles to external CSS classes

- **UI/UX Improvements**
  - Increase font sizes across all themes by 15-20%
  - Add acronym explanation to modern and retro themes
  - Emphasized acronym explanation in frontend header

- **Automated Versioning**
  - CI workflow with semantic versioning
  - Version scripts in package.json

- **Database Schema**
  - Database schema initialization file
  - Validation report archiving in CI

### Changed
- **Rebrand to LEGAL MATTER**
  - Full name: Legal Expense Governance Allocation Ledger Management Application for Tracking Time, Expenses, Retainers
  - Semantic versioning adopted

- **Terminology Refactor**
  - Database schema refactored from "incidents" to "matters"
  - Table renamed: `incidents` → `matters`
  - Column renamed: `incident_date` → `matter_date`
  - All API endpoints updated to use matter terminology
  - Frontend, admin portal, tests, and documentation updated

---

## [Pre-release] - 2025-12-15

Initial development phase establishing core functionality.

### Added
- **Core Application**
  - Legal matter tracking with date, note, and cost fields
  - Multiple frontend themes (modern, retro, terminal)
  - Real-time display updates

- **Backend Infrastructure**
  - Fastify server with RESTful API
  - SQLite database with sql.js (universal compatibility)
  - Settings system (drain rate, auto-drain, display overrides)

- **Admin Portal**
  - Dashboard with stats and charts (Chart.js)
  - Full matters CRUD management
  - Multi-row matter input
  - Bulk operations (delete, export CSV)
  - Comprehensive settings management
  - API key management
  - Analytics and visualizations
  - Flowbite Admin Dashboard UI
  - Mobile-responsive design

- **Testing Infrastructure**
  - GitHub Actions CI workflow
  - Comprehensive test suite with unit and integration tests
  - Refactored server and database for testability

- **Developer Experience**
  - Replaced better-sqlite3 with sql.js for universal compatibility
  - Updated domain to lawyerfree.today
  - Documentation with vim instructions and multi-distro support
  - Comprehensive .gitignore

- **UI Polish**
  - Randomized sarcastic terminal messages
  - Improved text contrast across all themes
  - More sarcasm and self-deprecating humor throughout UI

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| Unreleased | - | |
| 0.11.5 | 2026-01-09 | Claude API logging, storage logging, debug UI enhancements |
| 0.11.4 | 2026-01-09 | Audit log pagination, API request payload logging |
| 0.11.3 | 2026-01-09 | SECURITY log level, token validation, logout cookie clearing |
| 0.11.2 | 2026-01-09 | Watchdog process manager |
| 0.11.1 | 2026-01-09 | Global error handling, console statements replaced |
| 0.11.0 | 2026-01-09 | Audit log level configuration |
| 0.10.1 | 2026-01-09 | Fix frontend buttons |
| 0.10.0 | 2026-01-09 | Audit logging system |
| 0.9.4 | 2026-01-09 | GitHub Release creation with changelog notes |
| 0.9.3 | 2026-01-09 | Test performance improvements with disableRateLimit |
| 0.9.2 | 2026-01-09 | Collapsible sections, improved timeline display |
| 0.9.1 | 2026-01-09 | Counsel tracking, timeline view, interaction types |
| 0.9.0 | 2026-01-09 | Counsel tracking, timeline view, interaction types |
| 0.8.1 | 2026-01-09 | Attachment preview, Flowbite tooltips |
| 0.8.0 | 2026-01-09 | Matter attachments, S3 storage, AI document generation |
| 0.7.2 | 2026-01-09 | Persistent row selection |
| 0.7.1 | 2026-01-09 | Delete rows in Add Multiple modal |
| 0.7.0 | 2026-01-09 | Enhanced export, column customization, sortable table |
| 0.6.0 | 2026-01-05 | Admin-only private notes, matter detail view, sample data notes generation |
| 0.5.1 | 2026-01-05 | Level 8 "THE FINAL FORM", persistent loading toast, spice level fixes |
| 0.5.0 | 2026-01-05 | Claude AI Integration, 8 spice levels, AI-powered descriptions |
| 0.4.0 | 2026-01-05 | Fix cost display 100x bug *(MINOR bump for v0.3.3)* |
| 0.3.3 | 2026-01-05 | Custom HTML/CSS modals |
| 0.3.2 | 2026-01-05 | Drop Node.js 18 support |
| 0.3.1 | 2026-01-05 | Fix null/invalid value displays |
| 0.3.0 | 2026-01-05 | Minor version bump |
| 0.2.5 | 2026-01-05 | Split settings pages, data management redesign |
| 0.2.4 | 2026-01-05 | Bootstrap token validation, wipe matters |
| 0.2.3 | 2026-01-05 | Version sync release |
| 0.2.2 | 2026-01-05 | Bootstrap improvements |
| 0.2.1 | 2025-12-16 | Security hardening, E2E tests |
| 0.2.0 | 2025-12-15 | First semantic version, auth system, sample data |
| Pre-release | 2025-12-15 | Initial development |

---

## Contributors

- Patrick Hudson (@patrick-hudson)

## Links

- [Repository](https://github.com/patrick-hudson/legal-tracker)
- [Admin Documentation](./ADMIN.md)
