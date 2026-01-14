/**
 * API keys query object factory
 * Manages API key creation, validation, and revocation
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
 * Create API keys database query object
 * @param {Object} db - sql.js database instance
 * @param {Function} saveDatabase - Function to persist database to disk
 * @returns {Object} API keys query object
 */
export function createApiKeysDb(db, saveDatabase) {
  return {
    create(userId, name, keyPrefix, keyHash, expiresAt = null, scopes = ['admin:full']) {
      const scopesJson = JSON.stringify(scopes);
      db.run(`
        INSERT INTO api_keys (user_id, name, key_prefix, key_hash, created_at, expires_at, scopes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [userId, name, keyPrefix, keyHash, new Date().toISOString(), expiresAt, scopesJson]);

      const result = db.exec('SELECT last_insert_rowid() as id');
      const id = result[0].values[0][0];

      saveDatabase();
      return { id };
    },

    getById(id) {
      const result = db.exec(`
        SELECT ak.*, u.username as created_by_username
        FROM api_keys ak
        LEFT JOIN admin_users u ON ak.user_id = u.id
        WHERE ak.id = ?
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

    getByPrefix(prefix) {
      // Get all active keys with matching prefix (for validation)
      const result = db.exec(`
        SELECT ak.*, u.username
        FROM api_keys ak
        LEFT JOIN admin_users u ON ak.user_id = u.id
        WHERE ak.key_prefix = ? AND ak.revoked_at IS NULL
      `, [prefix]);
      return rowsToObjects(result);
    },

    updateLastUsed(id) {
      db.run(`
        UPDATE api_keys SET last_used_at = ? WHERE id = ?
      `, [new Date().toISOString(), id]);
      saveDatabase();
    },

    revoke(id) {
      db.run(`
        UPDATE api_keys SET revoked_at = ? WHERE id = ?
      `, [new Date().toISOString(), id]);
      saveDatabase();
    },

    getAll() {
      // Returns all keys (for admin view) - never returns key_hash
      const result = db.exec(`
        SELECT ak.id, ak.user_id, ak.name, ak.key_prefix, ak.created_at, ak.last_used_at, ak.expires_at, ak.revoked_at, ak.scopes, u.username as created_by_username
        FROM api_keys ak
        LEFT JOIN admin_users u ON ak.user_id = u.id
        ORDER BY ak.created_at DESC
      `);
      return rowsToObjects(result);
    },

    getByUserId(userId) {
      // Returns keys for a specific user - never returns key_hash
      const result = db.exec(`
        SELECT id, user_id, name, key_prefix, created_at, last_used_at, expires_at, revoked_at, scopes
        FROM api_keys
        WHERE user_id = ?
        ORDER BY created_at DESC
      `, [userId]);
      return rowsToObjects(result);
    },

    delete(id) {
      db.run('DELETE FROM api_keys WHERE id = ?', [id]);
      saveDatabase();
    },

    deleteAll() {
      db.run('DELETE FROM api_keys');
      saveDatabase();
    },

    deleteAllForUser(userId) {
      db.run('DELETE FROM api_keys WHERE user_id = ?', [userId]);
      saveDatabase();
    },

    revokeAllForUser(userId) {
      db.run(`
        UPDATE api_keys SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL
      `, [new Date().toISOString(), userId]);
      saveDatabase();
    },

    getCount() {
      const result = db.exec('SELECT COUNT(*) as count FROM api_keys WHERE revoked_at IS NULL');
      return result[0]?.values[0]?.[0] || 0;
    }
  };
}
