/**
 * Data Management - Wipe Data Page
 * Selective wipe, wipe customer data, and factory reset operations
 */

import api from '../../api.js';
import { renderErrorBanner } from '../../display-utils.js';
import { showConfirm } from '../../modal.js';
import {
    state,
    loadBackupStats,
    showToast
} from './shared.js';

export async function renderWipeData(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        await loadBackupStats().catch(e => console.warn('Failed to load backup stats:', e));

        const stats = state.backupStats;

        container.innerHTML = `
            <div class="mb-4">
                <nav class="text-sm mb-2">
                    <a href="#/data-management" class="text-blue-600 hover:underline dark:text-blue-400">Data Management</a>
                    <span class="text-gray-500 dark:text-gray-400 mx-2">/</span>
                    <span class="text-gray-700 dark:text-gray-300">Wipe Data</span>
                </nav>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Wipe Data</h1>
                <p class="text-gray-600 dark:text-gray-400">Delete data and reset the application</p>
            </div>

            <!-- Warning Banner -->
            <div class="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div class="flex items-start">
                    <svg class="w-5 h-5 text-amber-600 dark:text-amber-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                    <div>
                        <p class="text-sm font-medium text-amber-800 dark:text-amber-300">Warning: All wipe operations are irreversible</p>
                        <p class="text-xs text-amber-700 dark:text-amber-400 mt-1">Consider creating a backup before proceeding. Go to <a href="#/data-management/backup" class="underline hover:no-underline">Backup & Storage</a> to create one.</p>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <!-- Wipe Matters Only -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-orange-500">
                    <h3 class="text-lg font-semibold text-orange-600 dark:text-orange-500 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                        Wipe Matters
                    </h3>
                    <details class="mb-4">
                        <summary class="text-xs text-orange-600 dark:text-orange-400 cursor-pointer hover:underline font-medium">What will be affected?</summary>
                        <div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mt-2">
                            <p class="text-sm text-orange-800 dark:text-orange-400 font-semibold mb-2">Deletes:</p>
                            <ul class="list-disc list-inside text-xs text-orange-700 dark:text-orange-300 space-y-1">
                                <li>All matter records (<span class="font-medium">${stats?.counts?.matters ?? 0}</span>)</li>
                                <li>All private notes (<span class="font-medium">${stats?.counts?.private_notes ?? 0}</span>)</li>
                                <li>All attachments (<span class="font-medium">${stats?.counts?.attachments ?? 0}</span>)</li>
                                <li>Last matter date</li>
                            </ul>
                            <p class="text-xs text-orange-700 dark:text-orange-300 mt-2 font-semibold">Preserves:</p>
                            <ul class="list-disc list-inside text-xs text-orange-700 dark:text-orange-300 space-y-1">
                                <li>All settings (fees, drain rate)</li>
                                <li>Admin users & sessions</li>
                                <li>Audit log</li>
                            </ul>
                        </div>
                    </details>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirmation required: type <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-orange-600 dark:text-orange-400 font-mono text-xs">WIPE MATTERS</code>
                            </label>
                            <input
                                type="text"
                                id="wipe-matters-confirmation"
                                placeholder="WIPE MATTERS"
                                autocomplete="off"
                                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-orange-500 focus:border-orange-500">
                        </div>
                        <button id="wipe-matters-btn" class="w-full text-white bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold" disabled>
                            Wipe Matters
                        </button>
                    </div>
                </div>

                <!-- Wipe Matters + Settings -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-amber-500">
                    <h3 class="text-lg font-semibold text-amber-600 dark:text-amber-500 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
                        </svg>
                        Wipe + Reset
                    </h3>
                    <details class="mb-4">
                        <summary class="text-xs text-amber-600 dark:text-amber-400 cursor-pointer hover:underline font-medium">What will be affected?</summary>
                        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-2">
                            <p class="text-sm text-amber-800 dark:text-amber-400 font-semibold mb-2">Deletes:</p>
                            <ul class="list-disc list-inside text-xs text-amber-700 dark:text-amber-300 space-y-1">
                                <li>All matter records</li>
                                <li>All private notes</li>
                                <li>All attachments</li>
                                <li>All audit log history (only wipe action kept)</li>
                            </ul>
                            <p class="text-sm text-amber-800 dark:text-amber-400 font-semibold mt-2 mb-2">Resets:</p>
                            <ul class="list-disc list-inside text-xs text-amber-700 dark:text-amber-300 space-y-1">
                                <li>ID sequences to 0</li>
                                <li>Lifetime fees to $0</li>
                                <li>Drain rate to 0</li>
                                <li>Auto-drain disabled</li>
                                <li>API key cleared</li>
                                <li>Auth settings reset</li>
                                <li>Claude API key cleared</li>
                            </ul>
                            <p class="text-xs text-amber-700 dark:text-amber-300 mt-2 font-semibold">Preserves:</p>
                            <ul class="list-disc list-inside text-xs text-amber-700 dark:text-amber-300 space-y-1">
                                <li>Admin users & sessions</li>
                            </ul>
                        </div>
                    </details>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirmation required: type <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-amber-600 dark:text-amber-400 font-mono text-xs">WIPE SETTINGS</code>
                            </label>
                            <input
                                type="text"
                                id="wipe-matters-settings-confirmation"
                                placeholder="WIPE SETTINGS"
                                autocomplete="off"
                                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-amber-500 focus:border-amber-500">
                        </div>
                        <button id="wipe-matters-settings-btn" class="w-full text-white bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold" disabled>
                            Wipe + Reset
                        </button>
                    </div>
                </div>

                <!-- Wipe Everything (Factory Reset) -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-red-500">
                    <h3 class="text-lg font-semibold text-red-600 dark:text-red-500 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                        Factory Reset
                    </h3>
                    <details class="mb-4">
                        <summary class="text-xs text-red-600 dark:text-red-400 cursor-pointer hover:underline font-medium">What will be affected?</summary>
                        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-2">
                            <p class="text-sm text-red-800 dark:text-red-400 font-semibold mb-2">Deletes EVERYTHING:</p>
                            <ul class="list-disc list-inside text-xs text-red-700 dark:text-red-300 space-y-1">
                                <li>All matter records</li>
                                <li>All settings reset to defaults</li>
                                <li>All admin users (including you!)</li>
                                <li>All active sessions</li>
                                <li>Bootstrap tokens</li>
                                <li>API key, auth settings, IP whitelist</li>
                                <li>Claude API key and AI settings</li>
                            </ul>
                            <p class="text-xs text-red-700 dark:text-red-300 mt-2 font-semibold">Result:</p>
                            <ul class="list-disc list-inside text-xs text-red-700 dark:text-red-300 space-y-1">
                                <li>Fresh install state</li>
                                <li>Redirects to setup new admin account</li>
                            </ul>
                        </div>
                    </details>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirmation required: type <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-red-600 dark:text-red-400 font-mono text-xs">WIPE EVERYTHING</code>
                            </label>
                            <input
                                type="text"
                                id="wipe-confirmation"
                                placeholder="WIPE EVERYTHING"
                                autocomplete="off"
                                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-red-500 focus:border-red-500">
                        </div>
                        <button id="wipe-everything-btn" class="w-full text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold" disabled>
                            Factory Reset
                        </button>
                    </div>
                </div>

                <!-- Wipe Audit Log Only -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-purple-500">
                    <h3 class="text-lg font-semibold text-purple-600 dark:text-purple-500 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                            <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                        </svg>
                        Wipe Audit Log
                    </h3>
                    <details class="mb-4">
                        <summary class="text-xs text-purple-600 dark:text-purple-400 cursor-pointer hover:underline font-medium">What will be affected?</summary>
                        <div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mt-2">
                            <p class="text-sm text-purple-800 dark:text-purple-400 font-semibold mb-2">Deletes:</p>
                            <ul class="list-disc list-inside text-xs text-purple-700 dark:text-purple-300 space-y-1">
                                <li>All audit log entries (<span class="font-medium">${stats?.counts?.audit_log ?? 0}</span>)</li>
                                <li>Only the wipe action is logged afterward</li>
                            </ul>
                            <p class="text-xs text-purple-700 dark:text-purple-300 mt-2 font-semibold">Preserves:</p>
                            <ul class="list-disc list-inside text-xs text-purple-700 dark:text-purple-300 space-y-1">
                                <li>All matters, notes, attachments</li>
                                <li>All settings</li>
                                <li>Admin users & sessions</li>
                            </ul>
                        </div>
                    </details>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirmation required: type <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-purple-600 dark:text-purple-400 font-mono text-xs">WIPE AUDIT</code>
                            </label>
                            <input
                                type="text"
                                id="wipe-audit-confirmation"
                                placeholder="WIPE AUDIT"
                                autocomplete="off"
                                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-purple-500 focus:border-purple-500">
                        </div>
                        <button id="wipe-audit-btn" class="w-full text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold" disabled>
                            Wipe Audit Log
                        </button>
                    </div>
                </div>
            </div>
        `;

        setupEventListeners();

        // Initialize Flowbite components
        if (typeof window.initFlowbite === 'function') {
            window.initFlowbite();
        }

    } catch (error) {
        container.innerHTML = renderErrorBanner(error, 'Error! Failed to load wipe data page:');
    }
}

function setupEventListeners() {
    // Wipe matters confirmation input
    document.getElementById('wipe-matters-confirmation')?.addEventListener('input', (e) => {
        const btn = document.getElementById('wipe-matters-btn');
        btn.disabled = e.target.value !== 'WIPE MATTERS';
    });

    document.getElementById('wipe-matters-confirmation')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const btn = document.getElementById('wipe-matters-btn');
            if (!btn.disabled) {
                btn.click();
            }
        }
    });

    // Wipe matters
    document.getElementById('wipe-matters-btn')?.addEventListener('click', async () => {
        const confirmation = document.getElementById('wipe-matters-confirmation').value;

        if (confirmation !== 'WIPE MATTERS') {
            showToast('Please type the confirmation text exactly', 'error');
            return;
        }

        const confirmed = await showConfirm('Are you sure you want to delete all matter records?\n\nThis will remove all matters but keep your admin account and settings.\n\nThis action CANNOT be undone!', {
            title: 'Wipe Matters',
            confirmText: 'Wipe Matters',
            cancelText: 'Cancel',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            const btn = document.getElementById('wipe-matters-btn');
            btn.disabled = true;
            btn.textContent = 'Wiping matters...';

            const response = await api.wipeMatters(confirmation);

            showToast(response.message || `Successfully deleted ${response.matters_deleted} matters. Refreshing...`, 'success');

            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            const btn = document.getElementById('wipe-matters-btn');
            btn.disabled = true;
            btn.textContent = 'Wipe Matters';
        }
    });

    // Wipe matters + settings confirmation input
    document.getElementById('wipe-matters-settings-confirmation')?.addEventListener('input', (e) => {
        const btn = document.getElementById('wipe-matters-settings-btn');
        btn.disabled = e.target.value !== 'WIPE SETTINGS';
    });

    document.getElementById('wipe-matters-settings-confirmation')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const btn = document.getElementById('wipe-matters-settings-btn');
            if (!btn.disabled) {
                btn.click();
            }
        }
    });

    // Wipe matters + settings
    document.getElementById('wipe-matters-settings-btn')?.addEventListener('click', async () => {
        const confirmation = document.getElementById('wipe-matters-settings-confirmation').value;

        if (confirmation !== 'WIPE SETTINGS') {
            showToast('Please type the confirmation text exactly', 'error');
            return;
        }

        const confirmed = await showConfirm('Are you sure you want to delete all matters AND reset all settings?\n\nThis will DELETE:\n- All matter records\n- All private notes\n- All attachments (files deleted from storage)\n- All audit log history (only wipe action kept)\n\nThis will RESET:\n- ID sequences to 0 (new records start at ID 1)\n- Lifetime legal fees to $0\n- Drain rate to 0\n- Auto-drain disabled\n- Drain timer reset\n- API key cleared\n- Authentication requirement disabled\n- IP whitelist cleared\n- Claude API key and AI settings cleared\n\nYour admin account will be preserved.\n\nThis action CANNOT be undone!', {
            title: 'Wipe + Reset',
            confirmText: 'Wipe + Reset',
            cancelText: 'Cancel',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            const btn = document.getElementById('wipe-matters-settings-btn');
            btn.disabled = true;
            btn.textContent = 'Wiping...';

            const response = await api.wipeMattersAndSettings(confirmation);

            showToast(response.message || `Successfully deleted ${response.matters_deleted} matters and reset settings. Refreshing...`, 'success');

            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            const btn = document.getElementById('wipe-matters-settings-btn');
            btn.disabled = true;
            btn.textContent = 'Wipe + Reset';
        }
    });

    // Wipe everything confirmation input
    document.getElementById('wipe-confirmation')?.addEventListener('input', (e) => {
        const btn = document.getElementById('wipe-everything-btn');
        btn.disabled = e.target.value !== 'WIPE EVERYTHING';
    });

    document.getElementById('wipe-confirmation')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const btn = document.getElementById('wipe-everything-btn');
            if (!btn.disabled) {
                btn.click();
            }
        }
    });

    // Wipe everything
    document.getElementById('wipe-everything-btn')?.addEventListener('click', async () => {
        const confirmation = document.getElementById('wipe-confirmation').value;

        if (confirmation !== 'WIPE EVERYTHING') {
            showToast('Please type the confirmation text exactly', 'error');
            return;
        }

        const confirmed = await showConfirm('ARE YOU ABSOLUTELY SURE?\n\nThis will WIPE EVERYTHING and reset the database to fresh install state:\n\n- All matter records\n- All settings (reset to defaults)\n- All admin sessions (you will be logged out)\n- ALL admin users (including you!)\n\nYou will be redirected to create a new admin account.\n\nThis action CANNOT be undone!', {
            title: 'Factory Reset',
            confirmText: 'Factory Reset',
            cancelText: 'Cancel',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            const btn = document.getElementById('wipe-everything-btn');
            btn.disabled = true;
            btn.textContent = 'Wiping everything...';

            const response = await api.wipeAllData(confirmation);

            showToast(
                `Database wiped successfully! Redirecting to setup new admin account...`,
                'success'
            );

            document.getElementById('wipe-confirmation').value = '';

            setTimeout(() => {
                window.location.href = response.bootstrap_url;
            }, 1500);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            const btn = document.getElementById('wipe-everything-btn');
            btn.disabled = true;
            btn.textContent = 'Factory Reset';
        }
    });

    // Wipe audit log confirmation input
    document.getElementById('wipe-audit-confirmation')?.addEventListener('input', (e) => {
        const btn = document.getElementById('wipe-audit-btn');
        btn.disabled = e.target.value !== 'WIPE AUDIT';
    });

    document.getElementById('wipe-audit-confirmation')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const btn = document.getElementById('wipe-audit-btn');
            if (!btn.disabled) {
                btn.click();
            }
        }
    });

    // Wipe audit log
    document.getElementById('wipe-audit-btn')?.addEventListener('click', async () => {
        const confirmation = document.getElementById('wipe-audit-confirmation').value;

        if (confirmation !== 'WIPE AUDIT') {
            showToast('Please type the confirmation text exactly', 'error');
            return;
        }

        const confirmed = await showConfirm('Are you sure you want to delete all audit log entries?\n\nThis will remove all historical audit log data. Only the wipe action itself will be logged.\n\nAll matters, settings, and users will be preserved.\n\nThis action CANNOT be undone!', {
            title: 'Wipe Audit Log',
            confirmText: 'Wipe Audit Log',
            cancelText: 'Cancel',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            const btn = document.getElementById('wipe-audit-btn');
            btn.disabled = true;
            btn.textContent = 'Wiping audit log...';

            const response = await api.wipeAuditLog(confirmation);

            showToast(response.message || `Successfully deleted ${response.entries_deleted} audit log entries. Refreshing...`, 'success');

            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            const btn = document.getElementById('wipe-audit-btn');
            btn.disabled = true;
            btn.textContent = 'Wipe Audit Log';
        }
    });
}
