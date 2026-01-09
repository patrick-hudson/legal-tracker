/**
 * Audit Logging Service
 *
 * Provides functions for logging audit events at different levels.
 * All logging functions fail gracefully - logging errors should not break main operations.
 */

// Log levels with numeric severity (lower = more severe)
export const LOG_LEVELS = {
  ERROR: 'ERROR',
  SECURITY: 'SECURITY',
  WARNING: 'WARNING',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// Numeric severity for comparison (lower = more severe, always logged)
const LOG_LEVEL_SEVERITY = {
  ERROR: 0,
  SECURITY: 1,
  WARNING: 2,
  INFO: 3,
  DEBUG: 4
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
  WARNING: 'warning',
  SECURITY_EVENT: 'security_event'
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
 * Check if a log level should be recorded based on the configured minimum level
 * @param {string} level - The level of the log entry (ERROR, WARNING, INFO, DEBUG)
 * @returns {boolean} True if the level should be logged
 */
function shouldLog(level) {
  if (!settingsDb) {
    // If settings not available, default to INFO level (log ERROR, WARNING, INFO)
    return LOG_LEVEL_SEVERITY[level] <= LOG_LEVEL_SEVERITY.INFO;
  }

  try {
    const configuredLevel = settingsDb.get('audit_log_level') || 'INFO';
    const configuredSeverity = LOG_LEVEL_SEVERITY[configuredLevel] ?? LOG_LEVEL_SEVERITY.INFO;
    const entrySeverity = LOG_LEVEL_SEVERITY[level] ?? LOG_LEVEL_SEVERITY.INFO;
    return entrySeverity <= configuredSeverity;
  } catch {
    // On error, default to INFO level
    return LOG_LEVEL_SEVERITY[level] <= LOG_LEVEL_SEVERITY.INFO;
  }
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
    // Using console.warn as fallback when audit system not initialized
    console.warn('Audit logging not initialized - skipping log entry');
    return null;
  }

  // Check if this level should be logged based on configured minimum
  if (!shouldLog(entry.level)) {
    return null;
  }

  try {
    return auditLogDb.create(entry);
  } catch (error) {
    // Using console.error as fallback - logging failures should not break main operations
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
 * Log a security event (suspicious activity, invalid tokens, etc.)
 * @param {Object} options - Security event details
 * @param {number} [options.userId] - User involved (if known)
 * @param {string} [options.username] - Username for display (if known)
 * @param {string} [options.actionType] - Type of action (login, login_failed, logout, etc.) - defaults to security_event
 * @param {string} [options.entityType] - Type of entity involved
 * @param {number} [options.entityId] - ID of entity involved
 * @param {string} options.summary - Human-readable summary
 * @param {Object} [options.details] - Additional context (token info, etc.)
 * @param {string} [options.ipAddress] - Client IP address
 */
export function logSecurity({ userId, username, actionType, entityType, entityId, summary, details, ipAddress }) {
  return log({
    level: LOG_LEVELS.SECURITY,
    user_id: userId,
    username,
    action_type: actionType || ACTION_TYPES.SECURITY_EVENT,
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
 * Log a debug event (only logged if minimum level is DEBUG)
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
  // Level check is now handled by the base log() function via shouldLog()
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

/**
 * Convenience function to log security events from a request context
 * @param {Object} request - Fastify request object
 * @param {Object} options - Log options (same as logSecurity, minus userId/username/ipAddress)
 */
export function logSecurityFromRequest(request, options) {
  const context = getUserContext(request);
  return logSecurity({
    userId: context.userId,
    username: context.username,
    ipAddress: context.ipAddress,
    ...options
  });
}

/**
 * Convenience function to log debug events from a request context
 * @param {Object} request - Fastify request object
 * @param {Object} options - Log options (same as logDebug, minus userId/username/ipAddress)
 */
export function logDebugFromRequest(request, options) {
  const context = getUserContext(request);
  return logDebug({
    userId: context.userId,
    username: context.username,
    ipAddress: context.ipAddress,
    ...options
  });
}

/**
 * Sanitize sensitive fields from request data for logging
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
function sanitizeForLogging(data) {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = ['apiKey', 'api_key', 'secretAccessKey', 'secret_access_key', 'password', 'token'];
  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Wrap a Claude API call with debug logging
 * Logs request before call, response after, duration, and errors
 * @param {Object} client - Anthropic client
 * @param {Object} params - API call parameters (model, max_tokens, messages, etc.)
 * @param {Object} [context] - Optional context (userId, username, ipAddress)
 * @returns {Promise<Object>} API response
 */
export async function callClaudeWithLogging(client, params, context = {}) {
  const startTime = Date.now();
  const { userId, username, ipAddress } = context;

  // Log request before call
  logDebug({
    userId,
    username,
    actionType: ACTION_TYPES.API_CALL,
    entityType: ENTITY_TYPES.CLAUDE_API,
    summary: `Claude API request: ${params.model}`,
    request: sanitizeForLogging(params),
    ipAddress
  });

  try {
    const response = await client.messages.create(params);
    const durationMs = Date.now() - startTime;

    // Log successful response
    logDebug({
      userId,
      username,
      actionType: ACTION_TYPES.API_CALL,
      entityType: ENTITY_TYPES.CLAUDE_API,
      summary: `Claude API response: ${params.model} (${durationMs}ms)`,
      request: sanitizeForLogging(params),
      response: {
        id: response.id,
        model: response.model,
        stopReason: response.stop_reason,
        usage: response.usage,
        contentLength: response.content?.[0]?.text?.length ?? 0
      },
      durationMs,
      ipAddress
    });

    return response;
  } catch (error) {
    const durationMs = Date.now() - startTime;

    // Log error
    logError({
      error,
      userId,
      username,
      entityType: ENTITY_TYPES.CLAUDE_API,
      summary: `Claude API error: ${error.message}`,
      request: sanitizeForLogging(params),
      details: { durationMs },
      ipAddress
    });

    throw error;
  }
}

/**
 * Log S3/storage putObject operation
 * @param {Object} options - Operation details
 * @param {string} options.storageKey - Storage key
 * @param {number} options.sizeBytes - File size in bytes
 * @param {string} options.contentType - Content type
 * @param {number} options.durationMs - Operation duration
 * @param {Object} [options.context] - User context (userId, username, ipAddress)
 */
export function logStoragePut({ storageKey, sizeBytes, contentType, durationMs, context = {} }) {
  const { userId, username, ipAddress } = context;
  logDebug({
    userId,
    username,
    actionType: ACTION_TYPES.API_CALL,
    entityType: ENTITY_TYPES.ATTACHMENT,
    summary: `Storage putObject: ${storageKey} (${sizeBytes} bytes, ${durationMs}ms)`,
    request: { operation: 'putObject', key: storageKey, contentType },
    response: { sizeBytes },
    durationMs,
    ipAddress
  });
}

/**
 * Log S3/storage getObjectStream operation
 * @param {Object} options - Operation details
 * @param {string} options.storageKey - Storage key
 * @param {number} options.sizeBytes - File size in bytes
 * @param {number} options.durationMs - Operation duration
 * @param {Object} [options.context] - User context (userId, username, ipAddress)
 */
export function logStorageGet({ storageKey, sizeBytes, durationMs, context = {} }) {
  const { userId, username, ipAddress } = context;
  logDebug({
    userId,
    username,
    actionType: ACTION_TYPES.API_CALL,
    entityType: ENTITY_TYPES.ATTACHMENT,
    summary: `Storage getObjectStream: ${storageKey} (${sizeBytes} bytes, ${durationMs}ms)`,
    request: { operation: 'getObjectStream', key: storageKey },
    response: { sizeBytes },
    durationMs,
    ipAddress
  });
}

/**
 * Log S3/storage deleteObject operation
 * @param {Object} options - Operation details
 * @param {string} options.storageKey - Storage key
 * @param {number} options.durationMs - Operation duration
 * @param {Object} [options.context] - User context (userId, username, ipAddress)
 */
export function logStorageDelete({ storageKey, durationMs, context = {} }) {
  const { userId, username, ipAddress } = context;
  logDebug({
    userId,
    username,
    actionType: ACTION_TYPES.API_CALL,
    entityType: ENTITY_TYPES.ATTACHMENT,
    summary: `Storage deleteObject: ${storageKey} (${durationMs}ms)`,
    request: { operation: 'deleteObject', key: storageKey },
    durationMs,
    ipAddress
  });
}

/**
 * Log S3/storage error
 * @param {Object} options - Error details
 * @param {string} options.operation - Operation name (putObject, getObjectStream, deleteObject)
 * @param {string} options.storageKey - Storage key
 * @param {Error} options.error - Error object
 * @param {number} options.durationMs - Operation duration
 * @param {Object} [options.context] - User context (userId, username, ipAddress)
 */
export function logStorageError({ operation, storageKey, error, durationMs, context = {} }) {
  const { userId, username, ipAddress } = context;
  logError({
    error,
    userId,
    username,
    entityType: ENTITY_TYPES.ATTACHMENT,
    summary: `Storage ${operation} error: ${storageKey}`,
    details: { operation, key: storageKey, durationMs },
    ipAddress
  });
}
