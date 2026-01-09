/**
 * Audit Log Component
 * Displays system audit log entries with pagination and filtering
 */

import api from '../api.js';
import { formatDate, escapeHtml } from '../display-utils.js';

let currentPage = 1;
let currentLevel = '';
let currentLimit = 25;
let expandedRows = new Set();
let tbodyClickHandler = null;
let settingsLoaded = false;
let isDebugModeActive = false;

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_SETTING_KEY = 'audit_log_page_size';

// Level badge colors
const LEVEL_COLORS = {
    ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    SECURITY: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    WARNING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    INFO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    DEBUG: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
};

export async function renderAuditLog(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        // Load saved page size preference and debug mode status on first render
        if (!settingsLoaded) {
            try {
                const settings = await api.getSettings();
                if (settings[PAGE_SIZE_SETTING_KEY]) {
                    const savedLimit = parseInt(settings[PAGE_SIZE_SETTING_KEY]);
                    if (PAGE_SIZE_OPTIONS.includes(savedLimit)) {
                        currentLimit = savedLimit;
                    }
                }
                // Check if debug mode is active
                isDebugModeActive = settings.audit_log_level === 'DEBUG';
            } catch (e) {
                // Settings not available, use default
            }
            settingsLoaded = true;
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
        level: currentLevel || undefined
    });

    const { entries, total, page, totalPages } = data;

    container.innerHTML = `
        <div class="mb-4 flex items-start justify-between">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
                <p class="text-gray-600 dark:text-gray-400">System activity and security events</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${isDebugModeActive ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}">
                    <span class="w-2 h-2 ${isDebugModeActive ? 'bg-purple-500' : 'bg-gray-400'} rounded-full mr-1.5"></span>
                    Debug ${isDebugModeActive ? 'ON' : 'OFF'}
                </span>
                <a href="#system-info" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Settings</a>
            </div>
        </div>

        ${isDebugModeActive ? `
            <div class="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div class="flex items-center text-purple-800 dark:text-purple-300">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="font-medium">Debug mode active</span>
                    <span class="ml-2 text-sm font-normal">- verbose logging enabled (Claude API calls, storage operations)</span>
                </div>
            </div>
        ` : ''}

        <!-- Filters and Top Navigation -->
        <div class="mb-4 flex flex-wrap gap-4 items-end justify-between">
            <div class="flex flex-wrap gap-4 items-end">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Level</label>
                    <select id="level-filter" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="">All Levels</option>
                        <option value="ERROR" ${currentLevel === 'ERROR' ? 'selected' : ''}>Error</option>
                        <option value="SECURITY" ${currentLevel === 'SECURITY' ? 'selected' : ''}>Security</option>
                        <option value="WARNING" ${currentLevel === 'WARNING' ? 'selected' : ''}>Warning</option>
                        <option value="INFO" ${currentLevel === 'INFO' ? 'selected' : ''}>Info</option>
                        <option value="DEBUG" ${currentLevel === 'DEBUG' ? 'selected' : ''}>Debug</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Per Page</label>
                    <select id="page-size" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        ${PAGE_SIZE_OPTIONS.map(size => `<option value="${size}" ${currentLimit === size ? 'selected' : ''}>${size}</option>`).join('')}
                    </select>
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 pb-2">
                    ${total} entries total
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
                                    No audit log entries yet
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
    // Level filter
    const levelFilter = document.getElementById('level-filter');
    if (levelFilter) {
        levelFilter.addEventListener('change', async () => {
            currentLevel = levelFilter.value;
            currentPage = 1;
            expandedRows.clear();
            await loadAuditLog(container);
        });
    }

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
