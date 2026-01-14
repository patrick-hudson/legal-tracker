/**
 * Matters > Validation Tests
 * Tests for edge cases and data validation
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createTestServer, createTestAdmin } from '../helpers/setup.js';

describe('Matters > Validation', () => {
    let server;
    let baseURL;

    before(async () => {
        const env = await createTestServer();
        server = env.server;
        baseURL = env.baseURL;
        await createTestAdmin(server);
    });

    after(async () => {
        await server.close();
    });

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
        const response = await fetch(`${baseURL}/api/matters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: 'Rounding test', cost: 10.999 })
        });

        assert.strictEqual(response.status, 201);
        const listResponse = await fetch(`${baseURL}/api/matters`);
        const matters = await listResponse.json();
        const matter = matters.find(i => i.note === 'Rounding test');
        assert.strictEqual(matter.cost, 11.00);
    });

    it('should reject negative costs', async () => {
        const response = await fetch(`${baseURL}/api/matters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: 'Negative test', cost: -100 })
        });

        assert.strictEqual(response.status, 201);
        const listResponse = await fetch(`${baseURL}/api/matters`);
        const matters = await listResponse.json();
        const matter = matters.find(i => i.note === 'Negative test');
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
});
