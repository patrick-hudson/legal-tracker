import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../../server.js';
import { setupTestEnvironment, adminPut } from '../helpers/setup.js';

describe('Legal Matters API Integration Tests', () => {
  let server;
  let baseURL;
  let adminCookie;

  before(async () => {
    // Create server with test configuration and admin user
    const env = await setupTestEnvironment();
    server = env.server;
    baseURL = env.baseURL;
    adminCookie = env.adminCookie;
  });

  after(async () => {
    await server.close();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${baseURL}/api/health`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.status, 'ok');
      assert.ok(data.timestamp);
    });
  });

  describe('Status Endpoint', () => {
    it('should return current tracker status', async () => {
      const response = await fetch(`${baseURL}/api/status`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.ok(typeof data.days_since === 'number');
      assert.ok(typeof data.lifetime_spent === 'number');
      assert.ok(data.stats);
      assert.ok(typeof data.stats.total_matters === 'number');
    });
  });

  describe('Matters Endpoint', () => {
    it('should return matters list', async () => {
      const response = await fetch(`${baseURL}/api/matters`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(data));
    });

    it('should create a new matter', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `admin_token=${adminCookie}`
        },
        body: JSON.stringify({
          matter_date: new Date().toISOString(),
          note: 'Test matter',
          cost: 100
        })
      });
      const data = await response.json();

      assert.strictEqual(response.status, 201);
      assert.strictEqual(data.success, true);
      assert.ok(data.matter?.id || data.id);
    });

    it('should retrieve created matter', async () => {
      const response = await fetch(`${baseURL}/api/matters`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(data));
      assert.ok(data.length > 0);
      assert.strictEqual(data[0].note, 'Test matter');
      assert.strictEqual(data[0].cost, 100);
    });

    it('should update a matter', async () => {
      // Get the first matter
      const listResponse = await fetch(`${baseURL}/api/matters`);
      const matters = await listResponse.json();
      const matterId = matters[0].id;

      // Update it via admin API
      const response = await fetch(`${baseURL}/admin/api/matters/${matterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `admin_token=${adminCookie}`
        },
        body: JSON.stringify({
          note: 'Updated matter',
          cost: 200
        })
      });
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.success, true);
    });

    it('should delete a matter', async () => {
      // Get the first matter
      const listResponse = await fetch(`${baseURL}/api/matters`);
      const matters = await listResponse.json();
      const matterId = matters[0].id;

      // Delete it via admin API
      const response = await fetch(`${baseURL}/admin/api/matters/${matterId}`, {
        method: 'DELETE',
        headers: { 'Cookie': `admin_token=${adminCookie}` }
      });
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.success, true);
    });

    it('should return 404 for non-existent matter', async () => {
      const response = await fetch(`${baseURL}/admin/api/matters/99999`, {
        method: 'DELETE',
        headers: { 'Cookie': `admin_token=${adminCookie}` }
      });
      const data = await response.json();

      assert.strictEqual(response.status, 404);
      assert.strictEqual(data.error, 'NOT_FOUND');
    });
  });

  describe('Settings Endpoints', () => {
    it('should update lifetime spent', async () => {
      const response = await adminPut(baseURL, '/settings/lifetime-spent', { amount: 1000 }, adminCookie);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.lifetime_spent, 1000);
    });

    it('should add to lifetime spent', async () => {
      const response = await adminPut(baseURL, '/settings/lifetime-spent', { amount: 500, add: true }, adminCookie);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.lifetime_spent, 1500);
    });

    it('should set last matter date', async () => {
      const testDate = '2024-01-01T00:00:00.000Z';
      const response = await adminPut(baseURL, '/settings/last-matter-date', { date: testDate }, adminCookie);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.success, true);
      assert.ok(data.last_matter_date.includes('2024-01-01'));
    });
  });

  describe('Dollar/Cent Conversion', () => {
    it('should handle decimal cents correctly (200.50)', async () => {
      // Create matter with $200.50 via admin API
      const createResponse = await fetch(`${baseURL}/admin/api/matters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `admin_token=${adminCookie}`
        },
        body: JSON.stringify({
          matter_date: new Date().toISOString(),
          note: 'Decimal test',
          cost: 200.50
        })
      });
      const createData = await createResponse.json();
      assert.strictEqual(createResponse.status, 201);
      const matterId = createData.matter?.id || createData.id;

      // Verify it returns exactly 200.50
      const listResponse = await fetch(`${baseURL}/api/matters`);
      const matters = await listResponse.json();
      const matter = matters.find(i => i.id === matterId);

      assert.strictEqual(matter.cost, 200.50);
    });

    it('should handle whole dollars correctly (2300.00)', async () => {
      // Create matter with $2300.00 via admin API
      const createResponse = await fetch(`${baseURL}/admin/api/matters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `admin_token=${adminCookie}`
        },
        body: JSON.stringify({
          matter_date: new Date().toISOString(),
          note: 'Whole dollars test',
          cost: 2300
        })
      });
      const createData = await createResponse.json();
      const matterId = createData.matter?.id || createData.id;

      // Verify it returns exactly 2300.00
      const listResponse = await fetch(`${baseURL}/api/matters`);
      const matters = await listResponse.json();
      const matter = matters.find(i => i.id === matterId);

      assert.strictEqual(matter.cost, 2300);
    });

    it('should handle complex decimals (2327.87)', async () => {
      // Create matter with $2327.87 via admin API
      const createResponse = await fetch(`${baseURL}/admin/api/matters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `admin_token=${adminCookie}`
        },
        body: JSON.stringify({
          matter_date: new Date().toISOString(),
          note: 'Complex decimal test',
          cost: 2327.87
        })
      });
      const createData = await createResponse.json();
      const matterId = createData.matter?.id || createData.id;

      // Verify exact precision
      const listResponse = await fetch(`${baseURL}/api/matters`);
      const matters = await listResponse.json();
      const matter = matters.find(i => i.id === matterId);

      assert.strictEqual(matter.cost, 2327.87);
    });
  });
});
