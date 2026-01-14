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
import { createServer } from '../../server.js';
import crypto from 'crypto';
import { hashPassword } from '../../auth.js';
import { logDebug, initAudit, ENTITY_TYPES, ACTION_TYPES } from '../../audit.js';

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

  describe('Debug Mode Logging', () => {
    it('should not create DEBUG entries when debug mode is off (default)', async () => {
      const { auditLogDb, settingsDb } = server.db;

      // Ensure debug mode is off (INFO level)
      settingsDb.set('audit_log_level', 'INFO');

      // Re-init audit with current settings
      initAudit(server.db);

      const initialCount = auditLogDb.getCount();

      // Try to create a DEBUG level entry using logDebug (should be filtered)
      logDebug({
        actionType: ACTION_TYPES.API_CALL,
        entityType: ENTITY_TYPES.CLAUDE_API,
        summary: 'Debug test entry that should be filtered'
      });

      const newCount = auditLogDb.getCount();
      // DEBUG entry should NOT be created when level is INFO
      assert.strictEqual(newCount, initialCount, 'DEBUG entry should not be created when debug mode is off');
    });

    it('should create DEBUG entries when debug mode is on', async () => {
      const { auditLogDb, settingsDb } = server.db;

      // Enable debug mode
      settingsDb.set('audit_log_level', 'DEBUG');

      // Re-init audit with current settings
      initAudit(server.db);

      const initialCount = auditLogDb.getCount();

      // Create a DEBUG level entry using logDebug
      logDebug({
        actionType: ACTION_TYPES.API_CALL,
        entityType: ENTITY_TYPES.CLAUDE_API,
        summary: 'Debug test entry when enabled',
        request: { model: 'claude-3', messages: [] },
        response: { id: 'test-123', usage: { input_tokens: 100 } },
        durationMs: 500
      });

      const newCount = auditLogDb.getCount();
      assert.ok(newCount > initialCount, 'DEBUG entry should be created when debug mode is on');

      // Find the entry we just created
      const logs = auditLogDb.getAll({ level: 'DEBUG', limit: 1 });
      const entry = logs.entries.find(e => e.summary === 'Debug test entry when enabled');
      assert.ok(entry, 'Should find the debug entry');
      assert.strictEqual(entry.level, 'DEBUG');
      assert.strictEqual(entry.entity_type, 'claude_api');
      assert.deepStrictEqual(entry.request, { model: 'claude-3', messages: [] });
      assert.deepStrictEqual(entry.response, { id: 'test-123', usage: { input_tokens: 100 } });
      assert.strictEqual(entry.duration_ms, 500);

      // Reset to INFO level
      settingsDb.set('audit_log_level', 'INFO');
      initAudit(server.db);
    });

    it('should store request and response JSON correctly', async () => {
      const { auditLogDb, settingsDb } = server.db;

      // Enable debug mode
      settingsDb.set('audit_log_level', 'DEBUG');
      initAudit(server.db);

      const testRequest = {
        model: 'claude-3-sonnet',
        max_tokens: 4096,
        messages: [{ role: 'user', content: 'Test prompt' }]
      };

      const testResponse = {
        id: 'msg_12345',
        model: 'claude-3-sonnet',
        stopReason: 'end_turn',
        usage: { input_tokens: 50, output_tokens: 200 },
        contentLength: 1500
      };

      logDebug({
        actionType: ACTION_TYPES.API_CALL,
        entityType: ENTITY_TYPES.CLAUDE_API,
        summary: 'Claude API response: claude-3-sonnet (1234ms)',
        request: testRequest,
        response: testResponse,
        durationMs: 1234
      });

      // Find the entry
      const logs = auditLogDb.getAll({ level: 'DEBUG', limit: 5 });
      const entry = logs.entries.find(e => e.summary.includes('Claude API response: claude-3-sonnet'));

      assert.ok(entry, 'Should find the entry');
      // Verify JSON was stored and retrieved correctly
      assert.deepStrictEqual(entry.request, testRequest);
      assert.deepStrictEqual(entry.response, testResponse);
      assert.strictEqual(entry.duration_ms, 1234);

      // Reset
      settingsDb.set('audit_log_level', 'INFO');
      initAudit(server.db);
    });

    it('should create DEBUG entries with correct storage operation format', async () => {
      const { auditLogDb, settingsDb } = server.db;

      // Enable debug mode
      settingsDb.set('audit_log_level', 'DEBUG');
      initAudit(server.db);

      logDebug({
        actionType: ACTION_TYPES.API_CALL,
        entityType: ENTITY_TYPES.ATTACHMENT,
        summary: 'Storage putObject: uuid/file.pdf (12345 bytes, 50ms)',
        request: { operation: 'putObject', key: 'uuid/file.pdf', contentType: 'application/pdf' },
        response: { sizeBytes: 12345 },
        durationMs: 50
      });

      const logs = auditLogDb.getAll({ level: 'DEBUG', limit: 5 });
      const entry = logs.entries.find(e => e.summary.includes('Storage putObject'));

      assert.ok(entry, 'Should find the storage entry');
      assert.strictEqual(entry.entity_type, 'attachment');
      assert.strictEqual(entry.request.operation, 'putObject');

      // Reset
      settingsDb.set('audit_log_level', 'INFO');
      initAudit(server.db);
    });

    it('should filter DEBUG entries in API response when level filter is applied', async () => {
      const { settingsDb, auditLogDb } = server.db;

      // Enable debug mode and create some entries
      settingsDb.set('audit_log_level', 'DEBUG');
      initAudit(server.db);

      logDebug({
        actionType: ACTION_TYPES.API_CALL,
        summary: 'Debug entry for filter test'
      });

      // Also create an INFO entry directly (these always log)
      auditLogDb.create({
        level: 'INFO',
        action_type: 'create',
        summary: 'Info entry for filter test'
      });

      // Test API filter for DEBUG only
      const debugResponse = await fetch(`${baseURL}/admin/api/audit-log?level=DEBUG`, {
        headers: { 'Cookie': adminCookie }
      });

      const debugData = await debugResponse.json();
      assert.ok(debugData.entries.every(e => e.level === 'DEBUG'), 'All entries should be DEBUG level');

      // Test API filter for INFO only
      const infoResponse = await fetch(`${baseURL}/admin/api/audit-log?level=INFO`, {
        headers: { 'Cookie': adminCookie }
      });

      const infoData = await infoResponse.json();
      assert.ok(infoData.entries.every(e => e.level === 'INFO'), 'All entries should be INFO level');

      // Reset
      settingsDb.set('audit_log_level', 'INFO');
      initAudit(server.db);
    });

    it('should still log ERROR entries regardless of debug mode setting', async () => {
      const { auditLogDb, settingsDb } = server.db;

      // Set to INFO (debug mode off)
      settingsDb.set('audit_log_level', 'INFO');
      initAudit(server.db);

      const initialCount = auditLogDb.getCount();

      // ERROR entries should always be logged (use direct create since logError would also work)
      const result = auditLogDb.create({
        level: 'ERROR',
        action_type: 'error',
        summary: 'Test error with debug off',
        stack_trace: 'Error: test'
      });

      const newCount = auditLogDb.getCount();
      assert.ok(newCount > initialCount, 'ERROR entry should always be created');

      const entry = auditLogDb.getById(result.id);
      assert.strictEqual(entry.level, 'ERROR');
    });
  });

  describe('Advanced Filtering', () => {
    beforeEach(() => {
      // Create some test entries with different attributes for filtering
      const { auditLogDb } = server.db;

      // Clear existing test entries by creating new identifiable ones
      auditLogDb.create({
        level: 'ERROR',
        user_id: 1,
        username: 'admin',
        action_type: 'login_failed',
        entity_type: 'user',
        summary: 'Failed login attempt for search test'
      });

      auditLogDb.create({
        level: 'WARNING',
        user_id: 1,
        username: 'testuser',
        action_type: 'update',
        entity_type: 'matter',
        entity_id: 100,
        summary: 'Matter warning for search test'
      });

      auditLogDb.create({
        level: 'INFO',
        user_id: 2,
        username: 'admin',
        action_type: 'create',
        entity_type: 'matter',
        entity_id: 101,
        summary: 'Matter created for search test'
      });
    });

    it('should filter by multiple levels', async () => {
      const response = await fetch(`${baseURL}/admin/api/audit-log?levels=ERROR,WARNING`, {
        headers: { 'Cookie': adminCookie }
      });

      const data = await response.json();
      assert.ok(data.entries.every(e => e.level === 'ERROR' || e.level === 'WARNING'));
    });

    it('should search by summary text', async () => {
      const response = await fetch(`${baseURL}/admin/api/audit-log?search=search%20test`, {
        headers: { 'Cookie': adminCookie }
      });

      const data = await response.json();
      assert.ok(data.entries.length > 0, 'Should find entries with search text');
      assert.ok(data.entries.every(e => e.summary.toLowerCase().includes('search test')));
    });

    it('should filter by username', async () => {
      const response = await fetch(`${baseURL}/admin/api/audit-log?username=admin`, {
        headers: { 'Cookie': adminCookie }
      });

      const data = await response.json();
      assert.ok(data.entries.length > 0);
      assert.ok(data.entries.every(e => e.username === 'admin'));
    });

    it('should filter by action type', async () => {
      const response = await fetch(`${baseURL}/admin/api/audit-log?actionType=create`, {
        headers: { 'Cookie': adminCookie }
      });

      const data = await response.json();
      assert.ok(data.entries.length > 0);
      assert.ok(data.entries.every(e => e.action_type === 'create'));
    });

    it('should filter by entity type', async () => {
      const response = await fetch(`${baseURL}/admin/api/audit-log?entityType=matter`, {
        headers: { 'Cookie': adminCookie }
      });

      const data = await response.json();
      assert.ok(data.entries.length > 0);
      assert.ok(data.entries.every(e => e.entity_type === 'matter'));
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const response = await fetch(`${baseURL}/admin/api/audit-log?startDate=${yesterday.toISOString()}&endDate=${now.toISOString()}`, {
        headers: { 'Cookie': adminCookie }
      });

      const data = await response.json();
      assert.ok(data.entries.length > 0);
      // All entries should be within the date range
      data.entries.forEach(e => {
        const entryDate = new Date(e.timestamp);
        assert.ok(entryDate >= yesterday && entryDate <= now);
      });
    });

    it('should combine multiple filters with AND logic', async () => {
      const response = await fetch(`${baseURL}/admin/api/audit-log?levels=INFO&username=admin&entityType=matter`, {
        headers: { 'Cookie': adminCookie }
      });

      const data = await response.json();
      data.entries.forEach(e => {
        assert.strictEqual(e.level, 'INFO');
        assert.strictEqual(e.username, 'admin');
        assert.strictEqual(e.entity_type, 'matter');
      });
    });
  });

  describe('Filter Values Endpoint', () => {
    it('should return distinct filter values', async () => {
      const response = await fetch(`${baseURL}/admin/api/audit-log/filters`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();

      assert.ok(Array.isArray(data.users), 'users should be an array');
      assert.ok(Array.isArray(data.actionTypes), 'actionTypes should be an array');
      assert.ok(Array.isArray(data.entityTypes), 'entityTypes should be an array');
    });
  });

  describe('Stats Endpoint', () => {
    it('should return error and warning counts for last 24h', async () => {
      const response = await fetch(`${baseURL}/admin/api/audit-log/stats`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();

      assert.ok(typeof data.errorsLast24h === 'number', 'errorsLast24h should be a number');
      assert.ok(typeof data.warningsLast24h === 'number', 'warningsLast24h should be a number');
    });
  });

  describe('CSV Export', () => {
    it('should export audit log as CSV', async () => {
      const response = await fetch(`${baseURL}/admin/api/audit-log/export`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      assert.ok(response.headers.get('content-type').includes('text/csv'));
      assert.ok(response.headers.get('content-disposition').includes('attachment'));

      const text = await response.text();
      // CSV should have header row
      assert.ok(text.includes('timestamp'));
      assert.ok(text.includes('level'));
      assert.ok(text.includes('summary'));
    });

    it('should export filtered results', async () => {
      const response = await fetch(`${baseURL}/admin/api/audit-log/export?levels=ERROR`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const text = await response.text();

      // Parse CSV to verify filter was applied
      const lines = text.trim().split('\n');
      // Skip header, check data rows
      for (let i = 1; i < lines.length; i++) {
        assert.ok(lines[i].includes('ERROR'));
      }
    });
  });

  describe('Sample Data Generation', () => {
    it('should generate audit log sample data', async () => {
      const { auditLogDb } = server.db;
      const initialCount = auditLogDb.getCount();

      const response = await fetch(`${baseURL}/admin/api/data/populate-audit-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          count: 50
        })
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();

      assert.ok(data.success);
      assert.strictEqual(data.entries_generated, 50);

      const newCount = auditLogDb.getCount();
      // The generated entries + 1 log entry for the generation action itself
      assert.ok(newCount >= initialCount + 50, `Expected at least ${initialCount + 50} entries, got ${newCount}`);
    });

    it('should respect date range for sample data', async () => {
      const { auditLogDb } = server.db;

      const startDate = '2025-01-01';
      const endDate = '2025-06-30';

      const response = await fetch(`${baseURL}/admin/api/data/populate-audit-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          count: 50,
          startDate,
          endDate
        })
      });

      assert.strictEqual(response.status, 200);

      // Check that entries are within the date range
      const logs = auditLogDb.getAll({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate + 'T23:59:59').toISOString(),
        limit: 100
      });

      assert.ok(logs.entries.length > 0, 'Should have entries in the date range');
    });

    it('should validate count range (50-500)', async () => {
      // Try count too low
      const lowResponse = await fetch(`${baseURL}/admin/api/data/populate-audit-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          count: 10
        })
      });

      assert.strictEqual(lowResponse.status, 400);

      // Try count too high
      const highResponse = await fetch(`${baseURL}/admin/api/data/populate-audit-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          count: 1000
        })
      });

      assert.strictEqual(highResponse.status, 400);
    });
  });

  describe('Bulk Create', () => {
    it('should bulk create entries', () => {
      const { auditLogDb } = server.db;
      const initialCount = auditLogDb.getCount();

      const entries = [
        { level: 'INFO', action_type: 'create', summary: 'Bulk test 1' },
        { level: 'WARNING', action_type: 'update', summary: 'Bulk test 2' },
        { level: 'ERROR', action_type: 'delete', summary: 'Bulk test 3' }
      ];

      const result = auditLogDb.bulkCreate(entries);

      assert.strictEqual(result.created, 3);

      const newCount = auditLogDb.getCount();
      assert.strictEqual(newCount, initialCount + 3);
    });
  });
});
