/**
 * Matters query object factory
 * Manages matter CRUD operations and statistics
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
 * Create matters database query object
 * @param {Object} db - sql.js database instance
 * @param {Function} saveDatabase - Function to persist database to disk
 * @returns {Object} Matters query object
 */
export function createMattersDb(db, saveDatabase) {
  return {
    getAll() {
      const result = db.exec('SELECT * FROM matters ORDER BY matter_date DESC');
      return rowsToObjects(result);
    },

    getById(id) {
      const result = db.exec('SELECT * FROM matters WHERE id = ?', [id]);
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

    getByIds(ids) {
      if (!ids || ids.length === 0) return [];
      const placeholders = ids.map(() => '?').join(',');
      const result = db.exec(`SELECT * FROM matters WHERE id IN (${placeholders})`, ids);
      return rowsToObjects(result);
    },

    add(matterDate, note, daysSince, cost = 0, options = {}) {
      const {
        lawyer_name = null,
        lawyer_firm = null,
        opposing_counsel_name = null,
        opposing_counsel_firm = null,
        case_number = null
      } = options;
      db.run(`
        INSERT INTO matters (matter_date, note, days_since, cost, lawyer_name, lawyer_firm, opposing_counsel_name, opposing_counsel_firm, case_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [matterDate, note, daysSince, cost, lawyer_name, lawyer_firm, opposing_counsel_name, opposing_counsel_firm, case_number]);

      const result = db.exec('SELECT last_insert_rowid() as id');
      const id = result[0].values[0][0];

      saveDatabase();
      return { id };
    },

    update(id, matterDate, note, cost, options = {}) {
      const {
        lawyer_name,
        lawyer_firm,
        opposing_counsel_name,
        opposing_counsel_firm,
        case_number
      } = options;

      const updates = ['matter_date = ?', 'note = ?', 'cost = ?'];
      const params = [matterDate, note, cost];

      if (lawyer_name !== undefined) {
        updates.push('lawyer_name = ?');
        params.push(lawyer_name);
      }
      if (lawyer_firm !== undefined) {
        updates.push('lawyer_firm = ?');
        params.push(lawyer_firm);
      }
      if (opposing_counsel_name !== undefined) {
        updates.push('opposing_counsel_name = ?');
        params.push(opposing_counsel_name);
      }
      if (opposing_counsel_firm !== undefined) {
        updates.push('opposing_counsel_firm = ?');
        params.push(opposing_counsel_firm);
      }
      if (case_number !== undefined) {
        updates.push('case_number = ?');
        params.push(case_number);
      }

      params.push(id);
      db.run(`UPDATE matters SET ${updates.join(', ')} WHERE id = ?`, params);
      saveDatabase();
    },

    delete(id) {
      db.run('DELETE FROM matters WHERE id = ?', [id]);
      saveDatabase();
    },

    getStats() {
      const countResult = db.exec('SELECT COUNT(*) as count FROM matters');
      const thisYearResult = db.exec(`
        SELECT COUNT(*) as count FROM matters
        WHERE strftime('%Y', matter_date) = strftime('%Y', 'now')
      `);
      const maxStreakResult = db.exec('SELECT MAX(days_since) as max_streak FROM matters');

      return {
        total: countResult[0]?.values[0]?.[0] || 0,
        thisYear: thisYearResult[0]?.values[0]?.[0] || 0,
        maxStreak: maxStreakResult[0]?.values[0]?.[0] || 0
      };
    }
  };
}
