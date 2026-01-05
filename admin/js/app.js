/**
 * Main Application Entry Point
 */

import auth from './auth.js';
import router from './router.js';
import api from './api.js';
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
