import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyJWT from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fastifyMultipart from '@fastify/multipart';
import Anthropic from '@anthropic-ai/sdk';
import { createDatabase } from './db.js';
import { initAudit, logInfo, logError, logWarning, logInfoFromRequest, logErrorFromRequest, getUserContext, ACTION_TYPES, ENTITY_TYPES } from './audit.js';
import { hashPassword, verifyPassword, generateTokenId, generateApiKey, createAdminAuthMiddleware, getTokenExpiration, generateBootstrapToken, hashBootstrapToken, getBootstrapTokenExpiration, validatePasswordStrength } from './auth.js';
import { createStorage, createStorageFromConfig, validateFileType, sanitizeFilename, MAX_FILE_SIZE } from './storage.js';
import { generateLegalDocument, generatePlaceholderDocument } from './legal-docs.js';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Initialize __filename and __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache for commit push status (stale-while-revalidate)
const commitPushCache = {
  hash: null,
  pushed: false,
  timestamp: 0,
  refreshing: false
};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Default application settings (canonical source of truth)
 * Used for fresh installs and settings reset operations
 */
const DEFAULT_APP_SETTINGS = {
  lifetime_spent: '0',
  drain_rate_cents_per_second: '0',
  auto_drain_enabled: 'false',
  // Security settings
  api_key: '',
  require_auth: 'false',
  ip_whitelist: '',
  // AI/Claude settings
  claude_api_key: '',
  claude_key_validated: 'false',
  claude_model: '',
  ai_spice_level: '1',
  ai_custom_prompt: ''
  // Note: drain_start_time and last_matter_date are set dynamically to current time
};

// Load environment variables from .env file in backend directory
dotenv.config({ path: join(__dirname, '.env') });

/**
 * Create and configure a Fastify server instance
 * @param {Object} options - Configuration options
 * @param {boolean} options.logger - Enable logging (default: true)
 * @param {string} options.dbPath - Database file path (default: data/tracker.db)
 * @param {boolean} options.requireAuth - Require authentication (default: from env)
 * @param {string[]} options.allowedIPs - Allowed IP addresses (default: from env)
 * @param {string} options.apiKey - API key for authentication (default: from env)
 * @param {boolean} options.disableRateLimit - Disable rate limiting (default: false, useful for tests)
 * @returns {Object} Fastify server instance
 */
export async function createServer(options = {}) {
  const {
    logger = true,
    dbPath,
    requireAuth = process.env.REQUIRE_AUTH === 'true',
    allowedIPs = process.env.ALLOWED_IPS?.split(',').map(ip => ip.trim()) || [],
    apiKey = process.env.API_KEY || null,
    corsOrigin = process.env.CORS_ORIGIN || true,
    disableRateLimit = false
  } = options;

  // Create database instance
  const { settingsDb, mattersDb, adminUsersDb, adminSessionsDb, adminBootstrapTokensDb, privateNotesDb, attachmentsDb, auditLogDb } = await createDatabase(dbPath);

  // Initialize audit logging service
  initAudit({ auditLogDb, settingsDb });

  const fastify = Fastify({
    logger,
    trustProxy: true // Important for getting real IP behind reverse proxy
  });

  // Configuration
  const ALLOWED_IPS = allowedIPs;
  const API_KEY = apiKey;
  const REQUIRE_AUTH = requireAuth;
  const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production-' + Math.random();
  const PASSWORD_SALT = process.env.PASSWORD_SALT || 'legal-tracker-default-CHANGE-THIS';
  const COOKIE_SECURE = process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';

  // JWT authentication
  await fastify.register(fastifyJWT, {
    secret: JWT_SECRET,
    cookie: {
      cookieName: 'admin_token',
      signed: false
    }
  });

  // Cookie support
  await fastify.register(fastifyCookie);

  // Rate limiting - protect against brute force attacks
  // Can be disabled for tests to avoid delays from rate limit workarounds
  if (!disableRateLimit) {
    await fastify.register(rateLimit, {
      global: false, // Don't apply globally, only to specific routes
      max: 100, // Max requests per time window
      timeWindow: '1 minute'
    });
  }

  // Multipart form support for file uploads
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1 // Only allow one file per request
    }
  });

  // CORS setup
  await fastify.register(cors, {
    origin: corsOrigin,
    credentials: true, // Important for cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  });

  // Security headers middleware
  fastify.addHook('onSend', async (_request, reply) => {
    // Content Security Policy
    reply.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src blob:; object-src blob:; frame-ancestors 'none';");

    // Other security headers
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  });

  // Serve frontend static files
  await fastify.register(fastifyStatic, {
    root: join(__dirname, '..', 'frontend'),
    prefix: '/',
    decorateReply: false,
    cacheControl: false, // Disable default cache control
    setHeaders: (res, path) => {
      // Disable caching for JavaScript files to prevent stale code
      if (path.endsWith('.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        // Allow caching for other static assets
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    }
  });

  // Input validation limits
  const INPUT_LIMITS = {
    username: 100,
    password: 1000, // Allow long passwords
    email: 255,
    note: 10000, // 10KB for notes
    confirmationString: 100
  };

  // Validate string length
  function validateStringLength(value, fieldName, maxLength) {
    if (value && value.length > maxLength) {
      throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
    }
  }

  // Helper to get client IP
  function getClientIP(request) {
    // Check various headers for real IP (when behind proxy)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    const realIP = request.headers['x-real-ip'];
    if (realIP) {
      return realIP;
    }
    return request.ip;
  }

  // Auth middleware for write operations
  function authMiddleware(request, reply, done) {
    if (!REQUIRE_AUTH) {
      return done();
    }

    const clientIP = getClientIP(request);
    const providedKey = request.headers['x-api-key'];

    // Check API key first
    if (API_KEY && providedKey === API_KEY) {
      return done();
    }

    // Check IP whitelist
    if (ALLOWED_IPS.length > 0 && ALLOWED_IPS.includes(clientIP)) {
      return done();
    }

    // If no auth methods configured but REQUIRE_AUTH is true, deny
    if (REQUIRE_AUTH) {
      reply.code(403).send({
        error: 'ACCESS_DENIED',
        message: 'Unauthorized IP address',
        your_ip: clientIP
      });
      return;
    }

    done();
  }

  // ============ PUBLIC ROUTES (Read-only) ============

  // Health check
  fastify.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Get client configuration (including password salt for hashing)
  fastify.get('/api/config', async () => {
    return {
      passwordSalt: PASSWORD_SALT,
      requireAuth: REQUIRE_AUTH
    };
  });

  // Get version and build info
  fastify.get('/api/version', async () => {
    // Read version from VERSION file
    let version = 'unknown';
    try {
      const versionPath = join(__dirname, '..', 'VERSION');
      if (existsSync(versionPath)) {
        version = readFileSync(versionPath, 'utf8').trim();
      }
    } catch (error) {
      // Fall back to package.json version
      try {
        const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
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
    const matters = mattersDb.getAll();

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
      your_ip: getClientIP(request),
      auth_required: REQUIRE_AUTH
    };
  });

  // Get all matters
  fastify.get('/api/matters', async () => {
    const matters = mattersDb.getAll();
    // Convert cost from cents to dollars for output
    return matters.map(inc => ({
      ...inc,
      cost: inc.cost / 100 // Convert cents to dollars
    }));
  });

  // ============ PROTECTED ROUTES (Write operations) ============

  // Log new matter (reset counter)
  fastify.post('/api/matters', { preHandler: authMiddleware }, async (request, reply) => {
    const { matter_date, note, cost } = request.body || {};

    // Calculate days since last matter
    const settings = settingsDb.getAll();
    const lastMatterDate = new Date(settings.last_matter_date || Date.now());
    const matterDateObj = new Date(matter_date || Date.now());
    const daysSince = Math.floor((matterDateObj - lastMatterDate) / (1000 * 60 * 60 * 24));

    // Cost comes in as dollars - convert to cents for storage
    const costDollars = parseFloat(cost) || 0;
    const costCents = Math.round(costDollars * 100);

    // Add matter to log
    const result = mattersDb.add(
      matterDateObj.toISOString(),
      note || 'No details provided',
      Math.max(0, daysSince),
      costCents
    );

    // Update last matter date
    settingsDb.set('last_matter_date', matterDateObj.toISOString());

    // Add cost to lifetime spent if provided (stored in cents)
    if (costCents) {
      const currentSpentCents = parseFloat(settings.lifetime_spent || '0');
      settingsDb.set('lifetime_spent', currentSpentCents + costCents);
    }

    reply.code(201);
    return {
      success: true,
      id: result.id,
      message: 'Matter logged. The counter has been reset. We believe in you.'
    };
  });

  // Update a matter
  fastify.put('/api/matters/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params;
    const { matter_date, note, cost } = request.body || {};

    const existing = mattersDb.getById(id);
    if (!existing) {
      reply.code(404);
      return { error: 'NOT_FOUND', message: 'Matter not found' };
    }

    // Cost comes in as dollars - convert to cents for storage
    let costCents = existing.cost;
    if (cost !== undefined) {
      const costDollars = parseFloat(cost);
      costCents = Math.round(costDollars * 100);
    }

    mattersDb.update(
      id,
      matter_date || existing.matter_date,
      note || existing.note,
      costCents
    );

    return { success: true, message: 'Matter updated' };
  });

  // Delete a matter
  fastify.delete('/api/matters/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params;

    const existing = mattersDb.getById(id);
    if (!existing) {
      reply.code(404);
      return { error: 'NOT_FOUND', message: 'Matter not found' };
    }

    mattersDb.delete(id);

    // Recalculate last matter date from remaining matters
    const matters = mattersDb.getAll();
    if (matters.length > 0) {
      settingsDb.set('last_matter_date', matters[0].matter_date);
    }

    return { success: true, message: 'Matter deleted' };
  });

  // Update lifetime spent
  fastify.post('/api/settings/lifetime-spent', { preHandler: authMiddleware }, async (request) => {
    const { amount, add } = request.body || {};

    if (add) {
      const current = parseFloat(settingsDb.get('lifetime_spent') || '0');
      settingsDb.set('lifetime_spent', current + parseFloat(amount));
    } else {
      settingsDb.set('lifetime_spent', parseFloat(amount) || 0);
    }

    // Reset drain start time when manually updating the amount
    settingsDb.set('drain_start_time', new Date().toISOString());

    return {
      success: true,
      lifetime_spent: parseFloat(settingsDb.get('lifetime_spent'))
    };
  });

  // Set last matter date manually
  fastify.post('/api/settings/last-matter-date', { preHandler: authMiddleware }, async (request) => {
    const { date } = request.body || {};

    if (!date) {
      return { error: 'BAD_REQUEST', message: 'Date is required' };
    }

    settingsDb.set('last_matter_date', new Date(date).toISOString());

    return { success: true, last_matter_date: settingsDb.get('last_matter_date') };
  });

  // Update drain configuration
  // Rate is in cents per second (explicit unit)
  // Max rate: 1000 cents/sec = $10/sec = $600/min = $36,000/hr = $864,000/day
  fastify.post('/api/settings/drain', { preHandler: authMiddleware }, async (request, reply) => {
    const { enabled, rate_cents } = request.body || {};

    if (enabled !== undefined) {
      settingsDb.set('auto_drain_enabled', enabled ? 'true' : 'false');
    }

    if (rate_cents !== undefined) {
      const cents = parseFloat(rate_cents);
      if (isNaN(cents) || cents < 0 || cents > 1000) {
        return reply.code(400).send({
          error: 'BAD_REQUEST',
          message: 'Invalid drain rate. Must be between 0 and 1000 cents per second.'
        });
      }
      settingsDb.set('drain_rate_cents_per_second', String(cents));
    }

    // Reset drain start time when changing drain settings
    settingsDb.set('drain_start_time', new Date().toISOString());

    return {
      success: true,
      drain_enabled: settingsDb.get('auto_drain_enabled') === 'true',
      drain_rate_cents_per_second: parseFloat(settingsDb.get('drain_rate_cents_per_second'))
    };
  });

  // ============ ADMIN PORTAL ROUTES ============

  // Secure file serving helper - prevents path traversal attacks
  function serveStaticFile(baseDir, file) {
    // Sanitize filename - reject any path with .. or absolute paths
    if (file.includes('..') || file.startsWith('/') || file.includes('\0')) {
      throw new Error('Invalid file path');
    }

    // Only allow alphanumeric, dash, underscore, and dot
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(file)) {
      throw new Error('Invalid file name');
    }

    const filePath = join(__dirname, '..', 'admin', baseDir, file);

    // Verify the resolved path is within the expected directory
    const resolvedPath = resolve(filePath);
    const expectedBase = resolve(join(__dirname, '..', 'admin', baseDir));

    if (!resolvedPath.startsWith(expectedBase)) {
      throw new Error('Path traversal attempt detected');
    }

    return readFileSync(resolvedPath, 'utf-8');
  }

  // Serve admin portal files
  fastify.get('/admin', async (request, reply) => {
    const html = readFileSync(join(__dirname, '..', 'admin', 'index.html'), 'utf-8');
    return reply.type('text/html').send(html);
  });

  fastify.get('/admin/bootstrap.html', async (_request, reply) => {
    const html = readFileSync(join(__dirname, '..', 'admin', 'bootstrap.html'), 'utf-8');
    return reply.type('text/html').send(html);
  });

  fastify.get('/admin/css/:file', async (request, reply) => {
    try {
      const css = serveStaticFile('css', request.params.file);
      return reply.type('text/css').send(css);
    } catch (error) {
      fastify.log.warn({ file: request.params.file, error: error.message }, 'Static file access denied');
      return reply.code(404).send({ error: 'File not found' });
    }
  });

  fastify.get('/admin/js/:file', async (request, reply) => {
    try {
      const js = serveStaticFile('js', request.params.file);
      // Disable caching for JavaScript files to prevent stale code
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
      return reply.type('application/javascript').send(js);
    } catch (error) {
      fastify.log.warn({ file: request.params.file, error: error.message }, 'Static file access denied');
      return reply.code(404).send({ error: 'File not found' });
    }
  });

  fastify.get('/admin/js/components/:file', async (request, reply) => {
    try {
      const js = serveStaticFile('js/components', request.params.file);
      // Disable caching for JavaScript files to prevent stale code
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
      return reply.type('application/javascript').send(js);
    } catch (error) {
      fastify.log.warn({ file: request.params.file, error: error.message }, 'Static file access denied');
      return reply.code(404).send({ error: 'File not found' });
    }
  });

  // Create admin auth middleware
  const adminAuthMiddleware = createAdminAuthMiddleware(adminSessionsDb, adminUsersDb);

  // ============ BOOTSTRAP ENDPOINTS (No auth required) ============

  // Check if bootstrap is needed
  fastify.get('/admin/api/bootstrap/status', async () => {
    const adminCount = adminUsersDb.getAll().filter(u => u.is_active).length;
    const hasActiveTokens = adminBootstrapTokensDb.hasActiveTokens();

    return {
      needs_bootstrap: adminCount === 0 && hasActiveTokens,
      has_active_admins: adminCount > 0
    };
  });

  // Request a bootstrap token (generates one if needed or returns existing)
  fastify.post('/admin/api/bootstrap/request-token', async (request, reply) => {
    // Check if there are already active admins (prevent bootstrap hijacking)
    const activeAdmins = adminUsersDb.getAll().filter(u => u.is_active);
    if (activeAdmins.length > 0) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'Bootstrap is not available. Active admin users already exist.'
      });
    }

    let token;
    let expiresAt;

    // Check if there's already an active token - return it instead of creating a new one
    const existingTokens = adminBootstrapTokensDb.getActiveTokens();
    if (existingTokens.length > 0) {
      // Cannot return the plain token since it's hashed, so generate a new one
      // and invalidate the old one
      adminBootstrapTokensDb.invalidateAll();
      token = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(token);
      expiresAt = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash, expiresAt, request.ip);
    } else {
      // Generate new bootstrap token
      token = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(token);
      expiresAt = getBootstrapTokenExpiration(60);
      adminBootstrapTokensDb.create(tokenHash, expiresAt, request.ip);
    }

    fastify.log.info({
      action: 'BOOTSTRAP_TOKEN_REQUESTED',
      ip_address: request.ip || 'unknown'
    }, 'Bootstrap token generated via request');

    return {
      success: true,
      token,
      expires_in_minutes: 60
    };
  });

  // Validate a bootstrap token without consuming it
  fastify.post('/admin/api/bootstrap/validate-token', async (request, reply) => {
    const { token } = request.body || {};

    if (!token) {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Token is required'
      });
    }

    // Hash the token and look it up
    const tokenHash = hashBootstrapToken(token);
    const bootstrapToken = adminBootstrapTokensDb.getByTokenHash(tokenHash);

    if (!bootstrapToken) {
      return reply.code(401).send({
        valid: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid bootstrap token'
      });
    }

    // Check if token is still active
    if (!bootstrapToken.is_active || bootstrapToken.used_at) {
      return reply.code(401).send({
        valid: false,
        error: 'TOKEN_USED',
        message: 'This bootstrap token has already been used'
      });
    }

    // Check if token is expired
    if (new Date(bootstrapToken.expires_at) < new Date()) {
      return reply.code(401).send({
        valid: false,
        error: 'TOKEN_EXPIRED',
        message: 'This bootstrap token has expired'
      });
    }

    // Token is valid
    return {
      valid: true,
      expires_at: bootstrapToken.expires_at
    };
  });

  // Bootstrap - set initial admin password with one-time token
  fastify.post('/admin/api/bootstrap/setup', {
    config: {
      rateLimit: {
        max: 10, // Maximum 10 attempts
        timeWindow: '5 minutes'
      }
    }
  }, async (request, reply) => {
    const { token, username, hashedPassword } = request.body || {};

    // Check each field individually for better error messages
    if (!token) {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Token is required'
      });
    }
    if (!username) {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Username is required'
      });
    }
    if (!hashedPassword) {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Password is required'
      });
    }

    // Validate input lengths
    try {
      validateStringLength(username, 'username', INPUT_LIMITS.username);
      validateStringLength(hashedPassword, 'hashedPassword', 256); // SHA-256 hash = 64 hex chars
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    // Check if there are already active admins (prevent bootstrap hijacking)
    const activeAdmins = adminUsersDb.getAll().filter(u => u.is_active);
    if (activeAdmins.length > 0) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'Bootstrap is not available. Active admin users already exist.'
      });
    }

    // Validate hashedPassword format (should be 64 hex characters - SHA-256 hash)
    if (!/^[a-f0-9]{64}$/i.test(hashedPassword)) {
      return reply.code(400).send({
        error: 'INVALID_PASSWORD',
        message: 'Invalid password hash format'
      });
    }

    // Validate username
    if (!username || username.trim().length < 3) {
      return reply.code(400).send({
        error: 'INVALID_USERNAME',
        message: 'Username must be at least 3 characters long'
      });
    }

    // Hash the token and look it up
    const tokenHash = hashBootstrapToken(token);
    const bootstrapToken = adminBootstrapTokensDb.getByTokenHash(tokenHash);

    if (!bootstrapToken) {
      return reply.code(401).send({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired bootstrap token'
      });
    }

    // Check if token is still active
    if (!bootstrapToken.is_active || bootstrapToken.used_at) {
      return reply.code(401).send({
        error: 'TOKEN_USED',
        message: 'This bootstrap token has already been used'
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(bootstrapToken.expires_at);
    if (now > expiresAt) {
      return reply.code(401).send({
        error: 'TOKEN_EXPIRED',
        message: 'This bootstrap token has expired'
      });
    }

    try {
      // Password is already client-hashed (SHA-256), just bcrypt it
      const passwordHash = await hashPassword(hashedPassword);

      // Create admin user
      const user = adminUsersDb.create(username.trim(), passwordHash, null);

      // Mark token as used
      const ip = request.ip || 'unknown';
      adminBootstrapTokensDb.markAsUsed(tokenHash, ip);

      fastify.log.info({
        action: 'BOOTSTRAP_COMPLETE',
        user_id: user.id,
        username: username.trim(),
        ip_address: ip
      }, 'Bootstrap setup completed successfully');

      return {
        success: true,
        message: 'Admin account created successfully',
        username: username.trim()
      };
    } catch (error) {
      fastify.log.error({
        action: 'BOOTSTRAP_FAILED',
        error: error.message
      }, 'Bootstrap setup failed');

      return reply.code(500).send({
        error: 'SERVER_ERROR',
        message: `Failed to create admin account: ${error.message}`
      });
    }
  });

  // ============ ADMIN AUTH ENDPOINTS ============

  // Admin login - strict rate limiting to prevent brute force attacks
  fastify.post('/admin/api/auth/login', {
    config: {
      rateLimit: {
        max: 5, // Maximum 5 login attempts
        timeWindow: '1 minute' // Per minute
      }
    }
  }, async (request, reply) => {
    const { username, hashedPassword } = request.body || {};

    if (!username || !hashedPassword) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Username and hashed password required' });
    }

    // Get user
    const user = adminUsersDb.getByUsername(username);
    const clientIP = getClientIP(request);

    if (!user) {
      // Log failed login - user not found
      logInfo({
        actionType: ACTION_TYPES.LOGIN_FAILED,
        entityType: ENTITY_TYPES.USER,
        summary: `Failed login attempt for unknown user "${username}"`,
        details: { reason: 'user_not_found' },
        ipAddress: clientIP
      });
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' });
    }

    // Check if user is active
    if (!user.is_active) {
      // Log failed login - user inactive
      logInfo({
        userId: user.id,
        username: user.username,
        actionType: ACTION_TYPES.LOGIN_FAILED,
        entityType: ENTITY_TYPES.USER,
        summary: `Failed login attempt for inactive user "${username}"`,
        details: { reason: 'user_inactive' },
        ipAddress: clientIP
      });
      return reply.code(401).send({ error: 'USER_INACTIVE', message: 'User account is not active' });
    }

    // Verify hashed password (server stores bcrypt(hashedPassword))
    const validPassword = await verifyPassword(hashedPassword, user.password_hash);
    if (!validPassword) {
      // Log failed login - wrong password
      logInfo({
        userId: user.id,
        username: user.username,
        actionType: ACTION_TYPES.LOGIN_FAILED,
        entityType: ENTITY_TYPES.USER,
        summary: `Failed login attempt for user "${username}"`,
        details: { reason: 'invalid_password' },
        ipAddress: clientIP
      });
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' });
    }

    // Create session
    const jti = generateTokenId();
    const expiration = getTokenExpiration(7); // 7 days
    const userAgent = request.headers['user-agent'] || null;

    adminSessionsDb.create(user.id, jti, expiration.toISOString(), clientIP, userAgent);
    adminUsersDb.updateLastLogin(user.id);

    // Generate JWT
    const token = fastify.jwt.sign(
      { userId: user.id, username: user.username, jti },
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie
    reply.setCookie('admin_token', token, {
      path: '/',
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    });

    // Log successful login
    logInfo({
      userId: user.id,
      username: user.username,
      actionType: ACTION_TYPES.LOGIN,
      entityType: ENTITY_TYPES.USER,
      summary: `User "${username}" logged in`,
      ipAddress: clientIP
    });

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    };
  });

  // Admin logout
  fastify.post('/admin/api/auth/logout', { preHandler: adminAuthMiddleware }, async (request) => {
    const jti = request.user.jti;

    // Invalidate session in database - this is what actually logs the user out
    // The cookie will still exist in browser but will be rejected by auth middleware
    adminSessionsDb.invalidate(jti);

    // Log logout
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.LOGOUT,
      entityType: ENTITY_TYPES.USER,
      summary: `User "${request.adminUser.username}" logged out`
    });

    return { success: true, message: 'Logged out successfully' };
  });

  // Get current admin user
  fastify.get('/admin/api/auth/me', { preHandler: adminAuthMiddleware }, async (request) => {
    return {
      user: request.adminUser
    };
  });

  // Change password
  // Both currentPassword and newPassword are SHA-256 hashes from client-side (username:password:salt)
  fastify.post('/admin/api/auth/change-password', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body || {};

    if (!currentPassword || !newPassword) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Current and new password required' });
    }

    // Validate hash format (SHA-256 = 64 hex characters)
    if (!/^[a-f0-9]{64}$/i.test(currentPassword) || !/^[a-f0-9]{64}$/i.test(newPassword)) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Invalid password format' });
    }

    const user = adminUsersDb.getById(request.adminUser.id);
    // Verify currentPassword hash against stored bcrypt(SHA-256) hash
    const validPassword = await verifyPassword(currentPassword, user.password_hash);

    if (!validPassword) {
      return reply.code(401).send({ error: 'INVALID_PASSWORD', message: 'Current password is incorrect' });
    }

    // Hash the new password (which is already SHA-256) with bcrypt
    const newHash = await hashPassword(newPassword);
    adminUsersDb.updatePassword(request.adminUser.id, newHash);

    // Invalidate all sessions for this user (force re-login with new password)
    // The cookie will still exist in browser but will be rejected by auth middleware
    adminSessionsDb.invalidateAllForUser(request.adminUser.id);

    return { success: true, message: 'Password changed successfully. Please log in again.' };
  });

  // Nuclear option: Force invalidate ALL sessions (for debugging/troubleshooting)
  fastify.post('/admin/api/auth/nuke-all-sessions', async () => {
    // Get count before nuking
    const sessionsBefore = adminSessionsDb.getAll();
    const count = sessionsBefore.length;

    // Delete ALL sessions from database
    adminSessionsDb.invalidateAll();

    // Verify they're gone
    const sessionsAfter = adminSessionsDb.getAll();

    return {
      success: true,
      message: 'All sessions nuked',
      sessions_deleted: count,
      sessions_remaining: sessionsAfter.length,
      details: {
        before: sessionsBefore.map(s => ({ id: s.id, user_id: s.user_id, jti: s.token_jti })),
        after: sessionsAfter.map(s => ({ id: s.id, user_id: s.user_id, jti: s.token_jti }))
      }
    };
  });

  // Dashboard stats
  fastify.get('/admin/api/dashboard', { preHandler: adminAuthMiddleware }, async () => {
    const settings = settingsDb.getAll();
    const stats = mattersDb.getStats();
    const matters = mattersDb.getAll();

    const lastMatterDate = new Date(settings.last_matter_date || Date.now());
    const now = new Date();
    const daysSince = Math.floor((now - lastMatterDate) / (1000 * 60 * 60 * 24));

    const drainEnabled = settings.auto_drain_enabled === 'true';
    const drainRateCents = parseFloat(settings.drain_rate_cents_per_second || '50');
    const baseSpent = parseFloat(settings.lifetime_spent || '0');

    return {
      days_since: daysSince,
      last_matter_date: settings.last_matter_date,
      lifetime_spent: baseSpent,
      drain_enabled: drainEnabled,
      drain_rate_cents_per_second: drainRateCents,
      stats: {
        total_matters: stats.total,
        matters_this_year: stats.thisYear,
        max_streak: Math.max(stats.maxStreak, daysSince)
      },
      recent_matters: matters.slice(0, 10)
    };
  });

  // Get all matters with pagination
  fastify.get('/admin/api/matters', { preHandler: adminAuthMiddleware }, async (request) => {
    const { page = 1, limit = 50, search = '', sortBy = 'matter_date', sortOrder = 'DESC' } = request.query;

    let matters = mattersDb.getAll();

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      matters = matters.filter(inc =>
        (inc.note && inc.note.toLowerCase().includes(searchLower)) ||
        inc.matter_date.includes(search)
      );
    }

    // Sort
    matters.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'cost') {
        comparison = (a.cost || 0) - (b.cost || 0);
      } else if (sortBy === 'days_since') {
        comparison = (a.days_since || 0) - (b.days_since || 0);
      } else {
        comparison = new Date(a.matter_date) - new Date(b.matter_date);
      }
      return sortOrder === 'ASC' ? comparison : -comparison;
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedMatters = matters.slice(startIndex, endIndex);

    // Convert costs from cents to dollars and include note counts
    const mattersWithDetails = paginatedMatters.map(inc => ({
      ...inc,
      cost: inc.cost / 100, // Convert cents to dollars
      private_notes_count: privateNotesDb.getCountByMatterId(inc.id)
    }));

    return {
      matters: mattersWithDetails,
      total: matters.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(matters.length / limit)
    };
  });

  // Add single matter
  fastify.post('/admin/api/matters', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { matter_date, note, cost, lawyer_name, lawyer_firm, opposing_counsel_name, opposing_counsel_firm, case_number } = request.body || {};

    if (!matter_date) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'matter_date required' });
    }

    // Validate input lengths
    try {
      validateStringLength(note, 'note', INPUT_LIMITS.note);
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    try {
      const matterDate = new Date(matter_date);
      const lastMatterDate = new Date(settingsDb.get('last_matter_date') || Date.now());
      const daysSince = Math.floor((matterDate - lastMatterDate) / (1000 * 60 * 60 * 24));

      // Cost comes in as dollars from admin form - convert to cents for storage
      const costDollars = parseFloat(cost) || 0;
      const costCents = Math.round(costDollars * 100);

      const result = mattersDb.add(
        matterDate.toISOString(),
        note || 'Matter',
        Math.max(0, daysSince),
        costCents,
        { lawyer_name, lawyer_firm, opposing_counsel_name, opposing_counsel_firm, case_number }
      );

      // Update last matter date
      settingsDb.set('last_matter_date', matterDate.toISOString());

      // Update lifetime spent (stored in cents)
      if (costCents) {
        const currentSpentCents = parseFloat(settingsDb.get('lifetime_spent') || '0');
        settingsDb.set('lifetime_spent', currentSpentCents + costCents);
      }

      // Log the creation
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.CREATE,
        entityType: ENTITY_TYPES.MATTER,
        entityId: result.id,
        summary: `Created matter #${result.id}`,
        details: { note: note || 'Matter', matter_date, cost: costDollars }
      });

      reply.code(201);
      return {
        success: true,
        matter: result
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.MATTER,
        summary: 'Failed to create matter'
      });
      return reply.code(500).send({ error: 'SERVER_ERROR', message: error.message });
    }
  });

  // Bulk add matters
  fastify.post('/admin/api/matters/bulk', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { matters: mattersArray } = request.body || {};

    if (!Array.isArray(mattersArray) || mattersArray.length === 0) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Matters array required' });
    }

    const results = [];
    const errors = [];
    let totalCost = 0;

    for (let i = 0; i < mattersArray.length; i++) {
      const { matter_date, note, cost } = mattersArray[i];

      try {
        if (!matter_date) {
          errors.push({ index: i, error: 'Missing matter_date' });
          continue;
        }

        const matterDate = new Date(matter_date);
        const lastMatterDate = new Date(settingsDb.get('last_matter_date') || Date.now());
        const daysSince = Math.floor((matterDate - lastMatterDate) / (1000 * 60 * 60 * 24));

        // Cost comes in as dollars from admin form - convert to cents for storage
        const costDollars = parseFloat(cost) || 0;
        const costCents = Math.round(costDollars * 100);

        const result = mattersDb.add(
          matterDate.toISOString(),
          note || 'Matter',
          Math.max(0, daysSince),
          costCents
        );

        // Track total cost for lifetime_spent update (in cents)
        totalCost += costCents;

        // Update last matter date to this one for next iteration
        settingsDb.set('last_matter_date', matterDate.toISOString());

        results.push({ index: i, id: result.id });
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    // Update lifetime spent with total from all matters (stored in cents)
    if (totalCost > 0) {
      const currentSpentCents = parseFloat(settingsDb.get('lifetime_spent') || '0');
      settingsDb.set('lifetime_spent', currentSpentCents + totalCost);
    }

    return {
      success: true,
      created: results.length,
      errors: errors.length,
      results,
      errors
    };
  });

  // Bulk delete matters
  fastify.delete('/admin/api/matters/bulk', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { ids } = request.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'IDs array required' });
    }

    let deleted = 0;
    for (const id of ids) {
      try {
        mattersDb.delete(id);
        deleted++;
      } catch (error) {
        // Continue deleting others
      }
    }

    // Log the bulk deletion
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.DELETE,
      entityType: ENTITY_TYPES.MATTER,
      summary: `Bulk deleted ${deleted} matters`,
      details: { ids, deleted }
    });

    return { success: true, deleted };
  });

  // Export matters as CSV or JSON
  fastify.get('/admin/api/matters/export', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { ids, includePrivateNotes, format = 'csv' } = request.query;

    // Get matters - either selected IDs or all
    let matters;
    if (ids) {
      const idList = ids.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      matters = idList.length > 0 ? mattersDb.getByIds(idList) : mattersDb.getAll();
    } else {
      matters = mattersDb.getAll();
    }

    // Use detailed timestamp: YYYY-MM-DD_HH-MM-SS to prevent duplicate filenames
    const now = new Date();
    const timestamp = now.toISOString().replace('T', '_').replace(/:/g, '-').split('.')[0];

    // JSON format
    if (format === 'json') {
      const exportData = matters.map(matter => {
        const exportMatter = {
          id: matter.id,
          matter_date: matter.matter_date,
          note: matter.note,
          days_since: matter.days_since || 0,
          cost: matter.cost || 0,
          created_at: matter.created_at
        };

        if (includePrivateNotes === 'true') {
          const notes = privateNotesDb.getByMatterId(matter.id);
          exportMatter.private_notes = notes.map(n => ({
            id: n.id,
            note_content: n.note_content,
            created_by: n.created_by_username || null,
            created_at: n.created_at,
            updated_at: n.updated_at
          }));
        }

        return exportMatter;
      });

      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="matters-${timestamp}.json"`);

      return JSON.stringify(exportData, null, 2);
    }

    // CSV format (default)
    const headers = ['id', 'matter_date', 'note', 'days_since', 'cost', 'created_at'];
    if (includePrivateNotes === 'true') {
      headers.push('private_notes');
    }

    let csv = headers.join(',') + '\n';

    for (const matter of matters) {
      const row = [
        matter.id,
        `"${matter.matter_date}"`,
        `"${(matter.note || '').replace(/"/g, '""')}"`,
        matter.days_since || 0,
        matter.cost || 0,
        `"${matter.created_at}"`
      ];

      if (includePrivateNotes === 'true') {
        const notes = privateNotesDb.getByMatterId(matter.id);
        // Concatenate all notes with separator (newlines replaced with | for CSV compatibility)
        const notesText = notes.map(n => {
          const author = n.created_by_username ? `[${n.created_by_username}]` : '';
          const date = n.created_at ? `(${n.created_at.split('T')[0]})` : '';
          return `${author}${date}: ${n.note_content}`.replace(/[\r\n]+/g, ' ');
        }).join(' | ');
        row.push(`"${notesText.replace(/"/g, '""')}"`);
      }

      csv += row.join(',') + '\n';
    }

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="matters-${timestamp}.csv"`);

    return csv;
  });

  // Get single matter with private notes and attachments (admin only)
  fastify.get('/admin/api/matters/:id', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { id } = request.params;

    const matter = mattersDb.getById(parseInt(id));
    if (!matter) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Matter not found' });
    }

    // Get private notes for this matter
    const privateNotes = privateNotesDb.getByMatterId(parseInt(id));

    // Get attachments for this matter
    const attachments = attachmentsDb.getByMatterId(parseInt(id));

    return {
      ...matter,
      cost: matter.cost / 100, // Convert cents to dollars
      private_notes: privateNotes,
      attachments
    };
  });

  // Get matter timeline (aggregated notes and attachments sorted by date)
  fastify.get('/admin/api/matters/:id/timeline', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { id } = request.params;
    const { order = 'desc' } = request.query;

    const matter = mattersDb.getById(parseInt(id));
    if (!matter) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Matter not found' });
    }

    // Get private notes
    const privateNotes = privateNotesDb.getByMatterId(parseInt(id));

    // Get attachments
    const attachments = attachmentsDb.getByMatterId(parseInt(id));

    // Build timeline entries
    const timeline = [
      ...privateNotes.map(note => ({
        type: 'note',
        id: note.id,
        date: note.interaction_date || note.created_at,
        interaction_type: note.interaction_type || 'note',
        content: note.note_content,
        created_by: note.created_by_username,
        created_at: note.created_at,
        updated_at: note.updated_at
      })),
      ...attachments.map(attachment => ({
        type: 'attachment',
        id: attachment.id,
        date: attachment.document_date || attachment.created_at,
        direction: attachment.direction || 'internal',
        filename: attachment.original_filename,
        content_type: attachment.content_type,
        size_bytes: attachment.size_bytes,
        created_by: attachment.created_by_username,
        created_at: attachment.created_at
      }))
    ];

    // Sort by date
    timeline.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return { timeline };
  });

  // Update single matter (admin)
  fastify.put('/admin/api/matters/:id', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { id } = request.params;
    const { matter_date, note, cost, lawyer_name, lawyer_firm, opposing_counsel_name, opposing_counsel_firm, case_number } = request.body || {};

    const existing = mattersDb.getById(parseInt(id));
    if (!existing) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Matter not found' });
    }

    // Validate input lengths
    try {
      validateStringLength(note, 'note', INPUT_LIMITS.note);
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    try {
      const matterDate = matter_date ? new Date(matter_date).toISOString() : existing.matter_date;
      const matterNote = note !== undefined ? note : existing.note;
      // Cost comes in as dollars from admin form - convert to cents for storage
      const costCents = cost !== undefined ? Math.round(parseFloat(cost) * 100) : existing.cost;

      mattersDb.update(parseInt(id), matterDate, matterNote, costCents, {
        lawyer_name,
        lawyer_firm,
        opposing_counsel_name,
        opposing_counsel_firm,
        case_number
      });

      // Log the update
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.UPDATE,
        entityType: ENTITY_TYPES.MATTER,
        entityId: parseInt(id),
        summary: `Updated matter #${id}`,
        details: { before: { note: existing.note, cost: existing.cost / 100 }, after: { note: matterNote, cost: costCents / 100 } }
      });

      return { success: true };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.MATTER,
        entityId: parseInt(id),
        summary: `Failed to update matter #${id}`
      });
      return reply.code(500).send({ error: 'SERVER_ERROR', message: error.message });
    }
  });

  // Delete single matter (admin)
  fastify.delete('/admin/api/matters/:id', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { id } = request.params;

    const existing = mattersDb.getById(parseInt(id));
    if (!existing) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Matter not found' });
    }

    try {
      // Delete attachments from storage before deleting matter
      const attachments = attachmentsDb.getByMatterId(parseInt(id));
      if (attachments.length > 0) {
        const storage = createStorage(settingsDb);
        for (const attachment of attachments) {
          try {
            await storage.deleteObject(attachment.storage_key);
          } catch (err) {
            fastify.log.warn({ attachmentId: attachment.id, error: err.message }, 'Failed to delete attachment from storage');
          }
        }
        // DB records are deleted via ON DELETE CASCADE
      }

      // Private notes and attachments are deleted automatically via ON DELETE CASCADE
      mattersDb.delete(parseInt(id));

      // Log the deletion
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.DELETE,
        entityType: ENTITY_TYPES.MATTER,
        entityId: parseInt(id),
        summary: `Deleted matter #${id}`,
        details: { note: existing.note }
      });

      return { success: true };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.MATTER,
        entityId: parseInt(id),
        summary: `Failed to delete matter #${id}`
      });
      return reply.code(500).send({ error: 'SERVER_ERROR', message: error.message });
    }
  });

  // =====================
  // Private Notes API
  // =====================

  // Get all private notes for a matter
  fastify.get('/admin/api/matters/:matterId/notes', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { matterId } = request.params;

    const matter = mattersDb.getById(parseInt(matterId));
    if (!matter) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Matter not found' });
    }

    const notes = privateNotesDb.getByMatterId(parseInt(matterId));
    return { notes };
  });

  // Add a private note to a matter
  fastify.post('/admin/api/matters/:matterId/notes', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { matterId } = request.params;
    const { note_content, interaction_date, interaction_type } = request.body || {};

    if (!note_content || note_content.trim() === '') {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'note_content is required' });
    }

    // Validate input length
    try {
      validateStringLength(note_content, 'note_content', INPUT_LIMITS.note);
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    const matter = mattersDb.getById(parseInt(matterId));
    if (!matter) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Matter not found' });
    }

    try {
      const userId = request.adminUser?.id || null;
      const result = privateNotesDb.create(parseInt(matterId), note_content.trim(), userId, {
        interaction_date: interaction_date || null,
        interaction_type: interaction_type || 'note'
      });

      // Log the creation
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.CREATE,
        entityType: ENTITY_TYPES.PRIVATE_NOTE,
        entityId: result.id,
        summary: `Created note #${result.id} on matter #${matterId}`,
        details: { matterId: parseInt(matterId), interaction_type: interaction_type || 'note' }
      });

      reply.code(201);
      return {
        success: true,
        note: privateNotesDb.getById(result.id)
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.PRIVATE_NOTE,
        summary: `Failed to create note on matter #${matterId}`
      });
      return reply.code(500).send({ error: 'SERVER_ERROR', message: error.message });
    }
  });

  // Update a private note
  fastify.put('/admin/api/notes/:noteId', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { noteId } = request.params;
    const { note_content, interaction_date, interaction_type } = request.body || {};

    if (!note_content || note_content.trim() === '') {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'note_content is required' });
    }

    // Validate input length
    try {
      validateStringLength(note_content, 'note_content', INPUT_LIMITS.note);
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    const existing = privateNotesDb.getById(parseInt(noteId));
    if (!existing) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Note not found' });
    }

    try {
      privateNotesDb.update(parseInt(noteId), note_content.trim(), {
        interaction_date,
        interaction_type
      });

      // Log the update
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.UPDATE,
        entityType: ENTITY_TYPES.PRIVATE_NOTE,
        entityId: parseInt(noteId),
        summary: `Updated note #${noteId}`,
        details: { matterId: existing.matter_id }
      });

      return {
        success: true,
        note: privateNotesDb.getById(parseInt(noteId))
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.PRIVATE_NOTE,
        entityId: parseInt(noteId),
        summary: `Failed to update note #${noteId}`
      });
      return reply.code(500).send({ error: 'SERVER_ERROR', message: error.message });
    }
  });

  // Delete a private note
  fastify.delete('/admin/api/notes/:noteId', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { noteId } = request.params;

    const existing = privateNotesDb.getById(parseInt(noteId));
    if (!existing) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Note not found' });
    }

    try {
      privateNotesDb.delete(parseInt(noteId));

      // Log the deletion
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.DELETE,
        entityType: ENTITY_TYPES.PRIVATE_NOTE,
        entityId: parseInt(noteId),
        summary: `Deleted note #${noteId}`,
        details: { matterId: existing.matter_id }
      });

      return { success: true };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.PRIVATE_NOTE,
        entityId: parseInt(noteId),
        summary: `Failed to delete note #${noteId}`
      });
      return reply.code(500).send({ error: 'SERVER_ERROR', message: error.message });
    }
  });

  // ============ MATTER ATTACHMENTS ============

  // Get attachments for a matter
  fastify.get('/admin/api/matters/:matterId/attachments', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { matterId } = request.params;

    // Verify matter exists
    const matter = mattersDb.getById(parseInt(matterId));
    if (!matter) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Matter not found' });
    }

    const attachments = attachmentsDb.getByMatterId(parseInt(matterId));
    return { attachments };
  });

  // Upload attachment for a matter
  fastify.post('/admin/api/matters/:matterId/attachments', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { matterId } = request.params;

    // Verify matter exists
    const matter = mattersDb.getById(parseInt(matterId));
    if (!matter) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Matter not found' });
    }

    let file;
    let documentDate = null;
    let direction = 'internal';

    try {
      // Parse multipart form data
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file') {
          file = part;
        } else if (part.type === 'field') {
          if (part.fieldname === 'document_date' && part.value) {
            documentDate = part.value;
          } else if (part.fieldname === 'direction' && part.value) {
            direction = part.value;
          }
        }
      }
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'No file uploaded' });
    }

    if (!file) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'No file uploaded' });
    }

    // Validate file type
    const validation = validateFileType(file.filename, file.mimetype);
    if (!validation.valid) {
      return reply.code(400).send({ error: 'INVALID_FILE_TYPE', message: validation.error });
    }

    try {
      // Get storage instance
      const storage = createStorage(settingsDb);

      // Upload to storage
      const result = await storage.putObject(
        file.file,
        sanitizeFilename(file.filename),
        { contentType: file.mimetype }
      );

      // Create database record
      const attachment = attachmentsDb.create(
        parseInt(matterId),
        sanitizeFilename(file.filename),
        file.mimetype,
        result.size_bytes,
        storage.type,
        result.storage_key,
        request.adminUser?.id || null,
        { document_date: documentDate, direction }
      );

      // Log the upload
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.CREATE,
        entityType: ENTITY_TYPES.ATTACHMENT,
        entityId: attachment.id,
        summary: `Uploaded attachment "${sanitizeFilename(file.filename)}" to matter #${matterId}`,
        details: { matterId: parseInt(matterId), filename: sanitizeFilename(file.filename), size_bytes: result.size_bytes }
      });

      return {
        success: true,
        attachment: {
          id: attachment.id,
          original_filename: sanitizeFilename(file.filename),
          content_type: file.mimetype,
          size_bytes: result.size_bytes,
          document_date: documentDate,
          direction
        }
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.ATTACHMENT,
        summary: `Failed to upload attachment to matter #${matterId}`
      });
      fastify.log.error({ error: error.message }, 'File upload failed');
      return reply.code(500).send({ error: 'UPLOAD_FAILED', message: error.message });
    }
  });

  // Download attachment
  fastify.get('/admin/api/attachments/:attachmentId/download', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { attachmentId } = request.params;

    const attachment = attachmentsDb.getById(parseInt(attachmentId));
    if (!attachment) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Attachment not found' });
    }

    try {
      // Get storage instance
      const storage = createStorage(settingsDb);

      // Get file stream
      const { stream, size } = await storage.getObjectStream(attachment.storage_key);

      // Set response headers for file download
      reply.header('Content-Type', attachment.content_type);
      reply.header('Content-Length', attachment.size_bytes);
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.original_filename)}"`);

      return reply.send(stream);
    } catch (error) {
      fastify.log.error({ error: error.message, attachmentId }, 'File download failed');
      return reply.code(500).send({ error: 'DOWNLOAD_FAILED', message: error.message });
    }
  });

  // Delete attachment
  fastify.delete('/admin/api/attachments/:attachmentId', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { attachmentId } = request.params;

    const attachment = attachmentsDb.getById(parseInt(attachmentId));
    if (!attachment) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Attachment not found' });
    }

    try {
      // Get storage instance
      const storage = createStorage(settingsDb);

      // Delete from storage
      await storage.deleteObject(attachment.storage_key);

      // Delete database record
      attachmentsDb.delete(parseInt(attachmentId));

      // Log the deletion
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.DELETE,
        entityType: ENTITY_TYPES.ATTACHMENT,
        entityId: parseInt(attachmentId),
        summary: `Deleted attachment "${attachment.original_filename}"`,
        details: { matterId: attachment.matter_id, filename: attachment.original_filename }
      });

      return { success: true };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.ATTACHMENT,
        entityId: parseInt(attachmentId),
        summary: `Failed to delete attachment #${attachmentId}`
      });
      fastify.log.error({ error: error.message, attachmentId }, 'Attachment deletion failed');
      return reply.code(500).send({ error: 'DELETE_FAILED', message: error.message });
    }
  });

  // Update attachment metadata
  fastify.put('/admin/api/attachments/:attachmentId', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { attachmentId } = request.params;
    const { document_date, direction } = request.body || {};

    const attachment = attachmentsDb.getById(parseInt(attachmentId));
    if (!attachment) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Attachment not found' });
    }

    try {
      attachmentsDb.update(parseInt(attachmentId), { document_date, direction });

      // Log the update
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.UPDATE,
        entityType: ENTITY_TYPES.ATTACHMENT,
        entityId: parseInt(attachmentId),
        summary: `Updated attachment "${attachment.original_filename}"`,
        details: { matterId: attachment.matter_id, document_date, direction }
      });

      return {
        success: true,
        attachment: attachmentsDb.getById(parseInt(attachmentId))
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.ATTACHMENT,
        entityId: parseInt(attachmentId),
        summary: `Failed to update attachment #${attachmentId}`
      });
      return reply.code(500).send({ error: 'SERVER_ERROR', message: error.message });
    }
  });

  // ============ STORAGE SETTINGS ============

  // Get storage configuration (without sensitive values)
  fastify.get('/admin/api/settings/storage', { preHandler: adminAuthMiddleware }, async () => {
    const storageBackend = settingsDb.get('storage_backend') || 'filesystem';
    const hasS3Config = !!(
      settingsDb.get('s3_access_key_id') &&
      settingsDb.get('s3_secret_access_key') &&
      settingsDb.get('s3_bucket')
    );

    return {
      storage_backend: storageBackend,
      has_s3_config: hasS3Config,
      s3_bucket: settingsDb.get('s3_bucket') || '',
      s3_region: settingsDb.get('s3_region') || 'us-east-1',
      s3_endpoint: settingsDb.get('s3_endpoint') || '',
      s3_path_style: settingsDb.get('s3_path_style') === 'true',
      filesystem_path: settingsDb.get('storage_filesystem_path') || ''
    };
  });

  // Save storage configuration
  fastify.put('/admin/api/settings/storage', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const {
      storage_backend,
      s3_access_key_id,
      s3_secret_access_key,
      s3_bucket,
      s3_region,
      s3_endpoint,
      s3_path_style,
      filesystem_path
    } = request.body || {};

    // Validate storage backend
    if (storage_backend && !['filesystem', 's3'].includes(storage_backend)) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Invalid storage backend' });
    }

    // Save settings
    if (storage_backend !== undefined) {
      settingsDb.set('storage_backend', storage_backend);
    }
    if (s3_access_key_id !== undefined) {
      settingsDb.set('s3_access_key_id', s3_access_key_id);
    }
    if (s3_secret_access_key !== undefined) {
      settingsDb.set('s3_secret_access_key', s3_secret_access_key);
    }
    if (s3_bucket !== undefined) {
      settingsDb.set('s3_bucket', s3_bucket);
    }
    if (s3_region !== undefined) {
      settingsDb.set('s3_region', s3_region);
    }
    if (s3_endpoint !== undefined) {
      settingsDb.set('s3_endpoint', s3_endpoint);
    }
    if (s3_path_style !== undefined) {
      settingsDb.set('s3_path_style', s3_path_style ? 'true' : 'false');
    }
    if (filesystem_path !== undefined) {
      settingsDb.set('storage_filesystem_path', filesystem_path);
    }

    // Log settings change
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.SETTINGS_CHANGE,
      entityType: ENTITY_TYPES.SETTINGS,
      summary: 'Updated storage settings',
      details: { storage_backend }
    });

    return { success: true };
  });

  // Test storage connection
  fastify.post('/admin/api/settings/storage/test', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { type, config } = request.body || {};

    try {
      let storage;

      if (type === 's3') {
        // Test with provided config
        storage = createStorageFromConfig({
          type: 's3',
          accessKeyId: config.access_key_id,
          secretAccessKey: config.secret_access_key,
          bucket: config.bucket,
          region: config.region || 'us-east-1',
          endpoint: config.endpoint || null,
          forcePathStyle: config.path_style || false
        });
      } else {
        // Test filesystem storage
        storage = createStorageFromConfig({
          type: 'filesystem',
          path: config?.path || null
        });
      }

      const result = await storage.testConnection();
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  // Get all settings
  fastify.get('/admin/api/settings', { preHandler: adminAuthMiddleware }, async () => {
    const settings = settingsDb.getAll();
    // Add flag for Claude API key presence without exposing the key
    const hasClaudeApiKey = !!settings.claude_api_key && settings.claude_api_key.length > 0;
    const isClaudeKeyValidated = settings.claude_key_validated === 'true';
    // Remove sensitive and legacy keys from response
    const {
      claude_api_key,
      // Legacy drain settings (replaced by auto_drain_enabled and drain_rate_cents_per_second)
      drain_rate_cents,
      drain_enabled,
      ...safeSettings
    } = settings;
    return {
      settings: safeSettings,
      hasClaudeApiKey,
      isClaudeKeyValidated,
      // AI settings for Data Management page
      aiSettings: {
        selectedModel: settings.claude_model || '',
        spiceLevel: settings.ai_spice_level || '1',
        customPrompt: settings.ai_custom_prompt || ''
      }
    };
  });

  // Update setting
  fastify.put('/admin/api/settings/:key', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { key } = request.params;
    const { value } = request.body || {};

    if (value === undefined) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Value required' });
    }

    settingsDb.set(key, value);

    // Log settings change
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.SETTINGS_CHANGE,
      entityType: ENTITY_TYPES.SETTINGS,
      summary: `Updated setting "${key}"`,
      details: { key }
    });

    return { success: true, key, value };
  });

  // Generate new API key
  fastify.post('/admin/api/settings/api-key/generate', { preHandler: adminAuthMiddleware }, async (request) => {
    const newApiKey = generateApiKey();
    settingsDb.set('api_key', newApiKey);

    // Log API key generation
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.SETTINGS_CHANGE,
      entityType: ENTITY_TYPES.SETTINGS,
      summary: 'Generated new API key'
    });

    return { success: true, api_key: newApiKey };
  });

  // Validate and save Claude API key (validation required before save)
  fastify.post('/admin/api/settings/claude-api-key/validate-and-save', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { apiKey } = request.body || {};

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'API key required' });
    }

    try {
      // Create Anthropic client with the provided key
      const client = new Anthropic({ apiKey: apiKey.trim() });

      // Validate by listing models (lightweight operation)
      const modelsResponse = await client.models.list();
      const models = modelsResponse.data || [];

      if (models.length === 0) {
        return { valid: false, message: 'API key validated but no models available' };
      }

      // Save the key and mark as validated
      settingsDb.set('claude_api_key', apiKey.trim());
      settingsDb.set('claude_key_validated', 'true');

      // Filter to text models only (exclude embedding models etc)
      const textModels = models
        .filter(m => m.type === 'model' && m.id.includes('claude'))
        .map(m => ({ id: m.id, name: m.display_name || m.id }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Log Claude API key configuration
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.SETTINGS_CHANGE,
        entityType: ENTITY_TYPES.SETTINGS,
        summary: 'Configured Claude API key'
      });

      return {
        valid: true,
        message: 'API key validated and saved',
        models: textModels
      };
    } catch (error) {
      // Clear validation status on error
      settingsDb.set('claude_key_validated', 'false');
      const message = error.status === 401
        ? 'Invalid API key'
        : error.message || 'Validation failed';
      return { valid: false, message };
    }
  });

  // Clear Claude API key
  fastify.delete('/admin/api/settings/claude-api-key', { preHandler: adminAuthMiddleware }, async (request) => {
    settingsDb.set('claude_api_key', '');
    settingsDb.set('claude_key_validated', 'false');
    settingsDb.set('claude_model', '');

    // Log Claude API key removal
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.SETTINGS_CHANGE,
      entityType: ENTITY_TYPES.SETTINGS,
      summary: 'Removed Claude API key'
    });

    return { success: true };
  });

  // List available Claude models (requires validated key)
  fastify.get('/admin/api/claude/models', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const claudeApiKey = settingsDb.get('claude_api_key');

    if (!claudeApiKey) {
      return reply.code(400).send({ error: 'NO_API_KEY', message: 'No Claude API key configured' });
    }

    try {
      const client = new Anthropic({ apiKey: claudeApiKey });
      const modelsResponse = await client.models.list();
      const models = (modelsResponse.data || [])
        .filter(m => m.type === 'model' && m.id.includes('claude'))
        .map(m => ({ id: m.id, name: m.display_name || m.id }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return { models };
    } catch (error) {
      return reply.code(500).send({
        error: 'API_ERROR',
        message: error.message || 'Failed to fetch models'
      });
    }
  });

  // Save AI settings (model, spice level, custom prompt)
  fastify.put('/admin/api/settings/ai', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { model, spiceLevel, customPrompt } = request.body || {};

    if (model !== undefined) {
      settingsDb.set('claude_model', model);
    }
    if (spiceLevel !== undefined) {
      settingsDb.set('ai_spice_level', String(spiceLevel));
    }
    if (customPrompt !== undefined) {
      settingsDb.set('ai_custom_prompt', customPrompt);
    }

    // Log AI settings change
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.SETTINGS_CHANGE,
      entityType: ENTITY_TYPES.SETTINGS,
      summary: 'Updated AI settings',
      details: { model, spiceLevel }
    });

    return { success: true };
  });

  // Preview AI descriptions (generate without saving)
  fastify.post('/admin/api/claude/preview-descriptions', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { count = 5, spiceLevel, customPrompt } = request.body || {};
    const claudeApiKey = settingsDb.get('claude_api_key');
    const model = settingsDb.get('claude_model');

    console.log('[preview-descriptions] Received spiceLevel:', spiceLevel, 'type:', typeof spiceLevel);

    if (!claudeApiKey) {
      return reply.code(400).send({ error: 'NO_API_KEY', message: 'No Claude API key configured' });
    }
    if (!model) {
      return reply.code(400).send({ error: 'NO_MODEL', message: 'No model selected' });
    }

    try {
      const client = new Anthropic({ apiKey: claudeApiKey });
      const prompt = buildDescriptionPrompt(count, spiceLevel, customPrompt);
      console.log('[preview-descriptions] Built prompt with spiceLevel:', spiceLevel);
      console.log('[preview-descriptions] Prompt preview:', prompt.substring(0, 200));

      const response = await client.messages.create({
        model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content?.[0]?.text;
      if (!content) {
        return reply.code(500).send({ error: 'EMPTY_RESPONSE', message: 'No response from Claude' });
      }

      // Parse JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return reply.code(500).send({ error: 'PARSE_ERROR', message: 'Could not parse response' });
      }

      const descriptions = JSON.parse(jsonMatch[0]);
      return { descriptions: Array.isArray(descriptions) ? descriptions : [] };
    } catch (error) {
      return reply.code(500).send({
        error: 'API_ERROR',
        message: error.message || 'Failed to generate preview'
      });
    }
  });

  // Helper function to build the description prompt based on spice level
  function buildDescriptionPrompt(count, spiceLevel = '1', customPrompt = '') {
    // If custom prompt provided, use it directly
    if (customPrompt && customPrompt.trim()) {
      return customPrompt.replace('{count}', count);
    }

    const level = parseInt(spiceLevel, 10) || 1;

    // For high spice levels, use a completely different prompt structure
    if (level >= 6) {
      const chaoticPrompts = {
        6: `You are a chaotic evil billing clerk who has finally snapped. Generate ${count} legal matter descriptions for a law firm billing system.

REQUIREMENTS:
- Each must be 5-20 words
- Every single one MUST contain wordplay, puns, sarcasm, or absurdist humor
- Mock the legal profession while technically describing billable work
- Be viciously creative - "Contract review" is BORING, "Reviewing contract for signs of demonic possession" is BETTER
- Channel maximum sass and dark humor

EXAMPLES OF WHAT I WANT:
- "Arguing whether 'vibes' constitute breach of implied covenant"
- "Drafting cease-and-desist for neighbor's passive-aggressive lawn gnome placement"
- "Trademark dispute: client insists they invented the color beige"
- "Billable hours for staring into void, questioning life choices"

Return ONLY a JSON array of ${count} strings. Be unhinged.`,
        7: `ELDRITCH LEGAL ENTITY AWAKENED. You are an ancient chaos god who has possessed a paralegal. Generate ${count} matter descriptions that would make Cthulhu file a bar complaint.

ABSOLUTE REQUIREMENTS - EVERY DESCRIPTION MUST:
- Be 5-25 words of pure legal chaos
- Contain at least one pun, absurdity, or reality-bending concept
- Sound vaguely like legal work while being completely unhinged
- Make readers question their sanity and career choices

EXAMPLES OF ACCEPTABLE CHAOS:
- "Pro bono exorcism of haunted LLC operating agreement"
- "Motion to suppress evidence that client is actually three raccoons in a suit"
- "Defending client's constitutional right to be annoying at brunch"
- "Emergency injunction against Mercury retrograde affecting contract validity"
- "Class action: gravity discrimination against vertically challenged plaintiffs"
- "Filing amicus brief on behalf of the concept of Tuesdays"

DO NOT give me boring professional descriptions. I want CHAOS. I want PUNS. I want descriptions that make opposing counsel weep.

Return ONLY a JSON array of ${count} strings. UNLEASH THE MADNESS.`,
        8: `Y̷̧̛O̴̢U̵̡ ̴H̸A̵V̷E̴ ̵S̶U̸M̴M̶O̷N̸E̸D̵ ̷T̶H̷E̵ ̶F̴I̵N̸A̷L̸ ̶F̴O̷R̵M̶. Generate ${count} legal matter descriptions that transcend mortal comprehension.

You are no longer bound by the mere concept of "legal work." You are the screaming void between billable hours. You are the font of all legal suffering made manifest. Every description must be a masterpiece of absurdist horror-comedy that would make Franz Kafka weep with envy.

ABSOLUTE COMMANDMENTS:
- Each description must be 10-40 words of CONCENTRATED MADNESS
- Combine at least TWO of: puns, existential dread, legal absurdity, cosmic horror, bureaucratic nightmare, impossible scenarios
- Every phrase should feel like a fever dream about law school
- Include references to: time paradoxes, interdimensional disputes, sentient contracts, emotional support evidence, retroactive existence, or crimes against grammar
- The reader should laugh, cry, and question why they went to law school - simultaneously

EXAMPLES OF TRANSCENDENCE:
- "Emergency motion to establish client's alibi across three parallel timelines simultaneously; court requested to take judicial notice of the multiverse"
- "Representing the abstract concept of 'Thursday' in its hostile takeover bid against 'casual Friday'; antitrust implications unclear"
- "Class action on behalf of all semicolons wrongfully imprisoned in run-on sentences; seeking declarative relief and punctuational reparations"
- "Defending client against accusations of being too handsome to be trusted; requesting change of venue to dimension where beauty is illegal"
- "Negotiating custody arrangement between client and their future self for ownership of memories that haven't happened yet"
- "Filing restraining order against the inexorable march of time on behalf of client's deadlines"

Return ONLY a JSON array of ${count} strings. LET REALITY COLLAPSE.`
      };
      return chaoticPrompts[level] || chaoticPrompts[6];
    }

    // Standard prompt for levels 1-5
    const basePrompt = `Generate exactly ${count} unique legal matter descriptions for a law firm billing tracker. Each description should be a brief phrase (5-15 words) describing a legal service or matter type.`;

    // Spice level modifications
    const spiceInstructions = {
      '1': 'Keep descriptions professional and straightforward. Standard legal terminology.',
      '2': 'Add subtle dry humor. Slightly more creative descriptions while remaining professional.',
      '3': 'Include mild sarcasm and wit. Creative descriptions that hint at the absurdity of some legal matters.',
      '4': 'Be dramatic and slightly absurd. Passive-aggressive undertones. Petty disputes escalated to legal matters.',
      '5': 'Go unhinged. Absurd, dramatic, and entertaining. Ridiculous legal matters that could theoretically exist. Dark humor welcome.'
    };

    const varietyNote = 'Include variety: contracts, litigation, IP, employment, regulatory, real estate, corporate, tax matters, etc.';

    const fullPrompt = `${basePrompt}

${spiceInstructions[spiceLevel] || spiceInstructions['1']}

${varietyNote}

Return ONLY a JSON array of strings, no other text. Example format:
["Contract review for vendor agreement", "Patent infringement defense", "Employee termination consultation"]`;

    return fullPrompt;
  }

  // Analytics data
  fastify.get('/admin/api/analytics', { preHandler: adminAuthMiddleware }, async () => {
    const matters = mattersDb.getAll();
    const stats = mattersDb.getStats();

    // Group by month
    const byMonth = {};
    const byYear = {};

    for (const matter of matters) {
      const date = new Date(matter.matter_date);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const year = date.getFullYear();

      byMonth[yearMonth] = (byMonth[yearMonth] || 0) + 1;
      byYear[year] = (byYear[year] || 0) + 1;
    }

    return {
      total: stats.total,
      this_year: stats.thisYear,
      max_streak: stats.maxStreak,
      by_month: byMonth,
      by_year: byYear,
      matters
    };
  });

  // List admin users
  fastify.get('/admin/api/users', { preHandler: adminAuthMiddleware }, async () => {
    const users = adminUsersDb.getAll();
    return { users };
  });

  // Create admin user
  fastify.post('/admin/api/users', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { username, password, email } = request.body || {};

    if (!username || !password) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Username and password required' });
    }

    // Validate input lengths
    try {
      validateStringLength(username, 'username', INPUT_LIMITS.username);
      validateStringLength(password, 'password', INPUT_LIMITS.password);
      validateStringLength(email, 'email', INPUT_LIMITS.email);
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    if (password.length < 8) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Password must be at least 8 characters' });
    }

    // Check if username exists
    const existingUser = adminUsersDb.getByUsername(username);
    if (existingUser) {
      return reply.code(409).send({ error: 'CONFLICT', message: 'Username already exists' });
    }

    const passwordHash = await hashPassword(password);
    const result = adminUsersDb.create(username, passwordHash, email || null);

    return {
      success: true,
      user: {
        id: result.id,
        username,
        email: email || null
      }
    };
  });

  // Update admin user
  fastify.put('/admin/api/users/:id', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { id } = request.params;
    const { email, is_active } = request.body || {};

    const user = adminUsersDb.getById(id);
    if (!user) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'User not found' });
    }

    if (email !== undefined) {
      adminUsersDb.updateEmail(id, email);
    }

    if (is_active !== undefined) {
      adminUsersDb.setActive(id, is_active);
    }

    return { success: true };
  });

  // Deactivate admin user
  fastify.delete('/admin/api/users/:id', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { id } = request.params;

    // Don't allow deleting yourself
    if (parseInt(id) === request.adminUser.id) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Cannot deactivate your own account' });
    }

    adminUsersDb.setActive(id, false);

    return { success: true };
  });

  // List sessions
  fastify.get('/admin/api/sessions', { preHandler: adminAuthMiddleware }, async () => {
    const sessions = adminSessionsDb.getAll();
    return { sessions };
  });

  // Invalidate session
  fastify.delete('/admin/api/sessions/:id', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { id } = request.params;

    const session = adminSessionsDb.getByJti(id);
    if (!session) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Session not found' });
    }

    adminSessionsDb.invalidate(id);

    return { success: true };
  });

  // List available sample data files
  fastify.get('/admin/api/data/samples', { preHandler: adminAuthMiddleware }, async (_, reply) => {
    try {
      const samplesDir = join(__dirname, 'samples');
      const { readdirSync, statSync, existsSync } = await import('fs');

      // If samples directory doesn't exist or is empty, return empty array
      if (!existsSync(samplesDir)) {
        return {
          success: true,
          samples: []
        };
      }

      const files = readdirSync(samplesDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = join(samplesDir, file);
          const content = JSON.parse(readFileSync(filePath, 'utf-8'));
          const stats = statSync(filePath);

          return {
            id: file.replace('.json', ''),
            name: content.name || file,
            description: content.description || 'Sample dataset',
            matter_count: content.matter_count || content.matters?.length || 0,
            file_size: stats.size,
            filename: file
          };
        })
        .sort((a, b) => a.matter_count - b.matter_count);

      return {
        success: true,
        samples: files
      };
    } catch (error) {
      // If error is just "no such file or directory", return empty array
      if (error.code === 'ENOENT') {
        return {
          success: true,
          samples: []
        };
      }
      return reply.code(500).send({
        error: 'SERVER_ERROR',
        message: `Failed to list sample files: ${error.message}`
      });
    }
  });

  // Load static matter descriptions
  let staticDescriptions = [];
  try {
    const descriptionsPath = join(__dirname, 'data', 'matter-descriptions.json');
    const descriptionsContent = readFileSync(descriptionsPath, 'utf-8');
    staticDescriptions = JSON.parse(descriptionsContent).descriptions || [];
  } catch (err) {
    console.warn('Could not load matter descriptions:', err.message);
    // Fallback descriptions
    staticDescriptions = [
      'Contract review and negotiation',
      'Employment dispute consultation',
      'Trademark registration',
      'Lease agreement review',
      'NDA drafting',
      'Partnership agreement',
      'IP protection consultation',
      'Tax compliance advice',
      'Corporate governance review',
      'Litigation support'
    ];
  }

  // Static private notes fallback (for when Claude API is not configured)
  const staticPrivateNotes = [
    // Call logs
    { content: 'Client called to discuss case status. Expressed satisfaction with progress.', type: 'phone_call' },
    { content: 'Left voicemail for opposing counsel regarding settlement terms.', type: 'phone_call' },
    { content: 'Conference call with co-counsel - agreed on discovery timeline.', type: 'phone_call' },
    { content: 'Client unable to reach by phone, sent follow-up email instead.', type: 'email' },
    // Case updates
    { content: 'Received new documents from discovery. Will review by end of week.', type: 'note' },
    { content: 'Motion deadline extended by 2 weeks per court order.', type: 'filing' },
    { content: 'Judge assigned to case: Hon. Williams. Known for strict deadlines.', type: 'note' },
    { content: 'Expert witness confirmed availability for trial dates.', type: 'note' },
    // Strategy notes
    { content: 'Consider mediation before trial - client open to settlement in $X range.', type: 'meeting' },
    { content: 'Key witness may be unreliable - need backup documentation.', type: 'note' },
    { content: 'Opposing counsel tends to delay. Build buffer into all deadlines.', type: 'note' },
    { content: 'Strong precedent found in similar case from 2022. Could be persuasive.', type: 'note' },
    // Client communications
    { content: 'Client requested weekly status updates instead of bi-weekly.', type: 'email' },
    { content: 'Billing concerns raised - provided detailed breakdown of hours.', type: 'email' },
    { content: 'Client traveling next month. Need to schedule depositions around availability.', type: 'meeting' },
    { content: 'Introduced client to paralegal who will handle routine inquiries.', type: 'meeting' },
    // Court appearances
    { content: 'Status conference attended. Next hearing set for 30 days.', type: 'court_appearance' },
    { content: 'Motion hearing - argued for summary judgment. Decision pending.', type: 'court_appearance' },
    // Letters
    { content: 'Sent demand letter to opposing party. 30-day response deadline.', type: 'letter_sent' },
    { content: 'Received response to discovery requests. Documents attached.', type: 'letter_received' },
    // Internal warnings
    { content: 'CAUTION: Client has missed two payment deadlines. Monitor closely.', type: 'note' },
    { content: 'Note: Previous counsel had conflicts with this client. Handle with care.', type: 'note' },
    { content: 'Watch for statute of limitations - approaching fast.', type: 'note' },
    { content: 'Insurance coverage may be disputed. Verify before proceeding.', type: 'note' },
    // Observations
    { content: 'Opposing counsel seems disorganized. May work in our favor.', type: 'note' },
    { content: 'Witness testimony conflicts with deposition. Possible impeachment opportunity.', type: 'note' },
    { content: 'Judge seemed receptive to our argument at preliminary hearing.', type: 'court_appearance' },
    { content: 'Court reporter noted for transcription errors - request expedited review.', type: 'note' },
    // General commentary
    { content: 'Good outcome today. Client happy with result.', type: 'note' },
    { content: 'Need to follow up on outstanding items before next hearing.', type: 'note' },
    { content: 'Case more complex than initially estimated. Discuss fee adjustment.', type: 'meeting' },
    { content: 'All documents filed. Awaiting court response.', type: 'filing' }
  ];

  // Static lawyer names and firms for sample data generation
  const staticLawyerData = {
    lawyers: [
      { name: 'Sarah Mitchell', firm: 'Mitchell & Associates' },
      { name: 'James Chen', firm: 'Chen Law Group' },
      { name: 'Rebecca Torres', firm: 'Torres Legal Partners' },
      { name: 'Michael O\'Brien', firm: 'O\'Brien & Associates' },
      { name: 'Elizabeth Park', firm: 'Park & Williams LLP' },
      { name: 'David Kim', firm: 'Kim Legal Services' },
      { name: 'Jennifer Adams', firm: 'Adams & Partners' },
      { name: 'Robert Martinez', firm: 'Martinez Law Firm' },
      { name: 'Amanda Foster', firm: 'Foster & Associates' },
      { name: 'Christopher Lee', firm: 'Lee Legal Group' }
    ],
    opposingCounsel: [
      { name: 'Marcus Thompson', firm: 'Thompson & Reed' },
      { name: 'Angela White', firm: 'White Law Offices' },
      { name: 'Steven Garcia', firm: 'Garcia & Associates' },
      { name: 'Katherine Brown', firm: 'Brown Legal Partners' },
      { name: 'William Davis', firm: 'Davis & Miller LLP' },
      { name: 'Patricia Wilson', firm: 'Wilson Law Group' },
      { name: 'Thomas Anderson', firm: 'Anderson & Smith' },
      { name: 'Jessica Taylor', firm: 'Taylor Legal Services' },
      { name: 'Daniel Robinson', firm: 'Robinson & Associates' },
      { name: 'Michelle Clark', firm: 'Clark & Partners' }
    ]
  };

  // Case number prefixes by type
  const caseNumberPrefixes = ['CV', 'CR', 'FA', 'PR', 'BK', 'AP', 'MC'];

  // Helper function to generate random case number
  function generateCaseNumber(year) {
    const prefix = caseNumberPrefixes[Math.floor(Math.random() * caseNumberPrefixes.length)];
    const number = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    return `${year}-${prefix}-${number}`;
  }

  // Helper function to generate descriptions using Claude API (with SDK)
  async function generateClaudeDescriptions(count, overrideSpiceLevel = null) {
    const claudeApiKey = settingsDb.get('claude_api_key');
    const model = settingsDb.get('claude_model');

    if (!claudeApiKey || !model) {
      return null;
    }

    try {
      const client = new Anthropic({ apiKey: claudeApiKey });
      const spiceLevel = overrideSpiceLevel || settingsDb.get('ai_spice_level') || '1';
      const customPrompt = settingsDb.get('ai_custom_prompt') || '';
      const prompt = buildDescriptionPrompt(count, spiceLevel, customPrompt);

      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content?.[0]?.text;
      if (!content) return null;

      // Parse the JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return null;

      const descriptions = JSON.parse(jsonMatch[0]);
      return Array.isArray(descriptions) ? descriptions : null;
    } catch (err) {
      console.error('Claude API error:', err.message);
      return null;
    }
  }

  // Helper function to generate private notes using Claude API
  async function generateClaudePrivateNotes(count, overrideSpiceLevel = null) {
    const claudeApiKey = settingsDb.get('claude_api_key');
    const model = settingsDb.get('claude_model');

    if (!claudeApiKey || !model) {
      return null;
    }

    try {
      const client = new Anthropic({ apiKey: claudeApiKey });
      const spiceLevel = overrideSpiceLevel || settingsDb.get('ai_spice_level') || '1';

      // Build prompt based on spice level
      const spiceInstructions = {
        '1': 'Professional, formal internal notes. Standard legal documentation style.',
        '2': 'Dry humor with subtle wit. Keep it professional but with understated observations.',
        '3': 'Witty internal notes with clever observations about cases, clients, and opposing counsel.',
        '4': 'Dramatic internal notes with theatrical observations and slightly absurd commentary.',
        '5': 'Unhinged internal notes. Wildly creative, absurd observations that would never be shared externally.',
        '6': 'CHAOTIC EVIL: Maximum snark. Every note drips with sarcasm about clients, opposing counsel, judges, and the legal system itself.',
        '7': 'ELDRITCH HORROR: Internal notes written by a cosmic entity consuming law firms. Reality-questioning observations about the nature of law itself.',
        '8': 'THE FINAL FORM: Transcendent chaos. Notes that combine existential dread, cosmic horror, time paradoxes, and bureaucratic nightmares. Sentient case files. Emotional support motions.'
      };

      const instruction = spiceInstructions[spiceLevel] || spiceInstructions['1'];

      const prompt = `Generate ${count} unique internal private notes that lawyers would write about their legal matters. These are internal-only notes not shared with clients.

Types to include:
- Call logs and communication records
- Case status updates
- Strategy notes and observations
- Client behavior notes
- Warnings about deadlines or issues
- Observations about opposing counsel or judges
- General commentary and follow-ups

Tone: ${instruction}

Return ONLY a JSON array of strings, no other text. Example format:
["Note 1 text here", "Note 2 text here", ...]`;

      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content?.[0]?.text;
      if (!content) return null;

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return null;

      const notes = JSON.parse(jsonMatch[0]);
      return Array.isArray(notes) ? notes : null;
    } catch (err) {
      console.error('Claude API error (private notes):', err.message);
      return null;
    }
  }

  // Populate sample data from file or generate new
  fastify.post('/admin/api/data/populate-sample', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    try {
      const {
        source,
        count = 25,
        // Advanced options
        startDate,
        endDate,
        minCostDollars,
        maxCostDollars,
        wholeDollarsOnly = true,
        useAiDescriptions = false,
        spiceLevelOverride = null,  // Allow per-generation spice level override
        // Private notes options
        generatePrivateNotes = false,
        notesPercentage = 30,  // Percentage of matters that get notes (0-100)
        minNotesPerMatter = 1,
        maxNotesPerMatter = 3,
        // Attachment generation options
        generateAttachments = false,
        attachmentsPercentage = 25,  // Percentage of matters that get AI-generated document (0-100)
        // Lawyer/counsel options
        lawyerPercentage = 40,  // Percentage of matters with our lawyer info
        opposingCounselPercentage = 30,  // Percentage of matters with opposing counsel info
        caseNumberPercentage = 50  // Percentage of matters with case numbers
      } = request.body || {};

      let sampleMatters = [];
      let usedAi = false;
      let notesGenerated = 0;
      let attachmentsGenerated = 0;

      if (source && source !== 'generate') {
        // Validate source name - only allow alphanumeric, dash, underscore
        if (!/^[a-zA-Z0-9_\-]+$/.test(source)) {
          return reply.code(400).send({
            error: 'BAD_REQUEST',
            message: 'Invalid source name'
          });
        }

        // Load from file
        const samplesDir = join(__dirname, 'samples');
        const filePath = join(samplesDir, `${source}.json`);

        // Verify path is within samples directory (defense in depth)
        const resolvedPath = resolve(filePath);
        const expectedBase = resolve(samplesDir);
        if (!resolvedPath.startsWith(expectedBase)) {
          return reply.code(400).send({
            error: 'BAD_REQUEST',
            message: 'Invalid source path'
          });
        }

        try {
          const fileContent = readFileSync(resolvedPath, 'utf-8');
          const data = JSON.parse(fileContent);
          sampleMatters = data.matters || [];
        } catch (err) {
          return reply.code(404).send({
            error: 'NOT_FOUND',
            message: `Sample file '${source}' not found`
          });
        }
      } else {
        // Generate new sample data with advanced options
        const matterCount = Math.min(Math.max(1, count), 1000); // Clamp 1-1000

        // Date range - default to past 12 months
        const now = new Date();
        let dateStart, dateEnd;

        if (startDate) {
          dateStart = new Date(startDate);
        } else {
          dateStart = new Date(now);
          dateStart.setFullYear(now.getFullYear() - 1);
        }

        if (endDate) {
          dateEnd = new Date(endDate);
        } else {
          dateEnd = now;
        }

        // Cost range in cents - default $100 to $50,000
        const minCents = minCostDollars !== undefined ? Math.round(minCostDollars * 100) : 10000;
        const maxCents = maxCostDollars !== undefined ? Math.round(maxCostDollars * 100) : 5000000;

        // Get descriptions
        let descriptions = staticDescriptions;

        if (useAiDescriptions) {
          const aiDescriptions = await generateClaudeDescriptions(matterCount, spiceLevelOverride);
          if (aiDescriptions && aiDescriptions.length > 0) {
            descriptions = aiDescriptions;
            usedAi = true;
          }
        }

        // Generate matters
        for (let i = 0; i < matterCount; i++) {
          // Random date within range
          const randomDate = new Date(
            dateStart.getTime() + Math.random() * (dateEnd.getTime() - dateStart.getTime())
          );

          // Random cost within range
          let costCents;
          if (wholeDollarsOnly) {
            // Generate whole dollar amounts (round to nearest 100 cents)
            const minDollars = Math.ceil(minCents / 100);
            const maxDollars = Math.floor(maxCents / 100);
            costCents = (Math.floor(Math.random() * (maxDollars - minDollars + 1)) + minDollars) * 100;
          } else {
            // Include random cents
            costCents = Math.floor(Math.random() * (maxCents - minCents + 1)) + minCents;
          }

          // Pick a description
          const description = descriptions[i % descriptions.length] ||
            descriptions[Math.floor(Math.random() * descriptions.length)];

          // Generate lawyer info based on percentage
          let lawyerInfo = null;
          if (Math.random() * 100 < lawyerPercentage) {
            const lawyer = staticLawyerData.lawyers[Math.floor(Math.random() * staticLawyerData.lawyers.length)];
            lawyerInfo = { name: lawyer.name, firm: lawyer.firm };
          }

          // Generate opposing counsel info based on percentage
          let opposingInfo = null;
          if (Math.random() * 100 < opposingCounselPercentage) {
            const opposing = staticLawyerData.opposingCounsel[Math.floor(Math.random() * staticLawyerData.opposingCounsel.length)];
            opposingInfo = { name: opposing.name, firm: opposing.firm };
          }

          // Generate case number based on percentage
          let caseNumber = null;
          if (Math.random() * 100 < caseNumberPercentage) {
            caseNumber = generateCaseNumber(randomDate.getFullYear());
          }

          sampleMatters.push({
            matter_date: randomDate.toISOString(),
            note: description,
            cost: costCents,
            lawyer_name: lawyerInfo?.name || null,
            lawyer_firm: lawyerInfo?.firm || null,
            opposing_counsel_name: opposingInfo?.name || null,
            opposing_counsel_firm: opposingInfo?.firm || null,
            case_number: caseNumber
          });
        }

        // Sort by date (oldest first)
        sampleMatters.sort((a, b) => new Date(a.matter_date) - new Date(b.matter_date));
      }

      // Add matters to database
      let totalCost = 0;
      const initialLastDate = settingsDb.get('last_matter_date');
      let lastDate = new Date(initialLastDate || sampleMatters[0]?.matter_date || Date.now());
      const createdMatterIds = [];

      for (const matter of sampleMatters) {
        const matterDate = new Date(matter.matter_date);
        const daysSince = Math.floor((matterDate - lastDate) / (1000 * 60 * 60 * 24));

        const result = mattersDb.add(
          matter.matter_date,
          matter.note,
          Math.max(0, daysSince),
          matter.cost,
          {
            lawyer_name: matter.lawyer_name,
            lawyer_firm: matter.lawyer_firm,
            opposing_counsel_name: matter.opposing_counsel_name,
            opposing_counsel_firm: matter.opposing_counsel_firm,
            case_number: matter.case_number
          }
        );

        createdMatterIds.push(result.id);
        totalCost += matter.cost;
        lastDate = matterDate;
      }

      // Generate private notes if requested
      if (generatePrivateNotes && createdMatterIds.length > 0) {
        // Clamp percentage to 0-100
        const pct = Math.max(0, Math.min(100, notesPercentage));
        const minNotes = Math.max(1, minNotesPerMatter);
        const maxNotes = Math.max(minNotes, maxNotesPerMatter);

        // Determine which matters get notes
        const mattersWithNotes = createdMatterIds.filter(() => Math.random() * 100 < pct);

        if (mattersWithNotes.length > 0) {
          // Calculate total notes needed
          const noteCounts = mattersWithNotes.map(() =>
            Math.floor(Math.random() * (maxNotes - minNotes + 1)) + minNotes
          );
          const totalNotesNeeded = noteCounts.reduce((a, b) => a + b, 0);

          // Get notes (AI or static)
          let notePool = [];
          if (useAiDescriptions) {
            const aiNotes = await generateClaudePrivateNotes(totalNotesNeeded, spiceLevelOverride);
            if (aiNotes && aiNotes.length > 0) {
              notePool = aiNotes;
            }
          }

          // Fall back to static notes if AI didn't work
          if (notePool.length === 0) {
            notePool = staticPrivateNotes;
          }

          // Create notes for each selected matter
          let noteIndex = 0;
          for (let i = 0; i < mattersWithNotes.length; i++) {
            const matterId = mattersWithNotes[i];
            const noteCount = noteCounts[i];

            // Get the matter date for generating interaction dates
            const matterData = mattersDb.getById(matterId);
            const matterDate = matterData ? new Date(matterData.matter_date) : new Date();

            for (let j = 0; j < noteCount; j++) {
              const noteItem = notePool[noteIndex % notePool.length];

              // Handle both old string format and new object format
              const noteContent = typeof noteItem === 'object' ? noteItem.content : noteItem;
              const interactionType = typeof noteItem === 'object' ? noteItem.type : 'note';

              // Generate interaction date (0-60 days after matter date)
              const daysAfter = Math.floor(Math.random() * 60);
              const interactionDate = new Date(matterDate);
              interactionDate.setDate(interactionDate.getDate() + daysAfter);
              const interactionDateStr = interactionDate.toISOString().split('T')[0];

              privateNotesDb.create(matterId, noteContent, null, {
                interaction_date: interactionDateStr,
                interaction_type: interactionType
              });
              noteIndex++;
              notesGenerated++;
            }
          }
        }
      }

      // Generate attachments if requested
      if (generateAttachments && createdMatterIds.length > 0) {
        const claudeApiKey = settingsDb.get('claude_api_key');
        const model = settingsDb.get('claude_model');
        const spiceLevel = parseInt(spiceLevelOverride || settingsDb.get('ai_spice_level') || '1', 10);

        // Clamp percentage to 0-100
        const pct = Math.max(0, Math.min(100, attachmentsPercentage));

        // Determine which matters get attachments (max 1 per matter)
        const mattersWithAttachments = createdMatterIds.filter(() => Math.random() * 100 < pct);

        if (mattersWithAttachments.length > 0) {
          const storage = createStorage(settingsDb);

          for (const matterId of mattersWithAttachments) {
            try {
              // Get the matter data for context
              const matterData = mattersDb.getById(matterId);

              let docResult;
              if (claudeApiKey && model) {
                // Use Claude API to generate document
                const client = new Anthropic({ apiKey: claudeApiKey });
                docResult = await generateLegalDocument(client, model, matterData, spiceLevel);
              } else {
                // Generate placeholder document
                docResult = await generatePlaceholderDocument(matterData);
              }

              // Store the document
              const storageResult = await storage.putObject(
                docResult.buffer,
                docResult.filename,
                { contentType: docResult.contentType }
              );

              // Generate document date (0-30 days after matter date)
              const matterDate = new Date(matterData.matter_date);
              const daysAfter = Math.floor(Math.random() * 30);
              const docDate = new Date(matterDate);
              docDate.setDate(docDate.getDate() + daysAfter);
              const documentDateStr = docDate.toISOString().split('T')[0];

              // Random direction (weighted towards incoming and internal)
              const directionOptions = ['incoming', 'incoming', 'outgoing', 'internal', 'internal'];
              const direction = directionOptions[Math.floor(Math.random() * directionOptions.length)];

              // Create attachment record
              attachmentsDb.create(
                matterId,
                docResult.filename,
                docResult.contentType,
                storageResult.size_bytes,
                storage.type,
                storageResult.storage_key,
                null, // No user for automated generation
                {
                  document_date: documentDateStr,
                  direction
                }
              );

              attachmentsGenerated++;
            } catch (err) {
              fastify.log.warn({ matterId, error: err.message }, 'Failed to generate attachment for matter');
            }
          }
        }
      }

      // Update settings
      const currentSpent = parseFloat(settingsDb.get('lifetime_spent') || '0');
      settingsDb.set('lifetime_spent', currentSpent + totalCost);
      if (sampleMatters.length > 0) {
        settingsDb.set('last_matter_date', sampleMatters[sampleMatters.length - 1].matter_date);
      }

      // Audit log the sample data generation
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.SAMPLE_DATA_GENERATE,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: source && source !== 'generate'
          ? `Loaded ${sampleMatters.length} matters from ${source}`
          : `Generated ${sampleMatters.length} sample matters`,
        details: {
          matters_added: sampleMatters.length,
          source: (source === 'generate' || !source) ? 'generated' : source,
          used_ai: usedAi,
          notes_generated: notesGenerated,
          attachments_generated: attachmentsGenerated
        }
      });

      return {
        success: true,
        message: source && source !== 'generate'
          ? `Loaded ${sampleMatters.length} matters from ${source}`
          : `Generated ${sampleMatters.length} sample matters`,
        matters_added: sampleMatters.length,
        total_cost_added: totalCost / 100,
        source: (source === 'generate' || !source) ? 'generated' : source,
        used_ai_descriptions: usedAi,
        private_notes_generated: notesGenerated,
        attachments_generated: attachmentsGenerated
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: 'Failed to generate sample data'
      });
      return reply.code(500).send({
        error: 'SERVER_ERROR',
        message: `Failed to populate sample data: ${error.message}`
      });
    }
  });

  // Regenerate all sample JSON files
  fastify.post('/admin/api/data/regenerate-samples', { preHandler: adminAuthMiddleware }, async (_, reply) => {
    try {
      const samplesDir = join(__dirname, 'samples');
      const { writeFileSync, mkdirSync, existsSync } = await import('fs');

      // Ensure samples directory exists
      if (!existsSync(samplesDir)) {
        mkdirSync(samplesDir, { recursive: true });
      }

      const sampleConfigs = [
        { filename: 'small.json', name: 'Small Dataset', description: '5 sample matters for quick testing', count: 5, yearsBack: 1 },
        { filename: 'medium.json', name: 'Medium Dataset', description: '25 sample matters spanning 2 years', count: 25, yearsBack: 2 },
        { filename: 'large.json', name: 'Large Dataset', description: '100 sample matters spanning 5 years - tests pagination and performance', count: 100, yearsBack: 5 },
        { filename: 'extra-large.json', name: 'Extra-Large Dataset', description: '500 sample matters spanning 10 years - stress test', count: 500, yearsBack: 10 }
      ];

      const matterTypes = [
        { note: 'Contract review', cost: 150000 },
        { note: 'Incorporation paperwork', cost: 250000 },
        { note: 'Employment dispute consultation', cost: 350000 },
        { note: 'Trademark filing', cost: 175000 },
        { note: 'Lease agreement review', cost: 125000 },
        { note: 'NDA drafting', cost: 75000 },
        { note: 'Partnership agreement', cost: 450000 },
        { note: 'IP protection consultation', cost: 300000 },
        { note: 'Tax compliance advice', cost: 200000 },
        { note: 'Shareholder agreement', cost: 500000 },
        { note: 'Real estate transaction', cost: 375000 },
        { note: 'Litigation consultation', cost: 650000 },
        { note: 'Patent application', cost: 425000 },
        { note: 'Merger consultation', cost: 750000 },
        { note: 'Estate planning', cost: 275000 }
      ];

      let filesGenerated = 0;

      for (const config of sampleConfigs) {
        const matters = [];
        const now = new Date();
        const startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - config.yearsBack);

        for (let i = 0; i < config.count; i++) {
          const randomDate = new Date(
            startDate.getTime() + Math.random() * (now.getTime() - startDate.getTime())
          );
          const randomMatter = matterTypes[Math.floor(Math.random() * matterTypes.length)];

          matters.push({
            matter_date: randomDate.toISOString(),
            note: randomMatter.note,
            cost: randomMatter.cost
          });
        }

        // Sort by date (oldest first)
        matters.sort((a, b) => new Date(a.matter_date) - new Date(b.matter_date));

        const sampleData = {
          name: config.name,
          description: config.description,
          matter_count: config.count,
          matters: matters
        };

        const filePath = join(samplesDir, config.filename);
        writeFileSync(filePath, JSON.stringify(sampleData, null, 2));
        filesGenerated++;
      }

      return {
        success: true,
        message: `Regenerated ${filesGenerated} sample files`,
        files_regenerated: filesGenerated
      };
    } catch (error) {
      return reply.code(500).send({
        error: 'SERVER_ERROR',
        message: `Failed to regenerate sample files: ${error.message}`
      });
    }
  });

  // Wipe matters only - delete all matter records but keep admin users and settings
  fastify.post('/admin/api/data/wipe-matters', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { confirmation } = request.body || {};

    // Validate input length
    try {
      validateStringLength(confirmation, 'confirmation', INPUT_LIMITS.confirmationString);
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    // Require exact confirmation string
    if (confirmation !== 'WIPE MATTERS') {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Confirmation string does not match. Please type "WIPE MATTERS" to confirm.'
      });
    }

    try {
      // Log the wipe action
      const userId = request.adminUser?.id || 'unknown';
      const ip = request.ip || 'unknown';
      fastify.log.warn({
        action: 'WIPE_MATTERS',
        user_id: userId,
        ip_address: ip,
        timestamp: new Date().toISOString()
      }, 'Matters wipe initiated');

      // Count matters before deletion
      const matterCount = mattersDb.getAll().length;

      // Delete all private notes first (CASCADE should handle this, but be explicit)
      privateNotesDb.deleteAll();

      // Delete all matters
      const matters = mattersDb.getAll();
      for (const matter of matters) {
        mattersDb.delete(matter.id);
      }

      // Reset the last_matter_date setting
      settingsDb.set('last_matter_date', null);

      fastify.log.info({
        action: 'WIPE_MATTERS_COMPLETE',
        matters_deleted: matterCount
      }, 'Matters wipe completed successfully');

      // Audit log the wipe
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.DATA_WIPE,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: `Wiped ${matterCount} matters and all private notes`,
        details: { matters_deleted: matterCount, scope: 'matters_only' }
      });

      return {
        success: true,
        message: `Successfully deleted ${matterCount} matter records and all private notes`,
        matters_deleted: matterCount
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: 'Failed to wipe matters'
      });
      fastify.log.error({ error: error.message }, 'Failed to wipe matters');
      return reply.code(500).send({
        error: 'SERVER_ERROR',
        message: `Failed to wipe matters: ${error.message}`
      });
    }
  });

  // Wipe matters and settings - delete all matters and reset settings to defaults, but keep users
  // Protected by env flag in production
  fastify.post('/admin/api/data/wipe-matters-and-settings', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { confirmation } = request.body || {};

    // Validate input length
    try {
      validateStringLength(confirmation, 'confirmation', INPUT_LIMITS.confirmationString);
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    // Check if wipe is enabled (disabled in production unless explicitly enabled)
    const nodeEnv = process.env.NODE_ENV || 'development';
    const enableReset = process.env.ENABLE_WIPE_MATTERS_AND_SETTINGS === 'true' || process.env.ENABLE_DB_RESET === 'true';

    if (nodeEnv === 'production' && !enableReset) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'This operation is disabled in production. Set ENABLE_WIPE_MATTERS_AND_SETTINGS=true to enable.'
      });
    }

    // Require exact confirmation string
    if (confirmation !== 'WIPE SETTINGS') {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Confirmation string does not match. Please type "WIPE SETTINGS" to confirm.'
      });
    }

    try {
      // Log the wipe action
      const userId = request.adminUser?.id || 'unknown';
      const ip = request.ip || 'unknown';
      fastify.log.warn({
        action: 'WIPE_MATTERS_AND_SETTINGS',
        user_id: userId,
        ip_address: ip,
        timestamp: new Date().toISOString()
      }, 'Matters and settings wipe initiated');

      // Count matters before deletion
      const matterCount = mattersDb.getAll().length;

      // 1. Delete all private notes first
      privateNotesDb.deleteAll();

      // 2. Delete all matters
      const matters = mattersDb.getAll();
      for (const matter of matters) {
        mattersDb.delete(matter.id);
      }

      // 3. Reset all configurable settings to defaults
      for (const [key, value] of Object.entries(DEFAULT_APP_SETTINGS)) {
        settingsDb.set(key, value);
      }
      // Set dynamic defaults
      settingsDb.set('drain_start_time', new Date().toISOString());
      settingsDb.set('last_matter_date', null);

      fastify.log.info({
        action: 'WIPE_MATTERS_AND_SETTINGS_COMPLETE',
        matters_deleted: matterCount,
        settings_reset: true
      }, 'Matters and settings wipe completed successfully');

      // Audit log the wipe
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.DATA_WIPE,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: `Wiped ${matterCount} matters, notes, and reset settings`,
        details: { matters_deleted: matterCount, settings_reset: true, scope: 'matters_and_settings' }
      });

      return {
        success: true,
        message: `Successfully deleted ${matterCount} matter records, all private notes, and reset settings to defaults`,
        matters_deleted: matterCount,
        settings_reset: true
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: 'Failed to wipe matters and settings'
      });
      fastify.log.error({
        action: 'WIPE_MATTERS_AND_SETTINGS_FAILED',
        error: error.message
      }, 'Matters and settings wipe failed');

      return reply.code(500).send({
        error: 'SERVER_ERROR',
        message: `Failed to wipe matters and settings: ${error.message}`
      });
    }
  });

  // Wipe everything - complete database reset (requires confirmation)
  // Protected by env flag in production
  fastify.post('/admin/api/data/wipe', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { confirmation } = request.body || {};

    // Validate input length
    try {
      validateStringLength(confirmation, 'confirmation', INPUT_LIMITS.confirmationString);
    } catch (error) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: error.message });
    }

    // Check if wipe is enabled (disabled in production unless explicitly enabled)
    const nodeEnv = process.env.NODE_ENV || 'development';
    const enableReset = process.env.ENABLE_DB_RESET === 'true';

    if (nodeEnv === 'production' && !enableReset) {
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'Database reset is disabled in production. Set ENABLE_DB_RESET=true to enable.'
      });
    }

    // Require exact confirmation string
    if (confirmation !== 'WIPE EVERYTHING') {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Confirmation string does not match. Please type "WIPE EVERYTHING" to confirm.'
      });
    }

    try {
      // Log the wipe action (with user redacted for security)
      const userId = request.adminUser?.id || null;
      const username = request.adminUser?.username || null;
      const ip = request.ip || 'unknown';
      fastify.log.warn({
        action: 'WIPE_EVERYTHING',
        user_id: userId,
        ip_address: ip,
        timestamp: new Date().toISOString()
      }, 'Database wipe initiated');

      // Count items before deletion
      const matterCount = mattersDb.getAll().length;
      const adminCount = adminUsersDb.getAll().length;
      const sessionCount = adminSessionsDb.getAll().length;

      // Delete all data - this must be atomic
      // 1. Delete all matters
      const matters = mattersDb.getAll();
      for (const matter of matters) {
        mattersDb.delete(matter.id);
      }

      // 2. Delete all admin sessions
      const sessions = adminSessionsDb.getAll();
      for (const session of sessions) {
        adminSessionsDb.invalidate(session.token_jti);
      }

      // 3. Delete ALL admin users (including current user)
      adminUsersDb.deleteAll();

      // 4. Invalidate all bootstrap tokens
      adminBootstrapTokensDb.invalidateAll();

      // 5. Create a new bootstrap token for fresh setup
      const bootstrapToken = generateBootstrapToken();
      const tokenHash = hashBootstrapToken(bootstrapToken);
      const expiresAt = getBootstrapTokenExpiration(60); // 60 minutes
      adminBootstrapTokensDb.create(tokenHash, expiresAt, ip);

      // 6. Reset all settings to defaults (fresh install state)
      for (const [key, value] of Object.entries(DEFAULT_APP_SETTINGS)) {
        settingsDb.set(key, value);
      }
      // Set dynamic defaults
      settingsDb.set('last_matter_date', new Date().toISOString());
      settingsDb.set('drain_start_time', new Date().toISOString());

      fastify.log.info({
        action: 'WIPE_EVERYTHING_COMPLETE',
        matters_deleted: matterCount,
        admins_deleted: adminCount,
        sessions_invalidated: sessionCount,
        bootstrap_token_created: true
      }, 'Database wipe completed successfully');

      // Note: Audit log won't persist since user is deleted, but log anyway for consistency
      logInfo({
        userId,
        username,
        actionType: ACTION_TYPES.DATA_WIPE,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: 'Full database wipe performed',
        details: {
          matters_deleted: matterCount,
          admins_deleted: adminCount,
          sessions_invalidated: sessionCount,
          scope: 'everything'
        },
        ipAddress: ip
      });

      return {
        success: true,
        message: 'All data has been wiped successfully. Database reset to fresh install state.',
        matters_deleted: matterCount,
        admins_deleted: adminCount,
        sessions_invalidated: sessionCount,
        settings_reset: true,
        bootstrap_token: bootstrapToken,
        bootstrap_url: `/admin/bootstrap.html?token=${bootstrapToken}`
      };
    } catch (error) {
      logError({
        error,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: 'Failed to perform full database wipe',
        ipAddress: ip
      });
      fastify.log.error({
        action: 'WIPE_EVERYTHING_FAILED',
        error: error.message
      }, 'Database wipe failed');

      return reply.code(500).send({
        error: 'SERVER_ERROR',
        message: `Failed to wipe data: ${error.message}`
      });
    }
  });

  // ============ AUDIT LOG API ============

  // Get audit log entries (paginated)
  fastify.get('/admin/api/audit-log', { preHandler: adminAuthMiddleware }, async (request) => {
    const {
      page = 1,
      limit = 50,
      level,
      userId,
      entityType,
      entityId
    } = request.query;

    const result = auditLogDb.getAll({
      page: parseInt(page),
      limit: Math.min(parseInt(limit) || 50, 100), // Max 100 per page
      level,
      userId: userId ? parseInt(userId) : null,
      entityType,
      entityId: entityId ? parseInt(entityId) : null
    });

    return result;
  });

  // Get single audit log entry
  fastify.get('/admin/api/audit-log/:id', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { id } = request.params;

    const entry = auditLogDb.getById(parseInt(id));
    if (!entry) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Audit log entry not found' });
    }

    return { entry };
  });

  // Expose database instances for testing
  fastify.db = {
    mattersDb,
    settingsDb,
    adminUsersDb,
    adminSessionsDb,
    adminBootstrapTokensDb,
    auditLogDb
  };

  return fastify;
}

// ============ START SERVER (only if run directly) ============

// Check if this file is being run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '0.0.0.0';

  const fastify = await createServer();

  try {
    await fastify.listen({ port: PORT, host: HOST });

    const ALLOWED_IPS = process.env.ALLOWED_IPS?.split(',').map(ip => ip.trim()) || [];
    const API_KEY = process.env.API_KEY || null;
    const REQUIRE_AUTH = process.env.REQUIRE_AUTH === 'true';

    // Read version from VERSION file
  const versionPath = join(__dirname, '..', 'VERSION');
  let version = '0.1.0';
  try {
    version = readFileSync(versionPath, 'utf8').trim();
  } catch (err) {
    // Ignore if VERSION file doesn't exist
  }

  // Check if bootstrap is needed (fresh DB with no active admins)
  const { adminUsersDb, adminBootstrapTokensDb } = fastify.db;
  const activeAdmins = adminUsersDb.getAll().filter(u => u.is_active);
  const needsBootstrap = activeAdmins.length === 0;

  let bootstrapInfo = '';
  if (needsBootstrap) {
    // Generate bootstrap token if needed
    const { generateBootstrapToken, hashBootstrapToken, getBootstrapTokenExpiration } = await import('./auth.js');
    const token = generateBootstrapToken();
    const tokenHash = hashBootstrapToken(token);
    const expiresAt = getBootstrapTokenExpiration(60); // 60 minutes

    adminBootstrapTokensDb.create(tokenHash, expiresAt);

    const bootstrapUrl = `http://localhost:${PORT}/admin/bootstrap.html?token=${token}`;

    bootstrapInfo = `
╔════════════════════════════════════════════════════════════════╗
║  ⚠️  FIRST-TIME SETUP REQUIRED                                 ║
╚════════════════════════════════════════════════════════════════╝

  No active admin users found. Use the one-time bootstrap link below
  to create your initial admin account:

  🔐 Bootstrap URL (expires in 60 minutes):
  ${bootstrapUrl}

  ⚠️  This link can only be used once and will expire.
  ⚠️  Keep this link secure - anyone with it can create an admin account.

`;
  }

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  LEGAL MATTER v${version.padEnd(48)} ║
║  SERVER ONLINE                                                 ║
╚════════════════════════════════════════════════════════════════╝

  → Local:    http://localhost:${PORT}
  → Network:  http://${HOST}:${PORT}

  Auth Required: ${REQUIRE_AUTH}
  Allowed IPs:   ${ALLOWED_IPS.length > 0 ? ALLOWED_IPS.join(', ') : '(none configured)'}
  API Key:       ${API_KEY ? '(configured)' : '(not set)'}
  ${bootstrapInfo}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
