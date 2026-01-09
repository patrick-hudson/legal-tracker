/**
 * Audit Log Tests
 *
 * Tests for audit log functionality including:
 * - Table creation
 * - Log entry creation at different levels
 * - Logging does not break main operations
 * - Entries created for CRUD operations
 * - Entries created for auth events
 * - API endpoints return paginated results
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../server.js';
import crypto from 'crypto';
import { hashPassword } from '../auth.js';

describe('Audit Log Tests', () => {
  let server;
  let baseURL;
  let adminCookie;
  const PASSWORD_SALT = 'test-salt-audit-log';

  before(async () => {
    process.env.PASSWORD_SALT = PASSWORD_SALT;

    server = await createServer({
      logger: false,
      dbPath: ':memory:',
      requireAuth: false,
      disableRateLimit: true
    });

    const address = await server.listen({ port: 0, host: '127.0.0.1' });
    const port = server.server.address().port;
    baseURL = `http://127.0.0.1:${port}`;

    // Create test admin user
    const username = 'auditadmin';
    const password = 'testpass123';
    const message = username + ':' + password + ':' + PASSWORD_SALT;
    const hashedPassword = crypto.createHash('sha256').update(message).digest('hex');
    const passwordHash = await hashPassword(hashedPassword);

    const { adminUsersDb } = server.db;
    adminUsersDb.create(username, passwordHash, 'audit@example.com');

    // Login to get session cookie
    const loginResponse = await fetch(`${baseURL}/admin/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, hashedPassword })
    });

    const setCookie = loginResponse.headers.get('set-cookie');
    adminCookie = setCookie.split(';')[0];
  });

  after(async () => {
    await server.close();
  });

  describe('Database Table', () => {
    it('should have audit_log table created', () => {
      const { auditLogDb } = server.db;
      assert.ok(auditLogDb, 'auditLogDb should be exposed');
      assert.strictEqual(typeof auditLogDb.create, 'function');
      assert.strictEqual(typeof auditLogDb.getById, 'function');
      assert.strictEqual(typeof auditLogDb.getAll, 'function');
    });
  });

  describe('Log Entry Creation', () => {
    it('should create INFO level entry with correct fields', () => {
      const { auditLogDb } = server.db;

      const result = auditLogDb.create({
        level: 'INFO',
        user_id: 1,
        username: 'testuser',
        action_type: 'create',
        entity_type: 'matter',
        entity_id: 123,
        summary: 'Test matter created',
        details: { test: true }
      });

      assert.ok(result.id);

      const entry = auditLogDb.getById(result.id);
      assert.strictEqual(entry.level, 'INFO');
      assert.strictEqual(entry.user_id, 1);
      assert.strictEqual(entry.username, 'testuser');
      assert.strictEqual(entry.action_type, 'create');
      assert.strictEqual(entry.entity_type, 'matter');
      assert.strictEqual(entry.entity_id, 123);
      assert.strictEqual(entry.summary, 'Test matter created');
      assert.deepStrictEqual(entry.details, { test: true });
    });

    it('should create WARNING level entry', () => {
      const { auditLogDb } = server.db;

      const result = auditLogDb.create({
        level: 'WARNING',
        action_type: 'warning',
        summary: 'Test warning'
      });

      const entry = auditLogDb.getById(result.id);
      assert.strictEqual(entry.level, 'WARNING');
    });

    it('should create ERROR level entry with stack trace', () => {
      const { auditLogDb } = server.db;

      const result = auditLogDb.create({
        level: 'ERROR',
        action_type: 'error',
        summary: 'Test error',
        stack_trace: 'Error: test\n  at test.js:1:1'
      });

      const entry = auditLogDb.getById(result.id);
      assert.strictEqual(entry.level, 'ERROR');
      assert.ok(entry.stack_trace);
    });
  });

  describe('Logging Failure Handling', () => {
    it('should not break main operation when logging succeeds', async () => {
      // Create a matter and verify it succeeds even with logging
      const response = await fetch(`${baseURL}/admin/api/matters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          matter_date: new Date().toISOString(),
          note: 'Test matter with audit logging',
          cost: 100
        })
      });

      assert.strictEqual(response.status, 201);
      const data = await response.json();
      assert.strictEqual(data.success, true);
    });
  });

  describe('Matter CRUD Logging', () => {
    let matterId;

    it('should log matter creation', async () => {
      const { auditLogDb } = server.db;
      const initialCount = auditLogDb.getCount();

      const response = await fetch(`${baseURL}/admin/api/matters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          matter_date: new Date().toISOString(),
          note: 'Audit test matter',
          cost: 250
        })
      });

      const data = await response.json();
      matterId = data.matter.id;

      const newCount = auditLogDb.getCount();
      assert.ok(newCount > initialCount, 'Should have created audit log entry');

      // Verify entry content
      const logs = auditLogDb.getAll({ entityType: 'matter', entityId: matterId });
      const createEntry = logs.entries.find(e => e.action_type === 'create');
      assert.ok(createEntry, 'Should have create entry');
      assert.strictEqual(createEntry.entity_id, matterId);
    });

    it('should log matter update', async () => {
      const { auditLogDb } = server.db;
      const initialCount = auditLogDb.getCount();

      await fetch(`${baseURL}/admin/api/matters/${matterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          matter_date: new Date().toISOString(),
          note: 'Updated audit test matter',
          cost: 300
        })
      });

      const newCount = auditLogDb.getCount();
      assert.ok(newCount > initialCount, 'Should have created audit log entry');

      const logs = auditLogDb.getAll({ entityType: 'matter', entityId: matterId });
      const updateEntry = logs.entries.find(e => e.action_type === 'update');
      assert.ok(updateEntry, 'Should have update entry');
    });

    it('should log matter deletion', async () => {
      const { auditLogDb } = server.db;
      const initialCount = auditLogDb.getCount();

      await fetch(`${baseURL}/admin/api/matters/${matterId}`, {
        method: 'DELETE',
        headers: { 'Cookie': adminCookie }
      });

      const newCount = auditLogDb.getCount();
      assert.ok(newCount > initialCount, 'Should have created audit log entry');

      const logs = auditLogDb.getAll({ entityType: 'matter', entityId: matterId });
      const deleteEntry = logs.entries.find(e => e.action_type === 'delete');
      assert.ok(deleteEntry, 'Should have delete entry');
    });
  });

  describe('Auth Event Logging', () => {
    it('should log successful login', async () => {
      const { auditLogDb } = server.db;
      const initialCount = auditLogDb.getCount();

      const username = 'auditadmin';
      const password = 'testpass123';
      const message = username + ':' + password + ':' + PASSWORD_SALT;
      const hashedPassword = crypto.createHash('sha256').update(message).digest('hex');

      await fetch(`${baseURL}/admin/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, hashedPassword })
      });

      const newCount = auditLogDb.getCount();
      assert.ok(newCount > initialCount, 'Should have created audit log entry');

      const logs = auditLogDb.getAll({ limit: 10 });
      const loginEntry = logs.entries.find(e => e.action_type === 'login');
      assert.ok(loginEntry, 'Should have login entry');
    });

    it('should log failed login', async () => {
      const { auditLogDb } = server.db;
      const initialCount = auditLogDb.getCount();

      const username = 'auditadmin';
      const message = username + ':wrongpassword:' + PASSWORD_SALT;
      const hashedPassword = crypto.createHash('sha256').update(message).digest('hex');

      await fetch(`${baseURL}/admin/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, hashedPassword })
      });

      const newCount = auditLogDb.getCount();
      assert.ok(newCount > initialCount, 'Should have created audit log entry');

      const logs = auditLogDb.getAll({ limit: 10 });
      const failedEntry = logs.entries.find(e => e.action_type === 'login_failed');
      assert.ok(failedEntry, 'Should have login_failed entry');
    });

    it('should log logout', async () => {
      const { auditLogDb } = server.db;
      const initialCount = auditLogDb.getCount();

      await fetch(`${baseURL}/admin/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({})
      });

      const newCount = auditLogDb.getCount();
      assert.ok(newCount > initialCount, 'Should have created audit log entry');

      const logs = auditLogDb.getAll({ limit: 10 });
      const logoutEntry = logs.entries.find(e => e.action_type === 'logout');
      assert.ok(logoutEntry, 'Should have logout entry');

      // Re-login to restore session for subsequent tests
      const username = 'auditadmin';
      const password = 'testpass123';
      const message = username + ':' + password + ':' + PASSWORD_SALT;
      const hashedPassword = crypto.createHash('sha256').update(message).digest('hex');

      const loginResponse = await fetch(`${baseURL}/admin/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, hashedPassword })
      });

      const setCookie = loginResponse.headers.get('set-cookie');
      adminCookie = setCookie.split(';')[0];
    });
  });

  describe('API Endpoints', () => {
    it('should return paginated audit log entries', async () => {
      const response = await fetch(`${baseURL}/admin/api/audit-log?page=1&limit=10`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();

      assert.ok(Array.isArray(data.entries));
      assert.ok(typeof data.total === 'number');
      assert.ok(typeof data.page === 'number');
      assert.ok(typeof data.limit === 'number');
      assert.ok(typeof data.totalPages === 'number');
    });

    it('should filter by level', async () => {
      const response = await fetch(`${baseURL}/admin/api/audit-log?level=INFO`, {
        headers: { 'Cookie': adminCookie }
      });

      const data = await response.json();
      assert.ok(data.entries.every(e => e.level === 'INFO'));
    });

    it('should get single audit log entry', async () => {
      // First get list to find an ID
      const listResponse = await fetch(`${baseURL}/admin/api/audit-log?limit=1`, {
        headers: { 'Cookie': adminCookie }
      });
      const listData = await listResponse.json();

      if (listData.entries.length > 0) {
        const entryId = listData.entries[0].id;

        const response = await fetch(`${baseURL}/admin/api/audit-log/${entryId}`, {
          headers: { 'Cookie': adminCookie }
        });

        assert.strictEqual(response.status, 200);
        const data = await response.json();
        assert.ok(data.entry);
        assert.strictEqual(data.entry.id, entryId);
      }
    });

    it('should return 404 for non-existent entry', async () => {
      const response = await fetch(`${baseURL}/admin/api/audit-log/999999`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 404);
    });

    it('should require authentication', async () => {
      const response = await fetch(`${baseURL}/admin/api/audit-log`);
      assert.strictEqual(response.status, 401);
    });
  });

  describe('Settings Change Logging', () => {
    it('should log settings changes', async () => {
      const { auditLogDb } = server.db;
      const initialCount = auditLogDb.getCount();

      await fetch(`${baseURL}/admin/api/settings/test_setting`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ value: 'test_value' })
      });

      const newCount = auditLogDb.getCount();
      assert.ok(newCount > initialCount, 'Should have created audit log entry');

      const logs = auditLogDb.getAll({ limit: 5 });
      const settingsEntry = logs.entries.find(e => e.action_type === 'settings_change');
      assert.ok(settingsEntry, 'Should have settings_change entry');
    });
  });
});
