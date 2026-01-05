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
        const config = {
            credentials: 'same-origin', // Include cookies
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP ${response.status}`);
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

    async exportMatters(format = 'csv') {
        const response = await fetch(`${this.baseURL}/matters/export?format=${format}`, {
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

    async populateSampleData(source, count) {
        return this.request('/data/populate-sample', {
            method: 'POST',
            body: JSON.stringify({ source, count })
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
}

// Create singleton instance
const api = new AdminAPI();

export default api;
