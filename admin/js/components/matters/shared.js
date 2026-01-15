/**
 * Matters - Shared State and Utilities
 */

import {
    formatCurrency,
    formatDate,
    escapeHtml as safeEscapeHtml,
    PLACEHOLDER
} from '../../display-utils.js';

// Module state
export let currentPage = 1;
export let currentSearch = '';
export let currentSort = 'matter_date';
export let currentOrder = 'DESC';
export let selectedMatters = new Set();
export let loadedMatters = [];

// State setters
export function setCurrentPage(page) { currentPage = page; }
export function setCurrentSearch(search) { currentSearch = search; }
export function setCurrentSort(sort) { currentSort = sort; }
export function setCurrentOrder(order) { currentOrder = order; }
export function setLoadedMatters(matters) { loadedMatters = matters; }
export function clearSelectedMatters() { selectedMatters.clear(); }

// Storage keys
export const STORAGE_KEY_ORDER = 'matters_column_order';
export const STORAGE_KEY_HIDDEN = 'matters_hidden_columns';
export const STORAGE_KEY_SELECTION = 'matters_selected_ids';

// Column configuration - defines all available columns
export const COLUMN_DEFINITIONS = {
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
    attachments: {
        key: 'attachments',
        label: 'Docs',
        sortable: false,
        hideable: true,
        headerClass: 'px-3 py-3 text-center w-16',
        cellClass: 'px-3 py-4 text-center',
        renderHeader: () => `<svg class="w-4 h-4 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Attachments"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>`,
        renderCell: (matter) => matter.attachments_count > 0 ? `
            <span class="inline-flex items-center justify-center" title="${matter.attachments_count} document${matter.attachments_count > 1 ? 's' : ''}">
                <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
                </svg>
                ${matter.attachments_count > 1 ? `<span class="ml-0.5 text-xs text-blue-600 dark:text-blue-400 font-medium">${matter.attachments_count}</span>` : ''}
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

// Default column order and hidden columns
export const DEFAULT_COLUMN_ORDER = ['checkbox', 'id', 'matter_date', 'note', 'cost', 'private_notes', 'attachments', 'actions'];
export const DEFAULT_HIDDEN_COLUMNS = [];

// Save selection state to sessionStorage
export function saveSelectionState() {
    try {
        sessionStorage.setItem(STORAGE_KEY_SELECTION, JSON.stringify([...selectedMatters]));
    } catch (e) {
        console.warn('Failed to save selection state:', e);
    }
}

// Load selection state from sessionStorage
export function loadSelectionState() {
    try {
        const saved = sessionStorage.getItem(STORAGE_KEY_SELECTION);
        if (saved) {
            const ids = JSON.parse(saved);
            selectedMatters = new Set(ids);
        }
    } catch (e) {
        console.warn('Failed to load selection state:', e);
    }
}

// Clear selection state from sessionStorage
export function clearSelectionState() {
    try {
        sessionStorage.removeItem(STORAGE_KEY_SELECTION);
    } catch (e) {
        console.warn('Failed to clear selection state:', e);
    }
}

// Toast notification
export function showToast(message, type = 'info') {
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

// Debounce utility
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
