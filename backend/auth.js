import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Admin Authentication Module
 *
 * Provides secure authentication utilities for the admin portal:
 * - Password hashing with bcrypt (12 rounds)
 * - Token generation and verification
 * - Admin authentication middleware
 */

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password using bcrypt
 * @param {string} password - Plain-text password
 * @returns {Promise<string>} Password hash
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plain-text password against a hash
 * @param {string} password - Plain-text password
 * @param {string} hash - bcrypt hash
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate a unique token ID (JTI) for JWT tokens
 * @returns {string} Random hex string
 */
export function generateTokenId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate API key (legacy - for env API_KEY)
 * @returns {string} Random hex string (32 bytes = 64 chars)
 */
export function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

// API Key constants
const API_KEY_PREFIX = 'lt_live_';
const API_KEY_PREFIX_LENGTH = 16; // lt_live_ + first 8 chars of random part

/**
 * Generate a user API key for external access
 * Format: lt_live_[32 random hex chars]
 * @returns {string} Full API key (shown to user once)
 */
export function generateUserApiKey() {
  const randomPart = crypto.randomBytes(16).toString('hex'); // 32 hex chars
  return API_KEY_PREFIX + randomPart;
}

/**
 * Extract the prefix from an API key for database lookup
 * @param {string} key - Full API key
 * @returns {string} Key prefix (first 16 chars)
 */
export function getApiKeyPrefix(key) {
  return key.substring(0, API_KEY_PREFIX_LENGTH);
}

/**
 * Validate API key format
 * @param {string} key - API key to validate
 * @returns {boolean} True if format is valid
 */
export function isValidApiKeyFormat(key) {
  if (!key || typeof key !== 'string') return false;
  if (!key.startsWith(API_KEY_PREFIX)) return false;
  // lt_live_ (8 chars) + 32 hex chars = 40 total
  if (key.length !== 40) return false;
  // Check that the random part is valid hex
  const randomPart = key.substring(API_KEY_PREFIX.length);
  return /^[a-f0-9]{32}$/.test(randomPart);
}

/**
 * Hash an API key for secure storage
 * @param {string} key - Plain-text API key
 * @returns {Promise<string>} bcrypt hash
 */
export async function hashApiKey(key) {
  return await bcrypt.hash(key, SALT_ROUNDS);
}

/**
 * Verify an API key against a stored hash
 * @param {string} key - Plain-text API key
 * @param {string} hash - bcrypt hash
 * @returns {Promise<boolean>} True if key matches
 */
export async function verifyApiKey(key, hash) {
  return await bcrypt.compare(key, hash);
}

/**
 * Create admin authentication middleware for Fastify
 * This middleware checks for a valid JWT token in HTTP-only cookies
 *
 * @param {Object} adminSessionsDb - Database helper for sessions
 * @param {Object} adminUsersDb - Database helper for users
 * @returns {Function} Fastify middleware function
 */
export function createAdminAuthMiddleware(adminSessionsDb, adminUsersDb) {
  return async function adminAuthMiddleware(request, reply) {
    try {
      // Verify JWT token from cookie
      await request.jwtVerify();

      // Check if session exists and is not expired
      const jti = request.user.jti;
      const session = adminSessionsDb.getByJti(jti);

      if (!session) {
        return reply.code(401).send({ error: 'INVALID_SESSION', message: 'Session not found' });
      }

      // Check if session is expired
      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      if (now > expiresAt) {
        adminSessionsDb.invalidate(jti);
        return reply.code(401).send({ error: 'SESSION_EXPIRED', message: 'Session has expired' });
      }

      // Check if user is still active
      const user = adminUsersDb.getById(request.user.userId);
      if (!user || !user.is_active) {
        adminSessionsDb.invalidate(jti);
        return reply.code(401).send({ error: 'USER_INACTIVE', message: 'User account is not active' });
      }

      // Attach user to request for downstream handlers
      request.adminUser = {
        id: user.id,
        username: user.username,
        email: user.email
      };
      request.authMethod = 'session';

    } catch (err) {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid or missing authentication token'
      });
    }
  };
}

/**
 * Create hybrid authentication middleware for Fastify
 * Supports both API keys (for external access) and JWT sessions (for browser)
 *
 * Flow:
 * 1. Check for API key header (X-API-Key or Authorization: Bearer)
 * 2. If present: validate API key, 401 if invalid (no fallthrough)
 * 3. If not present: fall through to JWT/session auth
 *
 * @param {Object} adminSessionsDb - Database helper for sessions
 * @param {Object} adminUsersDb - Database helper for users
 * @param {Object} apiKeysDb - Database helper for API keys
 * @returns {Function} Fastify middleware function
 */
export function createHybridAuthMiddleware(adminSessionsDb, adminUsersDb, apiKeysDb) {
  return async function hybridAuthMiddleware(request, reply) {
    // Check for API key in headers
    const apiKey = extractApiKey(request);

    if (apiKey) {
      // API key provided - validate it (no fallthrough on failure)
      const result = await validateApiKeyAuth(apiKey, apiKeysDb, adminUsersDb);

      if (!result.valid) {
        return reply.code(401).send({
          error: result.error,
          message: result.message
        });
      }

      // API key valid - attach user and key info to request
      request.adminUser = {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email
      };
      request.authMethod = 'api-key';
      request.apiKeyId = result.apiKeyId;
      request.apiKeyName = result.apiKeyName;

      // Update last_used_at for the API key
      apiKeysDb.updateLastUsed(result.apiKeyId);

      return; // Auth successful via API key
    }

    // No API key - fall through to JWT/session auth
    try {
      await request.jwtVerify();

      const jti = request.user.jti;
      const session = adminSessionsDb.getByJti(jti);

      if (!session) {
        return reply.code(401).send({ error: 'INVALID_SESSION', message: 'Session not found' });
      }

      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      if (now > expiresAt) {
        adminSessionsDb.invalidate(jti);
        return reply.code(401).send({ error: 'SESSION_EXPIRED', message: 'Session has expired' });
      }

      const user = adminUsersDb.getById(request.user.userId);
      if (!user || !user.is_active) {
        adminSessionsDb.invalidate(jti);
        return reply.code(401).send({ error: 'USER_INACTIVE', message: 'User account is not active' });
      }

      request.adminUser = {
        id: user.id,
        username: user.username,
        email: user.email
      };
      request.authMethod = 'session';

    } catch (err) {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid or missing authentication token'
      });
    }
  };
}

/**
 * Extract API key from request headers
 * Supports: X-API-Key header or Authorization: Bearer header
 * @param {Object} request - Fastify request
 * @returns {string|null} API key or null
 */
function extractApiKey(request) {
  // Check X-API-Key header first
  const xApiKey = request.headers['x-api-key'];
  if (xApiKey) {
    return xApiKey;
  }

  // Check Authorization: Bearer header
  const authHeader = request.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    // Only treat as API key if it has our prefix format
    if (token.startsWith('lt_')) {
      return token;
    }
  }

  return null;
}

/**
 * Validate an API key and return user info
 * @param {string} key - API key to validate
 * @param {Object} apiKeysDb - Database helper for API keys
 * @param {Object} adminUsersDb - Database helper for users
 * @returns {Promise<Object>} Validation result
 */
async function validateApiKeyAuth(key, apiKeysDb, adminUsersDb) {
  // Validate format first
  if (!isValidApiKeyFormat(key)) {
    return {
      valid: false,
      error: 'INVALID_API_KEY',
      message: 'Invalid API key format'
    };
  }

  // Get prefix for lookup
  const prefix = getApiKeyPrefix(key);

  // Find candidate keys by prefix
  const candidates = apiKeysDb.getByPrefix(prefix);

  if (candidates.length === 0) {
    return {
      valid: false,
      error: 'INVALID_API_KEY',
      message: 'Invalid API key'
    };
  }

  // Verify full key against hash for each candidate
  for (const candidate of candidates) {
    const matches = await verifyApiKey(key, candidate.key_hash);

    if (matches) {
      // Check expiration
      if (candidate.expires_at && new Date(candidate.expires_at) < new Date()) {
        return {
          valid: false,
          error: 'API_KEY_EXPIRED',
          message: 'API key has expired'
        };
      }

      // Get user
      const user = adminUsersDb.getById(candidate.user_id);
      if (!user) {
        return {
          valid: false,
          error: 'INVALID_API_KEY',
          message: 'API key owner not found'
        };
      }

      if (!user.is_active) {
        return {
          valid: false,
          error: 'USER_INACTIVE',
          message: 'API key owner account is not active'
        };
      }

      return {
        valid: true,
        user: user,
        apiKeyId: candidate.id,
        apiKeyName: candidate.name
      };
    }
  }

  // No matching key found
  return {
    valid: false,
    error: 'INVALID_API_KEY',
    message: 'Invalid API key'
  };
}

/**
 * Calculate token expiration date
 * @param {number} days - Number of days until expiration
 * @returns {Date} Expiration date
 */
export function getTokenExpiration(days = 7) {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + days);
  return expiration;
}

/**
 * Generate a cryptographically secure bootstrap token
 * @returns {string} Random token (32 bytes = 64 hex chars)
 */
export function generateBootstrapToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a bootstrap token using SHA-256
 * @param {string} token - Plain-text token
 * @returns {string} Token hash
 */
export function hashBootstrapToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate bootstrap token expiration (default: 60 minutes)
 * @param {number} minutes - Number of minutes until expiration
 * @returns {string} ISO timestamp
 */
export function getBootstrapTokenExpiration(minutes = 60) {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + minutes);
  return expiration.toISOString();
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with success and message
 */
export function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return { success: false, message: 'Password must be at least 8 characters long' };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const criteriaCount = [hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length;

  if (criteriaCount < 3) {
    return {
      success: false,
      message: 'Password must contain at least 3 of: uppercase, lowercase, number, special character'
    };
  }

  return { success: true };
}
