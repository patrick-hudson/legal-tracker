/**
 * Legal Matter Tracker - Server Entry Point
 * Main Fastify server with route registration
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyJWT from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fastifyMultipart from '@fastify/multipart';
import { createDatabase } from './db/index.js';
import { initAudit, logInfo, logError, logWarning, logSecurity, logInfoFromRequest, logErrorFromRequest, logSecurityFromRequest, logWarningFromRequest, logDebugFromRequest, getUserContext, callClaudeWithLogging, ACTION_TYPES, ENTITY_TYPES } from './audit.js';
import { hashPassword, verifyPassword, generateTokenId, createHybridAuthMiddleware, getTokenExpiration, generateBootstrapToken, hashBootstrapToken, getBootstrapTokenExpiration, generateUserApiKey, getApiKeyPrefix, hashApiKey, autoRequireScope } from './auth.js';
import { createStorage, createStorageFromConfig, createStorageForBackend, validateFileType, sanitizeFilename, MAX_FILE_SIZE } from './storage.js';
import { generateLegalDocument, generatePlaceholderDocument } from './legal-docs.js';
import * as sampleTemplates from './sample-templates.js';
import { DEFAULT_APP_SETTINGS, INPUT_LIMITS, CACHE_TTL_MS } from './lib/constants.js';
import { validateStringLength } from './lib/validation.js';
import { getClientIP } from './lib/helpers.js';
import registerRoutes from './routes/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
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

// Load environment variables from .env file in backend directory
dotenv.config({ path: join(__dirname, '.env') });

/**
 * Create and configure a Fastify server instance
 * @param {Object} options - Configuration options
 * @param {boolean} options.logger - Enable logging (default: true)
 * @param {string} options.dbPath - Database file path (default: data/tracker.db)
 * @param {boolean} options.disableRateLimit - Disable rate limiting (default: false, useful for tests)
 * @returns {Object} Fastify server instance
 */
export async function createServer(options = {}) {
  const {
    logger = true,
    dbPath,
    corsOrigin = process.env.CORS_ORIGIN || true,
    disableRateLimit = false
  } = options;

  // Create database instance
  const { db, settingsDb, mattersDb, adminUsersDb, adminSessionsDb, adminBootstrapTokensDb, apiKeysDb, privateNotesDb, attachmentsDb, auditLogDb, saveDatabase, resetAllSequences } = await createDatabase(dbPath);

  // Initialize audit logging service
  initAudit({ auditLogDb, settingsDb });

  const fastify = Fastify({
    logger,
    trustProxy: true // Important for getting real IP behind reverse proxy
  });

  // Configuration
  const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production-' + Math.random();
  const PASSWORD_SALT = process.env.PASSWORD_SALT || 'legal-tracker-default-CHANGE-THIS';
  const COOKIE_SECURE = process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';
  const REQUIRE_AUTH = process.env.REQUIRE_AUTH === 'true';

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

  // Global error handler - log all route errors to audit log
  fastify.setErrorHandler((error, request, reply) => {
    // Log the error to audit log
    logErrorFromRequest(request, {
      error,
      entityType: ENTITY_TYPES.SYSTEM,
      summary: `Route error: ${error.message}`,
      details: {
        url: request.url,
        method: request.method,
        statusCode: error.statusCode || 500
      }
    });

    // Send the error response (preserve original behavior)
    reply.status(error.statusCode || 500).send({
      error: error.code || 'INTERNAL_ERROR',
      message: error.message
    });
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

  // Create admin auth middleware (hybrid: supports both API keys and JWT sessions)
  const adminAuthMiddleware = createHybridAuthMiddleware(adminSessionsDb, adminUsersDb, apiKeysDb);

  // Create scope validation middleware (auto-detects required scope from route)
  const scopeMiddleware = autoRequireScope();

  // Add scope validation hook for all admin API routes (runs after auth middleware)
  fastify.addHook('preHandler', async (request, reply) => {
    // Only check scopes for authenticated admin API requests
    if (!request.url.startsWith('/admin/api/')) return;
    if (!request.adminUser) return; // Not authenticated yet or public route

    // Run scope validation
    await scopeMiddleware(request, reply);
  });

  // API request logging hooks (only logs when setting is enabled and level is DEBUG)
  // Capture request body before processing
  fastify.addHook('preHandler', async (request) => {
    // Only for admin API requests
    if (!request.url.startsWith('/admin/api/')) return;

    // Store the request body for later logging (if it exists and isn't a file upload)
    if (request.body && typeof request.body === 'object' && !request.isMultipart) {
      // Sanitize sensitive fields from body
      const sanitizedBody = { ...request.body };
      const sensitiveFields = ['password', 'hashedPassword', 'apiKey', 'api_key', 'secret', 'token'];
      for (const field of sensitiveFields) {
        if (sanitizedBody[field]) {
          sanitizedBody[field] = '[REDACTED]';
        }
      }
      request.logBody = sanitizedBody;
    }
  });

  // Log after response is sent
  fastify.addHook('onResponse', async (request, reply) => {
    // Only log admin API requests (not public routes, not static files)
    if (!request.url.startsWith('/admin/api/')) return;

    // Skip certain noisy endpoints
    const skipEndpoints = ['/admin/api/auth/validate', '/admin/api/watchdog/status'];
    if (skipEndpoints.some(ep => request.url.startsWith(ep))) return;

    // Only log if user is authenticated (request.adminUser is set by middleware)
    if (!request.adminUser) return;

    // Build request details (shared by both API key and debug logging)
    const requestDetails = {
      method: request.method,
      url: request.url
    };
    if (Object.keys(request.query || {}).length > 0) {
      requestDetails.query = request.query;
    }
    if (request.logBody && Object.keys(request.logBody).length > 0) {
      requestDetails.body = request.logBody;
    }

    const isApiKeyAuth = request.authMethod === 'api-key';
    const logApiRequests = settingsDb.get('log_api_requests') === 'true';

    // API Key requests: ALWAYS log at INFO level (external API access audit trail)
    if (isApiKeyAuth) {
      const level = reply.statusCode >= 500 ? 'ERROR' : reply.statusCode >= 400 ? 'WARNING' : 'INFO';
      const logFn = level === 'ERROR' ? logErrorFromRequest : level === 'WARNING' ? logWarningFromRequest : logInfoFromRequest;

      logFn(request, {
        actionType: 'api_request',
        entityType: 'api',
        summary: `API Key: ${request.method} ${request.url} -> ${reply.statusCode}`,
        durationMs: reply.elapsedTime ? Math.round(reply.elapsedTime) : null,
        details: {
          method: request.method,
          path: request.url,
          query: Object.keys(request.query || {}).length > 0 ? request.query : undefined,
          statusCode: reply.statusCode,
          auth_method: 'api-key',
          api_key_id: request.apiKeyId,
          api_key_name: request.apiKeyName
        }
      });
    }

    // Debug logging: Log ALL authenticated API responses when debug mode is on
    // This provides full visibility into API usage regardless of auth method
    if (logApiRequests) {
      logDebugFromRequest(request, {
        actionType: ACTION_TYPES.API_CALL,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: `${request.method} ${request.url} -> ${reply.statusCode}`,
        durationMs: reply.elapsedTime ? Math.round(reply.elapsedTime) : null,
        request: requestDetails,
        response: {
          statusCode: reply.statusCode
        },
        details: {
          auth_method: request.authMethod || 'session',
          api_key_id: request.apiKeyId,
          api_key_name: request.apiKeyName
        }
      });
    }
  });

  // ============ ROUTE REGISTRATION ============

  // Build route options object with all dependencies
  const routeOpts = {
    // Database instances
    db,
    settingsDb,
    mattersDb,
    adminUsersDb,
    adminSessionsDb,
    adminBootstrapTokensDb,
    apiKeysDb,
    privateNotesDb,
    attachmentsDb,
    auditLogDb,
    saveDatabase,
    resetAllSequences,

    // Middleware
    adminAuthMiddleware,

    // Configuration
    cookieSecure: COOKIE_SECURE,
    passwordSalt: PASSWORD_SALT,
    requireAuth: REQUIRE_AUTH,

    // Storage
    storage: createStorage,
    createStorageFromConfig,
    createStorageForBackend,
    validateFileType,
    sanitizeFilename,
    MAX_FILE_SIZE,

    // Auth utilities
    hashPassword,
    verifyPassword,
    generateTokenId,
    getTokenExpiration,
    generateBootstrapToken,
    hashBootstrapToken,
    getBootstrapTokenExpiration,
    generateUserApiKey,
    getApiKeyPrefix,
    hashApiKey,

    // Document generation
    generateLegalDocument,
    generatePlaceholderDocument,

    // Sample data templates
    sampleTemplates,

    // Constants
    DEFAULT_APP_SETTINGS,
    INPUT_LIMITS,
    CACHE_TTL_MS,

    // Validation
    validateStringLength,

    // Helpers
    getClientIP,

    // Audit logging
    logInfo,
    logError,
    logWarning,
    logSecurity,
    logInfoFromRequest,
    logErrorFromRequest,
    logSecurityFromRequest,
    logWarningFromRequest,
    logDebugFromRequest,
    getUserContext,
    callClaudeWithLogging,
    ACTION_TYPES,
    ENTITY_TYPES,

    // Shared state for caching (used by public routes)
    commitPushCache,
    execAsync
  };

  // Register all routes
  await fastify.register(registerRoutes, routeOpts);

  // ============ DATABASE EXPOSURE & FASTIFY DECORATIONS ============

  // Expose database instances for testing and graceful shutdown
  fastify.db = {
    db,
    mattersDb,
    settingsDb,
    adminUsersDb,
    adminSessionsDb,
    adminBootstrapTokensDb,
    privateNotesDb,
    attachmentsDb,
    auditLogDb,
    saveDatabase,
    resetAllSequences
  };

  return fastify;
}

// ============ START SERVER (only if run directly) ============

// Check if this file is being run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '0.0.0.0';

  const fastify = await createServer();

  // Process-level exception handlers
  process.on('uncaughtException', (error) => {
    logError({
      error,
      entityType: ENTITY_TYPES.SYSTEM,
      summary: `Uncaught exception: ${error.message}`
    });
    fastify.log.error(error, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logError({
      error,
      entityType: ENTITY_TYPES.SYSTEM,
      summary: `Unhandled promise rejection: ${error.message}`
    });
    fastify.log.error(error, 'Unhandled rejection');
  });

  // Graceful shutdown handlers - ensure database is saved before exit
  let isShuttingDown = false;
  const gracefulShutdown = (signal) => {
    // Prevent multiple shutdown attempts
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`[server] Received ${signal}, shutting down gracefully...`);

    // Save database synchronously before anything else
    if (fastify.db?.saveDatabase) {
      try {
        fastify.db.saveDatabase();
        console.log('[server] Database saved');
      } catch (err) {
        console.error('[server] Error saving database:', err);
      }
    }

    // Close server (async but we'll exit after a timeout regardless)
    // Use shorter timeout since watchdog will force kill after 5s anyway
    fastify.close().then(() => {
      console.log('[server] Server closed');
      process.exit(0);
    }).catch((err) => {
      console.error('[server] Error during shutdown:', err);
      process.exit(1);
    });

    // Force exit after 3 seconds if close() hangs
    // This gives us time to exit cleanly before watchdog's 5s force kill
    setTimeout(() => {
      console.log('[server] Forcing exit after timeout');
      process.exit(0);
    }, 3000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

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
