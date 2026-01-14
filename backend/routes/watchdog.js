/**
 * Watchdog proxy routes
 * Proxies requests to the watchdog process manager
 */

import { logSecurityFromRequest } from '../audit.js';
import { ACTION_TYPES, ENTITY_TYPES } from '../audit.js';

/**
 * Register watchdog proxy routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts - Contains adminAuthMiddleware, watchdogUrl
 */
export default async function watchdogRoutes(fastify, opts) {
  const { adminAuthMiddleware, watchdogUrl, watchdogApiKey } = opts;

  // Get watchdog status
  fastify.get('/admin/api/watchdog/status', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${watchdogUrl}/status`, {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return reply.code(response.status).send({ error: 'Watchdog error' });
      }

      const data = await response.json();
      return { ...data, watchdogRunning: true };
    } catch (err) {
      // Watchdog not running or unreachable
      return {
        watchdogRunning: false,
        running: true, // Server is running (we're responding)
        message: 'Watchdog not running - server started directly'
      };
    }
  });

  // Trigger server restart via watchdog
  fastify.post('/admin/api/watchdog/restart', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { reason } = request.body || {};

    // Log the restart request BEFORE sending to watchdog (so it persists before restart)
    logSecurityFromRequest(request, {
      actionType: ACTION_TYPES.SETTINGS_CHANGE,
      entityType: ENTITY_TYPES.SYSTEM,
      summary: `Server restart requested: ${reason || 'admin_request'}`,
      details: { reason: reason || 'admin_request' }
    });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${watchdogUrl}/restart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': watchdogApiKey
        },
        body: JSON.stringify({ reason: reason || 'admin_request' }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return reply.code(response.status).send({ error: err.error || 'Watchdog error' });
      }

      return await response.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        return reply.code(503).send({
          error: 'WATCHDOG_UNAVAILABLE',
          message: 'Watchdog not running or unreachable'
        });
      }
      return reply.code(503).send({
        error: 'WATCHDOG_UNAVAILABLE',
        message: 'Watchdog not running - cannot restart server'
      });
    }
  });

  // Get pending file changes from watchdog
  fastify.get('/admin/api/watchdog/changes', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${watchdogUrl}/changes`, {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return reply.code(response.status).send({ error: 'Watchdog error' });
      }

      return await response.json();
    } catch (err) {
      return reply.code(503).send({
        error: 'WATCHDOG_UNAVAILABLE',
        message: 'Watchdog not running'
      });
    }
  });
}
