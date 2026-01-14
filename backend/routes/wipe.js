/**
 * Wipe/Reset Routes
 * Routes for data deletion operations with confirmation requirements
 */

import { validateStringLength } from '../lib/validation.js';
import { INPUT_LIMITS } from '../lib/constants.js';

/**
 * Register wipe routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts - Route dependencies
 */
export default async function wipeRoutes(fastify, opts) {
  const {
    adminAuthMiddleware,
    settingsDb,
    mattersDb,
    privateNotesDb,
    attachmentsDb,
    adminUsersDb,
    adminSessionsDb,
    adminBootstrapTokensDb,
    auditLogDb,
    resetAllSequences,
    createStorageForBackend,
    generateBootstrapToken,
    hashBootstrapToken,
    getBootstrapTokenExpiration,
    DEFAULT_APP_SETTINGS,
    logInfo,
    logError,
    logInfoFromRequest,
    logErrorFromRequest,
    ACTION_TYPES,
    ENTITY_TYPES
  } = opts;

  // Wipe matters only - delete all matter records but keep admin users and settings
  fastify.post('/admin/api/data/wipe-matters', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { confirmation } = request.body || {};

    // Validate input length
    try {
      validateStringLength(confirmation, 'confirmation', INPUT_LIMITS.confirmationString);
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    // Require exact confirmation string
    if (confirmation !== 'WIPE MATTERS') {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Confirmation string does not match. Please type "WIPE MATTERS" to confirm.'
      });
    }

    try {
      const userId = request.adminUser?.id ?? null;
      const username = request.adminUser?.username ?? null;
      const ip = request.ip || 'unknown';

      fastify.log.warn({
        action: 'WIPE_MATTERS',
        user_id: userId,
        ip_address: ip,
        timestamp: new Date().toISOString()
      }, 'Matters wipe initiated');

      // Count matters before deletion
      const matterCount = mattersDb.getAll().length;

      // Delete all attachments and get records for storage cleanup
      const attachments = attachmentsDb.deleteAll();
      const attachmentCount = attachments.length;

      // Delete all private notes (CASCADE should handle this, but be explicit)
      privateNotesDb.deleteAll();

      // Delete all matters
      const matters = mattersDb.getAll();
      for (const matter of matters) {
        mattersDb.delete(matter.id);
      }

      // Delete storage files for attachments
      if (attachments.length > 0) {
        for (const attachment of attachments) {
          try {
            const storage = createStorageForBackend(attachment.storage_backend, settingsDb);
            if (storage) {
              await storage.deleteObject(attachment.storage_key, { userId, username, ipAddress: ip });
            }
          } catch (err) {
            fastify.log.warn({ error: err.message, key: attachment.storage_key }, 'Failed to delete attachment from storage during wipe');
          }
        }
      }

      // Reset the last_matter_date setting
      settingsDb.set('last_matter_date', null);

      fastify.log.info({
        action: 'WIPE_MATTERS_COMPLETE',
        matters_deleted: matterCount,
        attachments_deleted: attachmentCount
      }, 'Matters wipe completed successfully');

      // Audit log the wipe
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.DATA_WIPE,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: `Wiped ${matterCount} matters, ${attachmentCount} attachments, and all private notes`,
        details: { matters_deleted: matterCount, attachments_deleted: attachmentCount, scope: 'matters_only' }
      });

      return {
        success: true,
        message: `Successfully deleted ${matterCount} matter records, ${attachmentCount} attachments, and all private notes`,
        matters_deleted: matterCount,
        attachments_deleted: attachmentCount
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: 'Failed to wipe matters'
      });
      fastify.log.error({ error: error.message }, 'Failed to wipe matters');
      return reply.code(500).send({
        error: 'SERVER_ERROR',
        message: `Failed to wipe matters: ${error.message}`
      });
    }
  });

  // Wipe matters and settings - delete all matters and reset settings to defaults, but keep users
  // Protected by env flag in production
  fastify.post('/admin/api/data/wipe-matters-and-settings', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { confirmation } = request.body || {};

    // Validate input length
    try {
      validateStringLength(confirmation, 'confirmation', INPUT_LIMITS.confirmationString);
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    // Check if wipe is enabled (disabled in production unless explicitly enabled)
    const nodeEnv = process.env.NODE_ENV || 'development';
    const enableReset = process.env.ENABLE_WIPE_MATTERS_AND_SETTINGS === 'true' || process.env.ENABLE_DB_RESET === 'true';

    if (nodeEnv === 'production' && !enableReset) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'This operation is disabled in production. Set ENABLE_WIPE_MATTERS_AND_SETTINGS=true to enable.'
      });
    }

    // Require exact confirmation string
    if (confirmation !== 'WIPE SETTINGS') {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Confirmation string does not match. Please type "WIPE SETTINGS" to confirm.'
      });
    }

    try {
      const userId = request.adminUser?.id ?? null;
      const username = request.adminUser?.username ?? null;
      const ip = request.ip || 'unknown';

      // Count items before deletion
      const matterCount = mattersDb.getAll().length;
      const attachments = attachmentsDb.deleteAll(); // Returns all attachments for storage cleanup
      const attachmentCount = attachments.length;

      // 1. Log the wipe action FIRST (before clearing audit log)
      const wipeLogEntry = logInfo({
        userId,
        username,
        actionType: ACTION_TYPES.DATA_WIPE,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: `Wiped ${matterCount} matters, ${attachmentCount} attachments, notes, and reset settings`,
        details: {
          matters_deleted: matterCount,
          attachments_deleted: attachmentCount,
          settings_reset: true,
          sequences_reset: true,
          scope: 'matters_and_settings'
        },
        ipAddress: ip
      });

      fastify.log.warn({
        action: 'WIPE_MATTERS_AND_SETTINGS',
        user_id: userId,
        ip_address: ip,
        timestamp: new Date().toISOString()
      }, 'Matters and settings wipe initiated');

      // 2. Delete all private notes
      privateNotesDb.deleteAll();

      // 3. Delete all matters
      const matters = mattersDb.getAll();
      for (const matter of matters) {
        mattersDb.delete(matter.id);
      }

      // 4. Delete storage files for attachments
      if (attachments.length > 0) {
        for (const attachment of attachments) {
          try {
            const storage = createStorageForBackend(attachment.storage_backend, settingsDb);
            if (storage) {
              await storage.deleteObject(attachment.storage_key, { userId, username, ipAddress: ip });
            }
          } catch (err) {
            fastify.log.warn({ error: err.message, key: attachment.storage_key }, 'Failed to delete attachment from storage during wipe');
          }
        }
      }

      // 5. Clear all audit log entries EXCEPT the wipe action we just logged
      if (wipeLogEntry?.id) {
        auditLogDb.deleteExcept(wipeLogEntry.id);
      }

      // 6. Reset all ID sequences
      resetAllSequences();

      // 7. Reset all configurable settings to defaults
      for (const [key, value] of Object.entries(DEFAULT_APP_SETTINGS)) {
        settingsDb.set(key, value);
      }
      // Set dynamic defaults
      settingsDb.set('drain_start_time', new Date().toISOString());
      settingsDb.set('last_matter_date', null);

      fastify.log.info({
        action: 'WIPE_MATTERS_AND_SETTINGS_COMPLETE',
        matters_deleted: matterCount,
        attachments_deleted: attachmentCount,
        settings_reset: true
      }, 'Matters and settings wipe completed successfully');

      return {
        success: true,
        message: `Successfully deleted ${matterCount} matter records, ${attachmentCount} attachments, all private notes, reset settings to defaults, and reset ID sequences`,
        matters_deleted: matterCount,
        attachments_deleted: attachmentCount,
        settings_reset: true,
        sequences_reset: true
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: 'Failed to wipe matters and settings'
      });
      fastify.log.error({
        action: 'WIPE_MATTERS_AND_SETTINGS_FAILED',
        error: error.message
      }, 'Matters and settings wipe failed');

      return reply.code(500).send({
        error: 'SERVER_ERROR',
        message: `Failed to wipe matters and settings: ${error.message}`
      });
    }
  });

  // Wipe everything - complete database reset (requires confirmation)
  // Protected by env flag in production
  fastify.post('/admin/api/data/wipe', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { confirmation } = request.body || {};

    // Validate input length
    try {
      validateStringLength(confirmation, 'confirmation', INPUT_LIMITS.confirmationString);
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    // Check if wipe is enabled (disabled in production unless explicitly enabled)
    const nodeEnv = process.env.NODE_ENV || 'development';
    const enableReset = process.env.ENABLE_DB_RESET === 'true';

    if (nodeEnv === 'production' && !enableReset) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'Database reset is disabled in production. Set ENABLE_DB_RESET=true to enable.'
      });
    }

    // Require exact confirmation string
    if (confirmation !== 'WIPE EVERYTHING') {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Confirmation string does not match. Please type "WIPE EVERYTHING" to confirm.'
      });
    }

    const ip = request.ip || 'unknown';

    try {
      // Log the wipe action (with user redacted for security)
      const userId = request.adminUser?.id || null;
      const username = request.adminUser?.username || null;
      fastify.log.warn({
        action: 'WIPE_EVERYTHING',
        user_id: userId,
        ip_address: ip,
        timestamp: new Date().toISOString()
      }, 'Database wipe initiated');

      // Count items before deletion
      const matterCount = mattersDb.getAll().length;
      const adminCount = adminUsersDb.getAll().length;
      const sessionCount = adminSessionsDb.getAll().length;
      const attachments = attachmentsDb.deleteAll(); // Returns all attachments for storage cleanup
      const attachmentCount = attachments.length;

      // Delete all data - this must be atomic
      // 1. Delete storage files for attachments (before settings reset)
      if (attachments.length > 0) {
        for (const attachment of attachments) {
          try {
            const storage = createStorageForBackend(attachment.storage_backend, settingsDb);
            if (storage) {
              await storage.deleteObject(attachment.storage_key, { userId, username, ipAddress: ip });
            }
          } catch (err) {
            fastify.log.warn({ error: err.message, key: attachment.storage_key }, 'Failed to delete attachment from storage during wipe');
          }
        }
      }

      // 2. Delete all matters
      const matters = mattersDb.getAll();
      for (const matter of matters) {
        mattersDb.delete(matter.id);
      }

      // 3. Delete all admin sessions
      const sessions = adminSessionsDb.getAll();
      for (const session of sessions) {
        adminSessionsDb.invalidate(session.token_jti);
      }

      // 4. Delete ALL admin users (including current user)
      adminUsersDb.deleteAll();

      // 5. Invalidate all bootstrap tokens
      adminBootstrapTokensDb.invalidateAll();

      // 6. Create a new bootstrap token for fresh setup
      const bootstrapToken = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(bootstrapToken);
      const expiresAt = getBootstrapTokenExpiration(60); // 60 minutes
      adminBootstrapTokensDb.create(tokenHash, expiresAt, ip);

      // 7. Reset all settings to defaults (fresh install state)
      for (const [key, value] of Object.entries(DEFAULT_APP_SETTINGS)) {
        settingsDb.set(key, value);
      }
      // Set dynamic defaults
      settingsDb.set('last_matter_date', new Date().toISOString());
      settingsDb.set('drain_start_time', new Date().toISOString());

      fastify.log.info({
        action: 'WIPE_EVERYTHING_COMPLETE',
        matters_deleted: matterCount,
        attachments_deleted: attachmentCount,
        admins_deleted: adminCount,
        sessions_invalidated: sessionCount,
        bootstrap_token_created: true
      }, 'Database wipe completed successfully');

      // Note: Audit log won't persist since user is deleted, but log anyway for consistency
      logInfo({
        userId,
        username,
        actionType: ACTION_TYPES.DATA_WIPE,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: 'Full database wipe performed',
        details: {
          matters_deleted: matterCount,
          attachments_deleted: attachmentCount,
          admins_deleted: adminCount,
          sessions_invalidated: sessionCount,
          scope: 'everything'
        },
        ipAddress: ip
      });

      return {
        success: true,
        message: 'All data has been wiped successfully. Database reset to fresh install state.',
        matters_deleted: matterCount,
        attachments_deleted: attachmentCount,
        admins_deleted: adminCount,
        sessions_invalidated: sessionCount,
        settings_reset: true,
        bootstrap_token: bootstrapToken,
        bootstrap_url: `/admin/bootstrap.html?token=${bootstrapToken}`
      };
    } catch (error) {
      logError({
        error,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: 'Failed to perform full database wipe',
        ipAddress: ip
      });
      fastify.log.error({
        action: 'WIPE_EVERYTHING_FAILED',
        error: error.message
      }, 'Database wipe failed');

      return reply.code(500).send({
        error: 'SERVER_ERROR',
        message: `Failed to wipe data: ${error.message}`
      });
    }
  });

  // Wipe audit log only - delete all audit log entries
  fastify.post('/admin/api/data/wipe-audit-log', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { confirmation } = request.body || {};

    // Validate input length
    try {
      validateStringLength(confirmation, 'confirmation', INPUT_LIMITS.confirmationString);
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    // Require exact confirmation string
    if (confirmation !== 'WIPE AUDIT LOG') {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Confirmation string does not match. Please type "WIPE AUDIT LOG" to confirm.'
      });
    }

    try {
      const userId = request.adminUser?.id ?? null;
      const username = request.adminUser?.username ?? null;
      const ip = request.ip || 'unknown';

      fastify.log.warn({
        action: 'WIPE_AUDIT_LOG',
        user_id: userId,
        ip_address: ip,
        timestamp: new Date().toISOString()
      }, 'Audit log wipe initiated');

      // Count entries before deletion
      const entryCount = auditLogDb.getCount();

      // Delete all audit log entries
      auditLogDb.deleteAll();

      fastify.log.info({
        action: 'WIPE_AUDIT_LOG_COMPLETE',
        entries_deleted: entryCount
      }, 'Audit log wipe completed successfully');

      // Log the wipe action (this will be the first new entry)
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.DATA_WIPE,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: `Wiped ${entryCount} audit log entries`,
        details: { entries_deleted: entryCount, scope: 'audit_log_only' }
      });

      return {
        success: true,
        message: `Successfully deleted ${entryCount} audit log entries`,
        entries_deleted: entryCount
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: 'Failed to wipe audit log'
      });
      fastify.log.error({ error: error.message }, 'Failed to wipe audit log');
      return reply.code(500).send({
        error: 'SERVER_ERROR',
        message: `Failed to wipe audit log: ${error.message}`
      });
    }
  });
}
