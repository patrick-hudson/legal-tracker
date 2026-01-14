/**
 * Database migrations
 * Handles schema evolution for existing databases
 */

/**
 * Run all migrations on the database
 * @param {Object} db - sql.js database instance
 */
export function runMigrations(db) {
  // Migration: Add scopes column to api_keys if it doesn't exist
  const apiKeysColumns = db.exec("PRAGMA table_info(api_keys)");
  const hasScopes = apiKeysColumns.length > 0 && apiKeysColumns[0].values.some(col => col[1] === 'scopes');
  if (!hasScopes) {
    db.run(`ALTER TABLE api_keys ADD COLUMN scopes TEXT DEFAULT '["admin:full"]'`);
  }

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
  if (!attachmentColumnNames.includes('storage_backend')) {
    // Default to 'filesystem' for existing attachments since that was the only backend before this feature
    db.run("ALTER TABLE matter_attachments ADD COLUMN storage_backend TEXT DEFAULT 'filesystem'");
  }
  if (!attachmentColumnNames.includes('storage_key')) {
    db.run("ALTER TABLE matter_attachments ADD COLUMN storage_key TEXT DEFAULT ''");
  }
}

/**
 * Initialize default settings values
 * @param {Object} db - sql.js database instance
 */
export function initializeDefaultSettings(db) {
  db.run(`
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
}
