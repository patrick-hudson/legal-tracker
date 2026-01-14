/**
 * Auth > Password Tests
 * Tests for password change functionality
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import {
    createTestServer,
    createTestAdmin,
    hashForLogin,
    loginAsAdmin,
    TEST_ADMIN_USERNAME,
    TEST_ADMIN_PASSWORD
} from '../helpers/setup.js';

describe('Auth > Password Change', () => {
    let server;
    let baseURL;
    let adminCookie;

    before(async () => {
        const env = await createTestServer();
        server = env.server;
        baseURL = env.baseURL;
        await createTestAdmin(server);
        adminCookie = await loginAsAdmin(baseURL);
    });

    after(async () => {
        await server.close();
    });

    it('should reject password change with incorrect current password', async () => {
        const hashedCurrentPassword = hashForLogin(TEST_ADMIN_USERNAME, 'wrongpass');
        const hashedNewPassword = hashForLogin(TEST_ADMIN_USERNAME, 'newpass123');

        const response = await fetch(`${baseURL}/admin/api/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${adminCookie}`
            },
            body: JSON.stringify({
                currentPassword: hashedCurrentPassword,
                newPassword: hashedNewPassword
            })
        });

        assert.strictEqual(response.status, 401);
        const data = await response.json();
        assert.strictEqual(data.error, 'INVALID_PASSWORD');
        assert.ok(data.message.includes('incorrect'));
    });

    it('should successfully change password with correct current password', async () => {
        const newPassword = 'newpass456';
        const hashedCurrentPassword = hashForLogin(TEST_ADMIN_USERNAME, TEST_ADMIN_PASSWORD);
        const hashedNewPassword = hashForLogin(TEST_ADMIN_USERNAME, newPassword);

        const response = await fetch(`${baseURL}/admin/api/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${adminCookie}`
            },
            body: JSON.stringify({
                currentPassword: hashedCurrentPassword,
                newPassword: hashedNewPassword
            })
        });

        assert.strictEqual(response.status, 200);
        const data = await response.json();
        assert.strictEqual(data.success, true);
        assert.ok(data.message.includes('successfully'));

        // Re-login with new password
        const loginResponse = await fetch(`${baseURL}/admin/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: TEST_ADMIN_USERNAME, hashedPassword: hashedNewPassword })
        });
        assert.strictEqual(loginResponse.status, 200);
        const setCookie = loginResponse.headers.get('set-cookie');
        adminCookie = setCookie.match(/admin_token=([^;]+)/)[1];
    });

    it('should invalidate all sessions after password change', async () => {
        const currentPassword = 'newpass456';
        const newPassword = 'securepass789';
        const hashedCurrentPassword = hashForLogin(TEST_ADMIN_USERNAME, currentPassword);
        const hashedNewPassword = hashForLogin(TEST_ADMIN_USERNAME, newPassword);

        const changeResponse = await fetch(`${baseURL}/admin/api/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${adminCookie}`
            },
            body: JSON.stringify({
                currentPassword: hashedCurrentPassword,
                newPassword: hashedNewPassword
            })
        });

        assert.strictEqual(changeResponse.status, 200);

        // Old session should fail
        const meResponse = await fetch(`${baseURL}/admin/api/auth/me`, {
            headers: { 'Cookie': `admin_token=${adminCookie}` }
        });
        assert.strictEqual(meResponse.status, 401);
    });

    it('should reject password change without authentication', async () => {
        const hashedCurrentPassword = hashForLogin(TEST_ADMIN_USERNAME, 'anypass');
        const hashedNewPassword = hashForLogin(TEST_ADMIN_USERNAME, 'anotherpass');

        const response = await fetch(`${baseURL}/admin/api/auth/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentPassword: hashedCurrentPassword,
                newPassword: hashedNewPassword
            })
        });

        assert.strictEqual(response.status, 401);
    });

    it('should reject password change with missing fields', async () => {
        // Get fresh login first
        const newCookie = await loginAsAdmin(baseURL, TEST_ADMIN_USERNAME, 'securepass789');

        // Missing newPassword
        let response = await fetch(`${baseURL}/admin/api/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${newCookie}`
            },
            body: JSON.stringify({ currentPassword: 'hash123' })
        });

        assert.strictEqual(response.status, 400);
        let data = await response.json();
        assert.strictEqual(data.error, 'BAD_REQUEST');

        // Missing currentPassword
        response = await fetch(`${baseURL}/admin/api/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${newCookie}`
            },
            body: JSON.stringify({ newPassword: 'hash456' })
        });

        assert.strictEqual(response.status, 400);
        data = await response.json();
        assert.strictEqual(data.error, 'BAD_REQUEST');
    });

    it('should reject password change with invalid hash format', async () => {
        const newCookie = await loginAsAdmin(baseURL, TEST_ADMIN_USERNAME, 'securepass789');

        // Non-hex characters
        let response = await fetch(`${baseURL}/admin/api/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${newCookie}`
            },
            body: JSON.stringify({
                currentPassword: 'z'.repeat(64),
                newPassword: 'a'.repeat(64)
            })
        });

        assert.strictEqual(response.status, 400);
        let data = await response.json();
        assert.strictEqual(data.error, 'BAD_REQUEST');
        assert.ok(data.message.includes('Invalid password format'));

        // Too short
        response = await fetch(`${baseURL}/admin/api/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `admin_token=${newCookie}`
            },
            body: JSON.stringify({
                currentPassword: 'abc123',
                newPassword: 'def456'
            })
        });

        assert.strictEqual(response.status, 400);
        data = await response.json();
        assert.strictEqual(data.error, 'BAD_REQUEST');
    });
});
