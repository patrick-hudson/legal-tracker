import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyJWT from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { createDatabase } from './db.js';
import { hashPassword, verifyPassword, generateTokenId, generateApiKey, createAdminAuthMiddleware, getTokenExpiration, generateBootstrapToken, hashBootstrapToken, getBootstrapTokenExpiration, validatePasswordStrength } from './auth.js';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Initialize __filename and __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
 * @returns {Object} Fastify server instance
 */
export async function createServer(options = {}) {
  const {
    logger = true,
    dbPath,
    requireAuth = process.env.REQUIRE_AUTH === 'true',
    allowedIPs = process.env.ALLOWED_IPS?.split(',').map(ip => ip.trim()) || [],
    apiKey = process.env.API_KEY || null,
    corsOrigin = process.env.CORS_ORIGIN || true
  } = options;

  // Create database instance
  const { settingsDb, mattersDb, adminUsersDb, adminSessionsDb, adminBootstrapTokensDb } = await createDatabase(dbPath);

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
  await fastify.register(rateLimit, {
    global: false, // Don't apply globally, only to specific routes
    max: 100, // Max requests per time window
    timeWindow: '1 minute'
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
    reply.header('Content-Security-Policy', "default-src 'self'; script-src 'self' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';");

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
    decorateReply: false
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

  // Get current status (main dashboard data)
  fastify.get('/api/status', async (request) => {
    const settings = settingsDb.getAll();
    const stats = mattersDb.getStats();
    const matters = mattersDb.getAll();

    const lastMatterDate = new Date(settings.last_matter_date || Date.now());
    const now = new Date();
    const daysSince = Math.floor((now - lastMatterDate) / (1000 * 60 * 60 * 24));

    // Calculate accumulated drain since drain_start_time
    const drainEnabled = settings.drain_enabled === 'true';
    const drainRateCents = parseInt(settings.drain_rate_cents || '50');
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
      drain_rate_cents: drainRateCents,
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
  fastify.post('/api/settings/drain', { preHandler: authMiddleware }, async (request) => {
    const { enabled, rate_cents } = request.body || {};

    if (enabled !== undefined) {
      settingsDb.set('drain_enabled', enabled ? 'true' : 'false');
    }

    if (rate_cents !== undefined) {
      const cents = parseInt(rate_cents);
      if (isNaN(cents) || cents < 0) {
        return { error: 'BAD_REQUEST', message: 'Invalid rate_cents value' };
      }
      settingsDb.set('drain_rate_cents', String(cents));
    }

    // Reset drain start time when changing drain settings
    settingsDb.set('drain_start_time', new Date().toISOString());

    return {
      success: true,
      drain_enabled: settingsDb.get('drain_enabled') === 'true',
      drain_rate_cents: parseInt(settingsDb.get('drain_rate_cents'))
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
      return reply.type('application/javascript').send(js);
    } catch (error) {
      fastify.log.warn({ file: request.params.file, error: error.message }, 'Static file access denied');
      return reply.code(404).send({ error: 'File not found' });
    }
  });

  fastify.get('/admin/js/components/:file', async (request, reply) => {
    try {
      const js = serveStaticFile('js/components', request.params.file);
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

    if (!token || !username || !hashedPassword) {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Token, username, and password are required'
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
    if (!user) {
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' });
    }

    // Check if user is active
    if (!user.is_active) {
      return reply.code(401).send({ error: 'USER_INACTIVE', message: 'User account is not active' });
    }

    // Verify hashed password (server stores bcrypt(hashedPassword))
    const validPassword = await verifyPassword(hashedPassword, user.password_hash);
    if (!validPassword) {
      return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' });
    }

    // Create session
    const jti = generateTokenId();
    const expiration = getTokenExpiration(7); // 7 days
    const clientIP = getClientIP(request);
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
  fastify.post('/admin/api/auth/logout', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const jti = request.user.jti;
    adminSessionsDb.invalidate(jti);

    reply.clearCookie('admin_token', { path: '/' });

    return { success: true, message: 'Logged out successfully' };
  });

  // Get current admin user
  fastify.get('/admin/api/auth/me', { preHandler: adminAuthMiddleware }, async (request) => {
    return {
      user: request.adminUser
    };
  });

  // Change password
  fastify.post('/admin/api/auth/change-password', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body || {};

    if (!currentPassword || !newPassword) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Current and new password required' });
    }

    if (newPassword.length < 8) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Password must be at least 8 characters' });
    }

    const user = adminUsersDb.getById(request.adminUser.id);
    const validPassword = await verifyPassword(currentPassword, user.password_hash);

    if (!validPassword) {
      return reply.code(401).send({ error: 'INVALID_PASSWORD', message: 'Current password is incorrect' });
    }

    const newHash = await hashPassword(newPassword);
    adminUsersDb.updatePassword(request.adminUser.id, newHash);

    return { success: true, message: 'Password changed successfully' };
  });

  // Dashboard stats
  fastify.get('/admin/api/dashboard', { preHandler: adminAuthMiddleware }, async () => {
    const settings = settingsDb.getAll();
    const stats = mattersDb.getStats();
    const matters = mattersDb.getAll();

    const lastMatterDate = new Date(settings.last_matter_date || Date.now());
    const now = new Date();
    const daysSince = Math.floor((now - lastMatterDate) / (1000 * 60 * 60 * 24));

    const drainEnabled = settings.drain_enabled === 'true';
    const drainRateCents = parseInt(settings.drain_rate_cents || '50');
    const baseSpent = parseFloat(settings.lifetime_spent || '0');

    return {
      days_since: daysSince,
      last_matter_date: settings.last_matter_date,
      lifetime_spent: baseSpent,
      drain_enabled: drainEnabled,
      drain_rate_cents: drainRateCents,
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

    // Convert costs from cents to dollars for output
    const mattersInDollars = paginatedMatters.map(inc => ({
      ...inc,
      cost: inc.cost / 100 // Convert cents to dollars
    }));

    return {
      matters: mattersInDollars,
      total: matters.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(matters.length / limit)
    };
  });

  // Add single matter
  fastify.post('/admin/api/matters', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { matter_date, note, cost } = request.body || {};

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
        costCents
      );

      // Update last matter date
      settingsDb.set('last_matter_date', matterDate.toISOString());

      // Update lifetime spent (stored in cents)
      if (costCents) {
        const currentSpentCents = parseFloat(settingsDb.get('lifetime_spent') || '0');
        settingsDb.set('lifetime_spent', currentSpentCents + costCents);
      }

      reply.code(201);
      return {
        success: true,
        matter: result
      };
    } catch (error) {
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

    return { success: true, deleted };
  });

  // Export matters as CSV
  fastify.get('/admin/api/matters/export', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const matters = mattersDb.getAll();

    let csv = 'id,matter_date,note,days_since,cost,created_at\n';
    for (const matter of matters) {
      csv += `${matter.id},"${matter.matter_date}","${(matter.note || '').replace(/"/g, '""')}",${matter.days_since || 0},${matter.cost || 0},"${matter.created_at}"\n`;
    }

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="matters-${new Date().toISOString().split('T')[0]}.csv"`);

    return csv;
  });

  // Get all settings
  fastify.get('/admin/api/settings', { preHandler: adminAuthMiddleware }, async () => {
    const settings = settingsDb.getAll();
    return { settings };
  });

  // Update setting
  fastify.put('/admin/api/settings/:key', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { key } = request.params;
    const { value } = request.body || {};

    if (value === undefined) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Value required' });
    }

    settingsDb.set(key, value);

    return { success: true, key, value };
  });

  // Generate new API key
  fastify.post('/admin/api/settings/api-key/generate', { preHandler: adminAuthMiddleware }, async () => {
    const newApiKey = generateApiKey();
    settingsDb.set('api_key', newApiKey);

    return { success: true, api_key: newApiKey };
  });

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

  // Populate sample data from file or generate new
  fastify.post('/admin/api/data/populate-sample', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    try {
      const { source, count } = request.body || {};
      let sampleMatters = [];

      if (source && source !== 'generate') {
        // Load from file
        const samplesDir = join(__dirname, 'samples');
        const filePath = join(samplesDir, `${source}.json`);

        try {
          const fileContent = readFileSync(filePath, 'utf-8');
          const data = JSON.parse(fileContent);
          sampleMatters = data.matters || [];
        } catch (err) {
          return reply.code(404).send({
            error: 'NOT_FOUND',
            message: `Sample file '${source}' not found`
          });
        }
      } else {
        // Generate new sample data
        const matterCount = count || 25;
        const now = new Date();
        const twoYearsAgo = new Date(now);
        twoYearsAgo.setFullYear(now.getFullYear() - 2);

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
          { note: 'Shareholder agreement', cost: 500000 }
        ];

        for (let i = 0; i < matterCount; i++) {
          const randomDate = new Date(
            twoYearsAgo.getTime() + Math.random() * (now.getTime() - twoYearsAgo.getTime())
          );
          const randomMatter = matterTypes[Math.floor(Math.random() * matterTypes.length)];

          sampleMatters.push({
            matter_date: randomDate.toISOString(),
            note: randomMatter.note,
            cost: randomMatter.cost
          });
        }

        // Sort by date (oldest first)
        sampleMatters.sort((a, b) => new Date(a.matter_date) - new Date(b.matter_date));
      }

      // Add matters to database
      let totalCost = 0;
      const initialLastDate = settingsDb.get('last_matter_date');
      let lastDate = new Date(initialLastDate || sampleMatters[0]?.matter_date || Date.now());

      for (const matter of sampleMatters) {
        const matterDate = new Date(matter.matter_date);
        const daysSince = Math.floor((matterDate - lastDate) / (1000 * 60 * 60 * 24));

        mattersDb.add(
          matter.matter_date,
          matter.note,
          Math.max(0, daysSince),
          matter.cost
        );

        totalCost += matter.cost;
        lastDate = matterDate;
      }

      // Update settings
      const currentSpent = parseFloat(settingsDb.get('lifetime_spent') || '0');
      settingsDb.set('lifetime_spent', currentSpent + totalCost);
      settingsDb.set('last_matter_date', sampleMatters[sampleMatters.length - 1].matter_date);

      return {
        success: true,
        message: source ? `Loaded ${sampleMatters.length} matters from ${source}` : `Generated ${sampleMatters.length} sample matters`,
        matters_added: sampleMatters.length,
        total_cost_added: totalCost / 100,
        source: (source === 'generate' || !source) ? 'generated' : source
      };
    } catch (error) {
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
      const userId = request.adminUser?.id || 'unknown';
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
      settingsDb.set('lifetime_spent', '0');
      settingsDb.set('last_matter_date', new Date().toISOString());
      settingsDb.set('drain_start_time', new Date().toISOString());
      settingsDb.set('drain_rate_cents', '50');
      settingsDb.set('drain_enabled', 'true');

      fastify.log.info({
        action: 'WIPE_EVERYTHING_COMPLETE',
        matters_deleted: matterCount,
        admins_deleted: adminCount,
        sessions_invalidated: sessionCount,
        bootstrap_token_created: true
      }, 'Database wipe completed successfully');

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

  // Expose database instances for testing
  fastify.db = {
    mattersDb,
    settingsDb,
    adminUsersDb,
    adminSessionsDb,
    adminBootstrapTokensDb
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
