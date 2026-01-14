import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../../server.js';
import { generateBootstrapToken, hashBootstrapToken, getBootstrapTokenExpiration } from '../../auth.js';

/**
 * Helper function to hash password client-side (same as client does)
 */
async function hashPasswordClientSide(username, password) {
  const crypto = await import('crypto');
  const PASSWORD_SALT = process.env.PASSWORD_SALT || 'legal-tracker-default-CHANGE-THIS';
  const message = username + ':' + password + ':' + PASSWORD_SALT;
  return crypto.default.createHash('sha256').update(message).digest('hex');
}

describe('Bootstrap and Wipe Everything Functionality', () => {
  let fastify;
  let authCookie;
  let adminUserId;

  beforeEach(async () => {
    // Create server with in-memory database for each test
    fastify = await createServer({ dbPath: ':memory:', logger: false, disableRateLimit: true });

    // Create an admin user for testing
    const { adminUsersDb } = fastify.db;
    const crypto = await import('crypto');
    const PASSWORD_SALT = 'test-salt';
    const username = 'testadmin';
    const password = 'TestPassword123!';
    const message = username + ':' + password + ':' + PASSWORD_SALT;
    const clientHash = crypto.default.createHash('sha256').update(message).digest('hex');

    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(clientHash, 12);

    const user = adminUsersDb.create(username, passwordHash, 'test@example.com');
    adminUserId = user.id;

    // Login to get auth cookie
    const loginResponse = await fastify.inject({
      method: 'POST',
      url: '/admin/api/auth/login',
      payload: { username, hashedPassword: clientHash }
    });

    assert.strictEqual(loginResponse.statusCode, 200);
    authCookie = loginResponse.headers['set-cookie'];
  });

  afterEach(async () => {
    await fastify.close();
  });

  describe('Bootstrap Status API', () => {
    test('should return needs_bootstrap=false when active admins exist', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/admin/api/bootstrap/status'
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.needs_bootstrap, false);
      assert.strictEqual(body.has_active_admins, true);
    });

    test('should return needs_bootstrap=true when no active admins and tokens exist', async () => {
      const { adminUsersDb, adminBootstrapTokensDb } = fastify.db;

      // Deactivate all admin users
      const users = adminUsersDb.getAll();
      users.forEach(u => adminUsersDb.setActive(u.id, false));

      // Create a bootstrap token
      const token = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(token);
      const expiresAt = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash, expiresAt);

      const response = await fastify.inject({
        method: 'GET',
        url: '/admin/api/bootstrap/status'
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.needs_bootstrap, true);
      assert.strictEqual(body.has_active_admins, false);
    });
  });

  describe('Bootstrap Setup API', () => {
    test('should reject bootstrap when active admins exist', async () => {
      const { adminBootstrapTokensDb } = fastify.db;

      const token = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(token);
      const expiresAt = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash, expiresAt);

      const hashedPassword = await hashPasswordClientSide('newadmin', 'StrongPassword123!');
      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token,
          username: 'newadmin',
          hashedPassword
        }
      });

      assert.strictEqual(response.statusCode, 403);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'FORBIDDEN');
      assert(body.message.includes('Active admin users already exist'));
    });

    test('should reject invalid password hash formats', async () => {
      const { adminUsersDb, adminBootstrapTokensDb } = fastify.db;

      // Deactivate all admins
      const users = adminUsersDb.getAll();
      users.forEach(u => adminUsersDb.setActive(u.id, false));

      const token = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(token);
      const expiresAt = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash, expiresAt);

      // Test invalid hash format (too short)
      let response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token,
          username: 'newadmin',
          hashedPassword: 'tooshort'
        }
      });

      assert.strictEqual(response.statusCode, 400);
      let body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'INVALID_PASSWORD');

      // Test invalid hash format (non-hex characters)
      response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token,
          username: 'newadmin',
          hashedPassword: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'
        }
      });

      assert.strictEqual(response.statusCode, 400);
      body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'INVALID_PASSWORD');
    });

    test('should reject invalid/expired tokens', async () => {
      const { adminUsersDb } = fastify.db;

      // Deactivate all admins
      const users = adminUsersDb.getAll();
      users.forEach(u => adminUsersDb.setActive(u.id, false));

      const hashedPassword = await hashPasswordClientSide('newadmin', 'StrongPassword123!');
      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token: 'invalid-token',
          username: 'newadmin',
          hashedPassword
        }
      });

      assert.strictEqual(response.statusCode, 401);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'INVALID_TOKEN');
    });

    test('should reject used tokens', async () => {
      const { adminUsersDb, adminBootstrapTokensDb } = fastify.db;

      // Deactivate all admins
      const users = adminUsersDb.getAll();
      users.forEach(u => adminUsersDb.setActive(u.id, false));

      const token = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(token);
      const expiresAt = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash, expiresAt);

      // First use - should succeed
      let hashedPassword = await hashPasswordClientSide('firstadmin', 'StrongPassword123!');
      let response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token,
          username: 'firstadmin',
          hashedPassword
        }
      });

      assert.strictEqual(response.statusCode, 200);

      // Deactivate the newly created admin to test reuse
      const newUser = adminUsersDb.getByUsername('firstadmin');
      adminUsersDb.setActive(newUser.id, false);

      // Second use - should fail
      hashedPassword = await hashPasswordClientSide('secondadmin', 'StrongPassword123!');
      response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token,
          username: 'secondadmin',
          hashedPassword
        }
      });

      assert.strictEqual(response.statusCode, 401);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'TOKEN_USED');
    });

    test('should successfully create admin with valid token', async () => {
      const { adminUsersDb, adminBootstrapTokensDb } = fastify.db;

      // Deactivate all admins
      const users = adminUsersDb.getAll();
      users.forEach(u => adminUsersDb.setActive(u.id, false));

      const token = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(token);
      const expiresAt = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash, expiresAt);

      const hashedPassword = await hashPasswordClientSide('bootstrapadmin', 'VeryStrongPassword123!');
      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token,
          username: 'bootstrapadmin',
          hashedPassword
        }
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.username, 'bootstrapadmin');

      // Verify user was created
      const newUser = adminUsersDb.getByUsername('bootstrapadmin');
      assert(newUser);
      assert.strictEqual(newUser.is_active, 1);

      // Verify token was marked as used
      const tokenRecord = adminBootstrapTokensDb.getByTokenHash(tokenHash);
      assert(tokenRecord.used_at);
      assert.strictEqual(tokenRecord.is_active, 0);
    });

    test('should reject username less than 3 characters', async () => {
      const { adminUsersDb, adminBootstrapTokensDb } = fastify.db;

      // Deactivate all admins
      const users = adminUsersDb.getAll();
      users.forEach(u => adminUsersDb.setActive(u.id, false));

      const token = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(token);
      const expiresAt = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash, expiresAt);

      const hashedPassword = await hashPasswordClientSide('ab', 'StrongPassword123!');
      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token,
          username: 'ab',
          hashedPassword
        }
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'INVALID_USERNAME');
    });
  });

  describe('Bootstrap Token Validation API', () => {
    test('should return valid=true for active unused token', async () => {
      const { adminBootstrapTokensDb } = fastify.db;

      const token = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(token);
      const expiresAt = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash, expiresAt);

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/validate-token',
        payload: { token }
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.valid, true);
      assert(body.expires_at);
    });

    test('should return error for invalid token', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/validate-token',
        payload: { token: 'invalid-token-that-does-not-exist' }
      });

      assert.strictEqual(response.statusCode, 401);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.valid, false);
      assert.strictEqual(body.error, 'INVALID_TOKEN');
    });

    test('should return error for used token', async () => {
      const { adminBootstrapTokensDb } = fastify.db;

      const token = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(token);
      const expiresAt = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash, expiresAt);

      // Mark token as used
      adminBootstrapTokensDb.markAsUsed(tokenHash, '127.0.0.1');

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/validate-token',
        payload: { token }
      });

      assert.strictEqual(response.statusCode, 401);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.valid, false);
      assert.strictEqual(body.error, 'TOKEN_USED');
    });

    test('should return error for expired token', async () => {
      const { adminBootstrapTokensDb } = fastify.db;

      const token = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(token);
      // Create token that expired 1 hour ago
      const expiresAt = new Date(Date.now() - 3600000).toISOString();
      adminBootstrapTokensDb.create(tokenHash, expiresAt);

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/validate-token',
        payload: { token }
      });

      assert.strictEqual(response.statusCode, 401);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.valid, false);
      assert.strictEqual(body.error, 'TOKEN_EXPIRED');
    });

    test('should return error when no token provided', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/validate-token',
        payload: {}
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'BAD_REQUEST');
    });

    test('should not consume the token when validating', async () => {
      const { adminBootstrapTokensDb } = fastify.db;

      const token = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(token);
      const expiresAt = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash, expiresAt);

      // Validate twice - should succeed both times
      let response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/validate-token',
        payload: { token }
      });
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(JSON.parse(response.body).valid, true);

      response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/validate-token',
        payload: { token }
      });
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(JSON.parse(response.body).valid, true);

      // Token should still be unused
      const tokenRecord = adminBootstrapTokensDb.getByTokenHash(tokenHash);
      assert.strictEqual(tokenRecord.used_at, null);
      assert.strictEqual(tokenRecord.is_active, 1);
    });
  });

  describe('Wipe Everything API', () => {
    test('should reject wipe without auth', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe',
        payload: { confirmation: 'WIPE EVERYTHING' }
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject wipe with wrong confirmation string', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'DELETE ALL DATA' }
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'BAD_REQUEST');
      assert(body.message.includes('WIPE EVERYTHING'));
    });

    test('should successfully wipe all data with correct confirmation', async () => {
      const { mattersDb, settingsDb } = fastify.db;

      // Add some test data
      mattersDb.add(new Date().toISOString(), 'Test matter 1', 10, 10000);
      mattersDb.add(new Date().toISOString(), 'Test matter 2', 5, 20000);
      settingsDb.set('lifetime_spent', '30000');

      // Verify data exists
      assert.strictEqual(mattersDb.getAll().length, 2);
      assert.strictEqual(settingsDb.get('lifetime_spent'), '30000');

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE EVERYTHING' }
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.matters_deleted, 2);
      assert.strictEqual(body.settings_reset, true);

      // Verify data was wiped
      assert.strictEqual(mattersDb.getAll().length, 0);
      assert.strictEqual(settingsDb.get('lifetime_spent'), '0');
    });

    test('should delete all admin users including current user', async () => {
      const { adminUsersDb } = fastify.db;

      // Create additional admin users
      const bcrypt = await import('bcrypt');
      const hash1 = await bcrypt.hash('password1', 12);
      const hash2 = await bcrypt.hash('password2', 12);

      adminUsersDb.create('admin2', hash1, null);
      adminUsersDb.create('admin3', hash2, null);

      // Verify 3 active admins exist
      let allAdmins = adminUsersDb.getAll();
      assert.strictEqual(allAdmins.length, 3);

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE EVERYTHING' }
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.admins_deleted, 3);

      // Verify ALL admins are deleted
      allAdmins = adminUsersDb.getAll();
      assert.strictEqual(allAdmins.length, 0);
    });

    test('should invalidate all sessions', async () => {
      const { adminSessionsDb } = fastify.db;

      // Create additional sessions
      adminSessionsDb.create(adminUserId, 'jti-1', new Date(Date.now() + 86400000).toISOString());
      adminSessionsDb.create(adminUserId, 'jti-2', new Date(Date.now() + 86400000).toISOString());

      const sessionsBefore = adminSessionsDb.getAll();
      assert(sessionsBefore.length > 0);

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE EVERYTHING' }
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert(body.sessions_invalidated > 0);

      const sessionsAfter = adminSessionsDb.getAll();
      assert.strictEqual(sessionsAfter.length, 0);
    });

    test('should invalidate old bootstrap tokens and create a new one', async () => {
      const { adminBootstrapTokensDb } = fastify.db;

      // Create some old bootstrap tokens
      const token1 = generateBootstrapToken();
      const tokenHash1 = hashBootstrapToken(token1);
      const expiresAt1 = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash1, expiresAt1);

      const token2 = generateBootstrapToken();
      const tokenHash2 = hashBootstrapToken(token2);
      const expiresAt2 = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash2, expiresAt2);

      assert(adminBootstrapTokensDb.hasActiveTokens());

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE EVERYTHING' }
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);

      // Verify old tokens are invalidated but a new one is created
      assert(adminBootstrapTokensDb.hasActiveTokens());
      const activeTokens = adminBootstrapTokensDb.getActiveTokens();
      assert.strictEqual(activeTokens.length, 1);

      // Verify response includes bootstrap token and URL
      assert(body.bootstrap_token);
      assert(body.bootstrap_url);
      assert(body.bootstrap_url.includes('/admin/bootstrap.html?token='));
    });

    test('should reset settings to defaults', async () => {
      const { settingsDb } = fastify.db;

      // Set some custom values
      settingsDb.set('lifetime_spent', '999999');
      settingsDb.set('drain_rate_cents_per_second', '100');
      settingsDb.set('auto_drain_enabled', 'true');

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE EVERYTHING' }
      });

      assert.strictEqual(response.statusCode, 200);

      // Verify defaults are restored (drain_rate=0, auto_drain=false)
      assert.strictEqual(settingsDb.get('lifetime_spent'), '0');
      assert.strictEqual(settingsDb.get('drain_rate_cents_per_second'), '0');
      assert.strictEqual(settingsDb.get('auto_drain_enabled'), 'false');
      assert(settingsDb.get('drain_start_time')); // Should be set to current time
      assert(settingsDb.get('last_matter_date')); // Should be set to current time
    });
  });

  describe('Wipe Matters API', () => {
    test('should reject wipe matters without auth', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters',
        payload: { confirmation: 'WIPE MATTERS' }
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject wipe matters with wrong confirmation string', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'DELETE MATTERS' }
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'BAD_REQUEST');
      assert(body.message.includes('WIPE MATTERS'));
    });

    test('should successfully wipe all matters with correct confirmation', async () => {
      const { mattersDb } = fastify.db;

      // Add some test matters
      mattersDb.add(new Date().toISOString(), 'Test matter 1', 10, 10000);
      mattersDb.add(new Date().toISOString(), 'Test matter 2', 5, 20000);
      mattersDb.add(new Date().toISOString(), 'Test matter 3', 3, 15000);

      // Verify matters exist
      assert.strictEqual(mattersDb.getAll().length, 3);

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE MATTERS' }
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.matters_deleted, 3);

      // Verify matters were wiped
      assert.strictEqual(mattersDb.getAll().length, 0);
    });

    test('should reset last_matter_date setting', async () => {
      const { mattersDb, settingsDb } = fastify.db;

      // Set a last_matter_date
      settingsDb.set('last_matter_date', '2024-01-15T12:00:00.000Z');

      // Add a matter
      mattersDb.add(new Date().toISOString(), 'Test matter', 10, 10000);

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE MATTERS' }
      });

      assert.strictEqual(response.statusCode, 200);

      // Verify last_matter_date was reset (null or 'null' string depending on db implementation)
      const lastMatterDate = settingsDb.get('last_matter_date');
      assert(lastMatterDate === null || lastMatterDate === 'null', `Expected null but got: ${lastMatterDate}`);
    });

    test('should preserve admin users and sessions', async () => {
      const { mattersDb, adminUsersDb, adminSessionsDb } = fastify.db;

      // Add some matters
      mattersDb.add(new Date().toISOString(), 'Test matter', 10, 10000);

      // Count admins and sessions before
      const adminsBefore = adminUsersDb.getAll().length;
      const sessionsBefore = adminSessionsDb.getAll().length;

      assert(adminsBefore > 0);
      assert(sessionsBefore > 0);

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE MATTERS' }
      });

      assert.strictEqual(response.statusCode, 200);

      // Verify admins and sessions are preserved
      assert.strictEqual(adminUsersDb.getAll().length, adminsBefore);
      assert.strictEqual(adminSessionsDb.getAll().length, sessionsBefore);
    });

    test('should preserve other settings', async () => {
      const { mattersDb, settingsDb } = fastify.db;

      // Set some custom settings
      settingsDb.set('lifetime_spent_cents', '50000');
      settingsDb.set('drain_rate_cents_per_second', '75');
      settingsDb.set('auto_drain_enabled', 'false');

      // Add a matter
      mattersDb.add(new Date().toISOString(), 'Test matter', 10, 10000);

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE MATTERS' }
      });

      assert.strictEqual(response.statusCode, 200);

      // Verify other settings are preserved
      assert.strictEqual(settingsDb.get('lifetime_spent_cents'), '50000');
      assert.strictEqual(settingsDb.get('drain_rate_cents_per_second'), '75');
      assert.strictEqual(settingsDb.get('auto_drain_enabled'), 'false');
    });

    test('should handle empty matters gracefully', async () => {
      const { mattersDb } = fastify.db;

      // Ensure no matters exist
      assert.strictEqual(mattersDb.getAll().length, 0);

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE MATTERS' }
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.matters_deleted, 0);
    });
  });

  describe('Wipe Matters and Settings API', () => {
    test('should reject wipe matters and settings without auth', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters-and-settings',
        payload: { confirmation: 'WIPE SETTINGS' }
      });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should reject wipe with wrong confirmation string', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters-and-settings',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE MATTERS' }
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'BAD_REQUEST');
      assert(body.message.includes('WIPE SETTINGS'));
    });

    test('should successfully wipe matters and reset settings', async () => {
      const { mattersDb, settingsDb } = fastify.db;

      // Add some test data
      mattersDb.add(new Date().toISOString(), 'Test matter 1', 10, 10000);
      mattersDb.add(new Date().toISOString(), 'Test matter 2', 5, 20000);
      settingsDb.set('lifetime_spent', '50000');
      settingsDb.set('drain_rate_cents_per_second', '100');
      settingsDb.set('auto_drain_enabled', 'true');

      // Verify data exists
      assert.strictEqual(mattersDb.getAll().length, 2);
      assert.strictEqual(settingsDb.get('lifetime_spent'), '50000');
      assert.strictEqual(settingsDb.get('drain_rate_cents_per_second'), '100');
      assert.strictEqual(settingsDb.get('auto_drain_enabled'), 'true');

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters-and-settings',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE SETTINGS' }
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.matters_deleted, 2);
      assert.strictEqual(body.settings_reset, true);

      // Verify matters were wiped
      assert.strictEqual(mattersDb.getAll().length, 0);

      // Verify settings were reset to defaults (drain_rate=0, auto_drain=false)
      assert.strictEqual(settingsDb.get('lifetime_spent'), '0');
      assert.strictEqual(settingsDb.get('drain_rate_cents_per_second'), '0');
      assert.strictEqual(settingsDb.get('auto_drain_enabled'), 'false');
      assert(settingsDb.get('drain_start_time')); // Should be set to current time
    });

    test('should preserve admin users and sessions', async () => {
      const { mattersDb, adminUsersDb, adminSessionsDb } = fastify.db;

      // Add some matters
      mattersDb.add(new Date().toISOString(), 'Test matter', 10, 10000);

      // Count admins and sessions before
      const adminsBefore = adminUsersDb.getAll().length;
      const sessionsBefore = adminSessionsDb.getAll().length;

      assert(adminsBefore > 0);
      assert(sessionsBefore > 0);

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters-and-settings',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE SETTINGS' }
      });

      assert.strictEqual(response.statusCode, 200);

      // Verify admins and sessions are preserved
      assert.strictEqual(adminUsersDb.getAll().length, adminsBefore);
      assert.strictEqual(adminSessionsDb.getAll().length, sessionsBefore);
    });

    test('should reset last_matter_date to null', async () => {
      const { mattersDb, settingsDb } = fastify.db;

      // Set a last_matter_date
      settingsDb.set('last_matter_date', '2024-01-15T12:00:00.000Z');

      // Add a matter
      mattersDb.add(new Date().toISOString(), 'Test matter', 10, 10000);

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters-and-settings',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE SETTINGS' }
      });

      assert.strictEqual(response.statusCode, 200);

      // Verify last_matter_date was reset
      const lastMatterDate = settingsDb.get('last_matter_date');
      assert(lastMatterDate === null || lastMatterDate === 'null', `Expected null but got: ${lastMatterDate}`);
    });

    test('should handle empty matters gracefully', async () => {
      const { mattersDb, settingsDb } = fastify.db;

      // Ensure no matters exist
      assert.strictEqual(mattersDb.getAll().length, 0);

      // Set some non-default settings
      settingsDb.set('lifetime_spent', '99999');

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters-and-settings',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE SETTINGS' }
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.matters_deleted, 0);
      assert.strictEqual(body.settings_reset, true);

      // Settings should still be reset
      assert.strictEqual(settingsDb.get('lifetime_spent'), '0');
    });

    test('should allow existing user to still authenticate after wipe', async () => {
      const { mattersDb, settingsDb } = fastify.db;

      // Add data and modify settings
      mattersDb.add(new Date().toISOString(), 'Test matter', 10, 10000);
      settingsDb.set('lifetime_spent', '50000');

      // Perform wipe
      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters-and-settings',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE SETTINGS' }
      });

      assert.strictEqual(response.statusCode, 200);

      // Verify user can still make authenticated requests
      const meResponse = await fastify.inject({
        method: 'GET',
        url: '/admin/api/auth/me',
        headers: {
          cookie: authCookie
        }
      });

      assert.strictEqual(meResponse.statusCode, 200);
      const meBody = JSON.parse(meResponse.body);
      assert(meBody.user, 'Response should contain user object');
      assert.strictEqual(meBody.user.username, 'testadmin');
    });
  });

  describe('Integration: Wipe to Bootstrap Flow', () => {
    test('should create bootstrap token when fresh DB on startup', async () => {
      // Create a fresh server with no admins
      const freshServer = await createServer({ dbPath: ':memory:', logger: false, disableRateLimit: true });
      const { adminUsersDb, adminBootstrapTokensDb } = freshServer.db;

      // Deactivate all admins
      const users = adminUsersDb.getAll();
      users.forEach(u => adminUsersDb.setActive(u.id, false));

      // Manually create a bootstrap token (simulating server startup)
      const token = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(token);
      const expiresAt = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash, expiresAt);

      // Verify bootstrap is needed
      let response = await freshServer.inject({
        method: 'GET',
        url: '/admin/api/bootstrap/status'
      });

      assert.strictEqual(response.statusCode, 200);
      let body = JSON.parse(response.body);
      assert.strictEqual(body.needs_bootstrap, true);

      // Use bootstrap to create admin
      const hashedPassword = await hashPasswordClientSide('firstadmin', 'SuperSecurePassword123!');
      response = await freshServer.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token,
          username: 'firstadmin',
          hashedPassword
        }
      });

      assert.strictEqual(response.statusCode, 200);
      body = JSON.parse(response.body);
      assert.strictEqual(body.success, true);

      // Verify bootstrap is no longer needed
      response = await freshServer.inject({
        method: 'GET',
        url: '/admin/api/bootstrap/status'
      });

      assert.strictEqual(response.statusCode, 200);
      body = JSON.parse(response.body);
      assert.strictEqual(body.needs_bootstrap, false);
      assert.strictEqual(body.has_active_admins, true);

      await freshServer.close();
    });
  });

  describe('Wipe Matters and Settings - Extended Tests', () => {
    test('should wipe attachments when wiping matters and settings', async () => {
      const { mattersDb, attachmentsDb } = fastify.db;

      // Create a matter with an attachment
      const matter = mattersDb.add(new Date().toISOString(), 'Test matter with attachment', 10, 10000);
      attachmentsDb.create(
        matter.id,
        'test.pdf',
        'application/pdf',
        1024,
        'filesystem',
        'test/key/123.pdf',
        adminUserId
      );

      // Verify attachment exists
      const attachmentsBefore = attachmentsDb.getByMatterId(matter.id);
      assert.strictEqual(attachmentsBefore.length, 1);

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters-and-settings',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE SETTINGS' }
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.attachments_deleted, 1);

      // Verify no attachments remain (check by querying all)
      const allAttachments = attachmentsDb.getByMatterId(matter.id);
      assert.strictEqual(allAttachments.length, 0);
    });

    test('should reset ID sequences after wipe', async () => {
      const { mattersDb } = fastify.db;

      // Create several matters
      mattersDb.add(new Date().toISOString(), 'Matter 1', 10, 10000);
      mattersDb.add(new Date().toISOString(), 'Matter 2', 10, 10000);
      mattersDb.add(new Date().toISOString(), 'Matter 3', 10, 10000);

      // Verify matters have IDs > 1
      const mattersBefore = mattersDb.getAll();
      assert.ok(mattersBefore.length >= 3);

      // Perform wipe
      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters-and-settings',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE SETTINGS' }
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.sequences_reset, true);

      // Create a new matter - should get ID 1
      const newMatter = mattersDb.add(new Date().toISOString(), 'New Matter After Wipe', 5, 5000);
      assert.strictEqual(newMatter.id, 1);
    });

    test('should clear audit log except wipe action after wipe', async () => {
      const { mattersDb, auditLogDb } = fastify.db;

      // Create some matters to generate audit log entries
      mattersDb.add(new Date().toISOString(), 'Matter 1', 10, 10000);
      mattersDb.add(new Date().toISOString(), 'Matter 2', 10, 10000);

      // Verify audit log has entries
      const auditCountBefore = auditLogDb.getCount();
      assert.ok(auditCountBefore > 0, 'Should have audit log entries before wipe');

      // Perform wipe
      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters-and-settings',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE SETTINGS' }
      });

      assert.strictEqual(response.statusCode, 200);

      // Audit log should have exactly 1 entry (the wipe action)
      const auditCountAfter = auditLogDb.getCount();
      assert.strictEqual(auditCountAfter, 1, 'Audit log should have exactly 1 entry (the wipe action)');

      // The remaining entry should be the wipe action
      const { entries } = auditLogDb.getAll({ limit: 10 });
      assert.strictEqual(entries.length, 1);
      assert.strictEqual(entries[0].action_type, 'data_wipe');
      assert.ok(entries[0].summary.includes('Wiped'));
    });

    test('should preserve wipe action user info in audit log', async () => {
      const { auditLogDb } = fastify.db;

      // Perform wipe
      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters-and-settings',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE SETTINGS' }
      });

      assert.strictEqual(response.statusCode, 200);

      // Check the wipe audit log entry has correct user info
      const { entries } = auditLogDb.getAll({ limit: 1 });
      assert.strictEqual(entries.length, 1);
      assert.strictEqual(entries[0].username, 'testadmin');
      assert.ok(entries[0].user_id);
    });
  });

  describe('Wipe Matters - Extended Tests', () => {
    test('should wipe attachments when wiping matters only', async () => {
      const { mattersDb, attachmentsDb } = fastify.db;

      // Create a matter with an attachment
      const matter = mattersDb.add(new Date().toISOString(), 'Test matter with attachment', 10, 10000);
      attachmentsDb.create(
        matter.id,
        'test.pdf',
        'application/pdf',
        1024,
        'filesystem',
        'test/key/456.pdf',
        adminUserId
      );

      // Verify attachment exists
      const attachmentsBefore = attachmentsDb.getByMatterId(matter.id);
      assert.strictEqual(attachmentsBefore.length, 1);

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE MATTERS' }
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.attachments_deleted, 1);

      // Verify no attachments remain
      const allAttachments = attachmentsDb.getByMatterId(matter.id);
      assert.strictEqual(allAttachments.length, 0);
    });

    test('should wipe private notes when wiping matters', async () => {
      const { mattersDb, privateNotesDb } = fastify.db;

      // Create a matter with private notes
      const matter = mattersDb.add(new Date().toISOString(), 'Test matter with notes', 10, 10000);
      privateNotesDb.create(matter.id, 'Private note 1', adminUserId);
      privateNotesDb.create(matter.id, 'Private note 2', adminUserId);

      // Verify notes exist
      const notesBefore = privateNotesDb.getByMatterId(matter.id);
      assert.strictEqual(notesBefore.length, 2);

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe-matters',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE MATTERS' }
      });

      assert.strictEqual(response.statusCode, 200);

      // Verify no notes remain
      const notesAfter = privateNotesDb.getByMatterId(matter.id);
      assert.strictEqual(notesAfter.length, 0);
    });
  });
});
