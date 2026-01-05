/**
 * System Information Component
 * Version info, environment settings, build information
 */

import api from '../api.js';
import { renderErrorBanner, displayOrPlaceholder } from '../display-utils.js';

export async function renderSystemInfo(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        const { settings } = await api.getSettings();

        container.innerHTML = `
            <div class="mb-4">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">System Information</h1>
                <p class="text-gray-600 dark:text-gray-400">Version, environment, and build details</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- System Info -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Application Info</h3>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                            <span class="text-gray-600 dark:text-gray-400">Database Type</span>
                            <span class="text-gray-900 dark:text-white font-medium">SQLite (sql.js)</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                            <span class="text-gray-600 dark:text-gray-400">Environment</span>
                            <span id="system-environment" class="text-gray-900 dark:text-white font-medium">Loading...</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                            <span class="text-gray-600 dark:text-gray-400">Version</span>
                            <span id="system-version" class="text-gray-900 dark:text-white font-medium">Loading...</span>
                        </div>
                        <div class="flex justify-between items-center py-2">
                            <span class="text-gray-600 dark:text-gray-400">Build</span>
                            <span id="system-build" class="text-gray-900 dark:text-white font-medium">Loading...</span>
                        </div>
                    </div>
                </div>

                <!-- Environment Override -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Environment Settings</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Environment Override</label>
                            <select id="environment-select" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <option value="">Auto-detect (based on hostname)</option>
                                <option value="development">Development</option>
                                <option value="production">Production</option>
                            </select>
                            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Override automatic detection or leave as auto-detect. Auto-detection uses hostname to determine environment.
                            </p>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Auto-detection Rules</h4>
                            <ul class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                <li><code class="bg-gray-200 dark:bg-gray-600 px-1 rounded">localhost</code> or <code class="bg-gray-200 dark:bg-gray-600 px-1 rounded">127.0.0.1</code> = Development</li>
                                <li>All other hostnames = Production</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Runtime Info -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Runtime Information</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <span class="text-gray-600 dark:text-gray-400 block mb-1">Current Hostname</span>
                            <span class="text-gray-900 dark:text-white font-mono">${window.location.hostname}</span>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <span class="text-gray-600 dark:text-gray-400 block mb-1">Port</span>
                            <span class="text-gray-900 dark:text-white font-mono">${window.location.port || '80/443'}</span>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <span class="text-gray-600 dark:text-gray-400 block mb-1">Protocol</span>
                            <span class="text-gray-900 dark:text-white font-mono">${window.location.protocol.replace(':', '')}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setupEventListeners(settings);

    } catch (error) {
        container.innerHTML = renderErrorBanner(error, 'Error! Failed to load system information:');
    }
}

function setupEventListeners(currentSettings) {
    // Helper to determine environment display
    const getEnvironmentDisplay = (envSetting) => {
        if (envSetting === 'production') return 'Production';
        if (envSetting === 'development') return 'Development';
        // Auto-detect based on hostname
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
        return isLocal ? 'Development (auto)' : 'Production (auto)';
    };

    // Load version info and environment
    (async () => {
        try {
            const response = await fetch('/api/version');
            const versionInfo = await response.json();

            const versionEl = document.getElementById('system-version');
            const buildEl = document.getElementById('system-build');
            const envEl = document.getElementById('system-environment');
            const envSelect = document.getElementById('environment-select');

            if (versionEl) {
                versionEl.textContent = `v${versionInfo.version}`;
            }

            if (buildEl) {
                if (versionInfo.commitHashShort) {
                    if (versionInfo.commitPushed) {
                        buildEl.innerHTML = `<a href="https://github.com/patrick-hudson/legal-tracker/commit/${versionInfo.commitHash}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">${versionInfo.commitHashShort}</a>`;
                    } else {
                        buildEl.innerHTML = `<span class="text-yellow-600 dark:text-yellow-400">Unpushed (${versionInfo.commitHashShort})</span>`;
                    }
                } else {
                    buildEl.textContent = 'N/A';
                }
            }

            if (envEl) {
                envEl.textContent = getEnvironmentDisplay(versionInfo.environment);
            }

            if (envSelect) {
                // Handle null, "null" string, or actual values
                const envValue = (versionInfo.environment && versionInfo.environment !== 'null') ? versionInfo.environment : '';
                envSelect.value = envValue;
            }
        } catch (error) {
            console.error('Failed to load version info:', error);
            const versionEl = document.getElementById('system-version');
            const buildEl = document.getElementById('system-build');
            const envEl = document.getElementById('system-environment');
            if (versionEl) versionEl.textContent = 'Error';
            if (buildEl) buildEl.textContent = 'Error';
            if (envEl) envEl.textContent = 'Error';
        }
    })();

    // Environment select change handler
    document.getElementById('environment-select')?.addEventListener('change', async (e) => {
        const value = e.target.value;
        const envEl = document.getElementById('system-environment');

        try {
            const response = await fetch('/admin/api/settings/environment', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: value || null })
            });

            if (!response.ok) throw new Error('Failed to save');

            if (envEl) {
                envEl.textContent = value ? (value === 'production' ? 'Production' : 'Development') :
                    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'Development (auto)' : 'Production (auto)');
            }

            showToast('Environment setting saved', 'success');
        } catch (error) {
            console.error('Failed to save environment:', error);
            showToast('Failed to save environment setting', 'error');
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
