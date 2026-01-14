/**
 * Matters > Admin CRUD Tests
 * Tests for admin matter management operations
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { setupTestEnvironment } from '../helpers/setup.js';

describe('Matters > Admin CRUD', () => {
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

    it('should create single matter via admin API', async () => {
        const response = await fetch(`${baseURL}/admin/api/matters`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${adminCookie}`
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
                'Cookie': `admin_token=${adminCookie}`
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
            headers: { 'Cookie': `admin_token=${adminCookie}` }
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
            headers: { 'Cookie': `admin_token=${adminCookie}` }
        });

        assert.strictEqual(response.status, 200);
        const data = await response.json();
        assert.ok(data.matters.every(m => m.note.includes('Bulk')));
    });

    it('should sort matters by cost', async () => {
        const response = await fetch(`${baseURL}/admin/api/matters?sortBy=cost&sortOrder=ASC`, {
            headers: { 'Cookie': `admin_token=${adminCookie}` }
        });

        assert.strictEqual(response.status, 200);
        const data = await response.json();

        for (let i = 1; i < data.matters.length; i++) {
            assert.ok(data.matters[i].cost >= data.matters[i - 1].cost);
        }
    });

    it('should handle bulk operation with some errors', async () => {
        const matters = [
            { matter_date: '2024-12-05T10:00:00.000Z', note: 'Valid 1', cost: 100 },
            { note: 'Missing date', cost: 200 },
            { matter_date: '2024-12-06T10:00:00.000Z', note: 'Valid 2', cost: 300 }
        ];

        const response = await fetch(`${baseURL}/admin/api/matters/bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${adminCookie}`
            },
            body: JSON.stringify({ matters })
        });

        assert.strictEqual(response.status, 200);
        const data = await response.json();
        assert.strictEqual(data.success, true);
        assert.strictEqual(data.created, 2);
        assert.strictEqual(data.errors.length, 1);
        assert.ok(data.errors[0].error.includes('matter_date'));
    });
});
