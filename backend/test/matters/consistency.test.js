/**
 * Matters > Data Consistency Tests
 * Tests for data consistency and accuracy
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { setupTestEnvironment, adminPost } from '../helpers/setup.js';

describe('Matters > Data Consistency', () => {
    let server;
    let baseURL;
    let adminCookie;

    before(async () => {
        const env = await setupTestEnvironment();
        server = env.server;
        baseURL = env.baseURL;
        adminCookie = env.adminCookie;
    });

    after(async () => {
        await server.close();
    });

    it('should maintain accurate lifetime_spent total', async () => {
        const initialResponse = await fetch(`${baseURL}/api/status`);
        const initialData = await initialResponse.json();
        const initialSpent = initialData.lifetime_spent;

        const testCost = 123.45;
        await adminPost(baseURL, '/matters', {
            matter_date: new Date().toISOString(),
            note: 'Consistency test',
            cost: testCost
        }, adminCookie);

        const updatedResponse = await fetch(`${baseURL}/api/status`);
        const updatedData = await updatedResponse.json();

        const expectedSpent = initialSpent + testCost;
        const actualSpent = updatedData.lifetime_spent;
        const diff = Math.abs(actualSpent - expectedSpent);

        assert.ok(
            diff < 0.01,
            `lifetime_spent should increase by exact cost amount. Expected: ${expectedSpent}, Got: ${actualSpent}`
        );
    });

    it('should update days_since when matter is created', async () => {
        const response = await adminPost(baseURL, '/matters', {
            matter_date: new Date().toISOString(),
            note: 'Days reset test',
            cost: 50
        }, adminCookie);

        assert.strictEqual(response.status, 201);

        const statusResponse = await fetch(`${baseURL}/api/status`);
        const statusData = await statusResponse.json();

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
