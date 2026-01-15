/**
 * Auth API Methods
 * Authentication and session management
 */

export const authMethods = {
    async login(username, hashedPassword) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, hashedPassword })
        });
    },

    async logout() {
        return this.request('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({})
        });
    },

    async getCurrentUser() {
        return this.request('/auth/me');
    },

    async changePassword(hashedCurrentPassword, hashedNewPassword) {
        return this.request('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                currentPassword: hashedCurrentPassword,
                newPassword: hashedNewPassword
            })
        });
    }
};

export const bootstrapMethods = {
    async getBootstrapStatus() {
        const response = await fetch('/admin/api/bootstrap/status');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    },

    async requestBootstrapToken() {
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
    },

    async bootstrapSetup(token, username, password) {
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
};
