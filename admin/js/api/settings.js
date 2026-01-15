/**
 * Settings API Methods
 * App settings, storage, and AI configuration
 */

export const settingsMethods = {
    // General settings
    async getSettings() {
        return this.request('/settings');
    },

    async updateSetting(key, value) {
        return this.request(`/settings/${key}`, {
            method: 'PUT',
            body: JSON.stringify({ value })
        });
    },

    // Storage settings
    async getStorageSettings() {
        return this.request('/settings/storage');
    },

    async updateStorageSettings(settings) {
        return this.request('/settings/storage', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    },

    async testStorageConnection(type, config) {
        return this.request('/settings/storage/test', {
            method: 'POST',
            body: JSON.stringify({ type, config })
        });
    },

    async getStorageMigrationStatus() {
        return this.request('/settings/storage/migration');
    },

    async migrateStorage(direction, deleteSource = false, archiveSource = false) {
        return this.request('/settings/storage/migrate', {
            method: 'POST',
            body: JSON.stringify({ direction, deleteSource, archiveSource })
        });
    },

    // Claude API key management
    async validateAndSaveClaudeApiKey(apiKey) {
        return this.request('/settings/claude-api-key/validate-and-save', {
            method: 'POST',
            body: JSON.stringify({ apiKey })
        });
    },

    async clearClaudeApiKey() {
        return this.request('/settings/claude-api-key', {
            method: 'DELETE'
        });
    },

    // Claude models
    async getClaudeModels() {
        return this.request('/claude/models');
    },

    // AI settings (model, spice level, custom prompt)
    async saveAiSettings({ model, spiceLevel, customPrompt }) {
        return this.request('/settings/ai', {
            method: 'PUT',
            body: JSON.stringify({ model, spiceLevel, customPrompt })
        });
    },

    // Per-type AI settings
    async saveAiSettingsForType(type, { spiceLevel, customPrompt }) {
        return this.request('/settings/ai/type', {
            method: 'PUT',
            body: JSON.stringify({ type, spiceLevel, customPrompt })
        });
    },

    // Reset a type's settings to use defaults
    async resetAiSettingsForType(type) {
        return this.request('/settings/ai/type', {
            method: 'PUT',
            body: JSON.stringify({ type, spiceLevel: '', customPrompt: '' })
        });
    },

    // Apply default spice level to all types
    async applyDefaultToAllTypes() {
        return this.request('/settings/ai/apply-default-to-all', {
            method: 'POST',
            body: JSON.stringify({})
        });
    },

    // Preview AI descriptions
    async previewAiDescriptions({ count = 5, spiceLevel, customPrompt }) {
        return this.request('/claude/preview-descriptions', {
            method: 'POST',
            body: JSON.stringify({ count, spiceLevel, customPrompt })
        });
    }
};
