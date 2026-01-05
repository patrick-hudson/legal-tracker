/**
 * Settings Component
 */

import api from '../api.js';
import auth from '../auth.js';

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
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">When disabled, the cost meter stops accumulating automatically</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Drain Rate (cents per second)</label>
                            <input type="number" step="0.001" min="0" max="1000" id="drain-rate" value="${settings.drain_rate_cents_per_second || 50}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <p class="mt-1 text-xs text-gray-500">$${((parseFloat(settings.drain_rate_cents_per_second || 50) * 3600) / 100).toFixed(2)}/hour ≈ $${((parseFloat(settings.drain_rate_cents_per_second || 50) * 86400) / 100).toFixed(2)}/day (max: 1000 cents/sec)</p>
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

                <!-- Data Management - Sample Data -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sample Data</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Populate the database with sample matters for testing. Choose from predefined datasets or generate custom data.
                    </p>

                    <!-- Sample Dataset Selection -->
                    <div id="sample-datasets-loading" class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Loading available datasets...
                    </div>
                    <div id="sample-datasets-container" class="hidden">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Dataset</label>
                        <select id="sample-dataset-select" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-3">
                            <option value="generate">Generate New (Custom Count)</option>
                        </select>

                        <div id="sample-dataset-info" class="text-xs text-gray-500 dark:text-gray-400 mb-3 hidden"></div>

                        <!-- Custom count for generated data -->
                        <div id="custom-count-container" class="mb-3">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Number of Matters</label>
                            <input type="number" id="sample-count-input" value="25" min="1" max="1000" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <p class="mt-1 text-xs text-gray-500">1-1000 matters, randomly generated</p>
                        </div>
                    </div>

                    <div id="sample-action-buttons" class="space-y-2">
                        <button id="populate-sample-btn" class="w-full text-white bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2 text-sm">
                            Populate Sample Data
                        </button>
                        <button id="regenerate-samples-btn" class="w-full text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg px-4 py-2 text-sm">
                            Regenerate All Sample Files
                        </button>
                    </div>
                </div>

                <!-- Data Management - Wipe Matters Only -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-orange-500">
                    <h3 class="text-lg font-semibold text-orange-600 dark:text-orange-500 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                        Wipe Matters Data
                    </h3>
                    <div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
                        <p class="text-sm text-orange-800 dark:text-orange-400 font-semibold mb-2">DELETE ALL MATTERS: This action cannot be undone!</p>
                        <p class="text-sm text-orange-700 dark:text-orange-300">
                            This will delete all matter records but keep your account and settings:
                        </p>
                        <ul class="list-disc list-inside text-sm text-orange-700 dark:text-orange-300 mt-2 space-y-1">
                            <li>All matter records and historical data</li>
                            <li>Last matter date will be reset</li>
                        </ul>
                        <p class="text-xs text-orange-700 dark:text-orange-300 mt-2 italic">
                            Admin users, sessions, and other settings will be preserved.
                        </p>
                    </div>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Type <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-orange-600 dark:text-orange-400 font-mono">WIPE MATTERS</code> to confirm:
                            </label>
                            <input
                                type="text"
                                id="wipe-matters-confirmation"
                                placeholder="WIPE MATTERS"
                                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-orange-500 focus:border-orange-500">
                        </div>
                        <button id="wipe-matters-btn" class="w-full text-white bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold" disabled>
                            Wipe Matters Data
                        </button>
                    </div>
                </div>

                <!-- Data Management - Wipe Database -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-red-500">
                    <h3 class="text-lg font-semibold text-red-600 dark:text-red-500 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                        Danger Zone
                    </h3>
                    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                        <p class="text-sm text-red-800 dark:text-red-400 font-semibold mb-2">COMPLETE DATABASE RESET: This action cannot be undone!</p>
                        <p class="text-sm text-red-700 dark:text-red-300">
                            This will WIPE EVERYTHING and return to fresh install state:
                        </p>
                        <ul class="list-disc list-inside text-sm text-red-700 dark:text-red-300 mt-2 space-y-1">
                            <li>All matter records and historical data</li>
                            <li>All settings (reset to defaults)</li>
                            <li>All admin sessions (you will be logged out)</li>
                            <li>All other admin users (only your account remains)</li>
                        </ul>
                        <p class="text-xs text-red-700 dark:text-red-300 mt-2 italic">
                            After wiping, the database will be in pristine fresh install state.
                        </p>
                    </div>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Type <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-red-600 dark:text-red-400 font-mono">WIPE EVERYTHING</code> to confirm:
                            </label>
                            <input
                                type="text"
                                id="wipe-confirmation"
                                placeholder="WIPE EVERYTHING"
                                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-red-500 focus:border-red-500">
                        </div>
                        <button id="wipe-everything-btn" class="w-full text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold" disabled>
                            Wipe Everything
                        </button>
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
            const rate = parseFloat(document.getElementById('drain-rate').value);

            // Validate drain rate
            if (isNaN(rate) || rate < 0 || rate > 1000) {
                showToast('Drain rate must be between 0 and 1000 cents per second', 'error');
                return;
            }

            await api.updateSetting('auto_drain_enabled', enabled.toString());
            await api.updateSetting('drain_rate_cents_per_second', rate.toString());

            showToast('Drain settings saved successfully. Drain timer has been reset.', 'success');
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
            // Hash current password client-side (same as login flow)
            const username = auth.getUser()?.username;
            if (!username) {
                throw new Error('User not authenticated');
            }
            const hashedCurrentPassword = await auth.hashPassword(username, current);
            const hashedNewPassword = await auth.hashPassword(username, newPassword);

            const response = await api.changePassword(hashedCurrentPassword, hashedNewPassword);

            // Password changed successfully - session was invalidated on server
            showToast(response.message || 'Password changed successfully. Redirecting to login...', 'success');
            e.target.reset();

            // Clear local auth state
            auth.currentUser = null;
            auth.isAuthenticated = false;

            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = '/admin';
            }, 2000);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });

    // Load available sample datasets
    (async () => {
        try {
            const { samples } = await api.listSampleDatasets();
            const loadingEl = document.getElementById('sample-datasets-loading');
            const containerEl = document.getElementById('sample-datasets-container');

            // If no samples exist, show "Generate Samples First" message and hide action buttons
            if (samples.length === 0) {
                loadingEl.innerHTML = `
                    <div class="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p class="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                            No sample datasets found. Generate sample files first.
                        </p>
                        <button id="generate-samples-first-btn" class="text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm">
                            Generate Sample Files
                        </button>
                    </div>
                `;

                // Hide the action buttons when no samples exist
                document.getElementById('sample-action-buttons').classList.add('hidden');

                // Add click handler for the generate button
                document.getElementById('generate-samples-first-btn')?.addEventListener('click', async () => {
                    const btn = document.getElementById('generate-samples-first-btn');
                    btn.disabled = true;
                    btn.textContent = 'Generating...';

                    try {
                        const response = await api.regenerateSampleFiles();
                        showToast(`Successfully generated ${response.files_regenerated} sample files`, 'success');

                        // Reload the page to show the new samples
                        location.reload();
                    } catch (error) {
                        showToast(`Error: ${error.message}`, 'error');
                        btn.disabled = false;
                        btn.textContent = 'Generate Sample Files';
                    }
                });

                return;
            }

            // Show action buttons when samples exist
            document.getElementById('sample-action-buttons').classList.remove('hidden');

            const select = document.getElementById('sample-dataset-select');
            const info = document.getElementById('sample-dataset-info');
            const customContainer = document.getElementById('custom-count-container');

            // Clear existing options except "Generate New"
            while (select.options.length > 1) {
                select.remove(1);
            }

            // Add sample files to select
            samples.forEach(sample => {
                const option = document.createElement('option');
                option.value = sample.id;
                option.textContent = `${sample.name} (${sample.matter_count} matters)`;
                option.dataset.description = sample.description;
                option.dataset.count = sample.matter_count;
                select.appendChild(option);
            });

            // Show/hide custom count based on selection
            select.addEventListener('change', (e) => {
                const isGenerate = e.target.value === 'generate';
                customContainer.style.display = isGenerate ? 'block' : 'none';

                if (!isGenerate) {
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    info.textContent = `${selectedOption.dataset.description} (${selectedOption.dataset.count} matters)`;
                    info.classList.remove('hidden');
                } else {
                    info.classList.add('hidden');
                }
            });

            // Hide loading, show container
            loadingEl.classList.add('hidden');
            containerEl.classList.remove('hidden');
        } catch (error) {
            document.getElementById('sample-datasets-loading').textContent = 'Failed to load datasets';
            console.error('Failed to load sample datasets:', error);
        }
    })();

    // Populate sample data
    document.getElementById('populate-sample-btn')?.addEventListener('click', async () => {
        const select = document.getElementById('sample-dataset-select');
        const source = select.value;
        const count = parseInt(document.getElementById('sample-count-input').value);

        const isGenerate = source === 'generate';
        const confirmMsg = isGenerate
            ? `This will generate ${count} random sample matters. Continue?`
            : `This will load ${select.options[select.selectedIndex].dataset.count} matters from "${select.options[select.selectedIndex].textContent}". Continue?`;

        if (!confirm(confirmMsg)) {
            return;
        }

        try {
            const btn = document.getElementById('populate-sample-btn');
            btn.disabled = true;
            btn.textContent = 'Populating...';

            const response = await api.populateSampleData(
                isGenerate ? 'generate' : source,
                isGenerate ? count : undefined
            );
            showToast(`Successfully added ${response.matters_added} sample matters ($${response.total_cost_added.toFixed(2)})`, 'success');

            btn.disabled = false;
            btn.textContent = 'Populate Sample Data';
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            const btn = document.getElementById('populate-sample-btn');
            btn.disabled = false;
            btn.textContent = 'Populate Sample Data';
        }
    });

    // Regenerate sample files
    document.getElementById('regenerate-samples-btn')?.addEventListener('click', async () => {
        if (!confirm('This will regenerate all sample JSON files with new random data. The database will not be affected. Continue?')) {
            return;
        }

        try {
            const btn = document.getElementById('regenerate-samples-btn');
            btn.disabled = true;
            btn.textContent = 'Regenerating...';

            const response = await api.regenerateSampleFiles();
            showToast(`Successfully regenerated ${response.files_regenerated} sample files`, 'success');

            // Reload the datasets dropdown
            const { samples } = await api.listSampleDatasets();
            const select = document.getElementById('sample-dataset-select');
            while (select.options.length > 1) {
                select.remove(1);
            }
            samples.forEach(sample => {
                const option = document.createElement('option');
                option.value = sample.id;
                option.textContent = `${sample.name} (${sample.matter_count} matters)`;
                option.dataset.description = sample.description;
                option.dataset.count = sample.matter_count;
                select.appendChild(option);
            });

            btn.disabled = false;
            btn.textContent = 'Regenerate All Sample Files';
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            const btn = document.getElementById('regenerate-samples-btn');
            btn.disabled = false;
            btn.textContent = 'Regenerate All Sample Files';
        }
    });

    // Wipe matters confirmation input
    document.getElementById('wipe-matters-confirmation')?.addEventListener('input', (e) => {
        const btn = document.getElementById('wipe-matters-btn');
        btn.disabled = e.target.value !== 'WIPE MATTERS';
    });

    // Wipe matters
    document.getElementById('wipe-matters-btn')?.addEventListener('click', async () => {
        const confirmation = document.getElementById('wipe-matters-confirmation').value;

        if (confirmation !== 'WIPE MATTERS') {
            showToast('Please type the confirmation text exactly', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete all matter records?\n\nThis will remove all matters but keep your admin account and settings.\n\nThis action CANNOT be undone!')) {
            return;
        }

        try {
            const btn = document.getElementById('wipe-matters-btn');
            btn.disabled = true;
            btn.textContent = 'Wiping matters...';

            const response = await api.wipeMatters(confirmation);

            showToast(response.message || `Successfully deleted ${response.matters_deleted} matters`, 'success');

            // Clear the confirmation input
            document.getElementById('wipe-matters-confirmation').value = '';
            btn.disabled = true;
            btn.textContent = 'Wipe Matters Data';
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            const btn = document.getElementById('wipe-matters-btn');
            btn.disabled = true;
            btn.textContent = 'Wipe Matters Data';
        }
    });

    // Wipe everything confirmation input
    document.getElementById('wipe-confirmation')?.addEventListener('input', (e) => {
        const btn = document.getElementById('wipe-everything-btn');
        btn.disabled = e.target.value !== 'WIPE EVERYTHING';
    });

    // Wipe everything
    document.getElementById('wipe-everything-btn')?.addEventListener('click', async () => {
        const confirmation = document.getElementById('wipe-confirmation').value;

        if (confirmation !== 'WIPE EVERYTHING') {
            showToast('Please type the confirmation text exactly', 'error');
            return;
        }

        // Double confirmation with native dialog
        if (!confirm('ARE YOU ABSOLUTELY SURE?\n\nThis will WIPE EVERYTHING and reset the database to fresh install state:\n\n• All matter records\n• All settings (reset to defaults)\n• All admin sessions (you will be logged out)\n• ALL admin users (including you!)\n\nYou will be redirected to create a new admin account.\n\nThis action CANNOT be undone!')) {
            return;
        }

        try {
            const btn = document.getElementById('wipe-everything-btn');
            btn.disabled = true;
            btn.textContent = 'Wiping everything...';

            const response = await api.wipeAllData(confirmation);

            showToast(
                `Database wiped successfully! Redirecting to setup new admin account...`,
                'success'
            );

            // Clear the confirmation input
            document.getElementById('wipe-confirmation').value = '';

            // Redirect to bootstrap page immediately
            setTimeout(() => {
                window.location.href = response.bootstrap_url;
            }, 1500);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            const btn = document.getElementById('wipe-everything-btn');
            btn.disabled = true; // Keep disabled until user re-types confirmation
            btn.textContent = 'Wipe Everything';
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
