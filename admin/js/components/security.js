/**
 * Security Settings Component
 * External API Keys, Legacy API Key, Authentication, Change Password
 */

import api from '../api.js';
import auth from '../auth.js';
import { showConfirm } from '../modal.js';

let apiKeys = [];

export async function renderSecurity(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        const [{ settings }, keysResponse] = await Promise.all([
            api.getSettings(),
            api.getApiKeys()
        ]);
        apiKeys = keysResponse.keys || [];

        container.innerHTML = `
            <div class="mb-4">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Security</h1>
                <p class="text-gray-600 dark:text-gray-400">API keys, authentication, and password management</p>
            </div>

            <!-- External API Keys Section (full width) -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">External API Keys</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Create API keys for external integrations and scripts. All API key requests are logged.</p>
                    </div>
                    <button id="create-api-key-btn" class="text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium">
                        Create New Key
                    </button>
                </div>
                <div id="api-keys-table-container">
                    ${renderApiKeysTable(apiKeys)}
                </div>
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
                        <p class="text-xs text-gray-500 dark:text-gray-400">Legacy server-wide API key. Use External API Keys above for better security and auditability.</p>
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
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                            <input type="password" name="confirm" required minlength="8" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        </div>
                        <button type="submit" class="w-full text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-6 py-2 text-sm">Change Password</button>
                    </form>
                </div>

                <!-- Storage Settings Link -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">File Storage</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Storage settings have been moved to the Data Management section for better organization.
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

            <!-- Create API Key Modal -->
            <div id="create-api-key-modal" class="hidden fixed inset-0 z-50 overflow-y-auto">
                <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                    <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                    <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                        <div class="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New API Key</h3>
                            <form id="create-api-key-form" class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Name</label>
                                    <input type="text" name="name" required maxlength="100" placeholder="e.g., CI Pipeline, Zapier Integration" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">A descriptive name to identify this key's purpose.</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expiration</label>
                                    <select name="expires" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                        <option value="">Never expires</option>
                                        <option value="30">30 days</option>
                                        <option value="90">90 days</option>
                                        <option value="365">1 year</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                            <button type="submit" form="create-api-key-form" class="w-full sm:w-auto text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium">Create Key</button>
                            <button type="button" id="cancel-create-key" class="w-full sm:w-auto mt-2 sm:mt-0 text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg px-4 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Key Created Modal -->
            <div id="key-created-modal" class="hidden fixed inset-0 z-50 overflow-y-auto">
                <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                    <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                    <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                        <div class="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div class="flex items-center mb-4">
                                <div class="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-green-100 dark:bg-green-900">
                                    <svg class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </div>
                                <h3 class="ml-3 text-lg font-semibold text-gray-900 dark:text-white">API Key Created</h3>
                            </div>
                            <div class="space-y-4">
                                <p class="text-sm text-gray-600 dark:text-gray-400">Your new API key:</p>
                                <div class="flex gap-2">
                                    <input type="text" id="new-key-value" readonly class="font-mono bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                    <button id="copy-new-key" class="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm dark:bg-gray-600 dark:text-white">Copy</button>
                                </div>
                                <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <p class="text-sm text-yellow-800 dark:text-yellow-200 font-medium">Copy this key now. You won't be able to see it again.</p>
                                </div>
                            </div>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6">
                            <button id="close-key-created" class="w-full text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium">Done</button>
                        </div>
                    </div>
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

function renderApiKeysTable(keys) {
    if (!keys || keys.length === 0) {
        return `
            <div class="text-center py-8">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                </svg>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">No API keys created yet</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">Create a key to enable external API access</p>
            </div>
        `;
    }

    const rows = keys.map(key => {
        const isRevoked = !!key.revoked_at;
        const isExpired = key.expires_at && new Date(key.expires_at) < new Date();
        const statusClass = isRevoked ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                           isExpired ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                           'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        const statusText = isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active';

        return `
            <tr class="border-b dark:border-gray-700 ${isRevoked ? 'opacity-50' : ''}">
                <td class="px-4 py-3">
                    <div class="font-medium text-gray-900 dark:text-white">${escapeHtml(key.name)}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">${key.key_prefix}...</div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${formatDate(key.created_at)}</td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${key.last_used_at ? formatRelativeTime(key.last_used_at) : 'Never'}</td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${key.expires_at ? formatDate(key.expires_at) : 'Never'}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">${statusText}</span>
                </td>
                <td class="px-4 py-3">
                    ${!isRevoked ? `<button data-revoke-key="${key.id}" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium">Revoke</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="overflow-x-auto">
            <table class="w-full text-left">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th class="px-4 py-3">Name</th>
                        <th class="px-4 py-3">Created</th>
                        <th class="px-4 py-3">Last Used</th>
                        <th class="px-4 py-3">Expires</th>
                        <th class="px-4 py-3">Status</th>
                        <th class="px-4 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

function setupEventListeners(currentSettings) {
    // External API Keys - Create button
    document.getElementById('create-api-key-btn')?.addEventListener('click', () => {
        document.getElementById('create-api-key-modal').classList.remove('hidden');
    });

    // Cancel create key
    document.getElementById('cancel-create-key')?.addEventListener('click', () => {
        document.getElementById('create-api-key-modal').classList.add('hidden');
        document.getElementById('create-api-key-form').reset();
    });

    // Create API key form submission
    document.getElementById('create-api-key-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const expiresValue = formData.get('expires');
        const expiresInDays = expiresValue ? parseInt(expiresValue, 10) : null;

        try {
            const response = await api.createApiKey(name, expiresInDays);

            // Hide create modal
            document.getElementById('create-api-key-modal').classList.add('hidden');
            e.target.reset();

            // Show key created modal
            document.getElementById('new-key-value').value = response.key.key;
            document.getElementById('key-created-modal').classList.remove('hidden');

            // Refresh the keys list
            const keysResponse = await api.getApiKeys();
            apiKeys = keysResponse.keys || [];
            document.getElementById('api-keys-table-container').innerHTML = renderApiKeysTable(apiKeys);
            setupRevokeListeners();

        } catch (error) {
            showToast(`Error creating API key: ${error.message}`, 'error');
        }
    });

    // Copy new key
    document.getElementById('copy-new-key')?.addEventListener('click', () => {
        const input = document.getElementById('new-key-value');
        navigator.clipboard.writeText(input.value);
        showToast('API key copied to clipboard', 'success');
    });

    // Close key created modal
    document.getElementById('close-key-created')?.addEventListener('click', () => {
        document.getElementById('key-created-modal').classList.add('hidden');
    });

    // Setup revoke listeners
    setupRevokeListeners();

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
}

function setupRevokeListeners() {
    document.querySelectorAll('[data-revoke-key]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const keyId = e.target.dataset.revokeKey;
            const key = apiKeys.find(k => k.id === parseInt(keyId, 10));

            const confirmed = await showConfirm(
                `Are you sure you want to revoke the API key "${key?.name || keyId}"? Any integrations using this key will immediately stop working.`,
                {
                    title: 'Revoke API Key',
                    confirmText: 'Revoke',
                    cancelText: 'Cancel',
                    type: 'danger'
                }
            );

            if (!confirmed) return;

            try {
                await api.revokeApiKey(keyId);
                showToast('API key revoked successfully', 'success');

                // Refresh the keys list
                const keysResponse = await api.getApiKeys();
                apiKeys = keysResponse.keys || [];
                document.getElementById('api-keys-table-container').innerHTML = renderApiKeysTable(apiKeys);
                setupRevokeListeners();
            } catch (error) {
                showToast(`Error revoking API key: ${error.message}`, 'error');
            }
        });
    });
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        'bg-blue-500'
    } text-white`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
