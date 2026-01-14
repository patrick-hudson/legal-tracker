/**
 * Auth > Login Tests
 * Tests for admin authentication login/logout functionality
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import {
    createTestServer,
    createTestAdmin,
    hashForLogin,
    TEST_ADMIN_USERNAME,
    TEST_ADMIN_PASSWORD
} from '../helpers/setup.js';

describe('Auth > Login', () => {
    let server;
    let baseURL;
    let adminCookie;

    before(async () => {
        const env = await createTestServer();
        server = env.server;
        baseURL = env.baseURL;
        await createTestAdmin(server);
    });

    after(async () => {
        await server.close();
    });

    it('should reject login with invalid credentials', async () => {
        const hashedPassword = hashForLogin(TEST_ADMIN_USERNAME, 'wrongpass');

        const response = await fetch(`${baseURL}/admin/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: TEST_ADMIN_USERNAME, hashedPassword })
        });

        assert.strictEqual(response.status, 401);
        const data = await response.json();
        assert.strictEqual(data.error, 'INVALID_CREDENTIALS');
    });

    it('should login with correct credentials and return cookie', async () => {
        const hashedPassword = hashForLogin(TEST_ADMIN_USERNAME, TEST_ADMIN_PASSWORD);

        const response = await fetch(`${baseURL}/admin/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: TEST_ADMIN_USERNAME, hashedPassword })
        });

        assert.strictEqual(response.status, 200);
        const data = await response.json();
        assert.strictEqual(data.success, true);
        assert.ok(data.user);
        assert.strictEqual(data.user.username, TEST_ADMIN_USERNAME);

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
        assert.strictEqual(data.user.username, TEST_ADMIN_USERNAME);
    });

    it('should reject requests without authentication', async () => {
        const response = await fetch(`${baseURL}/admin/api/matters`);
        assert.strictEqual(response.status, 401);
    });
});
