/**
 * Users API Methods
 * User and session management
 */

export const userMethods = {
    // Users
    async getUsers() {
        return this.request('/users');
    },

    async createUser(data) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateUser(id, data) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deactivateUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    },

    // Sessions
    async getSessions() {
        return this.request('/sessions');
    },

    async invalidateSession(id) {
        return this.request(`/sessions/${id}`, {
            method: 'DELETE'
        });
    }
};

export const apiKeyMethods = {
    async getApiKeys() {
        return this.request('/api-keys');
    },

    async getApiKeyScopes() {
        return this.request('/api-keys/scopes');
    },

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
    },

    async revokeApiKey(id) {
        return this.request(`/api-keys/${id}`, {
            method: 'DELETE'
        });
    }
};
