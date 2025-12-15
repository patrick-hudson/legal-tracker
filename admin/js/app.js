/**
 * Main Application Entry Point
 */

import auth from './auth.js';
import router from './router.js';
import api from './api.js';

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

    if (!confirm('Are you sure you want to log out?')) {
        return;
    }

    try {
        await auth.logout();
        window.location.hash = '';
        window.location.reload();
    } catch (error) {
        console.error('Logout error:', error);
        // Force logout anyway
        window.location.hash = '';
        window.location.reload();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
