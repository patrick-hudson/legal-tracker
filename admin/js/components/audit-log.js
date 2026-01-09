/**
 * Audit Log Component
 * Displays system audit log entries with pagination and filtering
 */

import api from '../api.js';
import { formatDate, escapeHtml } from '../display-utils.js';

let currentPage = 1;
let currentLevel = '';
let expandedRows = new Set();

// Level badge colors
const LEVEL_COLORS = {
    ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    WARNING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    INFO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    DEBUG: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
};

export async function renderAuditLog(container) {
    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
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
        limit: 50,
        level: currentLevel || undefined
    });

    const { entries, total, page, totalPages } = data;

    container.innerHTML = `
        <div class="mb-4">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
            <p class="text-gray-600 dark:text-gray-400">System activity and security events</p>
        </div>

        <!-- Filters -->
        <div class="mb-4 flex flex-wrap gap-4 items-center">
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Level</label>
                <select id="level-filter" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="">All Levels</option>
                    <option value="ERROR" ${currentLevel === 'ERROR' ? 'selected' : ''}>Error</option>
                    <option value="WARNING" ${currentLevel === 'WARNING' ? 'selected' : ''}>Warning</option>
                    <option value="INFO" ${currentLevel === 'INFO' ? 'selected' : ''}>Info</option>
                    <option value="DEBUG" ${currentLevel === 'DEBUG' ? 'selected' : ''}>Debug</option>
                </select>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 self-end pb-2">
                ${total} entries total
            </div>
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
        ${totalPages > 1 ? `
            <div class="mt-4 flex items-center justify-between">
                <div class="text-sm text-gray-700 dark:text-gray-400">
                    Page ${page} of ${totalPages}
                </div>
                <div class="flex gap-2">
                    <button id="prev-page" ${page === 1 ? 'disabled' : ''} class="px-3 py-1 text-sm rounded border ${page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'} dark:border-gray-600 dark:hover:bg-gray-700">Previous</button>
                    <button id="next-page" ${page === totalPages ? 'disabled' : ''} class="px-3 py-1 text-sm rounded border ${page === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'} dark:border-gray-600 dark:hover:bg-gray-700">Next</button>
                </div>
            </div>
        ` : ''}
    `;

    setupEventListeners(container);
}

function renderRow(entry) {
    const isExpanded = expandedRows.has(entry.id);
    const hasDetails = entry.details || entry.request || entry.response || entry.stack_trace;

    return `
        <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${hasDetails ? 'cursor-pointer' : ''}" data-entry-id="${entry.id}">
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
    return `
        <tr class="bg-gray-50 dark:bg-gray-900" data-details-for="${entry.id}">
            <td colspan="7" class="px-4 py-4">
                <div class="space-y-3 text-sm">
                    ${entry.ip_address ? `
                        <div>
                            <span class="font-medium text-gray-700 dark:text-gray-300">IP Address:</span>
                            <span class="ml-2 text-gray-600 dark:text-gray-400">${escapeHtml(entry.ip_address)}</span>
                        </div>
                    ` : ''}
                    ${entry.duration_ms ? `
                        <div>
                            <span class="font-medium text-gray-700 dark:text-gray-300">Duration:</span>
                            <span class="ml-2 text-gray-600 dark:text-gray-400">${entry.duration_ms}ms</span>
                        </div>
                    ` : ''}
                    ${entry.details ? `
                        <div>
                            <span class="font-medium text-gray-700 dark:text-gray-300">Details:</span>
                            <pre class="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">${escapeHtml(JSON.stringify(entry.details, null, 2))}</pre>
                        </div>
                    ` : ''}
                    ${entry.request ? `
                        <div>
                            <span class="font-medium text-gray-700 dark:text-gray-300">Request:</span>
                            <pre class="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">${escapeHtml(JSON.stringify(entry.request, null, 2))}</pre>
                        </div>
                    ` : ''}
                    ${entry.response ? `
                        <div>
                            <span class="font-medium text-gray-700 dark:text-gray-300">Response:</span>
                            <pre class="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">${escapeHtml(JSON.stringify(entry.response, null, 2))}</pre>
                        </div>
                    ` : ''}
                    ${entry.stack_trace ? `
                        <div>
                            <span class="font-medium text-red-700 dark:text-red-400">Stack Trace:</span>
                            <pre class="mt-1 p-3 bg-red-50 dark:bg-red-900/20 rounded text-xs overflow-x-auto text-red-800 dark:text-red-300">${escapeHtml(entry.stack_trace)}</pre>
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

    // Pagination
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (prevBtn) {
        prevBtn.addEventListener('click', async () => {
            if (currentPage > 1) {
                currentPage--;
                expandedRows.clear();
                await loadAuditLog(container);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            currentPage++;
            expandedRows.clear();
            await loadAuditLog(container);
        });
    }

    // Row expansion
    const tbody = document.getElementById('audit-log-body');
    if (tbody) {
        tbody.addEventListener('click', async (e) => {
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
        });
    }
}
