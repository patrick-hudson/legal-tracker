/**
 * Sample Data Generation Service
 * Contains AI-powered and static data generation logic for matters, notes, and audit logs
 */

import Anthropic from '@anthropic-ai/sdk';
import { buildDescriptionPrompt } from '../routes/settings.js';

/**
 * Spice level instructions shared by note generation functions
 */
export const spiceInstructions = {
  '1': 'Professional, formal internal notes. Standard legal documentation style.',
  '2': 'Dry humor with subtle wit. Keep it professional but with understated observations.',
  '3': 'Witty internal notes with clever observations about cases, clients, and opposing counsel.',
  '4': 'Dramatic internal notes with theatrical observations and slightly absurd commentary.',
  '5': 'Unhinged internal notes. Wildly creative, absurd observations that would never be shared externally.',
  '6': 'CHAOTIC EVIL: Maximum snark. Every note drips with sarcasm about clients, opposing counsel, judges, and the legal system itself.',
  '7': 'ELDRITCH HORROR: Internal notes written by a cosmic entity consuming law firms. Reality-questioning observations about the nature of law itself.',
  '8': 'THE FINAL FORM: Transcendent chaos. Notes that combine existential dread, cosmic horror, time paradoxes, and bureaucratic nightmares. Sentient case files. Emotional support motions.'
};

/**
 * Audit log spice instructions
 */
export const auditLogSpiceInstructions = {
  1: 'Generate professional, realistic log entries.',
  2: 'Generate professional entries with subtle dry humor.',
  3: 'Generate entries with witty observations.',
  4: 'Generate dramatic entries - everything is CRITICAL.',
  5: 'Generate increasingly absurd scenarios.',
  6: 'Generate chaotic entries with passive-aggressive tones.',
  7: 'Generate entries hinting at cosmic horror and impossible events.',
  8: 'Generate completely unhinged, reality-breaking entries.'
};

/**
 * Get AI settings for a specific generation type.
 * Falls back to default settings if no type-specific override is set.
 * @param {Object} settingsDb - Settings database instance
 * @param {'matters'|'notes'|'attachments'|'auditLog'} type - The generation type
 * @param {string|null} overrideSpiceLevel - Optional override from API call
 * @returns {{ spiceLevel: string, customPrompt: string }}
 */
export function getAiSettingsForType(settingsDb, type, overrideSpiceLevel = null) {
  const typeKeys = {
    matters: { spice: 'ai_spice_matters', prompt: 'ai_prompt_matters' },
    notes: { spice: 'ai_spice_notes', prompt: 'ai_prompt_notes' },
    attachments: { spice: 'ai_spice_attachments', prompt: 'ai_prompt_attachments' },
    auditLog: { spice: 'ai_spice_audit_log', prompt: 'ai_prompt_audit_log' }
  };

  const keys = typeKeys[type];
  const defaultSpice = settingsDb.get('ai_spice_level') || '1';
  const defaultPrompt = settingsDb.get('ai_custom_prompt') || '';

  // Priority: override > per-type > default
  const typeSpice = keys ? settingsDb.get(keys.spice) : '';
  const typePrompt = keys ? settingsDb.get(keys.prompt) : '';

  return {
    spiceLevel: overrideSpiceLevel || typeSpice || defaultSpice,
    customPrompt: typePrompt || defaultPrompt
  };
}

/**
 * Generate matter descriptions using Claude API
 * @param {Object} settingsDb - Settings database instance
 * @param {Function} callClaudeWithLogging - Claude API wrapper function
 * @param {number} count - Number of descriptions to generate
 * @param {string|null} overrideSpiceLevel - Spice level override
 * @param {Object} context - User context for logging
 * @returns {Promise<string[]|null>} Array of descriptions or null if failed
 */
export async function generateClaudeDescriptions(settingsDb, callClaudeWithLogging, count, overrideSpiceLevel = null, context = {}) {
  const claudeApiKey = settingsDb.get('claude_api_key');
  const model = settingsDb.get('claude_model');

  if (!claudeApiKey || !model) {
    return null;
  }

  try {
    const client = new Anthropic({ apiKey: claudeApiKey });
    const { spiceLevel, customPrompt } = getAiSettingsForType(settingsDb, 'matters', overrideSpiceLevel);
    const prompt = buildDescriptionPrompt(count, spiceLevel, customPrompt);

    const response = await callClaudeWithLogging(client, {
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    }, context);

    const content = response.content?.[0]?.text;
    if (!content) return null;

    // Parse the JSON array from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    const descriptions = JSON.parse(jsonMatch[0]);
    return Array.isArray(descriptions) ? descriptions : null;
  } catch (err) {
    // Error already logged by callClaudeWithLogging
    return null;
  }
}

/**
 * Generate context-aware private notes for multiple matters in batches.
 * Each matter gets notes that reference its specific description.
 *
 * @param {Object} settingsDb - Settings database instance
 * @param {Function} callClaudeWithLogging - Claude API wrapper function
 * @param {Array<{matterId: number, description: string, noteCount: number}>} matters - Matters needing notes
 * @param {string|null} overrideSpiceLevel - Spice level override
 * @param {Object} context - User context for logging
 * @param {number} batchSize - Matters per API call (default 10)
 * @returns {Promise<Map<number, Array<{content: string, type: string}>>|null>} Map of matterId -> notes array
 */
export async function generateContextualPrivateNotes(settingsDb, callClaudeWithLogging, matters, overrideSpiceLevel = null, context = {}, batchSize = 10) {
  const claudeApiKey = settingsDb.get('claude_api_key');
  const model = settingsDb.get('claude_model');

  if (!claudeApiKey || !model) {
    return null;
  }

  const client = new Anthropic({ apiKey: claudeApiKey });
  const { spiceLevel } = getAiSettingsForType(settingsDb, 'notes', overrideSpiceLevel);
  const instruction = spiceInstructions[spiceLevel] || spiceInstructions['1'];

  // Results map: matterId -> array of notes
  const results = new Map();

  // Process in batches
  for (let i = 0; i < matters.length; i += batchSize) {
    const batch = matters.slice(i, i + batchSize);

    // Build the prompt for this batch
    const matterDescriptions = batch.map((m, idx) =>
      `Matter ${idx + 1} (ID: ${m.matterId}, notes needed: ${m.noteCount}): "${m.description}"`
    ).join('\n');

    const prompt = `Generate internal private notes for these legal matters. Each note should directly reference and relate to its matter's description. These are internal-only notes not shared with clients.

MATTERS:
${matterDescriptions}

For each matter, generate the requested number of notes. Types to vary across:
- Call logs and communication records (type: "call")
- Case status updates (type: "status")
- Strategy notes and observations (type: "strategy")
- Client behavior notes (type: "client")
- Warnings about deadlines or issues (type: "warning")
- Observations about opposing counsel or judges (type: "observation")
- General commentary and follow-ups (type: "note")

IMPORTANT: Each note MUST reference specific details from its matter's description. Don't generate generic notes.

Tone: ${instruction}

Return ONLY a JSON object with matter IDs as keys, each containing an array of note objects. Example:
{
  "123": [{"content": "Called client about the Smith contract dispute...", "type": "call"}, {"content": "Strategy note: Given the contract breach allegations...", "type": "strategy"}],
  "456": [{"content": "Status update on the property damage claim...", "type": "status"}]
}`;

    try {
      const response = await callClaudeWithLogging(client, {
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      }, context);

      const content = response.content?.[0]?.text;
      if (!content) continue;

      // Extract JSON object from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const batchResults = JSON.parse(jsonMatch[0]);

      // Add results to main map
      for (const [matterIdStr, notes] of Object.entries(batchResults)) {
        const matterId = parseInt(matterIdStr, 10);
        if (Array.isArray(notes)) {
          results.set(matterId, notes);
        }
      }
    } catch (err) {
      // Error already logged by callClaudeWithLogging
      // Continue with next batch - partial results are better than none
      console.error(`[generateContextualPrivateNotes] Batch ${i / batchSize + 1} failed:`, err.message);
    }
  }

  return results.size > 0 ? results : null;
}

/**
 * Generate private notes using Claude API (legacy, non-contextual)
 * @param {Object} settingsDb - Settings database instance
 * @param {Function} callClaudeWithLogging - Claude API wrapper function
 * @param {number} count - Number of notes to generate
 * @param {string|null} overrideSpiceLevel - Spice level override
 * @param {Object} context - User context for logging
 * @returns {Promise<string[]|null>} Array of note strings or null if failed
 */
export async function generateClaudePrivateNotes(settingsDb, callClaudeWithLogging, count, overrideSpiceLevel = null, context = {}) {
  const claudeApiKey = settingsDb.get('claude_api_key');
  const model = settingsDb.get('claude_model');

  if (!claudeApiKey || !model) {
    return null;
  }

  try {
    const client = new Anthropic({ apiKey: claudeApiKey });
    const { spiceLevel } = getAiSettingsForType(settingsDb, 'notes', overrideSpiceLevel);
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

    const response = await callClaudeWithLogging(client, {
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    }, context);

    const content = response.content?.[0]?.text;
    if (!content) return null;

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    const notes = JSON.parse(jsonMatch[0]);
    return Array.isArray(notes) ? notes : null;
  } catch (err) {
    // Error already logged by callClaudeWithLogging
    return null;
  }
}

/**
 * Generate audit log entries using Claude API
 * @param {Object} settingsDb - Settings database instance
 * @param {Function} callClaudeWithLogging - Claude API wrapper function
 * @param {number} count - Number of entries to generate
 * @param {string|null} overrideSpiceLevel - Spice level override
 * @param {Object} context - User context for logging
 * @returns {Promise<Array|null>} Array of audit log entries or null if failed
 */
export async function generateClaudeAuditLogEntries(settingsDb, callClaudeWithLogging, count, overrideSpiceLevel = null, context = {}) {
  const claudeApiKey = settingsDb.get('claude_api_key');
  const model = settingsDb.get('claude_model');

  if (!claudeApiKey || !model) {
    return null;
  }

  try {
    const { spiceLevel: auditLogSpice } = getAiSettingsForType(settingsDb, 'auditLog', overrideSpiceLevel);
    const spiceLevel = parseInt(auditLogSpice, 10);
    const client = new Anthropic({ apiKey: claudeApiKey });

    const prompt = `Generate ${count} realistic audit log entries for a legal matter tracking system.
${auditLogSpiceInstructions[spiceLevel] || auditLogSpiceInstructions[1]}

Each entry should be a JSON object with these fields:
- level: "INFO", "WARNING", "ERROR", "SECURITY", or "DEBUG"
- action_type: like "login", "logout", "create", "update", "delete", "api_call", "export", "settings_change", etc.
- entity_type: like "user", "matter", "attachment", "private_note", "system", "claude_api", etc.
- summary: brief description of the event
- username: optional username (null for system events)
- ip_address: optional IP address
- duration_ms: optional duration in milliseconds (for API calls)
- stack_trace: optional for ERROR entries
- details: optional JSON object with extra info

Distribution should be roughly:
- 60% INFO (normal operations)
- 15% WARNING (issues, near-limits)
- 10% ERROR (failures)
- 10% SECURITY (auth events)
- 5% DEBUG (API calls, storage ops)

Return ONLY a valid JSON array, no other text. Example:
[{"level":"INFO","action_type":"login","entity_type":"user","summary":"User logged in","username":"admin","ip_address":"192.168.1.1"}]`;

    const response = await callClaudeWithLogging(client, {
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    }, context);

    const content = response.content?.[0]?.text;
    if (!content) return null;

    // Try to parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    const entries = JSON.parse(jsonMatch[0]);
    return Array.isArray(entries) && entries.length > 0 ? entries : null;
  } catch (err) {
    // Error already logged by callClaudeWithLogging
    return null;
  }
}
