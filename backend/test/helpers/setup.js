/**
 * Shared test utilities and setup helpers
 */
import crypto from 'crypto';
import { createServer } from '../../server.js';
import { hashPassword } from '../../auth.js';

export const TEST_PASSWORD_SALT = 'test-salt-for-testing';
export const TEST_ADMIN_USERNAME = 'testadmin';
export const TEST_ADMIN_PASSWORD = 'testpass123';
export const TEST_ADMIN_EMAIL = 'test@example.com';

/**
 * Create a test server instance with in-memory database
 * @param {Object} options - Additional server options
 * @returns {Promise<{server: Object, baseURL: string}>}
 */
export async function createTestServer(options = {}) {
    process.env.PASSWORD_SALT = TEST_PASSWORD_SALT;

    const server = await createServer({
        logger: false,
        dbPath: ':memory:',
        requireAuth: false,
        disableRateLimit: true,
        ...options
    });

    const address = await server.listen({ port: 0, host: '127.0.0.1' });
    const port = server.server.address().port;
    const baseURL = `http://127.0.0.1:${port}`;

    return { server, baseURL };
}

/**
 * Create a test admin user in the database
 * @param {Object} server - Fastify server instance
 * @param {string} username - Admin username
 * @param {string} password - Admin password
 * @param {string} email - Admin email
 */
export async function createTestAdmin(server, username = TEST_ADMIN_USERNAME, password = TEST_ADMIN_PASSWORD, email = TEST_ADMIN_EMAIL) {
    const message = username + ':' + password + ':' + TEST_PASSWORD_SALT;
    const hashedPassword = crypto.createHash('sha256').update(message).digest('hex');
    const passwordHash = await hashPassword(hashedPassword);

    const { adminUsersDb } = server.db;
    adminUsersDb.create(username, passwordHash, email);
}

/**
 * Hash a password for login (client-side hash simulation)
 * @param {string} username
 * @param {string} password
 * @returns {string} SHA256 hashed password
 */
export function hashForLogin(username, password) {
    const message = username + ':' + password + ':' + TEST_PASSWORD_SALT;
    return crypto.createHash('sha256').update(message).digest('hex');
}

/**
 * Login as admin and return the auth cookie
 * @param {string} baseURL
 * @param {string} username
 * @param {string} password
 * @returns {Promise<string>} Admin cookie value
 */
export async function loginAsAdmin(baseURL, username = TEST_ADMIN_USERNAME, password = TEST_ADMIN_PASSWORD) {
    const hashedPassword = hashForLogin(username, password);

    const response = await fetch(`${baseURL}/admin/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, hashedPassword })
    });

    const cookies = response.headers.get('set-cookie');
    const match = cookies?.match(/admin_token=([^;]+)/);
    return match ? match[1] : null;
}

/**
 * Make an authenticated request to the admin API
 * @param {string} baseURL
 * @param {string} path - API path (without /admin/api prefix)
 * @param {Object} options - Fetch options
 * @param {string} cookie - Admin cookie
 * @returns {Promise<Response>}
 */
export async function adminRequest(baseURL, path, options = {}, cookie) {
    const url = `${baseURL}/admin/api${path}`;
    const headers = {
        ...options.headers
    };

    // Only set Content-Type for requests with a body
    if (options.body) {
        headers['Content-Type'] = 'application/json';
    }

    if (cookie) {
        headers['Cookie'] = `admin_token=${cookie}`;
    }

    return fetch(url, {
        ...options,
        headers
    });
}

/**
 * Make an authenticated GET request
 */
export async function adminGet(baseURL, path, cookie) {
    return adminRequest(baseURL, path, { method: 'GET' }, cookie);
}

/**
 * Make an authenticated POST request
 */
export async function adminPost(baseURL, path, body, cookie) {
    return adminRequest(baseURL, path, {
        method: 'POST',
        body: JSON.stringify(body)
    }, cookie);
}

/**
 * Make an authenticated PUT request
 */
export async function adminPut(baseURL, path, body, cookie) {
    return adminRequest(baseURL, path, {
        method: 'PUT',
        body: JSON.stringify(body)
    }, cookie);
}

/**
 * Make an authenticated DELETE request
 */
export async function adminDelete(baseURL, path, cookie) {
    return adminRequest(baseURL, path, { method: 'DELETE' }, cookie);
}

/**
 * Setup a complete test environment with server and logged-in admin
 * @param {Object} options - Server options
 * @returns {Promise<{server: Object, baseURL: string, adminCookie: string}>}
 */
export async function setupTestEnvironment(options = {}) {
    const { server, baseURL } = await createTestServer(options);
    await createTestAdmin(server);
    const adminCookie = await loginAsAdmin(baseURL);

    return { server, baseURL, adminCookie };
}

/**
 * Create a test matter
 * @param {string} baseURL
 * @param {string} cookie
 * @param {Object} matterData
 * @returns {Promise<Object>} Created matter
 */
export async function createTestMatter(baseURL, cookie, matterData = {}) {
    const defaultMatter = {
        matter_date: new Date().toISOString().split('T')[0],
        note: 'Test matter',
        cost: 10000, // $100.00
        ...matterData
    };

    const response = await adminPost(baseURL, '/matters', defaultMatter, cookie);
    return response.json();
}
