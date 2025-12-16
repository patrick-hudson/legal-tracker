import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../server.js';
import { generateBootstrapToken, hashBootstrapToken, getBootstrapTokenExpiration } from '../auth.js';

describe('Bootstrap and Wipe Everything Functionality', () => {
  let fastify;
  let authCookie;
  let adminUserId;

  beforeEach(async () => {
    // Create server with in-memory database for each test
    fastify = await createServer({ dbPath: ':memory:', logger: false });

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

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token,
          username: 'newadmin',
          password: 'StrongPassword123!'
        }
      });

      assert.strictEqual(response.statusCode, 403);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'FORBIDDEN');
      assert(body.message.includes('Active admin users already exist'));
    });

    test('should reject weak passwords', async () => {
      const { adminUsersDb, adminBootstrapTokensDb } = fastify.db;

      // Deactivate all admins
      const users = adminUsersDb.getAll();
      users.forEach(u => adminUsersDb.setActive(u.id, false));

      const token = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(token);
      const expiresAt = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash, expiresAt);

      // Test too short password
      let response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token,
          username: 'newadmin',
          password: 'weak'
        }
      });

      assert.strictEqual(response.statusCode, 400);
      let body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'WEAK_PASSWORD');

      // Test password without enough criteria
      response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token,
          username: 'newadmin',
          password: 'alllowercase123'
        }
      });

      assert.strictEqual(response.statusCode, 400);
      body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'WEAK_PASSWORD');
    });

    test('should reject invalid/expired tokens', async () => {
      const { adminUsersDb } = fastify.db;

      // Deactivate all admins
      const users = adminUsersDb.getAll();
      users.forEach(u => adminUsersDb.setActive(u.id, false));

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token: 'invalid-token',
          username: 'newadmin',
          password: 'StrongPassword123!'
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
      let response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token,
          username: 'firstadmin',
          password: 'StrongPassword123!'
        }
      });

      assert.strictEqual(response.statusCode, 200);

      // Deactivate the newly created admin to test reuse
      const newUser = adminUsersDb.getByUsername('firstadmin');
      adminUsersDb.setActive(newUser.id, false);

      // Second use - should fail
      response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token,
          username: 'secondadmin',
          password: 'StrongPassword123!'
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

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token,
          username: 'bootstrapadmin',
          password: 'VeryStrongPassword123!'
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

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token,
          username: 'ab',
          password: 'StrongPassword123!'
        }
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.error, 'INVALID_USERNAME');
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
      settingsDb.set('drain_rate_cents', '100');
      settingsDb.set('drain_enabled', 'false');

      const response = await fastify.inject({
        method: 'POST',
        url: '/admin/api/data/wipe',
        headers: {
          cookie: authCookie
        },
        payload: { confirmation: 'WIPE EVERYTHING' }
      });

      assert.strictEqual(response.statusCode, 200);

      // Verify defaults are restored
      assert.strictEqual(settingsDb.get('lifetime_spent'), '0');
      assert.strictEqual(settingsDb.get('drain_rate_cents'), '50');
      assert.strictEqual(settingsDb.get('drain_enabled'), 'true');
      assert(settingsDb.get('drain_start_time')); // Should be set to current time
      assert(settingsDb.get('last_matter_date')); // Should be set to current time
    });
  });

  describe('Integration: Wipe to Bootstrap Flow', () => {
    test('should create bootstrap token when fresh DB on startup', async () => {
      // Create a fresh server with no admins
      const freshServer = await createServer({ dbPath: ':memory:', logger: false });
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
      response = await freshServer.inject({
        method: 'POST',
        url: '/admin/api/bootstrap/setup',
        payload: {
          token,
          username: 'firstadmin',
          password: 'SuperSecurePassword123!'
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
});
