import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { createDatabase } from './db.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  const { settingsDb, incidentsDb } = await createDatabase(dbPath);

  const fastify = Fastify({
    logger,
    trustProxy: true // Important for getting real IP behind reverse proxy
  });

  // Configuration
  const ALLOWED_IPS = allowedIPs;
  const API_KEY = apiKey;
  const REQUIRE_AUTH = requireAuth;

  // CORS setup
  await fastify.register(cors, {
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  });

  // Serve frontend static files
  await fastify.register(fastifyStatic, {
    root: join(__dirname, '..', 'frontend'),
    prefix: '/'
  });

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

  // Get current status (main dashboard data)
  fastify.get('/api/status', async (request) => {
    const settings = settingsDb.getAll();
    const stats = incidentsDb.getStats();
    const incidents = incidentsDb.getAll();

    const lastIncidentDate = new Date(settings.last_incident_date || Date.now());
    const now = new Date();
    const daysSince = Math.floor((now - lastIncidentDate) / (1000 * 60 * 60 * 24));

    return {
      days_since: daysSince,
      last_incident_date: settings.last_incident_date,
      lifetime_spent: parseFloat(settings.lifetime_spent || '0'),
      stats: {
        total_incidents: stats.total,
        incidents_this_year: stats.thisYear,
        max_streak: Math.max(stats.maxStreak, daysSince)
      },
      your_ip: getClientIP(request),
      auth_required: REQUIRE_AUTH
    };
  });

  // Get all incidents
  fastify.get('/api/incidents', async () => {
    return incidentsDb.getAll();
  });

  // ============ PROTECTED ROUTES (Write operations) ============

  // Log new incident (reset counter)
  fastify.post('/api/incidents', { preHandler: authMiddleware }, async (request, reply) => {
    const { incident_date, note, cost } = request.body || {};

    // Calculate days since last incident
    const settings = settingsDb.getAll();
    const lastIncidentDate = new Date(settings.last_incident_date || Date.now());
    const incidentDateObj = new Date(incident_date || Date.now());
    const daysSince = Math.floor((incidentDateObj - lastIncidentDate) / (1000 * 60 * 60 * 24));

    // Add incident to log
    const result = incidentsDb.add(
      incidentDateObj.toISOString(),
      note || 'No details provided',
      Math.max(0, daysSince),
      parseFloat(cost) || 0
    );

    // Update last incident date
    settingsDb.set('last_incident_date', incidentDateObj.toISOString());

    // Add cost to lifetime spent if provided
    if (cost) {
      const currentSpent = parseFloat(settings.lifetime_spent || '0');
      settingsDb.set('lifetime_spent', currentSpent + parseFloat(cost));
    }

    reply.code(201);
    return {
      success: true,
      id: result.id,
      message: 'Incident logged. The counter has been reset. We believe in you.'
    };
  });

  // Update an incident
  fastify.put('/api/incidents/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params;
    const { incident_date, note, cost } = request.body || {};

    const existing = incidentsDb.getById(id);
    if (!existing) {
      reply.code(404);
      return { error: 'NOT_FOUND', message: 'Incident not found' };
    }

    incidentsDb.update(
      id,
      incident_date || existing.incident_date,
      note || existing.note,
      cost !== undefined ? parseFloat(cost) : existing.cost
    );

    return { success: true, message: 'Incident updated' };
  });

  // Delete an incident
  fastify.delete('/api/incidents/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params;

    const existing = incidentsDb.getById(id);
    if (!existing) {
      reply.code(404);
      return { error: 'NOT_FOUND', message: 'Incident not found' };
    }

    incidentsDb.delete(id);

    // Recalculate last incident date from remaining incidents
    const incidents = incidentsDb.getAll();
    if (incidents.length > 0) {
      settingsDb.set('last_incident_date', incidents[0].incident_date);
    }

    return { success: true, message: 'Incident deleted' };
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

    return {
      success: true,
      lifetime_spent: parseFloat(settingsDb.get('lifetime_spent'))
    };
  });

  // Set last incident date manually
  fastify.post('/api/settings/last-incident-date', { preHandler: authMiddleware }, async (request) => {
    const { date } = request.body || {};

    if (!date) {
      return { error: 'BAD_REQUEST', message: 'Date is required' };
    }

    settingsDb.set('last_incident_date', new Date(date).toISOString());

    return { success: true, last_incident_date: settingsDb.get('last_incident_date') };
  });

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

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  LEGAL INCIDENT TRACKER - SERVER ONLINE                        ║
╚════════════════════════════════════════════════════════════════╝

  → Local:    http://localhost:${PORT}
  → Network:  http://${HOST}:${PORT}

  Auth Required: ${REQUIRE_AUTH}
  Allowed IPs:   ${ALLOWED_IPS.length > 0 ? ALLOWED_IPS.join(', ') : '(none configured)'}
  API Key:       ${API_KEY ? '(configured)' : '(not set)'}
  `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
