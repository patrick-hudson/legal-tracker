/**
 * Settings routes
 * General settings, storage configuration, drain settings, and AI/Claude settings
 */

import Anthropic from '@anthropic-ai/sdk';
import { logInfoFromRequest, logErrorFromRequest, logWarningFromRequest, logDebugFromRequest, getUserContext, callClaudeWithLogging, ACTION_TYPES, ENTITY_TYPES } from '../audit.js';
import { createStorage, createStorageForBackend, createStorageFromConfig } from '../storage.js';

/**
 * Build the description prompt based on spice level
 */
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

/**
 * Register settings routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts - Contains settingsDb, mattersDb, attachmentsDb, adminAuthMiddleware
 */
export default async function settingsRoutes(fastify, opts) {
  const { settingsDb, mattersDb, attachmentsDb, adminAuthMiddleware } = opts;

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

  // Get storage migration status
  fastify.get('/admin/api/settings/storage/migration', { preHandler: adminAuthMiddleware }, async () => {
    const currentBackend = settingsDb.get('storage_backend') || 'filesystem';
    const { counts, sizes } = attachmentsDb.getCountsByBackend();

    // Check if S3 is configured
    const s3Configured = !!(
      settingsDb.get('s3_access_key_id') &&
      settingsDb.get('s3_secret_access_key') &&
      settingsDb.get('s3_bucket')
    );

    return {
      current_backend: currentBackend,
      filesystem_count: counts.filesystem,
      filesystem_size: sizes.filesystem,
      s3_count: counts.s3,
      s3_size: sizes.s3,
      s3_configured: s3Configured,
      can_migrate_to_s3: currentBackend === 's3' && counts.filesystem > 0 && s3Configured,
      can_migrate_to_filesystem: currentBackend === 'filesystem' && counts.s3 > 0
    };
  });

  // Execute storage migration
  fastify.post('/admin/api/settings/storage/migrate', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { direction, deleteSource = false, archiveSource = false } = request.body || {};
    const userContext = getUserContext(request);

    if (!direction || !['local-to-s3', 's3-to-local'].includes(direction)) {
      return reply.code(400).send({
        error: 'INVALID_DIRECTION',
        message: 'Direction must be "local-to-s3" or "s3-to-local"'
      });
    }

    const sourceBackend = direction === 'local-to-s3' ? 'filesystem' : 's3';
    const targetBackend = direction === 'local-to-s3' ? 's3' : 'filesystem';

    // Get source and target storage instances
    const sourceStorage = createStorageForBackend(sourceBackend, settingsDb);
    const targetStorage = createStorageForBackend(targetBackend, settingsDb);

    if (!sourceStorage) {
      return reply.code(400).send({
        error: 'SOURCE_NOT_CONFIGURED',
        message: `Source storage backend '${sourceBackend}' is not configured`
      });
    }

    if (!targetStorage) {
      return reply.code(400).send({
        error: 'TARGET_NOT_CONFIGURED',
        message: `Target storage backend '${targetBackend}' is not configured`
      });
    }

    // Test target connection
    try {
      const testResult = await targetStorage.testConnection();
      if (!testResult.success) {
        return reply.code(400).send({
          error: 'TARGET_CONNECTION_FAILED',
          message: `Cannot connect to ${targetBackend}: ${testResult.message}`
        });
      }
    } catch (error) {
      return reply.code(400).send({
        error: 'TARGET_CONNECTION_FAILED',
        message: `Cannot connect to ${targetBackend}: ${error.message}`
      });
    }

    // Get attachments to migrate
    const attachments = attachmentsDb.getByBackend(sourceBackend);
    if (attachments.length === 0) {
      return { success: true, migrated: 0, failed: 0, message: 'No attachments to migrate' };
    }

    // Log migration start
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.SYSTEM,
      entityType: ENTITY_TYPES.SYSTEM,
      summary: `Storage migration started: ${direction}`,
      details: { direction, attachmentCount: attachments.length, deleteSource }
    });

    const results = {
      migrated: 0,
      failed: 0,
      errors: []
    };

    // Process each attachment
    for (const attachment of attachments) {
      try {
        // Log migration attempt for this attachment
        logDebugFromRequest(request, {
          actionType: ACTION_TYPES.SYSTEM,
          entityType: ENTITY_TYPES.ATTACHMENT,
          entityId: attachment.id,
          summary: `Migrating attachment: ${attachment.original_filename}`,
          request: { direction, sourceBackend, targetBackend },
          response: { storageKey: attachment.storage_key, sizeBytes: attachment.size_bytes }
        });

        // Read from source
        const { stream, size } = await sourceStorage.getObjectStream(attachment.storage_key, userContext);

        // Convert stream to buffer for re-upload
        const chunks = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Upload to target with same storage key
        await targetStorage.putObjectWithKey(
          attachment.storage_key,
          buffer,
          attachment.content_type,
          userContext
        );

        // Update database record
        attachmentsDb.updateStorageBackend(attachment.id, targetBackend, attachment.storage_key);

        // Log successful migration
        logInfoFromRequest(request, {
          actionType: ACTION_TYPES.UPDATE,
          entityType: ENTITY_TYPES.ATTACHMENT,
          entityId: attachment.id,
          summary: `Attachment migrated: ${attachment.original_filename} (${sourceBackend} -> ${targetBackend})`,
          details: {
            direction,
            filename: attachment.original_filename,
            storageKey: attachment.storage_key,
            sizeBytes: buffer.length,
            sourceBackend,
            targetBackend
          }
        });

        // Handle source file based on user choice
        if (deleteSource) {
          try {
            await sourceStorage.deleteObject(attachment.storage_key, userContext);
            // Log successful source deletion
            logInfoFromRequest(request, {
              actionType: ACTION_TYPES.DELETE,
              entityType: ENTITY_TYPES.ATTACHMENT,
              entityId: attachment.id,
              summary: `Source file deleted after migration: ${attachment.original_filename}`,
              details: {
                storageKey: attachment.storage_key,
                sourceBackend
              }
            });
          } catch (deleteErr) {
            // Log but don't fail migration if source delete fails
            logWarningFromRequest(request, {
              entityType: ENTITY_TYPES.ATTACHMENT,
              entityId: attachment.id,
              summary: `Failed to delete source file after migration: ${attachment.original_filename}`,
              details: {
                direction,
                attachmentId: attachment.id,
                storageKey: attachment.storage_key,
                errorMessage: deleteErr.message
              }
            });
          }
        } else if (archiveSource && sourceBackend === 'filesystem') {
          // Archive local files by moving to archive directory
          try {
            await sourceStorage.archiveObject(attachment.storage_key, userContext);
            // Log successful archive
            logInfoFromRequest(request, {
              actionType: ACTION_TYPES.UPDATE,
              entityType: ENTITY_TYPES.ATTACHMENT,
              entityId: attachment.id,
              summary: `Source file archived after migration: ${attachment.original_filename}`,
              details: {
                storageKey: attachment.storage_key,
                sourceBackend,
                archivePath: 'uploads-archive'
              }
            });
          } catch (archiveErr) {
            // Log but don't fail migration if archive fails
            logWarningFromRequest(request, {
              entityType: ENTITY_TYPES.ATTACHMENT,
              entityId: attachment.id,
              summary: `Failed to archive source file after migration: ${attachment.original_filename}`,
              details: {
                direction,
                attachmentId: attachment.id,
                storageKey: attachment.storage_key,
                errorMessage: archiveErr.message
              }
            });
          }
        }

        results.migrated++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          attachmentId: attachment.id,
          filename: attachment.original_filename,
          error: error.message
        });
        logErrorFromRequest(request, {
          error,
          entityType: ENTITY_TYPES.ATTACHMENT,
          entityId: attachment.id,
          summary: `Migration failed for attachment: ${attachment.original_filename}`,
          details: {
            direction,
            attachmentId: attachment.id,
            filename: attachment.original_filename,
            storageKey: attachment.storage_key,
            errorMessage: error.message
          }
        });
      }
    }

    // Log migration completion
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.SYSTEM,
      entityType: ENTITY_TYPES.SYSTEM,
      summary: `Storage migration completed: ${results.migrated} migrated, ${results.failed} failed`,
      details: { direction, migrated: results.migrated, failed: results.failed, deleteSource }
    });

    return {
      success: results.failed === 0,
      migrated: results.migrated,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined
    };
  });

  // ============ GENERAL SETTINGS ============

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
        customPrompt: settings.ai_custom_prompt || '',
        // Per-type settings (empty string = use default)
        perType: {
          matters: {
            spiceLevel: settings.ai_spice_matters || '',
            customPrompt: settings.ai_prompt_matters || ''
          },
          notes: {
            spiceLevel: settings.ai_spice_notes || '',
            customPrompt: settings.ai_prompt_notes || ''
          },
          attachments: {
            spiceLevel: settings.ai_spice_attachments || '',
            customPrompt: settings.ai_prompt_attachments || ''
          },
          auditLog: {
            spiceLevel: settings.ai_spice_audit_log || '',
            customPrompt: settings.ai_prompt_audit_log || ''
          }
        }
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

  // Update drain configuration
  fastify.put('/admin/api/settings/drain', { preHandler: adminAuthMiddleware }, async (request, reply) => {
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

    // Log settings change
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.SETTINGS_CHANGE,
      entityType: ENTITY_TYPES.SETTINGS,
      summary: 'Updated drain settings',
      details: { enabled, rate_cents }
    });

    return {
      success: true,
      drain_enabled: settingsDb.get('auto_drain_enabled') === 'true',
      drain_rate_cents_per_second: parseFloat(settingsDb.get('drain_rate_cents_per_second'))
    };
  });

  // Update lifetime spent
  fastify.put('/admin/api/settings/lifetime-spent', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { amount, add } = request.body || {};

    if (amount === undefined) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Amount required' });
    }

    if (add) {
      const current = parseFloat(settingsDb.get('lifetime_spent') || '0');
      settingsDb.set('lifetime_spent', current + parseFloat(amount));
    } else {
      settingsDb.set('lifetime_spent', parseFloat(amount) || 0);
    }

    // Reset drain start time when manually updating the amount
    settingsDb.set('drain_start_time', new Date().toISOString());

    // Log settings change
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.SETTINGS_CHANGE,
      entityType: ENTITY_TYPES.SETTINGS,
      summary: add ? 'Added to lifetime spent' : 'Set lifetime spent',
      details: { amount, add }
    });

    return {
      success: true,
      lifetime_spent: parseFloat(settingsDb.get('lifetime_spent'))
    };
  });

  // Set last matter date manually
  fastify.put('/admin/api/settings/last-matter-date', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { date } = request.body || {};

    if (!date) {
      return reply.code(400).send({ error: 'BAD_REQUEST', message: 'Date is required' });
    }

    settingsDb.set('last_matter_date', new Date(date).toISOString());

    // Log settings change
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.SETTINGS_CHANGE,
      entityType: ENTITY_TYPES.SETTINGS,
      summary: 'Set last matter date',
      details: { date }
    });

    return { success: true, last_matter_date: settingsDb.get('last_matter_date') };
  });

  // ============ AI / CLAUDE SETTINGS ============

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
    const { model, spiceLevel, customPrompt, perType } = request.body || {};

    if (model !== undefined) {
      settingsDb.set('claude_model', model);
    }
    if (spiceLevel !== undefined) {
      settingsDb.set('ai_spice_level', String(spiceLevel));
    }
    if (customPrompt !== undefined) {
      settingsDb.set('ai_custom_prompt', customPrompt);
    }

    // Handle per-type settings
    if (perType) {
      const typeKeys = {
        matters: { spice: 'ai_spice_matters', prompt: 'ai_prompt_matters' },
        notes: { spice: 'ai_spice_notes', prompt: 'ai_prompt_notes' },
        attachments: { spice: 'ai_spice_attachments', prompt: 'ai_prompt_attachments' },
        auditLog: { spice: 'ai_spice_audit_log', prompt: 'ai_prompt_audit_log' }
      };

      for (const [type, keys] of Object.entries(typeKeys)) {
        if (perType[type]) {
          if (perType[type].spiceLevel !== undefined) {
            settingsDb.set(keys.spice, perType[type].spiceLevel);
          }
          if (perType[type].customPrompt !== undefined) {
            settingsDb.set(keys.prompt, perType[type].customPrompt);
          }
        }
      }
    }

    // Log AI settings change
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.SETTINGS_CHANGE,
      entityType: ENTITY_TYPES.SETTINGS,
      summary: 'Updated AI settings',
      details: { model, spiceLevel, hasPerTypeSettings: !!perType }
    });

    return { success: true };
  });

  // Save AI settings for a single type
  fastify.put('/admin/api/settings/ai/type', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { type, spiceLevel, customPrompt } = request.body || {};

    const typeKeys = {
      matters: { spice: 'ai_spice_matters', prompt: 'ai_prompt_matters' },
      notes: { spice: 'ai_spice_notes', prompt: 'ai_prompt_notes' },
      attachments: { spice: 'ai_spice_attachments', prompt: 'ai_prompt_attachments' },
      auditLog: { spice: 'ai_spice_audit_log', prompt: 'ai_prompt_audit_log' }
    };

    const keys = typeKeys[type];
    if (!keys) {
      return reply.code(400).send({ error: 'INVALID_TYPE', message: 'Invalid type. Must be: matters, notes, attachments, or auditLog' });
    }

    if (spiceLevel !== undefined) {
      settingsDb.set(keys.spice, spiceLevel);
    }
    if (customPrompt !== undefined) {
      settingsDb.set(keys.prompt, customPrompt);
    }

    // Log per-type AI settings change
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.SETTINGS_CHANGE,
      entityType: ENTITY_TYPES.SETTINGS,
      summary: `Updated AI settings for ${type}`,
      details: { type, spiceLevel, hasCustomPrompt: !!customPrompt }
    });

    return { success: true, type, spiceLevel, customPrompt };
  });

  // Apply default spice level to all types
  fastify.post('/admin/api/settings/ai/apply-default-to-all', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const defaultSpice = settingsDb.get('ai_spice_level') || '1';
    const defaultPrompt = settingsDb.get('ai_custom_prompt') || '';

    const types = ['matters', 'notes', 'attachments', 'audit_log'];
    const spiceKeys = ['ai_spice_matters', 'ai_spice_notes', 'ai_spice_attachments', 'ai_spice_audit_log'];
    const promptKeys = ['ai_prompt_matters', 'ai_prompt_notes', 'ai_prompt_attachments', 'ai_prompt_audit_log'];

    for (let i = 0; i < types.length; i++) {
      settingsDb.set(spiceKeys[i], defaultSpice);
      settingsDb.set(promptKeys[i], defaultPrompt);
    }

    // Log bulk settings change
    logInfoFromRequest(request, {
      actionType: ACTION_TYPES.SETTINGS_CHANGE,
      entityType: ENTITY_TYPES.SETTINGS,
      summary: 'Applied default AI settings to all types',
      details: { defaultSpice, hasDefaultPrompt: !!defaultPrompt }
    });

    return { success: true, appliedSpiceLevel: defaultSpice, appliedToTypes: types };
  });

  // Preview AI descriptions (generate without saving)
  fastify.post('/admin/api/claude/preview-descriptions', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    const { count = 5, spiceLevel, customPrompt } = request.body || {};
    const claudeApiKey = settingsDb.get('claude_api_key');
    const model = settingsDb.get('claude_model');

    if (!claudeApiKey) {
      return reply.code(400).send({ error: 'NO_API_KEY', message: 'No Claude API key configured' });
    }

    if (!model) {
      return reply.code(400).send({ error: 'NO_MODEL', message: 'No model selected' });
    }

    try {
      const client = new Anthropic({ apiKey: claudeApiKey });
      const prompt = buildDescriptionPrompt(count, spiceLevel, customPrompt);
      const userContext = getUserContext(request);

      const response = await callClaudeWithLogging(client, {
        model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      }, userContext);

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

  // ============ ANALYTICS ============

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
}

// Export the helper function for use by sample-data routes
export { buildDescriptionPrompt };
