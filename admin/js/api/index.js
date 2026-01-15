/**
 * Admin API Client
 * Centralized API calls with error handling
 *
 * Combines domain-specific methods from:
 * - auth.js: Authentication and bootstrap
 * - matters.js: Matter CRUD
 * - notes.js: Private notes CRUD
 * - attachments.js: File attachments
 * - settings.js: App settings, storage, AI config
 * - users.js: Users, sessions, API keys
 * - data.js: Sample data, wipe, backup, audit log
 */

import { authMethods, bootstrapMethods } from './auth.js';
import { matterMethods } from './matters.js';
import { noteMethods } from './notes.js';
import { attachmentMethods } from './attachments.js';
import { settingsMethods } from './settings.js';
import { userMethods, apiKeyMethods } from './users.js';
import { dataMethods, backupMethods, auditLogMethods } from './data.js';

class AdminAPI {
    constructor() {
        this.baseURL = '/admin/api';
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        // Only set Content-Type for requests with a body
        const headers = { ...options.headers };
        if (options.body) {
            headers['Content-Type'] = 'application/json';
        }

        const config = {
            credentials: 'same-origin', // Include cookies
            headers,
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            // Handle network errors
            if (error.message === 'Failed to fetch') {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    }
}

// Mix in all domain methods
Object.assign(AdminAPI.prototype, authMethods);
Object.assign(AdminAPI.prototype, bootstrapMethods);
Object.assign(AdminAPI.prototype, matterMethods);
Object.assign(AdminAPI.prototype, noteMethods);
Object.assign(AdminAPI.prototype, attachmentMethods);
Object.assign(AdminAPI.prototype, settingsMethods);
Object.assign(AdminAPI.prototype, userMethods);
Object.assign(AdminAPI.prototype, apiKeyMethods);
Object.assign(AdminAPI.prototype, dataMethods);
Object.assign(AdminAPI.prototype, backupMethods);
Object.assign(AdminAPI.prototype, auditLogMethods);

// Create singleton instance
const api = new AdminAPI();

export default api;
