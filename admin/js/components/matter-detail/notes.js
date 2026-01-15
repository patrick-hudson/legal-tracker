/**
 * Matter Detail - Notes Section
 * Rendering and CRUD operations for private notes
 */

import api from '../../api/index.js';
import { formatDate } from '../../display-utils.js';
import { showCustomModal, escapeHtml } from '../../modal.js';
import {
    INTERACTION_TYPES,
    COLOR_CLASSES,
    currentNotesSort,
    currentNotesSearch,
    setNotesSort,
    setNotesSearch,
    showToast
} from './shared.js';

// Filter and sort notes based on current state
export function filterAndSortNotes(notes) {
    let filtered = [...notes];

    // Apply search filter
    if (currentNotesSearch.trim()) {
        const searchLower = currentNotesSearch.toLowerCase();
        filtered = filtered.filter(note => {
            const contentMatch = note.note_content?.toLowerCase().includes(searchLower);
            const authorMatch = note.created_by_username?.toLowerCase().includes(searchLower);
            return contentMatch || authorMatch;
        });
    }

    // Apply sorting
    filtered.sort((a, b) => {
        switch (currentNotesSort) {
            case 'oldest':
                return new Date(a.created_at) - new Date(b.created_at);
            case 'newest':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'author-asc':
                return (a.created_by_username || '').localeCompare(b.created_by_username || '');
            case 'author-desc':
                return (b.created_by_username || '').localeCompare(a.created_by_username || '');
            case 'updated':
                return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
            default:
                return new Date(b.created_at) - new Date(a.created_at);
        }
    });

    return filtered;
}

// Attach search and sort event listeners
export function attachNotesSearchAndSort(allNotes) {
    const searchInput = document.getElementById('notes-search');
    const sortSelect = document.getElementById('notes-sort');
    const notesContainer = document.getElementById('notes-container');
    const notesCount = document.getElementById('notes-count');

    if (!searchInput || !sortSelect) return;

    // Debounce function for search
    let searchTimeout;
    const debounceSearch = (fn, delay) => {
        return (...args) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => fn(...args), delay);
        };
    };

    const updateNotesList = () => {
        const filtered = filterAndSortNotes(allNotes);
        notesContainer.innerHTML = renderNotesList(filtered);

        // Update count to show filtered vs total
        if (currentNotesSearch.trim()) {
            notesCount.textContent = `(${filtered.length} of ${allNotes.length})`;
        } else {
            notesCount.textContent = `(${allNotes.length})`;
        }
    };

    searchInput.addEventListener('input', debounceSearch((e) => {
        setNotesSearch(e.target.value);
        updateNotesList();
    }, 200));

    sortSelect.addEventListener('change', (e) => {
        setNotesSort(e.target.value);
        updateNotesList();
    });
}

export function renderNotesList(notes) {
    if (notes.length === 0) {
        // Check if this is a search with no results vs no notes at all
        if (currentNotesSearch.trim()) {
            return `
                <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                    <svg class="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <p>No notes match your search</p>
                    <p class="text-sm">Try a different search term or clear the search.</p>
                </div>
            `;
        }
        return `
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p>No private notes yet</p>
                <p class="text-sm">Click "Add Note" to create the first internal note for this matter.</p>
            </div>
        `;
    }

    return `
        <div class="space-y-4">
            ${notes.map(note => {
                const interactionConfig = INTERACTION_TYPES[note.interaction_type] || INTERACTION_TYPES.note;
                const colorClasses = COLOR_CLASSES[interactionConfig.color] || COLOR_CLASSES.gray;
                return `
                <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4" data-note-id="${note.id}" data-interaction-date="${note.interaction_date || ''}" data-interaction-type="${note.interaction_type || 'note'}">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center gap-2">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClasses.bg}">
                                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${interactionConfig.icon}"/></svg>
                                ${interactionConfig.label}
                            </span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                                ${note.interaction_date ? formatDate(note.interaction_date, { format: 'short', placeholder: '' }) : formatDate(note.created_at, { format: 'short', placeholder: 'Unknown' })}
                            </span>
                            ${note.created_by_username ? `<span class="text-xs text-gray-500 dark:text-gray-400">by ${escapeHtml(note.created_by_username)}</span>` : ''}
                            ${note.updated_at && note.updated_at !== note.created_at ? `<span class="text-xs text-gray-400 dark:text-gray-500">(edited)</span>` : ''}
                        </div>
                        <div class="flex gap-2">
                            <button class="edit-note-btn text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm" data-note-id="${note.id}">Edit</button>
                            <button class="delete-note-btn text-red-600 hover:text-red-800 dark:text-red-400 text-sm" data-note-id="${note.id}">Delete</button>
                        </div>
                    </div>
                    <div class="text-gray-900 dark:text-white whitespace-pre-wrap">${escapeHtml(note.note_content)}</div>
                </div>
            `;}).join('')}
        </div>
    `;
}

export function attachNoteEventListeners(matterId, container, reloadMatter) {
    // Use event delegation on the notes container for better reliability
    const notesContainer = document.getElementById('notes-container');
    if (!notesContainer) return;

    notesContainer.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-note-btn');
        const deleteBtn = e.target.closest('.delete-note-btn');

        if (editBtn) {
            e.preventDefault();
            e.stopPropagation();
            const noteId = editBtn.dataset.noteId;
            // Find the parent div with data-note-id (not the button itself which also has data-note-id)
            const noteDiv = editBtn.closest('.border.rounded-lg[data-note-id]');
            const currentContent = noteDiv.querySelector('.whitespace-pre-wrap').textContent;
            const interactionDate = noteDiv.dataset.interactionDate || '';
            const interactionType = noteDiv.dataset.interactionType || 'note';
            await showEditNoteModal(noteId, currentContent, interactionDate, interactionType, matterId, reloadMatter);
        } else if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const noteId = deleteBtn.dataset.noteId;
            await handleDeleteNote(noteId, matterId, reloadMatter);
        }
    });
}

export async function showAddNoteModal(matterId, reloadMatter) {
    let capturedValues = { note_content: '', interaction_date: '', interaction_type: 'note' };
    const today = new Date().toISOString().split('T')[0];

    const interactionTypeOptions = Object.entries(INTERACTION_TYPES).map(([value, config]) =>
        `<option value="${value}">${config.label}</option>`
    ).join('');

    const content = `
        <form id="add-note-form">
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Interaction Date</label>
                    <input type="date" name="interaction_date" value="${today}"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                    <select name="interaction_type"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        ${interactionTypeOptions}
                    </select>
                </div>
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note Content</label>
                <textarea name="note_content" rows="5" required placeholder="Enter your private note here..."
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"></textarea>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
                This note will only be visible to admin users.
            </p>
        </form>
    `;

    const result = await showCustomModal({
        title: 'Add Private Note',
        content,
        buttons: [
            { text: 'Cancel', type: 'secondary', value: 'cancel' },
            { text: 'Add Note', type: 'primary', value: 'submit' }
        ],
        size: 'md',
        onOpen: (modal) => {
            // Capture the values before modal closes
            modal.querySelectorAll('.modal-action-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    capturedValues.note_content = modal.querySelector('[name="note_content"]')?.value.trim() || '';
                    capturedValues.interaction_date = modal.querySelector('[name="interaction_date"]')?.value || '';
                    capturedValues.interaction_type = modal.querySelector('[name="interaction_type"]')?.value || 'note';
                }, { capture: true });
            });
        }
    });

    if (result === 'submit' && capturedValues.note_content) {
        try {
            await api.createPrivateNote(matterId, capturedValues.note_content, {
                interaction_date: capturedValues.interaction_date || null,
                interaction_type: capturedValues.interaction_type
            });
            showToast('Note added successfully', 'success');
            await reloadMatter();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    } else if (result === 'submit' && !capturedValues.note_content) {
        showToast('Note content is required', 'error');
    }
}

async function showEditNoteModal(noteId, currentContent, currentInteractionDate, currentInteractionType, matterId, reloadMatter) {
    let capturedValues = {
        note_content: currentContent,
        interaction_date: currentInteractionDate,
        interaction_type: currentInteractionType
    };

    const interactionTypeOptions = Object.entries(INTERACTION_TYPES).map(([value, config]) =>
        `<option value="${value}" ${currentInteractionType === value ? 'selected' : ''}>${config.label}</option>`
    ).join('');

    const content = `
        <form id="edit-note-form">
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Interaction Date</label>
                    <input type="date" name="interaction_date" value="${currentInteractionDate}"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                    <select name="interaction_type"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        ${interactionTypeOptions}
                    </select>
                </div>
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note Content</label>
                <textarea name="note_content" rows="5" required
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">${escapeHtml(currentContent)}</textarea>
            </div>
        </form>
    `;

    const result = await showCustomModal({
        title: 'Edit Private Note',
        content,
        buttons: [
            { text: 'Cancel', type: 'secondary', value: 'cancel' },
            { text: 'Save Changes', type: 'primary', value: 'submit' }
        ],
        size: 'md',
        onOpen: (modal) => {
            // Capture the values before modal closes
            modal.querySelectorAll('.modal-action-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    capturedValues.note_content = modal.querySelector('[name="note_content"]')?.value.trim() || '';
                    capturedValues.interaction_date = modal.querySelector('[name="interaction_date"]')?.value || '';
                    capturedValues.interaction_type = modal.querySelector('[name="interaction_type"]')?.value || 'note';
                }, { capture: true });
            });
        }
    });

    if (result === 'submit' && capturedValues.note_content) {
        try {
            await api.updatePrivateNote(noteId, capturedValues.note_content, {
                interaction_date: capturedValues.interaction_date || null,
                interaction_type: capturedValues.interaction_type
            });
            showToast('Note updated successfully', 'success');
            await reloadMatter();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    } else if (result === 'submit' && !capturedValues.note_content) {
        showToast('Note content is required', 'error');
    }
}

async function handleDeleteNote(noteId, matterId, reloadMatter) {
    const { showConfirm } = await import('../../modal.js');

    const confirmed = await showConfirm('Are you sure you want to delete this note?', {
        title: 'Delete Note',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
    });

    if (!confirmed) return;

    try {
        await api.deletePrivateNote(noteId);
        showToast('Note deleted successfully', 'success');
        await reloadMatter();
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}
