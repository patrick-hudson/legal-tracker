/**
 * Matters Management Component
 */

import api from '../api.js';
import {
    formatCurrency,
    formatDate,
    escapeHtml as safeEscapeHtml,
    formatErrorMessage,
    PLACEHOLDER
} from '../display-utils.js';
import { showConfirm } from '../modal.js';

let currentPage = 1;
let currentSearch = '';
let currentSort = 'matter_date';
let currentOrder = 'DESC';
let selectedMatters = new Set();

// Column configuration - defines all available columns
const COLUMN_DEFINITIONS = {
    checkbox: {
        key: 'checkbox',
        label: '',
        sortable: false,
        hideable: false,
        headerClass: 'px-4 py-3 w-12',
        cellClass: 'px-4 py-3',
        renderHeader: () => `<input type="checkbox" id="select-all" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">`,
        renderCell: (matter) => `<input type="checkbox" class="matter-checkbox w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" data-id="${matter.id}">`,
        stopPropagation: true
    },
    id: {
        key: 'id',
        label: 'ID',
        sortable: true,
        sortKey: 'id',
        hideable: true,
        headerClass: 'px-6 py-3',
        cellClass: 'px-6 py-4 font-medium text-gray-900 dark:text-white',
        renderCell: (matter) => matter.id
    },
    matter_date: {
        key: 'matter_date',
        label: 'Date & Time',
        sortable: true,
        sortKey: 'matter_date',
        hideable: true,
        headerClass: 'px-6 py-3',
        cellClass: 'px-6 py-4',
        renderCell: (matter) => formatDate(matter.matter_date, { format: 'datetime', placeholder: PLACEHOLDER.DASH })
    },
    note: {
        key: 'note',
        label: 'Note',
        sortable: false,
        hideable: true,
        headerClass: 'px-6 py-3',
        cellClass: 'px-6 py-4',
        renderCell: (matter) => safeEscapeHtml(matter.note, 'No note')
    },
    cost: {
        key: 'cost',
        label: 'Cost',
        sortable: true,
        sortKey: 'cost',
        hideable: true,
        headerClass: 'px-6 py-3',
        cellClass: 'px-6 py-4 font-medium text-gray-900 dark:text-white',
        renderCell: (matter) => formatCurrency(matter.cost)
    },
    private_notes: {
        key: 'private_notes',
        label: 'Notes',
        sortable: false,
        hideable: true,
        headerClass: 'px-3 py-3 text-center w-16',
        cellClass: 'px-3 py-4 text-center',
        renderHeader: () => `<svg class="w-4 h-4 mx-auto text-gray-500" fill="currentColor" viewBox="0 0 20 20" title="Private Notes"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>`,
        renderCell: (matter) => matter.private_notes_count > 0 ? `
            <span class="inline-flex items-center justify-center" title="${matter.private_notes_count} private note${matter.private_notes_count > 1 ? 's' : ''}">
                <svg class="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z"/>
                </svg>
                ${matter.private_notes_count > 1 ? `<span class="ml-0.5 text-xs text-amber-600 font-medium">${matter.private_notes_count}</span>` : ''}
            </span>` : ''
    },
    actions: {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        hideable: false,
        headerClass: 'px-6 py-3',
        cellClass: 'px-6 py-4',
        renderCell: (matter) => `
            <div class="flex gap-2">
                <a href="#/matters/${matter.id}" class="text-blue-600 hover:text-blue-800 dark:text-blue-400">View</a>
                <button class="text-red-600 hover:text-red-800 dark:text-red-400" onclick="deleteMatter(${matter.id})">Delete</button>
            </div>`,
        stopPropagation: true
    }
};

// Default column order
const DEFAULT_COLUMN_ORDER = ['checkbox', 'id', 'matter_date', 'note', 'cost', 'private_notes', 'actions'];
const DEFAULT_HIDDEN_COLUMNS = [];

// Storage keys
const STORAGE_KEY_ORDER = 'matters_column_order';
const STORAGE_KEY_HIDDEN = 'matters_hidden_columns';

// Get column preferences from localStorage
function getColumnPreferences() {
    let order = DEFAULT_COLUMN_ORDER;
    let hidden = DEFAULT_HIDDEN_COLUMNS;

    try {
        const savedOrder = localStorage.getItem(STORAGE_KEY_ORDER);
        const savedHidden = localStorage.getItem(STORAGE_KEY_HIDDEN);

        if (savedOrder) {
            const parsed = JSON.parse(savedOrder);
            // Validate and merge with defaults (add any new columns)
            const validOrder = parsed.filter(key => COLUMN_DEFINITIONS[key]);
            const missingColumns = DEFAULT_COLUMN_ORDER.filter(key => !validOrder.includes(key));
            order = [...validOrder, ...missingColumns];
        }

        if (savedHidden) {
            hidden = JSON.parse(savedHidden).filter(key => COLUMN_DEFINITIONS[key]?.hideable);
        }
    } catch (e) {
        console.warn('Failed to load column preferences:', e);
    }

    return { order, hidden };
}

// Save column preferences to localStorage
function saveColumnPreferences(order, hidden) {
    try {
        localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(order));
        localStorage.setItem(STORAGE_KEY_HIDDEN, JSON.stringify(hidden));
    } catch (e) {
        console.warn('Failed to save column preferences:', e);
    }
}

// Get visible columns in order
function getVisibleColumns() {
    const { order, hidden } = getColumnPreferences();
    return order.filter(key => !hidden.includes(key));
}

// Generate table header HTML based on column configuration
function generateTableHeader() {
    const visibleColumns = getVisibleColumns();
    return visibleColumns.map(key => {
        const col = COLUMN_DEFINITIONS[key];
        const sortableClass = col.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : '';
        const sortAttr = col.sortable ? `data-sort="${col.sortKey}"` : '';
        const content = col.renderHeader ? col.renderHeader() : col.label;
        return `<th scope="col" class="${col.headerClass} ${sortableClass}" ${sortAttr}>${content}</th>`;
    }).join('');
}

// Generate table row HTML for a matter
function generateTableRow(matter) {
    const visibleColumns = getVisibleColumns();
    const cells = visibleColumns.map(key => {
        const col = COLUMN_DEFINITIONS[key];
        const stopProp = col.stopPropagation ? 'onclick="event.stopPropagation()"' : '';
        return `<td class="${col.cellClass}" ${stopProp}>${col.renderCell(matter)}</td>`;
    }).join('');
    return `<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover-row cursor-pointer" data-matter-id="${matter.id}">${cells}</tr>`;
}

export async function renderMatters(container) {
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
                        Export CSV
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

    // Load matters
    await loadMatters();

    // Event listeners
    document.getElementById('search-input').addEventListener('input', debounce(handleSearch, 300));
    document.getElementById('add-single-btn').addEventListener('click', showAddSingleModal);
    document.getElementById('add-multiple-btn').addEventListener('click', showAddMultipleModal);
    document.getElementById('export-csv-btn').addEventListener('click', handleExportCSV);
    document.getElementById('select-all')?.addEventListener('change', handleSelectAll);
    document.getElementById('deselect-all-btn')?.addEventListener('click', handleDeselectAll);
    document.getElementById('delete-selected-btn')?.addEventListener('click', handleDeleteSelected);

    // Sort headers
    document.querySelectorAll('[data-sort]').forEach(header => {
        header.addEventListener('click', () => handleSort(header.dataset.sort));
    });

    // Column settings
    setupColumnSettings();
}

// Setup column settings dropdown
function setupColumnSettings() {
    const btn = document.getElementById('column-settings-btn');
    const dropdown = document.getElementById('column-settings-dropdown');
    const columnList = document.getElementById('column-list');
    const resetBtn = document.getElementById('reset-columns-btn');

    // Toggle dropdown
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
            renderColumnList();
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== btn) {
            dropdown.classList.add('hidden');
        }
    });

    // Reset columns
    resetBtn.addEventListener('click', () => {
        saveColumnPreferences(DEFAULT_COLUMN_ORDER, DEFAULT_HIDDEN_COLUMNS);
        refreshTable();
        renderColumnList();
    });

    // Render column list
    function renderColumnList() {
        const { order, hidden } = getColumnPreferences();

        columnList.innerHTML = order.map((key, index) => {
            const col = COLUMN_DEFINITIONS[key];
            if (!col.hideable) return ''; // Don't show non-hideable columns

            const isHidden = hidden.includes(key);
            const displayLabel = col.label || key.replace('_', ' ');

            return `
                <div class="column-item flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-move" data-key="${key}" draggable="true">
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-gray-400 drag-handle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
                        </svg>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" class="column-toggle w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" data-key="${key}" ${!isHidden ? 'checked' : ''}>
                            <span class="text-sm text-gray-700 dark:text-gray-300 capitalize">${displayLabel}</span>
                        </label>
                    </div>
                    <div class="flex gap-1">
                        <button class="move-up p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ${index === 0 ? 'invisible' : ''}" data-key="${key}" title="Move up">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
                            </svg>
                        </button>
                        <button class="move-down p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ${index === order.length - 1 ? 'invisible' : ''}" data-key="${key}" title="Move down">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).filter(Boolean).join('');

        // Add toggle event listeners
        columnList.querySelectorAll('.column-toggle').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                const { order, hidden } = getColumnPreferences();

                if (e.target.checked) {
                    // Remove from hidden
                    const newHidden = hidden.filter(k => k !== key);
                    saveColumnPreferences(order, newHidden);
                } else {
                    // Add to hidden
                    saveColumnPreferences(order, [...hidden, key]);
                }

                refreshTable();
            });
        });

        // Add move up/down event listeners
        columnList.querySelectorAll('.move-up').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const key = btn.dataset.key;
                const { order, hidden } = getColumnPreferences();
                const index = order.indexOf(key);

                if (index > 0) {
                    [order[index - 1], order[index]] = [order[index], order[index - 1]];
                    saveColumnPreferences(order, hidden);
                    refreshTable();
                    renderColumnList();
                }
            });
        });

        columnList.querySelectorAll('.move-down').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const key = btn.dataset.key;
                const { order, hidden } = getColumnPreferences();
                const index = order.indexOf(key);

                if (index < order.length - 1) {
                    [order[index], order[index + 1]] = [order[index + 1], order[index]];
                    saveColumnPreferences(order, hidden);
                    refreshTable();
                    renderColumnList();
                }
            });
        });

        // Setup drag and drop
        setupDragAndDrop();
    }
}

// Setup drag and drop for column reordering
function setupDragAndDrop() {
    const columnList = document.getElementById('column-list');
    let draggedItem = null;

    columnList.querySelectorAll('.column-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            item.classList.add('opacity-50');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('opacity-50');
            draggedItem = null;
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedItem && draggedItem !== item) {
                const { order, hidden } = getColumnPreferences();
                const fromKey = draggedItem.dataset.key;
                const toKey = item.dataset.key;
                const fromIndex = order.indexOf(fromKey);
                const toIndex = order.indexOf(toKey);

                // Remove from old position and insert at new position
                order.splice(fromIndex, 1);
                order.splice(toIndex, 0, fromKey);

                saveColumnPreferences(order, hidden);
                refreshTable();

                // Re-render the list to update arrow visibility
                const columnList = document.getElementById('column-list');
                if (columnList) {
                    setupColumnSettings();
                }
            }
        });
    });
}

// Refresh the table with current column configuration
function refreshTable() {
    const thead = document.getElementById('matters-thead');
    if (thead) {
        thead.innerHTML = `<tr>${generateTableHeader()}</tr>`;

        // Re-attach sort listeners
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

        if (matters.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${visibleColumns.length}" class="px-6 py-4 text-center text-gray-500">No matters found</td></tr>`;
            updatePagination(0, 0, 0);
            return;
        }

        tbody.innerHTML = matters.map(matter => generateTableRow(matter)).join('');

        // Add row click navigation (but not for interactive elements)
        document.querySelectorAll('[data-matter-id]').forEach(row => {
            row.addEventListener('click', (e) => {
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
        });

        // Add checkbox event listeners
        document.querySelectorAll('.matter-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', handleCheckboxChange);
        });

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
        document.getElementById('select-all').checked = false;
    }
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
    updateBulkActions();
}

function handleDeselectAll() {
    selectedMatters.clear();
    document.querySelectorAll('.matter-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('select-all').checked = false;
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

    if (!confirmed) {
        return;
    }

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
    currentSearch = e.target.value;
    currentPage = 1;
    loadMatters();
}

function handleSort(column) {
    if (currentSort === column) {
        currentOrder = currentOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
        currentSort = column;
        currentOrder = 'DESC';
    }
    loadMatters();
}

async function handleExportCSV() {
    try {
        const blob = await api.exportMatters('csv');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `matters-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        showToast('CSV exported successfully', 'success');
    } catch (error) {
        showToast(`Export failed: ${error.message}`, 'error');
    }
}

function showAddSingleModal() {
    // Create modal (simplified - in production use proper modal component)
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add Single Matter</h3>
                <form id="add-single-form">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date & Time</label>
                        <input type="datetime-local" name="matter_date" required class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note</label>
                        <input type="text" name="note" required class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cost ($)</label>
                        <input type="number" step="0.01" name="cost" required class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                    <div class="flex gap-2">
                        <button type="submit" class="flex-1 text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2">Save</button>
                        <button type="button" class="flex-1 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white" onclick="this.closest('.fixed').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#add-single-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await api.createMatter({
                matter_date: formData.get('matter_date'),
                note: formData.get('note'),
                cost: parseFloat(formData.get('cost')) // Send as dollars, server converts to cents
            });
            modal.remove();
            showToast('Matter added successfully', 'success');
            await loadMatters();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });
}

function showAddMultipleModal() {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto">
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full m-4">
                <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add Multiple Matters</h3>
                <form id="add-multiple-form">
                    <div id="matter-rows" class="space-y-3 mb-4 max-h-96 overflow-y-auto">
                        ${createMatterRow(0)}
                    </div>
                    <button type="button" id="add-row-btn" class="mb-4 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 text-sm">+ Add Row</button>
                    <div class="flex gap-2">
                        <button type="submit" class="flex-1 text-white bg-green-600 hover:bg-green-700 rounded-lg px-4 py-2">Save All</button>
                        <button type="button" class="flex-1 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white" onclick="this.closest('.fixed').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    let rowCount = 1;
    modal.querySelector('#add-row-btn').addEventListener('click', () => {
        const container = modal.querySelector('#matter-rows');
        container.insertAdjacentHTML('beforeend', createMatterRow(rowCount++));
    });

    modal.querySelector('#add-multiple-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const rows = modal.querySelectorAll('.matter-row');
        const matters = [];

        rows.forEach(row => {
            const date = row.querySelector('[name$="_date"]').value;
            const note = row.querySelector('[name$="_note"]').value;
            const cost = row.querySelector('[name$="_cost"]').value;

            if (date && note && cost) {
                matters.push({
                    matter_date: date,
                    note: note,
                    cost: parseFloat(cost) // Send as dollars, server converts to cents
                });
            }
        });

        if (matters.length === 0) {
            showToast('Please add at least one matter', 'error');
            return;
        }

        try {
            const result = await api.bulkCreateMatters(matters);
            modal.remove();
            showToast(`${result.created} matter(s) added successfully`, 'success');
            await loadMatters();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    });
}

function createMatterRow(index) {
    return `
        <div class="matter-row grid grid-cols-12 gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="col-span-4">
                <input type="datetime-local" name="matter_${index}_date" class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2 dark:bg-gray-600 dark:border-gray-500 dark:text-white" required>
            </div>
            <div class="col-span-5">
                <input type="text" name="matter_${index}_note" placeholder="Note" class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2 dark:bg-gray-600 dark:border-gray-500 dark:text-white" required>
            </div>
            <div class="col-span-3">
                <input type="number" step="0.01" name="matter_${index}_cost" placeholder="Cost ($)" class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2 dark:bg-gray-600 dark:border-gray-500 dark:text-white" required>
            </div>
        </div>
    `;
}

function updatePagination(start, end, total) {
    document.getElementById('showing-start').textContent = start;
    document.getElementById('showing-end').textContent = end;
    document.getElementById('total-count').textContent = total;

    // Simple pagination (can be enhanced)
    const controls = document.getElementById('pagination-controls');
    const totalPages = Math.ceil(total / 50);

    if (totalPages <= 1) {
        controls.innerHTML = '';
        return;
    }

    controls.innerHTML = `
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})" class="px-3 py-1 text-sm rounded border ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'} dark:border-gray-600">Previous</button>
        <span class="px-3 py-1 text-sm">Page ${currentPage} of ${totalPages}</span>
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})" class="px-3 py-1 text-sm rounded border ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'} dark:border-gray-600">Next</button>
    `;
}

// Global functions for inline event handlers
window.changePage = (page) => {
    currentPage = page;
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

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
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
