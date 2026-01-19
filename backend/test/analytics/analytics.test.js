/**
 * Analytics API Tests
 * Tests for /admin/api/analytics and /admin/api/dashboard endpoints
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import {
    setupTestEnvironment,
    adminGet,
    adminPost
} from '../helpers/setup.js';

describe('Analytics Tests', () => {
    let server, baseURL, adminCookie;

    before(async () => {
        const env = await setupTestEnvironment();
        server = env.server;
        baseURL = env.baseURL;
        adminCookie = env.adminCookie;
    });

    after(async () => {
        await server.close();
    });

    describe('Analytics Endpoint', () => {
        it('should return analytics data with empty matters', async () => {
            const response = await adminGet(baseURL, '/analytics', adminCookie);
            assert.strictEqual(response.status, 200);

            const data = await response.json();
            assert.strictEqual(data.total, 0);
            assert.strictEqual(data.this_year, 0);
            assert.strictEqual(data.max_streak, 0);
            assert.deepStrictEqual(data.by_month, {});
            assert.deepStrictEqual(data.by_year, {});
            assert.deepStrictEqual(data.spending_by_month, {});
            assert.ok(data.summary);
            assert.strictEqual(data.summary.avg_cost_cents, 0);
            assert.strictEqual(data.summary.max_cost_cents, 0);
            assert.strictEqual(data.summary.total_cost_cents, 0);
            assert.strictEqual(data.summary.avg_days_between, 0);
            assert.ok(Array.isArray(data.matters));
        });

        it('should require authentication', async () => {
            const response = await adminGet(baseURL, '/analytics', null);
            assert.strictEqual(response.status, 401);
        });
    });

    describe('Analytics Calculations', () => {
        before(async () => {
            // Create test matters with known values
            // API expects cost in DOLLARS, stores in CENTS
            const matters = [
                { matter_date: '2024-01-15', note: 'Matter 1', cost: 100 },   // $100 -> 10000 cents
                { matter_date: '2024-02-20', note: 'Matter 2', cost: 250 },   // $250 -> 25000 cents
                { matter_date: '2024-02-25', note: 'Matter 3', cost: 150 },   // $150 -> 15000 cents
                { matter_date: '2025-03-10', note: 'Matter 4', cost: 500 },   // $500 -> 50000 cents
            ];

            for (const matter of matters) {
                await adminPost(baseURL, '/matters', matter, adminCookie);
            }
        });

        it('should calculate total matters correctly', async () => {
            const response = await adminGet(baseURL, '/analytics', adminCookie);
            const data = await response.json();
            assert.strictEqual(data.total, 4);
        });

        it('should group matters by year', async () => {
            const response = await adminGet(baseURL, '/analytics', adminCookie);
            const data = await response.json();
            assert.strictEqual(data.by_year[2024], 3);
            assert.strictEqual(data.by_year[2025], 1);
        });

        it('should group matters by month', async () => {
            const response = await adminGet(baseURL, '/analytics', adminCookie);
            const data = await response.json();
            assert.strictEqual(data.by_month['2024-01'], 1);
            assert.strictEqual(data.by_month['2024-02'], 2);
            assert.strictEqual(data.by_month['2025-03'], 1);
        });

        it('should calculate spending by month in cents', async () => {
            const response = await adminGet(baseURL, '/analytics', adminCookie);
            const data = await response.json();
            assert.strictEqual(data.spending_by_month['2024-01'], 10000);  // $100 in cents
            assert.strictEqual(data.spending_by_month['2024-02'], 40000);  // $400 in cents (250+150)
            assert.strictEqual(data.spending_by_month['2025-03'], 50000);  // $500 in cents
        });

        it('should calculate summary statistics correctly', async () => {
            const response = await adminGet(baseURL, '/analytics', adminCookie);
            const data = await response.json();

            // Total cost: 10000 + 25000 + 15000 + 50000 = 100000 cents = $1000
            assert.strictEqual(data.summary.total_cost_cents, 100000);

            // Average cost: 100000 / 4 = 25000 cents = $250
            assert.strictEqual(data.summary.avg_cost_cents, 25000);

            // Max cost: 50000 cents = $500
            assert.strictEqual(data.summary.max_cost_cents, 50000);
        });

        it('should return all matters in response', async () => {
            const response = await adminGet(baseURL, '/analytics', adminCookie);
            const data = await response.json();
            assert.strictEqual(data.matters.length, 4);

            // Check that matters have expected fields
            const matter = data.matters[0];
            assert.ok(matter.id);
            assert.ok(matter.matter_date);
            assert.ok(matter.note);
            assert.ok(typeof matter.cost === 'number');
        });
    });

    describe('Dashboard Endpoint', () => {
        it('should return dashboard data', async () => {
            const response = await adminGet(baseURL, '/dashboard', adminCookie);
            assert.strictEqual(response.status, 200);

            const data = await response.json();
            assert.ok(typeof data.days_since === 'number');
            assert.ok(typeof data.lifetime_spent === 'number');
            assert.ok(data.stats);
            assert.ok(typeof data.stats.total_matters === 'number');
            assert.ok(typeof data.stats.matters_this_year === 'number');
            assert.ok(typeof data.stats.max_streak === 'number');
            assert.ok(Array.isArray(data.recent_matters));
            assert.ok(data.charts);
            assert.ok(data.charts.by_month);
            assert.ok(data.charts.spending_by_month);
        });

        it('should require authentication', async () => {
            const response = await adminGet(baseURL, '/dashboard', null);
            assert.strictEqual(response.status, 401);
        });

        it('should return chart data for dashboard', async () => {
            const response = await adminGet(baseURL, '/dashboard', adminCookie);
            const data = await response.json();

            // Chart data should match analytics data
            assert.strictEqual(data.charts.by_month['2024-01'], 1);
            assert.strictEqual(data.charts.by_month['2024-02'], 2);
            // Spending is stored in cents
            assert.strictEqual(data.charts.spending_by_month['2024-01'], 10000);  // $100 in cents
            assert.strictEqual(data.charts.spending_by_month['2024-02'], 40000);  // $400 in cents
        });

        it('should limit recent_matters to 10', async () => {
            const response = await adminGet(baseURL, '/dashboard', adminCookie);
            const data = await response.json();
            assert.ok(data.recent_matters.length <= 10);
        });
    });

    describe('Zero and Null Handling', () => {
        it('should handle zero cost matters and preserve zero values', async () => {
            // Create a matter with zero cost using a unique month not used elsewhere
            const createResponse = await adminPost(baseURL, '/matters', {
                matter_date: '2023-12-15',  // Unique month
                note: 'Free consultation',
                cost: 0
            }, adminCookie);
            // 201 is correct for resource creation
            assert.ok([200, 201].includes(createResponse.status), `Expected 200 or 201, got ${createResponse.status}`);

            const response = await adminGet(baseURL, '/analytics', adminCookie);
            const data = await response.json();

            // The matter count should be in by_month for December 2023
            assert.strictEqual(data.by_month['2023-12'], 1, 'December 2023 should have 1 matter');

            // Zero cost should be included in spending - the key should exist with value 0
            assert.ok('2023-12' in data.spending_by_month, `spending_by_month should have 2023-12 key, got keys: ${Object.keys(data.spending_by_month).join(', ')}`);
            assert.strictEqual(data.spending_by_month['2023-12'], 0, 'Zero cost should be preserved as 0, not undefined');

            // Double check it's actually 0, not falsy
            assert.notStrictEqual(data.spending_by_month['2023-12'], undefined);
            assert.notStrictEqual(data.spending_by_month['2023-12'], null);
        });
    });
});
