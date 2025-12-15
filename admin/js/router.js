/**
 * Client-Side Router
 * Hash-based routing for SPA navigation
 */

import auth from './auth.js';
import { renderDashboard } from './components/dashboard.js';
import { renderMatters } from './components/matters.js';
import { renderAnalytics } from './components/analytics.js';
import { renderSettings } from './components/settings.js';

class Router {
    constructor() {
        this.routes = {
            '/dashboard': renderDashboard,
            '/matters': renderMatters,
            '/analytics': renderAnalytics,
            '/settings': renderSettings
        };
        this.defaultRoute = '/dashboard';
    }

    init() {
        // Handle initial load
        window.addEventListener('load', () => this.handleRoute());

        // Handle hash changes
        window.addEventListener('hashchange', () => this.handleRoute());

        // Handle navigation links
        document.addEventListener('click', (e) => {
            if (e.target.matches('.nav-link') || e.target.closest('.nav-link')) {
                const link = e.target.matches('.nav-link') ? e.target : e.target.closest('.nav-link');
                this.updateActiveLink(link);
            }
        });
    }

    async handleRoute() {
        // Check authentication first
        if (!auth.isAuthenticated) {
            const isAuth = await auth.checkAuth();
            if (!isAuth) {
                this.showLogin();
                return;
            }
        }

        // Show admin layout
        this.showAdminLayout();

        // Update user info in header
        this.updateUserInfo();

        // Get current route
        const hash = window.location.hash.slice(1) || this.defaultRoute;
        const route = this.routes[hash] || this.routes[this.defaultRoute];

        // Update active nav link
        this.updateActiveLink();

        // Render the route
        const contentArea = document.getElementById('main-content');
        if (contentArea && route) {
            try {
                await route(contentArea);
            } catch (error) {
                console.error('Route render error:', error);
                contentArea.innerHTML = `
                    <div class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
                        <span class="font-medium">Error!</span> Failed to load content: ${error.message}
                    </div>
                `;
            }
        }
    }

    showLogin() {
        document.getElementById('login-page').classList.remove('hidden');
        document.getElementById('admin-layout').classList.add('hidden');
    }

    showAdminLayout() {
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('admin-layout').classList.remove('hidden');
    }

    updateUserInfo() {
        const user = auth.getUser();
        if (user) {
            const userNameEl = document.getElementById('user-name');
            const userEmailEl = document.getElementById('user-email');
            const userInitialsEl = document.getElementById('user-initials');

            if (userNameEl) userNameEl.textContent = user.username;
            if (userEmailEl) userEmailEl.textContent = user.email || '';
            if (userInitialsEl) userInitialsEl.textContent = auth.getUserInitials();
        }
    }

    updateActiveLink(clickedLink = null) {
        const hash = window.location.hash.slice(1) || this.defaultRoute;
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            const linkHash = link.getAttribute('href').slice(1);
            if (linkHash === hash) {
                link.classList.add('active', 'bg-gray-100', 'dark:bg-gray-700');
            } else {
                link.classList.remove('active', 'bg-gray-100', 'dark:bg-gray-700');
            }
        });
    }

    navigate(path) {
        window.location.hash = path;
    }
}

// Create singleton instance
const router = new Router();

export default router;
