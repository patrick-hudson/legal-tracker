/**
 * Account Settings Page
 * Change password and account preferences
 */

import api from '../../api.js';
import auth from '../../auth.js';
import { showToast } from './shared.js';

export async function renderAccount(container) {
    const user = auth.getUser();

    container.innerHTML = `
        <div class="mb-4">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
            <p class="text-gray-600 dark:text-gray-400">Manage your account security and preferences</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Account Info -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Information</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                        <p class="text-gray-900 dark:text-white font-medium">${user?.username || 'Unknown'}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <p class="text-gray-900 dark:text-white">${user?.email || 'Not set'}</p>
                    </div>
                </div>
            </div>

            <!-- Change Password -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Password</h3>
                <form id="change-password-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Password</label>
                        <input type="password" name="current" required class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                        <input type="password" name="new" required minlength="8" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Minimum 8 characters, with at least 3 of: uppercase, lowercase, number, special character</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                        <input type="password" name="confirm" required minlength="8" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                    <button type="submit" class="w-full text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-6 py-2 text-sm">Change Password</button>
                </form>
            </div>

            <!-- Session Info -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Session</h3>
                <div class="space-y-4">
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        You are currently logged in. Your session is secured with HTTP-only cookies.
                    </p>
                    <button id="logout-btn" class="w-full text-white bg-red-600 hover:bg-red-700 rounded-lg px-4 py-2 text-sm">
                        Sign Out
                    </button>
                </div>
            </div>

            <!-- Security Tips -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Security Tips</h3>
                <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li class="flex items-start">
                        <svg class="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        Use a strong, unique password for this account
                    </li>
                    <li class="flex items-start">
                        <svg class="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        Use <a href="#/security/api-keys" class="text-blue-600 hover:text-blue-800 dark:text-blue-400">External API Keys</a> instead of sharing your password for integrations
                    </li>
                    <li class="flex items-start">
                        <svg class="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        Review the <a href="#/audit-log" class="text-blue-600 hover:text-blue-800 dark:text-blue-400">Audit Log</a> regularly for suspicious activity
                    </li>
                    <li class="flex items-start">
                        <svg class="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        Sign out when finished if using a shared computer
                    </li>
                </ul>
            </div>
        </div>
    `;

    setupEventListeners();
}

function setupEventListeners() {
    // Change password
    document.getElementById('change-password-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const current = formData.get('current');
        const newPassword = formData.get('new');
        const confirm = formData.get('confirm');

        if (newPassword !== confirm) {
            showToast('Passwords do not match', 'error');
            return;
        }

        try {
            const username = auth.getUser()?.username;
            if (!username) {
                throw new Error('User not authenticated');
            }
            const hashedCurrentPassword = await auth.hashPassword(username, current);
            const hashedNewPassword = await auth.hashPassword(username, newPassword);

            const response = await api.changePassword(hashedCurrentPassword, hashedNewPassword);

            showToast(response.message || 'Password changed successfully. Redirecting to login...', 'success');
            e.target.reset();

            auth.currentUser = null;
            auth.isAuthenticated = false;

            setTimeout(() => {
                window.location.href = '/admin';
            }, 2000);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });

    // Logout button
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        try {
            await auth.logout();
            window.location.href = '/admin';
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });
}
