/**
 * Audit Logging Service
 *
 * Provides functions for logging audit events at different levels.
 * All logging functions fail gracefully - logging errors should not break main operations.
 */

// Log levels
export const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// Action types
export const ACTION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  SETTINGS_CHANGE: 'settings_change',
  DATA_WIPE: 'data_wipe',
  SAMPLE_DATA_GENERATE: 'sample_data_generate',
  API_CALL: 'api_call',
  ERROR: 'error',
  WARNING: 'warning'
};

// Entity types
export const ENTITY_TYPES = {
  MATTER: 'matter',
  PRIVATE_NOTE: 'private_note',
  ATTACHMENT: 'attachment',
  USER: 'user',
  SETTINGS: 'settings',
  CLAUDE_API: 'claude_api',
  SYSTEM: 'system'
};

let auditLogDb = null;
let settingsDb = null;

/**
 * Initialize the audit service with database helpers
 * @param {Object} dbHelpers - Object containing auditLogDb and settingsDb
 */
export function initAudit(dbHelpers) {
  auditLogDb = dbHelpers.auditLogDb;
  settingsDb = dbHelpers.settingsDb;
}

/**
 * Helper to extract user context from a Fastify request
 * @param {Object} request - Fastify request object
 * @returns {Object} User context with id, username, and ip
 */
export function getUserContext(request) {
  const context = {
    userId: null,
    username: null,
    ipAddress: null
  };

  if (request) {
    // Extract user info if authenticated
    if (request.adminUser) {
      context.userId = request.adminUser.id;
      context.username = request.adminUser.username;
    }

    // Extract IP address (check forwarded headers first for proxy support)
    const forwardedFor = request.headers?.['x-forwarded-for'];
    if (forwardedFor) {
      context.ipAddress = forwardedFor.split(',')[0].trim();
    } else if (request.headers?.['x-real-ip']) {
      context.ipAddress = request.headers['x-real-ip'];
    } else {
      context.ipAddress = request.ip;
    }
  }

  return context;
}

/**
 * Base logging function - all other log functions call this
 * @param {Object} entry - Log entry
 * @returns {Object|null} Created entry or null on failure
 */
function log(entry) {
  if (!auditLogDb) {
    console.warn('Audit logging not initialized - skipping log entry');
    return null;
  }

  try {
    return auditLogDb.create(entry);
  } catch (error) {
    // Logging should never break the main operation
    console.error('Failed to write audit log entry:', error.message);
    return null;
  }
}

/**
 * Log an error
 * @param {Object} options - Error details
 * @param {Error|string} options.error - The error object or message
 * @param {number} [options.userId] - User who encountered the error
 * @param {string} [options.username] - Username for display
 * @param {string} [options.entityType] - Type of entity involved
 * @param {number} [options.entityId] - ID of entity involved
 * @param {string} [options.summary] - Human-readable summary
 * @param {Object} [options.details] - Additional context
 * @param {string} [options.ipAddress] - Client IP address
 * @param {Object} [options.request] - Request data that caused the error
 */
export function logError({ error, userId, username, entityType, entityId, summary, details, ipAddress, request }) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : null;

  return log({
    level: LOG_LEVELS.ERROR,
    user_id: userId,
    username,
    action_type: ACTION_TYPES.ERROR,
    entity_type: entityType,
    entity_id: entityId,
    summary: summary || errorMessage,
    request,
    details: details ? { ...details, errorMessage } : { errorMessage },
    ip_address: ipAddress,
    stack_trace: stackTrace
  });
}

/**
 * Log a warning
 * @param {Object} options - Warning details
 * @param {number} [options.userId] - User involved
 * @param {string} [options.username] - Username for display
 * @param {string} [options.entityType] - Type of entity involved
 * @param {number} [options.entityId] - ID of entity involved
 * @param {string} options.summary - Human-readable summary
 * @param {Object} [options.details] - Additional context
 * @param {string} [options.ipAddress] - Client IP address
 */
export function logWarning({ userId, username, entityType, entityId, summary, details, ipAddress }) {
  return log({
    level: LOG_LEVELS.WARNING,
    user_id: userId,
    username,
    action_type: ACTION_TYPES.WARNING,
    entity_type: entityType,
    entity_id: entityId,
    summary,
    details,
    ip_address: ipAddress
  });
}

/**
 * Log an info event (most common for tracking actions)
 * @param {Object} options - Event details
 * @param {number} [options.userId] - User who performed the action
 * @param {string} [options.username] - Username for display
 * @param {string} options.actionType - Type of action (create, update, delete, etc.)
 * @param {string} [options.entityType] - Type of entity involved
 * @param {number} [options.entityId] - ID of entity involved
 * @param {string} options.summary - Human-readable summary
 * @param {Object} [options.details] - Additional context (e.g., before/after values)
 * @param {string} [options.ipAddress] - Client IP address
 */
export function logInfo({ userId, username, actionType, entityType, entityId, summary, details, ipAddress }) {
  return log({
    level: LOG_LEVELS.INFO,
    user_id: userId,
    username,
    action_type: actionType,
    entity_type: entityType,
    entity_id: entityId,
    summary,
    details,
    ip_address: ipAddress
  });
}

/**
 * Log a debug event (only if debug mode is enabled)
 * @param {Object} options - Debug details
 * @param {number} [options.userId] - User involved
 * @param {string} [options.username] - Username for display
 * @param {string} options.actionType - Type of action
 * @param {string} [options.entityType] - Type of entity involved
 * @param {number} [options.entityId] - ID of entity involved
 * @param {string} options.summary - Human-readable summary
 * @param {Object} [options.request] - Request data
 * @param {Object} [options.response] - Response data
 * @param {number} [options.durationMs] - Operation duration in milliseconds
 * @param {string} [options.ipAddress] - Client IP address
 */
export function logDebug({ userId, username, actionType, entityType, entityId, summary, request, response, durationMs, ipAddress }) {
  // Check if debug mode is enabled (will be implemented in chunk 3)
  // For now, skip debug logs
  if (!settingsDb) {
    return null;
  }

  try {
    const debugEnabled = settingsDb.get('audit_debug_enabled');
    if (debugEnabled !== 'true') {
      return null;
    }
  } catch {
    // If we can't check the setting, skip debug logs
    return null;
  }

  return log({
    level: LOG_LEVELS.DEBUG,
    user_id: userId,
    username,
    action_type: actionType,
    entity_type: entityType,
    entity_id: entityId,
    summary,
    request,
    response,
    duration_ms: durationMs,
    ip_address: ipAddress
  });
}

/**
 * Convenience function to log from a request context
 * Automatically extracts user and IP info from the request
 * @param {Object} request - Fastify request object
 * @param {Object} options - Log options (same as logInfo, minus userId/username/ipAddress)
 */
export function logInfoFromRequest(request, options) {
  const context = getUserContext(request);
  return logInfo({
    userId: context.userId,
    username: context.username,
    ipAddress: context.ipAddress,
    ...options
  });
}

/**
 * Convenience function to log errors from a request context
 * @param {Object} request - Fastify request object
 * @param {Object} options - Log options (same as logError, minus userId/username/ipAddress)
 */
export function logErrorFromRequest(request, options) {
  const context = getUserContext(request);
  return logError({
    userId: context.userId,
    username: context.username,
    ipAddress: context.ipAddress,
    ...options
  });
}

/**
 * Convenience function to log warnings from a request context
 * @param {Object} request - Fastify request object
 * @param {Object} options - Log options (same as logWarning, minus userId/username/ipAddress)
 */
export function logWarningFromRequest(request, options) {
  const context = getUserContext(request);
  return logWarning({
    userId: context.userId,
    username: context.username,
    ipAddress: context.ipAddress,
    ...options
  });
}
