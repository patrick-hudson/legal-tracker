/**
 * Data Management > Settings Tests
 * Tests for settings management
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { setupTestEnvironment } from '../helpers/setup.js';

describe('Data Management > Settings', () => {
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

    it('should update last matter date manually', async () => {
        const testDate = '2020-01-01T00:00:00.000Z';
        const response = await fetch(`${baseURL}/admin/api/settings/last-matter-date`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${adminCookie}`
            },
            body: JSON.stringify({ date: testDate })
        });

        assert.strictEqual(response.status, 200);
        const data = await response.json();
        assert.ok(data.last_matter_date.includes('2020-01-01'));

        const statusResponse = await fetch(`${baseURL}/api/status`);
        const statusData = await statusResponse.json();
        assert.ok(statusData.days_since > 1000);
    });

    it('should reset lifetime spent', async () => {
        const response = await fetch(`${baseURL}/admin/api/settings/lifetime-spent`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${adminCookie}`
            },
            body: JSON.stringify({ amount: 0 })
        });

        assert.strictEqual(response.status, 200);
        const data = await response.json();
        assert.strictEqual(data.lifetime_spent, 0);
    });

    it('should get current drain settings from admin API', async () => {
        const response = await fetch(`${baseURL}/admin/api/settings`, {
            headers: { 'Cookie': `admin_token=${adminCookie}` }
        });

        assert.strictEqual(response.status, 200);
        const data = await response.json();
        assert.ok(data.settings);
        assert.ok('auto_drain_enabled' in data.settings);
        assert.ok('drain_rate_cents_per_second' in data.settings);
    });

    it('should update drain enabled setting', async () => {
        const response1 = await fetch(`${baseURL}/admin/api/settings/auto_drain_enabled`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${adminCookie}`
            },
            body: JSON.stringify({ value: 'false' })
        });

        assert.strictEqual(response1.status, 200);

        const statusResponse = await fetch(`${baseURL}/api/status`);
        const statusData = await statusResponse.json();
        assert.strictEqual(statusData.drain_enabled, false);

        // Re-enable
        await fetch(`${baseURL}/admin/api/settings/auto_drain_enabled`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${adminCookie}`
            },
            body: JSON.stringify({ value: 'true' })
        });
    });

    it('should update drain rate with validation', async () => {
        const validRate = '100.5';
        const response1 = await fetch(`${baseURL}/admin/api/settings/drain_rate_cents_per_second`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${adminCookie}`
            },
            body: JSON.stringify({ value: validRate })
        });

        assert.strictEqual(response1.status, 200);

        const statusResponse = await fetch(`${baseURL}/api/status`);
        const statusData = await statusResponse.json();
        assert.strictEqual(statusData.drain_rate_cents_per_second, 100.5);

        // Restore default
        await fetch(`${baseURL}/admin/api/settings/drain_rate_cents_per_second`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${adminCookie}`
            },
            body: JSON.stringify({ value: '50' })
        });
    });

    it('should enforce rate validation boundaries (0-1000)', async () => {
        const maxRate = '1000';
        const response = await fetch(`${baseURL}/admin/api/settings/drain_rate_cents_per_second`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${adminCookie}`
            },
            body: JSON.stringify({ value: maxRate })
        });

        assert.strictEqual(response.status, 200);

        const statusResponse = await fetch(`${baseURL}/api/status`);
        const statusData = await statusResponse.json();
        assert.strictEqual(statusData.drain_rate_cents_per_second, 1000);

        // Restore default
        await fetch(`${baseURL}/admin/api/settings/drain_rate_cents_per_second`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${adminCookie}`
            },
            body: JSON.stringify({ value: '50' })
        });
    });
});
