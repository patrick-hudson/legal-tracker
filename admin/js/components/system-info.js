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

                <!-- Audit Log Settings -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Audit Log Settings</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Minimum Log Level</label>
                            <select id="audit-log-level-select" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <option value="ERROR">Error only</option>
                                <option value="WARNING">Warning and above</option>
                                <option value="INFO">Info and above (default)</option>
                                <option value="DEBUG">Debug (all events)</option>
                            </select>
                            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Controls which events are recorded to the audit log. Lower levels include all higher level events.
                            </p>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Log Levels</h4>
                            <ul class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                <li><span class="inline-block w-16 font-medium text-red-600 dark:text-red-400">ERROR</span> Exceptions and failures</li>
                                <li><span class="inline-block w-16 font-medium text-yellow-600 dark:text-yellow-400">WARNING</span> Suspicious activity, near-failures</li>
                                <li><span class="inline-block w-16 font-medium text-blue-600 dark:text-blue-400">INFO</span> CRUD operations, settings changes, auth events</li>
                                <li><span class="inline-block w-16 font-medium text-gray-600 dark:text-gray-400">DEBUG</span> Detailed diagnostics (may impact performance)</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Watchdog / Process Manager -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Process Manager</h3>
                    <div id="watchdog-status" class="space-y-4">
                        <div class="flex items-center justify-center h-24">
                            <div class="spinner"></div>
                        </div>
                    </div>
                </div>

                <!-- Runtime Info -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Runtime Information</h3>
                    <div class="space-y-3 text-sm">
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

    // Set audit log level from settings
    const auditLogLevelSelect = document.getElementById('audit-log-level-select');
    if (auditLogLevelSelect) {
        const currentLevel = currentSettings.audit_log_level || 'INFO';
        auditLogLevelSelect.value = currentLevel;
    }

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

    // Audit log level select change handler
    document.getElementById('audit-log-level-select')?.addEventListener('change', async (e) => {
        const value = e.target.value;

        try {
            const response = await fetch('/admin/api/settings/audit_log_level', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value })
            });

            if (!response.ok) throw new Error('Failed to save');

            showToast('Audit log level saved', 'success');
        } catch (error) {
            console.error('Failed to save audit log level:', error);
            showToast('Failed to save audit log level', 'error');
        }
    });

    // Load watchdog status
    loadWatchdogStatus();
}

async function loadWatchdogStatus() {
    const container = document.getElementById('watchdog-status');
    if (!container) return;

    try {
        const response = await fetch('/admin/api/watchdog/status');

        if (!response.ok) {
            if (response.status === 503) {
                // Watchdog not running
                container.innerHTML = `
                    <div class="text-center py-4">
                        <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 mb-3">
                            <span class="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                            Not Running
                        </div>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            Start with: <code class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">node watchdog.js</code>
                        </p>
                    </div>
                `;
                return;
            }
            throw new Error('Failed to fetch status');
        }

        const status = await response.json();

        container.innerHTML = `
            <div class="space-y-3 text-sm">
                <div class="flex items-center justify-between">
                    <span class="text-gray-600 dark:text-gray-400">Status</span>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.running ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}">
                        <span class="w-2 h-2 ${status.running ? 'bg-green-400' : 'bg-red-400'} rounded-full mr-1.5"></span>
                        ${status.running ? 'Running' : 'Stopped'}
                    </span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-gray-600 dark:text-gray-400">Uptime</span>
                    <span class="text-gray-900 dark:text-white font-medium">${status.uptimeFormatted || '-'}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-gray-600 dark:text-gray-400">Restarts</span>
                    <span class="text-gray-900 dark:text-white font-medium">${status.restartCount}</span>
                </div>
                ${status.lastRestartReason ? `
                    <div class="flex items-center justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Last Restart</span>
                        <span class="text-gray-900 dark:text-white font-medium">${status.lastRestartReason}</span>
                    </div>
                ` : ''}
                ${status.pendingChanges > 0 ? `
                    <div class="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <div class="flex items-center text-yellow-800 dark:text-yellow-300">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                            <span class="font-medium">${status.pendingChanges} pending change${status.pendingChanges !== 1 ? 's' : ''}</span>
                        </div>
                        <ul class="mt-2 text-xs text-yellow-700 dark:text-yellow-400 space-y-1 max-h-24 overflow-y-auto">
                            ${status.modifiedFiles.slice(0, 5).map(f => `<li class="truncate">${f.type}: ${f.path}</li>`).join('')}
                            ${status.modifiedFiles.length > 5 ? `<li class="text-yellow-600 dark:text-yellow-500">...and ${status.modifiedFiles.length - 5} more</li>` : ''}
                        </ul>
                    </div>
                ` : ''}
                <div class="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button id="restart-server-btn" class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed">
                        Restart Server
                    </button>
                </div>
            </div>
        `;

        // Setup restart button handler
        document.getElementById('restart-server-btn')?.addEventListener('click', handleRestart);

    } catch (error) {
        console.error('Failed to load watchdog status:', error);
        container.innerHTML = `
            <div class="text-center py-4 text-red-500 dark:text-red-400">
                <p class="text-sm">Failed to load status</p>
                <button id="retry-watchdog-btn" class="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">Retry</button>
            </div>
        `;
        document.getElementById('retry-watchdog-btn')?.addEventListener('click', loadWatchdogStatus);
    }
}

async function handleRestart() {
    const btn = document.getElementById('restart-server-btn');
    if (!btn) return;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Restarting...';

    try {
        const response = await fetch('/admin/api/watchdog/restart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'manual (admin UI)' })
        });

        if (!response.ok) {
            throw new Error('Failed to restart');
        }

        showToast('Server restart initiated', 'success');

        // Wait a moment then reload status
        btn.textContent = 'Restarting...';
        setTimeout(() => {
            loadWatchdogStatus();
        }, 3000);

    } catch (error) {
        console.error('Failed to restart server:', error);
        showToast('Failed to restart server', 'error');
        btn.disabled = false;
        btn.textContent = originalText;
    }
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
