# Database Implementation

This project uses **sql.js**, a pure JavaScript implementation of SQLite compiled to WebAssembly.

## Why sql.js?

We switched from `better-sqlite3` to `sql.js` for these reasons:

1. **No native compilation** - Works on any Node.js version (including v25+)
2. **Cross-platform** - No build tools or Python required
3. **Pure JavaScript** - Easier to deploy and maintain
4. **WebAssembly** - Still fast despite being JavaScript-based

## Trade-offs

### Pros
- ✅ Works on any Node.js version
- ✅ No compilation issues
- ✅ Easy to install (`npm install` just works)
- ✅ Same SQLite syntax and features
- ✅ Great for development and testing

### Cons
- ⚠️ Slightly slower than native better-sqlite3
- ⚠️ Manual persistence (must call save after writes)
- ⚠️ Not ideal for very high-traffic production use

## How It Works

### File-based Database

When using a file path, the database is loaded into memory and saved after each write operation:

```javascript
const { settingsDb, incidentsDb } = await createDatabase('./data/tracker.db');

settingsDb.set('key', 'value');  // Automatically saves to disk
```

### In-memory Database

For testing, use `:memory:` which never touches the disk:

```javascript
const { settingsDb, incidentsDb } = await createDatabase(':memory:');
```

## API

### createDatabase(dbPath)

Creates or loads a database instance.

**Parameters:**
- `dbPath` (string, optional) - Path to database file, or `:memory:` for in-memory
  - Default: `backend/data/tracker.db`

**Returns:** Promise that resolves to:
```javascript
{
  db,           // Raw sql.js Database instance
  settingsDb,   // Settings helper object
  incidentsDb,  // Incidents helper object
  saveDatabase  // Manual save function
}
```

**Example:**
```javascript
import { createDatabase } from './db.js';

// File-based
const { settingsDb, incidentsDb } = await createDatabase('./my-data.db');

// In-memory
const { settingsDb, incidentsDb } = await createDatabase(':memory:');
```

## Persistence

The database automatically saves to disk after every write operation:
- `settingsDb.set()`
- `incidentsDb.add()`
- `incidentsDb.update()`
- `incidentsDb.delete()`

You can also manually save:
```javascript
const { saveDatabase } = await createDatabase('./data.db');
saveDatabase();  // Flush to disk
```

## Performance Considerations

For this application (low-traffic personal tracker), sql.js performance is perfectly fine.

If you need better performance for production:

1. **Use better-sqlite3** (requires Node.js 20 or earlier)
   ```bash
   nvm use 20
   npm install better-sqlite3
   # Update db.js to use better-sqlite3 syntax
   ```

2. **Use PostgreSQL/MySQL** for high-traffic scenarios
   - Requires more infrastructure
   - Much more complex setup

## Database Schema

### settings table
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### incidents table
```sql
CREATE TABLE incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_date DATETIME NOT NULL,
  note TEXT,
  days_since INTEGER,
  cost REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Backup

The database is a single file at `backend/data/tracker.db`. To backup:

```bash
# Simple copy
cp backend/data/tracker.db ~/backups/tracker-$(date +%Y%m%d).db

# Automated with cron
0 2 * * * cp /path/to/backend/data/tracker.db /backups/tracker-$(date +\%Y\%m\%d).db
```

## Migrations

Currently, the schema is created automatically on first run. For future schema changes:

1. Create migration files in `backend/migrations/`
2. Track applied migrations in a `migrations` table
3. Apply pending migrations on startup

Example migration system:
```javascript
// migrations/001_add_user_table.js
export function up(db) {
  db.run(`CREATE TABLE users (...)`);
}

export function down(db) {
  db.run(`DROP TABLE users`);
}
```

## Troubleshooting

### "Cannot find module 'sql.js'"
```bash
cd backend
npm install
```

### Database file not persisting
- Check that `backend/data/` directory exists
- Check file permissions
- Verify you're not using `:memory:` in production

### Performance issues
- Consider switching to better-sqlite3 (Node.js 20)
- Or use a proper database server (PostgreSQL, MySQL)

### Database locked errors
With sql.js, this shouldn't happen since it's single-threaded. If you see this:
- Make sure you're not running multiple server instances
- Check that file writes are completing before new operations
