/**
 * Matters > Drain Tests
 * Tests for drain calculation and accumulation
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { setupTestEnvironment } from '../helpers/setup.js';

describe('Matters > Drain Calculation', () => {
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

    it('should return drain information in status', async () => {
        const response = await fetch(`${baseURL}/api/status`);
        const data = await response.json();

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

        const expectedTotal = data.lifetime_spent + data.accumulated_drain;
        assert.strictEqual(
            data.total_spent,
            expectedTotal,
            'total_spent should equal lifetime_spent + accumulated_drain'
        );
    });

    it('should not accumulate drain when disabled', async () => {
        // Disable drain
        await fetch(`${baseURL}/admin/api/settings/auto_drain_enabled`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${adminCookie}`
            },
            body: JSON.stringify({ value: 'false' })
        });

        const response1 = await fetch(`${baseURL}/api/status`);
        const data1 = await response1.json();
        assert.strictEqual(data1.drain_enabled, false);
        assert.strictEqual(data1.accumulated_drain, 0);

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Drain should not have accumulated
        const response2 = await fetch(`${baseURL}/api/status`);
        const data2 = await response2.json();
        assert.strictEqual(data2.accumulated_drain, 0);

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
});
