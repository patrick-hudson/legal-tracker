/**
 * Matters Management Component
 *
 * Split into modules:
 * - shared.js: State, constants, utilities
 * - columns.js: Column configuration and preferences
 * - export.js: Export functionality
 * - modals.js: Add/create modals
 */

import api from '../../api/index.js';
import { formatErrorMessage } from '../../display-utils.js';
import { showConfirm } from '../../modal.js';
import {
    currentPage,
    currentSearch,
    currentSort,
    currentOrder,
    selectedMatters,
    setCurrentPage,
    setCurrentSearch,
    setCurrentSort,
    setCurrentOrder,
    setLoadedMatters,
    loadSelectionState,
    saveSelectionState,
    clearSelectionState,
    loadStateFromUrl,
    showToast,
    debounce
} from './shared.js';
import {
    getVisibleColumns,
    generateTableHeader,
    generateTableRow,
    setupColumnSettings
} from './columns.js';
import { handleExportCSV } from './export.js';
import { showAddSingleModal, showAddMultipleModal } from './modals.js';

export async function renderMatters(container) {
    // Restore state from URL (page, search, sort, order)
    loadStateFromUrl();

    // Restore selection state from sessionStorage
    loadSelectionState();

    const visibleColumns = getVisibleColumns();

    container.innerHTML = `
        <div class="mb-4">
            <div class="flex justify-between items-center mb-4">
                <div>
                    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Matters Management</h1>
                    <p class="text-gray-600 dark:text-gray-400">Manage your legal matters</p>
                </div>
                <div class="flex gap-2">
                    <button id="add-single-btn" class="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
                        Add Single
                    </button>
                    <button id="add-multiple-btn" class="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium">
                        Add Multiple
                    </button>
                    <button id="export-csv-btn" class="px-4 py-2 text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg text-sm font-medium dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700">
                        Export
                    </button>
                </div>
            </div>

            <!-- Search and Filters -->
            <div class="mb-4 flex gap-4">
                <div class="flex-1">
                    <input type="text" id="search-input" placeholder="Search matters..." class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
                </div>
                <div class="relative">
                    <button id="column-settings-btn" class="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg text-sm font-medium dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                        </svg>
                        Columns
                    </button>
                    <div id="column-settings-dropdown" class="hidden absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                        <div class="p-3 border-b border-gray-200 dark:border-gray-700">
                            <span class="text-sm font-semibold text-gray-900 dark:text-white">Configure Columns</span>
                        </div>
                        <div id="column-list" class="p-2 max-h-64 overflow-y-auto">
                            <!-- Column toggles will be inserted here -->
                        </div>
                        <div class="p-2 border-t border-gray-200 dark:border-gray-700">
                            <button id="reset-columns-btn" class="w-full px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                                Reset to Default
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bulk Actions -->
            <div id="bulk-actions" class="hidden mb-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-700 dark:text-gray-300">
                        <span id="selected-count">0</span> matters selected
                    </span>
                    <div class="flex gap-2">
                        <button id="deselect-all-btn" class="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600">
                            Deselect All
                        </button>
                        <button id="delete-selected-btn" class="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700">
                            Delete Selected
                        </button>
                    </div>
                </div>
            </div>

            <!-- Matters Table -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead id="matters-thead" class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>${generateTableHeader()}</tr>
                        </thead>
                        <tbody id="matters-tbody">
                            <tr><td colspan="${visibleColumns.length}" class="px-6 py-4 text-center"><div class="spinner mx-auto"></div></td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div class="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <div class="flex justify-between items-center">
                        <div class="text-sm text-gray-700 dark:text-gray-400">
                            Showing <span id="showing-start">0</span> to <span id="showing-end">0</span> of <span id="total-count">0</span> matters
                        </div>
                        <div id="pagination-controls" class="flex gap-2">
                            <!-- Pagination buttons will be inserted here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Set up row click delegation on tbody (handles dynamically loaded rows)
    const tbody = document.getElementById('matters-tbody');
    tbody.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-matter-id]');
        if (!row) return;

        // Don't navigate if clicking on interactive elements
        const target = e.target;
        if (target.tagName === 'INPUT' ||
            target.tagName === 'BUTTON' ||
            target.tagName === 'A' ||
            target.closest('button') ||
            target.closest('a')) {
            return;
        }

        window.location.hash = `/matters/${row.dataset.matterId}`;
    });

    // Sync search input with URL state
    const searchInput = document.getElementById('search-input');
    if (currentSearch) {
        searchInput.value = currentSearch;
    }

    // Load matters
    await loadMatters();

    // Event listeners
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    document.getElementById('add-single-btn').addEventListener('click', () => showAddSingleModal(loadMatters));
    document.getElementById('add-multiple-btn').addEventListener('click', () => showAddMultipleModal(loadMatters));
    document.getElementById('export-csv-btn').addEventListener('click', () => handleExportCSV(handleDeselectAll));
    document.getElementById('select-all')?.addEventListener('change', handleSelectAll);
    document.getElementById('deselect-all-btn')?.addEventListener('click', handleDeselectAll);
    document.getElementById('delete-selected-btn')?.addEventListener('click', handleDeleteSelected);

    // Sort headers
    document.querySelectorAll('[data-sort]').forEach(header => {
        header.addEventListener('click', () => handleSort(header.dataset.sort));
    });

    // Column settings
    setupColumnSettings(refreshTable);
}

async function loadMatters() {
    try {
        const response = await api.getMatters({
            page: currentPage,
            limit: 50,
            search: currentSearch,
            sortBy: currentSort,
            sortOrder: currentOrder
        });

        const tbody = document.getElementById('matters-tbody');
        const { matters, total, page, limit } = response;
        const visibleColumns = getVisibleColumns();

        // Store matters for export checks
        setLoadedMatters(matters);

        if (matters.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${visibleColumns.length}" class="px-6 py-4 text-center text-gray-500">No matters found</td></tr>`;
            updatePagination(0, 0, 0);
            return;
        }

        tbody.innerHTML = matters.map(matter => generateTableRow(matter)).join('');

        // Add checkbox event listeners and restore selection state
        document.querySelectorAll('.matter-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', handleCheckboxChange);
            // Restore checked state if this matter was previously selected
            const id = parseInt(checkbox.dataset.id);
            if (selectedMatters.has(id)) {
                checkbox.checked = true;
            }
        });

        // Update bulk actions bar for restored selections
        updateBulkActions();

        // Update pagination
        const start = (page - 1) * limit + 1;
        const end = Math.min(page * limit, total);
        updatePagination(start, end, total);

    } catch (error) {
        const tbody = document.getElementById('matters-tbody');
        const visibleColumns = getVisibleColumns();
        tbody.innerHTML = `<tr><td colspan="${visibleColumns.length}" class="px-6 py-4 text-center text-red-600">Error: ${formatErrorMessage(error)}</td></tr>`;
    }
}

function handleCheckboxChange(e) {
    const id = parseInt(e.target.dataset.id);
    if (e.target.checked) {
        selectedMatters.add(id);
    } else {
        selectedMatters.delete(id);
        const selectAll = document.getElementById('select-all');
        if (selectAll) selectAll.checked = false;
    }
    saveSelectionState();
    updateBulkActions();
}

function handleSelectAll(e) {
    const checkboxes = document.querySelectorAll('.matter-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = e.target.checked;
        const id = parseInt(checkbox.dataset.id);
        if (e.target.checked) {
            selectedMatters.add(id);
        } else {
            selectedMatters.delete(id);
        }
    });
    saveSelectionState();
    updateBulkActions();
}

function handleDeselectAll() {
    selectedMatters.clear();
    clearSelectionState();
    document.querySelectorAll('.matter-checkbox').forEach(cb => cb.checked = false);
    const selectAll = document.getElementById('select-all');
    if (selectAll) selectAll.checked = false;
    updateBulkActions();
}

function updateBulkActions() {
    const bulkActions = document.getElementById('bulk-actions');
    const selectedCount = document.getElementById('selected-count');

    if (selectedMatters.size > 0) {
        bulkActions.classList.remove('hidden');
        selectedCount.textContent = selectedMatters.size;
    } else {
        bulkActions.classList.add('hidden');
    }
}

async function handleDeleteSelected() {
    if (selectedMatters.size === 0) return;

    const confirmed = await showConfirm(`Are you sure you want to delete ${selectedMatters.size} matter(s)?`, {
        title: 'Delete Matters',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
    });

    if (!confirmed) return;

    try {
        await api.deleteMatters(Array.from(selectedMatters));
        showToast('Matters deleted successfully', 'success');
        selectedMatters.clear();
        await loadMatters();
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

function handleSearch(e) {
    setCurrentSearch(e.target.value);
    setCurrentPage(1);
    loadMatters();
}

function handleSort(column) {
    if (currentSort === column) {
        setCurrentOrder(currentOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
        setCurrentSort(column);
        setCurrentOrder('DESC');
    }

    refreshTable();
}

function refreshTable() {
    const thead = document.getElementById('matters-thead');
    if (thead) {
        thead.innerHTML = `<tr>${generateTableHeader()}</tr>`;

        // Re-attach sort listeners to the new header elements
        thead.querySelectorAll('[data-sort]').forEach(header => {
            header.addEventListener('click', () => handleSort(header.dataset.sort));
        });

        // Re-attach select-all listener
        const selectAll = document.getElementById('select-all');
        if (selectAll) {
            selectAll.addEventListener('change', handleSelectAll);
        }
    }

    // Reload matters to regenerate rows
    loadMatters();
}

function updatePagination(start, end, total) {
    document.getElementById('showing-start').textContent = start;
    document.getElementById('showing-end').textContent = end;
    document.getElementById('total-count').textContent = total;

    const controls = document.getElementById('pagination-controls');
    const totalPages = Math.ceil(total / 50);

    if (totalPages <= 1) {
        controls.innerHTML = '';
        return;
    }

    controls.innerHTML = `
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})" class="px-4 py-2 text-sm font-medium rounded-lg border ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700'}">Previous</button>
        <span class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Page ${currentPage} of ${totalPages}</span>
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})" class="px-4 py-2 text-sm font-medium rounded-lg border ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700'}">Next</button>
    `;
}

// Global functions for inline event handlers
window.changePage = (page) => {
    setCurrentPage(page);
    loadMatters();
};

window.deleteMatter = async (id) => {
    const confirmed = await showConfirm('Are you sure you want to delete this matter?', {
        title: 'Delete Matter',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
    });

    if (!confirmed) return;

    try {
        await api.deleteMatters([id]);
        showToast('Matter deleted successfully', 'success');
        await loadMatters();
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
};
