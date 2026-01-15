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
                const isLongNote = note.note_content && note.note_content.length > 500;
                return `
                <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4" data-note-id="${note.id}" data-interaction-date="${note.interaction_date || ''}" data-interaction-type="${note.interaction_type || 'note'}">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClasses.bg}">
                                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${interactionConfig.icon}"/></svg>
                                ${interactionConfig.label}
                            </span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                                ${note.interaction_date ? formatDate(note.interaction_date, { format: 'short', placeholder: '' }) : formatDate(note.created_at, { format: 'short', placeholder: 'Unknown' })}
                            </span>
                            ${note.created_by_username ? `<span class="text-xs text-gray-500 dark:text-gray-400">by ${escapeHtml(note.created_by_username)}</span>` : ''}
                            ${note.updated_at && note.updated_at !== note.created_at ? `<span class="text-xs text-gray-400 dark:text-gray-500">(edited)</span>` : ''}
                            ${isLongNote ? `<span class="text-xs text-gray-400 dark:text-gray-500">(${note.note_content.length.toLocaleString()} chars)</span>` : ''}
                        </div>
                        <div class="flex gap-2 flex-shrink-0">
                            ${isLongNote ? `<button class="expand-note-btn text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-sm" data-note-id="${note.id}" title="View full note">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
                            </button>` : ''}
                            <button class="edit-note-btn text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm" data-note-id="${note.id}">Edit</button>
                            <button class="delete-note-btn text-red-600 hover:text-red-800 dark:text-red-400 text-sm" data-note-id="${note.id}">Delete</button>
                        </div>
                    </div>
                    <div class="text-gray-900 dark:text-white whitespace-pre-wrap break-words ${isLongNote ? 'line-clamp-6 note-content-collapsed' : ''}" data-full-content="${isLongNote ? 'true' : 'false'}">${escapeHtml(note.note_content)}</div>
                    ${isLongNote ? `<button class="toggle-note-btn text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 mt-2" data-note-id="${note.id}" data-expanded="false">Show more</button>` : ''}
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
        const expandBtn = e.target.closest('.expand-note-btn');
        const toggleBtn = e.target.closest('.toggle-note-btn');

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
        } else if (expandBtn) {
            e.preventDefault();
            e.stopPropagation();
            const noteDiv = expandBtn.closest('.border.rounded-lg[data-note-id]');
            const currentContent = noteDiv.querySelector('.whitespace-pre-wrap').textContent;
            const interactionDate = noteDiv.dataset.interactionDate || '';
            const interactionType = noteDiv.dataset.interactionType || 'note';
            await showViewNoteModal(currentContent, interactionDate, interactionType);
        } else if (toggleBtn) {
            e.preventDefault();
            e.stopPropagation();
            const noteDiv = toggleBtn.closest('.border.rounded-lg[data-note-id]');
            const contentDiv = noteDiv.querySelector('.whitespace-pre-wrap');
            const isExpanded = toggleBtn.dataset.expanded === 'true';

            if (isExpanded) {
                contentDiv.classList.add('line-clamp-6');
                toggleBtn.textContent = 'Show more';
                toggleBtn.dataset.expanded = 'false';
            } else {
                contentDiv.classList.remove('line-clamp-6');
                toggleBtn.textContent = 'Show less';
                toggleBtn.dataset.expanded = 'true';
            }
        }
    });
}

// View-only modal for reading long notes
async function showViewNoteModal(content, interactionDate, interactionType) {
    const interactionConfig = INTERACTION_TYPES[interactionType] || INTERACTION_TYPES.note;

    const modalContent = `
        <div class="mb-4">
            <div class="flex items-center gap-3 mb-4 text-sm text-gray-500 dark:text-gray-400">
                <span class="font-medium">${interactionConfig.label}</span>
                ${interactionDate ? `<span>${formatDate(interactionDate, { format: 'short', placeholder: '' })}</span>` : ''}
                <span>${content.length.toLocaleString()} characters</span>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                <div class="text-gray-900 dark:text-white whitespace-pre-wrap break-words">${escapeHtml(content)}</div>
            </div>
        </div>
    `;

    await showCustomModal({
        title: 'View Note',
        content: modalContent,
        buttons: [
            { text: 'Close', type: 'secondary', value: 'close' }
        ],
        size: 'xl'
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
                <div class="flex justify-between items-center mb-2">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Note Content</label>
                    <span id="char-count" class="text-xs text-gray-500 dark:text-gray-400">0 characters</span>
                </div>
                <textarea name="note_content" rows="8" required placeholder="Enter your private note here..."
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y min-h-[120px] max-h-[60vh]"></textarea>
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
        size: 'lg',
        onOpen: (modal) => {
            const textarea = modal.querySelector('[name="note_content"]');
            const charCount = modal.querySelector('#char-count');

            // Update character count on input
            textarea?.addEventListener('input', () => {
                if (charCount) {
                    charCount.textContent = `${textarea.value.length.toLocaleString()} characters`;
                }
            });

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

    // Determine modal size and textarea rows based on content length
    const isLongNote = currentContent.length > 500;
    const modalSize = isLongNote ? 'xl' : 'lg';
    const textareaRows = isLongNote ? 15 : 8;

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
                <div class="flex justify-between items-center mb-2">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Note Content</label>
                    <span id="char-count" class="text-xs text-gray-500 dark:text-gray-400">${currentContent.length.toLocaleString()} characters</span>
                </div>
                <textarea name="note_content" rows="${textareaRows}" required
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y min-h-[120px] max-h-[60vh]">${escapeHtml(currentContent)}</textarea>
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
        size: modalSize,
        onOpen: (modal) => {
            const textarea = modal.querySelector('[name="note_content"]');
            const charCount = modal.querySelector('#char-count');

            // Update character count on input
            textarea?.addEventListener('input', () => {
                if (charCount) {
                    charCount.textContent = `${textarea.value.length.toLocaleString()} characters`;
                }
            });

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
