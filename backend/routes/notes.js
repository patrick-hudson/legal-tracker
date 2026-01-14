/**
 * Private notes routes
 * CRUD operations for private notes attached to matters
 */

import { logInfoFromRequest, logErrorFromRequest, ACTION_TYPES, ENTITY_TYPES } from '../audit.js';
import { validateStringLength } from '../lib/validation.js';
import { INPUT_LIMITS } from '../lib/constants.js';

/**
 * Register notes routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts - Contains mattersDb, privateNotesDb, adminAuthMiddleware
 */
export default async function noteRoutes(fastify, opts) {
  const { mattersDb, privateNotesDb, adminAuthMiddleware } = opts;

  // Get all private notes for a matter
  fastify.get('/admin/api/matters/:matterId/notes', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { matterId } = request.params;

    const matter = mattersDb.getById(parseInt(matterId));
    if (!matter) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Matter not found' });
    }

    const notes = privateNotesDb.getByMatterId(parseInt(matterId));
    return { notes };
  });

  // Add a private note to a matter
  fastify.post('/admin/api/matters/:matterId/notes', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { matterId } = request.params;
    const { note_content, interaction_date, interaction_type } = request.body || {};

    if (!note_content || note_content.trim() === '') {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'note_content is required' });
    }

    // Validate input length
    try {
      validateStringLength(note_content, 'note_content', INPUT_LIMITS.note);
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    const matter = mattersDb.getById(parseInt(matterId));
    if (!matter) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Matter not found' });
    }

    try {
      const userId = request.adminUser?.id || null;
      const result = privateNotesDb.create(parseInt(matterId), note_content.trim(), userId, {
        interaction_date: interaction_date || null,
        interaction_type: interaction_type || 'note'
      });

      // Log the creation
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.CREATE,
        entityType: ENTITY_TYPES.PRIVATE_NOTE,
        entityId: result.id,
        summary: `Created note #${result.id} on matter #${matterId}`,
        details: { matterId: parseInt(matterId), interaction_type: interaction_type || 'note' }
      });

      reply.code(201);
      return {
        success: true,
        note: privateNotesDb.getById(result.id)
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.PRIVATE_NOTE,
        summary: `Failed to create note on matter #${matterId}`
      });
      return reply.code(500).send({ error: 'SERVER_ERROR', message: error.message });
    }
  });

  // Update a private note
  fastify.put('/admin/api/notes/:noteId', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { noteId } = request.params;
    const { note_content, interaction_date, interaction_type } = request.body || {};

    if (!note_content || note_content.trim() === '') {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'note_content is required' });
    }

    // Validate input length
    try {
      validateStringLength(note_content, 'note_content', INPUT_LIMITS.note);
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    const existing = privateNotesDb.getById(parseInt(noteId));
    if (!existing) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Note not found' });
    }

    try {
      privateNotesDb.update(parseInt(noteId), note_content.trim(), {
        interaction_date,
        interaction_type
      });

      // Log the update
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.UPDATE,
        entityType: ENTITY_TYPES.PRIVATE_NOTE,
        entityId: parseInt(noteId),
        summary: `Updated note #${noteId}`,
        details: { matterId: existing.matter_id }
      });

      return {
        success: true,
        note: privateNotesDb.getById(parseInt(noteId))
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.PRIVATE_NOTE,
        entityId: parseInt(noteId),
        summary: `Failed to update note #${noteId}`
      });
      return reply.code(500).send({ error: 'SERVER_ERROR', message: error.message });
    }
  });

  // Delete a private note
  fastify.delete('/admin/api/notes/:noteId', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { noteId } = request.params;

    const existing = privateNotesDb.getById(parseInt(noteId));
    if (!existing) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Note not found' });
    }

    try {
      privateNotesDb.delete(parseInt(noteId));

      // Log the deletion
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.DELETE,
        entityType: ENTITY_TYPES.PRIVATE_NOTE,
        entityId: parseInt(noteId),
        summary: `Deleted note #${noteId}`,
        details: { matterId: existing.matter_id }
      });

      return { success: true };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.PRIVATE_NOTE,
        entityId: parseInt(noteId),
        summary: `Failed to delete note #${noteId}`
      });
      return reply.code(500).send({ error: 'SERVER_ERROR', message: error.message });
    }
  });
}
