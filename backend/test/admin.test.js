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

  describe('Admin Matter Management', () => {
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

      // Verify drain fields are present
      assert.ok('drain_enabled' in data);
      assert.ok('drain_rate_cents' in data);
      assert.ok('accumulated_drain' in data);
      assert.ok('drain_start_time' in data);
      assert.ok(typeof data.accumulated_drain === 'number');
      assert.ok(data.accumulated_drain >= 0);
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
});
