/**
 * Security Overview Page
 * Summary of security settings and quick navigation
 */

import api from '../../api/index.js';

export async function renderOverview(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        // Load API keys count and usage
        let apiKeyCount = 0;
        let activeKeyCount = 0;
        let revokedKeyCount = 0;
        let totalRequests = 0;
        try {
            const keysResponse = await api.getApiKeys();
            const keys = keysResponse.keys || [];
            apiKeyCount = keys.length;
            activeKeyCount = keys.filter(k => !k.revoked_at && (!k.expires_at || new Date(k.expires_at) > new Date())).length;
            revokedKeyCount = keys.filter(k => k.revoked_at).length;
            totalRequests = keys.reduce((sum, k) => sum + (k.usage?.total_requests || 0), 0);
        } catch (e) {
            // Ignore - might not have permission
        }

        container.innerHTML = `
            <div class="mb-6">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Security Overview</h1>
                <p class="text-gray-600 dark:text-gray-400">Manage API access and account security</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- API Keys Summary -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">External API Keys</h3>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activeKeyCount > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}">
                            ${activeKeyCount} active
                        </span>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        API keys allow external applications to access the admin API with scoped permissions. Each key has its own audit trail.
                    </p>
                    <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                        <span>Total: ${apiKeyCount}${revokedKeyCount > 0 ? ` (${revokedKeyCount} revoked)` : ''}</span>
                        <span>${totalRequests.toLocaleString()} requests</span>
                    </div>
                    <a href="#/security/api-keys" class="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                        Manage API Keys
                        <svg class="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </a>
                </div>

                <!-- Account Security -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Security</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Manage your admin account password and security settings. Regular password changes are recommended.
                    </p>
                    <a href="#/security/account" class="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                        Account Settings
                        <svg class="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </a>
                </div>

                <!-- Quick Links -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                    <div class="space-y-3">
                        <a href="#/security/api-keys" class="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clip-rule="evenodd"></path>
                            </svg>
                            <div>
                                <div class="font-medium text-gray-900 dark:text-white">Create API Key</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">Generate a new key for external access</div>
                            </div>
                            <svg class="w-4 h-4 ml-auto text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                            </svg>
                        </a>
                        <a href="#/security/account" class="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
                            </svg>
                            <div>
                                <div class="font-medium text-gray-900 dark:text-white">Change Password</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">Update your account password</div>
                            </div>
                            <svg class="w-4 h-4 ml-auto text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                            </svg>
                        </a>
                        <a href="#/audit-log" class="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                                <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path>
                            </svg>
                            <div>
                                <div class="font-medium text-gray-900 dark:text-white">View Audit Log</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">Review security events and actions</div>
                            </div>
                            <svg class="w-4 h-4 ml-auto text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                            </svg>
                        </a>
                    </div>
                </div>

                <!-- Environment Info -->
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Public API Access</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Public API authentication is configured via environment variables on the server. Contact your administrator to modify these settings.
                    </p>
                    <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div class="text-xs font-mono text-gray-600 dark:text-gray-400 space-y-1">
                            <div>REQUIRE_AUTH - Require API key for public endpoints</div>
                            <div>API_KEY - Server API key for public API</div>
                            <div>ALLOWED_IPS - IP whitelist for public API</div>
                        </div>
                    </div>
                    <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        See <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">.env.example</code> for configuration options.
                    </p>
                </div>
            </div>
        `;

    } catch (error) {
        container.innerHTML = `
            <div class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
                <span class="font-medium">Error!</span> Failed to load security overview: ${error.message}
            </div>
        `;
    }
}
