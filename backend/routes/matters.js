/**
 * Matters routes
 * CRUD operations for matters (legal matters/cases)
 */

import { logInfoFromRequest, logErrorFromRequest, getUserContext, ACTION_TYPES, ENTITY_TYPES } from '../audit.js';
import { validateStringLength } from '../lib/validation.js';
import { INPUT_LIMITS } from '../lib/constants.js';
import { createStorageForBackend } from '../storage.js';

/**
 * Register matters routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts - Contains settingsDb, mattersDb, privateNotesDb, attachmentsDb, adminAuthMiddleware
 */
export default async function matterRoutes(fastify, opts) {
  const { settingsDb, mattersDb, privateNotesDb, attachmentsDb, adminAuthMiddleware } = opts;

  // Get all matters with pagination
  fastify.get('/admin/api/matters', { preHandler: adminAuthMiddleware }, async (request) => {
    const { page = 1, limit = 50, search = '', sortBy = 'matter_date', sortOrder = 'DESC' } = request.query;

    let matters = mattersDb.getAll();

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      matters = matters.filter(inc =>
        (inc.note && inc.note.toLowerCase().includes(searchLower)) ||
        inc.matter_date.includes(search)
      );
    }

    // Sort
    matters.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'cost') {
        comparison = (a.cost || 0) - (b.cost || 0);
      } else if (sortBy === 'days_since') {
        comparison = (a.days_since || 0) - (b.days_since || 0);
      } else {
        comparison = new Date(a.matter_date) - new Date(b.matter_date);
      }
      return sortOrder === 'ASC' ? comparison : -comparison;
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedMatters = matters.slice(startIndex, endIndex);

    // Convert costs from cents to dollars and include counts
    const mattersWithDetails = paginatedMatters.map(inc => ({
      ...inc,
      cost: inc.cost / 100, // Convert cents to dollars
      private_notes_count: privateNotesDb.getCountByMatterId(inc.id),
      attachments_count: attachmentsDb.getCountByMatterId(inc.id)
    }));

    return {
      matters: mattersWithDetails,
      total: matters.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(matters.length / limit)
    };
  });

  // Add single matter
  fastify.post('/admin/api/matters', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { matter_date, note, cost, lawyer_name, lawyer_firm, opposing_counsel_name, opposing_counsel_firm, case_number } = request.body || {};

    if (!matter_date) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'matter_date required' });
    }

    // Validate input lengths
    try {
      validateStringLength(note, 'note', INPUT_LIMITS.note);
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    try {
      const matterDate = new Date(matter_date);
      const lastMatterDate = new Date(settingsDb.get('last_matter_date') || Date.now());
      const daysSince = Math.floor((matterDate - lastMatterDate) / (1000 * 60 * 60 * 24));

      // Cost comes in as dollars from admin form - convert to cents for storage
      const costDollars = parseFloat(cost) || 0;
      const costCents = Math.round(costDollars * 100);

      const result = mattersDb.add(
        matterDate.toISOString(),
        note || 'Matter',
        Math.max(0, daysSince),
        costCents,
        { lawyer_name, lawyer_firm, opposing_counsel_name, opposing_counsel_firm, case_number }
      );

      // Update last matter date
      settingsDb.set('last_matter_date', matterDate.toISOString());

      // Update lifetime spent (stored in cents)
      if (costCents) {
        const currentSpentCents = parseFloat(settingsDb.get('lifetime_spent') || '0');
        settingsDb.set('lifetime_spent', currentSpentCents + costCents);
      }

      // Log the creation
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.CREATE,
        entityType: ENTITY_TYPES.MATTER,
        entityId: result.id,
        summary: `Created matter #${result.id}`,
        details: { note: note || 'Matter', matter_date, cost: costDollars }
      });

      reply.code(201);
      return {
        success: true,
        matter: result
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.MATTER,
        summary: 'Failed to create matter'
      });
      return reply.code(500).send({ error: 'SERVER_ERROR', message: error.message });
    }
  });

  // Bulk add matters
  fastify.post('/admin/api/matters/bulk', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { matters: mattersArray } = request.body || {};

    if (!Array.isArray(mattersArray) || mattersArray.length === 0) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Matters array required' });
    }

    const results = [];
    const errors = [];
    let totalCost = 0;

    for (let i = 0; i < mattersArray.length; i++) {
      const { matter_date, note, cost } = mattersArray[i];

      try {
        if (!matter_date) {
          errors.push({ index: i, error: 'Missing matter_date' });
          continue;
        }

        const matterDate = new Date(matter_date);
        const lastMatterDate = new Date(settingsDb.get('last_matter_date') || Date.now());
        const daysSince = Math.floor((matterDate - lastMatterDate) / (1000 * 60 * 60 * 24));

        // Cost comes in as dollars from admin form - convert to cents for storage
        const costDollars = parseFloat(cost) || 0;
        const costCents = Math.round(costDollars * 100);

        const result = mattersDb.add(
          matterDate.toISOString(),
          note || 'Matter',
          Math.max(0, daysSince),
          costCents
        );

        // Track total cost for lifetime_spent update (in cents)
        totalCost += costCents;

        // Update last matter date to this one for next iteration
        settingsDb.set('last_matter_date', matterDate.toISOString());

        results.push({ index: i, id: result.id });
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    // Update lifetime spent with total from all matters (stored in cents)
    if (totalCost > 0) {
      const currentSpentCents = parseFloat(settingsDb.get('lifetime_spent') || '0');
      settingsDb.set('lifetime_spent', currentSpentCents + totalCost);
    }

    return {
      success: true,
      created: results.length,
      errors: errors.length,
      results,
      errors
    };
  });

  // Bulk delete matters
  fastify.delete('/admin/api/matters/bulk', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { ids } = request.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'IDs array required' });
    }

    const userContext = getUserContext(request);

    let deleted = 0;
    let attachmentsDeleted = 0;
    for (const id of ids) {
      try {
        // Delete attachments from storage before deleting matter
        const attachments = attachmentsDb.getByMatterId(parseInt(id));
        for (const attachment of attachments) {
          try {
            const storage = createStorageForBackend(attachment.storage_backend, settingsDb);
            if (storage) {
              await storage.deleteObject(attachment.storage_key, userContext);
            }
            attachmentsDeleted++;
          } catch (err) {
            fastify.log.warn({ attachmentId: attachment.id, error: err.message }, 'Failed to delete attachment from storage during bulk delete');
          }
        }
        // DB records are deleted via ON DELETE CASCADE
        mattersDb.delete(id);
        deleted++;
      } catch (error) {
        // Continue deleting others
      }
    }

    // Log the bulk deletion
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.DELETE,
      entityType: ENTITY_TYPES.MATTER,
      summary: `Bulk deleted ${deleted} matters`,
      details: { ids, deleted, attachments_deleted: attachmentsDeleted }
    });

    return { success: true, deleted, attachments_deleted: attachmentsDeleted };
  });

  // Export matters as CSV or JSON
  fastify.get('/admin/api/matters/export', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { ids, includePrivateNotes, format = 'csv' } = request.query;

    // Get matters - either selected IDs or all
    let matters;
    if (ids) {
      const idList = ids.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      matters = idList.length > 0 ? mattersDb.getByIds(idList) : mattersDb.getAll();
    } else {
      matters = mattersDb.getAll();
    }

    // Use detailed timestamp: YYYY-MM-DD_HH-MM-SS to prevent duplicate filenames
    const now = new Date();
    const timestamp = now.toISOString().replace('T', '_').replace(/:/g, '-').split('.')[0];

    // JSON format
    if (format === 'json') {
      const exportData = matters.map(matter => {
        const exportMatter = {
          id: matter.id,
          matter_date: matter.matter_date,
          note: matter.note,
          days_since: matter.days_since || 0,
          cost: matter.cost || 0,
          created_at: matter.created_at
        };

        if (includePrivateNotes === 'true') {
          const notes = privateNotesDb.getByMatterId(matter.id);
          exportMatter.private_notes = notes.map(n => ({
            id: n.id,
            note_content: n.note_content,
            created_by: n.created_by_username || null,
            created_at: n.created_at,
            updated_at: n.updated_at
          }));
        }

        return exportMatter;
      });

      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="matters-${timestamp}.json"`);

      return JSON.stringify(exportData, null, 2);
    }

    // CSV format (default)
    const headers = ['id', 'matter_date', 'note', 'days_since', 'cost', 'created_at'];
    if (includePrivateNotes === 'true') {
      headers.push('private_notes');
    }

    let csv = headers.join(',') + '\n';

    for (const matter of matters) {
      const row = [
        matter.id,
        `"${matter.matter_date}"`,
        `"${(matter.note || '').replace(/"/g, '""')}"`,
        matter.days_since || 0,
        matter.cost || 0,
        `"${matter.created_at}"`
      ];

      if (includePrivateNotes === 'true') {
        const notes = privateNotesDb.getByMatterId(matter.id);
        // Concatenate all notes with separator (newlines replaced with | for CSV compatibility)
        const notesText = notes.map(n => {
          const author = n.created_by_username ? `[${n.created_by_username}]` : '';
          const date = n.created_at ? `(${n.created_at.split('T')[0]})` : '';
          return `${author}${date}: ${n.note_content}`.replace(/[\r\n]+/g, ' ');
        }).join(' | ');
        row.push(`"${notesText.replace(/"/g, '""')}"`);
      }

      csv += row.join(',') + '\n';
    }

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="matters-${timestamp}.csv"`);

    return csv;
  });

  // Get single matter with private notes and attachments (admin only)
  fastify.get('/admin/api/matters/:id', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { id } = request.params;

    const matter = mattersDb.getById(parseInt(id));
    if (!matter) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Matter not found' });
    }

    // Get private notes for this matter
    const privateNotes = privateNotesDb.getByMatterId(parseInt(id));

    // Get attachments for this matter
    const attachments = attachmentsDb.getByMatterId(parseInt(id));

    return {
      ...matter,
      cost: matter.cost / 100, // Convert cents to dollars
      private_notes: privateNotes,
      attachments
    };
  });

  // Get matter timeline (aggregated notes and attachments sorted by date)
  fastify.get('/admin/api/matters/:id/timeline', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { id } = request.params;
    const { order = 'desc' } = request.query;

    const matter = mattersDb.getById(parseInt(id));
    if (!matter) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Matter not found' });
    }

    // Get private notes
    const privateNotes = privateNotesDb.getByMatterId(parseInt(id));

    // Get attachments
    const attachments = attachmentsDb.getByMatterId(parseInt(id));

    // Build timeline entries
    const timeline = [
      ...privateNotes.map(note => ({
        type: 'note',
        id: note.id,
        date: note.interaction_date || note.created_at,
        interaction_type: note.interaction_type || 'note',
        content: note.note_content,
        created_by: note.created_by_username,
        created_at: note.created_at,
        updated_at: note.updated_at
      })),
      ...attachments.map(attachment => ({
        type: 'attachment',
        id: attachment.id,
        date: attachment.document_date || attachment.created_at,
        direction: attachment.direction || 'internal',
        filename: attachment.original_filename,
        content_type: attachment.content_type,
        size_bytes: attachment.size_bytes,
        created_by: attachment.created_by_username,
        created_at: attachment.created_at
      }))
    ];

    // Sort by date
    timeline.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return { timeline };
  });

  // Update single matter (admin)
  fastify.put('/admin/api/matters/:id', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { id } = request.params;
    const { matter_date, note, cost, lawyer_name, lawyer_firm, opposing_counsel_name, opposing_counsel_firm, case_number } = request.body || {};

    const existing = mattersDb.getById(parseInt(id));
    if (!existing) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Matter not found' });
    }

    // Validate input lengths
    try {
      validateStringLength(note, 'note', INPUT_LIMITS.note);
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    try {
      const matterDate = matter_date ? new Date(matter_date).toISOString() : existing.matter_date;
      const matterNote = note !== undefined ? note : existing.note;
      // Cost comes in as dollars from admin form - convert to cents for storage
      const costCents = cost !== undefined ? Math.round(parseFloat(cost) * 100) : existing.cost;

      mattersDb.update(parseInt(id), matterDate, matterNote, costCents, {
        lawyer_name,
        lawyer_firm,
        opposing_counsel_name,
        opposing_counsel_firm,
        case_number
      });

      // Log the update
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.UPDATE,
        entityType: ENTITY_TYPES.MATTER,
        entityId: parseInt(id),
        summary: `Updated matter #${id}`,
        details: { before: { note: existing.note, cost: existing.cost / 100 }, after: { note: matterNote, cost: costCents / 100 } }
      });

      return { success: true };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.MATTER,
        entityId: parseInt(id),
        summary: `Failed to update matter #${id}`
      });
      return reply.code(500).send({ error: 'SERVER_ERROR', message: error.message });
    }
  });

  // Delete single matter (admin)
  fastify.delete('/admin/api/matters/:id', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { id } = request.params;

    const existing = mattersDb.getById(parseInt(id));
    if (!existing) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Matter not found' });
    }

    try {
      // Delete attachments from storage before deleting matter
      const attachments = attachmentsDb.getByMatterId(parseInt(id));
      if (attachments.length > 0) {
        const userContext = getUserContext(request);
        for (const attachment of attachments) {
          try {
            const storage = createStorageForBackend(attachment.storage_backend, settingsDb);
            if (storage) {
              await storage.deleteObject(attachment.storage_key, userContext);
            }
          } catch (err) {
            fastify.log.warn({ attachmentId: attachment.id, error: err.message }, 'Failed to delete attachment from storage');
          }
        }
        // DB records are deleted via ON DELETE CASCADE
      }

      // Private notes and attachments are deleted automatically via ON DELETE CASCADE
      mattersDb.delete(parseInt(id));

      // Log the deletion
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.DELETE,
        entityType: ENTITY_TYPES.MATTER,
        entityId: parseInt(id),
        summary: `Deleted matter #${id}`,
        details: { note: existing.note }
      });

      return { success: true };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.MATTER,
        entityId: parseInt(id),
        summary: `Failed to delete matter #${id}`
      });
      return reply.code(500).send({ error: 'SERVER_ERROR', message: error.message });
    }
  });
}
