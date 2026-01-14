/**
 * Public routes (no authentication required)
 * Provides read-only access to public data
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import { getClientIP } from '../lib/helpers.js';
import { CACHE_TTL_MS } from '../lib/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

// Cache for commit push status (stale-while-revalidate)
const commitPushCache = {
  hash: null,
  pushed: false,
  timestamp: 0,
  refreshing: false
};

/**
 * Register public routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts - Contains settingsDb, mattersDb
 */
export default async function publicRoutes(fastify, opts) {
  const { settingsDb, mattersDb, requireAuth } = opts;

  // Health check
  fastify.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Get client configuration (including password salt for hashing)
  fastify.get('/api/config', async () => {
    return {
      passwordSalt: opts.passwordSalt,
      requireAuth
    };
  });

  // Get version and build info
  fastify.get('/api/version', async () => {
    // Read version from VERSION file
    let version = 'unknown';
    try {
      const versionPath = join(__dirname, '..', '..', 'VERSION');
      if (existsSync(versionPath)) {
        version = readFileSync(versionPath, 'utf8').trim();
      }
    } catch (error) {
      // Fall back to package.json version
      try {
        const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
        version = pkg.version || 'unknown';
      } catch {
        // ignore
      }
    }

    // Get git commit hash
    let commitHash = null;
    let commitHashShort = null;
    let commitPushed = false;
    try {
      commitHash = execSync('git rev-parse HEAD', { cwd: __dirname, encoding: 'utf8' }).trim();
      commitHashShort = execSync('git rev-parse --short HEAD', { cwd: __dirname, encoding: 'utf8' }).trim();

      // Stale-while-revalidate: return cached value, refresh in background if stale
      const now = Date.now();
      const cacheValid = commitPushCache.hash === commitHash && commitPushCache.timestamp > 0;
      const cacheStale = now - commitPushCache.timestamp > CACHE_TTL_MS;

      if (cacheValid) {
        // Use cached value
        commitPushed = commitPushCache.pushed;

        // If stale and not already refreshing, trigger background refresh
        if (cacheStale && !commitPushCache.refreshing) {
          commitPushCache.refreshing = true;
          // Background fetch and check
          execAsync('git fetch origin', { cwd: __dirname })
            .then(() => execAsync(`git branch -r --contains ${commitHash} 2>/dev/null`, { cwd: __dirname, shell: true }))
            .then(({ stdout }) => {
              commitPushCache.pushed = !!stdout.trim();
              commitPushCache.hash = commitHash;
              commitPushCache.timestamp = Date.now();
            })
            .catch(() => {
              // Keep existing cache value on error
            })
            .finally(() => {
              commitPushCache.refreshing = false;
            });
        }
      } else {
        // No valid cache - do synchronous check (first request or hash changed)
        try {
          const result = execSync(`git branch -r --contains ${commitHash} 2>/dev/null`, { cwd: __dirname, encoding: 'utf8', shell: true }).trim();
          commitPushed = !!result;
        } catch {
          commitPushed = false;
        }
        // Initialize cache
        commitPushCache.hash = commitHash;
        commitPushCache.pushed = commitPushed;
        commitPushCache.timestamp = now;
      }
    } catch {
      // Not a git repo or git not available
    }

    // Get environment setting (null means auto-detect on client)
    const envSetting = settingsDb.get('environment');
    const environment = (envSetting && envSetting !== 'null') ? envSetting : null;

    return {
      version,
      commitHash,
      commitHashShort,
      commitPushed,
      nodeVersion: process.version,
      environment
    };
  });

  // Get current status (main dashboard data)
  fastify.get('/api/status', async (request) => {
    const settings = settingsDb.getAll();
    const stats = mattersDb.getStats();

    const lastMatterDate = new Date(settings.last_matter_date || Date.now());
    const now = new Date();
    const daysSince = Math.floor((now - lastMatterDate) / (1000 * 60 * 60 * 24));

    // Calculate accumulated drain since drain_start_time
    const drainEnabled = settings.auto_drain_enabled === 'true';
    const drainRateCents = parseFloat(settings.drain_rate_cents_per_second || '50');
    const drainRateDollars = drainRateCents / 100; // Convert cents to dollars
    // lifetime_spent is stored in cents, convert to dollars
    const baseSpentCents = parseFloat(settings.lifetime_spent || '0');
    const baseSpent = baseSpentCents / 100; // Convert to dollars
    const drainStartTime = new Date(settings.drain_start_time || Date.now());
    const secondsElapsed = Math.floor((now - drainStartTime) / 1000);
    const accumulatedDrain = drainEnabled ? secondsElapsed * drainRateDollars : 0;
    const totalSpent = baseSpent + accumulatedDrain;

    return {
      days_since: daysSince,
      last_matter_date: settings.last_matter_date,
      lifetime_spent: baseSpent,
      accumulated_drain: accumulatedDrain,
      total_spent: totalSpent,
      drain_start_time: settings.drain_start_time,
      drain_enabled: drainEnabled,
      drain_rate_cents_per_second: drainRateCents,
      stats: {
        total_matters: stats.total,
        matters_this_year: stats.thisYear,
        max_streak: Math.max(stats.maxStreak, daysSince)
      },
      your_ip: getClientIP(request)
    };
  });

  // Get all matters (public read-only)
  fastify.get('/api/matters', async () => {
    const matters = mattersDb.getAll();
    // Convert cost from cents to dollars for output
    return matters.map(inc => ({
      ...inc,
      cost: inc.cost / 100 // Convert cents to dollars
    }));
  });
}
