/**
 * Audit log query object factory
 * Manages audit log entries for system activity tracking
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
 * Create audit log database query object
 * @param {Object} db - sql.js database instance
 * @param {Function} saveDatabase - Function to persist database to disk
 * @returns {Object} Audit log query object
 */
export function createAuditLogDb(db, saveDatabase) {
  return {
    create(entry) {
      const {
        level,
        user_id = null,
        username = null,
        action_type,
        entity_type = null,
        entity_id = null,
        summary,
        request = null,
        response = null,
        details = null,
        ip_address = null,
        duration_ms = null,
        stack_trace = null
      } = entry;

      db.run(`
        INSERT INTO audit_log (
          timestamp, level, user_id, username, action_type, entity_type, entity_id,
          summary, request, response, details, ip_address, duration_ms, stack_trace
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        new Date().toISOString(),
        level,
        user_id,
        username,
        action_type,
        entity_type,
        entity_id,
        summary,
        request ? JSON.stringify(request) : null,
        response ? JSON.stringify(response) : null,
        details ? JSON.stringify(details) : null,
        ip_address,
        duration_ms,
        stack_trace
      ]);

      const result = db.exec('SELECT last_insert_rowid() as id');
      const id = result[0].values[0][0];

      saveDatabase();
      return { id };
    },

    getById(id) {
      const result = db.exec(`
        SELECT * FROM audit_log WHERE id = ?
      `, [id]);
      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns;
        const row = result[0].values[0];
        const obj = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        // Parse JSON fields
        if (obj.request) obj.request = JSON.parse(obj.request);
        if (obj.response) obj.response = JSON.parse(obj.response);
        if (obj.details) obj.details = JSON.parse(obj.details);
        return obj;
      }
      return null;
    },

    getAll(options = {}) {
      const {
        page = 1,
        limit = 50,
        level = null,
        levels = null, // Support multiple levels as array
        userId = null,
        username = null,
        entityType = null,
        entityId = null,
        actionType = null,
        search = null,
        startDate = null,
        endDate = null
      } = options;
      const offset = (page - 1) * limit;

      let whereClause = '1=1';
      const params = [];

      // Support single level or multiple levels
      if (levels && Array.isArray(levels) && levels.length > 0) {
        const placeholders = levels.map(() => '?').join(', ');
        whereClause += ` AND level IN (${placeholders})`;
        params.push(...levels);
      } else if (level) {
        whereClause += ' AND level = ?';
        params.push(level);
      }
      if (userId) {
        whereClause += ' AND user_id = ?';
        params.push(userId);
      }
      if (username) {
        whereClause += ' AND username = ?';
        params.push(username);
      }
      if (entityType) {
        whereClause += ' AND entity_type = ?';
        params.push(entityType);
      }
      if (entityId) {
        whereClause += ' AND entity_id = ?';
        params.push(entityId);
      }
      if (actionType) {
        whereClause += ' AND action_type = ?';
        params.push(actionType);
      }
      // Text search - searches summary and details
      if (search) {
        whereClause += ' AND (summary LIKE ? OR details LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
      }
      // Date range filters
      if (startDate) {
        whereClause += ' AND timestamp >= ?';
        params.push(startDate);
      }
      if (endDate) {
        whereClause += ' AND timestamp <= ?';
        params.push(endDate);
      }

      // Get total count
      const countResult = db.exec(`SELECT COUNT(*) as count FROM audit_log WHERE ${whereClause}`, params);
      const total = countResult[0]?.values[0]?.[0] || 0;

      // Get paginated results
      const result = db.exec(`
        SELECT * FROM audit_log
        WHERE ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      let entries = [];
      if (result.length > 0) {
        const columns = result[0].columns;
        entries = result[0].values.map(row => {
          const obj = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          // Parse JSON fields
          if (obj.request) obj.request = JSON.parse(obj.request);
          if (obj.response) obj.response = JSON.parse(obj.response);
          if (obj.details) obj.details = JSON.parse(obj.details);
          return obj;
        });
      }

      return {
        entries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    },

    deleteOlderThan(days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      db.run('DELETE FROM audit_log WHERE timestamp < ?', [cutoff.toISOString()]);
      saveDatabase();
    },

    deleteAll() {
      db.run('DELETE FROM audit_log');
      saveDatabase();
    },

    getCount() {
      const result = db.exec('SELECT COUNT(*) as count FROM audit_log');
      return result[0]?.values[0]?.[0] || 0;
    },

    // Get distinct values for filter dropdowns
    getDistinctUsers() {
      const result = db.exec(`
        SELECT DISTINCT username FROM audit_log
        WHERE username IS NOT NULL AND username != ''
        ORDER BY username
      `);
      if (result.length > 0) {
        return result[0].values.map(row => row[0]);
      }
      return [];
    },

    getDistinctActionTypes() {
      const result = db.exec(`
        SELECT DISTINCT action_type FROM audit_log
        WHERE action_type IS NOT NULL AND action_type != ''
        ORDER BY action_type
      `);
      if (result.length > 0) {
        return result[0].values.map(row => row[0]);
      }
      return [];
    },

    getDistinctEntityTypes() {
      const result = db.exec(`
        SELECT DISTINCT entity_type FROM audit_log
        WHERE entity_type IS NOT NULL AND entity_type != ''
        ORDER BY entity_type
      `);
      if (result.length > 0) {
        return result[0].values.map(row => row[0]);
      }
      return [];
    },

    // Get stats for header display
    getStats() {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const errorsResult = db.exec(
        'SELECT COUNT(*) FROM audit_log WHERE level = ? AND timestamp >= ?',
        ['ERROR', last24h]
      );
      const warningsResult = db.exec(
        'SELECT COUNT(*) FROM audit_log WHERE level = ? AND timestamp >= ?',
        ['WARNING', last24h]
      );
      const securityResult = db.exec(
        'SELECT COUNT(*) FROM audit_log WHERE level = ? AND timestamp >= ?',
        ['SECURITY', last24h]
      );
      const infoResult = db.exec(
        'SELECT COUNT(*) FROM audit_log WHERE level = ? AND timestamp >= ?',
        ['INFO', last24h]
      );

      return {
        errorsLast24h: errorsResult[0]?.values[0]?.[0] || 0,
        warningsLast24h: warningsResult[0]?.values[0]?.[0] || 0,
        securityLast24h: securityResult[0]?.values[0]?.[0] || 0,
        infoLast24h: infoResult[0]?.values[0]?.[0] || 0
      };
    },

    // Bulk create for sample data generation
    bulkCreate(entries) {
      let created = 0;
      for (const entry of entries) {
        const {
          timestamp = new Date().toISOString(),
          level,
          user_id = null,
          username = null,
          action_type,
          entity_type = null,
          entity_id = null,
          summary,
          request = null,
          response = null,
          details = null,
          ip_address = null,
          duration_ms = null,
          stack_trace = null
        } = entry;

        db.run(`
          INSERT INTO audit_log (
            timestamp, level, user_id, username, action_type, entity_type, entity_id,
            summary, request, response, details, ip_address, duration_ms, stack_trace
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          timestamp,
          level,
          user_id,
          username,
          action_type,
          entity_type,
          entity_id,
          summary,
          request ? JSON.stringify(request) : null,
          response ? JSON.stringify(response) : null,
          details ? JSON.stringify(details) : null,
          ip_address,
          duration_ms,
          stack_trace
        ]);
        created++;
      }

      saveDatabase();
      return { created };
    },

    deleteExcept(excludeId) {
      db.run('DELETE FROM audit_log WHERE id != ?', [excludeId]);
      saveDatabase();
    }
  };
}
