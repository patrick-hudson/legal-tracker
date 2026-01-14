<div align="center">

# ⚖️ LEGAL MATTER

**Legal Expense Governance Allocation Ledger Management Application for Tracking Time, Expenses, Retainers**

*Full-featured legal matter management for the paranoid and penny-conscious.*

[![Version](https://img.shields.io/badge/version-0.8.0-amber?style=flat-square)](https://github.com/patrick-hudson/legal-tracker/releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat-square)](https://nodejs.org)
[![CI](https://img.shields.io/github/actions/workflow/status/patrick-hudson/legal-tracker/ci.yml?style=flat-square&label=tests)](https://github.com/patrick-hudson/legal-tracker/actions)

<br />

<!-- Replace with actual screenshot -->
<img src="docs/screenshot.png" alt="LEGAL MATTER Screenshot" width="700" />

<br />

[Features](#features) · [Quick Start](#quick-start) · [Themes](#themes) · [Admin Panel](#admin-panel) · [API Reference](#api-reference) · [Configuration](#configuration)

</div>

---

## What is LEGAL MATTER?

LEGAL MATTER is a self-hosted, two-part system:

1. **Digital Signage** — A public-facing display showing your "days since last lawyer" streak, lifetime legal expenses, and matter statistics. Perfect for office dashboards, TV displays, or personal motivation/shame.

2. **Admin Panel** — A full-featured legal matter tracker with private notes, file attachments, AI document generation, multi-format export, and enough configuration options to satisfy the most paranoid self-hoster.

All wrapped in your choice of **10 display themes**, from warm amber CRT glow to GEOCITIES 1996 nostalgia.

---

## Features

### Display / Digital Signage

| Feature | Description |
|---------|-------------|
| 📅 **Days Since Counter** | Track your lawyer-free streak. The number everyone's watching. |
| 💸 **Lifetime Expenses** | Running total of legal fees, with optional "drain rate" that ticks up in real-time for emotional effect |
| 📊 **Statistics** | Record streak, matters this year, all-time total |
| 🖥️ **10 Display Themes** | CRT terminals, modern minimal, and a 1996 Geocities mode |
| 📝 **Manual Entry** | Log matters directly from the display (when authenticated) |

### Admin Panel

| Feature | Description |
|---------|-------------|
| 📋 **Matter Management** | Full CRUD with lawyer/firm names, case numbers, opposing counsel, costs |
| 🔒 **Private Notes** | Admin-only notes per matter — internal commentary that never shows publicly |
| 📎 **File Attachments** | Upload PDF, DOC, DOCX, RTF, TXT (25MB max) with preview and download |
| 🤖 **AI Document Generation** | Generate realistic legal documents via Claude API |
| 📤 **Multi-Format Export** | CSV, JSON, or self-contained HTML with dark mode toggle |
| ✅ **Row Selection** | Select specific matters for export or bulk operations |
| 🔧 **Column Customization** | Show/hide and reorder columns, persisted to localStorage |
| 👥 **Sample Data Generation** | Populate test data with optional AI-generated descriptions and notes |
| 🗑️ **Granular Wipe Operations** | Wipe matters only, matters + settings, or full factory reset |

### AI Document Generation

When configured with a Claude API key, LEGAL MATTER can generate realistic PDF legal documents:

- **Document Types:** Demand Letters, Cease & Desist, Complaints, Motions to Dismiss, Settlement Offers, Invoices, Retainer Agreements, Deposition Summaries
- **8 Spice Levels** controlling tone:

| Level | Name | Description |
|-------|------|-------------|
| 1 | Professional | Formal corporate tone |
| 2 | Dry Humor | Subtle, understated wit |
| 3 | Witty | Mild sarcasm and wordplay |
| 4 | Dramatic | Theatrical, slightly absurd |
| 5 | Unhinged | Wildly creative |
| 6 | Chaotic Evil | Maximum depravity with mandatory puns |
| 7 | Eldritch Horror | Cosmic legal nightmare fuel |
| 8 | THE FINAL FORM | Zalgo text, time paradoxes, sentient contracts |

*Spice levels 6+ may cause existential dread. Use responsibly.*

### Storage Options

| Backend | Description |
|---------|-------------|
| **Filesystem** | Default. Stores uploads in `./data/uploads` |
| **S3-Compatible** | AWS S3, MinIO, Backblaze B2, Wasabi — configured via admin UI |

### Security

- JWT authentication with bcrypt password hashing
- IP whitelist for public API write operations
- API key authentication for programmatic access
- One-time bootstrap tokens for initial setup
- Rate limiting on auth endpoints
- Security headers (CSP, X-Frame-Options, etc.)
- Input validation and sanitization

---

## Themes

LEGAL MATTER ships with **10 display themes** — 8 CRT-style terminals and 2 special modes:

### CRT Themes

| Theme | Vibe |
|-------|------|
| 🟠 **AMBER CRT** | Classic warm terminal. The default. |
| 🟢 **NUCLEAR** | Green phosphor. Very Fallout. |
| 🔵 **MAINFRAME** | Blue IBM aesthetic |
| 🩷 **VAPOR** | Pink vaporwave dreams |
| 🔴 **DEFCON** | Red alert. Something's wrong. |
| ⚪ **PAPER** | Light mode for the fluorescent-lit office |
| 🟣 **CYBERPUNK** | Purple neon. Night City vibes. |
| 🟧 **HAZMAT** | Orange warning. Proceed with caution. |

### Special Modes

| Theme | Vibe |
|-------|------|
| ⬛ **MINIMAL 2025** | Clean, modern dark mode. For professionals who still want to look cool. |
| 🌈 **GEOCITIES 1996** | `<marquee>` energy. Under construction GIFs not included (yet). |

Theme preference is saved to localStorage and persists across sessions.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Production Deployment](#production-deployment)
- [Configuration](#configuration)
- [Admin Panel](#admin-panel)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Error Responses](#error-responses)
  - [Public Endpoints](#public-endpoints)
  - [Protected Endpoints](#protected-endpoints)
  - [Bootstrap Endpoints](#bootstrap-endpoints)
  - [Admin Authentication](#admin-authentication)
  - [Admin Matters](#admin-matters)
  - [Private Notes](#private-notes)
  - [Attachments](#attachments)
  - [Settings](#settings)
  - [Storage Configuration](#storage-configuration)
  - [Claude AI Integration](#claude-ai-integration)
  - [User Management](#user-management)
  - [Session Management](#session-management)
  - [Data Management](#data-management)
  - [Analytics](#analytics)
- [Development](#development)
- [Backup & Restore](#backup--restore)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Quick Start

### Prerequisites

- **Node.js** 20.x or 22.x
- **npm** or your preferred package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/patrick-hudson/legal-tracker.git
cd legal-tracker/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
HOST=0.0.0.0
REQUIRE_AUTH=true
ALLOWED_IPS=YOUR.IP.ADDRESS.HERE
API_KEY=your-secret-api-key
```

> **Tip:** Generate a secure API key with `openssl rand -hex 32`

```bash
# Start the server
npm start
```

Visit `http://localhost:3000` — you'll see the digital signage display.

Visit `http://localhost:3000/admin` — you'll be prompted to bootstrap your admin account.

---

## Production Deployment

### PM2 Process Management

```bash
npm install -g pm2
pm2 start server.js --name legal-tracker
pm2 save
pm2 startup
```

### Watchdog Process Manager (Built-in)

LEGAL MATTER includes a built-in watchdog process manager as an alternative to PM2:

```bash
# Start via watchdog (instead of npm start)
node watchdog.js
```

**Features:**
- Automatic crash recovery (2-second delay before restart)
- File change detection (shows modified files needing restart)
- Admin UI integration (System Info page shows status and restart button)
- Audit log integration (all restarts are logged with reasons)
- HTTP API for programmatic control

**Watchdog API Endpoints (port 3001 by default):**

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/status` | GET | No | Server status, uptime, pending changes |
| `/restart` | POST | API Key | Trigger server restart |
| `/changes` | GET | No | List modified files since last restart |

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `WATCHDOG_PORT` | `3001` | Port for watchdog HTTP API |
| `WATCHDOG_HOST` | `0.0.0.0` | Host/IP to bind watchdog API |
| `WATCHDOG_API_KEY` | `API_KEY` | API key for restart endpoint |
| `WATCHDOG_URL` | — | Full URL to watchdog (for server.js proxy in non-localhost setups) |

**Admin UI Integration:**

The System Info page shows:
- Server running status (green/red indicator)
- Uptime and restart count
- Pending file changes (yellow warning banner)
- One-click "Restart Server" button

> **Note:** When running via watchdog, the server will automatically restart on crash. To stop completely, press Ctrl+C in the watchdog terminal.

### Nginx Reverse Proxy

<details>
<summary><strong>Click to expand Nginx configuration</strong></summary>

Create `/etc/nginx/sites-available/legal-tracker`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 25M;  # For file uploads

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
# Debian/Ubuntu
sudo ln -s /etc/nginx/sites-available/legal-tracker /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# RHEL/Rocky/Fedora
sudo cp /etc/nginx/sites-available/legal-tracker /etc/nginx/conf.d/legal-tracker.conf
sudo nginx -t && sudo systemctl restart nginx
```

</details>

### SSL with Let's Encrypt

<details>
<summary><strong>Click to expand SSL setup</strong></summary>

```bash
# Debian/Ubuntu
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# RHEL/Rocky/Fedora
sudo dnf install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# Arch
sudo pacman -S certbot certbot-nginx
sudo certbot --nginx -d your-domain.com
```

</details>

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `REQUIRE_AUTH` | `true` | Require authentication for public API writes |
| `ALLOWED_IPS` | — | Comma-separated IP whitelist for public API |
| `API_KEY` | — | API key for programmatic access |
| `ANTHROPIC_API_KEY` | — | Claude API key for AI features |
| `STORAGE_BACKEND` | `filesystem` | `filesystem` or `s3` |
| `ENABLE_DB_RESET` | `false` | Enable "Wipe Everything" in admin (safety flag) |
| `ENABLE_WIPE_MATTERS_AND_SETTINGS` | `false` | Enable "Wipe + Reset" in admin |

### Storage Backends

#### Filesystem (Default)

Files are stored in `./data/uploads`. No additional configuration needed.

#### S3-Compatible Storage

Configure via the Admin Panel → Security → File Storage, or via environment:

```env
STORAGE_BACKEND=s3
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_ENDPOINT=https://s3.amazonaws.com  # Optional, for S3-compatible services
```

Supports: AWS S3, MinIO, Backblaze B2, Wasabi, and other S3-compatible services.

### AI Integration

To enable AI document generation and AI-powered sample data:

1. Get an API key from [Anthropic Console](https://console.anthropic.com/)
2. Go to Admin Panel → Security → AI Configuration
3. Enter and validate your API key
4. Select a model and spice level

---

## Admin Panel

### Initial Setup

On first launch, visit `/admin` to bootstrap your admin account:

1. A one-time bootstrap token is generated and shown in the server console
2. Enter the token, your desired username, and a strong password
3. Password requirements: 12+ characters, 3 of 4 criteria (upper, lower, number, special)

### Managing Matters

- **List View:** Sortable, filterable table with customizable columns
- **Detail View:** Click any row to view/edit full details
- **Bulk Actions:** Select multiple rows for export or deletion
- **Add Multiple:** Batch-add matters via modal form

### Private Notes

Private notes are admin-only annotations attached to matters:

- Never displayed on the public signage
- Timestamped with author attribution
- Searchable and sortable within matter detail view
- Cascade-deleted when parent matter is deleted

### Attachments

Upload files directly to matters:

- **Supported formats:** PDF, DOC, DOCX, RTF, TXT
- **Max size:** 25MB
- **Features:** In-browser preview (PDF/text), download, delete with confirmation
- **Storage:** Filesystem or S3-compatible backends

### Export

Export matters in three formats:

| Format | Description |
|--------|-------------|
| **CSV** | Standard spreadsheet format |
| **JSON** | Structured data with nested private notes |
| **HTML** | Self-contained document with dark/light toggle, expandable notes, print-friendly |

### Data Management

| Operation | What it does |
|-----------|--------------|
| **Add Sample Data** | Generate test matters with optional AI descriptions |
| **Wipe Matters** | Delete all matters, keep admin users and settings |
| **Wipe + Reset** | Delete matters and reset settings to defaults |
| **Factory Reset** | Nuclear option. Deletes everything. Requires `ENABLE_DB_RESET=true` |

---

## API Reference

### Authentication

LEGAL MATTER uses multiple authentication methods:

| Method | Used For | How to Authenticate |
|--------|----------|---------------------|
| **None** | Public read endpoints | No authentication required |
| **Legacy API Key / IP** | Protected write endpoints (public API) | `X-API-Key` header or source IP in whitelist |
| **External API Keys** | Admin panel endpoints (programmatic) | `X-API-Key` or `Authorization: Bearer` header |
| **JWT Session** | Admin panel endpoints (browser) | Cookie `admin_token` (set on login) |

#### External API Keys

External API Keys provide programmatic access to the admin panel API with full audit logging.

**Creating a Key:**
1. Go to Admin Panel > Security > External API Keys
2. Click "Create New Key"
3. Enter a descriptive name (e.g., "CI Pipeline", "Zapier Integration")
4. Optionally set an expiration (30 days, 90 days, 1 year, or never)
5. **Copy the key immediately** - it's only shown once

**Using the Key:**

```bash
# Option 1: X-API-Key header
curl -H "X-API-Key: lt_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  https://your-domain.com/admin/api/matters

# Option 2: Authorization Bearer header
curl -H "Authorization: Bearer lt_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  https://your-domain.com/admin/api/matters
```

**Key Format:** `lt_live_` prefix + 32 hex characters (40 chars total)

**Key Properties:**
- Tied to the user who created it
- Can be revoked at any time (immediately stops working)
- Optional expiration date
- `last_used_at` tracking
- All requests logged to audit log with key name

**Security Notes:**
- Keys are stored as bcrypt hashes (not recoverable)
- Invalid API keys return 401 immediately (no fallthrough to session auth)
- Revoked or expired keys are rejected instantly
- All API key requests are logged at INFO level in the audit log

#### Password Hashing

Passwords are hashed client-side with SHA-256 before transmission:

```javascript
const hashedPassword = await crypto.subtle.digest(
  'SHA-256',
  new TextEncoder().encode(password + salt)
).then(buf => Array.from(new Uint8Array(buf))
  .map(b => b.toString(16).padStart(2, '0')).join(''));
```

Get the salt from `GET /api/config`.

#### Rate Limits

| Endpoint | Limit |
|----------|-------|
| Login | 5 requests/minute |
| Bootstrap | 10 requests/5 minutes |
| General | 100 requests/minute |

---

### Error Responses

All errors follow a consistent format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description"
}
```

| Status | Error Codes |
|--------|-------------|
| 400 | `BAD_REQUEST`, `INVALID_FILE_TYPE` |
| 401 | `INVALID_CREDENTIALS`, `INVALID_PASSWORD`, `INVALID_TOKEN`, `TOKEN_EXPIRED`, `TOKEN_USED`, `USER_INACTIVE` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 500 | `SERVER_ERROR`, `UPLOAD_FAILED`, `DOWNLOAD_FAILED`, `DELETE_FAILED`, `API_ERROR` |

---

### Public Endpoints

No authentication required.

---

#### GET /api/health

Health check endpoint.

```bash
curl https://your-domain.com/api/health
```

**Response `200 OK`:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-09T12:00:00.000Z"
}
```

---

#### GET /api/version

Get version and environment information.

```bash
curl https://your-domain.com/api/version
```

**Response `200 OK`:**
```json
{
  "version": "0.8.0",
  "commitHash": "abc123def456789...",
  "commitHashShort": "abc123d",
  "commitPushed": true,
  "nodeVersion": "v20.10.0",
  "environment": "production"
}
```

---

#### GET /api/config

Get client configuration (needed for password hashing).

```bash
curl https://your-domain.com/api/config
```

**Response `200 OK`:**
```json
{
  "passwordSalt": "random-salt-string",
  "requireAuth": true
}
```

---

#### GET /api/status

Get dashboard data for the digital signage display.

```bash
curl https://your-domain.com/api/status
```

**Response `200 OK`:**
```json
{
  "days_since": 42,
  "last_matter_date": "2025-11-28T10:30:00.000Z",
  "lifetime_spent": 125000.50,
  "accumulated_drain": 1523.45,
  "total_spent": 126523.95,
  "drain_start_time": "2025-11-28T10:30:00.000Z",
  "drain_enabled": true,
  "drain_rate_cents_per_second": 50,
  "stats": {
    "total_matters": 15,
    "matters_this_year": 3,
    "max_streak": 89
  },
  "your_ip": "192.168.1.100",
  "auth_required": true
}
```

---

#### GET /api/matters

List all matters (public view, no private notes).

```bash
curl https://your-domain.com/api/matters
```

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "matter_date": "2025-11-28T10:30:00.000Z",
    "note": "Contract review for vendor agreement",
    "days_since": 42,
    "cost": 2500.00,
    "created_at": "2025-11-28T10:30:00.000Z"
  },
  {
    "id": 2,
    "matter_date": "2025-10-15T14:00:00.000Z",
    "note": "Trademark filing",
    "days_since": 86,
    "cost": 1500.00,
    "created_at": "2025-10-15T14:00:00.000Z"
  }
]
```

> **Note:** Costs are returned in dollars (stored internally in cents).

---

### Protected Endpoints

Requires `X-API-Key` header OR source IP in `ALLOWED_IPS`.

---

#### POST /api/matters

Create a new matter.

```bash
curl -X POST https://your-domain.com/api/matters \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "note": "Contract dispute with vendor",
    "cost": 2500,
    "matter_date": "2025-11-28T10:30:00Z"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `matter_date` | ISO8601 | No | Date of matter (default: now) |
| `note` | string | No | Description (max 10,000 chars) |
| `cost` | number | No | Cost in dollars |

**Response `201 Created`:**
```json
{
  "success": true,
  "id": 42,
  "message": "Matter logged. The counter has been reset. We believe in you."
}
```

**Error `400 Bad Request`:**
```json
{
  "error": "BAD_REQUEST",
  "message": "Note exceeds maximum length of 10000 characters"
}
```

---

#### PUT /api/matters/:id

Update an existing matter.

```bash
curl -X PUT https://your-domain.com/api/matters/42 \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "note": "Updated description",
    "cost": 3000
  }'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Matter updated"
}
```

**Error `404 Not Found`:**
```json
{
  "error": "NOT_FOUND",
  "message": "Matter not found"
}
```

---

#### DELETE /api/matters/:id

Delete a matter.

```bash
curl -X DELETE https://your-domain.com/api/matters/42 \
  -H "X-API-Key: your-api-key"
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Matter deleted"
}
```

---

#### POST /api/settings/lifetime-spent

Update lifetime legal expenses.

```bash
# Set absolute value
curl -X POST https://your-domain.com/api/settings/lifetime-spent \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"amount": 50000}'

# Add to existing value
curl -X POST https://your-domain.com/api/settings/lifetime-spent \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"amount": 1500, "add": true}'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Amount in dollars |
| `add` | boolean | No | If true, adds to existing; if false/omitted, sets absolute |

**Response `200 OK`:**
```json
{
  "success": true,
  "lifetime_spent": 51500
}
```

---

#### POST /api/settings/last-matter-date

Manually set the last matter date (resets the counter).

```bash
curl -X POST https://your-domain.com/api/settings/last-matter-date \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"date": "2025-12-01T00:00:00Z"}'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "last_matter_date": "2025-12-01T00:00:00.000Z"
}
```

**Error `400 Bad Request`:**
```json
{
  "error": "BAD_REQUEST",
  "message": "Date is required"
}
```

---

#### POST /api/settings/drain

Configure the drain rate (the "emotional damage" counter).

```bash
curl -X POST https://your-domain.com/api/settings/drain \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"enabled": true, "rate_cents": 50}'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | boolean | No | Enable/disable drain |
| `rate_cents` | number | No | Cents per second (0-1000) |

**Response `200 OK`:**
```json
{
  "success": true,
  "drain_enabled": true,
  "drain_rate_cents_per_second": 50
}
```

**Error `400 Bad Request`:**
```json
{
  "error": "BAD_REQUEST",
  "message": "Invalid drain rate. Must be between 0 and 1000 cents per second."
}
```

---

### Bootstrap Endpoints

Used for initial admin setup. No authentication required (token-based).

---

#### GET /admin/api/bootstrap/status

Check if initial setup is needed.

```bash
curl https://your-domain.com/admin/api/bootstrap/status
```

**Response `200 OK`:**
```json
{
  "needs_bootstrap": true,
  "has_active_admins": false
}
```

---

#### POST /admin/api/bootstrap/request-token

Request a bootstrap token (only works when no admins exist).

```bash
curl -X POST https://your-domain.com/admin/api/bootstrap/request-token
```

**Response `200 OK`:**
```json
{
  "success": true,
  "token": "a1b2c3d4e5f6...",
  "expires_in_minutes": 60
}
```

**Error `403 Forbidden`:**
```json
{
  "error": "FORBIDDEN",
  "message": "Bootstrap is not available. Active admin users already exist."
}
```

> **Note:** Token is also printed to server console.

---

#### POST /admin/api/bootstrap/validate-token

Check if a bootstrap token is valid.

```bash
curl -X POST https://your-domain.com/admin/api/bootstrap/validate-token \
  -H "Content-Type: application/json" \
  -d '{"token": "a1b2c3d4e5f6..."}'
```

**Response `200 OK` (valid):**
```json
{
  "valid": true,
  "expires_at": "2026-01-09T13:00:00.000Z"
}
```

**Response `401 Unauthorized` (invalid):**
```json
{
  "valid": false,
  "error": "TOKEN_EXPIRED",
  "message": "Bootstrap token has expired"
}
```

---

#### POST /admin/api/bootstrap/setup

Create the initial admin account.

```bash
curl -X POST https://your-domain.com/admin/api/bootstrap/setup \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4e5f6...",
    "username": "admin",
    "hashedPassword": "sha256-hashed-password-64-hex-chars"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | Bootstrap token |
| `username` | string | Yes | Username (3-100 chars) |
| `hashedPassword` | string | Yes | SHA-256 hash (64 hex chars) |

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Admin account created successfully",
  "username": "admin"
}
```

**Error `401 Unauthorized`:**
```json
{
  "error": "TOKEN_USED",
  "message": "Bootstrap token has already been used"
}
```

---

### Admin Authentication

---

#### POST /admin/api/auth/login

Authenticate and create a session.

```bash
curl -X POST https://your-domain.com/admin/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "admin",
    "hashedPassword": "sha256-hashed-password-here"
  }'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

Sets HTTP-only cookie `admin_token` (7-day expiry).

**Error `401 Unauthorized`:**
```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid username or password"
}
```

---

#### POST /admin/api/auth/logout

End the current session.

```bash
curl -X POST https://your-domain.com/admin/api/auth/logout \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### GET /admin/api/auth/me

Get current user info.

```bash
curl https://your-domain.com/admin/api/auth/me \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

---

#### POST /admin/api/auth/change-password

Change the current user's password.

```bash
curl -X POST https://your-domain.com/admin/api/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "currentPassword": "sha256-current-password",
    "newPassword": "sha256-new-password"
  }'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Password changed successfully. Please log in again."
}
```

> **Note:** All sessions for this user are invalidated.

**Error `401 Unauthorized`:**
```json
{
  "error": "INVALID_PASSWORD",
  "message": "Current password is incorrect"
}
```

---

### Admin Matters

All endpoints require admin session (JWT cookie).

---

#### GET /admin/api/matters

List matters with pagination and filtering.

```bash
curl "https://your-domain.com/admin/api/matters?page=1&limit=25&search=contract&sortBy=matter_date&sortOrder=DESC" \
  -b cookies.txt
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page |
| `search` | string | — | Search in notes |
| `sortBy` | string | `matter_date` | Sort field |
| `sortOrder` | string | `DESC` | Sort direction |

**Response `200 OK`:**
```json
{
  "matters": [
    {
      "id": 1,
      "matter_date": "2025-11-28T10:30:00.000Z",
      "note": "Contract review",
      "days_since": 42,
      "cost": 2500.00,
      "created_at": "2025-11-28T10:30:00.000Z",
      "private_notes_count": 3
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 25,
  "totalPages": 6
}
```

---

#### POST /admin/api/matters

Create a matter with full details.

```bash
curl -X POST https://your-domain.com/admin/api/matters \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "matter_date": "2025-11-28T10:30:00Z",
    "note": "Contract dispute with vendor",
    "cost": 2500,
    "lawyer_name": "Jane Smith",
    "lawyer_firm": "Smith & Associates",
    "opposing_counsel_name": "John Doe",
    "opposing_counsel_firm": "Doe Legal",
    "case_number": "2025-CV-1234"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `matter_date` | ISO8601 | Yes | Date of matter |
| `note` | string | No | Description |
| `cost` | number | No | Cost in dollars |
| `lawyer_name` | string | No | Your lawyer's name |
| `lawyer_firm` | string | No | Your lawyer's firm |
| `opposing_counsel_name` | string | No | Opposing counsel name |
| `opposing_counsel_firm` | string | No | Opposing counsel firm |
| `case_number` | string | No | Case/matter number |

**Response `201 Created`:**
```json
{
  "success": true,
  "matter": {
    "id": 42,
    "matter_date": "2025-11-28T10:30:00.000Z",
    "note": "Contract dispute with vendor",
    "days_since": 42,
    "cost": 2500.00,
    "created_at": "2025-11-28T10:30:00.000Z",
    "metadata": {
      "lawyer_name": "Jane Smith",
      "lawyer_firm": "Smith & Associates",
      "opposing_counsel_name": "John Doe",
      "opposing_counsel_firm": "Doe Legal",
      "case_number": "2025-CV-1234"
    }
  }
}
```

---

#### POST /admin/api/matters/bulk

Create multiple matters at once.

```bash
curl -X POST https://your-domain.com/admin/api/matters/bulk \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "matters": [
      {"matter_date": "2025-11-01T00:00:00Z", "note": "Matter 1", "cost": 1000},
      {"matter_date": "2025-11-15T00:00:00Z", "note": "Matter 2", "cost": 2000}
    ]
  }'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "created": 2,
  "errors": 0,
  "results": [
    {"index": 0, "id": 43},
    {"index": 1, "id": 44}
  ],
  "errors": []
}
```

---

#### GET /admin/api/matters/:id

Get a single matter with private notes and attachments.

```bash
curl https://your-domain.com/admin/api/matters/42 \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "id": 42,
  "matter_date": "2025-11-28T10:30:00.000Z",
  "note": "Contract dispute",
  "days_since": 42,
  "cost": 2500.00,
  "created_at": "2025-11-28T10:30:00.000Z",
  "metadata": {
    "lawyer_name": "Jane Smith",
    "lawyer_firm": "Smith & Associates",
    "opposing_counsel_name": null,
    "opposing_counsel_firm": null,
    "case_number": "2025-CV-1234"
  },
  "private_notes": [
    {
      "id": 1,
      "matter_id": 42,
      "note_content": "Client called, very upset about timeline",
      "interaction_date": "2025-11-29T14:00:00.000Z",
      "interaction_type": "phone_call",
      "created_by_username": "admin",
      "created_at": "2025-11-29T14:30:00.000Z",
      "updated_at": "2025-11-29T14:30:00.000Z"
    }
  ],
  "attachments": [
    {
      "id": 1,
      "matter_id": 42,
      "original_filename": "contract.pdf",
      "content_type": "application/pdf",
      "size_bytes": 125000,
      "direction": "received",
      "document_date": "2025-11-25T00:00:00.000Z",
      "created_by_username": "admin",
      "created_at": "2025-11-28T11:30:00.000Z"
    }
  ]
}
```

---

#### PUT /admin/api/matters/:id

Update a matter.

```bash
curl -X PUT https://your-domain.com/admin/api/matters/42 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "note": "Updated description",
    "cost": 3500,
    "lawyer_name": "Jane Smith-Johnson"
  }'
```

**Response `200 OK`:**
```json
{
  "success": true
}
```

---

#### DELETE /admin/api/matters/:id

Delete a matter (cascades to notes and attachments).

```bash
curl -X DELETE https://your-domain.com/admin/api/matters/42 \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "success": true
}
```

---

#### DELETE /admin/api/matters/bulk

Delete multiple matters.

```bash
curl -X DELETE https://your-domain.com/admin/api/matters/bulk \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"ids": [1, 2, 3]}'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "deleted": 3
}
```

---

#### GET /admin/api/matters/export

Export matters to CSV, JSON, or HTML.

```bash
# Export all as CSV
curl "https://your-domain.com/admin/api/matters/export?format=csv" \
  -b cookies.txt -o matters.csv

# Export selected as JSON with private notes
curl "https://your-domain.com/admin/api/matters/export?format=json&ids=1,2,3&includePrivateNotes=true" \
  -b cookies.txt -o matters.json

# Export as HTML
curl "https://your-domain.com/admin/api/matters/export?format=html" \
  -b cookies.txt -o matters.html
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `format` | string | `csv` | Export format (`csv`, `json`, `html`) |
| `ids` | string | — | Comma-separated IDs to export |
| `includePrivateNotes` | string | `false` | Include private notes |

**Response:** Binary file download with appropriate headers.

---

#### GET /admin/api/matters/:id/timeline

Get combined timeline of notes and attachments.

```bash
curl "https://your-domain.com/admin/api/matters/42/timeline?order=desc" \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "timeline": [
    {
      "type": "attachment",
      "id": 1,
      "date": "2025-11-28T11:30:00.000Z",
      "direction": "received",
      "filename": "contract.pdf",
      "content_type": "application/pdf",
      "size_bytes": 125000,
      "created_by": "admin",
      "created_at": "2025-11-28T11:30:00.000Z"
    },
    {
      "type": "note",
      "id": 1,
      "date": "2025-11-29T14:00:00.000Z",
      "interaction_type": "phone_call",
      "content": "Client called, very upset",
      "created_by": "admin",
      "created_at": "2025-11-29T14:30:00.000Z",
      "updated_at": "2025-11-29T14:30:00.000Z"
    }
  ]
}
```

---

### Private Notes

---

#### GET /admin/api/matters/:matterId/notes

List all notes for a matter.

```bash
curl https://your-domain.com/admin/api/matters/42/notes \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "notes": [
    {
      "id": 1,
      "matter_id": 42,
      "note_content": "Client called, very upset about timeline",
      "interaction_date": "2025-11-29T14:00:00.000Z",
      "interaction_type": "phone_call",
      "created_by_username": "admin",
      "created_at": "2025-11-29T14:30:00.000Z",
      "updated_at": "2025-11-29T14:30:00.000Z"
    }
  ]
}
```

---

#### POST /admin/api/matters/:matterId/notes

Add a private note.

```bash
curl -X POST https://your-domain.com/admin/api/matters/42/notes \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "note_content": "Opposing counsel requested extension",
    "interaction_date": "2025-11-28T14:00:00Z",
    "interaction_type": "email"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `note_content` | string | Yes | Note text (max 10,000 chars) |
| `interaction_date` | ISO8601 | No | When the interaction occurred |
| `interaction_type` | string | No | Type of interaction |

**Response `201 Created`:**
```json
{
  "success": true,
  "note": {
    "id": 2,
    "matter_id": 42,
    "note_content": "Opposing counsel requested extension",
    "interaction_date": "2025-11-28T14:00:00.000Z",
    "interaction_type": "email",
    "created_by_username": "admin",
    "created_at": "2025-11-29T15:00:00.000Z",
    "updated_at": "2025-11-29T15:00:00.000Z"
  }
}
```

---

#### PUT /admin/api/notes/:noteId

Update a note.

```bash
curl -X PUT https://your-domain.com/admin/api/notes/1 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"note_content": "Updated note text"}'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "note": {
    "id": 1,
    "matter_id": 42,
    "note_content": "Updated note text",
    "interaction_date": "2025-11-29T14:00:00.000Z",
    "interaction_type": "phone_call",
    "created_by_username": "admin",
    "created_at": "2025-11-29T14:30:00.000Z",
    "updated_at": "2025-11-29T16:00:00.000Z"
  }
}
```

---

#### DELETE /admin/api/notes/:noteId

Delete a note.

```bash
curl -X DELETE https://your-domain.com/admin/api/notes/1 \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "success": true
}
```

---

### Attachments

---

#### GET /admin/api/matters/:matterId/attachments

List attachments for a matter.

```bash
curl https://your-domain.com/admin/api/matters/42/attachments \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "attachments": [
    {
      "id": 1,
      "matter_id": 42,
      "original_filename": "contract.pdf",
      "content_type": "application/pdf",
      "size_bytes": 125000,
      "storage_backend": "filesystem",
      "storage_key": "abc123-contract.pdf",
      "document_date": "2025-11-25T00:00:00.000Z",
      "direction": "received",
      "created_by_username": "admin",
      "created_at": "2025-11-28T11:30:00.000Z"
    }
  ]
}
```

---

#### POST /admin/api/matters/:matterId/attachments

Upload an attachment.

```bash
curl -X POST https://your-domain.com/admin/api/matters/42/attachments \
  -b cookies.txt \
  -F "file=@/path/to/document.pdf" \
  -F "document_date=2025-11-28T00:00:00Z" \
  -F "direction=received"
```

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | The file (max 25MB) |
| `document_date` | ISO8601 | No | Document date |
| `direction` | string | No | `internal`, `received`, `sent` |

**Supported file types:** PDF, DOC, DOCX, RTF, TXT

**Response `200 OK`:**
```json
{
  "success": true,
  "attachment": {
    "id": 2,
    "original_filename": "document.pdf",
    "content_type": "application/pdf",
    "size_bytes": 85000,
    "document_date": "2025-11-28T00:00:00.000Z",
    "direction": "received"
  }
}
```

**Error `400 Bad Request`:**
```json
{
  "error": "INVALID_FILE_TYPE",
  "message": "File type not allowed. Supported: PDF, DOC, DOCX, RTF, TXT"
}
```

---

#### GET /admin/api/attachments/:attachmentId/download

Download an attachment.

```bash
curl https://your-domain.com/admin/api/attachments/1/download \
  -b cookies.txt -o document.pdf
```

**Response `200 OK`:** Binary file stream with headers:
- `Content-Type`: File's MIME type
- `Content-Length`: File size in bytes
- `Content-Disposition`: `attachment; filename="original_filename.pdf"`

---

#### PUT /admin/api/attachments/:attachmentId

Update attachment metadata.

```bash
curl -X PUT https://your-domain.com/admin/api/attachments/1 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "document_date": "2025-11-01T00:00:00Z",
    "direction": "sent"
  }'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "attachment": {
    "id": 1,
    "original_filename": "contract.pdf",
    "content_type": "application/pdf",
    "size_bytes": 125000,
    "document_date": "2025-11-01T00:00:00.000Z",
    "direction": "sent",
    "created_at": "2025-11-28T11:30:00.000Z"
  }
}
```

---

#### DELETE /admin/api/attachments/:attachmentId

Delete an attachment.

```bash
curl -X DELETE https://your-domain.com/admin/api/attachments/1 \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "success": true
}
```

---

### Settings

---

#### GET /admin/api/settings

Get all settings.

```bash
curl https://your-domain.com/admin/api/settings \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "settings": {
    "lifetime_spent": "12500000",
    "drain_start_time": "2025-11-28T10:30:00.000Z",
    "auto_drain_enabled": "true",
    "drain_rate_cents_per_second": "50",
    "last_matter_date": "2025-11-28T10:30:00.000Z",
    "api_key": "abc123...",
    "storage_backend": "filesystem",
    "s3_bucket": null,
    "s3_region": null,
    "s3_endpoint": null,
    "s3_path_style": "false",
    "storage_filesystem_path": "./data/uploads",
    "claude_model": "claude-sonnet-4-20250514",
    "ai_spice_level": "3",
    "ai_custom_prompt": null,
    "claude_key_validated": "true",
    "environment": "production"
  },
  "hasClaudeApiKey": true,
  "isClaudeKeyValidated": true,
  "aiSettings": {
    "selectedModel": "claude-sonnet-4-20250514",
    "spiceLevel": "3",
    "customPrompt": null
  }
}
```

---

#### PUT /admin/api/settings/:key

Update a single setting.

```bash
curl -X PUT https://your-domain.com/admin/api/settings/auto_drain_enabled \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"value": false}'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "key": "auto_drain_enabled",
  "value": false
}
```

---

#### POST /admin/api/settings/api-key/generate

Generate a new API key.

```bash
curl -X POST https://your-domain.com/admin/api/settings/api-key/generate \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "success": true,
  "api_key": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
}
```

---

### Storage Configuration

---

#### GET /admin/api/settings/storage

Get storage configuration.

```bash
curl https://your-domain.com/admin/api/settings/storage \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "storage_backend": "filesystem",
  "has_s3_config": false,
  "s3_bucket": null,
  "s3_region": null,
  "s3_endpoint": null,
  "s3_path_style": false,
  "filesystem_path": "./data/uploads"
}
```

---

#### PUT /admin/api/settings/storage

Update storage configuration.

```bash
curl -X PUT https://your-domain.com/admin/api/settings/storage \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "storage_backend": "s3",
    "s3_access_key_id": "AKIAIOSFODNN7EXAMPLE",
    "s3_secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "s3_bucket": "my-legal-attachments",
    "s3_region": "us-east-1"
  }'
```

**Response `200 OK`:**
```json
{
  "success": true
}
```

---

#### POST /admin/api/settings/storage/test

Test storage connection.

```bash
curl -X POST https://your-domain.com/admin/api/settings/storage/test \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "type": "s3",
    "config": {
      "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
      "secretAccessKey": "...",
      "bucket": "my-bucket",
      "region": "us-east-1"
    }
  }'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Successfully connected to S3 bucket"
}
```

---

### Claude AI Integration

---

#### POST /admin/api/settings/claude-api-key/validate-and-save

Validate and save a Claude API key.

```bash
curl -X POST https://your-domain.com/admin/api/settings/claude-api-key/validate-and-save \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"apiKey": "sk-ant-api03-..."}'
```

**Response `200 OK`:**
```json
{
  "valid": true,
  "message": "API key validated and saved",
  "models": [
    {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4"},
    {"id": "claude-opus-4-20250514", "name": "Claude Opus 4"},
    {"id": "claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku"}
  ]
}
```

**Response (invalid key):**
```json
{
  "valid": false,
  "message": "Invalid API key"
}
```

---

#### DELETE /admin/api/settings/claude-api-key

Clear the stored Claude API key.

```bash
curl -X DELETE https://your-domain.com/admin/api/settings/claude-api-key \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "success": true
}
```

---

#### GET /admin/api/claude/models

List available Claude models.

```bash
curl https://your-domain.com/admin/api/claude/models \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "models": [
    {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4"},
    {"id": "claude-opus-4-20250514", "name": "Claude Opus 4"},
    {"id": "claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku"}
  ]
}
```

**Error `400 Bad Request`:**
```json
{
  "error": "NO_API_KEY",
  "message": "Claude API key not configured"
}
```

---

#### PUT /admin/api/settings/ai

Update AI settings.

```bash
curl -X PUT https://your-domain.com/admin/api/settings/ai \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "spiceLevel": 5,
    "customPrompt": "Generate {count} legal matter descriptions involving space law disputes."
  }'
```

**Response `200 OK`:**
```json
{
  "success": true
}
```

---

#### POST /admin/api/claude/preview-descriptions

Generate preview matter descriptions.

```bash
curl -X POST https://your-domain.com/admin/api/claude/preview-descriptions \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "count": 5,
    "spiceLevel": 4
  }'
```

**Response `200 OK`:**
```json
{
  "descriptions": [
    "Dramatic dispute over who gets the vintage law books in the divorce",
    "Theatrical argument about the neighbor's \"decorative\" fence blocking sunlight",
    "Epic battle over a parking space that may or may not exist",
    "Heated negotiations regarding who is responsible for the office microwave incident",
    "Passionate defense of the right to wear socks with sandals at the company retreat"
  ]
}
```

---

### User Management

---

#### GET /admin/api/users

List all admin users.

```bash
curl https://your-domain.com/admin/api/users \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "is_active": true,
      "created_at": "2025-12-01T00:00:00.000Z",
      "last_login": "2026-01-09T10:30:00.000Z"
    }
  ]
}
```

---

#### POST /admin/api/users

Create a new admin user.

```bash
curl -X POST https://your-domain.com/admin/api/users \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "username": "newadmin",
    "password": "SecurePassword123!",
    "email": "newadmin@example.com"
  }'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "user": {
    "id": 2,
    "username": "newadmin",
    "email": "newadmin@example.com"
  }
}
```

**Error `409 Conflict`:**
```json
{
  "error": "CONFLICT",
  "message": "Username already exists"
}
```

---

#### PUT /admin/api/users/:id

Update a user.

```bash
curl -X PUT https://your-domain.com/admin/api/users/2 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "newemail@example.com",
    "is_active": false
  }'
```

**Response `200 OK`:**
```json
{
  "success": true
}
```

---

#### DELETE /admin/api/users/:id

Delete a user.

```bash
curl -X DELETE https://your-domain.com/admin/api/users/2 \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "success": true
}
```

**Error `400 Bad Request`:**
```json
{
  "error": "BAD_REQUEST",
  "message": "Cannot deactivate your own account"
}
```

---

### Session Management

---

#### GET /admin/api/sessions

List all active sessions.

```bash
curl https://your-domain.com/admin/api/sessions \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "sessions": [
    {
      "id": 1,
      "user_id": 1,
      "token_jti": "abc123...",
      "created_at": "2026-01-09T10:30:00.000Z",
      "expires_at": "2026-01-16T10:30:00.000Z",
      "client_ip": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "is_valid": true
    }
  ]
}
```

---

#### DELETE /admin/api/sessions/:id

Invalidate a session.

```bash
curl -X DELETE https://your-domain.com/admin/api/sessions/1 \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "success": true
}
```

---

### External API Keys

Manage API keys for programmatic access to the admin API.

---

#### GET /admin/api/api-keys

List all API keys.

```bash
curl https://your-domain.com/admin/api/api-keys \
  -H "X-API-Key: lt_live_your_key_here"
```

**Response `200 OK`:**
```json
{
  "keys": [
    {
      "id": 1,
      "user_id": 1,
      "name": "CI Pipeline",
      "key_prefix": "lt_live_a1b2c3d4",
      "created_at": "2025-01-15T10:00:00.000Z",
      "last_used_at": "2025-01-15T12:30:00.000Z",
      "expires_at": null,
      "revoked_at": null,
      "created_by_username": "admin"
    }
  ]
}
```

Note: Full key and key hash are never returned in list operations.

---

#### POST /admin/api/api-keys

Create a new API key.

```bash
curl -X POST https://your-domain.com/admin/api/api-keys \
  -H "Content-Type: application/json" \
  -H "X-API-Key: lt_live_your_key_here" \
  -d '{
    "name": "My Integration",
    "expires_in_days": 90
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Key name (1-100 chars) |
| `expires_in_days` | number | No | Days until expiration (null = never) |

**Response `201 Created`:**
```json
{
  "success": true,
  "key": {
    "id": 2,
    "name": "My Integration",
    "key": "lt_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "key_prefix": "lt_live_a1b2c3d4",
    "created_at": "2025-01-15T14:00:00.000Z",
    "expires_at": "2025-04-15T14:00:00.000Z"
  }
}
```

**Important:** The full `key` value is only returned on creation. Copy it immediately.

---

#### DELETE /admin/api/api-keys/:id

Revoke an API key.

```bash
curl -X DELETE https://your-domain.com/admin/api/api-keys/2 \
  -H "X-API-Key: lt_live_your_key_here"
```

**Response `200 OK`:**
```json
{
  "success": true
}
```

**Error `400 Bad Request`:**
```json
{
  "error": "ALREADY_REVOKED",
  "message": "API key is already revoked"
}
```

---

### Data Management

---

#### GET /admin/api/data/samples

List available sample data files.

```bash
curl https://your-domain.com/admin/api/data/samples \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "success": true,
  "samples": [
    {
      "id": "small",
      "name": "Small",
      "description": "25 sample matters",
      "matter_count": 25,
      "file_size": 4521,
      "filename": "small.json"
    },
    {
      "id": "medium",
      "name": "Medium",
      "description": "100 sample matters",
      "matter_count": 100,
      "file_size": 18234,
      "filename": "medium.json"
    },
    {
      "id": "large",
      "name": "Large",
      "description": "500 sample matters",
      "matter_count": 500,
      "file_size": 91567,
      "filename": "large.json"
    },
    {
      "id": "extra-large",
      "name": "Extra Large",
      "description": "1000 sample matters",
      "matter_count": 1000,
      "file_size": 183412,
      "filename": "extra-large.json"
    }
  ]
}
```

---

#### POST /admin/api/data/populate-sample

Generate sample data.

```bash
# From preset file
curl -X POST https://your-domain.com/admin/api/data/populate-sample \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"source": "medium"}'

# Generate custom with AI
curl -X POST https://your-domain.com/admin/api/data/populate-sample \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "count": 50,
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z",
    "minCostDollars": 500,
    "maxCostDollars": 10000,
    "wholeDollarsOnly": true,
    "useAiDescriptions": true,
    "spiceLevelOverride": 4,
    "generatePrivateNotes": true,
    "notesPercentage": 50,
    "minNotesPerMatter": 1,
    "maxNotesPerMatter": 3,
    "generateAttachments": true,
    "attachmentsPercentage": 25
  }'
```

**Request Body:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `source` | string | — | Sample file ID (`small`, `medium`, `large`, `extra-large`) |
| `count` | number | 25 | Number of matters (1-1000) |
| `startDate` | ISO8601 | — | Earliest matter date |
| `endDate` | ISO8601 | — | Latest matter date |
| `minCostDollars` | number | — | Minimum cost |
| `maxCostDollars` | number | — | Maximum cost |
| `wholeDollarsOnly` | boolean | true | Round costs to whole dollars |
| `useAiDescriptions` | boolean | false | Use Claude for descriptions |
| `spiceLevelOverride` | number | — | Override AI spice level (1-8) |
| `generatePrivateNotes` | boolean | false | Generate private notes |
| `notesPercentage` | number | 30 | % of matters with notes |
| `minNotesPerMatter` | number | 1 | Min notes per matter |
| `maxNotesPerMatter` | number | 3 | Max notes per matter |
| `generateAttachments` | boolean | false | Generate AI PDF attachments |
| `attachmentsPercentage` | number | 25 | % of matters with attachments |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Generated 50 sample matters",
  "created": 50,
  "notes_generated": 75,
  "attachments_generated": 12,
  "used_ai": true
}
```

---

#### POST /admin/api/data/regenerate-samples

Regenerate the sample data files.

```bash
curl -X POST https://your-domain.com/admin/api/data/regenerate-samples \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Sample files regenerated successfully",
  "files_regenerated": 4
}
```

---

#### POST /admin/api/data/wipe-matters

Delete all matters (preserves users and settings).

```bash
curl -X POST https://your-domain.com/admin/api/data/wipe-matters \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"confirmation": "WIPE MATTERS"}'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "All matters have been deleted",
  "matters_deleted": 150
}
```

**Error `400 Bad Request`:**
```json
{
  "error": "BAD_REQUEST",
  "message": "Confirmation string does not match. Type 'WIPE MATTERS' to confirm."
}
```

---

#### POST /admin/api/data/wipe-matters-and-settings

Delete matters and reset settings to defaults.

```bash
curl -X POST https://your-domain.com/admin/api/data/wipe-matters-and-settings \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"confirmation": "WIPE SETTINGS"}'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "All matters deleted and settings reset to defaults",
  "matters_deleted": 150
}
```

**Error `403 Forbidden`:**
```json
{
  "error": "FORBIDDEN",
  "message": "This operation is disabled in production. Set ENABLE_WIPE_MATTERS_AND_SETTINGS=true to enable."
}
```

---

#### POST /admin/api/data/wipe

Factory reset — deletes everything.

```bash
curl -X POST https://your-domain.com/admin/api/data/wipe \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"confirmation": "WIPE EVERYTHING"}'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "All data has been wiped successfully. Database reset to fresh install state.",
  "matters_deleted": 150,
  "admins_deleted": 2,
  "sessions_invalidated": 5,
  "settings_reset": true,
  "bootstrap_token": "a1b2c3d4e5f6...",
  "bootstrap_url": "/admin/bootstrap.html"
}
```

**Error `403 Forbidden`:**
```json
{
  "error": "FORBIDDEN",
  "message": "Database reset is disabled in production. Set ENABLE_DB_RESET=true to enable."
}
```

---

### Analytics

---

#### GET /admin/api/dashboard

Get dashboard summary.

```bash
curl https://your-domain.com/admin/api/dashboard \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "days_since": 42,
  "last_matter_date": "2025-11-28T10:30:00.000Z",
  "lifetime_spent": 125000.50,
  "drain_enabled": true,
  "drain_rate_cents_per_second": 50,
  "stats": {
    "total_matters": 150,
    "matters_this_year": 23,
    "max_streak": 89
  },
  "recent_matters": [
    {
      "id": 150,
      "matter_date": "2025-11-28T10:30:00.000Z",
      "note": "Contract review",
      "days_since": 42,
      "cost": 2500.00,
      "created_at": "2025-11-28T10:30:00.000Z"
    }
  ]
}
```

---

#### GET /admin/api/analytics

Get analytics data for charts.

```bash
curl https://your-domain.com/admin/api/analytics \
  -b cookies.txt
```

**Response `200 OK`:**
```json
{
  "total": 150,
  "this_year": 23,
  "max_streak": 89,
  "by_month": {
    "2025-01": 3,
    "2025-02": 2,
    "2025-03": 4,
    "2025-11": 2
  },
  "by_year": {
    "2023": 45,
    "2024": 82,
    "2025": 23
  },
  "matters": [...]
}
```

---

## Development

```bash
cd backend

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

**CI/CD:** GitHub Actions runs the test suite on Node.js 20.x and 22.x for all pushes and pull requests.

---

## Backup & Restore

### Database

The SQLite database lives at `backend/data/tracker.db`:

```bash
# Manual backup
cp backend/data/tracker.db ~/backups/tracker-$(date +%Y%m%d).db

# Automated daily backup (crontab)
0 2 * * * cp /path/to/legal-tracker/backend/data/tracker.db /path/to/backups/tracker-$(date +\%Y\%m\%d).db
```

### Attachments

- **Filesystem storage:** Back up `backend/data/uploads/`
- **S3 storage:** Use your provider's backup/versioning features

---

## Troubleshooting

<details>
<summary><strong>"ACCESS DENIED" on public API</strong></summary>

- Verify your IP is in `ALLOWED_IPS` in `.env`
- Your IP may have changed — check at [whatismyipaddress.com](https://whatismyipaddress.com)
- If behind a proxy, ensure `X-Forwarded-For` headers are passed through

</details>

<details>
<summary><strong>Database locked</strong></summary>

- Ensure only one server instance is running
- Check file permissions on `backend/data/`

</details>

<details>
<summary><strong>Uploads failing</strong></summary>

- Check `backend/data/uploads/` exists and is writable
- For S3: verify credentials and run "Test Connection" in admin
- Check Nginx `client_max_body_size` if behind a proxy

</details>

<details>
<summary><strong>AI features not working</strong></summary>

- Verify API key is entered and validated in Admin → Security
- Check server logs for Claude API errors
- Ensure your Anthropic account has available credits

</details>

<details>
<summary><strong>Bootstrap token issues</strong></summary>

- Tokens expire after 60 minutes
- Tokens are single-use
- Check server console for the current token
- If stuck, delete `backend/data/tracker.db` and restart

</details>

---

## License

MIT — Do whatever you want with it. Maybe use the savings on something other than lawyers.

---

<div align="center">

**LEGAL MATTER** — Because every billable hour deserves to be tracked, mourned, and displayed on a CRT monitor.

[Report Bug](https://github.com/patrick-hudson/legal-tracker/issues) · [Request Feature](https://github.com/patrick-hudson/legal-tracker/issues)

</div>
