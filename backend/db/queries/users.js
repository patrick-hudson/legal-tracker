/**
 * Admin users query object factory
 * Manages admin user accounts
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
 * Create admin users database query object
 * @param {Object} db - sql.js database instance
 * @param {Function} saveDatabase - Function to persist database to disk
 * @returns {Object} Admin users query object
 */
export function createAdminUsersDb(db, saveDatabase) {
  return {
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
      return rowsToObjects(result);
    },

    getAllWithHashes() {
      // For backup - includes password hashes
      const result = db.exec('SELECT * FROM admin_users ORDER BY id');
      return rowsToObjects(result);
    },

    getCount() {
      const result = db.exec('SELECT COUNT(*) as count FROM admin_users');
      return result[0]?.values[0]?.[0] || 0;
    }
  };
}
