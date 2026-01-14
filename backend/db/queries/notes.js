/**
 * Private notes query object factory
 * Manages private notes attached to matters
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
 * Create private notes database query object
 * @param {Object} db - sql.js database instance
 * @param {Function} saveDatabase - Function to persist database to disk
 * @returns {Object} Private notes query object
 */
export function createPrivateNotesDb(db, saveDatabase) {
  return {
    getByMatterId(matterId) {
      const result = db.exec(`
        SELECT pn.*, u.username as created_by_username
        FROM private_notes pn
        LEFT JOIN admin_users u ON pn.created_by_user_id = u.id
        WHERE pn.matter_id = ?
        ORDER BY pn.created_at DESC
      `, [matterId]);
      return rowsToObjects(result);
    },

    getById(id) {
      const result = db.exec(`
        SELECT pn.*, u.username as created_by_username
        FROM private_notes pn
        LEFT JOIN admin_users u ON pn.created_by_user_id = u.id
        WHERE pn.id = ?
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

    create(matterId, noteContent, createdByUserId = null, options = {}) {
      const now = new Date().toISOString();
      const { interaction_date = null, interaction_type = 'note' } = options;
      db.run(`
        INSERT INTO private_notes (matter_id, note_content, interaction_date, interaction_type, created_by_user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [matterId, noteContent, interaction_date, interaction_type, createdByUserId, now, now]);

      const result = db.exec('SELECT last_insert_rowid() as id');
      const id = result[0].values[0][0];

      saveDatabase();
      return { id };
    },

    update(id, noteContent, options = {}) {
      const now = new Date().toISOString();
      const { interaction_date, interaction_type } = options;

      const updates = ['note_content = ?', 'updated_at = ?'];
      const params = [noteContent, now];

      if (interaction_date !== undefined) {
        updates.push('interaction_date = ?');
        params.push(interaction_date);
      }
      if (interaction_type !== undefined) {
        updates.push('interaction_type = ?');
        params.push(interaction_type);
      }

      params.push(id);
      db.run(`UPDATE private_notes SET ${updates.join(', ')} WHERE id = ?`, params);
      saveDatabase();
    },

    delete(id) {
      db.run('DELETE FROM private_notes WHERE id = ?', [id]);
      saveDatabase();
    },

    deleteByMatterId(matterId) {
      db.run('DELETE FROM private_notes WHERE matter_id = ?', [matterId]);
      saveDatabase();
    },

    deleteAll() {
      db.run('DELETE FROM private_notes');
      saveDatabase();
    },

    getCountByMatterId(matterId) {
      const result = db.exec('SELECT COUNT(*) as count FROM private_notes WHERE matter_id = ?', [matterId]);
      return result[0]?.values[0]?.[0] || 0;
    },

    bulkCreate(notes) {
      // notes is an array of { matterId, noteContent, createdByUserId }
      const now = new Date().toISOString();
      const insertedIds = [];
      for (const note of notes) {
        db.run(`
          INSERT INTO private_notes (matter_id, note_content, created_by_user_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `, [note.matterId, note.noteContent, note.createdByUserId || null, now, now]);
        const result = db.exec('SELECT last_insert_rowid() as id');
        insertedIds.push(result[0].values[0][0]);
      }
      saveDatabase();
      return insertedIds;
    },

    getAll() {
      const result = db.exec(`
        SELECT * FROM private_notes ORDER BY id
      `);
      return rowsToObjects(result);
    }
  };
}
