/**
 * Audit Log Component
 * Displays system audit log entries with pagination, search, filtering, and export
 */

import api from '../api.js';
import { formatDate, escapeHtml } from '../display-utils.js';

let currentPage = 1;
let currentLevels = []; // Now an array for multi-select
let currentLimit = 25;
let currentSearch = '';
let currentStartDate = '';
let currentEndDate = '';
let currentUsername = '';
let currentActionType = '';
let currentEntityType = '';
let expandedRows = new Set();
let tbodyClickHandler = null;
let settingsLoaded = false;
let currentLogLevel = 'INFO';
let isApiLoggingActive = false;
let searchDebounceTimer = null;
let autoRefreshEnabled = false;
let autoRefreshInterval = null;
const AUTO_REFRESH_INTERVAL_MS = 10000; // 10 seconds

// Filter options loaded from API
let filterOptions = {
    users: [],
    actionTypes: [],
    entityTypes: []
};

// Stats loaded from API
let stats = {
    errorsLast24h: 0,
    warningsLast24h: 0,
    securityLast24h: 0,
    infoLast24h: 0
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_SETTING_KEY = 'audit_log_page_size';
const SEARCH_DEBOUNCE_MS = 300;

// Level badge colors
const LEVEL_COLORS = {
    ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    SECURITY: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    WARNING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    INFO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    DEBUG: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
};

// Level pill button colors (for filter pills)
const LEVEL_PILL_COLORS = {
    ERROR: { active: 'bg-red-600 text-white border-red-600', inactive: 'bg-white text-red-700 border-red-300 hover:bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30' },
    SECURITY: { active: 'bg-orange-600 text-white border-orange-600', inactive: 'bg-white text-orange-700 border-orange-300 hover:bg-orange-50 dark:bg-gray-800 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-900/30' },
    WARNING: { active: 'bg-yellow-500 text-white border-yellow-500', inactive: 'bg-white text-yellow-700 border-yellow-300 hover:bg-yellow-50 dark:bg-gray-800 dark:text-yellow-400 dark:border-yellow-700 dark:hover:bg-yellow-900/30' },
    INFO: { active: 'bg-blue-600 text-white border-blue-600', inactive: 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/30' },
    DEBUG: { active: 'bg-purple-600 text-white border-purple-600', inactive: 'bg-white text-purple-700 border-purple-300 hover:bg-purple-50 dark:bg-gray-800 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-900/30' }
};

export async function renderAuditLog(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        // Load settings, filters, and stats
        try {
            const [settingsResponse, filtersResponse, statsResponse] = await Promise.all([
                api.getSettings(),
                api.getAuditLogFilters(),
                api.getAuditLogStats()
            ]);

            // Settings are nested under 'settings' property in API response
            const settings = settingsResponse.settings || {};

            // Only load page size preference on first render (user preference)
            if (!settingsLoaded && settings[PAGE_SIZE_SETTING_KEY]) {
                const savedLimit = parseInt(settings[PAGE_SIZE_SETTING_KEY]);
                if (PAGE_SIZE_OPTIONS.includes(savedLimit)) {
                    currentLimit = savedLimit;
                }
            }

            // Always refresh log level and API logging settings (can change in system info)
            currentLogLevel = settings.audit_log_level || 'INFO';
            isApiLoggingActive = settings.log_api_requests === 'true';

            // Store filter options
            filterOptions = {
                users: filtersResponse.users || [],
                actionTypes: filtersResponse.actionTypes || [],
                entityTypes: filtersResponse.entityTypes || []
            };

            // Store stats
            stats = {
                errorsLast24h: statsResponse.errorsLast24h || 0,
                warningsLast24h: statsResponse.warningsLast24h || 0,
                securityLast24h: statsResponse.securityLast24h || 0,
                infoLast24h: statsResponse.infoLast24h || 0
            };

            settingsLoaded = true;
        } catch (e) {
            // Settings not available, use defaults
            console.warn('Failed to load audit log settings:', e);
        }
        await loadAuditLog(container);
    } catch (error) {
        container.innerHTML = `
            <div class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
                <span class="font-medium">Error!</span> Failed to load audit log: ${error.message}
            </div>
        `;
    }
}

async function loadAuditLog(container) {
    const data = await api.getAuditLog({
        page: currentPage,
        limit: currentLimit,
        levels: currentLevels.length > 0 ? currentLevels.join(',') : undefined,
        search: currentSearch || undefined,
        startDate: currentStartDate || undefined,
        endDate: currentEndDate || undefined,
        username: currentUsername || undefined,
        actionType: currentActionType || undefined,
        entityType: currentEntityType || undefined
    });

    const { entries, total, page, totalPages } = data;

    // Check if any filters are active
    const hasActiveFilters = currentLevels.length > 0 || currentSearch || currentStartDate || currentEndDate ||
                             currentUsername || currentActionType || currentEntityType;

    container.innerHTML = `
        <div class="mb-4 flex items-start justify-between">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
                <p class="text-gray-600 dark:text-gray-400">System activity and security events</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-help ${
                    currentLogLevel === 'DEBUG' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
                    currentLogLevel === 'INFO' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                    currentLogLevel === 'WARNING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                    currentLogLevel === 'SECURITY' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }" title="Minimum log level. Events at this level and above (more severe) are logged. DEBUG=most verbose, ERROR=least verbose.">
                    <span class="w-2 h-2 ${
                        currentLogLevel === 'DEBUG' ? 'bg-purple-500' :
                        currentLogLevel === 'INFO' ? 'bg-blue-500' :
                        currentLogLevel === 'WARNING' ? 'bg-yellow-500' :
                        currentLogLevel === 'SECURITY' ? 'bg-orange-500' :
                        'bg-red-500'
                    } rounded-full mr-1.5"></span>
                    Log Level: ${currentLogLevel}
                </span>
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-help ${isApiLoggingActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}" title="When enabled, logs all admin API requests with method, path, and response time.">
                    <span class="w-2 h-2 ${isApiLoggingActive ? 'bg-green-500' : 'bg-gray-400'} rounded-full mr-1.5"></span>
                    API Logging: ${isApiLoggingActive ? 'ON' : 'OFF'}
                </span>
                <a href="#/system-info" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Settings</a>
            </div>
        </div>

        <!-- Stats Row -->
        <div class="mb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
                <div class="text-xs text-gray-500 dark:text-gray-400">Total Entries</div>
                <div class="text-xl font-bold text-gray-900 dark:text-white">${total.toLocaleString()}</div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-3 ${stats.errorsLast24h > 0 ? 'border-l-4 border-l-red-500' : ''}">
                <div class="text-xs text-gray-500 dark:text-gray-400">Errors (24h)</div>
                <div class="text-xl font-bold ${stats.errorsLast24h > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}">${stats.errorsLast24h}</div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-3 ${stats.securityLast24h > 0 ? 'border-l-4 border-l-orange-500' : ''}">
                <div class="text-xs text-gray-500 dark:text-gray-400">Security (24h)</div>
                <div class="text-xl font-bold ${stats.securityLast24h > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}">${stats.securityLast24h}</div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-3 ${stats.warningsLast24h > 0 ? 'border-l-4 border-l-yellow-500' : ''}">
                <div class="text-xs text-gray-500 dark:text-gray-400">Warnings (24h)</div>
                <div class="text-xl font-bold ${stats.warningsLast24h > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}">${stats.warningsLast24h}</div>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
                <div class="text-xs text-gray-500 dark:text-gray-400">Info (24h)</div>
                <div class="text-xl font-bold text-blue-600 dark:text-blue-400">${stats.infoLast24h}</div>
            </div>
        </div>

        <!-- Actions Row -->
        <div class="mb-4 flex justify-between items-center">
            <div class="flex items-center gap-3">
                <button id="refresh-btn" class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg shadow transition-colors" title="Refresh now">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Refresh
                </button>
                <label class="flex items-center gap-2 cursor-pointer">
                    <div class="relative">
                        <input type="checkbox" id="auto-refresh-toggle" class="sr-only peer" ${autoRefreshEnabled ? 'checked' : ''}>
                        <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </div>
                    <span class="text-sm text-gray-700 dark:text-gray-300">Auto-refresh</span>
                    <span id="auto-refresh-indicator" class="text-xs text-gray-500 dark:text-gray-400 ${autoRefreshEnabled ? '' : 'hidden'}">(every 10s)</span>
                </label>
            </div>
            <button id="export-csv-btn" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg shadow transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Export CSV
            </button>
        </div>

        ${currentLogLevel === 'DEBUG' || isApiLoggingActive ? `
            <div class="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div class="flex items-center text-purple-800 dark:text-purple-300">
                    <svg class="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="font-medium">Verbose logging active:</span>
                    <span class="ml-2 text-sm font-normal">
                        ${currentLogLevel === 'DEBUG' ? 'DEBUG level (Claude API calls, storage operations, presigned URLs)' : ''}
                        ${currentLogLevel === 'DEBUG' && isApiLoggingActive ? ' + ' : ''}
                        ${isApiLoggingActive ? 'API request logging (all admin API calls with timing)' : ''}
                    </span>
                </div>
            </div>
        ` : ''}

        <!-- Search and Quick Filters -->
        <div class="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div class="flex flex-wrap gap-4 items-end">
                <!-- Search Box -->
                <div class="flex-1 min-w-[200px]">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                    <div class="relative">
                        <input type="text" id="search-input" value="${escapeHtml(currentSearch)}" placeholder="Search logs..."
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                        </div>
                        ${currentSearch ? `
                            <button id="clear-search" class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Quick Filters -->
                <div class="flex gap-2">
                    <button id="quick-filter-errors" class="px-3 py-2 text-xs font-medium rounded-lg border ${currentLevels.length === 1 && currentLevels[0] === 'ERROR' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-300 hover:bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-700'}">
                        Errors Only
                    </button>
                    <button id="quick-filter-1h" class="px-3 py-2 text-xs font-medium rounded-lg border ${isLastHourFilter() ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'}">
                        Last Hour
                    </button>
                    <button id="quick-filter-24h" class="px-3 py-2 text-xs font-medium rounded-lg border ${isLast24hFilter() ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'}">
                        Last 24h
                    </button>
                    <button id="quick-filter-7d" class="px-3 py-2 text-xs font-medium rounded-lg border ${isLast7dFilter() ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'}">
                        Last 7 Days
                    </button>
                    ${hasActiveFilters ? `
                        <button id="clear-all-filters" class="px-3 py-2 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
                            Clear All
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Level Pills -->
            <div class="mt-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Level</label>
                <div class="flex flex-wrap gap-2">
                    ${['ERROR', 'SECURITY', 'WARNING', 'INFO', 'DEBUG'].map(level => {
                        const isActive = currentLevels.includes(level);
                        const colors = LEVEL_PILL_COLORS[level];
                        return `<button data-level="${level}" class="level-pill px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${isActive ? colors.active : colors.inactive}">
                            ${level}
                        </button>`;
                    }).join('')}
                </div>
            </div>

            <!-- Advanced Filters (collapsible) -->
            <details class="mt-4">
                <summary class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">
                    Advanced Filters ${(currentStartDate || currentEndDate || currentUsername || currentActionType || currentEntityType) ? '(active)' : ''}
                </summary>
                <div class="mt-3 grid grid-cols-2 md:grid-cols-5 gap-4">
                    <!-- Date Range -->
                    <div>
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                        <input type="date" id="start-date-filter" value="${currentStartDate}"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                        <input type="date" id="end-date-filter" value="${currentEndDate}"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>

                    <!-- User Filter -->
                    <div>
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">User</label>
                        <select id="user-filter" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="">All Users</option>
                            ${filterOptions.users.map(u => `<option value="${escapeHtml(u)}" ${currentUsername === u ? 'selected' : ''}>${escapeHtml(u)}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Action Type Filter -->
                    <div>
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
                        <select id="action-type-filter" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="">All Actions</option>
                            ${filterOptions.actionTypes.map(a => `<option value="${escapeHtml(a)}" ${currentActionType === a ? 'selected' : ''}>${escapeHtml(a)}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Entity Type Filter -->
                    <div>
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Entity</label>
                        <select id="entity-type-filter" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="">All Entities</option>
                            ${filterOptions.entityTypes.map(e => `<option value="${escapeHtml(e)}" ${currentEntityType === e ? 'selected' : ''}>${escapeHtml(e)}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </details>
        </div>

        <!-- Per Page and Top Pagination -->
        <div class="mb-4 flex flex-wrap gap-4 items-end justify-between">
            <div class="flex flex-wrap gap-4 items-end">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Per Page</label>
                    <select id="page-size" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        ${PAGE_SIZE_OPTIONS.map(size => `<option value="${size}" ${currentLimit === size ? 'selected' : ''}>${size}</option>`).join('')}
                    </select>
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 pb-2">
                    ${total} entries ${hasActiveFilters ? '(filtered)' : 'total'}
                </div>
            </div>
            ${total > 0 ? `
                <div class="flex items-center gap-3">
                    <div class="flex items-center gap-2">
                        <span class="text-sm text-gray-600 dark:text-gray-400">Page</span>
                        <input type="number" id="goto-page" min="1" max="${totalPages}" value="${page}" class="w-16 px-2 py-1.5 text-sm text-center border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <span class="text-sm text-gray-600 dark:text-gray-400">of ${totalPages}</span>
                    </div>
                    <div class="flex gap-2">
                        <button id="prev-page-top" ${page === 1 ? 'disabled' : ''} class="px-4 py-2 text-sm font-medium rounded-lg ${page === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'}">Previous</button>
                        <button id="next-page-top" ${page === totalPages ? 'disabled' : ''} class="px-4 py-2 text-sm font-medium rounded-lg ${page === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'}">Next</button>
                    </div>
                </div>
            ` : ''}
        </div>

        <!-- Table -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th class="px-4 py-3 w-8"></th>
                            <th class="px-4 py-3">Timestamp</th>
                            <th class="px-4 py-3">Level</th>
                            <th class="px-4 py-3">User</th>
                            <th class="px-4 py-3">Action</th>
                            <th class="px-4 py-3">Entity</th>
                            <th class="px-4 py-3">Summary</th>
                        </tr>
                    </thead>
                    <tbody id="audit-log-body">
                        ${entries.length === 0 ? `
                            <tr>
                                <td colspan="7" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                    ${hasActiveFilters ? 'No entries match the current filters' : 'No audit log entries yet'}
                                </td>
                            </tr>
                        ` : entries.map(entry => renderRow(entry)).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Pagination -->
        ${total > 0 ? `
            <div class="mt-4 flex items-center justify-between">
                <div class="text-sm text-gray-700 dark:text-gray-400">
                    Showing ${(page - 1) * currentLimit + 1}-${Math.min(page * currentLimit, total)} of ${total}
                </div>
                <div class="flex gap-3">
                    <button id="prev-page" ${page === 1 ? 'disabled' : ''} class="px-4 py-2 text-sm font-medium rounded-lg ${page === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'}">Previous</button>
                    <button id="next-page" ${page === totalPages ? 'disabled' : ''} class="px-4 py-2 text-sm font-medium rounded-lg ${page === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'}">Next</button>
                </div>
            </div>
        ` : ''}
    `;

    setupEventListeners(container);
}

// Helper functions for quick filter detection
function isLastHourFilter() {
    if (!currentStartDate || currentEndDate) return false;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const filterDate = new Date(currentStartDate);
    return Math.abs(filterDate - oneHourAgo) < 60000; // Within a minute
}

function isLast24hFilter() {
    if (!currentStartDate || currentEndDate) return false;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filterDate = new Date(currentStartDate);
    return Math.abs(filterDate - oneDayAgo) < 60000;
}

function isLast7dFilter() {
    if (!currentStartDate || currentEndDate) return false;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const filterDate = new Date(currentStartDate);
    return Math.abs(filterDate - sevenDaysAgo) < 60000;
}

function renderRow(entry) {
    const isExpanded = expandedRows.has(entry.id);
    const hasDetails = entry.details || entry.request || entry.response || entry.stack_trace;
    const isError = entry.level === 'ERROR';
    const isSecurity = entry.level === 'SECURITY';
    const isDebug = entry.level === 'DEBUG';

    // Determine row styling based on level
    let borderClass = '';
    let bgClass = '';
    if (isError) borderClass = 'border-l-4 border-l-red-500';
    else if (isSecurity) borderClass = 'border-l-4 border-l-orange-500';
    else if (isDebug) {
        borderClass = 'border-l-4 border-l-purple-400';
        bgClass = 'bg-purple-50/50 dark:bg-purple-900/10';
    }

    return `
        <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${hasDetails ? 'cursor-pointer' : ''} ${borderClass} ${bgClass}" data-entry-id="${entry.id}">
            <td class="px-4 py-3">
                ${hasDetails ? `
                    <svg class="w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                ` : ''}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-xs">
                ${formatDate(entry.timestamp, { format: 'datetime', placeholder: '-' })}
            </td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${LEVEL_COLORS[entry.level] || LEVEL_COLORS.INFO}">
                    ${entry.level}
                </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
                ${entry.username || '-'}
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
                ${escapeHtml(entry.action_type || '-')}
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
                ${entry.entity_type ? `${escapeHtml(entry.entity_type)}${entry.entity_id ? ` #${entry.entity_id}` : ''}` : '-'}
            </td>
            <td class="px-4 py-3">
                ${escapeHtml(entry.summary || '')}
            </td>
        </tr>
        ${isExpanded && hasDetails ? renderDetailsRow(entry) : ''}
    `;
}

function renderDetailsRow(entry) {
    const isDebug = entry.level === 'DEBUG';
    const isApiCall = entry.entity_type === 'claude_api' || (entry.request && entry.response);
    const detailsBgClass = isDebug ? 'bg-purple-50/30 dark:bg-purple-900/5' : 'bg-gray-50 dark:bg-gray-900';

    return `
        <tr class="${detailsBgClass}" data-details-for="${entry.id}">
            <td colspan="7" class="px-4 py-4">
                <div class="space-y-3 text-sm">
                    ${entry.ip_address ? `
                        <div>
                            <span class="font-medium text-gray-700 dark:text-gray-300">IP Address:</span>
                            <span class="ml-2 text-gray-600 dark:text-gray-400">${escapeHtml(entry.ip_address)}</span>
                        </div>
                    ` : ''}
                    ${entry.duration_ms !== undefined && entry.duration_ms !== null ? `
                        <div>
                            <span class="font-medium text-gray-700 dark:text-gray-300">Duration:</span>
                            <span class="ml-2 text-gray-600 dark:text-gray-400">${entry.duration_ms}ms</span>
                        </div>
                    ` : ''}
                    ${entry.details ? `
                        <div>
                            <span class="font-medium text-gray-700 dark:text-gray-300">Details:</span>
                            <pre class="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto max-h-64">${escapeHtml(JSON.stringify(entry.details, null, 2))}</pre>
                        </div>
                    ` : ''}
                    ${entry.request ? `
                        <div>
                            <div class="flex items-center justify-between mb-1">
                                <span class="font-medium ${isApiCall ? 'text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}">Request:</span>
                                <button class="copy-json-btn px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600" data-json="${escapeHtml(JSON.stringify(entry.request, null, 2)).replace(/"/g, '&quot;')}">
                                    Copy
                                </button>
                            </div>
                            <pre class="p-3 ${isApiCall ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-gray-100 dark:bg-gray-800'} rounded text-xs overflow-x-auto max-h-64">${escapeHtml(JSON.stringify(entry.request, null, 2))}</pre>
                        </div>
                    ` : ''}
                    ${entry.response ? `
                        <div>
                            <div class="flex items-center justify-between mb-1">
                                <span class="font-medium ${isApiCall ? 'text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}">Response:</span>
                                <button class="copy-json-btn px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600" data-json="${escapeHtml(JSON.stringify(entry.response, null, 2)).replace(/"/g, '&quot;')}">
                                    Copy
                                </button>
                            </div>
                            <pre class="p-3 ${isApiCall ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-gray-100 dark:bg-gray-800'} rounded text-xs overflow-x-auto max-h-64">${escapeHtml(JSON.stringify(entry.response, null, 2))}</pre>
                        </div>
                    ` : ''}
                    ${entry.stack_trace ? `
                        <div>
                            <div class="flex items-center justify-between">
                                <span class="font-medium text-red-700 dark:text-red-400">Stack Trace:</span>
                                <button class="copy-json-btn px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600" data-json="${escapeHtml(entry.stack_trace).replace(/"/g, '&quot;')}">
                                    Copy
                                </button>
                            </div>
                            <pre class="mt-1 p-3 bg-red-50 dark:bg-red-900/20 rounded text-xs overflow-x-auto text-red-800 dark:text-red-300 whitespace-pre-wrap font-mono max-h-64">${escapeHtml(entry.stack_trace)}</pre>
                        </div>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

function setupEventListeners(container) {
    // Search input with debounce
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(async () => {
                currentSearch = e.target.value.trim();
                currentPage = 1;
                expandedRows.clear();
                await loadAuditLog(container);
            }, SEARCH_DEBOUNCE_MS);
        });
    }

    // Clear search button
    document.getElementById('clear-search')?.addEventListener('click', async () => {
        currentSearch = '';
        currentPage = 1;
        expandedRows.clear();
        await loadAuditLog(container);
    });

    // Level pill buttons (multi-select toggle)
    document.querySelectorAll('.level-pill').forEach(pill => {
        pill.addEventListener('click', async () => {
            const level = pill.dataset.level;
            if (currentLevels.includes(level)) {
                currentLevels = currentLevels.filter(l => l !== level);
            } else {
                currentLevels.push(level);
            }
            currentPage = 1;
            expandedRows.clear();
            await loadAuditLog(container);
        });
    });

    // Quick filter: Errors only
    document.getElementById('quick-filter-errors')?.addEventListener('click', async () => {
        if (currentLevels.length === 1 && currentLevels[0] === 'ERROR') {
            currentLevels = [];
        } else {
            currentLevels = ['ERROR'];
        }
        currentPage = 1;
        expandedRows.clear();
        await loadAuditLog(container);
    });

    // Quick filter: Last hour
    document.getElementById('quick-filter-1h')?.addEventListener('click', async () => {
        if (isLastHourFilter()) {
            currentStartDate = '';
            currentEndDate = '';
        } else {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            currentStartDate = oneHourAgo.toISOString();
            currentEndDate = '';
        }
        currentPage = 1;
        expandedRows.clear();
        await loadAuditLog(container);
    });

    // Quick filter: Last 24h
    document.getElementById('quick-filter-24h')?.addEventListener('click', async () => {
        if (isLast24hFilter()) {
            currentStartDate = '';
            currentEndDate = '';
        } else {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            currentStartDate = oneDayAgo.toISOString();
            currentEndDate = '';
        }
        currentPage = 1;
        expandedRows.clear();
        await loadAuditLog(container);
    });

    // Quick filter: Last 7 days
    document.getElementById('quick-filter-7d')?.addEventListener('click', async () => {
        if (isLast7dFilter()) {
            currentStartDate = '';
            currentEndDate = '';
        } else {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            currentStartDate = sevenDaysAgo.toISOString();
            currentEndDate = '';
        }
        currentPage = 1;
        expandedRows.clear();
        await loadAuditLog(container);
    });

    // Clear all filters
    document.getElementById('clear-all-filters')?.addEventListener('click', async () => {
        currentLevels = [];
        currentSearch = '';
        currentStartDate = '';
        currentEndDate = '';
        currentUsername = '';
        currentActionType = '';
        currentEntityType = '';
        currentPage = 1;
        expandedRows.clear();
        await loadAuditLog(container);
    });

    // Date range filters
    document.getElementById('start-date-filter')?.addEventListener('change', async (e) => {
        currentStartDate = e.target.value ? new Date(e.target.value).toISOString() : '';
        currentPage = 1;
        expandedRows.clear();
        await loadAuditLog(container);
    });

    document.getElementById('end-date-filter')?.addEventListener('change', async (e) => {
        currentEndDate = e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : '';
        currentPage = 1;
        expandedRows.clear();
        await loadAuditLog(container);
    });

    // User filter
    document.getElementById('user-filter')?.addEventListener('change', async (e) => {
        currentUsername = e.target.value;
        currentPage = 1;
        expandedRows.clear();
        await loadAuditLog(container);
    });

    // Action type filter
    document.getElementById('action-type-filter')?.addEventListener('change', async (e) => {
        currentActionType = e.target.value;
        currentPage = 1;
        expandedRows.clear();
        await loadAuditLog(container);
    });

    // Entity type filter
    document.getElementById('entity-type-filter')?.addEventListener('change', async (e) => {
        currentEntityType = e.target.value;
        currentPage = 1;
        expandedRows.clear();
        await loadAuditLog(container);
    });

    // Page size filter
    const pageSizeFilter = document.getElementById('page-size');
    if (pageSizeFilter) {
        pageSizeFilter.addEventListener('change', async () => {
            currentLimit = parseInt(pageSizeFilter.value);
            currentPage = 1;
            expandedRows.clear();
            // Save preference
            try {
                await api.updateSetting(PAGE_SIZE_SETTING_KEY, String(currentLimit));
            } catch (e) {
                // Failed to save, continue anyway
            }
            await loadAuditLog(container);
        });
    }

    // Goto page input
    const gotoPageInput = document.getElementById('goto-page');
    if (gotoPageInput) {
        const handleGotoPage = async () => {
            const targetPage = parseInt(gotoPageInput.value);
            const maxPage = parseInt(gotoPageInput.max);
            if (targetPage >= 1 && targetPage <= maxPage && targetPage !== currentPage) {
                currentPage = targetPage;
                expandedRows.clear();
                await loadAuditLog(container);
            } else {
                // Reset to current page if invalid
                gotoPageInput.value = currentPage;
            }
        };
        gotoPageInput.addEventListener('change', handleGotoPage);
        gotoPageInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await handleGotoPage();
            }
        });
    }

    // Pagination - both top and bottom buttons
    const prevBtns = [document.getElementById('prev-page'), document.getElementById('prev-page-top')];
    const nextBtns = [document.getElementById('next-page'), document.getElementById('next-page-top')];

    for (const prevBtn of prevBtns) {
        if (prevBtn) {
            prevBtn.addEventListener('click', async () => {
                if (currentPage > 1) {
                    currentPage--;
                    expandedRows.clear();
                    await loadAuditLog(container);
                }
            });
        }
    }

    for (const nextBtn of nextBtns) {
        if (nextBtn) {
            nextBtn.addEventListener('click', async () => {
                currentPage++;
                expandedRows.clear();
                await loadAuditLog(container);
            });
        }
    }

    // Export CSV button
    document.getElementById('export-csv-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('export-csv-btn');
        const originalContent = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-sm"></span> Exporting...';

        try {
            const blob = await api.exportAuditLog({
                levels: currentLevels.length > 0 ? currentLevels.join(',') : undefined,
                search: currentSearch || undefined,
                startDate: currentStartDate || undefined,
                endDate: currentEndDate || undefined,
                username: currentUsername || undefined,
                actionType: currentActionType || undefined,
                entityType: currentEntityType || undefined
            });

            // Trigger download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    });

    // Manual refresh button
    document.getElementById('refresh-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('refresh-btn');
        const svg = btn.querySelector('svg');
        svg.classList.add('animate-spin');
        btn.disabled = true;

        try {
            // Reload stats too
            const statsResponse = await api.getAuditLogStats();
            stats = {
                errorsLast24h: statsResponse.errorsLast24h || 0,
                warningsLast24h: statsResponse.warningsLast24h || 0,
                securityLast24h: statsResponse.securityLast24h || 0,
                infoLast24h: statsResponse.infoLast24h || 0
            };
            await loadAuditLog(container);
        } finally {
            svg.classList.remove('animate-spin');
            btn.disabled = false;
        }
    });

    // Auto-refresh toggle
    document.getElementById('auto-refresh-toggle')?.addEventListener('change', (e) => {
        autoRefreshEnabled = e.target.checked;
        const indicator = document.getElementById('auto-refresh-indicator');

        if (autoRefreshEnabled) {
            indicator?.classList.remove('hidden');
            // Start auto-refresh interval
            autoRefreshInterval = setInterval(async () => {
                // Only refresh if we're still on this page
                if (document.getElementById('audit-log-body')) {
                    try {
                        const statsResponse = await api.getAuditLogStats();
                        stats = {
                            errorsLast24h: statsResponse.errorsLast24h || 0,
                            warningsLast24h: statsResponse.warningsLast24h || 0,
                            securityLast24h: statsResponse.securityLast24h || 0,
                            infoLast24h: statsResponse.infoLast24h || 0
                        };
                        await loadAuditLog(container);
                    } catch (e) {
                        console.error('Auto-refresh failed:', e);
                    }
                } else {
                    // Stop if we navigated away
                    clearInterval(autoRefreshInterval);
                    autoRefreshInterval = null;
                }
            }, AUTO_REFRESH_INTERVAL_MS);
        } else {
            indicator?.classList.add('hidden');
            // Stop auto-refresh
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
            }
        }
    });

    // Row expansion - remove old handler to prevent duplicate listeners
    const tbody = document.getElementById('audit-log-body');
    if (tbody) {
        if (tbodyClickHandler) {
            tbody.removeEventListener('click', tbodyClickHandler);
        }
        tbodyClickHandler = async (e) => {
            // Handle copy JSON/text button (for request, response, stack trace)
            const copyBtn = e.target.closest('.copy-json-btn');
            if (copyBtn) {
                e.stopPropagation();
                const textToCopy = copyBtn.dataset.json;
                try {
                    await navigator.clipboard.writeText(textToCopy);
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
                } catch (err) {
                    copyBtn.textContent = 'Failed';
                    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
                }
                return;
            }

            // Ignore clicks on the expanded details row
            const detailsRow = e.target.closest('tr[data-details-for]');
            if (detailsRow) return;

            const row = e.target.closest('tr[data-entry-id]');
            if (!row) return;

            const entryId = parseInt(row.dataset.entryId);
            const hasDetails = row.querySelector('svg'); // Has expand arrow

            if (!hasDetails) return;

            if (expandedRows.has(entryId)) {
                expandedRows.delete(entryId);
            } else {
                expandedRows.add(entryId);
            }

            await loadAuditLog(container);
        };
        tbody.addEventListener('click', tbodyClickHandler);
    }
}
