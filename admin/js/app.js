/**
 * Main Application Entry Point
 */

import auth from './auth.js';
import router from './router.js';
import api from './api/index.js';
import { showConfirm } from './modal.js';

// Initialize the application
async function init() {
    // Set up login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Set up logout link
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }

    // Initialize router
    router.init();

    // Set up sidebar collapse toggle handlers for chevron rotation
    setupSidebarCollapseHandlers();

    // Check authentication and route
    await router.handleRoute();
}

async function handleLogin(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');

    const loginError = document.getElementById('login-error');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
        const result = await auth.login(username, password);

        if (result.success) {
            // Clear form and error
            e.target.reset();
            loginError.classList.add('hidden');

            // Navigate to dashboard
            window.location.hash = '/dashboard';
            await router.handleRoute();
        } else {
            // Show error
            loginError.textContent = result.error || 'Invalid credentials';
            loginError.classList.remove('hidden');
        }
    } catch (error) {
        loginError.textContent = error.message || 'Login failed';
        loginError.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign in';
    }
}

async function handleLogout(e) {
    e.preventDefault();

    const confirmed = await showConfirm('Are you sure you want to log out?', {
        title: 'Confirm Logout',
        confirmText: 'Log out',
        cancelText: 'Cancel',
        type: 'warning'
    });

    if (!confirmed) {
        return;
    }

    try {
        await auth.logout();
    } catch (error) {
        console.error('Logout error:', error);
    }

    // Clear local auth state
    auth.currentUser = null;
    auth.isAuthenticated = false;

    // Redirect to admin page (will show login screen)
    window.location.href = '/admin';
}

/**
 * Set up sidebar collapsible menu handlers for chevron rotation
 */
function setupSidebarCollapseHandlers() {
    // Security submenu
    const securityToggle = document.getElementById('security-toggle');
    const securityChevron = document.getElementById('security-chevron');
    const securitySubmenu = document.getElementById('security-submenu');

    if (securityToggle && securityChevron && securitySubmenu) {
        securityToggle.addEventListener('click', () => {
            const isExpanded = securitySubmenu.classList.contains('hidden');
            if (isExpanded) {
                // Opening
                securityChevron.classList.add('rotate-180');
            } else {
                // Closing
                securityChevron.classList.remove('rotate-180');
            }
        });
    }

    // Data Management submenu
    const dmToggle = document.getElementById('dm-toggle');
    const dmChevron = document.getElementById('dm-chevron');
    const dmSubmenu = document.getElementById('dm-submenu');

    if (dmToggle && dmChevron && dmSubmenu) {
        dmToggle.addEventListener('click', () => {
            const isExpanded = dmSubmenu.classList.contains('hidden');
            if (isExpanded) {
                // Opening
                dmChevron.classList.add('rotate-180');
            } else {
                // Closing
                dmChevron.classList.remove('rotate-180');
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
