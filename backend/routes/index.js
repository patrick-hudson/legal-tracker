/**
 * Route registration orchestrator
 * Registers all route modules with the Fastify instance
 */

import publicRoutes from './public.js';
import adminStaticRoutes from './admin-static.js';
import watchdogRoutes from './watchdog.js';
import bootstrapRoutes from './bootstrap.js';
import authRoutes from './auth.js';
import matterRoutes from './matters.js';
import noteRoutes from './notes.js';
import attachmentRoutes from './attachments.js';
import settingsRoutes from './settings.js';
import userRoutes from './users.js';
import apiKeyRoutes from './api-keys.js';
import sampleDataRoutes from './sample-data.js';
import wipeRoutes from './wipe.js';
import backupRoutes from './backup.js';
import auditLogRoutes from './audit-log.js';

/**
 * Register all routes with the Fastify instance
 * @param {import('fastify').FastifyInstance} fastify - Fastify instance
 * @param {Object} opts - Route options containing database instances and middleware
 */
export default async function registerRoutes(fastify, opts) {
  // Public routes (no auth)
  await fastify.register(publicRoutes, opts);

  // Admin portal static files
  await fastify.register(adminStaticRoutes, opts);

  // Watchdog proxy routes
  await fastify.register(watchdogRoutes, opts);

  // Bootstrap routes (no auth, special case)
  await fastify.register(bootstrapRoutes, opts);

  // Auth routes
  await fastify.register(authRoutes, opts);

  // Authenticated admin routes
  await fastify.register(matterRoutes, opts);
  await fastify.register(noteRoutes, opts);
  await fastify.register(attachmentRoutes, opts);
  await fastify.register(settingsRoutes, opts);
  await fastify.register(userRoutes, opts);
  await fastify.register(apiKeyRoutes, opts);
  await fastify.register(sampleDataRoutes, opts);
  await fastify.register(wipeRoutes, opts);
  await fastify.register(backupRoutes, opts);
  await fastify.register(auditLogRoutes, opts);
}
