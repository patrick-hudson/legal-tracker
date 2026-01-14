#!/usr/bin/env node
/**
 * Get Auth Token Script
 *
 * Generates a valid JWT token for testing authenticated API endpoints.
 *
 * IMPORTANT: This script creates a new session in the database file, but if the server
 * is already running, it won't see the new session until restarted.
 *
 * Usage: node scripts/get-auth-token.js [username]
 *
 * The token is printed to stdout and can be used with curl:
 *   TOKEN=$(node scripts/get-auth-token.js)
 *   curl -H "Cookie: admin_token=$TOKEN" http://localhost:3000/admin/api/audit-log
 *
 * NOTE: After running this script, restart the server for the session to be recognized,
 * or use the --restart flag to trigger a watchdog restart automatically.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import { createDatabase } from '../db/index.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const shouldRestart = process.argv.includes('--restart');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const username = args[0] || 'admin';

async function getToken() {
  // Create database connection
  const { adminUsersDb, adminSessionsDb } = await createDatabase(join(__dirname, '..', 'data', 'tracker.db'));

  // Get user from database
  const user = adminUsersDb.getByUsername(username);

  if (!user) {
    const allUsers = adminUsersDb.getAll();
    console.error(`Error: User "${username}" not found`);
    if (allUsers.length > 0) {
      console.error('Available users:', allUsers.map(u => u.username).join(', '));
    } else {
      console.error('No admin users exist. Run bootstrap first.');
    }
    process.exit(1);
  }

  // Create a minimal fastify instance just for JWT signing
  const fastify = Fastify({ logger: false });
  const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

  await fastify.register(jwt, { secret: JWT_SECRET });

  // Generate JWT token directly (bypassing password check for dev purposes)
  const jti = `dev-${Date.now()}`;
  const token = fastify.jwt.sign(
    {
      id: user.id,
      username: user.username,
      jti
    },
    { expiresIn: '1h' }
  );

  // Create session so token is valid
  // create(userId, tokenJti, expiresAt, ip, userAgent)
  adminSessionsDb.create(
    user.id,
    jti,
    new Date(Date.now() + 3600000).toISOString(),
    '127.0.0.1',
    'dev-script'
  );

  await fastify.close();

  // If --restart flag is set, trigger watchdog restart
  if (shouldRestart) {
    try {
      const watchdogKey = process.env.WATCHDOG_API_KEY || process.env.API_KEY || 'watchdog-dev-key';
      const res = await fetch('http://localhost:3001/restart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': watchdogKey
        },
        body: JSON.stringify({ reason: 'dev-token-script' })
      });
      if (res.ok) {
        // Wait for server to restart
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch {
      // Watchdog not running, that's ok
    }
  }

  console.log(token);
}

getToken().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
