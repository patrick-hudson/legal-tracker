import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'data', 'tracker.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
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

// Prepared statements for better performance
const statements = {
  // Settings
  getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
  setSetting: db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `),
  getAllSettings: db.prepare('SELECT key, value FROM settings'),

  // Incidents
  getIncidents: db.prepare('SELECT * FROM incidents ORDER BY incident_date DESC'),
  getIncidentById: db.prepare('SELECT * FROM incidents WHERE id = ?'),
  addIncident: db.prepare(`
    INSERT INTO incidents (incident_date, note, days_since, cost)
    VALUES (?, ?, ?, ?)
  `),
  updateIncident: db.prepare(`
    UPDATE incidents SET incident_date = ?, note = ?, cost = ? WHERE id = ?
  `),
  deleteIncident: db.prepare('DELETE FROM incidents WHERE id = ?'),
  getIncidentCount: db.prepare('SELECT COUNT(*) as count FROM incidents'),
  getIncidentsThisYear: db.prepare(`
    SELECT COUNT(*) as count FROM incidents 
    WHERE strftime('%Y', incident_date) = strftime('%Y', 'now')
  `),
  getMaxStreak: db.prepare('SELECT MAX(days_since) as max_streak FROM incidents'),
};

export const settingsDb = {
  get(key) {
    const row = statements.getSetting.get(key);
    return row ? row.value : null;
  },

  set(key, value) {
    statements.setSetting.run(key, String(value));
  },

  getAll() {
    const rows = statements.getAllSettings.all();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  }
};

export const incidentsDb = {
  getAll() {
    return statements.getIncidents.all();
  },

  getById(id) {
    return statements.getIncidentById.get(id);
  },

  add(incidentDate, note, daysSince, cost = 0) {
    const result = statements.addIncident.run(incidentDate, note, daysSince, cost);
    return { id: result.lastInsertRowid };
  },

  update(id, incidentDate, note, cost) {
    statements.updateIncident.run(incidentDate, note, cost, id);
  },

  delete(id) {
    statements.deleteIncident.run(id);
  },

  getStats() {
    const count = statements.getIncidentCount.get();
    const thisYear = statements.getIncidentsThisYear.get();
    const maxStreak = statements.getMaxStreak.get();
    return {
      total: count.count,
      thisYear: thisYear.count,
      maxStreak: maxStreak.max_streak || 0
    };
  }
};

export default db;
