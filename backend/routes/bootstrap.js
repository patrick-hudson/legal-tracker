/**
 * Bootstrap routes
 * Handles initial admin account setup via one-time tokens
 */

import { hashPassword } from '../auth.js';
import { generateBootstrapToken, hashBootstrapToken, getBootstrapTokenExpiration } from '../auth.js';
import { validateStringLength } from '../lib/validation.js';
import { INPUT_LIMITS } from '../lib/constants.js';

/**
 * Register bootstrap routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts - Contains adminUsersDb, adminBootstrapTokensDb
 */
export default async function bootstrapRoutes(fastify, opts) {
  const { adminUsersDb, adminBootstrapTokensDb } = opts;

  // Check if bootstrap is needed
  fastify.get('/admin/api/bootstrap/status', async () => {
    const adminCount = adminUsersDb.getAll().filter(u => u.is_active).length;
    const hasActiveTokens = adminBootstrapTokensDb.hasActiveTokens();

    return {
      needs_bootstrap: adminCount === 0 && hasActiveTokens,
      has_active_admins: adminCount > 0
    };
  });

  // Request a bootstrap token (generates one if needed or returns existing)
  fastify.post('/admin/api/bootstrap/request-token', async (request, reply) => {
    // Check if there are already active admins (prevent bootstrap hijacking)
    const activeAdmins = adminUsersDb.getAll().filter(u => u.is_active);
    if (activeAdmins.length > 0) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'Bootstrap is not available. Active admin users already exist.'
      });
    }

    let token;
    let expiresAt;

    // Check if there's already an active token - return it instead of creating a new one
    const existingTokens = adminBootstrapTokensDb.getActiveTokens();
    if (existingTokens.length > 0) {
      // Cannot return the plain token since it's hashed, so generate a new one
      // and invalidate the old one
      adminBootstrapTokensDb.invalidateAll();
      token = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(token);
      expiresAt = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash, expiresAt, request.ip);
    } else {
      // Generate new bootstrap token
      token = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(token);
      expiresAt = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash, expiresAt, request.ip);
    }

    fastify.log.info({
      action: 'BOOTSTRAP_TOKEN_REQUESTED',
      ip_address: request.ip || 'unknown'
    }, 'Bootstrap token generated via request');

    return {
      success: true,
      token,
      expires_in_minutes: 60
    };
  });

  // Validate a bootstrap token without consuming it
  fastify.post('/admin/api/bootstrap/validate-token', async (request, reply) => {
    const { token } = request.body || {};

    if (!token) {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Token is required'
      });
    }

    // Hash the token and look it up
    const tokenHash = hashBootstrapToken(token);
    const bootstrapToken = adminBootstrapTokensDb.getByTokenHash(tokenHash);

    if (!bootstrapToken) {
      return reply.code(401).send({
        valid: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid bootstrap token'
      });
    }

    // Check if token is still active
    if (!bootstrapToken.is_active || bootstrapToken.used_at) {
      return reply.code(401).send({
        valid: false,
        error: 'TOKEN_USED',
        message: 'This bootstrap token has already been used'
      });
    }

    // Check if token is expired
    if (new Date(bootstrapToken.expires_at) < new Date()) {
      return reply.code(401).send({
        valid: false,
        error: 'TOKEN_EXPIRED',
        message: 'This bootstrap token has expired'
      });
    }

    // Token is valid
    return {
      valid: true,
      expires_at: bootstrapToken.expires_at
    };
  });

  // Bootstrap - set initial admin password with one-time token
  fastify.post('/admin/api/bootstrap/setup', {
    config: {
      rateLimit: {
        max: 10, // Maximum 10 attempts
        timeWindow: '5 minutes'
      }
    }
  }, async (request, reply) => {
    const { token, username, hashedPassword } = request.body || {};

    // Check each field individually for better error messages
    if (!token) {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Token is required'
      });
    }
    if (!username) {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Username is required'
      });
    }
    if (!hashedPassword) {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Password is required'
      });
    }

    // Validate input lengths
    try {
      validateStringLength(username, 'username', INPUT_LIMITS.username);
      validateStringLength(hashedPassword, 'hashedPassword', 256); // SHA-256 hash = 64 hex chars
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    // Check if there are already active admins (prevent bootstrap hijacking)
    const activeAdmins = adminUsersDb.getAll().filter(u => u.is_active);
    if (activeAdmins.length > 0) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'Bootstrap is not available. Active admin users already exist.'
      });
    }

    // Validate hashedPassword format (should be 64 hex characters - SHA-256 hash)
    if (!/^[a-f0-9]{64}$/i.test(hashedPassword)) {
      return reply.code(400).send({
        error: 'INVALID_PASSWORD',
        message: 'Invalid password hash format'
      });
    }

    // Validate username
    if (!username || username.trim().length < 3) {
      return reply.code(400).send({
        error: 'INVALID_USERNAME',
        message: 'Username must be at least 3 characters long'
      });
    }

    // Hash the token and look it up
    const tokenHash = hashBootstrapToken(token);
    const bootstrapToken = adminBootstrapTokensDb.getByTokenHash(tokenHash);

    if (!bootstrapToken) {
      return reply.code(401).send({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired bootstrap token'
      });
    }

    // Check if token is still active
    if (!bootstrapToken.is_active || bootstrapToken.used_at) {
      return reply.code(401).send({
        error: 'TOKEN_USED',
        message: 'This bootstrap token has already been used'
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(bootstrapToken.expires_at);
    if (now > expiresAt) {
      return reply.code(401).send({
        error: 'TOKEN_EXPIRED',
        message: 'This bootstrap token has expired'
      });
    }

    try {
      // Password is already client-hashed (SHA-256), just bcrypt it
      const passwordHash = await hashPassword(hashedPassword);

      // Create admin user
      const user = adminUsersDb.create(username.trim(), passwordHash, null);

      // Mark token as used
      const ip = request.ip || 'unknown';
      adminBootstrapTokensDb.markAsUsed(tokenHash, ip);

      fastify.log.info({
        action: 'BOOTSTRAP_COMPLETE',
        user_id: user.id,
        username: username.trim(),
        ip_address: ip
      }, 'Bootstrap setup completed successfully');

      return {
        success: true,
        message: 'Admin account created successfully',
        username: username.trim()
      };
    } catch (error) {
      fastify.log.error({
        action: 'BOOTSTRAP_FAILED',
        error: error.message
      }, 'Bootstrap setup failed');

      return reply.code(500).send({
        error: 'SERVER_ERROR',
        message: `Failed to create admin account: ${error.message}`
      });
    }
  });
}
