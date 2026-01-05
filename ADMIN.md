# Legal Tracker - Admin Portal Documentation

## Overview

The Legal Tracker Admin Portal is a secure, feature-rich web interface for managing legal matters, viewing analytics, and configuring system settings. Built with Flowbite Admin Dashboard template and Tailwind CSS, it provides a modern, responsive UI with comprehensive admin functionality.

## Table of Contents

- [Getting Started](#getting-started)
- [Features](#features)
- [Security](#security)
- [Usage Guide](#usage-guide)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- Node.js v18 or higher
- All dependencies installed (`npm install` in the `backend` directory)

### Creating the First Admin User

Before you can access the admin portal, you need to create at least one admin user.

**Using the CLI tool:**

```bash
cd backend
node create-admin-simple.js <username> <password> [email]
```

**Example:**

```bash
node create-admin-simple.js admin SecureP@ssw0rd admin@example.com
```

**Using the interactive CLI:**

```bash
cd backend
node create-admin.js
```

This will prompt you for:
- Username (minimum 3 characters)
- Email (optional)
- Password (minimum 8 characters)
- Password confirmation

### Starting the Server

```bash
cd backend
npm start
```

The server will start on port 3000 by default.

### Accessing the Admin Portal

Open your browser and navigate to:

```
http://localhost:3000/admin
```

Log in with the credentials you created.

## Features

### 1. Dashboard

The dashboard provides an at-a-glance view of your legal matter tracking:

- **Days Since Last Matter**: Shows how many days since the last recorded matter
- **Total Matters**: Lifetime count of all matters
- **Lifetime Spent**: Total amount spent on legal fees
- **Current Streak**: Days since the last matter

**Visualizations:**
- Matters over time (line chart)
- Cumulative spending (line chart)
- Recent matters table

### 2. Matters Management

Comprehensive matter management with:

**Viewing:**
- Sortable data table with pagination (50 items per page)
- Search/filter functionality
- Real-time updates

**Adding Matters:**
- **Single Add**: Quick modal form for adding one matter
- **Multi-row Add**: Form with dynamic rows to add multiple matters at once
  - Click "+ Add Row" to add more fields
  - Fill in Date & Time, Note, and Cost for each
  - Save all matters in one operation

**Bulk Operations:**
- Select multiple matters with checkboxes
- Bulk delete selected matters
- Export all matters to CSV

**CSV Export:**
- Format: `matter_date,note,cost`
- Downloaded as `matters-YYYY-MM-DD.csv`

### 3. Analytics

Data visualization and insights:

- Matters timeline (bar chart by year)
- Monthly spending trends (bar chart)
- Matter frequency analysis (line chart)
- Summary statistics:
  - Average cost per matter
  - Average days between matters
  - Longest streak
  - Most expensive matter

### 4. Settings

Comprehensive system configuration:

**Drain Settings:**
- Enable/disable auto-drain feature
- Configure drain rate (cents per second)
- Visual preview showing daily accumulation

**Display Settings:**
- Override last matter date
- Manually set lifetime spent amount

**API Key Management:**
- View current API key (show/hide)
- Copy API key to clipboard
- Regenerate API key with confirmation
- Integrated into admin panel (no separate system)

**Authentication:**
- Require authentication toggle
- IP whitelist configuration (comma-separated IPs)
- Change password

**System Information:**
- Database type and version
- Environment details

### 5. User Management

*(Coming soon - already supported in backend)*
- Create additional admin users
- Deactivate users
- View login history
- Manage active sessions

## Security

### Authentication

The admin portal uses industry-standard JWT (JSON Web Tokens) with HTTP-only cookies:

- **Password Hashing**: bcrypt with 12 rounds (OWASP recommended)
- **Session Management**: JWT tokens with 7-day expiration (configurable)
- **HTTP-only Cookies**: Prevents XSS attacks
- **SameSite Cookies**: CSRF protection

### HTTPS Requirements

**Development (localhost):**
- HTTP works fine for local development
- Cookies are set without the Secure flag

**Production:**
- **HTTPS is REQUIRED** for secure cookies
- Use a reverse proxy (nginx, Caddy) or hosting provider HTTPS
- Cookies are set with Secure flag (`COOKIE_SECURE=true`)

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# JWT Secret (generate a strong random string)
JWT_SECRET=your-very-secure-random-secret-here

# JWT Expiration (default: 7 days)
JWT_EXPIRY=7d

# Environment
NODE_ENV=production  # Set to 'production' in prod

# Cookie Security (set to 'true' in production with HTTPS)
COOKIE_SECURE=false

# CORS Origin (optional)
CORS_ORIGIN=https://yourdomain.com
```

### Security Best Practices

1. **Strong Passwords**: Enforce minimum 8 characters, use special characters
2. **Unique JWT Secret**: Generate with `openssl rand -base64 32`
3. **HTTPS Only**: Never run production without HTTPS
4. **Regular Updates**: Keep dependencies updated
5. **IP Whitelisting**: Restrict admin access to known IPs (optional)
6. **Session Management**: Regularly review and invalidate old sessions
7. **API Keys**: Rotate API keys periodically
8. **Backup Database**: Regular backups of `backend/data/tracker.db`

## Usage Guide

### Adding a Single Matter

1. Click "Add Single" button
2. Fill in:
   - Date & Time (datetime picker)
   - Note (description of the matter)
   - Cost (in dollars, e.g., 1234.56)
3. Click "Save"

### Adding Multiple Matters

1. Click "Add Multiple" button
2. Fill in the first row (Date, Note, Cost)
3. Click "+ Add Row" to add more rows
4. Fill in all rows
5. Click "Save All"

**Note**: Only rows with all fields filled will be saved. Invalid rows are skipped.

### Bulk Deleting Matters

1. Select matters using checkboxes
2. Blue banner appears showing selection count
3. Click "Delete Selected"
4. Confirm deletion

### Exporting to CSV

1. Click "Export CSV" button
2. File downloads automatically as `matters-YYYY-MM-DD.csv`
3. Open in Excel, Google Sheets, or any spreadsheet software

### Managing Settings

1. Navigate to Settings page
2. Modify any setting in its respective card
3. Click the "Save" button for that section
4. Success message confirms the update

### Generating a New API Key

1. Go to Settings → API Key Management
2. Click "Show" to view current key (optional)
3. Click "Regenerate"
4. Confirm the action
5. New key is displayed - copy it immediately
6. **Important**: Old key stops working immediately

### Changing Your Password

1. Go to Settings → Change Password
2. Enter current password
3. Enter new password (min 8 characters)
4. Confirm new password
5. Click "Change Password"

## API Reference

### Authentication Endpoints

**Login**
```http
POST /admin/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}

Response: Sets HTTP-only cookie + returns user object
```

**Logout**
```http
POST /admin/api/auth/logout

Response: Clears cookie and invalidates session
```

**Get Current User**
```http
GET /admin/api/auth/me

Response: { "user": { "id", "username", "email" } }
```

### Matters Endpoints

All endpoints require authentication (admin cookie).

**Get Matters (with pagination)**
```http
GET /admin/api/matters?page=1&limit=50&search=&sortBy=matter_date&sortOrder=DESC
```

**Bulk Create**
```http
POST /admin/api/matters/bulk
Content-Type: application/json

{
  "matters": [
    {
      "matter_date": "2024-12-15T10:30:00",
      "note": "Contract review",
      "cost": 120000  // in cents
    }
  ]
}
```

**Bulk Delete**
```http
DELETE /admin/api/matters/bulk
Content-Type: application/json

{
  "ids": [1, 2, 3]
}
```

**Export CSV**
```http
GET /admin/api/matters/export?format=csv

Response: CSV file download
```

### Settings Endpoints

**Get All Settings**
```http
GET /admin/api/settings

Response: { "settings": { ... } }
```

**Update Setting**
```http
PUT /admin/api/settings/:key
Content-Type: application/json

{
  "value": "new-value"
}
```

**Generate API Key**
```http
POST /admin/api/settings/api-key/generate

Response: { "success": true, "api_key": "..." }
```

### Claude AI Endpoints

**Validate and Save Claude API Key**
```http
POST /admin/api/settings/claude-api-key/validate-and-save
Content-Type: application/json

{
  "apiKey": "sk-ant-api03-..."
}

Response (success): { "valid": true, "models": [...] }
Response (invalid): { "valid": false, "message": "Invalid API key" }
```

**Clear Claude API Key**
```http
DELETE /admin/api/settings/claude-api-key

Response: { "success": true }
```

**List Available Claude Models**
```http
GET /admin/api/claude/models

Response: { "models": [{ "id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4" }, ...] }
```

**Save AI Settings**
```http
PUT /admin/api/settings/ai
Content-Type: application/json

{
  "model": "claude-sonnet-4-20250514",
  "spiceLevel": "3",
  "customPrompt": ""  // Optional, empty uses default
}

Response: { "success": true }
```

**Preview AI Descriptions**
```http
POST /admin/api/claude/preview-descriptions
Content-Type: application/json

{
  "count": 5,
  "spiceLevel": "3",       // Optional
  "customPrompt": ""       // Optional
}

Response: { "descriptions": ["...", "...", ...] }
```

### Data Management Endpoints

**Populate Sample Data**
```http
POST /admin/api/data/populate-sample
Content-Type: application/json

{
  "source": "generate",           // or predefined dataset ID
  "count": 25,                    // Number of matters
  "startDate": "2025-01-01",      // Optional
  "endDate": "2026-01-05",        // Optional
  "minCostDollars": 100,          // Optional
  "maxCostDollars": 50000,        // Optional
  "wholeDollarsOnly": true,       // Optional
  "useAiDescriptions": false,     // Optional, requires Claude setup
  "spiceLevelOverride": "3"       // Optional, override saved spice level
}

Response: {
  "success": true,
  "matters_added": 25,
  "total_cost_added": 125000.00,
  "used_ai_descriptions": false
}
```

**List Sample Datasets**
```http
GET /admin/api/data/samples

Response: { "samples": [{ "id": "...", "name": "...", "matter_count": 100 }, ...] }
```

**Wipe Operations**
```http
POST /admin/api/data/wipe-matters
Content-Type: application/json
{ "confirmation": "WIPE MATTERS" }

POST /admin/api/data/wipe-matters-settings
Content-Type: application/json
{ "confirmation": "WIPE SETTINGS" }

POST /admin/api/data/wipe-all
Content-Type: application/json
{ "confirmation": "WIPE EVERYTHING" }
```

### 6. Data Management

The Data Management page provides tools for managing sample data, AI-powered descriptions, and database maintenance.

#### Claude AI Integration

Integrate with Claude API to generate unique, AI-powered matter descriptions for sample data. The AI configuration section is collapsible - click the header to expand/collapse.

**Setup:**

1. Navigate to Data Management page
2. In the "Claude AI Integration" section:
   - Enter your Claude API key (starts with `sk-ant-`)
   - Click "Validate & Save" - the key is validated against Claude's API before saving
   - Once validated, the model dropdown becomes available
   - Select your preferred model (auto-saves on change)

**API Key Management:**
- **Validate & Save**: API key is tested against Claude API before storing
- **Show/Hide**: Toggle visibility of the API key (only available before validation)
- **Clear**: Remove the stored API key (requires confirmation)

**Model Selection:**
- Available after API key validation
- Lists all available Claude models from your account
- **Auto-saves**: Selection is immediately saved when changed (displays toast notification)
- Persists across sessions

**Getting an API Key:**
- Sign up at [console.anthropic.com](https://console.anthropic.com/)
- Create an API key in the API Keys section
- Copy the key (starts with `sk-ant-api03-...`)

#### Description Prompt Configuration

Customize how AI generates matter descriptions with spice levels and custom prompts.

**Spice Levels:**

Select the tone using the button group:

| Level | Name | Description |
|-------|------|-------------|
| 1 | Professional | Straightforward, formal corporate tone |
| 2 | Dry Humor | Subtle, understated wit |
| 3 | Witty | Mild sarcasm and clever wordplay |
| 4 | Dramatic | Theatrical, slightly absurd descriptions |
| 5 | Unhinged | Wildly creative, maximally entertaining |
| 6 | Chaotic Evil | Maximum depravity with mandatory puns and sarcasm |
| 7 | Eldritch Horror | Cosmic legal nightmare fuel (may cause existential dread)

Changing the spice level updates the default prompt preview in real-time.

**Custom Prompt:**
- Check "Override with custom prompt" to write your own template
- Use `{count}` placeholder where you want the number of descriptions inserted
  - Example: "Generate {count} legal matter descriptions" → "Generate 25 legal matter descriptions"
- The default prompt is shown read-only when custom prompt is disabled
- Click "Save Prompt" to persist custom prompt changes

**Preview:**
- Click "Preview (5 samples)" to generate sample descriptions
- Requires a validated API key and selected model
- Shows 5 example descriptions using current settings
- Use this to test your prompt and spice level before generating data

**Settings Persistence:**
- Model selection: Auto-saved immediately on change
- Spice level and custom prompt: Saved when clicking "Save Prompt"
- All AI settings are cleared by "Wipe + Reset" and "Factory Reset" operations

#### Sample Data Generation

Generate test data for development and demo purposes.

**Dataset Options:**
- **Generate New**: Create randomized matters with configurable options
- **Predefined Datasets**: Load pre-built sample datasets

**Generation Options (Advanced Modal):**

| Option | Description | Default |
|--------|-------------|---------|
| Count | Number of matters to generate | 25 |
| Start Date | Earliest matter date | 1 year ago |
| End Date | Latest matter date | Today |
| Min Cost | Minimum cost per matter | $100 |
| Max Cost | Maximum cost per matter | $50,000 |
| Whole Dollars | Generate round dollar amounts | Yes |
| Use AI | Use Claude for descriptions | No (requires setup) |

**Quick Generate:**
- Click "Generate Now" for fast generation with defaults
- Uses the count from the main form

#### Database Wipe Operations

⚠️ **Warning**: These operations cannot be undone!

**Wipe Matters (Orange):**
- Deletes all matter records
- Preserves all settings and admin accounts
- Type `WIPE MATTERS` to enable

**Wipe + Reset (Amber):**
- Deletes all matters
- Resets lifetime fees to $0
- Disables auto-drain, resets drain timer
- Clears API key, auth settings, IP whitelist
- Clears Claude API key and AI settings
- Preserves admin accounts
- Type `WIPE SETTINGS` to enable

**Factory Reset (Red):**
- Complete database reset to fresh install state
- Deletes everything: matters, settings, admin users, sessions
- Clears API key, auth settings, IP whitelist
- Clears Claude API key and AI settings
- Redirects to create new admin account
- Type `WIPE EVERYTHING` to enable

## Troubleshooting

### Can't Log In

**Problem**: "Invalid credentials" error

**Solutions**:
1. Verify username/password are correct
2. Check that admin user exists:
   ```bash
   node check-users.js
   ```
3. Recreate admin user if needed:
   ```bash
   node create-admin-simple.js admin newpassword
   ```

**Problem**: Cookie not being set

**Solutions**:
1. Ensure CORS credentials are enabled
2. Check browser console for cookie errors
3. In production, verify HTTPS is enabled

### Can't Access Admin Routes

**Problem**: 401 Unauthorized on admin endpoints

**Solutions**:
1. Clear browser cookies and log in again
2. Check JWT_SECRET hasn't changed
3. Session may have expired (7 days default)

### Database Issues

**Problem**: Admin users not persisting

**Solutions**:
1. Check that `backend/data/tracker.db` exists
2. Verify file permissions
3. Ensure database isn't being created as `:memory:`

**Problem**: Database is locked

**Solutions**:
1. Close any other connections to the database
2. Restart the server
3. Check file permissions on `backend/data/`

### CSV Export Not Working

**Problem**: Export button doesn't download file

**Solutions**:
1. Check browser console for errors
2. Verify authentication cookie is valid
3. Check server logs for errors

### Charts Not Rendering

**Problem**: Charts show blank or loading spinner

**Solutions**:
1. Check browser console for Chart.js errors
2. Verify CDN connection (check network tab)
3. Hard refresh the page (Ctrl+Shift+R / Cmd+Shift+R)

### Performance Issues

**Problem**: Admin panel is slow

**Solutions**:
1. Reduce page size in matters table (change limit)
2. Use search/filtering to narrow results
3. Check server resources (CPU, memory)
4. Consider implementing database indexing for large datasets

## Database Backup

To backup your data:

```bash
# Copy the database file
cp backend/data/tracker.db backend/data/tracker-backup-$(date +%Y%m%d).db
```

To restore from backup:

```bash
# Stop the server first
cp backend/data/tracker-backup-YYYYMMDD.db backend/data/tracker.db
# Restart the server
```

## Upgrading

When updating the Legal Tracker:

1. Stop the server
2. Backup the database
3. Pull/update code
4. Run `npm install` in backend directory
5. Restart the server
6. Test login and functionality

## Support

For issues, questions, or feature requests:
- Check this documentation first
- Review server logs in `backend/`
- Check browser console for client-side errors

## Changelog

### Version 1.0.0 (2025-12-15)

Initial release with:
- JWT authentication with HTTP-only cookies
- Dashboard with stats and charts
- Full matters CRUD management
- Multi-row matter input
- Bulk operations (delete, export CSV)
- Comprehensive settings management
- API key management (integrated)
- Analytics and visualizations
- Flowbite Admin Dashboard UI
- Mobile-responsive design
