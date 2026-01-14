/**
 * Database module entry point
 * Creates and initializes the database with all query objects
 */

import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

// Schema and migrations
import { initializeSchema } from './schema.js';
import { runMigrations, initializeDefaultSettings } from './migrations.js';

// Query object factories
import { createSettingsDb } from './queries/settings.js';
import { createMattersDb } from './queries/matters.js';
import { createAdminUsersDb } from './queries/users.js';
import { createAdminSessionsDb } from './queries/sessions.js';
import { createAdminBootstrapTokensDb } from './queries/bootstrap.js';
import { createApiKeysDb } from './queries/api-keys.js';
import { createPrivateNotesDb } from './queries/notes.js';
import { createAttachmentsDb } from './queries/attachments.js';
import { createAuditLogDb } from './queries/audit-log.js';

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
export async function createDatabase(dbPath = join(__dirname, '..', 'data', 'tracker.db')) {
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

  // Initialize schema
  initializeSchema(db);

  // Run migrations for existing databases
  runMigrations(db);

  // Initialize default settings
  initializeDefaultSettings(db);

  // Helper to save database to disk
  function saveDatabase() {
    if (dbPath !== ':memory:') {
      const data = db.export();
      writeFileSync(dbPath, data);
    }
  }

  // Create all query objects
  const settingsDb = createSettingsDb(db, saveDatabase);
  const mattersDb = createMattersDb(db, saveDatabase);
  const adminUsersDb = createAdminUsersDb(db, saveDatabase);
  const adminSessionsDb = createAdminSessionsDb(db, saveDatabase);
  const adminBootstrapTokensDb = createAdminBootstrapTokensDb(db, saveDatabase);
  const apiKeysDb = createApiKeysDb(db, saveDatabase);
  const privateNotesDb = createPrivateNotesDb(db, saveDatabase);
  const attachmentsDb = createAttachmentsDb(db, saveDatabase);
  const auditLogDb = createAuditLogDb(db, saveDatabase);

  /**
   * Reset all auto-increment sequences to 0
   * After calling this, the next INSERT will get ID 1
   * SQLite stores sequences in sqlite_sequence table when AUTOINCREMENT is used
   */
  function resetAllSequences() {
    const tables = ['matters', 'private_notes', 'matter_attachments', 'admin_users', 'admin_sessions', 'admin_bootstrap_tokens', 'audit_log', 'api_keys'];
    for (const table of tables) {
      db.run('DELETE FROM sqlite_sequence WHERE name = ?', [table]);
    }
    saveDatabase();
  }

  return {
    db,
    settingsDb,
    mattersDb,
    adminUsersDb,
    adminSessionsDb,
    adminBootstrapTokensDb,
    apiKeysDb,
    privateNotesDb,
    attachmentsDb,
    auditLogDb,
    saveDatabase,
    resetAllSequences
  };
}

// Create default database instance for backwards compatibility
const defaultDbPromise = createDatabase();
const defaultDb = await defaultDbPromise;

export const { settingsDb, mattersDb } = defaultDb;
export default defaultDb.db;
