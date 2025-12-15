/**
 * Authentication State Management
 */

import api from './api.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.passwordSalt = null;
    }

    async getPasswordSalt() {
        if (!this.passwordSalt) {
            try {
                const response = await fetch('/api/config');
                const config = await response.json();
                this.passwordSalt = config.passwordSalt;
            } catch (error) {
                console.error('Failed to fetch password salt:', error);
                throw new Error('Unable to fetch configuration');
            }
        }
        return this.passwordSalt;
    }

    async hashPassword(username, password) {
        const salt = await this.getPasswordSalt();
        const message = username + ':' + password + ':' + salt;
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    async checkAuth() {
        try {
            const response = await api.getCurrentUser();
            if (response.user) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                return true;
            }
        } catch (error) {
            this.currentUser = null;
            this.isAuthenticated = false;
        }
        return false;
    }

    async login(username, password) {
        try {
            // Hash password client-side before sending
            const hashedPassword = await this.hashPassword(username, password);

            const response = await api.login(username, hashedPassword);
            if (response.success && response.user) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                return { success: true };
            }
            return { success: false, error: 'Login failed' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.currentUser = null;
            this.isAuthenticated = false;
        }
    }

    getUser() {
        return this.currentUser;
    }

    getUserInitials() {
        if (!this.currentUser) return 'A';
        const username = this.currentUser.username || 'Admin';
        return username.charAt(0).toUpperCase();
    }
}

// Create singleton instance
const auth = new AuthManager();

export default auth;
