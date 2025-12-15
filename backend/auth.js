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
 * Generate API key
 * @returns {string} Random hex string (32 bytes = 64 chars)
 */
export function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create admin authentication middleware for Fastify
 * This middleware checks for a valid JWT token in HTTP-only cookies
 *
 * @param {Object} adminSessionsDb - Database helper for sessions
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

    } catch (err) {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid or missing authentication token'
      });
    }
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
