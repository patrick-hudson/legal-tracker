/**
 * Settings Component
 */

import api from '../api.js';

export async function renderSettings(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        const { settings } = await api.getSettings();

        container.innerHTML = `
            <div class="mb-4">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p class="text-gray-600 dark:text-gray-400">Configure your legal tracker</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Drain Settings -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Drain Settings</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="flex items-center cursor-pointer">
                                <input type="checkbox" id="auto-drain-enabled" ${settings.auto_drain_enabled === 'true' ? 'checked' : ''} class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
                                <span class="ml-2 text-sm font-medium text-gray-900 dark:text-white">Enable Auto-Drain</span>
                            </label>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Drain Rate (cents/second)</label>
                            <input type="number" step="0.001" id="drain-rate" value="${settings.drain_rate_cents_per_second || 0}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <p class="mt-1 text-xs text-gray-500">Approximately $${((parseFloat(settings.drain_rate_cents_per_second || 0) * 86400) / 100).toFixed(2)}/day</p>
                        </div>
                        <button id="save-drain-btn" class="w-full text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm">Save Drain Settings</button>
                    </div>
                </div>

                <!-- Display Settings -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Display Settings</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Matter Date</label>
                            <input type="datetime-local" id="last-matter-date" value="${settings.last_matter_date ? new Date(settings.last_matter_date).toISOString().slice(0, 16) : ''}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lifetime Spent (cents)</label>
                            <input type="number" id="lifetime-spent" value="${settings.lifetime_spent_cents || 0}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <p class="mt-1 text-xs text-gray-500">$${((settings.lifetime_spent_cents || 0) / 100).toFixed(2)}</p>
                        </div>
                        <button id="save-display-btn" class="w-full text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm">Save Display Settings</button>
                    </div>
                </div>

                <!-- API Key Management -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">API Key Management</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current API Key</label>
                            <div class="flex gap-2">
                                <input type="password" id="api-key-display" value="${settings.api_key || 'Not set'}" readonly class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <button id="toggle-api-key" class="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:text-white">Show</button>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button id="copy-api-key" class="flex-1 text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg px-4 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600">Copy</button>
                            <button id="regenerate-api-key" class="flex-1 text-white bg-orange-600 hover:bg-orange-700 rounded-lg px-4 py-2 text-sm">Regenerate</button>
                        </div>
                    </div>
                </div>

                <!-- Authentication Settings -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Authentication</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="flex items-center cursor-pointer">
                                <input type="checkbox" id="require-auth" ${settings.require_auth === 'true' ? 'checked' : ''} class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
                                <span class="ml-2 text-sm font-medium text-gray-900 dark:text-white">Require Authentication</span>
                            </label>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">IP Whitelist (comma-separated)</label>
                            <input type="text" id="ip-whitelist" value="${settings.ip_whitelist || ''}" placeholder="127.0.0.1, 192.168.1.1" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
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
                        <button type="submit" class="w-full text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm">Change Password</button>
                    </form>
                </div>

                <!-- System Info -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Information</h3>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Database Type</span>
                            <span class="text-gray-900 dark:text-white">SQLite (sql.js)</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Environment</span>
                            <span class="text-gray-900 dark:text-white">Production</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Version</span>
                            <span class="text-gray-900 dark:text-white">1.0.0</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        setupEventListeners(settings);

    } catch (error) {
        container.innerHTML = `
            <div class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
                <span class="font-medium">Error!</span> Failed to load settings: ${error.message}
            </div>
        `;
    }
}

function setupEventListeners(currentSettings) {
    // Drain settings
    document.getElementById('save-drain-btn')?.addEventListener('click', async () => {
        try {
            const enabled = document.getElementById('auto-drain-enabled').checked;
            const rate = document.getElementById('drain-rate').value;

            await api.updateSetting('auto_drain_enabled', enabled.toString());
            await api.updateSetting('drain_rate_cents_per_second', rate);

            showToast('Drain settings saved successfully', 'success');
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });

    // Display settings
    document.getElementById('save-display-btn')?.addEventListener('click', async () => {
        try {
            const lastMatter = document.getElementById('last-matter-date').value;
            const lifetimeSpent = document.getElementById('lifetime-spent').value;

            if (lastMatter) {
                await api.updateSetting('last_matter_date', new Date(lastMatter).toISOString());
            }
            await api.updateSetting('lifetime_spent_cents', lifetimeSpent);

            showToast('Display settings saved successfully', 'success');
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });

    // API Key management
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
        if (!confirm('Are you sure you want to regenerate the API key? The old key will stop working.')) {
            return;
        }

        try {
            const response = await api.generateApiKey();
            document.getElementById('api-key-display').value = response.api_key;
            showToast('API key regenerated successfully', 'success');
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
            await api.changePassword(current, newPassword);
            showToast('Password changed successfully', 'success');
            e.target.reset();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });
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
