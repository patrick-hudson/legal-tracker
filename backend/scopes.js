/**
 * API Key Scopes Module
 *
 * Defines permission scopes for API keys and provides validation utilities.
 */

/**
 * All available scopes with descriptions
 */
export const SCOPES = {
  // Matters
  'matters:read': 'Read matters list and details',
  'matters:write': 'Create and update matters',
  'matters:delete': 'Delete matters',

  // Private Notes
  'notes:read': 'Read private notes',
  'notes:write': 'Create and update private notes',
  'notes:delete': 'Delete private notes',

  // Attachments
  'attachments:read': 'Read and download attachments',
  'attachments:write': 'Upload attachments',
  'attachments:delete': 'Delete attachments',

  // Audit Log
  'audit:read': 'Read audit log',

  // Analytics & Dashboard
  'analytics:read': 'Read analytics and dashboard data',

  // Settings
  'settings:read': 'Read settings',
  'settings:write': 'Modify settings',

  // Backup & Restore
  'backup:read': 'Read backup statistics',
  'backup:write': 'Create backups and restore',

  // Data Management (dangerous)
  'data:wipe': 'Wipe data (matters, notes, attachments, audit log)',
  'data:generate': 'Generate sample data',

  // Users (admin only)
  'users:read': 'Read user list',
  'users:write': 'Create and update users',
  'users:delete': 'Delete users',

  // Sessions (admin only)
  'sessions:read': 'Read sessions list',
  'sessions:delete': 'Invalidate sessions',

  // API Keys (admin only)
  'api-keys:read': 'Read API keys list',
  'api-keys:write': 'Create API keys',
  'api-keys:delete': 'Revoke API keys',

  // Wildcard (full admin)
  'admin:full': 'Full admin access (all permissions)'
};

/**
 * Scope presets for common use cases
 */
export const SCOPE_PRESETS = {
  // Read everything, change nothing
  'read-only': {
    name: 'Read Only',
    description: 'Read all data, no modifications',
    scopes: [
      'matters:read',
      'notes:read',
      'attachments:read',
      'audit:read',
      'analytics:read',
      'settings:read',
      'backup:read'
    ]
  },

  // Basic CRUD on core data, no deletions, no admin ops
  'limited-write': {
    name: 'Limited Write',
    description: 'Read all, create/update matters, notes, attachments (no deletions)',
    scopes: [
      'matters:read',
      'matters:write',
      'notes:read',
      'notes:write',
      'attachments:read',
      'attachments:write',
      'audit:read',
      'analytics:read',
      'settings:read',
      'backup:read'
    ]
  },

  // Full CRUD on all data, but no admin operations
  'write': {
    name: 'Write',
    description: 'Full CRUD on all data and settings (no admin operations)',
    scopes: [
      'matters:read',
      'matters:write',
      'matters:delete',
      'notes:read',
      'notes:write',
      'notes:delete',
      'attachments:read',
      'attachments:write',
      'attachments:delete',
      'audit:read',
      'analytics:read',
      'settings:read',
      'settings:write',
      'backup:read',
      'backup:write'
      // Explicitly excludes: users:*, sessions:*, api-keys:*, data:*, admin:full
    ]
  },

  // Everything
  'full-admin': {
    name: 'Full Admin',
    description: 'Full admin access (all permissions)',
    scopes: ['admin:full']
  }
};

/**
 * Route to scope mapping
 * Maps HTTP method + path pattern to required scope
 */
export const ROUTE_SCOPES = {
  // Dashboard & Analytics
  'GET /admin/api/dashboard': 'analytics:read',
  'GET /admin/api/analytics': 'analytics:read',

  // Matters
  'GET /admin/api/matters': 'matters:read',
  'GET /admin/api/matters/export': 'matters:read',
  'POST /admin/api/matters': 'matters:write',
  'POST /admin/api/matters/bulk': 'matters:write',
  'GET /admin/api/matters/:id': 'matters:read',
  'GET /admin/api/matters/:id/timeline': 'matters:read',
  'PUT /admin/api/matters/:id': 'matters:write',
  'DELETE /admin/api/matters/:id': 'matters:delete',
  'DELETE /admin/api/matters/bulk': 'matters:delete',

  // Private Notes
  'GET /admin/api/matters/:matterId/notes': 'notes:read',
  'POST /admin/api/matters/:matterId/notes': 'notes:write',
  'PUT /admin/api/notes/:noteId': 'notes:write',
  'DELETE /admin/api/notes/:noteId': 'notes:delete',

  // Attachments
  'GET /admin/api/matters/:matterId/attachments': 'attachments:read',
  'POST /admin/api/matters/:matterId/attachments': 'attachments:write',
  'GET /admin/api/attachments/:attachmentId/download': 'attachments:read',
  'GET /admin/api/attachments/:attachmentId/presigned-url': 'attachments:read',
  'PUT /admin/api/attachments/:attachmentId': 'attachments:write',
  'DELETE /admin/api/attachments/:attachmentId': 'attachments:delete',

  // Settings
  'GET /admin/api/settings': 'settings:read',
  'PUT /admin/api/settings/:key': 'settings:write',
  'PUT /admin/api/settings/drain': 'settings:write',
  'PUT /admin/api/settings/lifetime-spent': 'settings:write',
  'PUT /admin/api/settings/last-matter-date': 'settings:write',
  'POST /admin/api/settings/claude-api-key/validate-and-save': 'settings:write',
  'DELETE /admin/api/settings/claude-api-key': 'settings:write',

  // Storage
  'GET /admin/api/storage': 'settings:read',
  'PUT /admin/api/settings/storage': 'settings:write',
  'POST /admin/api/settings/storage/test': 'settings:write',
  'GET /admin/api/settings/storage/migration': 'settings:read',
  'POST /admin/api/settings/storage/migrate': 'settings:write',

  // AI/Claude
  'GET /admin/api/claude/models': 'settings:read',
  'PUT /admin/api/settings/ai': 'settings:write',
  'PUT /admin/api/settings/ai/type': 'settings:write',
  'POST /admin/api/settings/ai/apply-default-to-all': 'settings:write',
  'POST /admin/api/claude/preview-descriptions': 'settings:read',

  // Audit Log
  'GET /admin/api/audit-log': 'audit:read',
  'GET /admin/api/audit-log/filters': 'audit:read',
  'GET /admin/api/audit-log/stats': 'audit:read',
  'GET /admin/api/audit-log/export': 'audit:read',
  'GET /admin/api/audit-log/:id': 'audit:read',

  // Backup & Restore
  'GET /admin/api/backup/stats': 'backup:read',
  'POST /admin/api/backup': 'backup:write',
  'POST /admin/api/backup/preview': 'backup:read',
  'POST /admin/api/restore': 'backup:write',

  // Data Management
  'GET /admin/api/data/samples': 'data:generate',
  'POST /admin/api/data/populate-sample': 'data:generate',
  'POST /admin/api/data/regenerate-samples': 'data:generate',
  'POST /admin/api/data/populate-audit-log': 'data:generate',
  'POST /admin/api/data/wipe-matters': 'data:wipe',
  'POST /admin/api/data/wipe-matters-and-settings': 'data:wipe',
  'POST /admin/api/data/wipe': 'data:wipe',
  'POST /admin/api/data/wipe-audit-log': 'data:wipe',

  // Users
  'GET /admin/api/users': 'users:read',
  'POST /admin/api/users': 'users:write',
  'PUT /admin/api/users/:id': 'users:write',
  'DELETE /admin/api/users/:id': 'users:delete',

  // Sessions
  'GET /admin/api/sessions': 'sessions:read',
  'DELETE /admin/api/sessions/:id': 'sessions:delete',

  // API Keys
  'GET /admin/api/api-keys': 'api-keys:read',
  'POST /admin/api/api-keys': 'api-keys:write',
  'DELETE /admin/api/api-keys/:id': 'api-keys:delete',

  // Watchdog (admin only)
  'GET /admin/api/watchdog/status': 'admin:full',
  'POST /admin/api/watchdog/restart': 'admin:full',
  'GET /admin/api/watchdog/changes': 'admin:full'
};

/**
 * Validate that a scope string is valid
 * @param {string} scope - Scope to validate
 * @returns {boolean} True if valid
 */
export function isValidScope(scope) {
  return scope in SCOPES;
}

/**
 * Validate an array of scopes
 * @param {string[]} scopes - Array of scopes to validate
 * @returns {{ valid: boolean, invalid: string[] }} Validation result
 */
export function validateScopes(scopes) {
  if (!Array.isArray(scopes)) {
    return { valid: false, invalid: ['not an array'] };
  }
  const invalid = scopes.filter(s => !isValidScope(s));
  return { valid: invalid.length === 0, invalid };
}

/**
 * Check if a set of scopes grants access to a required scope
 * @param {string[]} grantedScopes - Scopes the API key has
 * @param {string} requiredScope - Scope needed for the operation
 * @returns {boolean} True if access is granted
 */
export function hasScope(grantedScopes, requiredScope) {
  // admin:full grants all permissions
  if (grantedScopes.includes('admin:full')) {
    return true;
  }
  // Check for exact scope match
  return grantedScopes.includes(requiredScope);
}

/**
 * Expand a preset name to its scopes
 * @param {string} presetName - Name of the preset
 * @returns {string[]|null} Array of scopes or null if preset not found
 */
export function expandPreset(presetName) {
  const preset = SCOPE_PRESETS[presetName];
  return preset ? [...preset.scopes] : null;
}

/**
 * Determine if a scope list matches a preset
 * @param {string[]} scopes - Array of scopes
 * @returns {string|null} Preset name or null if custom
 */
export function matchPreset(scopes) {
  if (!Array.isArray(scopes)) return null;

  for (const [presetName, preset] of Object.entries(SCOPE_PRESETS)) {
    if (scopes.length === preset.scopes.length &&
        scopes.every(s => preset.scopes.includes(s)) &&
        preset.scopes.every(s => scopes.includes(s))) {
      return presetName;
    }
  }
  return null;
}

/**
 * Get display name for scopes (preset name or count)
 * @param {string[]} scopes - Array of scopes
 * @returns {string} Display name
 */
export function getScopesDisplayName(scopes) {
  if (!Array.isArray(scopes)) return 'Unknown';

  const preset = matchPreset(scopes);
  if (preset) {
    return SCOPE_PRESETS[preset].name;
  }

  // Check for admin:full specifically
  if (scopes.length === 1 && scopes[0] === 'admin:full') {
    return 'Full Admin';
  }

  return `${scopes.length} scopes`;
}

/**
 * Normalize a route path for matching (replace :param with :id)
 * @param {string} path - Route path
 * @returns {string} Normalized path
 */
export function normalizeRoutePath(path) {
  // Replace named params with generic :id
  return path.replace(/:\w+/g, ':id');
}

/**
 * Get required scope for a route
 * @param {string} method - HTTP method
 * @param {string} path - Route path
 * @returns {string|null} Required scope or null if not found
 */
export function getRouteScope(method, path) {
  const normalizedPath = normalizeRoutePath(path);
  const key = `${method.toUpperCase()} ${normalizedPath}`;

  // Try exact match first
  if (ROUTE_SCOPES[key]) {
    return ROUTE_SCOPES[key];
  }

  // Try with different param names
  for (const [routeKey, scope] of Object.entries(ROUTE_SCOPES)) {
    const normalizedRouteKey = routeKey.replace(/:\w+/g, ':id');
    if (normalizedRouteKey === key) {
      return scope;
    }
  }

  return null;
}

/**
 * Group scopes by category for display
 * @returns {Object} Scopes grouped by category
 */
export function getScopesGrouped() {
  return {
    'Matters': {
      'matters:read': SCOPES['matters:read'],
      'matters:write': SCOPES['matters:write'],
      'matters:delete': SCOPES['matters:delete']
    },
    'Private Notes': {
      'notes:read': SCOPES['notes:read'],
      'notes:write': SCOPES['notes:write'],
      'notes:delete': SCOPES['notes:delete']
    },
    'Attachments': {
      'attachments:read': SCOPES['attachments:read'],
      'attachments:write': SCOPES['attachments:write'],
      'attachments:delete': SCOPES['attachments:delete']
    },
    'Audit Log': {
      'audit:read': SCOPES['audit:read']
    },
    'Analytics': {
      'analytics:read': SCOPES['analytics:read']
    },
    'Settings': {
      'settings:read': SCOPES['settings:read'],
      'settings:write': SCOPES['settings:write']
    },
    'Backup': {
      'backup:read': SCOPES['backup:read'],
      'backup:write': SCOPES['backup:write']
    },
    'Data Management': {
      'data:generate': SCOPES['data:generate'],
      'data:wipe': SCOPES['data:wipe']
    },
    'Users (Admin)': {
      'users:read': SCOPES['users:read'],
      'users:write': SCOPES['users:write'],
      'users:delete': SCOPES['users:delete']
    },
    'Sessions (Admin)': {
      'sessions:read': SCOPES['sessions:read'],
      'sessions:delete': SCOPES['sessions:delete']
    },
    'API Keys (Admin)': {
      'api-keys:read': SCOPES['api-keys:read'],
      'api-keys:write': SCOPES['api-keys:write'],
      'api-keys:delete': SCOPES['api-keys:delete']
    },
    'Full Access': {
      'admin:full': SCOPES['admin:full']
    }
  };
}
