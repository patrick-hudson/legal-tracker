/**
 * Database schema definitions
 * Contains CREATE TABLE statements for all tables
 */

/**
 * Initialize database tables and indexes
 * @param {Object} db - sql.js database instance
 */
export function initializeSchema(db) {
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

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME,
      expires_at DATETIME,
      revoked_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES admin_users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
    CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
  `);
}
