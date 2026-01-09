/**
 * Matter Detail Component
 * Shows individual matter details and private notes
 */

import api from '../api.js';
import {
    formatCurrency,
    formatDate,
    escapeHtml as safeEscapeHtml,
    formatErrorMessage,
    PLACEHOLDER
} from '../display-utils.js';
import { showConfirm, showCustomModal, escapeHtml } from '../modal.js';

// Notes state management
let currentNotesSort = 'newest';
let currentNotesSearch = '';

export async function renderMatterDetail(container, params) {
    const matterId = params?.[0];

    if (!matterId) {
        container.innerHTML = `
            <div class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
                <span class="font-medium">Error!</span> No matter ID provided.
            </div>
        `;
        return;
    }

    container.innerHTML = '<div class="flex justify-center items-center h-64"><div class="spinner"></div></div>';

    try {
        const matter = await api.getMatter(matterId);
        renderMatterView(container, matter);
    } catch (error) {
        container.innerHTML = `
            <div class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
                <span class="font-medium">Error!</span> ${formatErrorMessage(error)}
            </div>
            <a href="#/matters" class="text-blue-600 hover:underline">&larr; Back to Matters</a>
        `;
    }
}

function renderMatterView(container, matter) {
    const privateNotes = matter.private_notes || [];
    const attachments = matter.attachments || [];

    container.innerHTML = `
        <div class="mb-6">
            <a href="#/matters" class="inline-flex items-center text-blue-600 hover:underline mb-4">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Back to Matters
            </a>

            <div class="flex justify-between items-start">
                <div>
                    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Matter #${matter.id}</h1>
                    <p class="text-gray-600 dark:text-gray-400">Created ${formatDate(matter.created_at, { format: 'datetime', placeholder: 'Unknown' })}</p>
                </div>
                <div class="flex gap-2">
                    <button id="edit-matter-btn" class="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
                        Edit Matter
                    </button>
                    <button id="delete-matter-btn" class="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium">
                        Delete
                    </button>
                </div>
            </div>
        </div>

        <!-- Matter Details Card -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Matter Details</h2>
            <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Date & Time</dt>
                    <dd class="text-lg text-gray-900 dark:text-white">${formatDate(matter.matter_date, { format: 'datetime', placeholder: PLACEHOLDER.DASH })}</dd>
                </div>
                <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Cost</dt>
                    <dd class="text-lg font-semibold text-gray-900 dark:text-white">${formatCurrency(matter.cost)}</dd>
                </div>
                <div class="md:col-span-2">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Note</dt>
                    <dd class="text-gray-900 dark:text-white">${safeEscapeHtml(matter.note, 'No note')}</dd>
                </div>
            </dl>
        </div>

        <!-- Attachments Section -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <div class="flex justify-between items-center mb-4">
                <div>
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Attachments <span id="attachments-count" class="text-sm font-normal text-gray-500">(${attachments.length})</span></h2>
                    <p class="text-sm text-amber-600 dark:text-amber-400">
                        <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
                        </svg>
                        Admin Only - PDF, DOC, DOCX, RTF, TXT (max 25MB)
                    </p>
                </div>
                <div class="flex gap-2">
                    <label class="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium cursor-pointer">
                        Upload File
                        <input type="file" id="attachment-upload" class="hidden" accept=".pdf,.doc,.docx,.rtf,.txt">
                    </label>
                </div>
            </div>

            <!-- Upload Progress -->
            <div id="upload-progress" class="hidden mb-4">
                <div class="flex items-center gap-3">
                    <div class="flex-1 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                        <div id="upload-progress-bar" class="bg-blue-600 h-2 rounded-full transition-all" style="width: 0%"></div>
                    </div>
                    <span id="upload-progress-text" class="text-sm text-gray-600 dark:text-gray-400">Uploading...</span>
                </div>
            </div>

            <div id="attachments-container">
                ${renderAttachmentsList(attachments)}
            </div>
        </div>

        <!-- Private Notes Section -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div class="flex justify-between items-center mb-4">
                <div>
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Private Notes <span id="notes-count" class="text-sm font-normal text-gray-500">(${privateNotes.length})</span></h2>
                    <p class="text-sm text-amber-600 dark:text-amber-400">
                        <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
                        </svg>
                        Admin Only - These notes are not visible to public users
                    </p>
                </div>
                <button id="add-note-btn" class="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium">
                    Add Note
                </button>
            </div>

            <!-- Search and Sort Controls -->
            ${privateNotes.length > 0 ? `
            <div class="flex gap-3 mb-4">
                <div class="flex-1">
                    <input type="text" id="notes-search" placeholder="Search notes..." value="${escapeHtml(currentNotesSearch)}"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
                </div>
                <div class="relative">
                    <select id="notes-sort" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 pr-8 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="newest" ${currentNotesSort === 'newest' ? 'selected' : ''}>Newest First</option>
                        <option value="oldest" ${currentNotesSort === 'oldest' ? 'selected' : ''}>Oldest First</option>
                        <option value="author-asc" ${currentNotesSort === 'author-asc' ? 'selected' : ''}>Author (A-Z)</option>
                        <option value="author-desc" ${currentNotesSort === 'author-desc' ? 'selected' : ''}>Author (Z-A)</option>
                        <option value="updated" ${currentNotesSort === 'updated' ? 'selected' : ''}>Recently Updated</option>
                    </select>
                </div>
            </div>
            ` : ''}

            <div id="notes-container">
                ${renderNotesList(filterAndSortNotes(privateNotes))}
            </div>
        </div>
    `;

    // Store matter data for event handlers
    container.dataset.matterId = matter.id;

    // Event listeners
    document.getElementById('edit-matter-btn').addEventListener('click', () => showEditMatterModal(matter, container));
    document.getElementById('delete-matter-btn').addEventListener('click', () => handleDeleteMatter(matter.id));
    document.getElementById('add-note-btn').addEventListener('click', () => showAddNoteModal(matter.id, container));

    // Attachment upload listener
    document.getElementById('attachment-upload')?.addEventListener('change', (e) => handleAttachmentUpload(e, matter.id, container));

    // Notes search and sort listeners
    attachNotesSearchAndSort(privateNotes);

    // Add note action listeners
    attachNoteEventListeners(matter.id, container);

    // Add attachment action listeners
    attachAttachmentEventListeners(matter.id, container);
}

// Filter and sort notes based on current state
function filterAndSortNotes(notes) {
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
function attachNotesSearchAndSort(allNotes) {
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
        currentNotesSearch = e.target.value;
        updateNotesList();
    }, 200));

    sortSelect.addEventListener('change', (e) => {
        currentNotesSort = e.target.value;
        updateNotesList();
    });
}

function renderNotesList(notes, isSearchResult = false) {
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
            ${notes.map(note => `
                <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4" data-note-id="${note.id}">
                    <div class="flex justify-between items-start mb-2">
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                            ${note.created_by_username ? `<span class="font-medium">${escapeHtml(note.created_by_username)}</span> &bull; ` : ''}
                            ${formatDate(note.created_at, { format: 'datetime', placeholder: 'Unknown' })}
                            ${note.updated_at && note.updated_at !== note.created_at ? ` (edited ${formatDate(note.updated_at, { format: 'short', placeholder: '' })})` : ''}
                        </div>
                        <div class="flex gap-2">
                            <button class="edit-note-btn text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm" data-note-id="${note.id}">Edit</button>
                            <button class="delete-note-btn text-red-600 hover:text-red-800 dark:text-red-400 text-sm" data-note-id="${note.id}">Delete</button>
                        </div>
                    </div>
                    <div class="text-gray-900 dark:text-white whitespace-pre-wrap">${escapeHtml(note.note_content)}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function attachNoteEventListeners(matterId, container) {
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
            await showEditNoteModal(noteId, currentContent, matterId, container);
        } else if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const noteId = deleteBtn.dataset.noteId;
            await handleDeleteNote(noteId, matterId, container);
        }
    });
}

async function showEditMatterModal(matter, container) {
    let capturedFormData = null;

    const content = `
        <form id="edit-matter-form">
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date & Time</label>
                <input type="datetime-local" name="matter_date" value="${matter.matter_date ? matter.matter_date.slice(0, 16) : ''}" required
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note</label>
                <input type="text" name="note" value="${escapeHtml(matter.note || '')}" required
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cost ($)</label>
                <input type="number" step="0.01" name="cost" value="${matter.cost || 0}" required
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            </div>
        </form>
    `;

    const result = await showCustomModal({
        title: 'Edit Matter',
        content,
        buttons: [
            { text: 'Cancel', type: 'secondary', value: 'cancel' },
            { text: 'Save Changes', type: 'primary', value: 'submit' }
        ],
        size: 'md',
        onOpen: (modal) => {
            // Capture form data before modal closes
            modal.querySelectorAll('.modal-action-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const form = modal.querySelector('#edit-matter-form');
                    if (form) {
                        capturedFormData = {
                            matter_date: form.querySelector('[name="matter_date"]').value,
                            note: form.querySelector('[name="note"]').value,
                            cost: parseFloat(form.querySelector('[name="cost"]').value)
                        };
                    }
                }, { capture: true });
            });
        }
    });

    if (result === 'submit' && capturedFormData) {
        try {
            await api.updateMatter(matter.id, capturedFormData);
            showToast('Matter updated successfully', 'success');

            // Reload the matter
            const updatedMatter = await api.getMatter(matter.id);
            renderMatterView(container, updatedMatter);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    }
}

async function handleDeleteMatter(matterId) {
    const confirmed = await showConfirm('Are you sure you want to delete this matter? This will also delete all private notes.', {
        title: 'Delete Matter',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
    });

    if (!confirmed) return;

    try {
        await api.deleteMatter(matterId);
        showToast('Matter deleted successfully', 'success');
        window.location.hash = '/matters';
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function showAddNoteModal(matterId, container) {
    let capturedNoteContent = '';

    const content = `
        <form id="add-note-form">
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
            // Capture the value before modal closes
            modal.querySelectorAll('.modal-action-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const textarea = modal.querySelector('[name="note_content"]');
                    if (textarea) {
                        capturedNoteContent = textarea.value.trim();
                    }
                }, { capture: true });
            });
        }
    });

    if (result === 'submit' && capturedNoteContent) {
        try {
            await api.createPrivateNote(matterId, capturedNoteContent);
            showToast('Note added successfully', 'success');

            // Reload the matter to get updated notes
            const updatedMatter = await api.getMatter(matterId);
            renderMatterView(container, updatedMatter);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    } else if (result === 'submit' && !capturedNoteContent) {
        showToast('Note content is required', 'error');
    }
}

async function showEditNoteModal(noteId, currentContent, matterId, container) {
    let capturedNoteContent = '';

    const content = `
        <form id="edit-note-form">
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
            // Capture the value before modal closes
            modal.querySelectorAll('.modal-action-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const textarea = modal.querySelector('[name="note_content"]');
                    if (textarea) {
                        capturedNoteContent = textarea.value.trim();
                    }
                }, { capture: true });
            });
        }
    });

    if (result === 'submit' && capturedNoteContent) {
        try {
            await api.updatePrivateNote(noteId, capturedNoteContent);
            showToast('Note updated successfully', 'success');

            // Reload the matter to get updated notes
            const updatedMatter = await api.getMatter(matterId);
            renderMatterView(container, updatedMatter);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    } else if (result === 'submit' && !capturedNoteContent) {
        showToast('Note content is required', 'error');
    }
}

async function handleDeleteNote(noteId, matterId, container) {
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

        // Reload the matter to get updated notes
        const updatedMatter = await api.getMatter(matterId);
        renderMatterView(container, updatedMatter);
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
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

// ==================== ATTACHMENTS ====================

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(contentType) {
    if (contentType === 'application/pdf') {
        return `<svg class="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
        </svg>`;
    } else if (contentType?.includes('word') || contentType?.includes('msword')) {
        return `<svg class="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
        </svg>`;
    } else {
        return `<svg class="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
        </svg>`;
    }
}

function isPreviewable(contentType) {
    const previewableTypes = [
        'application/pdf',
        'text/plain',
        'text/rtf',
        'application/rtf'
    ];
    return previewableTypes.includes(contentType);
}

function renderAttachmentsList(attachments) {
    if (attachments.length === 0) {
        return `
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                </svg>
                <p>No attachments yet</p>
                <p class="text-sm">Click "Upload File" to add documents to this matter.</p>
            </div>
        `;
    }

    return `
        <div class="space-y-3">
            ${attachments.map(attachment => `
                <div class="flex items-center gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700" data-attachment-id="${attachment.id}">
                    <div class="flex-shrink-0">
                        ${getFileIcon(attachment.content_type)}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${escapeHtml(attachment.original_filename)}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            ${formatFileSize(attachment.size_bytes)} &bull;
                            ${formatDate(attachment.created_at, { format: 'short', placeholder: 'Unknown' })}
                            ${attachment.created_by_username ? ` &bull; ${escapeHtml(attachment.created_by_username)}` : ''}
                        </p>
                    </div>
                    <div class="flex gap-1 flex-shrink-0">
                        ${isPreviewable(attachment.content_type) ? `
                        <button class="preview-attachment-btn p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" data-id="${attachment.id}" data-filename="${escapeHtml(attachment.original_filename)}" data-content-type="${attachment.content_type}" data-tooltip-target="tooltip-preview-${attachment.id}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                        </button>
                        <div id="tooltip-preview-${attachment.id}" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                            Preview
                            <div class="tooltip-arrow" data-popper-arrow></div>
                        </div>
                        ` : ''}
                        <button class="download-attachment-btn p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded" data-id="${attachment.id}" data-filename="${escapeHtml(attachment.original_filename)}" data-tooltip-target="tooltip-download-${attachment.id}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                        </button>
                        <div id="tooltip-download-${attachment.id}" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                            Download
                            <div class="tooltip-arrow" data-popper-arrow></div>
                        </div>
                        <button class="delete-attachment-btn p-2 text-red-600 hover:text-red-800 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded" data-id="${attachment.id}" data-tooltip-target="tooltip-delete-${attachment.id}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                        <div id="tooltip-delete-${attachment.id}" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                            Delete
                            <div class="tooltip-arrow" data-popper-arrow></div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function attachAttachmentEventListeners(matterId, container) {
    const attachmentsContainer = document.getElementById('attachments-container');
    if (!attachmentsContainer) return;

    attachmentsContainer.addEventListener('click', async (e) => {
        const previewBtn = e.target.closest('.preview-attachment-btn');
        const downloadBtn = e.target.closest('.download-attachment-btn');
        const deleteBtn = e.target.closest('.delete-attachment-btn');

        if (previewBtn) {
            e.preventDefault();
            e.stopPropagation();
            const attachmentId = previewBtn.dataset.id;
            const filename = previewBtn.dataset.filename;
            const contentType = previewBtn.dataset.contentType;
            await handleAttachmentPreview(attachmentId, filename, contentType);
        } else if (downloadBtn) {
            e.preventDefault();
            e.stopPropagation();
            const attachmentId = downloadBtn.dataset.id;
            const filename = downloadBtn.dataset.filename;
            await handleAttachmentDownload(attachmentId, filename);
        } else if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const attachmentId = deleteBtn.dataset.id;
            await handleAttachmentDelete(attachmentId, matterId, container);
        }
    });

    // Initialize Flowbite tooltips for dynamically created content
    if (typeof window.initFlowbite === 'function') {
        window.initFlowbite();
    }
}

async function handleAttachmentUpload(e, matterId, container) {
    const file = e.target.files[0];
    if (!file) return;

    // Clear the input so the same file can be selected again
    e.target.value = '';

    const progressDiv = document.getElementById('upload-progress');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressText = document.getElementById('upload-progress-text');

    try {
        // Show progress
        progressDiv?.classList.remove('hidden');
        progressBar.style.width = '10%';
        progressText.textContent = 'Uploading...';

        // Upload the file
        await api.uploadAttachment(matterId, file);

        progressBar.style.width = '100%';
        progressText.textContent = 'Complete!';

        showToast('File uploaded successfully', 'success');

        // Reload the matter to get updated attachments
        const updatedMatter = await api.getMatter(matterId);
        renderMatterView(container, updatedMatter);

    } catch (error) {
        progressDiv?.classList.add('hidden');
        showToast(`Upload failed: ${error.message}`, 'error');
    }
}

async function handleAttachmentDownload(attachmentId, filename) {
    try {
        await api.downloadAttachment(attachmentId, filename);
    } catch (error) {
        showToast(`Download failed: ${error.message}`, 'error');
    }
}

async function handleAttachmentPreview(attachmentId, filename, contentType) {
    try {
        // Fetch the file content using the API's fetch method with proper auth
        const response = await fetch(`/admin/api/attachments/${attachmentId}/download`, {
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch file');
        }

        // Create and show preview modal
        const modalId = 'attachment-preview-modal';
        let modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
        }

        let previewContent = '';

        if (contentType === 'application/pdf') {
            // For PDFs, create an embedded viewer
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            previewContent = `
                <iframe src="${url}" class="w-full h-full border-0" style="min-height: 70vh;"></iframe>
            `;
        } else if (contentType === 'text/plain' || contentType === 'text/rtf' || contentType === 'application/rtf') {
            // For text files, display the content
            const text = await response.text();
            previewContent = `
                <pre class="w-full h-full overflow-auto p-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-mono whitespace-pre-wrap" style="min-height: 70vh; max-height: 70vh;">${escapeHtml(text)}</pre>
            `;
        }

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
                <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate flex-1 mr-4">${escapeHtml(filename)}</h3>
                    <button id="close-preview-btn" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" data-tooltip-target="tooltip-close-preview">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                    <div id="tooltip-close-preview" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                        Close
                        <div class="tooltip-arrow" data-popper-arrow></div>
                    </div>
                </div>
                <div class="flex-1 overflow-hidden p-4">
                    ${previewContent}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Initialize tooltips
        if (typeof window.initFlowbite === 'function') {
            window.initFlowbite();
        }

        // Close handlers
        const closeBtn = document.getElementById('close-preview-btn');
        closeBtn?.addEventListener('click', () => modal.remove());

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

    } catch (error) {
        showToast(`Preview failed: ${error.message}`, 'error');
    }
}

async function handleAttachmentDelete(attachmentId, matterId, container) {
    const confirmed = await showConfirm('Are you sure you want to delete this attachment?', {
        title: 'Delete Attachment',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
    });

    if (!confirmed) return;

    try {
        await api.deleteAttachment(attachmentId);
        showToast('Attachment deleted successfully', 'success');

        // Reload the matter to get updated attachments
        const updatedMatter = await api.getMatter(matterId);
        renderMatterView(container, updatedMatter);
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}
