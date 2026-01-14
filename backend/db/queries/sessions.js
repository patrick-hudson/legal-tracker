/**
 * Admin sessions query object factory
 * Manages admin session tokens
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
 * Create admin sessions database query object
 * @param {Object} db - sql.js database instance
 * @param {Function} saveDatabase - Function to persist database to disk
 * @returns {Object} Admin sessions query object
 */
export function createAdminSessionsDb(db, saveDatabase) {
  return {
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
      return rowsToObjects(result);
    },

    getAll() {
      const result = db.exec(`
        SELECT s.*, u.username
        FROM admin_sessions s
        JOIN admin_users u ON s.user_id = u.id
        ORDER BY s.created_at DESC
      `);
      return rowsToObjects(result);
    }
  };
}
