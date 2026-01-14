/**
 * Data Management - Overview Page
 * Dashboard with data summary, AI config preview, storage preview, and quick actions
 */

import api from '../../api.js';
import { renderErrorBanner } from '../../display-utils.js';
import { state, loadState, loadBackupStats, loadStorageSettings, formatBytes, getSpiceLevelName } from './shared.js';

export async function renderOverview(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        // Load all required data in parallel
        await Promise.all([
            loadState(),
            loadBackupStats().catch(e => console.warn('Failed to load backup stats:', e)),
            loadStorageSettings().catch(e => console.warn('Failed to load storage settings:', e))
        ]);

        const backupStats = state.backupStats;

        container.innerHTML = `
            <div class="mb-4">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Data Management</h1>
                <p class="text-gray-600 dark:text-gray-400">Overview of your data, AI configuration, and storage</p>
            </div>

            <!-- Data Summary Section -->
            <div class="mb-6">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">Data Summary</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <!-- Matters Card -->
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
                        <div class="flex items-center">
                            <svg class="w-8 h-8 text-blue-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd"></path>
                            </svg>
                            <div>
                                <p class="text-2xl font-bold text-gray-900 dark:text-white">${backupStats?.counts?.matters ?? 0}</p>
                                <p class="text-sm text-gray-500 dark:text-gray-400">Matters</p>
                            </div>
                        </div>
                    </div>

                    <!-- Private Notes Card -->
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-amber-500">
                        <div class="flex items-center">
                            <svg class="w-8 h-8 text-amber-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"></path>
                            </svg>
                            <div>
                                <p class="text-2xl font-bold text-gray-900 dark:text-white">${backupStats?.counts?.private_notes ?? 0}</p>
                                <p class="text-sm text-gray-500 dark:text-gray-400">Private Notes</p>
                            </div>
                        </div>
                    </div>

                    <!-- Attachments Card -->
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-green-500">
                        <div class="flex items-center">
                            <svg class="w-8 h-8 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clip-rule="evenodd"></path>
                            </svg>
                            <div>
                                <p class="text-2xl font-bold text-gray-900 dark:text-white">${backupStats?.counts?.attachments ?? 0}</p>
                                <p class="text-sm text-gray-500 dark:text-gray-400">Attachments</p>
                                <p class="text-xs text-gray-400 dark:text-gray-500">${formatBytes(backupStats?.attachment_total_size ?? 0)}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Audit Log Card -->
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-purple-500">
                        <div class="flex items-center">
                            <svg class="w-8 h-8 text-purple-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                                <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                            </svg>
                            <div>
                                <p class="text-2xl font-bold text-gray-900 dark:text-white">${backupStats?.counts?.audit_log ?? 0}</p>
                                <p class="text-sm text-gray-500 dark:text-gray-400">Audit Entries</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <!-- AI Configuration Preview -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                            <svg class="w-5 h-5 mr-2 text-blue-600 dark:text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/>
                            </svg>
                            AI Configuration
                        </h3>
                        <a href="#/data-management/ai" class="text-sm text-blue-600 hover:underline dark:text-blue-400">Configure</a>
                    </div>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600 dark:text-gray-400">API Key</span>
                            <span class="text-sm font-medium ${state.isClaudeKeyValidated ? 'text-green-600 dark:text-green-400' : state.hasClaudeApiKey ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}">
                                ${state.isClaudeKeyValidated ? 'Configured' : state.hasClaudeApiKey ? 'Not validated' : 'Not configured'}
                            </span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600 dark:text-gray-400">Model</span>
                            <span class="text-sm font-medium text-gray-900 dark:text-white">
                                ${state.aiSettings.selectedModel || 'Not selected'}
                            </span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600 dark:text-gray-400">Spice Level</span>
                            <span class="text-sm font-medium text-purple-600 dark:text-purple-400">
                                ${getSpiceLevelName(state.aiSettings.spiceLevel)}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Storage Preview -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                            <svg class="w-5 h-5 mr-2 text-green-600 dark:text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"></path>
                                <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"></path>
                            </svg>
                            Storage & Backup
                        </h3>
                        <a href="#/data-management/backup" class="text-sm text-blue-600 hover:underline dark:text-blue-400">Manage</a>
                    </div>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600 dark:text-gray-400">Storage Backend</span>
                            <span class="text-sm font-medium text-gray-900 dark:text-white">
                                ${state.storageSettings?.storage_backend === 's3' ? 'S3-Compatible' : 'Local Filesystem'}
                            </span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600 dark:text-gray-400">Users</span>
                            <span class="text-sm font-medium text-gray-900 dark:text-white">
                                ${backupStats?.counts?.users ?? 0}
                            </span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600 dark:text-gray-400">Total Storage</span>
                            <span class="text-sm font-medium text-gray-900 dark:text-white">
                                ${formatBytes(backupStats?.attachment_total_size ?? 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <a href="#/data-management/ai" class="flex items-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                        <svg class="w-8 h-8 text-green-600 dark:text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"></path>
                            <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"></path>
                            <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"></path>
                        </svg>
                        <div>
                            <p class="font-medium text-green-800 dark:text-green-300">Generate Sample Data</p>
                            <p class="text-sm text-green-600 dark:text-green-400">Add test matters with AI</p>
                        </div>
                    </a>

                    <a href="#/data-management/backup" class="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                        <svg class="w-8 h-8 text-blue-600 dark:text-blue-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"></path>
                            <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"></path>
                        </svg>
                        <div>
                            <p class="font-medium text-blue-800 dark:text-blue-300">Create Backup</p>
                            <p class="text-sm text-blue-600 dark:text-blue-400">Export your data</p>
                        </div>
                    </a>

                    <a href="#/data-management/wipe" class="flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                        <svg class="w-8 h-8 text-red-600 dark:text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                        <div>
                            <p class="font-medium text-red-800 dark:text-red-300">Wipe Data</p>
                            <p class="text-sm text-red-600 dark:text-red-400">Clear or reset data</p>
                        </div>
                    </a>
                </div>
            </div>
        `;

        // Initialize Flowbite components
        if (typeof window.initFlowbite === 'function') {
            window.initFlowbite();
        }

    } catch (error) {
        container.innerHTML = renderErrorBanner(error, 'Error! Failed to load data management overview:');
    }
}
