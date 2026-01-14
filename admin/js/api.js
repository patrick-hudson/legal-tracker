/**
 * Admin API Client
 * Centralized API calls with error handling
 */

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

    // Authentication
    async login(username, hashedPassword) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, hashedPassword })
        });
    }

    async logout() {
        return this.request('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({})
        });
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    async changePassword(hashedCurrentPassword, hashedNewPassword) {
        return this.request('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                currentPassword: hashedCurrentPassword,
                newPassword: hashedNewPassword
            })
        });
    }

    // Dashboard
    async getDashboard() {
        return this.request('/dashboard');
    }

    // Matters
    async getMatters(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/matters${queryString ? '?' + queryString : ''}`);
    }

    async createMatter(data) {
        return this.request('/matters', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async bulkCreateMatters(matters) {
        return this.request('/matters/bulk', {
            method: 'POST',
            body: JSON.stringify({ matters })
        });
    }

    async updateMatter(id, data) {
        return this.request(`/matters/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async bulkUpdateMatters(updates) {
        return this.request('/matters/bulk', {
            method: 'PUT',
            body: JSON.stringify({ updates })
        });
    }

    async deleteMatters(ids) {
        return this.request('/matters/bulk', {
            method: 'DELETE',
            body: JSON.stringify({ ids })
        });
    }

    async deleteMatter(id) {
        return this.request(`/matters/${id}`, {
            method: 'DELETE'
        });
    }

    async getMatter(id) {
        return this.request(`/matters/${id}`);
    }

    // Private Notes
    async getPrivateNotes(matterId) {
        return this.request(`/matters/${matterId}/notes`);
    }

    async createPrivateNote(matterId, noteContent, options = {}) {
        return this.request(`/matters/${matterId}/notes`, {
            method: 'POST',
            body: JSON.stringify({
                note_content: noteContent,
                interaction_date: options.interaction_date,
                interaction_type: options.interaction_type
            })
        });
    }

    async updatePrivateNote(noteId, noteContent, options = {}) {
        return this.request(`/notes/${noteId}`, {
            method: 'PUT',
            body: JSON.stringify({
                note_content: noteContent,
                interaction_date: options.interaction_date,
                interaction_type: options.interaction_type
            })
        });
    }

    async deletePrivateNote(noteId) {
        return this.request(`/notes/${noteId}`, {
            method: 'DELETE'
        });
    }

    // Attachments
    async getAttachments(matterId) {
        return this.request(`/matters/${matterId}/attachments`);
    }

    async uploadAttachment(matterId, file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        if (options.document_date) {
            formData.append('document_date', options.document_date);
        }
        if (options.direction) {
            formData.append('direction', options.direction);
        }

        const url = `${this.baseURL}/matters/${matterId}/attachments`;
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
            // Note: Do NOT set Content-Type header - browser sets it with boundary
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || data.error || `HTTP ${response.status}`);
        }
        return data;
    }

    async downloadAttachment(attachmentId, filename) {
        // Use direct browser navigation for downloads
        // This allows the server to redirect to S3 presigned URLs without CORS issues
        // The browser handles the redirect natively and triggers the download
        const url = `${this.baseURL}/attachments/${attachmentId}/download`;

        // Create a hidden link and click it to trigger download
        // Using window.open or location.href would navigate away from the page
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    async deleteAttachment(attachmentId) {
        return this.request(`/attachments/${attachmentId}`, {
            method: 'DELETE'
        });
    }

    async updateAttachment(attachmentId, data) {
        return this.request(`/attachments/${attachmentId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async getPresignedUrl(attachmentId, expiresIn = 3600) {
        return this.request(`/attachments/${attachmentId}/presigned-url?expiresIn=${expiresIn}`);
    }

    // Timeline
    async getMatterTimeline(matterId, order = 'desc') {
        return this.request(`/matters/${matterId}/timeline?order=${order}`);
    }

    // Storage Settings
    async getStorageSettings() {
        return this.request('/settings/storage');
    }

    async updateStorageSettings(settings) {
        return this.request('/settings/storage', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }

    async testStorageConnection(type, config) {
        return this.request('/settings/storage/test', {
            method: 'POST',
            body: JSON.stringify({ type, config })
        });
    }

    async getStorageMigrationStatus() {
        return this.request('/settings/storage/migration');
    }

    async migrateStorage(direction, deleteSource = false, archiveSource = false) {
        return this.request('/settings/storage/migrate', {
            method: 'POST',
            body: JSON.stringify({ direction, deleteSource, archiveSource })
        });
    }

    async exportMatters(options = {}) {
        const { ids, includePrivateNotes, format = 'csv' } = options;
        const params = new URLSearchParams();

        if (format) params.set('format', format);
        if (ids && ids.length > 0) params.set('ids', ids.join(','));
        if (includePrivateNotes) params.set('includePrivateNotes', 'true');

        const queryString = params.toString();
        const response = await fetch(`${this.baseURL}/matters/export${queryString ? '?' + queryString : ''}`, {
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        return response.blob();
    }

    // Settings
    async getSettings() {
        return this.request('/settings');
    }

    async updateSetting(key, value) {
        return this.request(`/settings/${key}`, {
            method: 'PUT',
            body: JSON.stringify({ value })
        });
    }

    async generateApiKey() {
        return this.request('/settings/api-key/generate', {
            method: 'POST'
        });
    }

    // Claude API key management
    async validateAndSaveClaudeApiKey(apiKey) {
        return this.request('/settings/claude-api-key/validate-and-save', {
            method: 'POST',
            body: JSON.stringify({ apiKey })
        });
    }

    async clearClaudeApiKey() {
        return this.request('/settings/claude-api-key', {
            method: 'DELETE'
        });
    }

    // Claude models
    async getClaudeModels() {
        return this.request('/claude/models');
    }

    // AI settings (model, spice level, custom prompt)
    async saveAiSettings({ model, spiceLevel, customPrompt }) {
        return this.request('/settings/ai', {
            method: 'PUT',
            body: JSON.stringify({ model, spiceLevel, customPrompt })
        });
    }

    // Per-type AI settings
    async saveAiSettingsForType(type, { spiceLevel, customPrompt }) {
        return this.request('/settings/ai/type', {
            method: 'PUT',
            body: JSON.stringify({ type, spiceLevel, customPrompt })
        });
    }

    // Reset a type's settings to use defaults
    async resetAiSettingsForType(type) {
        return this.request('/settings/ai/type', {
            method: 'PUT',
            body: JSON.stringify({ type, spiceLevel: '', customPrompt: '' })
        });
    }

    // Apply default spice level to all types
    async applyDefaultToAllTypes() {
        return this.request('/settings/ai/apply-default-to-all', {
            method: 'POST',
            body: JSON.stringify({})
        });
    }

    // Preview AI descriptions
    async previewAiDescriptions({ count = 5, spiceLevel, customPrompt }) {
        return this.request('/claude/preview-descriptions', {
            method: 'POST',
            body: JSON.stringify({ count, spiceLevel, customPrompt })
        });
    }

    // Analytics
    async getAnalytics(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/analytics${queryString ? '?' + queryString : ''}`);
    }

    // Users
    async getUsers() {
        return this.request('/users');
    }

    async createUser(data) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateUser(id, data) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deactivateUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }

    // Sessions
    async getSessions() {
        return this.request('/sessions');
    }

    async invalidateSession(id) {
        return this.request(`/sessions/${id}`, {
            method: 'DELETE'
        });
    }

    // Data management
    async listSampleDatasets() {
        return this.request('/data/samples');
    }

    async populateSampleData(source, options = {}) {
        const {
            count,
            startDate,
            endDate,
            minCostDollars,
            maxCostDollars,
            wholeDollarsOnly,
            useAiDescriptions,
            spiceLevelOverride,
            // Private notes options
            generatePrivateNotes,
            notesPercentage,
            minNotesPerMatter,
            maxNotesPerMatter,
            // Attachment generation options
            generateAttachments,
            attachmentsPercentage,
            // Lawyer/counsel options
            lawyerPercentage,
            opposingCounselPercentage,
            caseNumberPercentage
        } = options;

        return this.request('/data/populate-sample', {
            method: 'POST',
            body: JSON.stringify({
                source,
                count,
                startDate,
                endDate,
                minCostDollars,
                maxCostDollars,
                wholeDollarsOnly,
                useAiDescriptions,
                spiceLevelOverride,
                generatePrivateNotes,
                notesPercentage,
                minNotesPerMatter,
                maxNotesPerMatter,
                generateAttachments,
                attachmentsPercentage,
                lawyerPercentage,
                opposingCounselPercentage,
                caseNumberPercentage
            })
        });
    }

    async regenerateSampleFiles() {
        return this.request('/data/regenerate-samples', {
            method: 'POST',
            body: JSON.stringify({})
        });
    }

    async wipeMatters(confirmation) {
        return this.request('/data/wipe-matters', {
            method: 'POST',
            body: JSON.stringify({ confirmation })
        });
    }

    async wipeMattersAndSettings(confirmation) {
        return this.request('/data/wipe-matters-and-settings', {
            method: 'POST',
            body: JSON.stringify({ confirmation })
        });
    }

    async wipeAllData(confirmation) {
        return this.request('/data/wipe', {
            method: 'POST',
            body: JSON.stringify({ confirmation })
        });
    }

    async wipeAuditLog(confirmation) {
        return this.request('/data/wipe-audit-log', {
            method: 'POST',
            body: JSON.stringify({ confirmation })
        });
    }

    // Backup & Restore

    async getBackupStats() {
        return this.request('/backup/stats');
    }

    async createBackup(options = {}) {
        const { includeAttachments = true, includeAuditLog = false, s3Mode = 'full' } = options;

        const response = await fetch(`${this.baseURL}/backup`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ includeAttachments, includeAuditLog, s3Mode })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        // Return blob for download
        const blob = await response.blob();
        const filename = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'backup.zip';
        return { blob, filename };
    }

    async previewBackup(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.baseURL}/backup/preview`, {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || data.error || `HTTP ${response.status}`);
        }
        return data;
    }

    async restoreBackup(file, confirmation) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('confirmation', confirmation);

        const response = await fetch(`${this.baseURL}/restore`, {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || data.error || `HTTP ${response.status}`);
        }
        return data;
    }

    // Bootstrap methods
    async getBootstrapStatus() {
        // No auth required for bootstrap status
        const response = await fetch('/admin/api/bootstrap/status');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    }

    async requestBootstrapToken() {
        // No auth required - generates a new bootstrap token if needed
        const response = await fetch('/admin/api/bootstrap/request-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return response.json();
    }

    async bootstrapSetup(token, username, password) {
        // No auth required for bootstrap setup
        const response = await fetch('/admin/api/bootstrap/setup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token, username, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // Audit Log
    async getAuditLog(params = {}) {
        // Filter out undefined/null values to avoid sending "undefined" as string
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v != null)
        );
        const queryString = new URLSearchParams(cleanParams).toString();
        return this.request(`/audit-log${queryString ? `?${queryString}` : ''}`);
    }

    async getAuditLogEntry(id) {
        return this.request(`/audit-log/${id}`);
    }

    async getAuditLogFilters() {
        return this.request('/audit-log/filters');
    }

    async getAuditLogStats() {
        return this.request('/audit-log/stats');
    }

    async exportAuditLog(params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v != null)
        );
        const queryString = new URLSearchParams(cleanParams).toString();
        const response = await fetch(`${this.baseURL}/audit-log/export${queryString ? `?${queryString}` : ''}`, {
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        return response.blob();
    }

    async populateAuditLogSampleData(options = {}) {
        const { count, startDate, endDate, useAi, spiceLevelOverride } = options;
        return this.request('/data/populate-audit-log', {
            method: 'POST',
            body: JSON.stringify({ count, startDate, endDate, useAi, spiceLevelOverride })
        });
    }

    // External API Keys (for programmatic access)
    async getApiKeys() {
        return this.request('/api-keys');
    }

    async getApiKeyScopes() {
        return this.request('/api-keys/scopes');
    }

    async createApiKey(name, expiresInDays = null, { preset = null, scopes = null } = {}) {
        const body = { name, expires_in_days: expiresInDays };
        if (preset) {
            body.preset = preset;
        } else if (scopes && scopes.length > 0) {
            body.scopes = scopes;
        }
        return this.request('/api-keys', {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    async revokeApiKey(id) {
        return this.request(`/api-keys/${id}`, {
            method: 'DELETE'
        });
    }
}

// Create singleton instance
const api = new AdminAPI();

export default api;
