/**
 * Matter Detail - Main View Rendering
 * Renders the matter detail page and handles edit matter modal
 */

import api from '../../api/index.js';
import {
    formatCurrency,
    formatDate,
    escapeHtml as safeEscapeHtml,
    PLACEHOLDER
} from '../../display-utils.js';
import { showConfirm, showCustomModal, escapeHtml } from '../../modal.js';
import {
    currentNotesSort,
    currentNotesSearch,
    showToast
} from './shared.js';
import { renderTimeline } from './timeline.js';
import { renderNotesList, filterAndSortNotes, attachNotesSearchAndSort, attachNoteEventListeners, showAddNoteModal } from './notes.js';
import { renderAttachmentsList, attachAttachmentEventListeners, handleAttachmentUpload } from './attachments.js';

export function renderMatterView(container, matter, reloadMatter) {
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
                    <dd class="text-gray-900 dark:text-white break-words">${safeEscapeHtml(matter.note, 'No note')}</dd>
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
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Private Notes <span id="notes-count" class="text-sm font-normal text-gray-500">(${privateNotes.length})</span></h2>
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
    document.getElementById('edit-matter-btn').addEventListener('click', () => showEditMatterModal(matter, reloadMatter));
    document.getElementById('delete-matter-btn').addEventListener('click', () => handleDeleteMatter(matter.id));
    document.getElementById('add-note-btn').addEventListener('click', () => showAddNoteModal(matter.id, reloadMatter));

    // Attachment upload listener
    document.getElementById('attachment-upload')?.addEventListener('change', (e) => handleAttachmentUpload(e, matter.id, reloadMatter));

    // Setup section collapsibles
    setupCollapsibleSections(privateNotes, attachments);

    // Notes search and sort listeners
    attachNotesSearchAndSort(privateNotes);

    // Add note action listeners
    attachNoteEventListeners(matter.id, container, reloadMatter);

    // Add attachment action listeners
    attachAttachmentEventListeners(matter.id, reloadMatter);
}

function setupCollapsibleSections(privateNotes, attachments) {
    // Timeline section - apply saved state from localStorage
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

        // Re-render timeline with new order - dynamic import to avoid circular dependency
        import('./timeline.js').then(({ renderTimeline }) => {
            document.getElementById('timeline-container').innerHTML = renderTimeline(privateNotes, attachments, newOrder);
        });
    });

    // Attachments section - apply saved state (default expanded)
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

    // Private Notes section - apply saved state (default expanded)
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
}

async function showEditMatterModal(matter, reloadMatter) {
    let capturedFormData = null;

    // Determine modal size based on note length
    const noteLength = (matter.note || '').length;
    const isLongNote = noteLength > 200;
    const modalSize = isLongNote ? 'xl' : 'lg';
    const textareaRows = isLongNote ? 6 : 3;

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
                <div class="flex justify-between items-center mb-2">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Note</label>
                    <span id="note-char-count" class="text-xs text-gray-500 dark:text-gray-400">${noteLength.toLocaleString()} characters</span>
                </div>
                <textarea name="note" rows="${textareaRows}" required
                    class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y min-h-[80px] max-h-[40vh]">${escapeHtml(matter.note || '')}</textarea>
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
        size: modalSize,
        onOpen: (modal) => {
            // Character count for note field
            const noteTextarea = modal.querySelector('[name="note"]');
            const charCount = modal.querySelector('#note-char-count');
            noteTextarea?.addEventListener('input', () => {
                if (charCount) {
                    charCount.textContent = `${noteTextarea.value.length.toLocaleString()} characters`;
                }
            });

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
            await reloadMatter();
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
