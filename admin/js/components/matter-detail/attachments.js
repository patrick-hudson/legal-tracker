/**
 * Matter Detail - Attachments Section
 * Rendering and CRUD operations for file attachments
 */

import api from '../../api/index.js';
import { formatDate } from '../../display-utils.js';
import { showConfirm, showCustomModal, escapeHtml } from '../../modal.js';
import {
    formatFileSize,
    getFileIcon,
    isPreviewable,
    getDirectionBadge,
    showToast
} from './shared.js';

export function renderAttachmentsList(attachments) {
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

export function attachAttachmentEventListeners(matterId, reloadMatter) {
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
            await handleAttachmentEdit(attachmentId, documentDate, direction, matterId, reloadMatter, { storageBackend, storageKey });
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
            await handleAttachmentDelete(attachmentId, matterId, reloadMatter);
        }
    });

    // Initialize Flowbite tooltips for dynamically created content
    if (typeof window.initFlowbite === 'function') {
        window.initFlowbite();
    }
}

export async function handleAttachmentUpload(e, matterId, reloadMatter) {
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
        await reloadMatter();

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

async function handleAttachmentDelete(attachmentId, matterId, reloadMatter) {
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
        await reloadMatter();
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function handleAttachmentEdit(attachmentId, currentDocumentDate, currentDirection, matterId, reloadMatter, storageInfo = {}) {
    let capturedValues = { document_date: currentDocumentDate, direction: currentDirection };

    // Check if debug mode is enabled
    let isDebugMode = false;
    let debugSection = '';
    try {
        const { settings } = await api.getSettings();
        isDebugMode = settings?.audit_log_level === 'DEBUG';

        if (isDebugMode && storageInfo.storageKey) {
            const isS3 = storageInfo.storageBackend === 's3';
            let fullUrl = '';

            if (isS3) {
                // For S3, build the full HTTP URL
                const bucket = settings?.s3_bucket || '[bucket]';
                const region = settings?.s3_region || 'us-east-1';
                const endpoint = settings?.s3_endpoint;
                const pathStyle = settings?.s3_path_style;

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
            }

            debugSection = buildDebugSection(isS3, storageInfo, fullUrl, attachmentId);
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

            setupDebugHandlers(modal, attachmentId);
        }
    });

    if (result === 'submit') {
        try {
            await api.updateAttachment(attachmentId, {
                document_date: capturedValues.document_date || null,
                direction: capturedValues.direction
            });
            showToast('Attachment updated successfully', 'success');
            await reloadMatter();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        }
    }
}

function buildDebugSection(isS3, storageInfo, fullUrl, attachmentId) {
    const storagePath = isS3 ? `s3://[bucket]/${storageInfo.storageKey}` : `./data/uploads/${storageInfo.storageKey}`;

    return `
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

function setupDebugHandlers(modal, attachmentId) {
    // Copy URL button handler for S3 debug info
    const copyBtn = modal.querySelector('.copy-url-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const urlInput = modal.querySelector('.direct-url-input');
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
