/**
 * Attachments query object factory
 * Manages file attachment records for matters
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
 * Create attachments database query object
 * @param {Object} db - sql.js database instance
 * @param {Function} saveDatabase - Function to persist database to disk
 * @returns {Object} Attachments query object
 */
export function createAttachmentsDb(db, saveDatabase) {
  const self = {
    getByMatterId(matterId) {
      const result = db.exec(`
        SELECT a.*, u.username as created_by_username
        FROM matter_attachments a
        LEFT JOIN admin_users u ON a.created_by_user_id = u.id
        WHERE a.matter_id = ?
        ORDER BY a.created_at DESC
      `, [matterId]);
      return rowsToObjects(result);
    },

    getById(id) {
      const result = db.exec(`
        SELECT a.*, u.username as created_by_username
        FROM matter_attachments a
        LEFT JOIN admin_users u ON a.created_by_user_id = u.id
        WHERE a.id = ?
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

    create(matterId, filename, contentType, sizeBytes, storageBackend, storageKey, createdByUserId = null, options = {}) {
      const now = new Date().toISOString();
      const { document_date = null, direction = 'internal' } = options;
      db.run(`
        INSERT INTO matter_attachments (matter_id, original_filename, content_type, size_bytes, storage_backend, storage_key, document_date, direction, created_at, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [matterId, filename, contentType, sizeBytes, storageBackend, storageKey, document_date, direction, now, createdByUserId]);

      const result = db.exec('SELECT last_insert_rowid() as id');
      const id = result[0].values[0][0];

      saveDatabase();
      return { id };
    },

    update(id, options = {}) {
      const { document_date, direction } = options;
      const updates = [];
      const params = [];

      if (document_date !== undefined) {
        updates.push('document_date = ?');
        params.push(document_date);
      }
      if (direction !== undefined) {
        updates.push('direction = ?');
        params.push(direction);
      }

      if (updates.length > 0) {
        params.push(id);
        db.run(`UPDATE matter_attachments SET ${updates.join(', ')} WHERE id = ?`, params);
        saveDatabase();
      }
    },

    delete(id) {
      // Returns the attachment record before deletion (for storage cleanup)
      const attachment = self.getById(id);
      db.run('DELETE FROM matter_attachments WHERE id = ?', [id]);
      saveDatabase();
      return attachment;
    },

    deleteByMatterId(matterId) {
      // Returns all attachment records before deletion (for storage cleanup)
      const attachments = self.getByMatterId(matterId);
      db.run('DELETE FROM matter_attachments WHERE matter_id = ?', [matterId]);
      saveDatabase();
      return attachments;
    },

    deleteAll() {
      // Returns all attachment records before deletion (for storage cleanup)
      const result = db.exec('SELECT * FROM matter_attachments');
      const attachments = rowsToObjects(result);
      db.run('DELETE FROM matter_attachments');
      saveDatabase();
      return attachments;
    },

    getCountByMatterId(matterId) {
      const result = db.exec('SELECT COUNT(*) as count FROM matter_attachments WHERE matter_id = ?', [matterId]);
      return result[0]?.values[0]?.[0] || 0;
    },

    getTotalSize() {
      const result = db.exec('SELECT SUM(size_bytes) as total FROM matter_attachments');
      return result[0]?.values[0]?.[0] || 0;
    },

    getAll() {
      const result = db.exec(`
        SELECT * FROM matter_attachments ORDER BY id
      `);
      return rowsToObjects(result);
    },

    getCount() {
      const result = db.exec('SELECT COUNT(*) as count FROM matter_attachments');
      return result[0]?.values[0]?.[0] || 0;
    },

    getCountsByBackend() {
      const result = db.exec(`
        SELECT storage_backend, COUNT(*) as count, SUM(size_bytes) as total_size
        FROM matter_attachments
        GROUP BY storage_backend
      `);
      const counts = { filesystem: 0, s3: 0 };
      const sizes = { filesystem: 0, s3: 0 };
      if (result.length > 0) {
        result[0].values.forEach(row => {
          const backend = row[0];
          const count = row[1];
          const size = row[2] || 0;
          if (backend === 'filesystem' || backend === 's3') {
            counts[backend] = count;
            sizes[backend] = size;
          }
        });
      }
      return { counts, sizes };
    },

    getByBackend(backend) {
      const result = db.exec(`
        SELECT * FROM matter_attachments WHERE storage_backend = ? ORDER BY id
      `, [backend]);
      return rowsToObjects(result);
    },

    updateStorageBackend(id, newBackend, newStorageKey) {
      db.run(`
        UPDATE matter_attachments
        SET storage_backend = ?, storage_key = ?
        WHERE id = ?
      `, [newBackend, newStorageKey, id]);
      saveDatabase();
    }
  };

  return self;
}
