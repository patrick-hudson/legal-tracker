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

export async function renderMatters(container) {
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
                        <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" class="px-4 py-3">
                                    <input type="checkbox" id="select-all" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
                                </th>
                                <th scope="col" class="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" data-sort="id">
                                    ID
                                </th>
                                <th scope="col" class="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" data-sort="matter_date">
                                    Date & Time
                                </th>
                                <th scope="col" class="px-6 py-3">Note</th>
                                <th scope="col" class="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" data-sort="cost">
                                    Cost
                                </th>
                                <th scope="col" class="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="matters-tbody">
                            <tr><td colspan="6" class="px-6 py-4 text-center"><div class="spinner mx-auto"></div></td></tr>
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
    document.getElementById('select-all').addEventListener('change', handleSelectAll);
    document.getElementById('deselect-all-btn')?.addEventListener('click', handleDeselectAll);
    document.getElementById('delete-selected-btn')?.addEventListener('click', handleDeleteSelected);

    // Sort headers
    document.querySelectorAll('[data-sort]').forEach(header => {
        header.addEventListener('click', () => handleSort(header.dataset.sort));
    });
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

        if (matters.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No matters found</td></tr>';
            updatePagination(0, 0, 0);
            return;
        }

        tbody.innerHTML = matters.map(matter => `
            <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover-row">
                <td class="px-4 py-3">
                    <input type="checkbox" class="matter-checkbox w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" data-id="${matter.id}">
                </td>
                <td class="px-6 py-4 font-medium text-gray-900 dark:text-white">${matter.id}</td>
                <td class="px-6 py-4">${formatDate(matter.matter_date, { format: 'datetime', placeholder: PLACEHOLDER.DASH })}</td>
                <td class="px-6 py-4">${safeEscapeHtml(matter.note, 'No note')}</td>
                <td class="px-6 py-4 font-medium text-gray-900 dark:text-white">${formatCurrency(matter.cost)}</td>
                <td class="px-6 py-4">
                    <button class="text-red-600 hover:text-red-800 dark:text-red-400" onclick="deleteMatter(${matter.id})">Delete</button>
                </td>
            </tr>
        `).join('');

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
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-red-600">Error: ${formatErrorMessage(error)}</td></tr>`;
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
