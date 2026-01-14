/**
 * Rate Limiting Tests
 *
 * Tests that verify rate limiting is working correctly on protected endpoints.
 * This test file runs with rate limiting ENABLED (unlike other test files).
 */

import { test } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { createServer } from '../../server.js';

// Helper function to hash password client-side (same as admin/js/auth.js)
function hashPasswordClientSide(username, password, salt) {
  const message = `${username}:${password}:${salt}`;
  return crypto.createHash('sha256').update(message).digest('hex');
}

test('Rate Limiting Tests', async (t) => {
  const PASSWORD_SALT = 'test-salt-rate-limit';
  let fastify;
  let baseURL;

  t.before(async () => {
    process.env.PASSWORD_SALT = PASSWORD_SALT;

    // Create server WITH rate limiting enabled (disableRateLimit: false is default)
    fastify = await createServer({
      logger: false,
      dbPath: ':memory:',
      disableRateLimit: false  // Explicitly enable rate limiting for these tests
    });

    const address = await fastify.listen({ port: 0, host: '127.0.0.1' });
    baseURL = `http://127.0.0.1:${fastify.server.address().port}`;
  });

  t.after(async () => {
    await fastify.close();
  });

  await t.test('Login endpoint rate limiting', async (t) => {
    await t.test('should return 429 after exceeding login rate limit', async () => {
      const username = 'nonexistent';
      const hashedPassword = hashPasswordClientSide(username, 'wrongpassword', PASSWORD_SALT);

      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        await fetch(`${baseURL}/admin/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, hashedPassword })
        });
      }

      // The 6th request should be rate limited
      const response = await fetch(`${baseURL}/admin/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, hashedPassword })
      });

      assert.strictEqual(response.status, 429, 'Should return 429 Too Many Requests');
    });
  });
});
