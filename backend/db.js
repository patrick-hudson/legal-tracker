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

    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_date DATETIME NOT NULL,
      note TEXT,
      days_since INTEGER,
      cost REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Initialize default settings if they don't exist
    INSERT OR IGNORE INTO settings (key, value) VALUES ('lifetime_spent', '0');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('last_incident_date', datetime('now'));
  `);

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

  const incidentsDb = {
    getAll() {
      const result = db.exec('SELECT * FROM incidents ORDER BY incident_date DESC');
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
      const result = db.exec('SELECT * FROM incidents WHERE id = ?', [id]);
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

    add(incidentDate, note, daysSince, cost = 0) {
      db.run(`
        INSERT INTO incidents (incident_date, note, days_since, cost)
        VALUES (?, ?, ?, ?)
      `, [incidentDate, note, daysSince, cost]);

      // Get last insert ID
      const result = db.exec('SELECT last_insert_rowid() as id');
      const id = result[0].values[0][0];

      saveDatabase();
      return { id };
    },

    update(id, incidentDate, note, cost) {
      db.run(`
        UPDATE incidents SET incident_date = ?, note = ?, cost = ? WHERE id = ?
      `, [incidentDate, note, cost, id]);
      saveDatabase();
    },

    delete(id) {
      db.run('DELETE FROM incidents WHERE id = ?', [id]);
      saveDatabase();
    },

    getStats() {
      const countResult = db.exec('SELECT COUNT(*) as count FROM incidents');
      const thisYearResult = db.exec(`
        SELECT COUNT(*) as count FROM incidents
        WHERE strftime('%Y', incident_date) = strftime('%Y', 'now')
      `);
      const maxStreakResult = db.exec('SELECT MAX(days_since) as max_streak FROM incidents');

      return {
        total: countResult[0]?.values[0]?.[0] || 0,
        thisYear: thisYearResult[0]?.values[0]?.[0] || 0,
        maxStreak: maxStreakResult[0]?.values[0]?.[0] || 0
      };
    }
  };

  return { db, settingsDb, incidentsDb, saveDatabase };
}

// Create default database instance for backwards compatibility
const defaultDbPromise = createDatabase();
const defaultDb = await defaultDbPromise;

export const { settingsDb, incidentsDb } = defaultDb;
export default defaultDb.db;
