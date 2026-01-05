/**
 * Tracker Settings Component
 * Drain settings and Display settings
 */

import api from '../api.js';

export async function renderTrackerSettings(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        const { settings } = await api.getSettings();

        container.innerHTML = `
            <div class="mb-4">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Tracker Settings</h1>
                <p class="text-gray-600 dark:text-gray-400">Configure drain rate and display options</p>
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
                            <p class="mt-1 text-xs text-gray-500">$${((parseFloat(settings.drain_rate_cents_per_second || 50) * 3600) / 100).toFixed(2)}/hour | $${((parseFloat(settings.drain_rate_cents_per_second || 50) * 86400) / 100).toFixed(2)}/day</p>
                            <p class="mt-1 text-xs text-gray-400">Maximum: 1000 cents/sec ($864,000/day)</p>
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
                            <input type="datetime-local" id="last-matter-date" value="${settings.last_matter_date && settings.last_matter_date !== 'null' ? new Date(settings.last_matter_date).toISOString().slice(0, 16) : ''}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">The date of the most recent legal matter. Used for "days since" calculations.</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lifetime Legal Fees</label>
                            <div class="flex gap-2">
                                <div class="relative flex-1">
                                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                                    <input type="number" id="lifetime-spent" step="0.01" min="0" value="${((parseFloat(settings.lifetime_spent) || 0) / 100).toFixed(2)}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 pl-7 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                </div>
                                <button id="reset-lifetime-btn" type="button" class="px-3 py-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Reset to $0">Reset</button>
                            </div>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Total legal fees tracked over all time.</p>
                        </div>
                        <button id="save-display-btn" class="w-full text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm">Save Display Settings</button>
                    </div>
                </div>
            </div>
        `;

        setupEventListeners(settings);

    } catch (error) {
        container.innerHTML = `
            <div class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
                <span class="font-medium">Error!</span> Failed to load tracker settings: ${error.message}
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
            const lifetimeSpentDollars = parseFloat(document.getElementById('lifetime-spent').value) || 0;
            const lifetimeSpentCents = Math.round(lifetimeSpentDollars * 100);

            if (lastMatter) {
                await api.updateSetting('last_matter_date', new Date(lastMatter).toISOString());
            }
            await api.updateSetting('lifetime_spent', lifetimeSpentCents.toString());

            showToast('Display settings saved successfully', 'success');
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });

    // Reset lifetime fees button
    document.getElementById('reset-lifetime-btn')?.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to reset lifetime legal fees to $0? This cannot be undone.')) {
            return;
        }

        try {
            await api.updateSetting('lifetime_spent', '0');
            document.getElementById('lifetime-spent').value = '0.00';
            showToast('Lifetime legal fees reset to $0', 'success');
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
