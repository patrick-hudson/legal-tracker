/**
 * External API Keys Page
 * Create, list, and revoke API keys for external integrations
 */

import api from '../../api.js';
import { showConfirm } from '../../modal.js';
import { formatDate, formatRelativeTime, escapeHtml, showToast } from './shared.js';

let apiKeys = [];
let scopesConfig = null;

export async function renderApiKeys(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        // Fetch keys and scopes config in parallel
        const [keysResponse, scopesResponse] = await Promise.all([
            api.getApiKeys(),
            api.getApiKeyScopes()
        ]);
        apiKeys = keysResponse.keys || [];
        scopesConfig = scopesResponse;

        container.innerHTML = `
            <div class="mb-4">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">External API Keys</h1>
                <p class="text-gray-600 dark:text-gray-400">Create and manage API keys for external integrations and scripts</p>
            </div>

            <!-- Info Banner -->
            <div class="p-4 mb-6 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400">
                <div class="flex items-start">
                    <svg class="flex-shrink-0 w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                    <div>
                        <p class="font-medium">External API Keys provide programmatic access to the admin panel API.</p>
                        <p class="mt-1">All requests using API keys are automatically logged to the audit log. Use <code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">X-API-Key</code> or <code class="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">Authorization: Bearer</code> header.</p>
                    </div>
                </div>
            </div>

            <!-- API Keys Table -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div class="flex items-center justify-between p-6 border-b dark:border-gray-700">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Your API Keys</h3>
                    <button id="create-api-key-btn" class="text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-medium">
                        Create New Key
                    </button>
                </div>
                <div id="api-keys-table-container" class="p-6">
                    ${renderApiKeysTable(apiKeys)}
                </div>
            </div>

            <!-- Create API Key Modal -->
            <div id="create-api-key-modal" class="hidden fixed inset-0 z-50 overflow-y-auto">
                <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                    <span class="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                    <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full max-h-[90vh] overflow-y-auto">
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
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissions</label>
                                    <select name="preset" id="preset-select" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                        ${renderPresetOptions()}
                                    </select>
                                    <p id="preset-description" class="mt-1 text-xs text-gray-500 dark:text-gray-400">${scopesConfig?.presets?.['full-admin']?.description || 'Full admin access (all permissions)'}</p>
                                </div>
                                <div id="custom-scopes-container" class="hidden">
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Permissions</label>
                                    <div class="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-3">
                                        ${renderScopesCheckboxes()}
                                    </div>
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
                                <p class="text-sm text-gray-600 dark:text-gray-400">Permissions: <span id="new-key-permissions" class="font-medium text-gray-900 dark:text-white">Full Admin</span></p>
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

        setupEventListeners();

    } catch (error) {
        container.innerHTML = `
            <div class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
                <span class="font-medium">Error!</span> Failed to load API keys: ${error.message}
            </div>
        `;
    }
}

function renderPresetOptions() {
    if (!scopesConfig?.presets) {
        return '<option value="full-admin" selected>Full Admin</option>';
    }
    return Object.entries(scopesConfig.presets).map(([key, preset]) => {
        const selected = key === 'full-admin' ? 'selected' : '';
        return `<option value="${key}" ${selected}>${escapeHtml(preset.name)}</option>`;
    }).join('') + '<option value="custom">Custom...</option>';
}

function updatePresetDescription(preset) {
    const descEl = document.getElementById('preset-description');
    if (descEl && scopesConfig?.presets?.[preset]) {
        descEl.textContent = scopesConfig.presets[preset].description;
    }
}

function renderScopesCheckboxes() {
    if (!scopesConfig?.grouped) {
        return '<p class="text-sm text-gray-500">Loading...</p>';
    }
    return Object.entries(scopesConfig.grouped).map(([group, scopes]) => {
        const scopeCheckboxes = Object.entries(scopes).map(([scope, description]) => {
            const isAdminFull = scope === 'admin:full';
            return `
                <label class="flex items-start gap-2 ${isAdminFull ? 'hidden' : ''}">
                    <input type="checkbox" name="scopes" value="${scope}" class="mt-0.5 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded dark:bg-gray-600 dark:border-gray-500">
                    <span class="text-sm">
                        <span class="font-medium text-gray-900 dark:text-white">${escapeHtml(scope)}</span>
                        <span class="text-gray-500 dark:text-gray-400">- ${escapeHtml(description)}</span>
                    </span>
                </label>
            `;
        }).join('');
        return `
            <div>
                <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">${escapeHtml(group)}</h4>
                <div class="space-y-1 pl-2">
                    ${scopeCheckboxes}
                </div>
            </div>
        `;
    }).join('');
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

        // Render scopes display with tooltip
        const scopesDisplay = key.scopes_display || 'Full Admin';
        const scopesTooltip = Array.isArray(key.scopes) ? key.scopes.join(', ') : '';
        const scopesHtml = scopesTooltip && scopesTooltip !== 'admin:full'
            ? `<span class="cursor-help border-b border-dotted border-gray-400" title="${escapeHtml(scopesTooltip)}">${escapeHtml(scopesDisplay)}</span>`
            : escapeHtml(scopesDisplay);

        return `
            <tr class="border-b dark:border-gray-700 ${isRevoked ? 'opacity-50' : ''}">
                <td class="px-4 py-3">
                    <div class="font-medium text-gray-900 dark:text-white">${escapeHtml(key.name)}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">${key.key_prefix}...</div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${scopesHtml}</td>
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
                        <th class="px-4 py-3">Permissions</th>
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

function setupEventListeners() {
    // Create button
    document.getElementById('create-api-key-btn')?.addEventListener('click', () => {
        document.getElementById('create-api-key-modal').classList.remove('hidden');
    });

    // Cancel create key
    document.getElementById('cancel-create-key')?.addEventListener('click', () => {
        document.getElementById('create-api-key-modal').classList.add('hidden');
        document.getElementById('create-api-key-form').reset();
        document.getElementById('custom-scopes-container')?.classList.add('hidden');
        document.getElementById('preset-select').value = 'full-admin';
        updatePresetDescription('full-admin');
    });

    // Preset selection change
    document.getElementById('preset-select')?.addEventListener('change', (e) => {
        const preset = e.target.value;
        const customContainer = document.getElementById('custom-scopes-container');

        if (preset === 'custom') {
            customContainer?.classList.remove('hidden');
            document.getElementById('preset-description').textContent = 'Select individual permissions below';
        } else {
            customContainer?.classList.add('hidden');
            updatePresetDescription(preset);
            // Uncheck all custom checkboxes
            document.querySelectorAll('input[name="scopes"]').forEach(cb => cb.checked = false);
        }
    });

    // Create API key form submission
    document.getElementById('create-api-key-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const expiresValue = formData.get('expires');
        const expiresInDays = expiresValue ? parseInt(expiresValue, 10) : null;
        const preset = formData.get('preset');

        // Get scopes based on preset or custom selection
        let scopeOptions = {};
        if (preset === 'custom') {
            const selectedScopes = formData.getAll('scopes');
            if (selectedScopes.length === 0) {
                showToast('Please select at least one permission', 'error');
                return;
            }
            scopeOptions = { scopes: selectedScopes };
        } else {
            scopeOptions = { preset };
        }

        try {
            const response = await api.createApiKey(name, expiresInDays, scopeOptions);

            // Hide create modal
            document.getElementById('create-api-key-modal').classList.add('hidden');
            e.target.reset();
            document.getElementById('custom-scopes-container')?.classList.add('hidden');
            document.getElementById('preset-select').value = 'full-admin';
            updatePresetDescription('full-admin');

            // Update key created modal to show permissions
            document.getElementById('new-key-value').value = response.key.key;
            const permissionsDisplay = document.getElementById('new-key-permissions');
            if (permissionsDisplay) {
                permissionsDisplay.textContent = response.key.scopes_display || 'Full Admin';
            }
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
