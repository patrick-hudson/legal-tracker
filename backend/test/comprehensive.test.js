import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../server.js';
import crypto from 'crypto';
import { hashPassword } from '../auth.js';

/**
 * Comprehensive End-to-End Tests with Proper Isolation
 * - Each test gets a fresh database
 * - Tests create their own sample data
 * - No cross-contamination between tests
 */

describe('Comprehensive E2E Tests (Isolated)', () => {
  let server;
  let baseURL;
  let adminCookie;
  const PASSWORD_SALT = 'test-salt-comprehensive';

  // Create fresh server before EACH test
  beforeEach(async () => {
    process.env.PASSWORD_SALT = PASSWORD_SALT;

    server = await createServer({
      logger: false,
      dbPath: ':memory:', // Fresh in-memory DB for each test
      requireAuth: false
    });

    const address = await server.listen({ port: 0, host: '127.0.0.1' });
    const port = server.server.address().port;
    baseURL = `http://127.0.0.1:${port}`;

    // Create admin user for tests that need it
    const username = 'admin';
    const password = 'admin12345';
    const message = username + ':' + password + ':' + PASSWORD_SALT;
    const hashedPassword = crypto.createHash('sha256').update(message).digest('hex');
    const passwordHash = await hashPassword(hashedPassword);
    server.db.adminUsersDb.create(username, passwordHash, 'admin@test.com');

    // Login and get cookie
    const loginResponse = await fetch(`${baseURL}/admin/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, hashedPassword })
    });
    const setCookie = loginResponse.headers.get('set-cookie');
    adminCookie = setCookie ? setCookie.split(';')[0] : null;
  });

  // Clean up after EACH test
  afterEach(async () => {
    await server.close();
  });

  describe('Single Matter Operations', () => {
    it('should create and retrieve single matter with exact dollar amount', async () => {
      const testData = {
        matter_date: '2024-01-15T14:30:00.000Z',
        note: 'Single matter test',
        cost: 1234.56
      };

      // Create
      const createRes = await fetch(`${baseURL}/api/matters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      assert.strictEqual(createRes.status, 201);
      const createData = await createRes.json();
      assert.ok(createData.id);

      // Retrieve
      const listRes = await fetch(`${baseURL}/api/matters`);
      const matters = await listRes.json();

      assert.strictEqual(matters.length, 1);
      assert.strictEqual(matters[0].cost, 1234.56);
      assert.strictEqual(matters[0].note, testData.note);
    });

    it('should update single matter and verify changes', async () => {
      // Create initial matter
      const createRes = await fetch(`${baseURL}/api/matters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Original', cost: 100 })
      });
      const { id } = await createRes.json();

      // Update
      const updateRes = await fetch(`${baseURL}/api/matters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Updated', cost: 200.50 })
      });

      assert.strictEqual(updateRes.status, 200);

      // Verify
      const listRes = await fetch(`${baseURL}/api/matters`);
      const matters = await listRes.json();

      assert.strictEqual(matters[0].note, 'Updated');
      assert.strictEqual(matters[0].cost, 200.50);
    });

    it('should delete single matter', async () => {
      // Create
      const createRes = await fetch(`${baseURL}/api/matters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'To delete', cost: 50 })
      });
      const { id } = await createRes.json();

      // Delete
      const deleteRes = await fetch(`${baseURL}/api/matters/${id}`, {
        method: 'DELETE'
      });

      assert.strictEqual(deleteRes.status, 200);

      // Verify gone
      const listRes = await fetch(`${baseURL}/api/matters`);
      const matters = await listRes.json();

      assert.strictEqual(matters.length, 0);
    });
  });

  describe('Bulk Operations with Large Dataset', () => {
    it('should bulk create 50 matters and verify all', async () => {
      // Generate 50 diverse matters
      const matters = Array.from({ length: 50 }, (_, i) => ({
        matter_date: new Date(2024, 0, i + 1).toISOString(),
        note: `Bulk matter ${i + 1}`,
        cost: parseFloat((Math.random() * 10000).toFixed(2))
      }));

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
      assert.strictEqual(data.created, 50);
      assert.strictEqual(data.errors.length, 0);

      // Verify all 50 exist
      const listRes = await fetch(`${baseURL}/api/matters`);
      const allMatters = await listRes.json();
      assert.strictEqual(allMatters.length, 50);

      // Verify costs are preserved correctly
      matters.forEach((original, idx) => {
        const stored = allMatters.find(inc => inc.note === original.note);
        assert.ok(stored, `Matter ${idx} should exist`);
        assert.strictEqual(stored.cost, original.cost, `Cost mismatch for matter ${idx}`);
      });
    });

    it('should handle bulk delete of multiple matters', async () => {
      // Create 10 matters
      const matters = Array.from({ length: 10 }, (_, i) => ({
        matter_date: new Date(2024, 0, i + 1).toISOString(),
        note: `Delete test ${i}`,
        cost: 100
      }));

      await fetch(`${baseURL}/admin/api/matters/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ matters })
      });

      // Get all IDs
      const listRes = await fetch(`${baseURL}/api/matters`);
      const allMatters = await listRes.json();
      const idsToDelete = allMatters.slice(0, 5).map(inc => inc.id);

      // Bulk delete (delete one by one for now, since we don't have bulk delete endpoint)
      for (const id of idsToDelete) {
        await fetch(`${baseURL}/api/matters/${id}`, { method: 'DELETE' });
      }

      // Verify only 5 remain
      const finalRes = await fetch(`${baseURL}/api/matters`);
      const remaining = await finalRes.json();
      assert.strictEqual(remaining.length, 5);
    });

    it('should handle partial failures in bulk operations', async () => {
      const matters = [
        { matter_date: '2024-01-01T10:00:00.000Z', note: 'Valid 1', cost: 100 },
        { note: 'Missing date', cost: 200 }, // Invalid - no date
        { matter_date: '2024-01-02T10:00:00.000Z', note: 'Valid 2', cost: 300 },
        { matter_date: 'invalid-date', note: 'Invalid date', cost: 400 }, // Invalid date format
        { matter_date: '2024-01-03T10:00:00.000Z', note: 'Valid 3', cost: 500 }
      ];

      const response = await fetch(`${baseURL}/admin/api/matters/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ matters })
      });

      const data = await response.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.created, 3); // Only 3 valid ones
      assert.ok(data.errors.length >= 2); // At least 2 errors
    });
  });

  describe('Dollar/Cent Precision Edge Cases', () => {
    const testCases = [
      { name: 'Trailing zeros', input: 100.50, expected: 100.50 },
      { name: 'Whole dollars', input: 5000, expected: 5000 },
      { name: 'Many decimals (rounds)', input: 99.999, expected: 100.00 },
      { name: 'Small amount', input: 0.01, expected: 0.01 },
      { name: 'Complex decimal', input: 12345.67, expected: 12345.67 },
      { name: 'Three decimal places', input: 100.125, expected: 100.13 }, // Rounds up
      { name: 'Near-zero rounding', input: 0.004, expected: 0.00 }, // Rounds down
      { name: 'Large amount', input: 999999.99, expected: 999999.99 }
    ];

    testCases.forEach(({ name, input, expected }) => {
      it(`should handle ${name}: $${input} → $${expected}`, async () => {
        const response = await fetch(`${baseURL}/api/matters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: name, cost: input })
        });

        assert.strictEqual(response.status, 201);

        const listRes = await fetch(`${baseURL}/api/matters`);
        const matters = await listRes.json();
        const matter = matters.find(inc => inc.note === name);

        assert.ok(matter, `Matter with note "${name}" should exist`);
        assert.strictEqual(matter.cost, expected, `Cost should be exactly ${expected}`);
      });
    });
  });

  describe('Data Consistency with Multiple Operations', () => {
    it('should maintain accurate lifetime_spent across multiple adds/deletes', async () => {
      // Create 5 matters with known costs
      const costs = [100.50, 200.75, 300.25, 400.99, 500.00];
      const ids = [];

      for (const cost of costs) {
        const res = await fetch(`${baseURL}/api/matters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: `Cost ${cost}`, cost })
        });
        const data = await res.json();
        ids.push(data.id);
      }

      // Check total
      let statusRes = await fetch(`${baseURL}/api/status`);
      let status = await statusRes.json();
      const expectedTotal = costs.reduce((sum, c) => sum + c, 0);

      assert.ok(
        Math.abs(status.lifetime_spent - expectedTotal) < 0.01,
        `Total should be ${expectedTotal}, got ${status.lifetime_spent}`
      );

      // Delete first 2 matters
      await fetch(`${baseURL}/api/matters/${ids[0]}`, { method: 'DELETE' });
      await fetch(`${baseURL}/api/matters/${ids[1]}`, { method: 'DELETE' });

      // Verify count decreased
      const listRes = await fetch(`${baseURL}/api/matters`);
      const matters = await listRes.json();
      assert.strictEqual(matters.length, 3);
    });

    it('should handle days_since calculation correctly', async () => {
      // Create matter in the past
      await fetch(`${baseURL}/api/matters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matter_date: '2024-01-01T00:00:00.000Z',
          note: 'Old matter',
          cost: 100
        })
      });

      // Create recent matter
      await fetch(`${baseURL}/api/matters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: 'New matter',
          cost: 50
        })
      });

      // Check days_since should be 0 (just created)
      const statusRes = await fetch(`${baseURL}/api/status`);
      const status = await statusRes.json();

      assert.strictEqual(status.days_since, 0);
      assert.strictEqual(status.stats.total_matters, 2);
    });
  });

  describe('Admin Pagination and Filtering', () => {
    beforeEach(async () => {
      // Create 25 matters with various patterns
      const matters = Array.from({ length: 25 }, (_, i) => ({
        matter_date: new Date(2024, 0, i + 1).toISOString(),
        note: i % 2 === 0 ? `Contract ${i}` : `Consultation ${i}`,
        cost: (i + 1) * 100
      }));

      await fetch(`${baseURL}/admin/api/matters/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ matters })
      });
    });

    it('should paginate results correctly', async () => {
      // Page 1
      const page1Res = await fetch(`${baseURL}/admin/api/matters?page=1&limit=10`, {
        headers: { 'Cookie': adminCookie }
      });
      const page1 = await page1Res.json();

      assert.strictEqual(page1.matters.length, 10);
      assert.strictEqual(page1.page, 1);
      assert.strictEqual(page1.totalPages, 3);

      // Page 2
      const page2Res = await fetch(`${baseURL}/admin/api/matters?page=2&limit=10`, {
        headers: { 'Cookie': adminCookie }
      });
      const page2 = await page2Res.json();

      assert.strictEqual(page2.matters.length, 10);
      assert.strictEqual(page2.page, 2);

      // Verify no overlap
      const page1Ids = page1.matters.map(i => i.id);
      const page2Ids = page2.matters.map(i => i.id);
      const overlap = page1Ids.filter(id => page2Ids.includes(id));

      assert.strictEqual(overlap.length, 0, 'Pages should not overlap');
    });

    it('should filter by search term', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters?search=Contract`, {
        headers: { 'Cookie': adminCookie }
      });
      const data = await response.json();

      assert.ok(data.matters.length > 0);
      assert.ok(data.matters.every(inc => inc.note.includes('Contract')));
    });

    it('should sort by cost ascending and descending', async () => {
      // Ascending
      const ascRes = await fetch(`${baseURL}/admin/api/matters?sortBy=cost&sortOrder=ASC`, {
        headers: { 'Cookie': adminCookie }
      });
      const ascData = await ascRes.json();

      for (let i = 1; i < ascData.matters.length; i++) {
        assert.ok(
          ascData.matters[i].cost >= ascData.matters[i - 1].cost,
          `Ascending order failed at index ${i}`
        );
      }

      // Descending
      const descRes = await fetch(`${baseURL}/admin/api/matters?sortBy=cost&sortOrder=DESC`, {
        headers: { 'Cookie': adminCookie }
      });
      const descData = await descRes.json();

      for (let i = 1; i < descData.matters.length; i++) {
        assert.ok(
          descData.matters[i].cost <= descData.matters[i - 1].cost,
          `Descending order failed at index ${i}`
        );
      }
    });
  });

  describe('Authentication Edge Cases', () => {
    it('should reject expired or invalid cookies', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters`, {
        headers: { 'Cookie': 'admin_token=invalid-token-here' }
      });

      assert.strictEqual(response.status, 401);
    });

    it('should require authentication for admin endpoints', async () => {
      const endpoints = [
        { path: '/admin/api/matters', method: 'GET' },
        { path: '/admin/api/matters', method: 'POST', body: { note: 'test', cost: 100 } },
        { path: '/admin/api/matters/bulk', method: 'POST', body: { matters: [] } },
        { path: '/admin/api/auth/me', method: 'GET' }
      ];

      for (const { path, method, body } of endpoints) {
        const res = await fetch(`${baseURL}${path}`, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : {},
          body: body ? JSON.stringify(body) : undefined
        });
        assert.strictEqual(
          res.status,
          401,
          `${method} ${path} should require auth (got ${res.status})`
        );
      }
    });

    it('should allow multiple concurrent sessions', async () => {
      // Create second admin user
      const username2 = 'admin2';
      const password2 = 'admin23456';
      const message2 = username2 + ':' + password2 + ':' + PASSWORD_SALT;
      const hashedPassword2 = crypto.createHash('sha256').update(message2).digest('hex');
      const passwordHash2 = await hashPassword(hashedPassword2);
      server.db.adminUsersDb.create(username2, passwordHash2, 'admin2@test.com');

      // Login with second user
      const login2Res = await fetch(`${baseURL}/admin/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username2, hashedPassword: hashedPassword2 })
      });
      const setCookie2 = login2Res.headers.get('set-cookie');
      const cookie2 = setCookie2.split(';')[0];

      // Both sessions should work
      const res1 = await fetch(`${baseURL}/admin/api/auth/me`, {
        headers: { 'Cookie': adminCookie }
      });
      const res2 = await fetch(`${baseURL}/admin/api/auth/me`, {
        headers: { 'Cookie': cookie2 }
      });

      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);

      const data1 = await res1.json();
      const data2 = await res2.json();

      assert.strictEqual(data1.user.username, 'admin');
      assert.strictEqual(data2.user.username, 'admin2');
    });
  });

  describe('Stress Test - Realistic Usage Pattern', () => {
    it('should handle realistic workflow: create, read, update, paginate, delete', async () => {
      // Step 1: Bulk create 30 matters
      const matters = Array.from({ length: 30 }, (_, i) => ({
        matter_date: new Date(2024, 0, i + 1, 10, 0, 0).toISOString(),
        note: `Matter ${String(i + 1).padStart(3, '0')}`,
        cost: parseFloat((Math.random() * 5000).toFixed(2))
      }));

      await fetch(`${baseURL}/admin/api/matters/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': adminCookie
        },
        body: JSON.stringify({ matters })
      });

      // Step 2: Read and verify total
      let listRes = await fetch(`${baseURL}/api/matters`);
      let allMatters = await listRes.json();
      assert.strictEqual(allMatters.length, 30);

      // Step 3: Update 5 random matters
      for (let i = 0; i < 5; i++) {
        const matter = allMatters[i * 6]; // Every 6th
        await fetch(`${baseURL}/api/matters/${matter.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: `UPDATED ${matter.note}`, cost: matter.cost + 100 })
        });
      }

      // Step 4: Verify updates
      listRes = await fetch(`${baseURL}/api/matters`);
      allMatters = await listRes.json();
      const updated = allMatters.filter(inc => inc.note.startsWith('UPDATED'));
      assert.strictEqual(updated.length, 5);

      // Step 5: Test pagination through all
      const page1 = await (await fetch(`${baseURL}/admin/api/matters?page=1&limit=10`, {
        headers: { 'Cookie': adminCookie }
      })).json();
      const page2 = await (await fetch(`${baseURL}/admin/api/matters?page=2&limit=10`, {
        headers: { 'Cookie': adminCookie }
      })).json();
      const page3 = await (await fetch(`${baseURL}/admin/api/matters?page=3&limit=10`, {
        headers: { 'Cookie': adminCookie }
      })).json();

      assert.strictEqual(page1.matters.length, 10);
      assert.strictEqual(page2.matters.length, 10);
      assert.strictEqual(page3.matters.length, 10);

      // Step 6: Delete 10 matters
      for (let i = 0; i < 10; i++) {
        await fetch(`${baseURL}/api/matters/${allMatters[i].id}`, { method: 'DELETE' });
      }

      // Step 7: Verify final state
      listRes = await fetch(`${baseURL}/api/matters`);
      const finalMatters = await listRes.json();
      assert.strictEqual(finalMatters.length, 20);

      // Step 8: Verify data integrity
      const statusRes = await fetch(`${baseURL}/api/status`);
      const status = await statusRes.json();
      assert.strictEqual(status.stats.total_matters, 20);
    });
  });
});
