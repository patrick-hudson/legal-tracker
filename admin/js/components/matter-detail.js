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
                ${matter.case_number ? `
                <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Case/Matter Number</dt>
                    <dd class="text-gray-900 dark:text-white">${safeEscapeHtml(matter.case_number)}</dd>
                </div>
                ` : ''}
                <div class="md:col-span-2">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Note</dt>
                    <dd class="text-gray-900 dark:text-white">${safeEscapeHtml(matter.note, 'No note')}</dd>
                </div>
            </dl>

            ${(matter.lawyer_name || matter.lawyer_firm || matter.opposing_counsel_name || matter.opposing_counsel_firm) ? `
            <div class="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${(matter.lawyer_name || matter.lawyer_firm) ? `
                    <div>
                        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Our Counsel</h3>
                        ${matter.lawyer_name ? `<p class="text-gray-900 dark:text-white">${safeEscapeHtml(matter.lawyer_name)}</p>` : ''}
                        ${matter.lawyer_firm ? `<p class="text-gray-600 dark:text-gray-400 text-sm">${safeEscapeHtml(matter.lawyer_firm)}</p>` : ''}
                    </div>
                    ` : ''}
                    ${(matter.opposing_counsel_name || matter.opposing_counsel_firm) ? `
                    <div>
                        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Opposing Counsel</h3>
                        ${matter.opposing_counsel_name ? `<p class="text-gray-900 dark:text-white">${safeEscapeHtml(matter.opposing_counsel_name)}</p>` : ''}
                        ${matter.opposing_counsel_firm ? `<p class="text-gray-600 dark:text-gray-400 text-sm">${safeEscapeHtml(matter.opposing_counsel_firm)}</p>` : ''}
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
        </div>

        <!-- Timeline Section - Collapsible -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
            <button type="button" id="timeline-section-toggle" class="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-lg" aria-expanded="false" aria-controls="timeline-section-content">
                <div class="flex items-center">
                    <svg class="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <div>
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Activity Timeline <span class="text-sm font-normal text-gray-500">(${privateNotes.length + attachments.length})</span></h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Chronological view of notes and attachments</p>
                    </div>
                </div>
                <svg id="timeline-section-chevron" class="w-5 h-5 text-gray-500 dark:text-gray-400 transform rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            <div id="timeline-section-content" class="hidden border-t border-gray-200 dark:border-gray-700">
                <div class="p-4">
                    <div class="flex justify-end mb-4">
                        <button id="toggle-timeline-order" class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300" data-order="desc">
                            <span class="order-label">Newest First</span>
                        </button>
                    </div>
                    <div id="timeline-container">
                        ${renderTimeline(privateNotes, attachments, 'desc')}
                    </div>
                </div>
            </div>
        </div>

        <!-- Attachments Section - Collapsible -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
            <div class="flex items-center justify-between p-4">
                <button type="button" id="attachments-section-toggle" class="flex items-center flex-1 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 -m-2 p-2 rounded-lg transition-colors" aria-expanded="true" aria-controls="attachments-section-content">
                    <svg class="w-6 h-6 mr-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                    </svg>
                    <div class="flex-1">
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Attachments <span class="text-sm font-normal text-gray-500">(${attachments.length})</span></h2>
                        <p class="text-sm text-amber-600 dark:text-amber-400">
                            <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
                            </svg>
                            Admin Only - PDF, DOC, DOCX, RTF, TXT (max 25MB)
                        </p>
                    </div>
                    <svg id="attachments-section-chevron" class="w-5 h-5 text-gray-500 dark:text-gray-400 transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                <label class="ml-4 px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium cursor-pointer flex-shrink-0">
                    Upload File
                    <input type="file" id="attachment-upload" class="hidden" accept=".pdf,.doc,.docx,.rtf,.txt">
                </label>
            </div>
            <div id="attachments-section-content" class="border-t border-gray-200 dark:border-gray-700">
                <div class="p-4">
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
            </div>
        </div>

        <!-- Private Notes Section - Collapsible -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
            <div class="flex items-center justify-between p-4">
                <button type="button" id="notes-section-toggle" class="flex items-center flex-1 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 -m-2 p-2 rounded-lg transition-colors" aria-expanded="true" aria-controls="notes-section-content">
                    <svg class="w-6 h-6 mr-3 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    <div class="flex-1">
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Private Notes <span class="text-sm font-normal text-gray-500">(${privateNotes.length})</span></h2>
                        <p class="text-sm text-amber-600 dark:text-amber-400">
                            <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
                            </svg>
                            Admin Only - These notes are not visible to public users
                        </p>
                    </div>
                    <svg id="notes-section-chevron" class="w-5 h-5 text-gray-500 dark:text-gray-400 transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                <button id="add-note-btn" class="ml-4 px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium flex-shrink-0">
                    Add Note
                </button>
            </div>
            <div id="notes-section-content" class="border-t border-gray-200 dark:border-gray-700">
                <div class="p-4">
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

    // Timeline section collapsible - apply saved state from localStorage
    const timelineExpanded = localStorage.getItem('timelineSectionExpanded') === 'true';
    if (timelineExpanded) {
        const content = document.getElementById('timeline-section-content');
        const chevron = document.getElementById('timeline-section-chevron');
        const toggle = document.getElementById('timeline-section-toggle');
        if (content && chevron && toggle) {
            content.classList.remove('hidden');
            chevron.classList.remove('rotate-180');
            toggle.setAttribute('aria-expanded', 'true');
        }
    }

    // Timeline section toggle listener
    document.getElementById('timeline-section-toggle')?.addEventListener('click', () => {
        const content = document.getElementById('timeline-section-content');
        const chevron = document.getElementById('timeline-section-chevron');
        const toggle = document.getElementById('timeline-section-toggle');

        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            chevron.classList.remove('rotate-180');
            toggle.setAttribute('aria-expanded', 'true');
            localStorage.setItem('timelineSectionExpanded', 'true');
        } else {
            content.classList.add('hidden');
            chevron.classList.add('rotate-180');
            toggle.setAttribute('aria-expanded', 'false');
            localStorage.setItem('timelineSectionExpanded', 'false');
        }
    });

    // Timeline order toggle listener
    document.getElementById('toggle-timeline-order')?.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const currentOrder = btn.dataset.order;
        const newOrder = currentOrder === 'desc' ? 'asc' : 'desc';
        btn.dataset.order = newOrder;
        btn.querySelector('.order-label').textContent = newOrder === 'desc' ? 'Newest First' : 'Oldest First';
        document.getElementById('timeline-container').innerHTML = renderTimeline(privateNotes, attachments, newOrder);
    });

    // Attachments section collapsible - apply saved state (default expanded)
    const attachmentsCollapsed = localStorage.getItem('attachmentsSectionCollapsed') === 'true';
    if (attachmentsCollapsed) {
        const content = document.getElementById('attachments-section-content');
        const chevron = document.getElementById('attachments-section-chevron');
        const toggle = document.getElementById('attachments-section-toggle');
        if (content && chevron && toggle) {
            content.classList.add('hidden');
            chevron.classList.add('rotate-180');
            toggle.setAttribute('aria-expanded', 'false');
        }
    }

    // Attachments section toggle listener
    document.getElementById('attachments-section-toggle')?.addEventListener('click', () => {
        const content = document.getElementById('attachments-section-content');
        const chevron = document.getElementById('attachments-section-chevron');
        const toggle = document.getElementById('attachments-section-toggle');

        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            chevron.classList.remove('rotate-180');
            toggle.setAttribute('aria-expanded', 'true');
            localStorage.setItem('attachmentsSectionCollapsed', 'false');
        } else {
            content.classList.add('hidden');
            chevron.classList.add('rotate-180');
            toggle.setAttribute('aria-expanded', 'false');
            localStorage.setItem('attachmentsSectionCollapsed', 'true');
        }
    });

    // Private Notes section collapsible - apply saved state (default expanded)
    const notesCollapsed = localStorage.getItem('notesSectionCollapsed') === 'true';
    if (notesCollapsed) {
        const content = document.getElementById('notes-section-content');
        const chevron = document.getElementById('notes-section-chevron');
        const toggle = document.getElementById('notes-section-toggle');
        if (content && chevron && toggle) {
            content.classList.add('hidden');
            chevron.classList.add('rotate-180');
            toggle.setAttribute('aria-expanded', 'false');
        }
    }

    // Private Notes section toggle listener
    document.getElementById('notes-section-toggle')?.addEventListener('click', () => {
        const content = document.getElementById('notes-section-content');
        const chevron = document.getElementById('notes-section-chevron');
        const toggle = document.getElementById('notes-section-toggle');

        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            chevron.classList.remove('rotate-180');
            toggle.setAttribute('aria-expanded', 'true');
            localStorage.setItem('notesSectionCollapsed', 'false');
        } else {
            content.classList.add('hidden');
            chevron.classList.add('rotate-180');
            toggle.setAttribute('aria-expanded', 'false');
            localStorage.setItem('notesSectionCollapsed', 'true');
        }
    });

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
            ${notes.map(note => {
                const interactionConfig = INTERACTION_TYPES[note.interaction_type] || INTERACTION_TYPES.note;
                const colorClasses = {
                    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                    green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
                    red: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
                    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
                };
                return `
                <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4" data-note-id="${note.id}" data-interaction-date="${note.interaction_date || ''}" data-interaction-type="${note.interaction_type || 'note'}">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center gap-2">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClasses[interactionConfig.color]}">
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
            const interactionDate = noteDiv.dataset.interactionDate || '';
            const interactionType = noteDiv.dataset.interactionType || 'note';
            await showEditNoteModal(noteId, currentContent, interactionDate, interactionType, matterId, container);
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
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date & Time</label>
                    <input type="datetime-local" name="matter_date" value="${matter.matter_date ? matter.matter_date.slice(0, 16) : ''}" required
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cost ($)</label>
                    <input type="number" step="0.01" name="cost" value="${matter.cost || 0}" required
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                </div>
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note</label>
                <input type="text" name="note" value="${escapeHtml(matter.note || '')}" required
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Case/Matter Number</label>
                <input type="text" name="case_number" value="${escapeHtml(matter.case_number || '')}" placeholder="e.g., 2024-CV-12345"
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            </div>

            <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Our Counsel</h3>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lawyer Name</label>
                        <input type="text" name="lawyer_name" value="${escapeHtml(matter.lawyer_name || '')}" placeholder="e.g., John Smith"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Firm</label>
                        <input type="text" name="lawyer_firm" value="${escapeHtml(matter.lawyer_firm || '')}" placeholder="e.g., Smith & Associates"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                </div>
            </div>

            <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Opposing Counsel</h3>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Counsel Name</label>
                        <input type="text" name="opposing_counsel_name" value="${escapeHtml(matter.opposing_counsel_name || '')}" placeholder="e.g., Jane Doe"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Firm</label>
                        <input type="text" name="opposing_counsel_firm" value="${escapeHtml(matter.opposing_counsel_firm || '')}" placeholder="e.g., Doe Legal Group"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    </div>
                </div>
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
        size: 'lg',
        onOpen: (modal) => {
            // Capture form data before modal closes
            modal.querySelectorAll('.modal-action-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const form = modal.querySelector('#edit-matter-form');
                    if (form) {
                        capturedFormData = {
                            matter_date: form.querySelector('[name="matter_date"]').value,
                            note: form.querySelector('[name="note"]').value,
                            cost: parseFloat(form.querySelector('[name="cost"]').value),
                            case_number: form.querySelector('[name="case_number"]').value || null,
                            lawyer_name: form.querySelector('[name="lawyer_name"]').value || null,
                            lawyer_firm: form.querySelector('[name="lawyer_firm"]').value || null,
                            opposing_counsel_name: form.querySelector('[name="opposing_counsel_name"]').value || null,
                            opposing_counsel_firm: form.querySelector('[name="opposing_counsel_firm"]').value || null
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

            // Reload the matter to get updated notes
            const updatedMatter = await api.getMatter(matterId);
            renderMatterView(container, updatedMatter);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    } else if (result === 'submit' && !capturedValues.note_content) {
        showToast('Note content is required', 'error');
    }
}

async function showEditNoteModal(noteId, currentContent, currentInteractionDate, currentInteractionType, matterId, container) {
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

            // Reload the matter to get updated notes
            const updatedMatter = await api.getMatter(matterId);
            renderMatterView(container, updatedMatter);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    } else if (result === 'submit' && !capturedValues.note_content) {
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

// Interaction type labels and icons
const INTERACTION_TYPES = {
    note: { label: 'Note', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', color: 'gray' },
    phone_call: { label: 'Phone Call', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', color: 'green' },
    email: { label: 'Email', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'blue' },
    meeting: { label: 'Meeting', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'purple' },
    court_appearance: { label: 'Court Appearance', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3', color: 'red' },
    filing: { label: 'Filing', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'amber' },
    letter_sent: { label: 'Letter Sent', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8', color: 'indigo' },
    letter_received: { label: 'Letter Received', icon: 'M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76', color: 'teal' },
    other: { label: 'Other', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'gray' }
};

// Direction labels for attachments
const DIRECTION_LABELS = {
    incoming: { label: 'Incoming', color: 'green', icon: 'M19 14l-7 7m0 0l-7-7m7 7V3' },
    outgoing: { label: 'Outgoing', color: 'blue', icon: 'M5 10l7-7m0 0l7 7m-7-7v18' },
    internal: { label: 'Internal', color: 'gray', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' }
};

function getInteractionIcon(type) {
    const config = INTERACTION_TYPES[type] || INTERACTION_TYPES.other;
    return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${config.icon}"/></svg>`;
}

function getInteractionColor(type) {
    const config = INTERACTION_TYPES[type] || INTERACTION_TYPES.other;
    return config.color;
}

function getDirectionBadge(direction) {
    const config = DIRECTION_LABELS[direction] || DIRECTION_LABELS.internal;
    const colorClasses = {
        green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClasses[config.color]}">
        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${config.icon}"/></svg>
        ${config.label}
    </span>`;
}

function renderTimeline(notes, attachments, order = 'desc') {
    // Build timeline entries
    const timeline = [
        ...notes.map(note => ({
            type: 'note',
            id: note.id,
            date: note.interaction_date || note.created_at,
            interaction_type: note.interaction_type || 'note',
            content: note.note_content,
            created_by: note.created_by_username,
            created_at: note.created_at
        })),
        ...attachments.map(attachment => ({
            type: 'attachment',
            id: attachment.id,
            date: attachment.document_date || attachment.created_at,
            direction: attachment.direction || 'internal',
            filename: attachment.original_filename,
            content_type: attachment.content_type,
            size_bytes: attachment.size_bytes,
            created_by: attachment.created_by_username,
            created_at: attachment.created_at
        }))
    ];

    // Sort by date
    timeline.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return order === 'asc' ? dateA - dateB : dateB - dateA;
    });

    if (timeline.length === 0) {
        return `
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p>No activity recorded yet</p>
            </div>
        `;
    }

    // Group entries by month/year for better visual organization
    const groupedByMonth = {};
    timeline.forEach(entry => {
        const date = new Date(entry.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (!groupedByMonth[monthKey]) {
            groupedByMonth[monthKey] = { label: monthLabel, entries: [] };
        }
        groupedByMonth[monthKey].entries.push(entry);
    });

    // Sort month keys
    const sortedMonths = Object.keys(groupedByMonth).sort((a, b) =>
        order === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
    );

    const colorClasses = {
        gray: { dot: 'bg-gray-400 dark:bg-gray-500', ring: 'ring-gray-100 dark:ring-gray-800', icon: 'text-gray-600 dark:text-gray-300' },
        green: { dot: 'bg-green-500 dark:bg-green-400', ring: 'ring-green-100 dark:ring-green-900', icon: 'text-green-600 dark:text-green-300' },
        blue: { dot: 'bg-blue-500 dark:bg-blue-400', ring: 'ring-blue-100 dark:ring-blue-900', icon: 'text-blue-600 dark:text-blue-300' },
        purple: { dot: 'bg-purple-500 dark:bg-purple-400', ring: 'ring-purple-100 dark:ring-purple-900', icon: 'text-purple-600 dark:text-purple-300' },
        red: { dot: 'bg-red-500 dark:bg-red-400', ring: 'ring-red-100 dark:ring-red-900', icon: 'text-red-600 dark:text-red-300' },
        amber: { dot: 'bg-amber-500 dark:bg-amber-400', ring: 'ring-amber-100 dark:ring-amber-900', icon: 'text-amber-600 dark:text-amber-300' },
        indigo: { dot: 'bg-indigo-500 dark:bg-indigo-400', ring: 'ring-indigo-100 dark:ring-indigo-900', icon: 'text-indigo-600 dark:text-indigo-300' },
        teal: { dot: 'bg-teal-500 dark:bg-teal-400', ring: 'ring-teal-100 dark:ring-teal-900', icon: 'text-teal-600 dark:text-teal-300' }
    };

    return `
        <div class="flow-root">
            <ul role="list" class="-mb-8">
                ${sortedMonths.map((monthKey, monthIdx) => {
                    const group = groupedByMonth[monthKey];
                    return `
                        <li class="mb-6">
                            <div class="flex items-center mb-3">
                                <div class="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400"></div>
                                <span class="ml-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400">${group.label}</span>
                                <div class="ml-3 flex-1 border-t border-gray-200 dark:border-gray-700"></div>
                            </div>
                            <ul role="list" class="ml-4 space-y-4">
                                ${group.entries.map((entry, entryIdx) => {
                                    const isLast = monthIdx === sortedMonths.length - 1 && entryIdx === group.entries.length - 1;

                                    if (entry.type === 'note') {
                                        const interactionConfig = INTERACTION_TYPES[entry.interaction_type] || INTERACTION_TYPES.note;
                                        const colors = colorClasses[interactionConfig.color] || colorClasses.gray;
                                        return `
                                            <li class="relative pb-4 ${isLast ? '' : 'border-l-2 border-gray-200 dark:border-gray-700'} pl-6">
                                                <div class="absolute -left-[9px] top-0 flex h-[18px] w-[18px] items-center justify-center rounded-full ${colors.dot} ring-4 ${colors.ring}">
                                                    <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="${interactionConfig.icon}"/></svg>
                                                </div>
                                                <div class="flex flex-col min-w-0">
                                                    <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                        <span class="font-medium ${colors.icon}">${interactionConfig.label}</span>
                                                        <span>${formatDate(entry.date, { format: 'short', placeholder: 'Unknown' })}</span>
                                                        ${entry.created_by ? `<span>by ${escapeHtml(entry.created_by)}</span>` : ''}
                                                    </div>
                                                    <p class="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">${escapeHtml(entry.content)}</p>
                                                </div>
                                            </li>
                                        `;
                                    } else {
                                        const directionConfig = DIRECTION_LABELS[entry.direction] || DIRECTION_LABELS.internal;
                                        const colors = colorClasses[directionConfig.color] || colorClasses.gray;
                                        return `
                                            <li class="relative pb-4 ${isLast ? '' : 'border-l-2 border-gray-200 dark:border-gray-700'} pl-6">
                                                <div class="absolute -left-[9px] top-0 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gray-400 dark:bg-gray-500 ring-4 ring-gray-100 dark:ring-gray-800">
                                                    <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                                                </div>
                                                <div class="flex flex-col min-w-0">
                                                    <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                        ${getDirectionBadge(entry.direction)}
                                                        <span>${formatDate(entry.date, { format: 'short', placeholder: 'Unknown' })}</span>
                                                        ${entry.created_by ? `<span>by ${escapeHtml(entry.created_by)}</span>` : ''}
                                                    </div>
                                                    <p class="text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(entry.filename)}</p>
                                                    <p class="text-xs text-gray-500 dark:text-gray-400">${formatFileSize(entry.size_bytes)}</p>
                                                </div>
                                            </li>
                                        `;
                                    }
                                }).join('')}
                            </ul>
                        </li>
                    `;
                }).join('')}
            </ul>
        </div>
    `;
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
                        <div class="flex items-center gap-2 mb-1">
                            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${escapeHtml(attachment.original_filename)}</p>
                            ${attachment.direction ? getDirectionBadge(attachment.direction) : ''}
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            ${formatFileSize(attachment.size_bytes)}
                            ${attachment.document_date ? ` &bull; Doc date: ${formatDate(attachment.document_date, { format: 'short', placeholder: '' })}` : ''}
                            &bull; Uploaded ${formatDate(attachment.created_at, { format: 'short', placeholder: 'Unknown' })}
                            ${attachment.created_by_username ? ` by ${escapeHtml(attachment.created_by_username)}` : ''}
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
                        <button class="edit-attachment-btn p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" data-id="${attachment.id}" data-document-date="${attachment.document_date || ''}" data-direction="${attachment.direction || 'internal'}" data-storage-backend="${attachment.storage_backend || 'filesystem'}" data-storage-key="${escapeHtml(attachment.storage_key || '')}" data-tooltip-target="tooltip-edit-${attachment.id}">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <div id="tooltip-edit-${attachment.id}" role="tooltip" class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
                            Edit
                            <div class="tooltip-arrow" data-popper-arrow></div>
                        </div>
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
        const editBtn = e.target.closest('.edit-attachment-btn');
        const downloadBtn = e.target.closest('.download-attachment-btn');
        const deleteBtn = e.target.closest('.delete-attachment-btn');

        if (previewBtn) {
            e.preventDefault();
            e.stopPropagation();
            const attachmentId = previewBtn.dataset.id;
            const filename = previewBtn.dataset.filename;
            const contentType = previewBtn.dataset.contentType;
            await handleAttachmentPreview(attachmentId, filename, contentType);
        } else if (editBtn) {
            e.preventDefault();
            e.stopPropagation();
            const attachmentId = editBtn.dataset.id;
            const documentDate = editBtn.dataset.documentDate || '';
            const direction = editBtn.dataset.direction || 'internal';
            const storageBackend = editBtn.dataset.storageBackend || 'filesystem';
            const storageKey = editBtn.dataset.storageKey || '';
            await handleAttachmentEdit(attachmentId, documentDate, direction, matterId, container, { storageBackend, storageKey });
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

    // Show modal to capture additional metadata
    const today = new Date().toISOString().split('T')[0];
    let capturedValues = { document_date: today, direction: 'internal' };

    const content = `
        <form id="upload-metadata-form">
            <div class="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p class="text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(file.name)}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">${formatFileSize(file.size)}</p>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Document Date</label>
                    <input type="date" name="document_date" value="${today}"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Direction</label>
                    <select name="direction"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="incoming">Incoming (received)</option>
                        <option value="outgoing">Outgoing (sent)</option>
                        <option value="internal" selected>Internal</option>
                    </select>
                </div>
            </div>
        </form>
    `;

    const result = await showCustomModal({
        title: 'Upload Attachment',
        content,
        buttons: [
            { text: 'Cancel', type: 'secondary', value: 'cancel' },
            { text: 'Upload', type: 'primary', value: 'submit' }
        ],
        size: 'md',
        onOpen: (modal) => {
            modal.querySelectorAll('.modal-action-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    capturedValues.document_date = modal.querySelector('[name="document_date"]')?.value || '';
                    capturedValues.direction = modal.querySelector('[name="direction"]')?.value || 'internal';
                }, { capture: true });
            });
        }
    });

    if (result !== 'submit') return;

    const progressDiv = document.getElementById('upload-progress');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressText = document.getElementById('upload-progress-text');

    try {
        // Show progress
        progressDiv?.classList.remove('hidden');
        progressBar.style.width = '10%';
        progressText.textContent = 'Uploading...';

        // Upload the file with metadata
        await api.uploadAttachment(matterId, file, {
            document_date: capturedValues.document_date || null,
            direction: capturedValues.direction
        });

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
        // Use stream=true to bypass S3 redirect (CORS prevents fetch from reading redirected S3 responses)
        const response = await fetch(`/admin/api/attachments/${attachmentId}/download?stream=true`, {
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

async function handleAttachmentEdit(attachmentId, currentDocumentDate, currentDirection, matterId, container, storageInfo = {}) {
    let capturedValues = { document_date: currentDocumentDate, direction: currentDirection };

    // Check if debug mode is enabled
    let isDebugMode = false;
    let debugSection = '';
    try {
        const { settings } = await api.getSettings();
        isDebugMode = settings?.audit_log_level === 'DEBUG';

        if (isDebugMode && storageInfo.storageKey) {
            const isS3 = storageInfo.storageBackend === 's3';
            let storagePath = '';
            let fullUrl = '';

            if (isS3) {
                // For S3, build the full HTTP URL
                const bucket = settings?.s3_bucket || '[bucket]';
                const region = settings?.s3_region || 'us-east-1';
                const endpoint = settings?.s3_endpoint;
                const pathStyle = settings?.s3_path_style;
                storagePath = `s3://${bucket}/${storageInfo.storageKey}`;

                // Build full HTTP URL based on endpoint and path style
                if (endpoint) {
                    // Custom endpoint (MinIO, etc.)
                    const cleanEndpoint = endpoint.replace(/\/$/, '');
                    if (pathStyle) {
                        fullUrl = `${cleanEndpoint}/${bucket}/${storageInfo.storageKey}`;
                    } else {
                        // Virtual-hosted style with custom endpoint
                        const urlParts = new URL(cleanEndpoint);
                        fullUrl = `${urlParts.protocol}//${bucket}.${urlParts.host}/${storageInfo.storageKey}`;
                    }
                } else {
                    // AWS S3
                    fullUrl = `https://${bucket}.s3.${region}.amazonaws.com/${storageInfo.storageKey}`;
                }
            } else {
                // For filesystem, show relative path
                storagePath = `./data/uploads/${storageInfo.storageKey}`;
            }

            debugSection = `
                <div class="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                            DEBUG
                        </span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">Storage Information</span>
                    </div>
                    <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-xs font-mono space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Backend:</span>
                            <span class="text-purple-700 dark:text-purple-300">${isS3 ? 'S3' : 'Filesystem'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Key:</span>
                            <span class="text-purple-700 dark:text-purple-300 break-all text-right max-w-[70%]">${escapeHtml(storageInfo.storageKey)}</span>
                        </div>
                        ${isS3 && fullUrl ? `
                        <div class="pt-2 border-t border-purple-200 dark:border-purple-700">
                            <div class="text-gray-600 dark:text-gray-400 mb-1">Direct URL (requires public bucket):</div>
                            <div class="flex items-center gap-2">
                                <input type="text" readonly value="${escapeHtml(fullUrl)}"
                                    class="direct-url-input flex-1 bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-600 rounded px-2 py-1 text-xs text-purple-700 dark:text-purple-300 select-all"
                                    onclick="this.select()">
                                <button type="button" class="copy-url-btn px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 dark:bg-purple-800 dark:hover:bg-purple-700 text-purple-700 dark:text-purple-300 rounded" title="Copy URL">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="pt-2 border-t border-purple-200 dark:border-purple-700">
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-gray-600 dark:text-gray-400">Presigned URL (1 hour):</span>
                                <button type="button" class="get-presigned-url-btn px-2 py-1 text-xs bg-green-100 hover:bg-green-200 dark:bg-green-800 dark:hover:bg-green-700 text-green-700 dark:text-green-300 rounded flex items-center gap-1" data-attachment-id="${attachmentId}">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                                    </svg>
                                    Generate
                                </button>
                            </div>
                            <div class="presigned-url-container hidden">
                                <div class="flex items-center gap-2">
                                    <input type="text" readonly class="presigned-url-input flex-1 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-600 rounded px-2 py-1 text-xs text-green-700 dark:text-green-300 select-all" onclick="this.select()">
                                    <button type="button" class="copy-presigned-btn px-2 py-1 text-xs bg-green-100 hover:bg-green-200 dark:bg-green-800 dark:hover:bg-green-700 text-green-700 dark:text-green-300 rounded" title="Copy URL">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                        </svg>
                                    </button>
                                    <a href="#" target="_blank" rel="noopener noreferrer" class="open-presigned-btn px-2 py-1 text-xs bg-green-100 hover:bg-green-200 dark:bg-green-800 dark:hover:bg-green-700 text-green-700 dark:text-green-300 rounded" title="Open in new tab">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                                        </svg>
                                    </a>
                                </div>
                                <p class="mt-1 text-[10px] text-green-600 dark:text-green-400 presigned-expiry"></p>
                            </div>
                        </div>
                        ` : `
                        <div class="pt-2 border-t border-purple-200 dark:border-purple-700">
                            <div class="text-gray-600 dark:text-gray-400 mb-1">Path:</div>
                            <code class="block bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-600 rounded px-2 py-1 text-purple-700 dark:text-purple-300 break-all">${escapeHtml(storagePath)}</code>
                        </div>
                        `}
                    </div>
                </div>
            `;
        }
    } catch (e) {
        // Silently ignore settings fetch error
    }

    const content = `
        <form id="edit-attachment-form">
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Document Date</label>
                    <input type="date" name="document_date" value="${currentDocumentDate}"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Direction</label>
                    <select name="direction"
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="incoming" ${currentDirection === 'incoming' ? 'selected' : ''}>Incoming (received)</option>
                        <option value="outgoing" ${currentDirection === 'outgoing' ? 'selected' : ''}>Outgoing (sent)</option>
                        <option value="internal" ${currentDirection === 'internal' ? 'selected' : ''}>Internal</option>
                    </select>
                </div>
            </div>
            ${debugSection}
        </form>
    `;

    const result = await showCustomModal({
        title: 'Edit Attachment',
        content,
        buttons: [
            { text: 'Cancel', type: 'secondary', value: 'cancel' },
            { text: 'Save Changes', type: 'primary', value: 'submit' }
        ],
        size: 'md',
        onOpen: (modal) => {
            modal.querySelectorAll('.modal-action-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    capturedValues.document_date = modal.querySelector('[name="document_date"]')?.value || '';
                    capturedValues.direction = modal.querySelector('[name="direction"]')?.value || 'internal';
                }, { capture: true });
            });

            // Copy URL button handler for S3 debug info
            const copyBtn = modal.querySelector('.copy-url-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', async () => {
                    const urlInput = modal.querySelector('input[readonly]');
                    if (urlInput) {
                        try {
                            await navigator.clipboard.writeText(urlInput.value);
                            // Brief visual feedback
                            copyBtn.innerHTML = `
                                <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                </svg>
                            `;
                            setTimeout(() => {
                                copyBtn.innerHTML = `
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                    </svg>
                                `;
                            }, 1500);
                        } catch (e) {
                            // Fallback: select the text
                            urlInput.select();
                        }
                    }
                });
            }

            // Get Presigned URL button handler
            const presignedBtn = modal.querySelector('.get-presigned-url-btn');
            if (presignedBtn) {
                presignedBtn.addEventListener('click', async () => {
                    const attId = presignedBtn.dataset.attachmentId;
                    const container = modal.querySelector('.presigned-url-container');
                    const input = modal.querySelector('.presigned-url-input');
                    const expiryText = modal.querySelector('.presigned-expiry');
                    const openLink = modal.querySelector('.open-presigned-btn');

                    presignedBtn.disabled = true;
                    presignedBtn.innerHTML = `
                        <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                    `;

                    try {
                        const result = await api.getPresignedUrl(attId, 3600);
                        input.value = result.url;
                        openLink.href = result.url;
                        expiryText.textContent = `Expires in ${Math.floor(result.expiresIn / 60)} minutes`;
                        container.classList.remove('hidden');

                        presignedBtn.innerHTML = `
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                            </svg>
                            Generated
                        `;
                        presignedBtn.classList.remove('bg-green-100', 'hover:bg-green-200', 'dark:bg-green-800', 'dark:hover:bg-green-700');
                        presignedBtn.classList.add('bg-gray-100', 'dark:bg-gray-700', 'text-gray-500', 'dark:text-gray-400');
                    } catch (e) {
                        presignedBtn.innerHTML = `
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                            Failed
                        `;
                        presignedBtn.classList.remove('bg-green-100', 'hover:bg-green-200', 'dark:bg-green-800', 'dark:hover:bg-green-700');
                        presignedBtn.classList.add('bg-red-100', 'dark:bg-red-800', 'text-red-700', 'dark:text-red-300');
                        expiryText.textContent = `Error: ${e.message}`;
                        expiryText.classList.remove('text-green-600', 'dark:text-green-400');
                        expiryText.classList.add('text-red-600', 'dark:text-red-400');
                        container.classList.remove('hidden');
                    }
                });
            }

            // Copy presigned URL button handler
            const copyPresignedBtn = modal.querySelector('.copy-presigned-btn');
            if (copyPresignedBtn) {
                copyPresignedBtn.addEventListener('click', async () => {
                    const input = modal.querySelector('.presigned-url-input');
                    if (input && input.value) {
                        try {
                            await navigator.clipboard.writeText(input.value);
                            copyPresignedBtn.innerHTML = `
                                <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                </svg>
                            `;
                            setTimeout(() => {
                                copyPresignedBtn.innerHTML = `
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                    </svg>
                                `;
                            }, 1500);
                        } catch (e) {
                            input.select();
                        }
                    }
                });
            }
        }
    });

    if (result === 'submit') {
        try {
            await api.updateAttachment(attachmentId, {
                document_date: capturedValues.document_date || null,
                direction: capturedValues.direction
            });
            showToast('Attachment updated successfully', 'success');

            // Reload the matter to get updated attachments
            const updatedMatter = await api.getMatter(matterId);
            renderMatterView(container, updatedMatter);
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    }
}
