/**
 * Attachments routes
 * File upload, download, and management for matter attachments
 */

import { logInfoFromRequest, logErrorFromRequest, logWarningFromRequest, logDebugFromRequest, getUserContext, ACTION_TYPES, ENTITY_TYPES } from '../audit.js';
import { createStorage, createStorageForBackend, validateFileType, sanitizeFilename } from '../storage.js';

/**
 * Register attachments routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts - Contains settingsDb, mattersDb, attachmentsDb, adminAuthMiddleware
 */
export default async function attachmentRoutes(fastify, opts) {
  const { settingsDb, mattersDb, attachmentsDb, adminAuthMiddleware } = opts;

  // Get attachments for a matter
  fastify.get('/admin/api/matters/:matterId/attachments', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { matterId } = request.params;

    // Verify matter exists
    const matter = mattersDb.getById(parseInt(matterId));
    if (!matter) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Matter not found' });
    }

    const attachments = attachmentsDb.getByMatterId(parseInt(matterId));
    return { attachments };
  });

  // Upload attachment for a matter
  fastify.post('/admin/api/matters/:matterId/attachments', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { matterId } = request.params;

    // Verify matter exists
    const matter = mattersDb.getById(parseInt(matterId));
    if (!matter) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Matter not found' });
    }

    let file;
    let documentDate = null;
    let direction = 'internal';

    try {
      // Parse multipart form data
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          file = part;
        } else if (part.type === 'field') {
          if (part.fieldname === 'document_date' && part.value) {
            documentDate = part.value;
          } else if (part.fieldname === 'direction' && part.value) {
            direction = part.value;
          }
        }
      }
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'No file uploaded' });
    }

    if (!file) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'No file uploaded' });
    }

    // Validate file type
    const validation = validateFileType(file.filename, file.mimetype);
    if (!validation.valid) {
      return reply.code(400).send({ error: 'INVALID_FILE_TYPE', message: validation.error });
    }

    try {
      // Get storage instance
      const storage = createStorage(settingsDb);
      const userContext = getUserContext(request);

      // Upload to storage
      const result = await storage.putObject(
        file.file,
        sanitizeFilename(file.filename),
        { contentType: file.mimetype },
        userContext
      );

      // Create database record
      const attachment = attachmentsDb.create(
        parseInt(matterId),
        sanitizeFilename(file.filename),
        file.mimetype,
        result.size_bytes,
        storage.type,
        result.storage_key,
        request.adminUser?.id || null,
        { document_date: documentDate, direction }
      );

      // Log the upload
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.CREATE,
        entityType: ENTITY_TYPES.ATTACHMENT,
        entityId: attachment.id,
        summary: `Uploaded attachment "${sanitizeFilename(file.filename)}" to matter #${matterId}`,
        details: { matterId: parseInt(matterId), filename: sanitizeFilename(file.filename), size_bytes: result.size_bytes }
      });

      return {
        success: true,
        attachment: {
          id: attachment.id,
          original_filename: sanitizeFilename(file.filename),
          content_type: file.mimetype,
          size_bytes: result.size_bytes,
          document_date: documentDate,
          direction
        }
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.ATTACHMENT,
        summary: `Failed to upload attachment to matter #${matterId}`
      });
      fastify.log.error({ error: error.message }, 'File upload failed');
      return reply.code(500).send({ error: 'UPLOAD_FAILED', message: error.message });
    }
  });

  // Download attachment
  // Use ?stream=true to force streaming through server (needed for fetch-based preview due to CORS)
  fastify.get('/admin/api/attachments/:attachmentId/download', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { attachmentId } = request.params;
    const forceStream = request.query.stream === 'true';

    const attachment = attachmentsDb.getById(parseInt(attachmentId));
    if (!attachment) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Attachment not found' });
    }

    try {
      // Get storage instance for the attachment's backend (not current global setting)
      const storage = createStorageForBackend(attachment.storage_backend, settingsDb);
      if (!storage) {
        return reply.code(500).send({
          error: 'STORAGE_NOT_CONFIGURED',
          message: `Storage backend '${attachment.storage_backend}' is not configured`
        });
      }
      const userContext = getUserContext(request);

      // For S3 storage, redirect to presigned URL to offload bandwidth to S3
      // Unless forceStream is true (needed for fetch-based previews due to CORS)
      if (storage.type === 's3' && typeof storage.getSignedUrl === 'function' && !forceStream) {
        const presignedUrl = await storage.getSignedUrl(
          attachment.storage_key,
          attachment.original_filename,
          attachment.content_type,
          3600, // 1 hour expiry
          userContext
        );

        // Log the download via redirect
        logInfoFromRequest(request, {
          actionType: ACTION_TYPES.READ,
          entityType: ENTITY_TYPES.ATTACHMENT,
          entityId: attachment.id,
          summary: `Attachment download (S3 redirect): ${attachment.original_filename}`,
          details: {
            filename: attachment.original_filename,
            sizeBytes: attachment.size_bytes,
            storageBackend: 's3'
          }
        });

        return reply.code(302).redirect(presignedUrl);
      }

      // Stream the file through the server (filesystem always, S3 when forceStream=true for preview)
      const { stream, size } = await storage.getObjectStream(attachment.storage_key, userContext);

      // Log the download
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.READ,
        entityType: ENTITY_TYPES.ATTACHMENT,
        entityId: attachment.id,
        summary: `Attachment ${forceStream ? 'preview' : 'download'} (streamed): ${attachment.original_filename}`,
        details: {
          filename: attachment.original_filename,
          sizeBytes: attachment.size_bytes,
          storageBackend: attachment.storage_backend,
          streamedThroughServer: true
        }
      });

      // Set response headers for file download
      reply.header('Content-Type', attachment.content_type);
      reply.header('Content-Length', attachment.size_bytes);
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.original_filename)}"`);

      return reply.send(stream);
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.ATTACHMENT,
        entityId: attachment.id,
        summary: `Attachment download failed: ${attachment.original_filename}`,
        details: { attachmentId, errorMessage: error.message }
      });
      return reply.code(500).send({ error: 'DOWNLOAD_FAILED', message: error.message });
    }
  });

  // Get presigned URL for S3 attachment (debug/testing)
  fastify.get('/admin/api/attachments/:attachmentId/presigned-url', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { attachmentId } = request.params;
    const { expiresIn = 3600 } = request.query;

    const attachment = attachmentsDb.getById(parseInt(attachmentId));
    if (!attachment) {
      logWarningFromRequest(request, {
        entityType: ENTITY_TYPES.ATTACHMENT,
        summary: `Presigned URL requested for non-existent attachment`,
        details: { attachmentId }
      });
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Attachment not found' });
    }

    // Only works for S3 storage
    if (attachment.storage_backend !== 's3') {
      logWarningFromRequest(request, {
        entityType: ENTITY_TYPES.ATTACHMENT,
        entityId: attachment.id,
        summary: `Presigned URL requested for non-S3 attachment: ${attachment.original_filename}`,
        details: { attachmentId: attachment.id, storageBackend: attachment.storage_backend }
      });
      return reply.code(400).send({
        error: 'NOT_S3',
        message: `Presigned URLs are only available for S3-stored attachments (this attachment uses ${attachment.storage_backend})`
      });
    }

    try {
      const storage = createStorageForBackend('s3', settingsDb);
      if (!storage) {
        logErrorFromRequest(request, {
          error: new Error('S3 storage not configured'),
          entityType: ENTITY_TYPES.ATTACHMENT,
          entityId: attachment.id,
          summary: `Presigned URL failed - S3 not configured: ${attachment.original_filename}`,
          details: { attachmentId: attachment.id }
        });
        return reply.code(500).send({
          error: 'STORAGE_NOT_CONFIGURED',
          message: 'S3 storage is not configured'
        });
      }

      const userContext = getUserContext(request);
      const expiry = Math.min(Math.max(parseInt(expiresIn) || 3600, 60), 43200); // 1 min to 12 hours

      const presignedUrl = await storage.getSignedUrl(
        attachment.storage_key,
        attachment.original_filename,
        attachment.content_type,
        expiry,
        userContext
      );

      logDebugFromRequest(request, {
        actionType: ACTION_TYPES.READ,
        entityType: ENTITY_TYPES.ATTACHMENT,
        entityId: attachment.id,
        summary: `Generated presigned URL for attachment: ${attachment.original_filename}`,
        details: { attachmentId: attachment.id, expiresIn: expiry }
      });

      return {
        url: presignedUrl,
        expiresIn: expiry,
        filename: attachment.original_filename
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.ATTACHMENT,
        entityId: attachment.id,
        summary: `Failed to generate presigned URL: ${attachment.original_filename}`,
        details: { attachmentId: attachment.id, storageKey: attachment.storage_key, errorMessage: error.message }
      });
      return reply.code(500).send({ error: 'PRESIGN_FAILED', message: error.message });
    }
  });

  // Delete attachment
  fastify.delete('/admin/api/attachments/:attachmentId', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { attachmentId } = request.params;

    const attachment = attachmentsDb.getById(parseInt(attachmentId));
    if (!attachment) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Attachment not found' });
    }

    try {
      // Get storage instance for the attachment's backend (not current global setting)
      const storage = createStorageForBackend(attachment.storage_backend, settingsDb);
      if (!storage) {
        return reply.code(500).send({
          error: 'STORAGE_NOT_CONFIGURED',
          message: `Storage backend '${attachment.storage_backend}' is not configured`
        });
      }
      const userContext = getUserContext(request);

      // Delete from storage
      await storage.deleteObject(attachment.storage_key, userContext);

      // Delete database record
      attachmentsDb.delete(parseInt(attachmentId));

      // Log the deletion
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.DELETE,
        entityType: ENTITY_TYPES.ATTACHMENT,
        entityId: parseInt(attachmentId),
        summary: `Deleted attachment "${attachment.original_filename}"`,
        details: { matterId: attachment.matter_id, filename: attachment.original_filename }
      });

      return { success: true };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.ATTACHMENT,
        entityId: parseInt(attachmentId),
        summary: `Failed to delete attachment #${attachmentId}`
      });
      fastify.log.error({ error: error.message, attachmentId }, 'Attachment deletion failed');
      return reply.code(500).send({ error: 'DELETE_FAILED', message: error.message });
    }
  });

  // Update attachment metadata
  fastify.put('/admin/api/attachments/:attachmentId', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { attachmentId } = request.params;
    const { document_date, direction } = request.body || {};

    const attachment = attachmentsDb.getById(parseInt(attachmentId));
    if (!attachment) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Attachment not found' });
    }

    try {
      attachmentsDb.update(parseInt(attachmentId), { document_date, direction });

      // Log the update
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.UPDATE,
        entityType: ENTITY_TYPES.ATTACHMENT,
        entityId: parseInt(attachmentId),
        summary: `Updated attachment "${attachment.original_filename}"`,
        details: { matterId: attachment.matter_id, document_date, direction }
      });

      return {
        success: true,
        attachment: attachmentsDb.getById(parseInt(attachmentId))
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.ATTACHMENT,
        entityId: parseInt(attachmentId),
        summary: `Failed to update attachment #${attachmentId}`
      });
      return reply.code(500).send({ error: 'SERVER_ERROR', message: error.message });
    }
  });
}
