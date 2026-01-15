/**
 * Matters - Column Configuration and Preferences
 */

import {
    COLUMN_DEFINITIONS,
    DEFAULT_COLUMN_ORDER,
    DEFAULT_HIDDEN_COLUMNS,
    STORAGE_KEY_ORDER,
    STORAGE_KEY_HIDDEN,
    currentSort,
    currentOrder
} from './shared.js';

// Track if document click listener for column dropdown is attached
let columnDropdownListenerAttached = false;

// Get column preferences from localStorage
export function getColumnPreferences() {
    let order = DEFAULT_COLUMN_ORDER;
    let hidden = DEFAULT_HIDDEN_COLUMNS;

    try {
        const savedOrder = localStorage.getItem(STORAGE_KEY_ORDER);
        const savedHidden = localStorage.getItem(STORAGE_KEY_HIDDEN);

        if (savedOrder) {
            const parsed = JSON.parse(savedOrder);
            // Validate saved order (remove any columns that no longer exist)
            const validOrder = parsed.filter(key => COLUMN_DEFINITIONS[key]);
            // Find columns in defaults that aren't in saved order
            const missingColumns = DEFAULT_COLUMN_ORDER.filter(key => !validOrder.includes(key));
            // Insert missing columns at their default position relative to existing columns
            order = [...validOrder];
            for (const missing of missingColumns) {
                const defaultIndex = DEFAULT_COLUMN_ORDER.indexOf(missing);
                // Find the best insertion point by looking for the nearest column that exists in both
                let insertIndex = order.length;
                for (let i = defaultIndex - 1; i >= 0; i--) {
                    const prevCol = DEFAULT_COLUMN_ORDER[i];
                    const existingIndex = order.indexOf(prevCol);
                    if (existingIndex !== -1) {
                        insertIndex = existingIndex + 1;
                        break;
                    }
                }
                order.splice(insertIndex, 0, missing);
            }
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
export function saveColumnPreferences(order, hidden) {
    try {
        localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(order));
        localStorage.setItem(STORAGE_KEY_HIDDEN, JSON.stringify(hidden));
    } catch (e) {
        console.warn('Failed to save column preferences:', e);
    }
}

// Get visible columns in order
export function getVisibleColumns() {
    const { order, hidden } = getColumnPreferences();
    return order.filter(key => !hidden.includes(key));
}

// Generate table header HTML based on column configuration
export function generateTableHeader() {
    const visibleColumns = getVisibleColumns();
    return visibleColumns.map(key => {
        const col = COLUMN_DEFINITIONS[key];
        const sortableClass = col.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : '';
        const sortAttr = col.sortable ? `data-sort="${col.sortKey}"` : '';
        let content = col.renderHeader ? col.renderHeader() : col.label;

        // Add sort indicator for sortable columns
        if (col.sortable && col.sortKey === currentSort) {
            const arrow = currentOrder === 'ASC'
                ? '<svg class="w-3 h-3 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>'
                : '<svg class="w-3 h-3 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>';
            content = `<span class="inline-flex items-center">${content}${arrow}</span>`;
        }

        return `<th scope="col" class="${col.headerClass} ${sortableClass}" ${sortAttr}>${content}</th>`;
    }).join('');
}

// Generate table row HTML for a matter
export function generateTableRow(matter) {
    const visibleColumns = getVisibleColumns();
    const cells = visibleColumns.map(key => {
        const col = COLUMN_DEFINITIONS[key];
        const stopProp = col.stopPropagation ? 'onclick="event.stopPropagation()"' : '';
        return `<td class="${col.cellClass}" ${stopProp}>${col.renderCell(matter)}</td>`;
    }).join('');
    return `<tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover-row cursor-pointer" data-matter-id="${matter.id}">${cells}</tr>`;
}

// Render column list in the dropdown
export function renderColumnList(refreshTable) {
    const columnList = document.getElementById('column-list');
    if (!columnList) return;

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
                renderColumnList(refreshTable);
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
                renderColumnList(refreshTable);
            }
        });
    });

    // Setup drag and drop
    setupDragAndDrop(refreshTable);
}

// Setup column settings dropdown
export function setupColumnSettings(refreshTable) {
    const btn = document.getElementById('column-settings-btn');
    const dropdown = document.getElementById('column-settings-dropdown');
    const resetBtn = document.getElementById('reset-columns-btn');

    if (!btn || !dropdown) return;

    // Toggle dropdown - remove old listener first to prevent duplicates
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
            renderColumnList(refreshTable);
        }
    });

    // Close dropdown when clicking outside - only attach once
    if (!columnDropdownListenerAttached) {
        document.addEventListener('click', (e) => {
            const currentDropdown = document.getElementById('column-settings-dropdown');
            const currentBtn = document.getElementById('column-settings-btn');
            if (currentDropdown && !currentDropdown.contains(e.target) && e.target !== currentBtn) {
                currentDropdown.classList.add('hidden');
            }
        });
        columnDropdownListenerAttached = true;
    }

    // Reset columns - remove old listener first to prevent duplicates
    if (resetBtn) {
        const newResetBtn = resetBtn.cloneNode(true);
        resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);

        newResetBtn.addEventListener('click', () => {
            saveColumnPreferences(DEFAULT_COLUMN_ORDER, DEFAULT_HIDDEN_COLUMNS);
            refreshTable();
            renderColumnList(refreshTable);
        });
    }
}

// Setup drag and drop for column reordering
function setupDragAndDrop(refreshTable) {
    const columnList = document.getElementById('column-list');
    if (!columnList) return;

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

                // Re-render the column list to update arrow visibility
                const dropdown = document.getElementById('column-settings-dropdown');
                if (dropdown && !dropdown.classList.contains('hidden')) {
                    renderColumnList(refreshTable);
                }
            }
        });
    });
}
