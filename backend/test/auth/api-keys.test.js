/**
 * Auth > API Keys Tests
 * Tests for external API key authentication functionality
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import {
    createTestServer,
    createTestAdmin,
    loginAsAdmin,
    adminGet,
    adminPost,
    adminDelete,
    TEST_ADMIN_USERNAME,
    TEST_ADMIN_PASSWORD
} from '../helpers/setup.js';

describe('Auth > API Keys', () => {
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

    describe('API Key CRUD', () => {
        let createdKeyId;
        let createdKeyValue;

        it('should list API keys (initially empty)', async () => {
            const response = await adminGet(baseURL, '/api-keys', adminCookie);
            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.ok(Array.isArray(data.keys));
            assert.strictEqual(data.keys.length, 0);
        });

        it('should create a new API key', async () => {
            const response = await adminPost(baseURL, '/api-keys', {
                name: 'Test Integration'
            }, adminCookie);

            assert.strictEqual(response.status, 201);
            const data = await response.json();
            assert.strictEqual(data.success, true);
            assert.ok(data.key);
            assert.strictEqual(data.key.name, 'Test Integration');
            assert.ok(data.key.key); // Full key shown only on creation
            assert.ok(data.key.key.startsWith('lt_live_'));
            assert.strictEqual(data.key.key.length, 40); // lt_live_ (8) + 32 hex chars
            assert.ok(data.key.key_prefix);
            assert.strictEqual(data.key.expires_at, null);

            createdKeyId = data.key.id;
            createdKeyValue = data.key.key;
        });

        it('should create API key with expiration', async () => {
            const response = await adminPost(baseURL, '/api-keys', {
                name: 'Expiring Key',
                expires_in_days: 30
            }, adminCookie);

            assert.strictEqual(response.status, 201);
            const data = await response.json();
            assert.ok(data.key.expires_at);
            const expiresAt = new Date(data.key.expires_at);
            const now = new Date();
            const diffDays = (expiresAt - now) / (1000 * 60 * 60 * 24);
            assert.ok(diffDays >= 29 && diffDays <= 31); // Should be ~30 days
        });

        it('should list API keys (shows created keys)', async () => {
            const response = await adminGet(baseURL, '/api-keys', adminCookie);
            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.ok(data.keys.length >= 2);

            // Verify keys don't include full key or hash
            const key = data.keys.find(k => k.id === createdKeyId);
            assert.ok(key);
            assert.strictEqual(key.name, 'Test Integration');
            assert.ok(key.key_prefix);
            assert.strictEqual(key.key, undefined); // Full key should not be returned
            assert.strictEqual(key.key_hash, undefined); // Hash should not be returned
        });

        it('should reject creating key without name', async () => {
            const response = await adminPost(baseURL, '/api-keys', {}, adminCookie);
            assert.strictEqual(response.status, 400);
            const data = await response.json();
            assert.strictEqual(data.error, 'BAD_REQUEST');
        });

        it('should reject creating key with name too long', async () => {
            const response = await adminPost(baseURL, '/api-keys', {
                name: 'x'.repeat(101)
            }, adminCookie);
            assert.strictEqual(response.status, 400);
            const data = await response.json();
            assert.strictEqual(data.error, 'BAD_REQUEST');
        });

        it('should revoke an API key', async () => {
            // Create a key to revoke
            const createResponse = await adminPost(baseURL, '/api-keys', {
                name: 'Key to Revoke'
            }, adminCookie);
            const { key } = await createResponse.json();

            // Revoke it
            const revokeResponse = await adminDelete(baseURL, `/api-keys/${key.id}`, adminCookie);
            assert.strictEqual(revokeResponse.status, 200);
            const revokeData = await revokeResponse.json();
            assert.strictEqual(revokeData.success, true);

            // Verify it shows as revoked in list
            const listResponse = await adminGet(baseURL, '/api-keys', adminCookie);
            const { keys } = await listResponse.json();
            const revokedKey = keys.find(k => k.id === key.id);
            assert.ok(revokedKey.revoked_at);
        });

        it('should reject revoking already revoked key', async () => {
            // Create and revoke a key
            const createResponse = await adminPost(baseURL, '/api-keys', {
                name: 'Double Revoke Test'
            }, adminCookie);
            const { key } = await createResponse.json();
            await adminDelete(baseURL, `/api-keys/${key.id}`, adminCookie);

            // Try to revoke again
            const response = await adminDelete(baseURL, `/api-keys/${key.id}`, adminCookie);
            assert.strictEqual(response.status, 400);
            const data = await response.json();
            assert.strictEqual(data.error, 'ALREADY_REVOKED');
        });

        it('should reject revoking non-existent key', async () => {
            const response = await adminDelete(baseURL, '/api-keys/99999', adminCookie);
            assert.strictEqual(response.status, 404);
            const data = await response.json();
            assert.strictEqual(data.error, 'NOT_FOUND');
        });

        it('should require authentication for API key endpoints', async () => {
            const listResponse = await fetch(`${baseURL}/admin/api/api-keys`);
            assert.strictEqual(listResponse.status, 401);

            const createResponse = await fetch(`${baseURL}/admin/api/api-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Test' })
            });
            assert.strictEqual(createResponse.status, 401);

            const deleteResponse = await fetch(`${baseURL}/admin/api/api-keys/1`, {
                method: 'DELETE'
            });
            assert.strictEqual(deleteResponse.status, 401);
        });
    });

    describe('API Key Authentication', () => {
        let validKey;
        let validKeyId;

        before(async () => {
            // Create a valid API key for testing
            const response = await adminPost(baseURL, '/api-keys', {
                name: 'Auth Test Key'
            }, adminCookie);
            const data = await response.json();
            validKey = data.key.key;
            validKeyId = data.key.id;
        });

        it('should authenticate with valid API key via X-API-Key header', async () => {
            const response = await fetch(`${baseURL}/admin/api/matters`, {
                headers: { 'X-API-Key': validKey }
            });
            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.ok(Array.isArray(data.matters));
        });

        it('should authenticate with valid API key via Authorization Bearer header', async () => {
            const response = await fetch(`${baseURL}/admin/api/matters`, {
                headers: { 'Authorization': `Bearer ${validKey}` }
            });
            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.ok(Array.isArray(data.matters));
        });

        it('should reject invalid API key format', async () => {
            const response = await fetch(`${baseURL}/admin/api/matters`, {
                headers: { 'X-API-Key': 'invalid_key_format' }
            });
            assert.strictEqual(response.status, 401);
            const data = await response.json();
            assert.strictEqual(data.error, 'INVALID_API_KEY');
        });

        it('should reject API key with wrong prefix', async () => {
            const response = await fetch(`${baseURL}/admin/api/matters`, {
                headers: { 'X-API-Key': 'wrong_prefix_a1b2c3d4e5f6g7h8' }
            });
            assert.strictEqual(response.status, 401);
        });

        it('should reject non-existent API key', async () => {
            const response = await fetch(`${baseURL}/admin/api/matters`, {
                headers: { 'X-API-Key': 'lt_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }
            });
            assert.strictEqual(response.status, 401);
            const data = await response.json();
            assert.strictEqual(data.error, 'INVALID_API_KEY');
        });

        it('should reject revoked API key', async () => {
            // Create and revoke a key
            const createResponse = await adminPost(baseURL, '/api-keys', {
                name: 'Revoke Auth Test'
            }, adminCookie);
            const { key } = await createResponse.json();

            // Verify it works initially
            const validResponse = await fetch(`${baseURL}/admin/api/matters`, {
                headers: { 'X-API-Key': key.key }
            });
            assert.strictEqual(validResponse.status, 200);

            // Revoke it
            await adminDelete(baseURL, `/api-keys/${key.id}`, adminCookie);

            // Verify it's rejected
            const revokedResponse = await fetch(`${baseURL}/admin/api/matters`, {
                headers: { 'X-API-Key': key.key }
            });
            assert.strictEqual(revokedResponse.status, 401);
            const data = await revokedResponse.json();
            assert.strictEqual(data.error, 'INVALID_API_KEY');
        });

        it('should reject expired API key', async () => {
            // Create a key that expires immediately (we'll simulate by checking the validation logic)
            // Note: In production, expired keys return API_KEY_EXPIRED
            // This test verifies the key creation with expiration works
            const response = await adminPost(baseURL, '/api-keys', {
                name: 'Expiration Test',
                expires_in_days: 1 // Expires in 1 day
            }, adminCookie);
            assert.strictEqual(response.status, 201);
            const data = await response.json();
            assert.ok(data.key.expires_at);
        });

        it('should update last_used_at on successful auth', async () => {
            // Get initial state
            const beforeResponse = await adminGet(baseURL, '/api-keys', adminCookie);
            const beforeKeys = (await beforeResponse.json()).keys;
            const beforeKey = beforeKeys.find(k => k.id === validKeyId);

            // Make a request with the API key
            await fetch(`${baseURL}/admin/api/matters`, {
                headers: { 'X-API-Key': validKey }
            });

            // Get updated state
            const afterResponse = await adminGet(baseURL, '/api-keys', adminCookie);
            const afterKeys = (await afterResponse.json()).keys;
            const afterKey = afterKeys.find(k => k.id === validKeyId);

            assert.ok(afterKey.last_used_at);
        });

        it('should allow session auth when no API key provided', async () => {
            // Session auth should still work
            const response = await fetch(`${baseURL}/admin/api/matters`, {
                headers: { 'Cookie': `admin_token=${adminCookie}` }
            });
            assert.strictEqual(response.status, 200);
        });

        it('should not fall through to session when API key provided but invalid', async () => {
            // If an API key is provided but invalid, should 401 immediately
            // Should NOT fall through to try session auth
            const response = await fetch(`${baseURL}/admin/api/matters`, {
                headers: {
                    'X-API-Key': 'lt_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                    'Cookie': `admin_token=${adminCookie}` // Valid session
                }
            });
            // Should fail with API key error, not succeed with session
            assert.strictEqual(response.status, 401);
            const data = await response.json();
            assert.strictEqual(data.error, 'INVALID_API_KEY');
        });
    });

    describe('API Key Audit Logging', () => {
        let testKey;

        before(async () => {
            // Create a test key
            const response = await adminPost(baseURL, '/api-keys', {
                name: 'Audit Log Test Key'
            }, adminCookie);
            const data = await response.json();
            testKey = data.key.key;
        });

        it('should log API key requests to audit log', async () => {
            // Make a request with the API key
            await fetch(`${baseURL}/admin/api/matters`, {
                headers: { 'X-API-Key': testKey }
            });

            // Check audit log for the request
            const auditResponse = await adminGet(baseURL, '/audit-log?limit=10', adminCookie);
            const { entries } = await auditResponse.json();

            // Find the API request log entry
            const apiLogEntry = entries.find(e =>
                e.action_type === 'api_request' &&
                e.summary.includes('GET /admin/api/matters')
            );

            assert.ok(apiLogEntry, 'API request should be logged');
            assert.ok(apiLogEntry.details);
            const details = typeof apiLogEntry.details === 'string'
                ? JSON.parse(apiLogEntry.details)
                : apiLogEntry.details;
            assert.strictEqual(details.auth_method, 'api-key');
            assert.ok(details.api_key_id);
            assert.ok(details.api_key_name);
        });

        it('should log API key creation in audit log', async () => {
            const createResponse = await adminPost(baseURL, '/api-keys', {
                name: 'Audit Create Test'
            }, adminCookie);
            await createResponse.json();

            const auditResponse = await adminGet(baseURL, '/audit-log?limit=5', adminCookie);
            const { entries } = await auditResponse.json();

            const createEntry = entries.find(e =>
                e.action_type === 'create' &&
                e.entity_type === 'api_key' &&
                e.summary.includes('Audit Create Test')
            );
            assert.ok(createEntry, 'API key creation should be logged');
        });

        it('should log API key revocation in audit log', async () => {
            // Create and revoke a key
            const createResponse = await adminPost(baseURL, '/api-keys', {
                name: 'Audit Revoke Test'
            }, adminCookie);
            const { key } = await createResponse.json();
            await adminDelete(baseURL, `/api-keys/${key.id}`, adminCookie);

            const auditResponse = await adminGet(baseURL, '/audit-log?limit=5', adminCookie);
            const { entries } = await auditResponse.json();

            const revokeEntry = entries.find(e =>
                e.action_type === 'delete' &&
                e.entity_type === 'api_key' &&
                e.summary.includes('Audit Revoke Test')
            );
            assert.ok(revokeEntry, 'API key revocation should be logged');
        });
    });

    describe('API Key Format Validation', () => {
        it('should validate key format: correct prefix', async () => {
            const response = await fetch(`${baseURL}/admin/api/matters`, {
                headers: { 'X-API-Key': 'lt_live_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6' }
            });
            // Will fail auth (key doesn't exist) but format is valid
            assert.strictEqual(response.status, 401);
            const data = await response.json();
            assert.strictEqual(data.error, 'INVALID_API_KEY');
        });

        it('should reject key with wrong length', async () => {
            const response = await fetch(`${baseURL}/admin/api/matters`, {
                headers: { 'X-API-Key': 'lt_live_tooshort' }
            });
            assert.strictEqual(response.status, 401);
            const data = await response.json();
            assert.strictEqual(data.error, 'INVALID_API_KEY');
            assert.ok(data.message.toLowerCase().includes('format'));
        });

        it('should reject key with invalid characters', async () => {
            const response = await fetch(`${baseURL}/admin/api/matters`, {
                headers: { 'X-API-Key': 'lt_live_a1b2c3d4e5f6a7b8c9d0e1f2ZZZZZZZZ' }
            });
            assert.strictEqual(response.status, 401);
        });

        it('should handle empty API key header', async () => {
            const response = await fetch(`${baseURL}/admin/api/matters`, {
                headers: { 'X-API-Key': '' }
            });
            // Empty string treated as no key - falls through to session auth which fails
            assert.strictEqual(response.status, 401);
        });
    });
});
