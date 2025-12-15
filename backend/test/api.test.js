import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../server.js';

describe('Legal Tracker API Integration Tests', () => {
  let server;
  let baseURL;

  before(async () => {
    // Create server with test configuration
    server = await createServer({
      logger: false, // Suppress logs during tests
      dbPath: ':memory:', // Use in-memory database for tests
      requireAuth: false // Disable auth for easier testing
    });

    // Start server on random port
    const address = await server.listen({ port: 0, host: '127.0.0.1' });
    const port = server.server.address().port;
    baseURL = `http://127.0.0.1:${port}`;
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
      assert.ok(typeof data.stats.total_incidents === 'number');
      assert.strictEqual(data.auth_required, false);
    });
  });

  describe('Incidents Endpoint', () => {
    it('should return incidents list', async () => {
      const response = await fetch(`${baseURL}/api/incidents`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(data));
    });

    it('should create a new incident', async () => {
      const response = await fetch(`${baseURL}/api/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          note: 'Test incident',
          cost: 100
        })
      });
      const data = await response.json();

      assert.strictEqual(response.status, 201);
      assert.strictEqual(data.success, true);
      assert.ok(data.id);
    });

    it('should retrieve created incident', async () => {
      const response = await fetch(`${baseURL}/api/incidents`);
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(data));
      assert.ok(data.length > 0);
      assert.strictEqual(data[0].note, 'Test incident');
      assert.strictEqual(data[0].cost, 100);
    });

    it('should update an incident', async () => {
      // Get the first incident
      const listResponse = await fetch(`${baseURL}/api/incidents`);
      const incidents = await listResponse.json();
      const incidentId = incidents[0].id;

      // Update it
      const response = await fetch(`${baseURL}/api/incidents/${incidentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          note: 'Updated incident',
          cost: 200
        })
      });
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.success, true);
    });

    it('should delete an incident', async () => {
      // Get the first incident
      const listResponse = await fetch(`${baseURL}/api/incidents`);
      const incidents = await listResponse.json();
      const incidentId = incidents[0].id;

      // Delete it
      const response = await fetch(`${baseURL}/api/incidents/${incidentId}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.success, true);
    });

    it('should return 404 for non-existent incident', async () => {
      const response = await fetch(`${baseURL}/api/incidents/99999`, {
        method: 'DELETE'
      });
      const data = await response.json();

      assert.strictEqual(response.status, 404);
      assert.strictEqual(data.error, 'NOT_FOUND');
    });
  });

  describe('Settings Endpoints', () => {
    it('should update lifetime spent', async () => {
      const response = await fetch(`${baseURL}/api/settings/lifetime-spent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: 1000
        })
      });
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.lifetime_spent, 1000);
    });

    it('should add to lifetime spent', async () => {
      const response = await fetch(`${baseURL}/api/settings/lifetime-spent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: 500,
          add: true
        })
      });
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.lifetime_spent, 1500);
    });

    it('should set last incident date', async () => {
      const testDate = '2024-01-01T00:00:00.000Z';
      const response = await fetch(`${baseURL}/api/settings/last-incident-date`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: testDate
        })
      });
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.success, true);
      assert.ok(data.last_incident_date.includes('2024-01-01'));
    });
  });
});
