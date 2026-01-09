import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let SQL = null;

/**
 * Initialize sql.js (lazy load)
 */
async function initSQL() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

/**
 * Create a database instance with all the necessary setup
 * @param {string} dbPath - Path to database file (use ':memory:' for in-memory database)
 * @returns {Promise<Object>} Database instance and helper objects
 */
export async function createDatabase(dbPath = join(__dirname, 'data', 'tracker.db')) {
  await initSQL();

  let db;

  // Load existing database or create new one
  if (dbPath === ':memory:') {
    db = new SQL.Database();
  } else {
    // Ensure data directory exists
    const dataDir = dirname(dbPath);
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    // Load existing database or create new
    if (existsSync(dbPath)) {
      const buffer = readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  }

  // Initialize tables
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS matters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matter_date DATETIME NOT NULL,
      note TEXT,
      days_since INTEGER,
      cost REAL DEFAULT 0,
      lawyer_name TEXT,
      lawyer_firm TEXT,
      opposing_counsel_name TEXT,
      opposing_counsel_firm TEXT,
      case_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_jti TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES admin_users(id)
    );

    CREATE TABLE IF NOT EXISTS admin_bootstrap_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      ip_address TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS private_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matter_id INTEGER NOT NULL,
      note_content TEXT NOT NULL,
      interaction_date DATETIME,
      interaction_type TEXT DEFAULT 'note',
      created_by_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES admin_users(id)
    );

    CREATE TABLE IF NOT EXISTS matter_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matter_id INTEGER NOT NULL,
      original_filename TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      storage_backend TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      document_date DATETIME,
      direction TEXT DEFAULT 'internal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by_user_id INTEGER,
      FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES admin_users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      level TEXT NOT NULL,
      user_id INTEGER,
      username TEXT,
      action_type TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      summary TEXT NOT NULL,
      request TEXT,
      response TEXT,
      details TEXT,
      ip_address TEXT,
      duration_ms INTEGER,
      stack_trace TEXT,
      FOREIGN KEY (user_id) REFERENCES admin_users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_level ON audit_log(level);
    CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);

    -- Initialize default settings if they don't exist
    INSERT OR IGNORE INTO settings (key, value) VALUES ('lifetime_spent', '0');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('last_matter_date', datetime('now'));
  `);

  // Initialize drain_start_time with current JavaScript Date if not exists
  const drainStartExists = db.exec('SELECT value FROM settings WHERE key = ?', ['drain_start_time']);
  if (!drainStartExists.length || !drainStartExists[0].values.length) {
    db.run(`
      INSERT INTO settings (key, value) VALUES ('drain_start_time', ?)
    `, [new Date().toISOString()]);
  }

  // Initialize drain configuration settings with explicit unit (cents per second)
  const drainRateExists = db.exec('SELECT value FROM settings WHERE key = ?', ['drain_rate_cents_per_second']);
  if (!drainRateExists.length || !drainRateExists[0].values.length) {
    db.run(`INSERT INTO settings (key, value) VALUES ('drain_rate_cents_per_second', '0')`); // Default: 0 (disabled)
  }

  const drainEnabledExists = db.exec('SELECT value FROM settings WHERE key = ?', ['auto_drain_enabled']);
  if (!drainEnabledExists.length || !drainEnabledExists[0].values.length) {
    db.run(`INSERT INTO settings (key, value) VALUES ('auto_drain_enabled', 'false')`); // Default: disabled
  }

  // Initialize audit logging settings
  const auditLogLevelExists = db.exec('SELECT value FROM settings WHERE key = ?', ['audit_log_level']);
  if (!auditLogLevelExists.length || !auditLogLevelExists[0].values.length) {
    db.run(`INSERT INTO settings (key, value) VALUES ('audit_log_level', 'INFO')`); // Default: INFO level
  }

  const logApiRequestsExists = db.exec('SELECT value FROM settings WHERE key = ?', ['log_api_requests']);
  if (!logApiRequestsExists.length || !logApiRequestsExists[0].values.length) {
    db.run(`INSERT INTO settings (key, value) VALUES ('log_api_requests', 'false')`); // Default: disabled
  }

  const auditLogPageSizeExists = db.exec('SELECT value FROM settings WHERE key = ?', ['audit_log_page_size']);
  if (!auditLogPageSizeExists.length || !auditLogPageSizeExists[0].values.length) {
    db.run(`INSERT INTO settings (key, value) VALUES ('audit_log_page_size', '25')`); // Default: 25 entries per page
  }

  // Migrations for existing databases
  // Add new matter fields if they don't exist
  const matterColumns = db.exec("PRAGMA table_info(matters)");
  const matterColumnNames = matterColumns.length > 0 ? matterColumns[0].values.map(row => row[1]) : [];
  if (!matterColumnNames.includes('lawyer_name')) {
    db.run('ALTER TABLE matters ADD COLUMN lawyer_name TEXT');
  }
  if (!matterColumnNames.includes('lawyer_firm')) {
    db.run('ALTER TABLE matters ADD COLUMN lawyer_firm TEXT');
  }
  if (!matterColumnNames.includes('opposing_counsel_name')) {
    db.run('ALTER TABLE matters ADD COLUMN opposing_counsel_name TEXT');
  }
  if (!matterColumnNames.includes('opposing_counsel_firm')) {
    db.run('ALTER TABLE matters ADD COLUMN opposing_counsel_firm TEXT');
  }
  if (!matterColumnNames.includes('case_number')) {
    db.run('ALTER TABLE matters ADD COLUMN case_number TEXT');
  }

  // Add new private_notes fields if they don't exist
  const noteColumns = db.exec("PRAGMA table_info(private_notes)");
  const noteColumnNames = noteColumns.length > 0 ? noteColumns[0].values.map(row => row[1]) : [];
  if (!noteColumnNames.includes('interaction_date')) {
    db.run('ALTER TABLE private_notes ADD COLUMN interaction_date DATETIME');
  }
  if (!noteColumnNames.includes('interaction_type')) {
    db.run("ALTER TABLE private_notes ADD COLUMN interaction_type TEXT DEFAULT 'note'");
  }

  // Add new matter_attachments fields if they don't exist
  const attachmentColumns = db.exec("PRAGMA table_info(matter_attachments)");
  const attachmentColumnNames = attachmentColumns.length > 0 ? attachmentColumns[0].values.map(row => row[1]) : [];
  if (!attachmentColumnNames.includes('document_date')) {
    db.run('ALTER TABLE matter_attachments ADD COLUMN document_date DATETIME');
  }
  if (!attachmentColumnNames.includes('direction')) {
    db.run("ALTER TABLE matter_attachments ADD COLUMN direction TEXT DEFAULT 'internal'");
  }

  // Helper to save database to disk
  function saveDatabase() {
    if (dbPath !== ':memory:') {
      const data = db.export();
      writeFileSync(dbPath, data);
    }
  }

  const settingsDb = {
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
    }
  };

  const mattersDb = {
    getAll() {
      const result = db.exec('SELECT * FROM matters ORDER BY matter_date DESC');
      if (result.length > 0) {
        const columns = result[0].columns;
        return result[0].values.map(row => {
          const obj = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      }
      return [];
    },

    getById(id) {
      const result = db.exec('SELECT * FROM matters WHERE id = ?', [id]);
      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns;
        const row = result[0].values[0];
        const obj = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      }
      return null;
    },

    getByIds(ids) {
      if (!ids || ids.length === 0) return [];
      const placeholders = ids.map(() => '?').join(',');
      const result = db.exec(`SELECT * FROM matters WHERE id IN (${placeholders})`, ids);
      if (result.length > 0) {
        const columns = result[0].columns;
        return result[0].values.map(row => {
          const obj = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      }
      return [];
    },

    add(matterDate, note, daysSince, cost = 0, options = {}) {
      const {
        lawyer_name = null,
        lawyer_firm = null,
        opposing_counsel_name = null,
        opposing_counsel_firm = null,
        case_number = null
      } = options;
      db.run(`
        INSERT INTO matters (matter_date, note, days_since, cost, lawyer_name, lawyer_firm, opposing_counsel_name, opposing_counsel_firm, case_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [matterDate, note, daysSince, cost, lawyer_name, lawyer_firm, opposing_counsel_name, opposing_counsel_firm, case_number]);

      // Get last insert ID
      const result = db.exec('SELECT last_insert_rowid() as id');
      const id = result[0].values[0][0];

      saveDatabase();
      return { id };
    },

    update(id, matterDate, note, cost, options = {}) {
      const {
        lawyer_name,
        lawyer_firm,
        opposing_counsel_name,
        opposing_counsel_firm,
        case_number
      } = options;

      // Build dynamic update - only update fields that are provided
      const updates = ['matter_date = ?', 'note = ?', 'cost = ?'];
      const params = [matterDate, note, cost];

      if (lawyer_name !== undefined) {
        updates.push('lawyer_name = ?');
        params.push(lawyer_name);
      }
      if (lawyer_firm !== undefined) {
        updates.push('lawyer_firm = ?');
        params.push(lawyer_firm);
      }
      if (opposing_counsel_name !== undefined) {
        updates.push('opposing_counsel_name = ?');
        params.push(opposing_counsel_name);
      }
      if (opposing_counsel_firm !== undefined) {
        updates.push('opposing_counsel_firm = ?');
        params.push(opposing_counsel_firm);
      }
      if (case_number !== undefined) {
        updates.push('case_number = ?');
        params.push(case_number);
      }

      params.push(id);
      db.run(`UPDATE matters SET ${updates.join(', ')} WHERE id = ?`, params);
      saveDatabase();
    },

    delete(id) {
      db.run('DELETE FROM matters WHERE id = ?', [id]);
      saveDatabase();
    },

    getStats() {
      const countResult = db.exec('SELECT COUNT(*) as count FROM matters');
      const thisYearResult = db.exec(`
        SELECT COUNT(*) as count FROM matters
        WHERE strftime('%Y', matter_date) = strftime('%Y', 'now')
      `);
      const maxStreakResult = db.exec('SELECT MAX(days_since) as max_streak FROM matters');

      return {
        total: countResult[0]?.values[0]?.[0] || 0,
        thisYear: thisYearResult[0]?.values[0]?.[0] || 0,
        maxStreak: maxStreakResult[0]?.values[0]?.[0] || 0
      };
    }
  };

  const adminUsersDb = {
    create(username, passwordHash, email = null) {
      db.run(`
        INSERT INTO admin_users (username, password_hash, email, created_at)
        VALUES (?, ?, ?, ?)
      `, [username, passwordHash, email, new Date().toISOString()]);

      const result = db.exec('SELECT last_insert_rowid() as id');
      const id = result[0].values[0][0];

      saveDatabase();
      return { id };
    },

    getByUsername(username) {
      const result = db.exec('SELECT * FROM admin_users WHERE username = ?', [username]);
      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns;
        const row = result[0].values[0];
        const obj = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      }
      return null;
    },

    getById(id) {
      const result = db.exec('SELECT * FROM admin_users WHERE id = ?', [id]);
      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns;
        const row = result[0].values[0];
        const obj = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      }
      return null;
    },

    updateLastLogin(id) {
      db.run(`
        UPDATE admin_users SET last_login = ? WHERE id = ?
      `, [new Date().toISOString(), id]);
      saveDatabase();
    },

    setActive(id, isActive) {
      db.run(`
        UPDATE admin_users SET is_active = ? WHERE id = ?
      `, [isActive ? 1 : 0, id]);
      saveDatabase();
    },

    updatePassword(id, passwordHash) {
      db.run(`
        UPDATE admin_users SET password_hash = ? WHERE id = ?
      `, [passwordHash, id]);
      saveDatabase();
    },

    updateEmail(id, email) {
      db.run(`
        UPDATE admin_users SET email = ? WHERE id = ?
      `, [email, id]);
      saveDatabase();
    },

    delete(id) {
      db.run('DELETE FROM admin_users WHERE id = ?', [id]);
      saveDatabase();
    },

    deleteAll() {
      db.run('DELETE FROM admin_users');
      saveDatabase();
    },

    getAll() {
      const result = db.exec('SELECT id, username, email, created_at, last_login, is_active FROM admin_users ORDER BY created_at DESC');
      if (result.length > 0) {
        const columns = result[0].columns;
        return result[0].values.map(row => {
          const obj = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      }
      return [];
    }
  };

  const adminSessionsDb = {
    create(userId, tokenJti, expiresAt, ip = null, userAgent = null) {
      db.run(`
        INSERT INTO admin_sessions (user_id, token_jti, created_at, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [userId, tokenJti, new Date().toISOString(), expiresAt, ip, userAgent]);

      const result = db.exec('SELECT last_insert_rowid() as id');
      const id = result[0].values[0][0];

      saveDatabase();
      return { id };
    },

    getByJti(jti) {
      const result = db.exec('SELECT * FROM admin_sessions WHERE token_jti = ?', [jti]);
      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns;
        const row = result[0].values[0];
        const obj = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      }
      return null;
    },

    invalidate(jti) {
      db.run('DELETE FROM admin_sessions WHERE token_jti = ?', [jti]);
      saveDatabase();
    },

    invalidateAllForUser(userId) {
      db.run('DELETE FROM admin_sessions WHERE user_id = ?', [userId]);
      saveDatabase();
    },

    invalidateAll() {
      db.run('DELETE FROM admin_sessions');
      saveDatabase();
    },

    cleanupExpired() {
      const now = new Date().toISOString();
      db.run('DELETE FROM admin_sessions WHERE expires_at < ?', [now]);
      saveDatabase();
    },

    getAllForUser(userId) {
      const result = db.exec('SELECT * FROM admin_sessions WHERE user_id = ? ORDER BY created_at DESC', [userId]);
      if (result.length > 0) {
        const columns = result[0].columns;
        return result[0].values.map(row => {
          const obj = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      }
      return [];
    },

    getAll() {
      const result = db.exec(`
        SELECT s.*, u.username
        FROM admin_sessions s
        JOIN admin_users u ON s.user_id = u.id
        ORDER BY s.created_at DESC
      `);
      if (result.length > 0) {
        const columns = result[0].columns;
        return result[0].values.map(row => {
          const obj = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      }
      return [];
    }
  };

  const adminBootstrapTokensDb = {
    create(tokenHash, expiresAt, ip = null) {
      db.run(`
        INSERT INTO admin_bootstrap_tokens (token_hash, created_at, expires_at, ip_address, is_active)
        VALUES (?, ?, ?, ?, 1)
      `, [tokenHash, new Date().toISOString(), expiresAt, ip]);

      const result = db.exec('SELECT last_insert_rowid() as id');
      const id = result[0].values[0][0];

      saveDatabase();
      return { id };
    },

    getByTokenHash(tokenHash) {
      const result = db.exec('SELECT * FROM admin_bootstrap_tokens WHERE token_hash = ?', [tokenHash]);
      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns;
        const row = result[0].values[0];
        const obj = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      }
      return null;
    },

    markAsUsed(tokenHash, ip = null) {
      db.run(`
        UPDATE admin_bootstrap_tokens
        SET used_at = ?, is_active = 0, ip_address = ?
        WHERE token_hash = ?
      `, [new Date().toISOString(), ip, tokenHash]);
      saveDatabase();
    },

    invalidateAll() {
      db.run('UPDATE admin_bootstrap_tokens SET is_active = 0 WHERE is_active = 1');
      saveDatabase();
    },

    cleanupExpired() {
      const now = new Date().toISOString();
      db.run('DELETE FROM admin_bootstrap_tokens WHERE expires_at < ? AND used_at IS NULL', [now]);
      saveDatabase();
    },

    hasActiveTokens() {
      const result = db.exec('SELECT COUNT(*) as count FROM admin_bootstrap_tokens WHERE is_active = 1 AND used_at IS NULL');
      return result[0]?.values[0]?.[0] > 0;
    },

    getActiveTokens() {
      const result = db.exec('SELECT * FROM admin_bootstrap_tokens WHERE is_active = 1 AND used_at IS NULL ORDER BY created_at DESC');
      if (result.length > 0) {
        const columns = result[0].columns;
        return result[0].values.map(row => {
          const obj = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      }
      return [];
    }
  };

  const privateNotesDb = {
    getByMatterId(matterId) {
      const result = db.exec(`
        SELECT pn.*, u.username as created_by_username
        FROM private_notes pn
        LEFT JOIN admin_users u ON pn.created_by_user_id = u.id
        WHERE pn.matter_id = ?
        ORDER BY pn.created_at DESC
      `, [matterId]);
      if (result.length > 0) {
        const columns = result[0].columns;
        return result[0].values.map(row => {
          const obj = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      }
      return [];
    },

    getById(id) {
      const result = db.exec(`
        SELECT pn.*, u.username as created_by_username
        FROM private_notes pn
        LEFT JOIN admin_users u ON pn.created_by_user_id = u.id
        WHERE pn.id = ?
      `, [id]);
      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns;
        const row = result[0].values[0];
        const obj = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      }
      return null;
    },

    create(matterId, noteContent, createdByUserId = null, options = {}) {
      const now = new Date().toISOString();
      const { interaction_date = null, interaction_type = 'note' } = options;
      db.run(`
        INSERT INTO private_notes (matter_id, note_content, interaction_date, interaction_type, created_by_user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [matterId, noteContent, interaction_date, interaction_type, createdByUserId, now, now]);

      const result = db.exec('SELECT last_insert_rowid() as id');
      const id = result[0].values[0][0];

      saveDatabase();
      return { id };
    },

    update(id, noteContent, options = {}) {
      const now = new Date().toISOString();
      const { interaction_date, interaction_type } = options;

      const updates = ['note_content = ?', 'updated_at = ?'];
      const params = [noteContent, now];

      if (interaction_date !== undefined) {
        updates.push('interaction_date = ?');
        params.push(interaction_date);
      }
      if (interaction_type !== undefined) {
        updates.push('interaction_type = ?');
        params.push(interaction_type);
      }

      params.push(id);
      db.run(`UPDATE private_notes SET ${updates.join(', ')} WHERE id = ?`, params);
      saveDatabase();
    },

    delete(id) {
      db.run('DELETE FROM private_notes WHERE id = ?', [id]);
      saveDatabase();
    },

    deleteByMatterId(matterId) {
      db.run('DELETE FROM private_notes WHERE matter_id = ?', [matterId]);
      saveDatabase();
    },

    deleteAll() {
      db.run('DELETE FROM private_notes');
      saveDatabase();
    },

    getCountByMatterId(matterId) {
      const result = db.exec('SELECT COUNT(*) as count FROM private_notes WHERE matter_id = ?', [matterId]);
      return result[0]?.values[0]?.[0] || 0;
    },

    bulkCreate(notes) {
      // notes is an array of { matterId, noteContent, createdByUserId }
      const now = new Date().toISOString();
      const insertedIds = [];
      for (const note of notes) {
        db.run(`
          INSERT INTO private_notes (matter_id, note_content, created_by_user_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `, [note.matterId, note.noteContent, note.createdByUserId || null, now, now]);
        const result = db.exec('SELECT last_insert_rowid() as id');
        insertedIds.push(result[0].values[0][0]);
      }
      saveDatabase();
      return insertedIds;
    }
  };

  const attachmentsDb = {
    getByMatterId(matterId) {
      const result = db.exec(`
        SELECT a.*, u.username as created_by_username
        FROM matter_attachments a
        LEFT JOIN admin_users u ON a.created_by_user_id = u.id
        WHERE a.matter_id = ?
        ORDER BY a.created_at DESC
      `, [matterId]);
      if (result.length > 0) {
        const columns = result[0].columns;
        return result[0].values.map(row => {
          const obj = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      }
      return [];
    },

    getById(id) {
      const result = db.exec(`
        SELECT a.*, u.username as created_by_username
        FROM matter_attachments a
        LEFT JOIN admin_users u ON a.created_by_user_id = u.id
        WHERE a.id = ?
      `, [id]);
      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns;
        const row = result[0].values[0];
        const obj = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      }
      return null;
    },

    create(matterId, filename, contentType, sizeBytes, storageBackend, storageKey, createdByUserId = null, options = {}) {
      const now = new Date().toISOString();
      const { document_date = null, direction = 'internal' } = options;
      db.run(`
        INSERT INTO matter_attachments (matter_id, original_filename, content_type, size_bytes, storage_backend, storage_key, document_date, direction, created_at, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [matterId, filename, contentType, sizeBytes, storageBackend, storageKey, document_date, direction, now, createdByUserId]);

      const result = db.exec('SELECT last_insert_rowid() as id');
      const id = result[0].values[0][0];

      saveDatabase();
      return { id };
    },

    update(id, options = {}) {
      const { document_date, direction } = options;
      const updates = [];
      const params = [];

      if (document_date !== undefined) {
        updates.push('document_date = ?');
        params.push(document_date);
      }
      if (direction !== undefined) {
        updates.push('direction = ?');
        params.push(direction);
      }

      if (updates.length > 0) {
        params.push(id);
        db.run(`UPDATE matter_attachments SET ${updates.join(', ')} WHERE id = ?`, params);
        saveDatabase();
      }
    },

    delete(id) {
      // Returns the attachment record before deletion (for storage cleanup)
      const attachment = this.getById(id);
      db.run('DELETE FROM matter_attachments WHERE id = ?', [id]);
      saveDatabase();
      return attachment;
    },

    deleteByMatterId(matterId) {
      // Returns all attachment records before deletion (for storage cleanup)
      const attachments = this.getByMatterId(matterId);
      db.run('DELETE FROM matter_attachments WHERE matter_id = ?', [matterId]);
      saveDatabase();
      return attachments;
    },

    deleteAll() {
      // Returns all attachment records before deletion (for storage cleanup)
      const result = db.exec('SELECT * FROM matter_attachments');
      let attachments = [];
      if (result.length > 0) {
        const columns = result[0].columns;
        attachments = result[0].values.map(row => {
          const obj = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      }
      db.run('DELETE FROM matter_attachments');
      saveDatabase();
      return attachments;
    },

    getCountByMatterId(matterId) {
      const result = db.exec('SELECT COUNT(*) as count FROM matter_attachments WHERE matter_id = ?', [matterId]);
      return result[0]?.values[0]?.[0] || 0;
    },

    getTotalSize() {
      const result = db.exec('SELECT SUM(size_bytes) as total FROM matter_attachments');
      return result[0]?.values[0]?.[0] || 0;
    }
  };

  const auditLogDb = {
    create(entry) {
      const {
        level,
        user_id = null,
        username = null,
        action_type,
        entity_type = null,
        entity_id = null,
        summary,
        request = null,
        response = null,
        details = null,
        ip_address = null,
        duration_ms = null,
        stack_trace = null
      } = entry;

      db.run(`
        INSERT INTO audit_log (
          timestamp, level, user_id, username, action_type, entity_type, entity_id,
          summary, request, response, details, ip_address, duration_ms, stack_trace
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        new Date().toISOString(),
        level,
        user_id,
        username,
        action_type,
        entity_type,
        entity_id,
        summary,
        request ? JSON.stringify(request) : null,
        response ? JSON.stringify(response) : null,
        details ? JSON.stringify(details) : null,
        ip_address,
        duration_ms,
        stack_trace
      ]);

      const result = db.exec('SELECT last_insert_rowid() as id');
      const id = result[0].values[0][0];

      saveDatabase();
      return { id };
    },

    getById(id) {
      const result = db.exec(`
        SELECT * FROM audit_log WHERE id = ?
      `, [id]);
      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns;
        const row = result[0].values[0];
        const obj = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        // Parse JSON fields
        if (obj.request) obj.request = JSON.parse(obj.request);
        if (obj.response) obj.response = JSON.parse(obj.response);
        if (obj.details) obj.details = JSON.parse(obj.details);
        return obj;
      }
      return null;
    },

    getAll(options = {}) {
      const { page = 1, limit = 50, level = null, userId = null, entityType = null, entityId = null } = options;
      const offset = (page - 1) * limit;

      let whereClause = '1=1';
      const params = [];

      if (level) {
        whereClause += ' AND level = ?';
        params.push(level);
      }
      if (userId) {
        whereClause += ' AND user_id = ?';
        params.push(userId);
      }
      if (entityType) {
        whereClause += ' AND entity_type = ?';
        params.push(entityType);
      }
      if (entityId) {
        whereClause += ' AND entity_id = ?';
        params.push(entityId);
      }

      // Get total count
      const countResult = db.exec(`SELECT COUNT(*) as count FROM audit_log WHERE ${whereClause}`, params);
      const total = countResult[0]?.values[0]?.[0] || 0;

      // Get paginated results
      const result = db.exec(`
        SELECT * FROM audit_log
        WHERE ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      let entries = [];
      if (result.length > 0) {
        const columns = result[0].columns;
        entries = result[0].values.map(row => {
          const obj = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          // Parse JSON fields
          if (obj.request) obj.request = JSON.parse(obj.request);
          if (obj.response) obj.response = JSON.parse(obj.response);
          if (obj.details) obj.details = JSON.parse(obj.details);
          return obj;
        });
      }

      return {
        entries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    },

    deleteOlderThan(days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      db.run('DELETE FROM audit_log WHERE timestamp < ?', [cutoff.toISOString()]);
      saveDatabase();
    },

    getCount() {
      const result = db.exec('SELECT COUNT(*) as count FROM audit_log');
      return result[0]?.values[0]?.[0] || 0;
    }
  };

  return { db, settingsDb, mattersDb, adminUsersDb, adminSessionsDb, adminBootstrapTokensDb, privateNotesDb, attachmentsDb, auditLogDb, saveDatabase };
}

// Create default database instance for backwards compatibility
const defaultDbPromise = createDatabase();
const defaultDb = await defaultDbPromise;

export const { settingsDb, mattersDb } = defaultDb;
export default defaultDb.db;
