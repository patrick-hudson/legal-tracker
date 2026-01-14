/**
 * Backup & Restore Routes
 * Routes for creating, previewing, and restoring database backups
 */

/**
 * Register backup routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts - Route dependencies
 */
export default async function backupRoutes(fastify, opts) {
  const {
    adminAuthMiddleware,
    settingsDb,
    mattersDb,
    privateNotesDb,
    attachmentsDb,
    adminUsersDb,
    adminSessionsDb,
    auditLogDb,
    saveDatabase,
    resetAllSequences,
    storage: createStorage,
    getUserContext,
    logInfoFromRequest,
    logErrorFromRequest,
    ACTION_TYPES,
    ENTITY_TYPES
  } = opts;

  // Get backup stats (for UI display)
  fastify.get('/admin/api/backup/stats', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    try {
      const { getBackupStats } = await import('../backup.js');
      const storage = createStorage(settingsDb);

      const stats = getBackupStats(
        { settingsDb, mattersDb, privateNotesDb, attachmentsDb, adminUsersDb, auditLogDb },
        storage
      );

      return stats;
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: 'Failed to get backup stats'
      });

      return reply.code(500).send({
        error: 'SERVER_ERROR',
        message: error.message
      });
    }
  });

  // Create backup
  fastify.post('/admin/api/backup', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { includeAttachments = true, includeAuditLog = false, s3Mode = 'full' } = request.body || {};
    const { userId, username } = getUserContext(request);

    try {
      const { createBackup } = await import('../backup.js');
      const storage = createStorage(settingsDb);

      const { stream, filename } = await createBackup(
        {
          settingsDb,
          mattersDb,
          privateNotesDb,
          attachmentsDb,
          adminUsersDb,
          auditLogDb
        },
        storage,
        { includeAttachments, includeAuditLog, s3Mode },
        { userId, username }
      );

      // Log the backup action
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.CREATE,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: `Backup created: ${filename}`,
        details: { includeAttachments, includeAuditLog, s3Mode }
      });

      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return reply.send(stream);
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: 'Failed to create backup'
      });

      return reply.code(500).send({
        error: 'BACKUP_FAILED',
        message: error.message
      });
    }
  });

  // Preview backup (validate and get counts)
  fastify.post('/admin/api/backup/preview', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    try {
      const { previewBackup } = await import('../backup.js');

      // Get file from multipart
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({
          error: 'NO_FILE',
          message: 'No backup file provided'
        });
      }

      // Check file type
      if (!data.filename.endsWith('.zip')) {
        return reply.code(400).send({
          error: 'INVALID_FILE',
          message: 'Backup file must be a ZIP archive'
        });
      }

      // Read file into buffer
      const chunks = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Preview the backup
      const preview = previewBackup(buffer, {
        settingsDb,
        mattersDb,
        privateNotesDb,
        attachmentsDb,
        adminUsersDb,
        auditLogDb
      });

      return preview;
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: 'Failed to preview backup'
      });

      return reply.code(400).send({
        error: 'PREVIEW_FAILED',
        message: error.message
      });
    }
  });

  // Restore backup
  fastify.post('/admin/api/restore', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { userId, username } = getUserContext(request);

    try {
      const { restoreBackup } = await import('../backup.js');
      const storage = createStorage(settingsDb);

      // Get multipart data
      const parts = request.parts();
      let fileBuffer = null;
      let confirmation = null;

      for await (const part of parts) {
        if (part.type === 'file') {
          const chunks = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          fileBuffer = Buffer.concat(chunks);
        } else if (part.type === 'field' && part.fieldname === 'confirmation') {
          confirmation = part.value;
        }
      }

      if (!fileBuffer) {
        return reply.code(400).send({
          error: 'NO_FILE',
          message: 'No backup file provided'
        });
      }

      if (confirmation !== 'RESTORE BACKUP') {
        return reply.code(400).send({
          error: 'CONFIRMATION_REQUIRED',
          message: 'Invalid confirmation string'
        });
      }

      // Log start of restore
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.UPDATE,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: 'Starting backup restore'
      });

      // Perform restore
      const result = await restoreBackup(
        fileBuffer,
        {
          db: fastify.db.db,
          settingsDb,
          mattersDb,
          privateNotesDb,
          attachmentsDb,
          adminUsersDb,
          adminSessionsDb,
          auditLogDb,
          saveDatabase
        },
        storage,
        resetAllSequences,
        { userId, username }
      );

      return result;
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: 'Failed to restore backup'
      });

      return reply.code(500).send({
        error: 'RESTORE_FAILED',
        message: error.message
      });
    }
  });
}
