/**
 * Matters - Export Functionality
 */

import api from '../../api/index.js';
import { showCustomModal } from '../../modal.js';
import {
    selectedMatters,
    loadedMatters,
    clearSelectedMatters,
    clearSelectionState,
    showToast
} from './shared.js';
import { getVisibleColumns } from './columns.js';

export async function handleExportCSV(handleDeselectAll) {
    const hasSelection = selectedMatters.size > 0;

    // Check if any matters to be exported have private notes
    const mattersToCheck = hasSelection
        ? loadedMatters.filter(m => selectedMatters.has(m.id))
        : loadedMatters;
    const hasPrivateNotes = mattersToCheck.some(m => m.private_notes_count > 0);

    // Track export options - will be captured before modal closes
    let exportSelectedOnly = hasSelection; // Default to true if there's a selection
    let includePrivateNotes = hasPrivateNotes; // Default to include if they exist
    let exportFormat = 'csv'; // Default format

    // Build modal content
    const modalContent = `
        <div class="space-y-4">
            ${hasSelection ? `
            <div class="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                <p class="text-sm text-blue-800 dark:text-blue-200">
                    <span class="font-semibold">${selectedMatters.size}</span> matter${selectedMatters.size > 1 ? 's' : ''} selected
                </p>
            </div>
            <div>
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="export-selected-only" checked class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
                    <span class="text-sm text-gray-700 dark:text-gray-300">Export selected matters only</span>
                </label>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400 ml-6">Uncheck to export all matters</p>
            </div>
            ` : `
            <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p class="text-sm text-gray-600 dark:text-gray-300">
                    No matters selected - all matters will be exported
                </p>
            </div>
            `}

            <div class="border-t border-gray-200 dark:border-gray-600 pt-4">
                <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Export Options</p>

                <div class="mb-4">
                    <label class="block text-sm text-gray-700 dark:text-gray-300 mb-2">Format</label>
                    <div class="flex gap-4">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="export-format" value="csv" checked class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500">
                            <span class="text-sm text-gray-700 dark:text-gray-300">CSV</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="export-format" value="json" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500">
                            <span class="text-sm text-gray-700 dark:text-gray-300">JSON</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="export-format" value="html" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500">
                            <span class="text-sm text-gray-700 dark:text-gray-300">HTML</span>
                        </label>
                    </div>
                </div>

                ${hasPrivateNotes ? `
                <div>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="export-include-notes" checked class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
                        <span class="text-sm text-gray-700 dark:text-gray-300">Include private notes</span>
                    </label>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400 ml-6">
                        <svg class="w-3 h-3 inline mr-1 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
                        </svg>
                        Admin-only notes will be included in the export
                    </p>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    const result = await showCustomModal({
        title: 'Export Matters',
        content: modalContent,
        size: 'sm',
        buttons: [
            { text: 'Export', type: 'primary', value: 'export', id: 'export-confirm-btn' },
            { text: 'Cancel', type: 'secondary', value: null }
        ],
        onOpen: (modal) => {
            // Capture checkbox/radio values on change
            const selectedOnlyCheckbox = modal.querySelector('#export-selected-only');
            const includeNotesCheckbox = modal.querySelector('#export-include-notes');
            const formatRadios = modal.querySelectorAll('input[name="export-format"]');
            const exportBtn = modal.querySelector('#export-confirm-btn');

            // Update values on checkbox change
            if (selectedOnlyCheckbox) {
                selectedOnlyCheckbox.addEventListener('change', (e) => {
                    exportSelectedOnly = e.target.checked;
                });
            }
            if (includeNotesCheckbox) {
                includeNotesCheckbox.addEventListener('change', (e) => {
                    includePrivateNotes = e.target.checked;
                });
            }
            formatRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    exportFormat = e.target.value;
                });
            });

            // Use mousedown to capture final values before click handlers run
            if (exportBtn) {
                exportBtn.addEventListener('mousedown', () => {
                    if (selectedOnlyCheckbox) exportSelectedOnly = selectedOnlyCheckbox.checked;
                    if (includeNotesCheckbox) includePrivateNotes = includeNotesCheckbox.checked;
                    const selectedFormat = modal.querySelector('input[name="export-format"]:checked');
                    if (selectedFormat) exportFormat = selectedFormat.value;
                });
            }
        }
    });

    if (result !== 'export') return;

    try {
        const exportOptions = {
            includePrivateNotes,
            format: exportFormat
        };

        // Only include IDs if user wants to export selected matters
        if (exportSelectedOnly && hasSelection) {
            exportOptions.ids = Array.from(selectedMatters);
        }

        // For HTML export, always request JSON from API (we'll transform it client-side)
        const apiOptions = { ...exportOptions };
        if (exportFormat === 'html') {
            apiOptions.format = 'json';
        }

        const blob = await api.exportMatters(apiOptions);

        // Get visible columns to filter export (excluding checkbox and actions)
        const visibleColumns = getVisibleColumns().filter(col =>
            col !== 'checkbox' && col !== 'actions'
        );

        // Map column keys to export field names
        const columnToFieldMap = {
            'id': 'id',
            'matter_date': 'matter_date',
            'note': 'note',
            'cost': 'cost',
            'private_notes': 'private_notes'
        };

        // Filter to only include columns that have export field mappings
        const exportColumns = visibleColumns
            .filter(col => columnToFieldMap[col])
            .map(col => columnToFieldMap[col]);

        // If private_notes is visible but user unchecked include notes, remove it
        const finalExportColumns = includePrivateNotes
            ? exportColumns
            : exportColumns.filter(col => col !== 'private_notes');

        // Process the export data to respect column visibility and order
        let processedBlob = blob;

        if (exportFormat === 'html') {
            // Parse JSON and generate HTML
            const text = await blob.text();
            const data = JSON.parse(text);
            const htmlContent = generateHtmlExport(data, finalExportColumns, includePrivateNotes);
            processedBlob = new Blob([htmlContent], { type: 'text/html' });
        } else if (exportFormat === 'json') {
            // Parse JSON, filter columns, and re-stringify
            const text = await blob.text();
            const data = JSON.parse(text);
            const filteredData = data.map(item => {
                const filtered = {};
                finalExportColumns.forEach(col => {
                    if (col in item) {
                        filtered[col] = item[col];
                    }
                });
                return filtered;
            });
            processedBlob = new Blob([JSON.stringify(filteredData, null, 2)], { type: 'application/json' });
        } else {
            // Parse CSV, filter columns, and rebuild
            const text = await blob.text();
            const lines = text.trim().split('\n');
            if (lines.length > 0) {
                const originalHeaders = lines[0].split(',');

                // Find indices of columns to keep based on their position in original CSV
                const headerMap = {};
                originalHeaders.forEach((h, i) => headerMap[h] = i);

                // Build new header line with only visible columns
                const newHeaders = finalExportColumns.filter(col => col in headerMap);
                const headerIndices = newHeaders.map(h => headerMap[h]);

                // Rebuild CSV with only visible columns
                const newLines = [newHeaders.join(',')];
                for (let i = 1; i < lines.length; i++) {
                    const values = parseCSVLine(lines[i]);
                    const newValues = headerIndices.map(idx => values[idx] ?? '');
                    newLines.push(newValues.join(','));
                }

                processedBlob = new Blob([newLines.join('\n')], { type: 'text/csv' });
            }
        }

        const url = window.URL.createObjectURL(processedBlob);
        const a = document.createElement('a');
        a.href = url;
        // Use detailed timestamp: YYYY-MM-DD_HH-MM-SS to prevent duplicate filenames
        const now = new Date();
        const timestamp = now.toISOString().replace('T', '_').replace(/:/g, '-').split('.')[0];
        a.download = `matters-${timestamp}.${exportFormat}`;
        a.click();
        window.URL.revokeObjectURL(url);

        const count = (exportSelectedOnly && hasSelection) ? selectedMatters.size : 'all';
        const formatLabel = exportFormat.toUpperCase();
        showToast(`${formatLabel} exported successfully (${count} matter${count === 1 ? '' : 's'})`, 'success');

        // Clear selection after successful export
        handleDeselectAll();
    } catch (error) {
        showToast(`Export failed: ${error.message}`, 'error');
    }
}

// Helper to parse a CSV line handling quoted fields
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // Skip escaped quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);
    return values;
}

// Helper to escape HTML for export
function escapeHtmlForExport(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Generate self-contained HTML export with theming and expandable notes
function generateHtmlExport(data, columns, includePrivateNotes) {
    const timestamp = new Date().toLocaleString();
    const columnLabels = {
        id: 'ID',
        matter_date: 'Date & Time',
        note: 'Note',
        cost: 'Cost',
        private_notes: 'Private Notes'
    };

    // Build table headers
    const headers = columns.map(col => `<th>${columnLabels[col] || col}</th>`).join('');

    // Build table rows
    const rows = data.map(item => {
        const hasNotes = includePrivateNotes && item.private_notes && item.private_notes.length > 0;
        const cells = columns.filter(col => col !== 'private_notes').map(col => {
            let value = item[col] ?? '';
            if (col === 'cost' && typeof value === 'number') {
                value = '$' + value.toFixed(2);
            } else if (col === 'matter_date' && value) {
                value = new Date(value).toLocaleString();
            }
            return `<td>${escapeHtmlForExport(String(value))}</td>`;
        }).join('');

        // Add expand button cell if private notes column is included
        let notesCell = '';
        if (includePrivateNotes && columns.includes('private_notes')) {
            if (hasNotes) {
                notesCell = `<td class="notes-toggle" data-id="${item.id}">
                    <button class="expand-btn" title="Click to expand notes">
                        <svg class="expand-icon" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                        <span class="note-count">${item.private_notes.length}</span>
                    </button>
                </td>`;
            } else {
                notesCell = '<td></td>';
            }
        }

        let rowHtml = `<tr class="matter-row">${cells}${notesCell}</tr>`;

        // Add expandable notes row
        if (hasNotes) {
            const notesHtml = item.private_notes.map(note => `
                <div class="note-item">
                    <div class="note-meta">
                        <span class="note-author">${escapeHtmlForExport(note.created_by || 'Unknown')}</span>
                        <span class="note-date">${new Date(note.created_at).toLocaleString()}</span>
                    </div>
                    <div class="note-content">${escapeHtmlForExport(note.note_content)}</div>
                </div>
            `).join('');

            rowHtml += `<tr class="notes-row hidden" data-parent="${item.id}">
                <td colspan="${columns.length}">
                    <div class="private-notes-container">
                        <div class="notes-header">Private Notes</div>
                        ${notesHtml}
                    </div>
                </td>
            </tr>`;
        }

        return rowHtml;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Legal Matters Export - ${timestamp}</title>
    <style>
        :root {
            --bg: #ffffff;
            --bg-secondary: #f9fafb;
            --text: #1f2937;
            --text-secondary: #6b7280;
            --border: #e5e7eb;
            --primary: #3b82f6;
            --primary-hover: #2563eb;
            --header-bg: #f3f4f6;
            --row-hover: #f9fafb;
            --notes-bg: #fefce8;
            --notes-border: #fde047;
        }
        .dark {
            --bg: #111827;
            --bg-secondary: #1f2937;
            --text: #f9fafb;
            --text-secondary: #9ca3af;
            --border: #374151;
            --primary: #60a5fa;
            --primary-hover: #3b82f6;
            --header-bg: #1f2937;
            --row-hover: #1f2937;
            --notes-bg: #422006;
            --notes-border: #a16207;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.5;
            padding: 2rem;
            transition: background 0.3s, color 0.3s;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid var(--border);
        }
        .header h1 { font-size: 1.5rem; font-weight: 600; }
        .header-meta { text-align: right; color: var(--text-secondary); font-size: 0.875rem; }
        .theme-toggle {
            background: var(--primary);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            cursor: pointer;
            font-size: 0.875rem;
            transition: background 0.2s;
        }
        .theme-toggle:hover { background: var(--primary-hover); }
        table {
            width: 100%;
            border-collapse: collapse;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            overflow: hidden;
        }
        th {
            background: var(--header-bg);
            text-align: left;
            padding: 0.75rem 1rem;
            font-weight: 600;
            font-size: 0.875rem;
            border-bottom: 2px solid var(--border);
        }
        td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border);
            font-size: 0.875rem;
        }
        tr.matter-row:hover { background: var(--row-hover); }
        tr:nth-child(even):not(.notes-row) { background: var(--bg-secondary); }
        tr:nth-child(even):not(.notes-row):hover { background: var(--row-hover); }
        .notes-toggle { text-align: center; }
        .expand-btn {
            background: none;
            border: 1px solid var(--border);
            border-radius: 0.375rem;
            padding: 0.25rem 0.5rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            color: var(--text);
            transition: background 0.2s;
        }
        .expand-btn:hover { background: var(--bg-secondary); }
        .expand-icon { width: 1rem; height: 1rem; transition: transform 0.2s; }
        .expanded .expand-icon { transform: rotate(180deg); }
        .note-count {
            font-size: 0.75rem;
            background: var(--primary);
            color: white;
            padding: 0.125rem 0.375rem;
            border-radius: 9999px;
        }
        .notes-row { background: var(--notes-bg) !important; }
        .notes-row.hidden { display: none; }
        .private-notes-container {
            padding: 1rem;
            border-left: 3px solid var(--notes-border);
            margin: 0.5rem 0;
        }
        .notes-header { font-weight: 600; margin-bottom: 0.75rem; color: var(--text); }
        .note-item {
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 0.375rem;
            padding: 0.75rem;
            margin-bottom: 0.5rem;
        }
        .note-item:last-child { margin-bottom: 0; }
        .note-meta {
            display: flex;
            gap: 1rem;
            font-size: 0.75rem;
            color: var(--text-secondary);
            margin-bottom: 0.5rem;
        }
        .note-author { font-weight: 500; }
        .note-content { white-space: pre-wrap; }
        .footer {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border);
            color: var(--text-secondary);
            font-size: 0.75rem;
            text-align: center;
        }
        @media print {
            body { padding: 0; }
            .theme-toggle { display: none; }
            .notes-row.hidden { display: table-row !important; }
            .expand-btn { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div><h1>Legal Matters Export</h1></div>
        <div style="display: flex; align-items: center; gap: 1rem;">
            <button class="theme-toggle" onclick="toggleTheme()">Toggle Theme</button>
            <div class="header-meta">
                <div>Generated: ${timestamp}</div>
                <div>${data.length} matter${data.length !== 1 ? 's' : ''}</div>
            </div>
        </div>
    </div>
    <table>
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
    </table>
    <div class="footer">
        Exported from LEGAL MATTER (Legal Expense Governance Allocation Ledger Management Application for Tracking Time, Expenses, Retainers)
    </div>
    <script>
        function toggleTheme() {
            document.body.classList.toggle('dark');
            localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
        }
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark');
        }
        document.querySelectorAll('.expand-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.closest('.notes-toggle').dataset.id;
                const notesRow = document.querySelector('.notes-row[data-parent="' + id + '"]');
                if (notesRow) {
                    notesRow.classList.toggle('hidden');
                    this.classList.toggle('expanded');
                }
            });
        });
    </script>
</body>
</html>`;
}
