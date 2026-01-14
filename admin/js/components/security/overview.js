/**
 * Security Overview Page
 * Legacy API Key and Public API Access settings
 */

import api from '../../api.js';
import { showConfirm } from '../../modal.js';
import { showToast } from './shared.js';

export async function renderOverview(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        const { settings } = await api.getSettings();

        container.innerHTML = `
            <div class="mb-4">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Security Overview</h1>
                <p class="text-gray-600 dark:text-gray-400">Legacy API key and public API access settings</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Legacy Server API Key -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Server API Key (Legacy)</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Key</label>
                            <div class="flex gap-2">
                                <input type="password" id="api-key-display" value="${settings.api_key || 'Not set'}" readonly class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <button id="toggle-api-key" class="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:text-white">Show</button>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button id="copy-api-key" class="flex-1 text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg px-4 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600">Copy</button>
                            <button id="regenerate-api-key" class="flex-1 text-white bg-orange-600 hover:bg-orange-700 rounded-lg px-4 py-2 text-sm">Regenerate</button>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400">Legacy server-wide API key for the public API. Use <a href="#/security/api-keys" class="text-blue-600 hover:text-blue-800 dark:text-blue-400">External API Keys</a> for admin API access with better security and auditability.</p>
                    </div>
                </div>

                <!-- Public API Authentication Settings -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Public API Access</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">Controls access to the public API endpoints (/api/*). Does not affect admin panel access.</p>
                    <div class="space-y-4">
                        <div>
                            <label class="flex items-center cursor-pointer">
                                <input type="checkbox" id="require-auth" ${settings.require_auth === 'true' ? 'checked' : ''} class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
                                <span class="ml-2 text-sm font-medium text-gray-900 dark:text-white">Require Authentication</span>
                            </label>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">When enabled, public API write requests require the legacy server API key or IP whitelist.</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">IP Whitelist (comma-separated)</label>
                            <input type="text" id="ip-whitelist" value="${settings.ip_whitelist || ''}" placeholder="127.0.0.1, 192.168.1.1" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Allow public API access from these IP addresses without requiring the legacy API key.</p>
                        </div>
                        <button id="save-auth-btn" class="w-full text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm">Save Auth Settings</button>
                    </div>
                </div>

                <!-- Quick Links -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
                    <div class="space-y-3">
                        <a href="#/security/api-keys" class="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clip-rule="evenodd"></path>
                            </svg>
                            <div>
                                <div class="font-medium text-gray-900 dark:text-white">External API Keys</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">Manage API keys for external integrations</div>
                            </div>
                            <svg class="w-4 h-4 ml-auto text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                            </svg>
                        </a>
                        <a href="#/security/account" class="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
                            </svg>
                            <div>
                                <div class="font-medium text-gray-900 dark:text-white">Account Settings</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">Change password and account preferences</div>
                            </div>
                            <svg class="w-4 h-4 ml-auto text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                            </svg>
                        </a>
                    </div>
                </div>

                <!-- Storage Settings Link -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">File Storage</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Storage settings are located in the Data Management section.
                    </p>
                    <a href="#/data-management/backup" class="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"></path>
                            <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"></path>
                            <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"></path>
                        </svg>
                        Go to Backup & Storage
                        <svg class="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </a>
                </div>
            </div>
        `;

        setupEventListeners(settings);

    } catch (error) {
        container.innerHTML = `
            <div class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
                <span class="font-medium">Error!</span> Failed to load security settings: ${error.message}
            </div>
        `;
    }
}

function setupEventListeners(currentSettings) {
    // Legacy API Key management
    document.getElementById('toggle-api-key')?.addEventListener('click', (e) => {
        const input = document.getElementById('api-key-display');
        if (input.type === 'password') {
            input.type = 'text';
            e.target.textContent = 'Hide';
        } else {
            input.type = 'password';
            e.target.textContent = 'Show';
        }
    });

    document.getElementById('copy-api-key')?.addEventListener('click', () => {
        const input = document.getElementById('api-key-display');
        navigator.clipboard.writeText(input.value);
        showToast('API key copied to clipboard', 'success');
    });

    document.getElementById('regenerate-api-key')?.addEventListener('click', async () => {
        const confirmed = await showConfirm('Are you sure you want to regenerate the legacy API key? The old key will stop working.', {
            title: 'Regenerate Legacy API Key',
            confirmText: 'Regenerate',
            cancelText: 'Cancel',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            const response = await api.generateApiKey();
            document.getElementById('api-key-display').value = response.api_key;
            showToast('Legacy API key regenerated successfully', 'success');
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });

    // Auth settings
    document.getElementById('save-auth-btn')?.addEventListener('click', async () => {
        try {
            const requireAuth = document.getElementById('require-auth').checked;
            const ipWhitelist = document.getElementById('ip-whitelist').value;

            await api.updateSetting('require_auth', requireAuth.toString());
            await api.updateSetting('ip_whitelist', ipWhitelist);

            showToast('Auth settings saved successfully', 'success');
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });
}
