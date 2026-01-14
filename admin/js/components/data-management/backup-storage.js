/**
 * Data Management - Backup & Storage Page
 * Storage settings configuration and backup/restore functionality
 */

import api from '../../api.js';
import { renderErrorBanner } from '../../display-utils.js';
import { showConfirm } from '../../modal.js';
import {
    state,
    loadStorageSettings,
    loadBackupStats,
    formatBytes,
    showToast
} from './shared.js';

export async function renderBackupStorage(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        // Load storage settings and backup stats in parallel
        await Promise.all([
            loadStorageSettings().catch(e => console.warn('Failed to load storage settings:', e)),
            loadBackupStats().catch(e => console.warn('Failed to load backup stats:', e))
        ]);

        container.innerHTML = `
            <div class="mb-4">
                <nav class="text-sm mb-2">
                    <a href="#/data-management" class="text-blue-600 hover:underline dark:text-blue-400">Data Management</a>
                    <span class="text-gray-500 dark:text-gray-400 mx-2">/</span>
                    <span class="text-gray-700 dark:text-gray-300">Backup & Storage</span>
                </nav>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Backup & Storage</h1>
                <p class="text-gray-600 dark:text-gray-400">Configure file storage and manage backups</p>
            </div>

            <!-- Storage Settings Section -->
            <div class="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center">
                        <svg class="w-6 h-6 mr-3 text-green-600 dark:text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"></path>
                            <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"></path>
                        </svg>
                        <div>
                            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">File Storage</h2>
                            <p class="text-sm text-gray-500 dark:text-gray-400">Configure storage for matter attachments</p>
                        </div>
                    </div>
                    <button id="storage-help-btn" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </button>
                </div>

                <div id="storage-settings-loading" class="text-center py-4">
                    <div class="spinner mx-auto"></div>
                </div>

                <div id="storage-settings-content" class="hidden">
                    <!-- Storage Backend Toggle -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Storage Backend</label>
                        <div class="flex gap-4">
                            <label class="flex items-center cursor-pointer">
                                <input type="radio" name="storage_backend" value="filesystem" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500">
                                <span class="ml-2 text-sm font-medium text-gray-900 dark:text-white">Local Filesystem</span>
                            </label>
                            <label class="flex items-center cursor-pointer">
                                <input type="radio" name="storage_backend" value="s3" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500">
                                <span class="ml-2 text-sm font-medium text-gray-900 dark:text-white">S3-Compatible Storage</span>
                            </label>
                        </div>
                    </div>

                    <!-- Filesystem Settings -->
                    <div id="filesystem-settings" class="mb-6 hidden">
                        <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Storage Path (optional)</label>
                                <input type="text" id="storage-filesystem-path" placeholder="./data/uploads (default)" class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave empty to use default path. Must be writable by the server.</p>
                            </div>
                        </div>
                    </div>

                    <!-- S3 Settings -->
                    <div id="s3-settings" class="mb-6 hidden">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Access Key ID</label>
                                <div class="flex gap-2">
                                    <input type="password" id="s3-access-key" class="flex-1 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                                    <button type="button" class="toggle-password px-3 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm dark:bg-gray-600 dark:text-white" data-target="s3-access-key">Show</button>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Secret Access Key</label>
                                <div class="flex gap-2">
                                    <input type="password" id="s3-secret-key" class="flex-1 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                                    <button type="button" class="toggle-password px-3 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm dark:bg-gray-600 dark:text-white" data-target="s3-secret-key">Show</button>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bucket Name</label>
                                <input type="text" id="s3-bucket" class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Region</label>
                                <select id="s3-region" class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                                    <option value="us-east-1">US East (N. Virginia)</option>
                                    <option value="us-east-2">US East (Ohio)</option>
                                    <option value="us-west-1">US West (N. California)</option>
                                    <option value="us-west-2">US West (Oregon)</option>
                                    <option value="eu-west-1">EU (Ireland)</option>
                                    <option value="eu-west-2">EU (London)</option>
                                    <option value="eu-central-1">EU (Frankfurt)</option>
                                    <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                                    <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                                    <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Endpoint (for MinIO, Backblaze, Wasabi)</label>
                                <input type="text" id="s3-endpoint" placeholder="https://s3.us-west-001.backblazeb2.com" class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500 dark:text-white">
                                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave empty for AWS S3. Required for MinIO, Backblaze B2, Wasabi, etc.</p>
                            </div>
                            <div class="md:col-span-2">
                                <label class="flex items-center cursor-pointer">
                                    <input type="checkbox" id="s3-path-style" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
                                    <span class="ml-2 text-sm font-medium text-gray-900 dark:text-white">Use Path-Style Addressing</span>
                                </label>
                                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Enable for MinIO and some S3-compatible services that require path-style URLs.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Test & Save Buttons -->
                    <div class="flex gap-3">
                        <button id="test-storage-btn" class="flex-1 text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg px-4 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600">
                            Test Connection
                        </button>
                        <button id="save-storage-btn" class="flex-1 text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm" disabled>
                            Save Storage Settings
                        </button>
                    </div>

                    <!-- Test Result -->
                    <div id="storage-test-result" class="mt-4 hidden"></div>
                </div>
            </div>

            <!-- Backup & Restore Section -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Create Backup -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-blue-500">
                    <h3 class="text-lg font-semibold text-blue-600 dark:text-blue-500 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"></path>
                            <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"></path>
                        </svg>
                        Create Backup
                    </h3>
                    <div id="backup-stats-loading" class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Loading backup info...
                    </div>
                    <div id="backup-stats-container" class="hidden mb-4">
                        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <p class="text-sm text-blue-800 dark:text-blue-400 font-semibold mb-2">Current Data</p>
                            <ul class="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                <li><span id="backup-matters-count">0</span> matters</li>
                                <li><span id="backup-notes-count">0</span> private notes</li>
                                <li><span id="backup-attachments-count">0</span> attachments (<span id="backup-attachments-size">0 MB</span>)</li>
                                <li><span id="backup-audit-count">0</span> audit log entries</li>
                                <li><span id="backup-users-count">0</span> users</li>
                            </ul>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="backup-include-attachments" checked class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600">
                            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Include attachments</span>
                        </label>
                        <label class="flex items-center cursor-pointer">
                            <input type="checkbox" id="backup-include-audit" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600">
                            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Include audit log</span>
                        </label>
                        <div id="backup-s3-options" class="hidden">
                            <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">S3 Backup Mode:</p>
                            <label class="flex items-center cursor-pointer mb-1">
                                <input type="radio" name="backup-s3-mode" value="full" checked class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600">
                                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Full (download files)</span>
                            </label>
                            <label class="flex items-center cursor-pointer">
                                <input type="radio" name="backup-s3-mode" value="references" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600">
                                <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">References only (faster)</span>
                            </label>
                        </div>
                        <button id="create-backup-btn" class="w-full text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold flex items-center justify-center">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            Create Backup
                        </button>
                        <div id="backup-progress" class="hidden">
                            <div class="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                <div id="backup-progress-bar" class="bg-blue-600 h-2 rounded-full transition-all" style="width: 0%"></div>
                            </div>
                            <p id="backup-progress-text" class="text-xs text-gray-500 dark:text-gray-400 mt-1">Creating backup...</p>
                        </div>
                    </div>
                </div>

                <!-- Restore Backup -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-purple-500">
                    <h3 class="text-lg font-semibold text-purple-600 dark:text-purple-500 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
                        </svg>
                        Restore Backup
                    </h3>
                    <div class="space-y-3">
                        <div id="restore-dropzone" class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-colors">
                            <svg class="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                            </svg>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Drop backup ZIP here or click to select</p>
                            <input type="file" id="restore-file-input" accept=".zip" class="hidden">
                        </div>

                        <div id="restore-preview" class="hidden">
                            <div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                                <p class="text-sm text-purple-800 dark:text-purple-400 font-semibold mb-2">Backup Contents</p>
                                <p class="text-xs text-purple-700 dark:text-purple-300" id="restore-backup-date"></p>
                                <p class="text-xs text-purple-700 dark:text-purple-300 mb-2" id="restore-backup-version"></p>
                                <ul class="text-xs text-purple-700 dark:text-purple-300 space-y-1">
                                    <li><span id="restore-matters-count">0</span> matters</li>
                                    <li><span id="restore-notes-count">0</span> private notes</li>
                                    <li><span id="restore-attachments-count">0</span> attachments</li>
                                    <li><span id="restore-audit-count">0</span> audit log entries</li>
                                    <li><span id="restore-users-count">0</span> users</li>
                                </ul>
                            </div>

                            <div id="restore-warnings" class="hidden mt-3"></div>

                            <div class="mt-3">
                                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Confirmation required: type <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-purple-600 dark:text-purple-400 font-mono text-xs">RESTORE BACKUP</code>
                                </label>
                                <input
                                    type="text"
                                    id="restore-confirmation"
                                    placeholder="RESTORE BACKUP"
                                    autocomplete="off"
                                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-purple-500 focus:border-purple-500">
                            </div>

                            <button id="restore-backup-btn" class="w-full mt-3 text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold flex items-center justify-center" disabled>
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                                Restore Backup
                            </button>

                            <button id="restore-cancel-btn" class="w-full mt-2 text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-lg px-4 py-2 text-xs">
                                Cancel
                            </button>
                        </div>

                        <div id="restore-progress" class="hidden">
                            <div class="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                <div id="restore-progress-bar" class="bg-purple-600 h-2 rounded-full transition-all" style="width: 0%"></div>
                            </div>
                            <p id="restore-progress-text" class="text-xs text-gray-500 dark:text-gray-400 mt-1">Restoring backup...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Storage Help Modal -->
            <div id="storage-help-modal" class="hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div class="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-lg bg-white dark:bg-gray-800">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">S3 Storage Setup Guide</h3>
                        <button id="close-storage-help" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <div class="overflow-y-auto max-h-[70vh] space-y-6 text-sm text-gray-700 dark:text-gray-300">
                        <!-- AWS S3 Setup -->
                        <details class="border border-gray-200 dark:border-gray-700 rounded-lg" open>
                            <summary class="px-4 py-3 bg-gray-50 dark:bg-gray-700 cursor-pointer font-medium">AWS S3 Setup</summary>
                            <div class="p-4 space-y-3">
                                <p><strong>1. Create an S3 Bucket:</strong></p>
                                <ul class="list-disc ml-6 space-y-1">
                                    <li>Go to AWS S3 Console and create a new bucket</li>
                                    <li>Choose a unique bucket name and region</li>
                                    <li>Keep "Block all public access" enabled (recommended)</li>
                                </ul>
                                <p><strong>2. Create an IAM User:</strong></p>
                                <ul class="list-disc ml-6 space-y-1">
                                    <li>Go to IAM Console > Users > Create user</li>
                                    <li>Create programmatic access credentials</li>
                                    <li>Attach a policy with s3:PutObject, s3:GetObject, s3:DeleteObject, s3:ListBucket permissions</li>
                                </ul>
                            </div>
                        </details>

                        <!-- MinIO Setup -->
                        <details class="border border-gray-200 dark:border-gray-700 rounded-lg">
                            <summary class="px-4 py-3 bg-gray-50 dark:bg-gray-700 cursor-pointer font-medium">MinIO (Self-Hosted) Setup</summary>
                            <div class="p-4 space-y-3">
                                <ul class="list-disc ml-6 space-y-1">
                                    <li>Set endpoint to your MinIO server URL (e.g., http://localhost:9000)</li>
                                    <li>Enable "Path-Style Addressing"</li>
                                    <li>Use your MinIO access key and secret key</li>
                                    <li>Create a bucket via MinIO Console or mc client</li>
                                </ul>
                            </div>
                        </details>

                        <!-- Backblaze B2 Setup -->
                        <details class="border border-gray-200 dark:border-gray-700 rounded-lg">
                            <summary class="px-4 py-3 bg-gray-50 dark:bg-gray-700 cursor-pointer font-medium">Backblaze B2 Setup</summary>
                            <div class="p-4 space-y-3">
                                <ul class="list-disc ml-6 space-y-1">
                                    <li>Create a B2 bucket in Backblaze console</li>
                                    <li>Create an application key with read/write access to the bucket</li>
                                    <li>Set endpoint based on your region (e.g., https://s3.us-west-001.backblazeb2.com)</li>
                                    <li>Use the keyID as Access Key and applicationKey as Secret Key</li>
                                </ul>
                            </div>
                        </details>

                        <!-- Troubleshooting -->
                        <details class="border border-gray-200 dark:border-gray-700 rounded-lg">
                            <summary class="px-4 py-3 bg-gray-50 dark:bg-gray-700 cursor-pointer font-medium">Troubleshooting</summary>
                            <div class="p-4 space-y-3">
                                <p><strong>Access Denied:</strong> Check IAM policy permissions and bucket policy</p>
                                <p><strong>Bucket Not Found:</strong> Verify bucket name and region match</p>
                                <p><strong>Invalid Endpoint:</strong> Ensure the endpoint URL is correct and accessible</p>
                                <p><strong>Signature Mismatch:</strong> Verify access key and secret key are correct</p>
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        `;

        setupEventListeners();
        await initStorageSettings();

        // Initialize Flowbite components
        if (typeof window.initFlowbite === 'function') {
            window.initFlowbite();
        }

    } catch (error) {
        container.innerHTML = renderErrorBanner(error, 'Error! Failed to load backup & storage:');
    }
}

// Local state for this page
let storageTestPassed = false;
let selectedRestoreFile = null;
let restorePreview = null;

async function initStorageSettings() {
    try {
        const settings = state.storageSettings;
        if (!settings) {
            await loadStorageSettings();
        }

        const currentSettings = state.storageSettings;

        // Show content, hide loading
        document.getElementById('storage-settings-loading')?.classList.add('hidden');
        document.getElementById('storage-settings-content')?.classList.remove('hidden');

        // Set storage backend radio
        const backendRadio = document.querySelector(`input[name="storage_backend"][value="${currentSettings?.storage_backend || 'filesystem'}"]`);
        if (backendRadio) {
            backendRadio.checked = true;
        }

        // Show appropriate settings section
        updateStorageBackendVisibility(currentSettings?.storage_backend || 'filesystem');

        // Populate filesystem settings
        if (currentSettings?.filesystem_path) {
            document.getElementById('storage-filesystem-path').value = currentSettings.filesystem_path;
        }

        // Populate S3 settings
        if (currentSettings?.s3_bucket) {
            document.getElementById('s3-bucket').value = currentSettings.s3_bucket;
        }
        if (currentSettings?.s3_region) {
            document.getElementById('s3-region').value = currentSettings.s3_region;
        }
        if (currentSettings?.s3_endpoint) {
            document.getElementById('s3-endpoint').value = currentSettings.s3_endpoint;
        }
        if (currentSettings?.s3_path_style) {
            document.getElementById('s3-path-style').checked = currentSettings.s3_path_style;
        }

        // Enable save button if already configured
        if (currentSettings?.storage_backend === 'filesystem' || currentSettings?.has_s3_config) {
            storageTestPassed = true;
            document.getElementById('save-storage-btn').disabled = false;
        }

        // Load backup stats
        await loadBackupStatsUI();

    } catch (error) {
        document.getElementById('storage-settings-loading').innerHTML = `
            <div class="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-700 dark:text-red-400">
                Failed to load storage settings: ${error.message}
            </div>
        `;
    }
}

async function loadBackupStatsUI() {
    try {
        const backupStats = state.backupStats;
        if (!backupStats) {
            await loadBackupStats();
        }

        const stats = state.backupStats;

        document.getElementById('backup-stats-loading')?.classList.add('hidden');
        document.getElementById('backup-stats-container')?.classList.remove('hidden');

        document.getElementById('backup-matters-count').textContent = stats?.counts?.matters ?? 0;
        document.getElementById('backup-notes-count').textContent = stats?.counts?.private_notes ?? 0;
        document.getElementById('backup-attachments-count').textContent = stats?.counts?.attachments ?? 0;
        document.getElementById('backup-attachments-size').textContent = formatBytes(stats?.attachment_total_size ?? 0);
        document.getElementById('backup-audit-count').textContent = stats?.counts?.audit_log ?? 0;
        document.getElementById('backup-users-count').textContent = stats?.counts?.users ?? 0;

        // Show S3 options if using S3
        if (stats?.storage_backend === 's3') {
            document.getElementById('backup-s3-options')?.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Failed to load backup stats:', error);
        document.getElementById('backup-stats-loading').textContent = 'Failed to load backup info';
    }
}

function updateStorageBackendVisibility(backend) {
    const filesystemSettings = document.getElementById('filesystem-settings');
    const s3Settings = document.getElementById('s3-settings');

    if (backend === 's3') {
        filesystemSettings?.classList.add('hidden');
        s3Settings?.classList.remove('hidden');
    } else {
        filesystemSettings?.classList.remove('hidden');
        s3Settings?.classList.add('hidden');
    }
}

function setupEventListeners() {
    // Storage backend toggle
    document.querySelectorAll('input[name="storage_backend"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateStorageBackendVisibility(e.target.value);
            storageTestPassed = false;
            document.getElementById('save-storage-btn').disabled = true;
            document.getElementById('storage-test-result')?.classList.add('hidden');
        });
    });

    // Password toggle buttons
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.target.dataset.target;
            const input = document.getElementById(targetId);
            if (input.type === 'password') {
                input.type = 'text';
                e.target.textContent = 'Hide';
            } else {
                input.type = 'password';
                e.target.textContent = 'Show';
            }
        });
    });

    // Help modal
    document.getElementById('storage-help-btn')?.addEventListener('click', () => {
        document.getElementById('storage-help-modal')?.classList.remove('hidden');
    });

    document.getElementById('close-storage-help')?.addEventListener('click', () => {
        document.getElementById('storage-help-modal')?.classList.add('hidden');
    });

    document.getElementById('storage-help-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'storage-help-modal') {
            e.target.classList.add('hidden');
        }
    });

    // Test connection
    document.getElementById('test-storage-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('test-storage-btn');
        const resultDiv = document.getElementById('storage-test-result');
        const selectedBackend = document.querySelector('input[name="storage_backend"]:checked')?.value || 'filesystem';

        btn.disabled = true;
        btn.textContent = 'Testing...';
        resultDiv.classList.add('hidden');

        try {
            let result;

            if (selectedBackend === 's3') {
                const config = {
                    access_key_id: document.getElementById('s3-access-key').value,
                    secret_access_key: document.getElementById('s3-secret-key').value,
                    bucket: document.getElementById('s3-bucket').value,
                    region: document.getElementById('s3-region').value,
                    endpoint: document.getElementById('s3-endpoint').value || null,
                    path_style: document.getElementById('s3-path-style').checked
                };

                if (!config.access_key_id || !config.secret_access_key || !config.bucket) {
                    throw new Error('Access Key ID, Secret Access Key, and Bucket Name are required');
                }

                result = await api.testStorageConnection('s3', config);
            } else {
                const config = {
                    path: document.getElementById('storage-filesystem-path').value || null
                };
                result = await api.testStorageConnection('filesystem', config);
            }

            resultDiv.classList.remove('hidden');

            if (result.success) {
                resultDiv.innerHTML = `
                    <div class="p-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-green-900 dark:text-green-300">
                        <span class="font-medium">Success!</span> ${result.message}
                    </div>
                `;
                storageTestPassed = true;
                document.getElementById('save-storage-btn').disabled = false;
            } else {
                resultDiv.innerHTML = `
                    <div class="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-red-900 dark:text-red-300">
                        <span class="font-medium">Failed:</span> ${result.message}
                    </div>
                `;
                storageTestPassed = false;
                document.getElementById('save-storage-btn').disabled = true;
            }
        } catch (error) {
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = `
                <div class="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-red-900 dark:text-red-300">
                    <span class="font-medium">Error:</span> ${error.message}
                </div>
            `;
            storageTestPassed = false;
            document.getElementById('save-storage-btn').disabled = true;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Test Connection';
        }
    });

    // Save storage settings
    document.getElementById('save-storage-btn')?.addEventListener('click', async () => {
        if (!storageTestPassed) {
            showToast('Please test the connection first', 'error');
            return;
        }

        const btn = document.getElementById('save-storage-btn');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const selectedBackend = document.querySelector('input[name="storage_backend"]:checked')?.value || 'filesystem';

            const settings = {
                storage_backend: selectedBackend
            };

            if (selectedBackend === 's3') {
                settings.s3_access_key_id = document.getElementById('s3-access-key').value;
                settings.s3_secret_access_key = document.getElementById('s3-secret-key').value;
                settings.s3_bucket = document.getElementById('s3-bucket').value;
                settings.s3_region = document.getElementById('s3-region').value;
                settings.s3_endpoint = document.getElementById('s3-endpoint').value || '';
                settings.s3_path_style = document.getElementById('s3-path-style').checked;
            } else {
                settings.filesystem_path = document.getElementById('storage-filesystem-path').value || '';
            }

            await api.updateStorageSettings(settings);
            showToast('Storage settings saved successfully', 'success');
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Storage Settings';
        }
    });

    // Create Backup button
    document.getElementById('create-backup-btn')?.addEventListener('click', handleCreateBackup);

    // Restore file dropzone and input
    const dropzone = document.getElementById('restore-dropzone');
    const fileInput = document.getElementById('restore-file-input');

    dropzone?.addEventListener('click', () => fileInput?.click());
    dropzone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-purple-500', 'bg-purple-50', 'dark:bg-purple-900/20');
    });
    dropzone?.addEventListener('dragleave', () => {
        dropzone.classList.remove('border-purple-500', 'bg-purple-50', 'dark:bg-purple-900/20');
    });
    dropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-purple-500', 'bg-purple-50', 'dark:bg-purple-900/20');
        const file = e.dataTransfer?.files[0];
        if (file && file.name.endsWith('.zip')) {
            handleRestoreFileSelected(file);
        } else {
            showToast('Please select a valid ZIP file', 'error');
        }
    });
    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleRestoreFileSelected(file);
        }
    });

    // Restore confirmation input
    document.getElementById('restore-confirmation')?.addEventListener('input', (e) => {
        const btn = document.getElementById('restore-backup-btn');
        if (btn) {
            btn.disabled = e.target.value !== 'RESTORE BACKUP';
        }
    });

    // Restore backup button
    document.getElementById('restore-backup-btn')?.addEventListener('click', handleRestoreBackup);

    // Cancel restore button
    document.getElementById('restore-cancel-btn')?.addEventListener('click', () => {
        document.getElementById('restore-preview')?.classList.add('hidden');
        document.getElementById('restore-dropzone')?.classList.remove('hidden');
        document.getElementById('restore-file-input').value = '';
        selectedRestoreFile = null;
    });
}

async function handleCreateBackup() {
    const btn = document.getElementById('create-backup-btn');
    const progressDiv = document.getElementById('backup-progress');
    const progressBar = document.getElementById('backup-progress-bar');
    const progressText = document.getElementById('backup-progress-text');

    const includeAttachments = document.getElementById('backup-include-attachments')?.checked ?? true;
    const includeAuditLog = document.getElementById('backup-include-audit')?.checked ?? false;
    const s3Mode = document.querySelector('input[name="backup-s3-mode"]:checked')?.value || 'full';

    btn.disabled = true;
    progressDiv?.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Creating backup...';

    let progress = 0;
    const progressInterval = setInterval(() => {
        progress = Math.min(progress + Math.random() * 10, 90);
        progressBar.style.width = `${progress}%`;
    }, 200);

    try {
        const { blob, filename } = await api.createBackup({
            includeAttachments,
            includeAuditLog,
            s3Mode
        });

        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        progressText.textContent = 'Download starting...';

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast('Backup created successfully', 'success');
    } catch (error) {
        console.error('Backup failed:', error);
        showToast(`Backup failed: ${error.message}`, 'error');
    } finally {
        clearInterval(progressInterval);
        btn.disabled = false;
        progressDiv?.classList.add('hidden');
    }
}

async function handleRestoreFileSelected(file) {
    selectedRestoreFile = file;

    const dropzone = document.getElementById('restore-dropzone');
    const preview = document.getElementById('restore-preview');
    const warningsDiv = document.getElementById('restore-warnings');

    dropzone?.classList.add('hidden');

    try {
        restorePreview = await api.previewBackup(file);

        const backupDate = new Date(restorePreview.manifest.created_at);
        document.getElementById('restore-backup-date').textContent =
            `Backup from: ${backupDate.toLocaleDateString()} ${backupDate.toLocaleTimeString()}`;
        document.getElementById('restore-backup-version').textContent =
            `App version: ${restorePreview.manifest.app_version}`;

        document.getElementById('restore-matters-count').textContent = restorePreview.counts.matters;
        document.getElementById('restore-notes-count').textContent = restorePreview.counts.private_notes;
        document.getElementById('restore-attachments-count').textContent = restorePreview.counts.attachments;
        document.getElementById('restore-audit-count').textContent = restorePreview.counts.audit_log_entries;
        document.getElementById('restore-users-count').textContent = restorePreview.counts.users;

        if (restorePreview.warnings && restorePreview.warnings.length > 0) {
            warningsDiv.innerHTML = restorePreview.warnings.map(w => `
                <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 mb-2">
                    <p class="text-xs text-amber-700 dark:text-amber-300 flex items-center">
                        <svg class="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                        </svg>
                        ${w.message}
                    </p>
                </div>
            `).join('');
            warningsDiv.classList.remove('hidden');
        } else {
            warningsDiv.classList.add('hidden');
        }

        preview?.classList.remove('hidden');
        document.getElementById('restore-confirmation').value = '';
        document.getElementById('restore-backup-btn').disabled = true;
    } catch (error) {
        console.error('Preview failed:', error);
        showToast(`Invalid backup file: ${error.message}`, 'error');
        dropzone?.classList.remove('hidden');
        selectedRestoreFile = null;
    }
}

async function handleRestoreBackup() {
    if (!selectedRestoreFile || !restorePreview) return;

    const btn = document.getElementById('restore-backup-btn');
    const progressDiv = document.getElementById('restore-progress');
    const progressBar = document.getElementById('restore-progress-bar');
    const progressText = document.getElementById('restore-progress-text');

    const confirmed = await showConfirm(
        'Restore Backup',
        `This will replace ALL existing data with the backup contents. This action cannot be undone.\n\n` +
        `The backup contains:\n` +
        `- ${restorePreview.counts.matters} matters\n` +
        `- ${restorePreview.counts.private_notes} private notes\n` +
        `- ${restorePreview.counts.attachments} attachments\n` +
        `- ${restorePreview.counts.users} users\n\n` +
        `After restore, you will be logged out and redirected to the login page.`,
        'Restore',
        'Cancel',
        'destructive'
    );

    if (!confirmed) return;

    btn.disabled = true;
    document.getElementById('restore-cancel-btn').disabled = true;
    progressDiv?.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Restoring backup...';

    let progress = 0;
    const progressInterval = setInterval(() => {
        progress = Math.min(progress + Math.random() * 5, 90);
        progressBar.style.width = `${progress}%`;
    }, 300);

    try {
        await api.restoreBackup(selectedRestoreFile, 'RESTORE BACKUP');

        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        progressText.textContent = 'Restore complete! Redirecting to login...';

        showToast('Backup restored successfully. Redirecting to login...', 'success');

        setTimeout(() => {
            window.location.href = '/admin/login.html';
        }, 2000);
    } catch (error) {
        clearInterval(progressInterval);
        console.error('Restore failed:', error);
        showToast(`Restore failed: ${error.message}`, 'error');
        btn.disabled = false;
        document.getElementById('restore-cancel-btn').disabled = false;
        progressDiv?.classList.add('hidden');
    }
}
