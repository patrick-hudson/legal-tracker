/**
 * Sample Data Generation Routes
 * Routes for generating sample matters, notes, attachments, and audit log entries
 */

import { join, resolve } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import {
  getAiSettingsForType,
  generateClaudeDescriptions,
  generateContextualPrivateNotes,
  generateClaudeAuditLogEntries
} from '../services/sample-data-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Register sample data routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts - Route dependencies
 */
export default async function sampleDataRoutes(fastify, opts) {
  const {
    adminAuthMiddleware,
    settingsDb,
    mattersDb,
    privateNotesDb,
    attachmentsDb,
    auditLogDb,
    sampleTemplates,
    storage: createStorage,
    createStorageForBackend,
    generateLegalDocument,
    generatePlaceholderDocument,
    callClaudeWithLogging,
    getUserContext,
    logInfoFromRequest,
    logDebugFromRequest,
    logWarningFromRequest,
    logErrorFromRequest,
    ACTION_TYPES,
    ENTITY_TYPES
  } = opts;

  // List available sample datasets
  fastify.get('/admin/api/data/samples', { preHandler: adminAuthMiddleware }, async (_, reply) => {
    try {
      const samplesDir = join(__dirname, '..', 'samples');

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
        spiceLevelOverride = null,
        // Private notes options
        generatePrivateNotes = false,
        notesPercentage = 30,
        minNotesPerMatter = 1,
        maxNotesPerMatter = 3,
        // Attachment generation options
        generateAttachments = false,
        attachmentsPercentage = 25,
        // Lawyer/counsel options
        lawyerPercentage = 40,
        opposingCounselPercentage = 30,
        caseNumberPercentage = 50
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
        const samplesDir = join(__dirname, '..', 'samples');
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

        // Get descriptions - use static templates by default, AI if enabled
        let descriptions = sampleTemplates.getMatterDescriptions(matterCount);

        if (useAiDescriptions) {
          const userContext = getUserContext(request);
          logDebugFromRequest(request, {
            actionType: ACTION_TYPES.SAMPLE_DATA_GENERATE,
            entityType: ENTITY_TYPES.MATTER,
            summary: `Requesting ${matterCount} AI-generated matter descriptions`,
            details: { count: matterCount, spiceLevel: spiceLevelOverride }
          });
          const aiDescriptions = await generateClaudeDescriptions(settingsDb, callClaudeWithLogging, matterCount, spiceLevelOverride, userContext);
          if (aiDescriptions && aiDescriptions.length > 0) {
            descriptions = aiDescriptions;
            usedAi = true;
            logInfoFromRequest(request, {
              actionType: ACTION_TYPES.SAMPLE_DATA_GENERATE,
              entityType: ENTITY_TYPES.MATTER,
              summary: `Generated ${aiDescriptions.length} AI matter descriptions`,
              details: { count: aiDescriptions.length, spiceLevel: spiceLevelOverride, sample: aiDescriptions.slice(0, 3) }
            });
          } else {
            logWarningFromRequest(request, {
              actionType: ACTION_TYPES.SAMPLE_DATA_GENERATE,
              entityType: ENTITY_TYPES.MATTER,
              summary: `AI description generation failed, using static descriptions`,
              details: { requestedCount: matterCount }
            });
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
            const minDollars = Math.ceil(minCents / 100);
            const maxDollars = Math.floor(maxCents / 100);
            costCents = (Math.floor(Math.random() * (maxDollars - minDollars + 1)) + minDollars) * 100;
          } else {
            costCents = Math.floor(Math.random() * (maxCents - minCents + 1)) + minCents;
          }

          // Pick a description
          const description = descriptions[i % descriptions.length] ||
            descriptions[Math.floor(Math.random() * descriptions.length)];

          // Generate lawyer info based on percentage
          let lawyerInfo = null;
          if (Math.random() * 100 < lawyerPercentage) {
            lawyerInfo = sampleTemplates.getRandomLawyer();
          }

          // Generate opposing counsel info based on percentage
          let opposingInfo = null;
          if (Math.random() * 100 < opposingCounselPercentage) {
            opposingInfo = sampleTemplates.getRandomOpposingCounsel();
          }

          // Generate case number based on percentage
          let caseNumber = null;
          if (Math.random() * 100 < caseNumberPercentage) {
            caseNumber = sampleTemplates.generateCaseNumber(randomDate.getFullYear());
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

      logDebugFromRequest(request, {
        actionType: ACTION_TYPES.SAMPLE_DATA_GENERATE,
        entityType: ENTITY_TYPES.MATTER,
        summary: `Creating ${sampleMatters.length} sample matters`,
        details: {
          count: sampleMatters.length,
          usedAi,
          dateRange: { start: sampleMatters[0]?.matter_date, end: sampleMatters[sampleMatters.length - 1]?.matter_date }
        }
      });

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

        logDebugFromRequest(request, {
          actionType: ACTION_TYPES.CREATE,
          entityType: ENTITY_TYPES.MATTER,
          entityId: result.id,
          summary: `Created matter #${result.id}: "${matter.note?.substring(0, 50) || 'N/A'}..."`,
          details: {
            matterId: result.id,
            note: matter.note,
            cost: matter.cost,
            date: matter.matter_date,
            lawyerName: matter.lawyer_name,
            caseNumber: matter.case_number,
            usedAiDescription: usedAi
          }
        });
      }

      // Generate private notes if requested
      if (generatePrivateNotes && createdMatterIds.length > 0) {
        const pct = Math.max(0, Math.min(100, notesPercentage));
        const minNotes = Math.max(1, minNotesPerMatter);
        const maxNotes = Math.max(minNotes, maxNotesPerMatter);

        const mattersWithNotes = createdMatterIds.filter(() => Math.random() * 100 < pct);

        logDebugFromRequest(request, {
          actionType: ACTION_TYPES.SAMPLE_DATA_GENERATE,
          entityType: ENTITY_TYPES.PRIVATE_NOTE,
          summary: `Generating notes for ${mattersWithNotes.length}/${createdMatterIds.length} matters (${pct}% chance)`,
          details: { mattersWithNotes: mattersWithNotes.length, totalMatters: createdMatterIds.length, percentage: pct }
        });

        if (mattersWithNotes.length > 0) {
          const matterInfoList = mattersWithNotes.map(matterId => {
            const matterData = mattersDb.getById(matterId);
            const noteCount = Math.floor(Math.random() * (maxNotes - minNotes + 1)) + minNotes;
            return {
              matterId,
              description: matterData?.note || 'Legal matter',
              noteCount,
              matterDate: matterData?.matter_date ? new Date(matterData.matter_date) : new Date()
            };
          });

          const totalNotesNeeded = matterInfoList.reduce((sum, m) => sum + m.noteCount, 0);

          let contextualNotesMap = null;
          let usedAiNotes = false;

          if (useAiDescriptions) {
            const userContext = getUserContext(request);
            logDebugFromRequest(request, {
              actionType: ACTION_TYPES.SAMPLE_DATA_GENERATE,
              entityType: ENTITY_TYPES.PRIVATE_NOTE,
              summary: `Requesting ${totalNotesNeeded} context-aware AI notes for ${matterInfoList.length} matters`,
              details: { totalNotes: totalNotesNeeded, matterCount: matterInfoList.length, spiceLevel: spiceLevelOverride }
            });

            contextualNotesMap = await generateContextualPrivateNotes(settingsDb, callClaudeWithLogging, matterInfoList, spiceLevelOverride, userContext);

            if (contextualNotesMap && contextualNotesMap.size > 0) {
              usedAiNotes = true;
              logInfoFromRequest(request, {
                actionType: ACTION_TYPES.SAMPLE_DATA_GENERATE,
                entityType: ENTITY_TYPES.PRIVATE_NOTE,
                summary: `Generated context-aware AI notes for ${contextualNotesMap.size} matters`,
                details: { mattersWithNotes: contextualNotesMap.size, spiceLevel: spiceLevelOverride }
              });
            }
          }

          for (const matterInfo of matterInfoList) {
            const { matterId, noteCount, matterDate, description } = matterInfo;

            let notesForMatter = contextualNotesMap?.get(matterId);

            if (!notesForMatter || notesForMatter.length === 0) {
              notesForMatter = sampleTemplates.generateNotes(noteCount);
              if (useAiDescriptions) {
                logDebugFromRequest(request, {
                  actionType: ACTION_TYPES.SAMPLE_DATA_GENERATE,
                  entityType: ENTITY_TYPES.PRIVATE_NOTE,
                  summary: `Falling back to static notes for matter #${matterId}`,
                  details: { matterId, noteCount }
                });
              }
            }

            for (const noteItem of notesForMatter) {
              const noteContent = typeof noteItem === 'object' ? noteItem.content : noteItem;
              const interactionType = typeof noteItem === 'object' ? (noteItem.type || 'note') : 'note';

              const daysAfter = Math.floor(Math.random() * 60);
              const interactionDate = new Date(matterDate);
              interactionDate.setDate(interactionDate.getDate() + daysAfter);
              const interactionDateStr = interactionDate.toISOString().split('T')[0];

              privateNotesDb.create(matterId, noteContent, null, {
                interaction_date: interactionDateStr,
                interaction_type: interactionType
              });
              notesGenerated++;
            }

            logDebugFromRequest(request, {
              actionType: ACTION_TYPES.CREATE,
              entityType: ENTITY_TYPES.PRIVATE_NOTE,
              entityId: matterId,
              summary: `Created ${notesForMatter.length} notes for matter #${matterId}: "${description?.substring(0, 50) || 'N/A'}..."`,
              details: { matterId, matterNote: description, noteCount: notesForMatter.length, usedAi: usedAiNotes && contextualNotesMap?.has(matterId) }
            });
          }
        }
      }

      // Generate attachments if requested
      if (generateAttachments && createdMatterIds.length > 0) {
        const claudeApiKey = settingsDb.get('claude_api_key');
        const model = settingsDb.get('claude_model');
        const { spiceLevel: attachmentsSpice } = getAiSettingsForType(settingsDb, 'attachments', spiceLevelOverride);
        const spiceLevel = parseInt(attachmentsSpice, 10);

        const pct = Math.max(0, Math.min(100, attachmentsPercentage));
        const mattersWithAttachments = createdMatterIds.filter(() => Math.random() * 100 < pct);

        logDebugFromRequest(request, {
          actionType: ACTION_TYPES.SAMPLE_DATA_GENERATE,
          entityType: ENTITY_TYPES.ATTACHMENT,
          summary: `Generating attachments for ${mattersWithAttachments.length}/${createdMatterIds.length} matters (${pct}% chance)`,
          details: {
            mattersWithAttachments: mattersWithAttachments.length,
            totalMatters: createdMatterIds.length,
            percentage: pct,
            aiConfigured: !!(claudeApiKey && model),
            spiceLevel
          }
        });

        if (mattersWithAttachments.length > 0) {
          const storage = createStorage(settingsDb);

          for (const matterId of mattersWithAttachments) {
            try {
              const matterData = mattersDb.getById(matterId);

              let docResult;
              let usedAiDoc = false;
              if (claudeApiKey && model) {
                const client = new Anthropic({ apiKey: claudeApiKey });
                const userContext = getUserContext(request);

                logDebugFromRequest(request, {
                  actionType: ACTION_TYPES.SAMPLE_DATA_GENERATE,
                  entityType: ENTITY_TYPES.ATTACHMENT,
                  entityId: matterId,
                  summary: `Generating AI document for matter #${matterId}: "${matterData?.note?.substring(0, 40) || 'N/A'}..."`,
                  details: { matterId, matterNote: matterData?.note, model, spiceLevel }
                });
                docResult = await generateLegalDocument(client, model, matterData, spiceLevel, userContext);
                usedAiDoc = true;
              } else {
                logDebugFromRequest(request, {
                  actionType: ACTION_TYPES.SAMPLE_DATA_GENERATE,
                  entityType: ENTITY_TYPES.ATTACHMENT,
                  entityId: matterId,
                  summary: `Generating placeholder document for matter #${matterId} (AI not configured)`,
                  details: { matterId, matterNote: matterData?.note }
                });
                docResult = await generatePlaceholderDocument(matterData);
              }

              const storageContext = getUserContext(request);
              const storageResult = await storage.putObject(
                docResult.buffer,
                docResult.filename,
                { contentType: docResult.contentType },
                storageContext
              );

              const matterDate = new Date(matterData.matter_date);
              const daysAfter = Math.floor(Math.random() * 30);
              const docDate = new Date(matterDate);
              docDate.setDate(docDate.getDate() + daysAfter);
              const documentDateStr = docDate.toISOString().split('T')[0];

              const directionOptions = ['incoming', 'incoming', 'outgoing', 'internal', 'internal'];
              const direction = directionOptions[Math.floor(Math.random() * directionOptions.length)];

              attachmentsDb.create(
                matterId,
                docResult.filename,
                docResult.contentType,
                storageResult.size_bytes,
                storage.type,
                storageResult.storage_key,
                null,
                {
                  document_date: documentDateStr,
                  direction
                }
              );

              attachmentsGenerated++;

              logInfoFromRequest(request, {
                actionType: ACTION_TYPES.CREATE,
                entityType: ENTITY_TYPES.ATTACHMENT,
                entityId: matterId,
                summary: `Created ${usedAiDoc ? 'AI-generated' : 'placeholder'} ${docResult.docType || 'document'} for matter #${matterId}`,
                details: {
                  matterId,
                  matterNote: matterData?.note,
                  filename: docResult.filename,
                  docType: docResult.docType,
                  docName: docResult.docName,
                  sizeBytes: storageResult.size_bytes,
                  usedAi: usedAiDoc,
                  direction
                }
              });
            } catch (err) {
              logWarningFromRequest(request, {
                actionType: ACTION_TYPES.SAMPLE_DATA_GENERATE,
                entityType: ENTITY_TYPES.ATTACHMENT,
                entityId: matterId,
                summary: `Failed to generate attachment for matter #${matterId}: ${err.message}`,
                details: { matterId, error: err.message, stack: err.stack }
              });
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

      // Audit log the sample data generation summary
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.SAMPLE_DATA_GENERATE,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: source && source !== 'generate'
          ? `Loaded ${sampleMatters.length} matters from ${source}`
          : `Generated ${sampleMatters.length} sample matters${usedAi ? ' (AI)' : ''}${notesGenerated > 0 ? `, ${notesGenerated} notes` : ''}${attachmentsGenerated > 0 ? `, ${attachmentsGenerated} attachments` : ''}`,
        details: {
          matters_added: sampleMatters.length,
          matter_ids: createdMatterIds,
          source: (source === 'generate' || !source) ? 'generated' : source,
          total_cost_cents: totalCost,
          used_ai_descriptions: usedAi,
          notes_requested: generatePrivateNotes,
          notes_percentage: generatePrivateNotes ? notesPercentage : null,
          notes_generated: notesGenerated,
          attachments_requested: generateAttachments,
          attachments_percentage: generateAttachments ? attachmentsPercentage : null,
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
        private_notes_enabled: generatePrivateNotes,
        private_notes_generated: notesGenerated,
        attachments_enabled: generateAttachments,
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

  // Regenerate all sample JSON files using centralized word banks
  fastify.post('/admin/api/data/regenerate-samples', { preHandler: adminAuthMiddleware }, async (_, reply) => {
    try {
      const samplesDir = join(__dirname, '..', 'samples');

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

      let filesGenerated = 0;

      for (const config of sampleConfigs) {
        const matters = [];
        const now = new Date();
        const startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - config.yearsBack);

        const descriptions = sampleTemplates.getMatterDescriptions(config.count);

        for (let i = 0; i < config.count; i++) {
          const randomDate = new Date(
            startDate.getTime() + Math.random() * (now.getTime() - startDate.getTime())
          );
          const cost = sampleTemplates.randomInt(50000, 5000000);

          const matter = {
            matter_date: randomDate.toISOString(),
            note: descriptions[i],
            cost: cost
          };

          if (Math.random() < 0.4) {
            const lawyer = sampleTemplates.getRandomLawyer();
            matter.lawyer_name = lawyer.name;
            matter.lawyer_firm = lawyer.firm;
          }

          if (Math.random() < 0.3) {
            const opposing = sampleTemplates.getRandomOpposingCounsel();
            matter.opposing_counsel_name = opposing.name;
            matter.opposing_counsel_firm = opposing.firm;
          }

          if (Math.random() < 0.5) {
            matter.case_number = sampleTemplates.generateCaseNumber(randomDate.getFullYear());
          }

          matters.push(matter);
        }

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

  // Generate sample audit log entries
  fastify.post('/admin/api/data/populate-audit-log', { preHandler: adminAuthMiddleware }, async (request, reply) => {
    try {
      const {
        count = 100,
        startDate,
        endDate,
        useAi = false,
        spiceLevelOverride = null
      } = request.body || {};

      // Validate count range (50-500)
      const entryCount = parseInt(count, 10);
      if (isNaN(entryCount) || entryCount < 50 || entryCount > 500) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Count must be between 50 and 500'
        });
      }

      // Date range - default to past 30 days
      const now = new Date();
      let dateStart, dateEnd;

      if (startDate) {
        dateStart = new Date(startDate);
      } else {
        dateStart = new Date(now);
        dateStart.setDate(now.getDate() - 30);
      }

      if (endDate) {
        dateEnd = new Date(endDate);
      } else {
        dateEnd = now;
      }

      let entries = [];
      let usedAi = false;

      // Try AI generation if requested
      if (useAi) {
        const userContext = getUserContext(request);
        const aiEntries = await generateClaudeAuditLogEntries(settingsDb, callClaudeWithLogging, entryCount, spiceLevelOverride, userContext);
        if (aiEntries && aiEntries.length > 0) {
          entries = aiEntries;
          usedAi = true;
        }
      }

      // Fall back to static data if AI didn't work
      if (entries.length === 0) {
        const generatedEntries = sampleTemplates.generateAuditLogEntries(entryCount, dateStart, dateEnd);
        entries = generatedEntries.map(entry => ({
          level: entry.level,
          action_type: entry.action_type,
          entity_type: entry.entity_type,
          summary: entry.summary,
          username: entry.username,
          ip_address: entry.ip_address,
          entity_id: entry.entity_type === 'matter' ? Math.floor(Math.random() * 100) + 1 : null,
          stack_trace: entry.stack_trace,
          duration_ms: entry.duration_ms
        }));
      }

      // Assign timestamps with realistic patterns (more activity during business hours)
      const dateRange = dateEnd.getTime() - dateStart.getTime();
      const processedEntries = entries.map(entry => {
        const randomTime = dateStart.getTime() + Math.random() * dateRange;
        const timestamp = new Date(randomTime);

        // Skew toward business hours (9 AM - 6 PM)
        if (Math.random() > 0.3) {
          timestamp.setHours(9 + Math.floor(Math.random() * 9));
        }

        return {
          timestamp: timestamp.toISOString(),
          level: entry.level,
          user_id: null,
          username: entry.username || null,
          action_type: entry.action_type,
          entity_type: entry.entity_type || null,
          entity_id: entry.entity_id || null,
          summary: entry.summary,
          request: entry.request || null,
          response: entry.response || null,
          details: entry.details || null,
          ip_address: entry.ip_address || null,
          duration_ms: entry.duration_ms || null,
          stack_trace: entry.stack_trace || null
        };
      });

      // Sort by timestamp descending before insert (newest first)
      processedEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Bulk create entries
      const result = auditLogDb.bulkCreate(processedEntries);

      // Log the generation
      logInfoFromRequest(request, {
        actionType: ACTION_TYPES.SAMPLE_DATA_GENERATE,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: `Generated ${result.created} sample audit log entries`,
        details: { entries_generated: result.created, used_ai: usedAi }
      });

      return {
        success: true,
        message: `Generated ${result.created} audit log entries`,
        entries_generated: result.created,
        used_ai: usedAi
      };
    } catch (error) {
      logErrorFromRequest(request, {
        error,
        entityType: ENTITY_TYPES.SYSTEM,
        summary: 'Failed to generate audit log sample data'
      });
      return reply.code(500).send({
        error: 'SERVER_ERROR',
        message: `Failed to generate audit log sample data: ${error.message}`
      });
    }
  });
}
