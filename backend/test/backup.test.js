/**
 * Backup and Restore Tests
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../server.js';
import { hashPassword } from '../auth.js';
import crypto from 'crypto';
import AdmZip from 'adm-zip';

describe('Backup and Restore API', () => {
  let server;
  let baseURL;
  let adminCookie;
  let adminUserId;
  const PASSWORD_SALT = 'test-salt-for-testing';

  before(async () => {
    // Set test password salt
    process.env.PASSWORD_SALT = PASSWORD_SALT;

    server = await createServer({ dbPath: ':memory:', logger: false, disableRateLimit: true });
    await server.listen({ port: 0 });
    baseURL = `http://localhost:${server.server.address().port}`;

    // Create admin user with proper client-side hash
    const username = 'testadmin';
    const password = 'testpassword';
    const message = username + ':' + password + ':' + PASSWORD_SALT;
    const clientHash = crypto.createHash('sha256').update(message).digest('hex');
    const passwordHash = await hashPassword(clientHash);
    const adminResult = server.db.adminUsersDb.create(username, passwordHash, 'test@example.com');
    adminUserId = adminResult.id;

    // Login to get cookie
    const loginResponse = await fetch(`${baseURL}/admin/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testadmin',
        hashedPassword: clientHash
      })
    });

    const cookies = loginResponse.headers.get('set-cookie');
    adminCookie = cookies.split(';')[0];
  });

  after(async () => {
    await server.close();
  });

  beforeEach(() => {
    // Clear matters between tests
    server.db.db.run('DELETE FROM matters');
    server.db.db.run('DELETE FROM private_notes');
    server.db.db.run('DELETE FROM matter_attachments');
  });

  describe('Backup Stats Endpoint', () => {
    it('should return backup stats', async () => {
      // Add some test data
      server.db.mattersDb.add(new Date().toISOString(), 'Test matter 1', 10, 10000);
      server.db.mattersDb.add(new Date().toISOString(), 'Test matter 2', 20, 20000);

      const response = await fetch(`${baseURL}/admin/api/backup/stats`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();

      assert.ok('counts' in data);
      assert.ok('storage_backend' in data);
      assert.strictEqual(data.counts.matters, 2);
      assert.ok(data.storage_backend === 'filesystem' || data.storage_backend === 's3');
    });

    it('should require authentication', async () => {
      const response = await fetch(`${baseURL}/admin/api/backup/stats`);
      assert.strictEqual(response.status, 401);
    });
  });

  describe('Create Backup Endpoint', () => {
    it('should create a backup ZIP file', async () => {
      // Add test data
      const matter = server.db.mattersDb.add(new Date().toISOString(), 'Test matter', 10, 10000);
      server.db.privateNotesDb.create(matter.id, 'Test note', adminUserId);

      const response = await fetch(`${baseURL}/admin/api/backup`, {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ includeAttachments: true, includeAuditLog: false })
      });

      assert.strictEqual(response.status, 200);
      assert.ok(response.headers.get('content-type').includes('application/zip'));
      assert.ok(response.headers.get('content-disposition').includes('backup-'));

      // Verify ZIP contents
      const buffer = Buffer.from(await response.arrayBuffer());
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();

      const entryNames = entries.map(e => e.entryName);
      assert.ok(entryNames.includes('manifest.json'), 'Should contain manifest.json');
      assert.ok(entryNames.includes('database.json'), 'Should contain database.json');

      // Verify manifest content
      const manifest = JSON.parse(zip.getEntry('manifest.json').getData().toString('utf-8'));
      assert.strictEqual(manifest.version, '1.0');
      assert.ok(manifest.created_at);
      assert.strictEqual(manifest.counts.matters, 1);
      assert.strictEqual(manifest.counts.private_notes, 1);

      // Verify database content
      const database = JSON.parse(zip.getEntry('database.json').getData().toString('utf-8'));
      assert.ok(Array.isArray(database.matters));
      assert.ok(Array.isArray(database.private_notes));
      assert.ok(Array.isArray(database.admin_users));
      assert.strictEqual(database.matters.length, 1);
      assert.strictEqual(database.matters[0].note, 'Test matter');
    });

    it('should exclude AI settings from backup', async () => {
      // Set some AI settings
      server.db.settingsDb.set('claude_api_key', 'sk-ant-test-key');
      server.db.settingsDb.set('ai_spice_level', '5');

      const response = await fetch(`${baseURL}/admin/api/backup`, {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      assert.strictEqual(response.status, 200);

      const buffer = Buffer.from(await response.arrayBuffer());
      const zip = new AdmZip(buffer);
      const database = JSON.parse(zip.getEntry('database.json').getData().toString('utf-8'));

      assert.ok(!('claude_api_key' in database.settings), 'Should not include claude_api_key');
      assert.ok(!('ai_spice_level' in database.settings), 'Should not include ai_spice_level');
    });

    it('should include audit log when requested', async () => {
      // Create audit log entry
      server.db.auditLogDb.create({
        level: 'INFO',
        action_type: 'test',
        summary: 'Test audit entry'
      });

      const response = await fetch(`${baseURL}/admin/api/backup`, {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ includeAuditLog: true })
      });

      assert.strictEqual(response.status, 200);

      const buffer = Buffer.from(await response.arrayBuffer());
      const zip = new AdmZip(buffer);
      const database = JSON.parse(zip.getEntry('database.json').getData().toString('utf-8'));
      const manifest = JSON.parse(zip.getEntry('manifest.json').getData().toString('utf-8'));

      assert.ok(database.audit_log.length > 0, 'Should include audit log entries');
      assert.strictEqual(manifest.options.include_audit_log, true);
    });

    it('should require authentication', async () => {
      const response = await fetch(`${baseURL}/admin/api/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.strictEqual(response.status, 401);
    });
  });

  describe('Preview Backup Endpoint', () => {
    it('should preview a valid backup file', async () => {
      // First create a backup
      server.db.mattersDb.add(new Date().toISOString(), 'Test matter', 10, 10000);

      const backupResponse = await fetch(`${baseURL}/admin/api/backup`, {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const backupBuffer = Buffer.from(await backupResponse.arrayBuffer());

      // Now preview it
      const formData = new FormData();
      formData.append('file', new Blob([backupBuffer], { type: 'application/zip' }), 'backup.zip');

      const previewResponse = await fetch(`${baseURL}/admin/api/backup/preview`, {
        method: 'POST',
        headers: { 'Cookie': adminCookie },
        body: formData
      });

      assert.strictEqual(previewResponse.status, 200);
      const preview = await previewResponse.json();

      assert.strictEqual(preview.valid, true);
      assert.ok(preview.manifest);
      assert.ok(preview.counts);
      assert.strictEqual(preview.counts.matters, 1);
    });

    it('should reject invalid ZIP file', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['not a zip file'], { type: 'application/zip' }), 'fake.zip');

      const response = await fetch(`${baseURL}/admin/api/backup/preview`, {
        method: 'POST',
        headers: { 'Cookie': adminCookie },
        body: formData
      });

      assert.strictEqual(response.status, 400);
    });
  });

  describe('Restore Backup Endpoint', () => {
    // Helper to re-login after restore invalidates sessions
    async function reLogin() {
      const message = 'testadmin:testpassword:' + PASSWORD_SALT;
      const clientHash = crypto.createHash('sha256').update(message).digest('hex');
      const loginResponse = await fetch(`${baseURL}/admin/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testadmin',
          hashedPassword: clientHash
        })
      });
      const cookies = loginResponse.headers.get('set-cookie');
      adminCookie = cookies.split(';')[0];
    }

    it('should require confirmation string', async () => {
      // Create minimal backup
      const backupResponse = await fetch(`${baseURL}/admin/api/backup`, {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      const backupBuffer = Buffer.from(await backupResponse.arrayBuffer());

      // Try restore with wrong confirmation
      const formData = new FormData();
      formData.append('file', new Blob([backupBuffer], { type: 'application/zip' }), 'backup.zip');
      formData.append('confirmation', 'WRONG');

      const response = await fetch(`${baseURL}/admin/api/restore`, {
        method: 'POST',
        headers: { 'Cookie': adminCookie },
        body: formData
      });

      assert.strictEqual(response.status, 400);
      const data = await response.json();
      assert.strictEqual(data.error, 'CONFIRMATION_REQUIRED');
    });

    it('should restore a backup', async () => {
      // Create initial data
      const matter1 = server.db.mattersDb.add(new Date().toISOString(), 'Original matter 1', 10, 10000);
      const matter2 = server.db.mattersDb.add(new Date().toISOString(), 'Original matter 2', 20, 20000);
      server.db.privateNotesDb.create(matter1.id, 'Original note', adminUserId);

      // Create backup
      const backupResponse = await fetch(`${baseURL}/admin/api/backup`, {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      const backupBuffer = Buffer.from(await backupResponse.arrayBuffer());

      // Add more data after backup
      server.db.mattersDb.add(new Date().toISOString(), 'New matter after backup', 30, 30000);
      assert.strictEqual(server.db.mattersDb.getAll().length, 3);

      // Restore backup
      const formData = new FormData();
      formData.append('file', new Blob([backupBuffer], { type: 'application/zip' }), 'backup.zip');
      formData.append('confirmation', 'RESTORE BACKUP');

      const restoreResponse = await fetch(`${baseURL}/admin/api/restore`, {
        method: 'POST',
        headers: { 'Cookie': adminCookie },
        body: formData
      });

      assert.strictEqual(restoreResponse.status, 200);
      const result = await restoreResponse.json();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.restored.matters, 2);
      assert.strictEqual(result.restored.private_notes, 1);
      assert.strictEqual(result.redirect_to_login, true);

      // Verify data was restored (matter added after backup should be gone)
      const matters = server.db.mattersDb.getAll();
      assert.strictEqual(matters.length, 2);
      const matterNotes = matters.map(m => m.note);
      assert.ok(matterNotes.includes('Original matter 1'));
      assert.ok(matterNotes.includes('Original matter 2'));
      assert.ok(!matterNotes.includes('New matter after backup'));

      // Re-login for subsequent tests
      await reLogin();
    });

    it('should invalidate all sessions after restore', async () => {
      // Create backup
      const backupResponse = await fetch(`${baseURL}/admin/api/backup`, {
        method: 'POST',
        headers: {
          'Cookie': adminCookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      const backupBuffer = Buffer.from(await backupResponse.arrayBuffer());

      // Count sessions before restore
      const sessionsBefore = server.db.adminSessionsDb.getAll().length;
      assert.ok(sessionsBefore > 0, 'Should have at least one session');

      // Restore backup
      const formData = new FormData();
      formData.append('file', new Blob([backupBuffer], { type: 'application/zip' }), 'backup.zip');
      formData.append('confirmation', 'RESTORE BACKUP');

      const restoreResponse = await fetch(`${baseURL}/admin/api/restore`, {
        method: 'POST',
        headers: { 'Cookie': adminCookie },
        body: formData
      });

      assert.strictEqual(restoreResponse.status, 200);

      // Sessions should be invalidated
      const sessionsAfter = server.db.adminSessionsDb.getAll().length;
      assert.strictEqual(sessionsAfter, 0, 'All sessions should be invalidated');

      // Re-login for subsequent tests
      await reLogin();
    });
  });

  describe('Database Helper Methods', () => {
    it('privateNotesDb.getAll should return all notes', () => {
      const matter1 = server.db.mattersDb.add(new Date().toISOString(), 'Matter 1', 10, 1000);
      const matter2 = server.db.mattersDb.add(new Date().toISOString(), 'Matter 2', 20, 2000);

      server.db.privateNotesDb.create(matter1.id, 'Note 1', adminUserId);
      server.db.privateNotesDb.create(matter1.id, 'Note 2', adminUserId);
      server.db.privateNotesDb.create(matter2.id, 'Note 3', adminUserId);

      const allNotes = server.db.privateNotesDb.getAll();
      assert.strictEqual(allNotes.length, 3);
    });

    it('attachmentsDb.getAll should return all attachments', () => {
      const matter = server.db.mattersDb.add(new Date().toISOString(), 'Matter', 10, 1000);

      server.db.attachmentsDb.create(
        matter.id,
        'test1.pdf',
        'application/pdf',
        1024,
        'filesystem',
        'uuid1/test1.pdf',
        adminUserId
      );
      server.db.attachmentsDb.create(
        matter.id,
        'test2.pdf',
        'application/pdf',
        2048,
        'filesystem',
        'uuid2/test2.pdf',
        adminUserId
      );

      const allAttachments = server.db.attachmentsDb.getAll();
      assert.strictEqual(allAttachments.length, 2);
    });

    it('adminUsersDb.getAllWithHashes should include password hashes', () => {
      const users = server.db.adminUsersDb.getAllWithHashes();
      assert.ok(users.length > 0);
      assert.ok(users[0].password_hash, 'Should include password_hash');
    });

    it('adminUsersDb.getCount should return user count', () => {
      const count = server.db.adminUsersDb.getCount();
      assert.ok(count > 0);
    });

    it('attachmentsDb.getCount should return attachment count', () => {
      const matter = server.db.mattersDb.add(new Date().toISOString(), 'Matter', 10, 1000);
      server.db.attachmentsDb.create(
        matter.id,
        'test.pdf',
        'application/pdf',
        1024,
        'filesystem',
        'uuid/test.pdf',
        adminUserId
      );

      const count = server.db.attachmentsDb.getCount();
      assert.strictEqual(count, 1);
    });
  });
});
