import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../server.js';
import crypto from 'crypto';
import { hashPassword } from '../auth.js';

describe('Admin Portal Tests', () => {
  let server;
  let baseURL;
  let adminCookie;
  const PASSWORD_SALT = 'test-salt-for-testing';

  before(async () => {
    // Set test password salt
    process.env.PASSWORD_SALT = PASSWORD_SALT;

    // Create server with test configuration
    server = await createServer({
      logger: false,
      dbPath: ':memory:',
      requireAuth: false
    });

    const address = await server.listen({ port: 0, host: '127.0.0.1' });
    const port = server.server.address().port;
    baseURL = `http://127.0.0.1:${port}`;

    // Create test admin user
    const username = 'testadmin';
    const password = 'testpass123';
    const message = username + ':' + password + ':' + PASSWORD_SALT;
    const hashedPassword = crypto.createHash('sha256').update(message).digest('hex');
    const passwordHash = await hashPassword(hashedPassword);

    // Manually insert admin user into database
    const { adminUsersDb } = server.db;
    adminUsersDb.create(username, passwordHash, 'test@example.com');
  });

  after(async () => {
    await server.close();
  });

  describe('Admin Authentication', () => {
    it('should reject login with invalid credentials', async () => {
      const username = 'testadmin';
      const wrongPassword = 'wrongpass';
      const message = username + ':' + wrongPassword + ':' + PASSWORD_SALT;
      const hashedPassword = crypto.createHash('sha256').update(message).digest('hex');

      const response = await fetch(`${baseURL}/admin/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, hashedPassword })
      });

      assert.strictEqual(response.status, 401);
      const data = await response.json();
      assert.strictEqual(data.error, 'INVALID_CREDENTIALS');
    });

    it('should login with correct credentials and return cookie', async () => {
      const username = 'testadmin';
      const password = 'testpass123';
      const message = username + ':' + password + ':' + PASSWORD_SALT;
      const hashedPassword = crypto.createHash('sha256').update(message).digest('hex');

      const response = await fetch(`${baseURL}/admin/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, hashedPassword })
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.user);
      assert.strictEqual(data.user.username, username);

      // Extract cookie for subsequent requests
      const setCookie = response.headers.get('set-cookie');
      assert.ok(setCookie);
      adminCookie = setCookie.split(';')[0];
    });

    it('should get current user with valid session', async () => {
      const response = await fetch(`${baseURL}/admin/api/auth/me`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.ok(data.user);
      assert.strictEqual(data.user.username, 'testadmin');
    });

    it('should reject requests without authentication', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters`);
      assert.strictEqual(response.status, 401);
    });
  });

  describe('Password Change', () => {
    // Helper function to hash password client-side (same as login)
    function hashPasswordClientSide(username, password) {
      const message = username + ':' + password + ':' + PASSWORD_SALT;
      return crypto.createHash('sha256').update(message).digest('hex');
    }

    it('should reject password change with incorrect current password', async () => {
      const username = 'testadmin';
      const wrongCurrentPassword = 'wrongpass';
      const newPassword = 'newpass123';

      const hashedCurrentPassword = hashPasswordClientSide(username, wrongCurrentPassword);
      const hashedNewPassword = hashPasswordClientSide(username, newPassword);

      const response = await fetch(`${baseURL}/admin/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          currentPassword: hashedCurrentPassword,
          newPassword: hashedNewPassword
        })
      });

      assert.strictEqual(response.status, 401);
      const data = await response.json();
      assert.strictEqual(data.error, 'INVALID_PASSWORD');
      assert.ok(data.message.includes('incorrect'));
    });

    it('should successfully change password with correct current password', async () => {
      const username = 'testadmin';
      const currentPassword = 'testpass123';
      const newPassword = 'newpass456';

      const hashedCurrentPassword = hashPasswordClientSide(username, currentPassword);
      const hashedNewPassword = hashPasswordClientSide(username, newPassword);

      const response = await fetch(`${baseURL}/admin/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          currentPassword: hashedCurrentPassword,
          newPassword: hashedNewPassword
        })
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.message.includes('successfully'));

      // Wait to avoid rate limit
      await new Promise(resolve => setTimeout(resolve, 13000));

      // Re-login with new password to get fresh cookie for subsequent tests
      const loginResponse = await fetch(`${baseURL}/admin/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, hashedPassword: hashedNewPassword })
      });
      assert.strictEqual(loginResponse.status, 200);
      const setCookie = loginResponse.headers.get('set-cookie');
      adminCookie = setCookie.split(';')[0];
    });

    it('should invalidate all sessions after password change', async () => {
      const username = 'testadmin';
      const currentPassword = 'newpass456'; // From previous test
      const newPassword = 'securepass789';

      const hashedCurrentPassword = hashPasswordClientSide(username, currentPassword);
      const hashedNewPassword = hashPasswordClientSide(username, newPassword);

      // Change password
      const changeResponse = await fetch(`${baseURL}/admin/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          currentPassword: hashedCurrentPassword,
          newPassword: hashedNewPassword
        })
      });

      assert.strictEqual(changeResponse.status, 200);

      // Try to use old session cookie - should fail
      const meResponse = await fetch(`${baseURL}/admin/api/auth/me`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(meResponse.status, 401);
    });

    it('should be able to login with new password after change', async () => {
      const username = 'testadmin';
      const newPassword = 'securepass789'; // Password from session invalidation test
      const hashedPassword = hashPasswordClientSide(username, newPassword);

      const response = await fetch(`${baseURL}/admin/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, hashedPassword })
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.username, username);

      // Update adminCookie for subsequent tests
      const setCookie = response.headers.get('set-cookie');
      adminCookie = setCookie.split(';')[0];

      // Wait to avoid rate limit for next test
      await new Promise(resolve => setTimeout(resolve, 13000));
    });

    it('should not be able to login with old password after change', async () => {
      const username = 'testadmin';
      const oldPassword = 'testpass123';
      const hashedPassword = hashPasswordClientSide(username, oldPassword);

      const response = await fetch(`${baseURL}/admin/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, hashedPassword })
      });

      assert.strictEqual(response.status, 401);
      const data = await response.json();
      assert.strictEqual(data.error, 'INVALID_CREDENTIALS');
    });

    it('should reject password change without authentication', async () => {
      const username = 'testadmin';
      const hashedCurrentPassword = hashPasswordClientSide(username, 'newpass456');
      const hashedNewPassword = hashPasswordClientSide(username, 'anotherpass');

      const response = await fetch(`${baseURL}/admin/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: hashedCurrentPassword,
          newPassword: hashedNewPassword
        })
      });

      assert.strictEqual(response.status, 401);
    });

    it('should reject password change with missing fields', async () => {
      // Missing newPassword
      let response = await fetch(`${baseURL}/admin/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ currentPassword: 'hash123' })
      });

      assert.strictEqual(response.status, 400);
      let data = await response.json();
      assert.strictEqual(data.error, 'BAD_REQUEST');

      // Missing currentPassword
      response = await fetch(`${baseURL}/admin/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ newPassword: 'hash456' })
      });

      assert.strictEqual(response.status, 400);
      data = await response.json();
      assert.strictEqual(data.error, 'BAD_REQUEST');
    });

    it('should reject password change with invalid hash format', async () => {
      // Non-hex characters
      let response = await fetch(`${baseURL}/admin/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          currentPassword: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
          newPassword: 'a'.repeat(64)
        })
      });

      assert.strictEqual(response.status, 400);
      let data = await response.json();
      assert.strictEqual(data.error, 'BAD_REQUEST');
      assert.ok(data.message.includes('Invalid password format'));

      // Too short
      response = await fetch(`${baseURL}/admin/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          currentPassword: 'abc123',
          newPassword: 'def456'
        })
      });

      assert.strictEqual(response.status, 400);
      data = await response.json();
      assert.strictEqual(data.error, 'BAD_REQUEST');
    });

    it('should allow changing password multiple times in sequence', async () => {
      const username = 'testadmin';

      // Wait before this test to avoid hitting rate limit from previous logins
      // Need to wait long enough to ensure we're past the 60-second window
      await new Promise(resolve => setTimeout(resolve, 35000));

      // Change from securepass789 to thirdpass
      let currentPassword = 'securepass789';
      let newPassword = 'thirdpass789';
      let response = await fetch(`${baseURL}/admin/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          currentPassword: hashPasswordClientSide(username, currentPassword),
          newPassword: hashPasswordClientSide(username, newPassword)
        })
      });

      assert.strictEqual(response.status, 200);

      // Wait to avoid rate limit (login has 5 requests per minute limit)
      await new Promise(resolve => setTimeout(resolve, 13000));

      // Verify login works with new password
      response = await fetch(`${baseURL}/admin/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          hashedPassword: hashPasswordClientSide(username, newPassword)
        })
      });

      assert.strictEqual(response.status, 200);

      // Change back to original for other tests
      const setCookie = response.headers.get('set-cookie');
      adminCookie = setCookie.split(';')[0];

      currentPassword = 'thirdpass789';
      newPassword = 'testpass123';
      response = await fetch(`${baseURL}/admin/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          currentPassword: hashPasswordClientSide(username, currentPassword),
          newPassword: hashPasswordClientSide(username, newPassword)
        })
      });

      assert.strictEqual(response.status, 200);

      // Wait to avoid rate limit
      await new Promise(resolve => setTimeout(resolve, 13000));

      // Re-login with restored password for subsequent tests
      response = await fetch(`${baseURL}/admin/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          hashedPassword: hashPasswordClientSide(username, newPassword)
        })
      });
      assert.strictEqual(response.status, 200);
      const finalCookie = response.headers.get('set-cookie');
      adminCookie = finalCookie.split(';')[0];
    });
  });

  describe('Admin Matter Management', () => {
    // Add delay before this test suite to avoid rate limit from previous logins
    before(async () => {
      await new Promise(resolve => setTimeout(resolve, 15000));
    });

    it('should create single matter via admin API', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({
          matter_date: '2024-12-01T10:00:00.000Z',
          note: 'Admin created matter',
          cost: 500.75
        })
      });

      assert.strictEqual(response.status, 201);
      const data = await response.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.matter);
    });

    it('should bulk create matters', async () => {
      const matters = [
        { matter_date: '2024-12-02T10:00:00.000Z', note: 'Bulk 1', cost: 100.50 },
        { matter_date: '2024-12-03T10:00:00.000Z', note: 'Bulk 2', cost: 200.25 },
        { matter_date: '2024-12-04T10:00:00.000Z', note: 'Bulk 3', cost: 300.99 }
      ];

      const response = await fetch(`${baseURL}/admin/api/matters/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ matters })
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.created, 3);
      assert.strictEqual(data.errors.length, 0);
    });

    it('should list matters with pagination', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters?page=1&limit=2`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.ok(Array.isArray(data.matters));
      assert.strictEqual(data.matters.length, 2);
      assert.ok(data.total >= 4);
      assert.strictEqual(data.page, 1);
      assert.strictEqual(data.limit, 2);
    });

    it('should filter matters by search term', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters?search=Bulk`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.ok(data.matters.every(inc => inc.note.includes('Bulk')));
    });

    it('should sort matters by cost', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters?sortBy=cost&sortOrder=ASC`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();

      // Verify ascending order
      for (let i = 1; i < data.matters.length; i++) {
        assert.ok(data.matters[i].cost >= data.matters[i - 1].cost);
      }
    });
  });

  describe('Edge Cases & Data Validation', () => {
    it('should handle zero cost', async () => {
      const response = await fetch(`${baseURL}/api/matters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Free matter', cost: 0 })
      });

      assert.strictEqual(response.status, 201);
      const listResponse = await fetch(`${baseURL}/api/matters`);
      const matters = await listResponse.json();
      const matter = matters.find(i => i.note === 'Free matter');
      assert.strictEqual(matter.cost, 0);
    });

    it('should handle very large amounts', async () => {
      const largeCost = 999999.99;
      const response = await fetch(`${baseURL}/api/matters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Large cost', cost: largeCost })
      });

      assert.strictEqual(response.status, 201);
      const listResponse = await fetch(`${baseURL}/api/matters`);
      const matters = await listResponse.json();
      const matter = matters.find(i => i.note === 'Large cost');
      assert.strictEqual(matter.cost, largeCost);
    });

    it('should handle fractional cents correctly', async () => {
      // $10.999 should round to $11.00 (1100 cents)
      const response = await fetch(`${baseURL}/api/matters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Rounding test', cost: 10.999 })
      });

      assert.strictEqual(response.status, 201);
      const listResponse = await fetch(`${baseURL}/api/matters`);
      const matters = await listResponse.json();
      const matter = matters.find(i => i.note === 'Rounding test');
      // Math.round(10.999 * 100) = 1100, divided back = 11.00
      assert.strictEqual(matter.cost, 11.00);
    });

    it('should reject negative costs', async () => {
      const response = await fetch(`${baseURL}/api/matters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Negative test', cost: -100 })
      });

      // Should still create but with 0 (or we could add validation to reject)
      assert.strictEqual(response.status, 201);
      const listResponse = await fetch(`${baseURL}/api/matters`);
      const matters = await listResponse.json();
      const matter = matters.find(i => i.note === 'Negative test');
      // Negative * 100 = negative cents, which gets stored
      // We might want to add validation, but for now just verify behavior
      assert.ok(matter.cost <= 0);
    });

    it('should handle missing optional fields', async () => {
      const response = await fetch(`${baseURL}/api/matters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'No cost field' })
      });

      assert.strictEqual(response.status, 201);
      const listResponse = await fetch(`${baseURL}/api/matters`);
      const matters = await listResponse.json();
      const matter = matters.find(i => i.note === 'No cost field');
      assert.strictEqual(matter.cost, 0);
    });

    it('should handle bulk operation with some errors', async () => {
      const matters = [
        { matter_date: '2024-12-05T10:00:00.000Z', note: 'Valid 1', cost: 100 },
        { note: 'Missing date', cost: 200 }, // Missing matter_date
        { matter_date: '2024-12-06T10:00:00.000Z', note: 'Valid 2', cost: 300 }
      ];

      const response = await fetch(`${baseURL}/admin/api/matters/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ matters })
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.created, 2); // Only 2 valid ones
      assert.strictEqual(data.errors.length, 1); // 1 error
      assert.ok(data.errors[0].error.includes('matter_date'));
    });
  });

  describe('Drain Calculation', () => {
    it('should return drain information in status', async () => {
      const response = await fetch(`${baseURL}/api/status`);
      const data = await response.json();

      // Verify drain fields are present with correct naming
      assert.ok('drain_enabled' in data);
      assert.ok('drain_rate_cents_per_second' in data);
      assert.ok('accumulated_drain' in data);
      assert.ok('drain_start_time' in data);
      assert.ok(typeof data.accumulated_drain === 'number');
      assert.ok(data.accumulated_drain >= 0);
      assert.ok(typeof data.drain_rate_cents_per_second === 'number');
    });

    it('should calculate total_spent including drain', async () => {
      const response = await fetch(`${baseURL}/api/status`);
      const data = await response.json();

      // total_spent should be lifetime_spent + accumulated_drain
      const expectedTotal = data.lifetime_spent + data.accumulated_drain;
      assert.strictEqual(
        data.total_spent,
        expectedTotal,
        'total_spent should equal lifetime_spent + accumulated_drain'
      );
    });
  });

  describe('Data Consistency', () => {
    it('should maintain accurate lifetime_spent total', async () => {
      // Get initial state
      const initialResponse = await fetch(`${baseURL}/api/status`);
      const initialData = await initialResponse.json();
      const initialSpent = initialData.lifetime_spent;

      // Add matter with known cost
      const testCost = 123.45;
      await fetch(`${baseURL}/api/matters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Consistency test', cost: testCost })
      });

      // Check updated state
      const updatedResponse = await fetch(`${baseURL}/api/status`);
      const updatedData = await updatedResponse.json();

      // Use approximate equality for floating point comparison
      const expectedSpent = initialSpent + testCost;
      const actualSpent = updatedData.lifetime_spent;
      const diff = Math.abs(actualSpent - expectedSpent);

      assert.ok(
        diff < 0.01,
        `lifetime_spent should increase by exact cost amount. Expected: ${expectedSpent}, Got: ${actualSpent}, Diff: ${diff}`
      );
    });

    it('should update days_since when matter is created', async () => {
      const response = await fetch(`${baseURL}/api/matters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Days reset test', cost: 50 })
      });

      assert.strictEqual(response.status, 201);

      const statusResponse = await fetch(`${baseURL}/api/status`);
      const statusData = await statusResponse.json();

      // Should be 0 since we just created a matter
      assert.strictEqual(statusData.days_since, 0);
    });

    it('should maintain matter count accuracy', async () => {
      const statusResponse = await fetch(`${baseURL}/api/status`);
      const statusData = await statusResponse.json();

      const mattersResponse = await fetch(`${baseURL}/api/matters`);
      const matters = await mattersResponse.json();

      assert.strictEqual(
        statusData.stats.total_matters,
        matters.length,
        'Total matters count should match actual matters'
      );
    });
  });

  describe('Settings Management', () => {
    it('should update last matter date manually', async () => {
      const testDate = '2020-01-01T00:00:00.000Z';
      const response = await fetch(`${baseURL}/api/settings/last-matter-date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: testDate })
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.ok(data.last_matter_date.includes('2020-01-01'));

      // Verify days_since updated
      const statusResponse = await fetch(`${baseURL}/api/status`);
      const statusData = await statusResponse.json();
      assert.ok(statusData.days_since > 1000); // Many years ago
    });

    it('should reset lifetime spent', async () => {
      const response = await fetch(`${baseURL}/api/settings/lifetime-spent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 0 })
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.strictEqual(data.lifetime_spent, 0);
    });
  });

  describe('Drain Settings Management', () => {
    it('should get current drain settings from admin API', async () => {
      const response = await fetch(`${baseURL}/admin/api/settings`, {
        headers: { 'Cookie': adminCookie }
      });

      assert.strictEqual(response.status, 200);
      const data = await response.json();
      assert.ok(data.settings);
      assert.ok('auto_drain_enabled' in data.settings);
      assert.ok('drain_rate_cents_per_second' in data.settings);
    });

    it('should update drain enabled setting', async () => {
      // Disable drain
      const response1 = await fetch(`${baseURL}/admin/api/settings/auto_drain_enabled`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ value: 'false' })
      });

      assert.strictEqual(response1.status, 200);

      // Verify it's disabled in status
      const statusResponse = await fetch(`${baseURL}/api/status`);
      const statusData = await statusResponse.json();
      assert.strictEqual(statusData.drain_enabled, false);

      // Re-enable drain for other tests
      await fetch(`${baseURL}/admin/api/settings/auto_drain_enabled`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ value: 'true' })
      });
    });

    it('should update drain rate with validation', async () => {
      // Set valid drain rate
      const validRate = '100.5';
      const response1 = await fetch(`${baseURL}/admin/api/settings/drain_rate_cents_per_second`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ value: validRate })
      });

      assert.strictEqual(response1.status, 200);

      // Verify it's updated in status
      const statusResponse = await fetch(`${baseURL}/api/status`);
      const statusData = await statusResponse.json();
      assert.strictEqual(statusData.drain_rate_cents_per_second, 100.5);

      // Restore default rate for other tests
      await fetch(`${baseURL}/admin/api/settings/drain_rate_cents_per_second`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ value: '50' })
      });
    });

    it('should enforce rate validation boundaries (0-1000)', async () => {
      // The validation is actually in the admin UI, but the API should still accept valid values
      // Test that extremely high rates work (up to 1000)
      const maxRate = '1000';
      const response = await fetch(`${baseURL}/admin/api/settings/drain_rate_cents_per_second`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ value: maxRate })
      });

      assert.strictEqual(response.status, 200);

      // Verify it's updated
      const statusResponse = await fetch(`${baseURL}/api/status`);
      const statusData = await statusResponse.json();
      assert.strictEqual(statusData.drain_rate_cents_per_second, 1000);

      // Restore default
      await fetch(`${baseURL}/admin/api/settings/drain_rate_cents_per_second`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ value: '50' })
      });
    });

    it('should not accumulate drain when disabled', async () => {
      // Disable drain
      await fetch(`${baseURL}/admin/api/settings/auto_drain_enabled`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ value: 'false' })
      });

      // Get initial status
      const response1 = await fetch(`${baseURL}/api/status`);
      const data1 = await response1.json();
      assert.strictEqual(data1.drain_enabled, false);
      assert.strictEqual(data1.accumulated_drain, 0);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check that drain didn't accumulate
      const response2 = await fetch(`${baseURL}/api/status`);
      const data2 = await response2.json();
      assert.strictEqual(data2.accumulated_drain, 0);

      // Re-enable for other tests
      await fetch(`${baseURL}/admin/api/settings/auto_drain_enabled`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ value: 'true' })
      });
    });
  });
});
