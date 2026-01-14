/**
 * Client-Side Router
 * Hash-based routing for SPA navigation
 */

import auth from './auth.js';
import { renderDashboard } from './components/dashboard.js';
import { renderMatters } from './components/matters.js';
import { renderMatterDetail } from './components/matter-detail.js';
import { renderAnalytics } from './components/analytics.js';
import { renderSecurity } from './components/security.js';
import { renderTrackerSettings } from './components/tracker-settings.js';
import { renderDataManagement } from './components/data-management/index.js';
import { renderSystemInfo } from './components/system-info.js';
import { renderAuditLog } from './components/audit-log.js';

class Router {
    constructor() {
        this.routes = {
            '/dashboard': renderDashboard,
            '/matters': renderMatters,
            '/analytics': renderAnalytics,
            '/security': renderSecurity,
            '/tracker-settings': renderTrackerSettings,
            '/system-info': renderSystemInfo,
            '/audit-log': renderAuditLog
        };
        // Dynamic routes with patterns
        this.dynamicRoutes = [
            { pattern: /^\/matters\/(\d+)$/, handler: renderMatterDetail },
            // Data management sub-routes
            { pattern: /^\/data-management(\/.*)?$/, handler: (container, params) => renderDataManagement(container, params?.[0] ?? '') }
        ];
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
                await this.showLogin();
                return;
            }
        }

        // Show admin layout
        this.showAdminLayout();

        // Update user info in header
        this.updateUserInfo();

        // Get current route
        const hash = window.location.hash.slice(1) || this.defaultRoute;

        // Update active nav link
        this.updateActiveLink();

        // Check for static route first
        let route = this.routes[hash];
        let params = null;

        // If no static route, check dynamic routes
        if (!route) {
            for (const dynamicRoute of this.dynamicRoutes) {
                const match = hash.match(dynamicRoute.pattern);
                if (match) {
                    route = dynamicRoute.handler;
                    params = match.slice(1); // Capture groups as params
                    break;
                }
            }
        }

        // Fall back to default route
        if (!route) {
            route = this.routes[this.defaultRoute];
        }

        // Render the route
        const contentArea = document.getElementById('main-content');
        if (contentArea && route) {
            try {
                await route(contentArea, params);
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

    async showLogin() {
        // Validate and clear any stale tokens before showing login
        try {
            const response = await fetch('/admin/api/auth/validate', {
                credentials: 'include'
            });
            const result = await response.json();
            // If token was cleared, the server will set the cookie removal header
            // No action needed here - just ensuring stale tokens are cleaned up
        } catch (e) {
            // Validation endpoint unavailable - continue showing login
        }

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
            // Check for exact match or parent match (e.g., /data-management is parent of /data-management/ai)
            const isExactMatch = linkHash === hash;
            const isParentMatch = linkHash && hash.startsWith(linkHash + '/');

            if (isExactMatch || isParentMatch) {
                link.classList.add('active', 'bg-gray-100', 'dark:bg-gray-700');
            } else {
                link.classList.remove('active', 'bg-gray-100', 'dark:bg-gray-700');
            }
        });

        // Handle collapsible menu expansion for data-management routes
        if (hash.startsWith('/data-management')) {
            const dmSubmenu = document.getElementById('dm-submenu');
            const dmToggle = document.getElementById('dm-toggle');
            const dmChevron = document.getElementById('dm-chevron');
            if (dmSubmenu && !dmSubmenu.classList.contains('block')) {
                dmSubmenu.classList.remove('hidden');
                dmSubmenu.classList.add('block');
                dmToggle?.setAttribute('aria-expanded', 'true');
                dmChevron?.classList.add('rotate-180');
            }
        }
    }

    navigate(path) {
        window.location.hash = path;
    }
}

// Create singleton instance
const router = new Router();

export default router;
