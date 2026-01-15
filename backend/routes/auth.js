/**
 * Authentication routes
 * Handles login, logout, session management, and password changes
 */

import { hashPassword, verifyPassword, generateTokenId, getTokenExpiration } from '../auth.js';
import { logSecurity, logSecurityFromRequest, ACTION_TYPES, ENTITY_TYPES } from '../audit.js';
import { getClientIP } from '../lib/helpers.js';

/**
 * Register auth routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts - Contains adminUsersDb, adminSessionsDb, adminAuthMiddleware, cookieSecure
 */
export default async function authRoutes(fastify, opts) {
  const { adminUsersDb, adminSessionsDb, adminAuthMiddleware, cookieSecure } = opts;

  // Validate token - checks if admin_token cookie is valid, clears if stale
  // Used by login page to detect and clean up invalid tokens
  fastify.get('/admin/api/auth/validate', async (request, reply) => {
    const token = request.cookies.admin_token;

    // No token present - nothing to validate
    if (!token) {
      return { valid: false, reason: 'no_token' };
    }

    try {
      // Try to decode and verify the JWT
      const decoded = fastify.jwt.verify(token);

      // Check if session exists and is valid
      const session = adminSessionsDb.getByJti(decoded.jti);
      if (!session) {
        // Token is valid JWT but session doesn't exist (logged out elsewhere, server restarted, etc.)
        logSecurityFromRequest(request, {
          entityType: ENTITY_TYPES.USER,
          summary: 'Stale admin token detected and cleared - session not found',
          details: {
            tokenJti: decoded.jti,
            tokenUsername: decoded.username,
            reason: 'session_not_found'
          }
        });

        reply.clearCookie('admin_token', {
          path: '/',
          httpOnly: true,
          secure: cookieSecure,
          sameSite: 'strict'
        });

        return { valid: false, reason: 'session_not_found', cleared: true };
      }

      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        logSecurityFromRequest(request, {
          entityType: ENTITY_TYPES.USER,
          summary: 'Expired admin token detected and cleared',
          details: {
            tokenJti: decoded.jti,
            tokenUsername: decoded.username,
            reason: 'session_expired',
            expiredAt: session.expires_at
          }
        });

        reply.clearCookie('admin_token', {
          path: '/',
          httpOnly: true,
          secure: cookieSecure,
          sameSite: 'strict'
        });

        return { valid: false, reason: 'session_expired', cleared: true };
      }

      // Token and session are valid
      return { valid: true, username: decoded.username };

    } catch (err) {
      // JWT verification failed (invalid signature, malformed, etc.)
      logSecurityFromRequest(request, {
        entityType: ENTITY_TYPES.USER,
        summary: 'Invalid admin token detected and cleared',
        details: {
          error: err.message,
          reason: 'invalid_token'
        }
      });

      reply.clearCookie('admin_token', {
        path: '/',
        httpOnly: true,
        secure: cookieSecure,
        sameSite: 'strict'
      });

      return { valid: false, reason: 'invalid_token', cleared: true };
    }
  });

  // Admin login - strict rate limiting to prevent brute force attacks
  fastify.post('/admin/api/auth/login', {
    config: {
      rateLimit: {
        max: 5, // Maximum 5 login attempts
        timeWindow: '1 minute' // Per minute
      }
    }
  }, async (request, reply) => {
    const { username, hashedPassword } = request.body || {};

    if (!username || !hashedPassword) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Username and hashed password required' });
    }

    // Get user
    const user = adminUsersDb.getByUsername(username);
    const clientIP = getClientIP(request);

    if (!user) {
      // Log failed login - user not found (security event)
      logSecurity({
        actionType: ACTION_TYPES.LOGIN_FAILED,
        entityType: ENTITY_TYPES.USER,
        summary: `Failed login attempt for unknown user "${username}"`,
        details: { reason: 'user_not_found' },
        ipAddress: clientIP
      });
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' });
    }

    // Check if user is active
    if (!user.is_active) {
      // Log failed login - user inactive (security event)
      logSecurity({
        userId: user.id,
        username: user.username,
        actionType: ACTION_TYPES.LOGIN_FAILED,
        entityType: ENTITY_TYPES.USER,
        summary: `Failed login attempt for inactive user "${username}"`,
        details: { reason: 'user_inactive' },
        ipAddress: clientIP
      });
      return reply.code(401).send({ error: 'USER_INACTIVE', message: 'User account is not active' });
    }

    // Verify hashed password (server stores bcrypt(hashedPassword))
    const validPassword = await verifyPassword(hashedPassword, user.password_hash);
    if (!validPassword) {
      // Log failed login - wrong password (security event)
      logSecurity({
        userId: user.id,
        username: user.username,
        actionType: ACTION_TYPES.LOGIN_FAILED,
        entityType: ENTITY_TYPES.USER,
        summary: `Failed login attempt for user "${username}"`,
        details: { reason: 'invalid_password' },
        ipAddress: clientIP
      });
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' });
    }

    // Create session
    const jti = generateTokenId();
    const expiration = getTokenExpiration(7); // 7 days
    const userAgent = request.headers['user-agent'] || null;

    adminSessionsDb.create(user.id, jti, expiration.toISOString(), clientIP, userAgent);
    adminUsersDb.updateLastLogin(user.id);

    // Generate JWT
    const token = fastify.jwt.sign(
      { userId: user.id, username: user.username, jti },
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie
    reply.setCookie('admin_token', token, {
      path: '/',
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    });

    // Log successful login (security event)
    logSecurity({
      userId: user.id,
      username: user.username,
      actionType: ACTION_TYPES.LOGIN,
      entityType: ENTITY_TYPES.USER,
      summary: `User "${username}" logged in`,
      ipAddress: clientIP
    });

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    };
  });

  // Admin logout
  fastify.post('/admin/api/auth/logout', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const jti = request.user.jti;

    // Invalidate session in database
    adminSessionsDb.invalidate(jti);

    // Clear the cookie
    reply.clearCookie('admin_token', {
      path: '/',
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'strict'
    });

    // Log logout (security event)
    logSecurityFromRequest(request, {
      actionType: ACTION_TYPES.LOGOUT,
      entityType: ENTITY_TYPES.USER,
      summary: `User "${request.adminUser.username}" logged out`
    });

    return { success: true, message: 'Logged out successfully' };
  });

  // Get current admin user (and API key info if using API key auth)
  fastify.get('/admin/api/auth/me', { preHandler: adminAuthMiddleware }, async (request) => {
    const response = {
      user: request.adminUser,
      auth_method: request.authMethod || 'session'
    };

    // Include API key details if authenticated via API key
    if (request.authMethod === 'api-key') {
      response.api_key = {
        id: request.apiKeyId,
        name: request.apiKeyName,
        scopes: request.apiKeyScopes || []
      };
    }

    return response;
  });

  // Change password
  // Both currentPassword and newPassword are SHA-256 hashes from client-side (username:password:salt)
  fastify.post('/admin/api/auth/change-password', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body || {};

    if (!currentPassword || !newPassword) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Current and new password required' });
    }

    // Validate hash format (SHA-256 = 64 hex characters)
    if (!/^[a-f0-9]{64}$/i.test(currentPassword) || !/^[a-f0-9]{64}$/i.test(newPassword)) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Invalid password format' });
    }

    const user = adminUsersDb.getById(request.adminUser.id);
    // Verify currentPassword hash against stored bcrypt(SHA-256) hash
    const validPassword = await verifyPassword(currentPassword, user.password_hash);

    if (!validPassword) {
      return reply.code(401).send({ error: 'INVALID_PASSWORD', message: 'Current password is incorrect' });
    }

    // Hash the new password (which is already SHA-256) with bcrypt
    const newHash = await hashPassword(newPassword);
    adminUsersDb.updatePassword(request.adminUser.id, newHash);

    // Invalidate all sessions for this user (force re-login with new password)
    // The cookie will still exist in browser but will be rejected by auth middleware
    adminSessionsDb.invalidateAllForUser(request.adminUser.id);

    return { success: true, message: 'Password changed successfully. Please log in again.' };
  });

  // Nuclear option: Force invalidate ALL sessions (for debugging/troubleshooting)
  fastify.post('/admin/api/auth/nuke-all-sessions', async () => {
    // Get count before nuking
    const sessionsBefore = adminSessionsDb.getAll();
    const count = sessionsBefore.length;

    // Delete ALL sessions from database
    adminSessionsDb.invalidateAll();

    // Verify they're gone
    const sessionsAfter = adminSessionsDb.getAll();

    return {
      success: true,
      message: 'All sessions nuked',
      sessions_deleted: count,
      sessions_remaining: sessionsAfter.length,
      details: {
        before: sessionsBefore.map(s => ({ id: s.id, user_id: s.user_id, jti: s.token_jti })),
        after: sessionsAfter.map(s => ({ id: s.id, user_id: s.user_id, jti: s.token_jti }))
      }
    };
  });

  // Dashboard stats (authenticated)
  fastify.get('/admin/api/dashboard', { preHandler: adminAuthMiddleware }, async () => {
    const { settingsDb, mattersDb } = opts;
    const settings = settingsDb.getAll();
    const stats = mattersDb.getStats();
    const matters = mattersDb.getAll();

    const lastMatterDate = new Date(settings.last_matter_date || Date.now());
    const now = new Date();
    const daysSince = Math.floor((now - lastMatterDate) / (1000 * 60 * 60 * 24));

    const drainEnabled = settings.auto_drain_enabled === 'true';
    const drainRateCents = parseFloat(settings.drain_rate_cents_per_second || '50');
    const baseSpent = parseFloat(settings.lifetime_spent || '0');

    return {
      days_since: daysSince,
      last_matter_date: settings.last_matter_date,
      lifetime_spent: baseSpent,
      drain_enabled: drainEnabled,
      drain_rate_cents_per_second: drainRateCents,
      stats: {
        total_matters: stats.total,
        matters_this_year: stats.thisYear,
        max_streak: Math.max(stats.maxStreak, daysSince)
      },
      recent_matters: matters.slice(0, 10)
    };
  });
}
