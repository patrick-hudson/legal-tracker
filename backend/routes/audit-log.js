/**
 * Audit Log Routes
 * Routes for viewing, filtering, exporting, and managing audit log entries
 */

/**
 * Register audit log routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts - Route dependencies
 */
export default async function auditLogRoutes(fastify, opts) {
  const { adminAuthMiddleware, auditLogDb } = opts;

  // Get audit log entries (paginated with advanced filtering)
  fastify.get('/admin/api/audit-log', { preHandler: adminAuthMiddleware }, async (request) => {
    const {
      page = 1,
      limit = 50,
      level,
      levels, // Comma-separated list of levels
      userId,
      username,
      entityType,
      entityId,
      actionType,
      search,
      startDate,
      endDate
    } = request.query;

    // Parse levels if provided as comma-separated string
    let levelsArray = null;
    if (levels) {
      levelsArray = levels.split(',').map(l => l.trim().toUpperCase()).filter(l => l);
    }

    const result = auditLogDb.getAll({
      page: parseInt(page),
      limit: Math.min(parseInt(limit) || 50, 100), // Max 100 per page
      level: levelsArray ? null : level, // Use single level only if levels array not provided
      levels: levelsArray,
      userId: userId ? parseInt(userId) : null,
      username: username || null,
      entityType: entityType || null,
      entityId: entityId ? parseInt(entityId) : null,
      actionType: actionType || null,
      search: search || null,
      startDate: startDate || null,
      endDate: endDate || null
    });

    return result;
  });

  // Get distinct filter values for dropdowns
  fastify.get('/admin/api/audit-log/filters', { preHandler: adminAuthMiddleware }, async () => {
    return {
      users: auditLogDb.getDistinctUsers(),
      actionTypes: auditLogDb.getDistinctActionTypes(),
      entityTypes: auditLogDb.getDistinctEntityTypes()
    };
  });

  // Get audit log stats (errors/warnings in last 24h)
  fastify.get('/admin/api/audit-log/stats', { preHandler: adminAuthMiddleware }, async () => {
    return auditLogDb.getStats();
  });

  // Export audit log as CSV
  fastify.get('/admin/api/audit-log/export', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const {
      level,
      levels,
      userId,
      username,
      entityType,
      actionType,
      search,
      startDate,
      endDate
    } = request.query;

    // Parse levels if provided
    let levelsArray = null;
    if (levels) {
      levelsArray = levels.split(',').map(l => l.trim().toUpperCase()).filter(l => l);
    }

    // Get all matching entries (no pagination for export)
    const result = auditLogDb.getAll({
      page: 1,
      limit: 10000, // Reasonable limit for export
      level: levelsArray ? null : level,
      levels: levelsArray,
      userId: userId ? parseInt(userId) : null,
      username: username || null,
      entityType: entityType || null,
      actionType: actionType || null,
      search: search || null,
      startDate: startDate || null,
      endDate: endDate || null
    });

    // Build CSV
    const headers = ['timestamp', 'level', 'username', 'action_type', 'entity_type', 'entity_id', 'summary', 'ip_address', 'duration_ms'];
    const rows = result.entries.map(entry => {
      return headers.map(h => {
        const val = entry[h];
        if (val === null || val === undefined) return '';
        // Escape quotes and wrap in quotes if contains comma or quote
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    // Generate filename with date range info
    let filename = 'audit-log';
    if (startDate || endDate) {
      if (startDate) filename += `-from-${startDate.split('T')[0]}`;
      if (endDate) filename += `-to-${endDate.split('T')[0]}`;
    } else {
      filename += '-all';
    }
    filename += '.csv';

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  });

  // Get single audit log entry
  fastify.get('/admin/api/audit-log/:id', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { id } = request.params;

    const entry = auditLogDb.getById(parseInt(id));
    if (!entry) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Audit log entry not found' });
    }

    return { entry };
  });
}
