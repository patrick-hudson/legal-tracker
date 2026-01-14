/**
 * Settings query object factory
 * Manages key-value settings store
 */

/**
 * Create settings database query object
 * @param {Object} db - sql.js database instance
 * @param {Function} saveDatabase - Function to persist database to disk
 * @returns {Object} Settings query object
 */
export function createSettingsDb(db, saveDatabase) {
  return {
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
}
