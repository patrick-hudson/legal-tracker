/**
 * Admin bootstrap tokens query object factory
 * Manages bootstrap tokens for initial admin setup
 */

/**
 * Helper to convert SQL result rows to objects
 * @param {Object} result - SQL result object
 * @returns {Array} Array of row objects
 */
function rowsToObjects(result) {
  if (result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * Create admin bootstrap tokens database query object
 * @param {Object} db - sql.js database instance
 * @param {Function} saveDatabase - Function to persist database to disk
 * @returns {Object} Admin bootstrap tokens query object
 */
export function createAdminBootstrapTokensDb(db, saveDatabase) {
  return {
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
      return rowsToObjects(result);
    }
  };
}
