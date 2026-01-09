/**
 * Security Settings Component
 * API Keys, Authentication, Change Password
 */

import api from '../api.js';
import auth from '../auth.js';
import { showConfirm } from '../modal.js';

export async function renderSecurity(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        const { settings } = await api.getSettings();

        container.innerHTML = `
            <div class="mb-4">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Security</h1>
                <p class="text-gray-600 dark:text-gray-400">API keys, authentication, and password management</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <p class="text-xs text-gray-500 dark:text-gray-400">Use this API key to authenticate programmatic access to the Legal Tracker API.</p>
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
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">When enabled, API requests require authentication.</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">IP Whitelist (comma-separated)</label>
                            <input type="text" id="ip-whitelist" value="${settings.ip_whitelist || ''}" placeholder="127.0.0.1, 192.168.1.1" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Restrict API access to these IP addresses. Leave empty to allow all.</p>
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
                        <button type="submit" class="w-full text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-6 py-2 text-sm">Change Password</button>
                    </form>
                </div>

                <!-- File Storage Settings (full width) -->
                <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">File Storage</h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400">Configure storage for matter attachments</p>
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
                                    <li>Attach the following policy (replace YOUR_BUCKET_NAME):</li>
                                </ul>
                                <pre class="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-x-auto">{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR_BUCKET_NAME",
                "arn:aws:s3:::YOUR_BUCKET_NAME/*"
            ]
        }
    ]
}</pre>
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

                        <!-- Wasabi Setup -->
                        <details class="border border-gray-200 dark:border-gray-700 rounded-lg">
                            <summary class="px-4 py-3 bg-gray-50 dark:bg-gray-700 cursor-pointer font-medium">Wasabi Setup</summary>
                            <div class="p-4 space-y-3">
                                <ul class="list-disc ml-6 space-y-1">
                                    <li>Create a bucket in Wasabi console</li>
                                    <li>Create access keys under Access Keys section</li>
                                    <li>Set endpoint based on region (e.g., https://s3.wasabisys.com for us-east-1)</li>
                                    <li>Other regions: s3.us-west-1.wasabisys.com, s3.eu-central-1.wasabisys.com, etc.</li>
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
                                <p><strong>CORS Errors:</strong> This typically indicates network/firewall issues since uploads go through the backend</p>
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        `;

        setupEventListeners(settings);
        await loadStorageSettings();

    } catch (error) {
        container.innerHTML = `
            <div class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
                <span class="font-medium">Error!</span> Failed to load security settings: ${error.message}
            </div>
        `;
    }
}

function setupEventListeners(currentSettings) {
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
        const confirmed = await showConfirm('Are you sure you want to regenerate the API key? The old key will stop working.', {
            title: 'Regenerate API Key',
            confirmText: 'Regenerate',
            cancelText: 'Cancel',
            type: 'danger'
        });

        if (!confirmed) {
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
            const username = auth.getUser()?.username;
            if (!username) {
                throw new Error('User not authenticated');
            }
            const hashedCurrentPassword = await auth.hashPassword(username, current);
            const hashedNewPassword = await auth.hashPassword(username, newPassword);

            const response = await api.changePassword(hashedCurrentPassword, hashedNewPassword);

            showToast(response.message || 'Password changed successfully. Redirecting to login...', 'success');
            e.target.reset();

            auth.currentUser = null;
            auth.isAuthenticated = false;

            setTimeout(() => {
                window.location.href = '/admin';
            }, 2000);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });
}

// Storage settings state
let storageTestPassed = false;
let currentStorageSettings = null;

async function loadStorageSettings() {
    try {
        const settings = await api.getStorageSettings();
        currentStorageSettings = settings;

        // Show content, hide loading
        document.getElementById('storage-settings-loading')?.classList.add('hidden');
        document.getElementById('storage-settings-content')?.classList.remove('hidden');

        // Set storage backend radio
        const backendRadio = document.querySelector(`input[name="storage_backend"][value="${settings.storage_backend || 'filesystem'}"]`);
        if (backendRadio) {
            backendRadio.checked = true;
        }

        // Show appropriate settings section
        updateStorageBackendVisibility(settings.storage_backend || 'filesystem');

        // Populate filesystem settings
        if (settings.filesystem_path) {
            document.getElementById('storage-filesystem-path').value = settings.filesystem_path;
        }

        // Populate S3 settings (but not secret values - those are not returned from API)
        if (settings.s3_bucket) {
            document.getElementById('s3-bucket').value = settings.s3_bucket;
        }
        if (settings.s3_region) {
            document.getElementById('s3-region').value = settings.s3_region;
        }
        if (settings.s3_endpoint) {
            document.getElementById('s3-endpoint').value = settings.s3_endpoint;
        }
        if (settings.s3_path_style) {
            document.getElementById('s3-path-style').checked = settings.s3_path_style;
        }

        // Enable save button if already configured
        if (settings.storage_backend === 'filesystem' || settings.has_s3_config) {
            storageTestPassed = true;
            document.getElementById('save-storage-btn').disabled = false;
        }

        setupStorageEventListeners();

    } catch (error) {
        document.getElementById('storage-settings-loading').innerHTML = `
            <div class="p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-700 dark:text-red-400">
                Failed to load storage settings: ${error.message}
            </div>
        `;
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

function setupStorageEventListeners() {
    // Storage backend toggle
    document.querySelectorAll('input[name="storage_backend"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateStorageBackendVisibility(e.target.value);
            // Reset test status when changing backend
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

    // Close modal on outside click
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

                // Validate required fields
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
