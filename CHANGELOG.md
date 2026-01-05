# Changelog

All notable changes to LEGAL MATTER (Legal Expense Governance Allocation Ledger Management Application for Tracking Time, Expenses, Retainers) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
