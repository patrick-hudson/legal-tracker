/**
 * API key management routes
 * CRUD for user API keys with scope-based access control
 */

import { generateUserApiKey, getApiKeyPrefix, hashApiKey } from '../auth.js';
import { logInfoFromRequest, ACTION_TYPES } from '../audit.js';

/**
 * Register API key routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts - Contains apiKeysDb, adminAuthMiddleware
 */
export default async function apiKeyRoutes(fastify, opts) {
  const { apiKeysDb, adminAuthMiddleware } = opts;

  // List all API keys (for admin view - never returns full key or hash)
  fastify.get('/admin/api/api-keys', { preHandler: adminAuthMiddleware }, async () => {
    const keys = apiKeysDb.getAll();
    const usageStats = apiKeysDb.getUsageStats();
    // Parse scopes for each key and add display name + usage stats
    const { getScopesDisplayName } = await import('../scopes.js');
    const keysWithDisplay = keys.map(key => {
      let scopes = ['admin:full'];
      try {
        if (key.scopes) {
          scopes = JSON.parse(key.scopes);
        }
      } catch {
        // Default to admin:full if parsing fails
      }
      const keyStats = usageStats[key.id] || { total_requests: 0, last_24h: 0, last_7d: 0, last_30d: 0 };
      return {
        ...key,
        scopes,
        scopes_display: getScopesDisplayName(scopes),
        usage: keyStats
      };
    });
    return { keys: keysWithDisplay };
  });

  // Get available scopes and presets for API key creation
  fastify.get('/admin/api/api-keys/scopes', { preHandler: adminAuthMiddleware }, async () => {
    const { SCOPES, SCOPE_PRESETS, getScopesGrouped } = await import('../scopes.js');
    return {
      scopes: SCOPES,
      presets: SCOPE_PRESETS,
      grouped: getScopesGrouped()
    };
  });

  // Create a new API key
  fastify.post('/admin/api/api-keys', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { name, expires_in_days, scopes, preset } = request.body || {};

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Name is required'
      });
    }

    if (name.length > 100) {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Name must be 100 characters or less'
      });
    }

    // Determine scopes to use
    let finalScopes = ['admin:full']; // Default to full access

    if (preset) {
      // Use preset scopes
      const { expandPreset, SCOPE_PRESETS } = await import('../scopes.js');
      const presetScopes = expandPreset(preset);
      if (!presetScopes) {
        return reply.code(400).send({
          error: 'BAD_REQUEST',
          message: `Invalid preset: ${preset}. Valid presets: ${Object.keys(SCOPE_PRESETS).join(', ')}`
        });
      }
      finalScopes = presetScopes;
    } else if (scopes && Array.isArray(scopes) && scopes.length > 0) {
      // Use custom scopes
      const { validateScopes } = await import('../scopes.js');
      const validation = validateScopes(scopes);
      if (!validation.valid) {
        return reply.code(400).send({
          error: 'BAD_REQUEST',
          message: `Invalid scopes: ${validation.invalid.join(', ')}`
        });
      }
      finalScopes = scopes;
    }

    // Calculate expiration if provided
    let expiresAt = null;
    if (expires_in_days && typeof expires_in_days === 'number' && expires_in_days > 0) {
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + expires_in_days);
      expiresAt = expiration.toISOString();
    }

    // Generate the API key
    const fullKey = generateUserApiKey();
    const keyPrefix = getApiKeyPrefix(fullKey);
    const keyHash = await hashApiKey(fullKey);

    // Create the key in database
    const { id } = apiKeysDb.create(
      request.adminUser.id,
      name.trim(),
      keyPrefix,
      keyHash,
      expiresAt,
      finalScopes
    );

    // Get display name for scopes
    const { getScopesDisplayName } = await import('../scopes.js');
    const scopesDisplay = getScopesDisplayName(finalScopes);

    // Log the creation
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.CREATE,
      entityType: 'api_key',
      entityId: id,
      summary: `Created API key "${name.trim()}" with ${scopesDisplay}`,
      details: {
        key_name: name.trim(),
        key_prefix: keyPrefix,
        expires_at: expiresAt,
        scopes: finalScopes,
        scopes_display: scopesDisplay
      }
    });

    // Return the full key - this is the ONLY time it will be shown
    return reply.code(201).send({
      success: true,
      key: {
        id,
        name: name.trim(),
        key: fullKey, // Full key shown only on creation
        key_prefix: keyPrefix,
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
        scopes: finalScopes,
        scopes_display: scopesDisplay
      }
    });
  });

  // Revoke an API key
  fastify.delete('/admin/api/api-keys/:id', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { id } = request.params;
    const keyId = parseInt(id, 10);

    if (isNaN(keyId)) {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Invalid key ID'
      });
    }

    const key = apiKeysDb.getById(keyId);
    if (!key) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'API key not found'
      });
    }

    if (key.revoked_at) {
      return reply.code(400).send({
        error: 'ALREADY_REVOKED',
        message: 'API key is already revoked'
      });
    }

    apiKeysDb.revoke(keyId);

    // Log the revocation
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.DELETE,
      entityType: 'api_key',
      entityId: keyId,
      summary: `Revoked API key "${key.name}"`,
      details: {
        key_name: key.name,
        key_prefix: key.key_prefix
      }
    });

    return { success: true };
  });
}
