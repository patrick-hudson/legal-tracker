/**
 * User management routes
 * CRUD for admin users and session management
 */

import { hashPassword } from '../auth.js';
import { validateStringLength } from '../lib/validation.js';
import { INPUT_LIMITS } from '../lib/constants.js';

/**
 * Register users routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts - Contains adminUsersDb, adminSessionsDb, adminAuthMiddleware
 */
export default async function userRoutes(fastify, opts) {
  const { adminUsersDb, adminSessionsDb, adminAuthMiddleware } = opts;

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
}
