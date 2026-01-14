/**
 * Application constants
 * Extracted from server.js for modularity
 */

/**
 * Default application settings (canonical source of truth)
 * Used for fresh installs and settings reset operations
 */
export const DEFAULT_APP_SETTINGS = {
  lifetime_spent: '0',
  drain_rate_cents_per_second: '0',
  auto_drain_enabled: 'false',
  // AI/Claude settings
  claude_api_key: '',
  claude_key_validated: 'false',
  claude_model: '',
  ai_spice_level: '1',
  ai_custom_prompt: '',
  // Per-type AI settings (null = use default ai_spice_level)
  ai_spice_matters: '',
  ai_spice_notes: '',
  ai_spice_attachments: '',
  ai_spice_audit_log: '',
  ai_prompt_matters: '',
  ai_prompt_notes: '',
  ai_prompt_attachments: '',
  ai_prompt_audit_log: ''
  // Note: drain_start_time and last_matter_date are set dynamically to current time
};

/**
 * Input validation limits
 * Maximum allowed lengths for various string inputs
 */
export const INPUT_LIMITS = {
  username: 100,
  password: 1000, // Allow long passwords
  email: 255,
  note: 10000, // 10KB for notes
  confirmationString: 100
};

/**
 * Cache time-to-live in milliseconds (5 minutes)
 * Used for commit push status cache
 */
export const CACHE_TTL_MS = 5 * 60 * 1000;
