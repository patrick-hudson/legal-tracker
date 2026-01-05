/**
 * Tracker Settings Component
 * Drain settings and Display settings
 */

import api from '../api.js';
import {
    formatDrainPreview,
    safeNumber,
    renderErrorBanner,
    PLACEHOLDER
} from '../display-utils.js';
import { showConfirm } from '../modal.js';

// Store persisted settings for comparison
let persistedDrainSettings = {
    auto_drain_enabled: 'false',
    drain_rate_cents_per_second: '0'
};

/**
 * Check if drain settings have unsaved changes
 */
function hasDrainChanges() {
    const enabledCheckbox = document.getElementById('auto-drain-enabled');
    const rateInput = document.getElementById('drain-rate');
    if (!enabledCheckbox || !rateInput) return false;

    const currentEnabled = enabledCheckbox.checked ? 'true' : 'false';
    const currentRate = rateInput.value;

    return currentEnabled !== persistedDrainSettings.auto_drain_enabled ||
           currentRate !== persistedDrainSettings.drain_rate_cents_per_second;
}

/**
 * Update the drain rate preview display
 */
function updateDrainPreview() {
    const rateInput = document.getElementById('drain-rate');
    const previewEl = document.getElementById('drain-rate-preview');
    if (!rateInput || !previewEl) return;

    const rate = safeNumber(rateInput.value) ?? 0;
    const preview = formatDrainPreview(rate);
    if (preview.isValid) {
        previewEl.textContent = `$${preview.perHour}/hour | $${preview.perDay}/day`;
    } else {
        previewEl.textContent = `${PLACEHOLDER.DASH}/hour | ${PLACEHOLDER.DASH}/day`;
    }
}

/**
 * Update the auto-drain status indicator
 */
function updateStatusIndicator() {
    const enabledCheckbox = document.getElementById('auto-drain-enabled');
    const statusIndicator = document.getElementById('auto-drain-status');
    if (!enabledCheckbox || !statusIndicator) return;

    const isEnabled = enabledCheckbox.checked;
    if (isEnabled) {
        statusIndicator.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        statusIndicator.innerHTML = `
            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            Enabled
        `;
    } else {
        statusIndicator.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        statusIndicator.innerHTML = `
            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            Disabled
        `;
    }
}

/**
 * Update the unsaved changes indicator
 */
function updateUnsavedIndicator() {
    const unsavedEl = document.getElementById('drain-unsaved-indicator');
    if (!unsavedEl) return;

    if (hasDrainChanges()) {
        unsavedEl.classList.remove('hidden');
    } else {
        unsavedEl.classList.add('hidden');
    }
}

export async function renderTrackerSettings(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        const { settings } = await api.getSettings();

        // Store persisted settings
        persistedDrainSettings = {
            auto_drain_enabled: settings.auto_drain_enabled || 'false',
            drain_rate_cents_per_second: settings.drain_rate_cents_per_second || '0'
        };

        const drainRate = safeNumber(settings.drain_rate_cents_per_second) ?? 0;
        const drainPreview = formatDrainPreview(drainRate);
        const isEnabled = settings.auto_drain_enabled === 'true';

        container.innerHTML = `
            <div class="mb-4">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Tracker Settings</h1>
                <p class="text-gray-600 dark:text-gray-400">Configure drain rate and display options</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Drain Settings -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Drain Settings</h3>
                        <div class="flex items-center gap-2">
                            <span id="drain-unsaved-indicator" class="hidden text-xs text-amber-600 dark:text-amber-400 font-medium">Unsaved changes</span>
                            <span id="auto-drain-status" class="${isEnabled ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}">
                                ${isEnabled ? `
                                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                                    </svg>
                                    Enabled
                                ` : `
                                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                                    </svg>
                                    Disabled
                                `}
                            </span>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <label class="flex items-center cursor-pointer">
                                <input type="checkbox" id="auto-drain-enabled" ${isEnabled ? 'checked' : ''} class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
                                <span class="ml-2 text-sm font-medium text-gray-900 dark:text-white">Enable Auto-Drain</span>
                            </label>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">When disabled, the cost meter stops accumulating automatically</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Drain Rate (cents/second)</label>
                            <input type="number" step="0.001" min="0" max="1000" id="drain-rate" value="${drainRate}" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <p id="drain-rate-preview" class="mt-1 text-xs text-gray-500 dark:text-gray-400">$${drainPreview.perHour}/hour | $${drainPreview.perDay}/day</p>
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
        container.innerHTML = renderErrorBanner(error, 'Error! Failed to load tracker settings:');
    }
}

function setupEventListeners(currentSettings) {
    // Live preview updates on drain rate input
    document.getElementById('drain-rate')?.addEventListener('input', () => {
        updateDrainPreview();
        updateUnsavedIndicator();
    });

    // Status indicator and unsaved changes on checkbox toggle
    document.getElementById('auto-drain-enabled')?.addEventListener('change', () => {
        updateStatusIndicator();
        updateUnsavedIndicator();
    });

    // Drain settings save
    document.getElementById('save-drain-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('save-drain-btn');
        const originalText = btn.textContent;

        try {
            const enabled = document.getElementById('auto-drain-enabled').checked;
            const rate = parseFloat(document.getElementById('drain-rate').value);

            if (isNaN(rate) || rate < 0 || rate > 1000) {
                showToast('Drain rate must be between 0 and 1000 cents per second', 'error');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Saving...';

            await api.updateSetting('auto_drain_enabled', enabled.toString());
            await api.updateSetting('drain_rate_cents_per_second', rate.toString());

            // Update persisted settings after successful save
            persistedDrainSettings = {
                auto_drain_enabled: enabled.toString(),
                drain_rate_cents_per_second: rate.toString()
            };

            // Hide unsaved indicator
            updateUnsavedIndicator();

            showToast('Drain settings saved successfully. Drain timer has been reset.', 'success');
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
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
        const confirmed = await showConfirm('Are you sure you want to reset lifetime legal fees to $0? This cannot be undone.', {
            title: 'Reset Lifetime Fees',
            confirmText: 'Reset to $0',
            cancelText: 'Cancel',
            type: 'danger'
        });

        if (!confirmed) {
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
