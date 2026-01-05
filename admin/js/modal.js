/**
 * Modal Utility for Admin Panel
 * Provides Promise-based alert, confirm, and prompt dialogs using Flowbite styling
 */

// Modal container element - created once and reused
let modalContainer = null;

/**
 * Initialize the modal container in the DOM
 */
function initModalContainer() {
    if (modalContainer) return;

    modalContainer = document.createElement('div');
    modalContainer.id = 'modal-container';
    document.body.appendChild(modalContainer);
}

/**
 * Generate unique ID for modal elements
 */
function generateId() {
    return 'modal-' + Math.random().toString(36).substring(2, 9);
}

/**
 * Show an alert dialog (replacement for window.alert)
 * @param {string} message - The message to display
 * @param {Object} options - Optional settings
 * @param {string} options.title - Modal title (default: 'Notice')
 * @param {string} options.buttonText - Button text (default: 'OK')
 * @param {string} options.type - 'info' | 'warning' | 'error' | 'success' (default: 'info')
 * @returns {Promise<void>} - Resolves when user closes the modal
 */
export function showAlert(message, options = {}) {
    const {
        title = 'Notice',
        buttonText = 'OK',
        type = 'info'
    } = options;

    initModalContainer();
    const modalId = generateId();

    const iconMap = {
        info: `<svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>`,
        warning: `<svg class="w-6 h-6 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>`,
        error: `<svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`,
        success: `<svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`
    };

    return new Promise((resolve) => {
        const html = `
            <div id="${modalId}" tabindex="-1" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 dark:bg-gray-900/80">
                <div class="relative p-4 w-full max-w-md max-h-full">
                    <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
                        <button type="button" class="modal-close absolute top-3 end-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white">
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 14 14"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/></svg>
                        </button>
                        <div class="p-4 md:p-5 text-center">
                            <div class="mx-auto mb-4 w-12 h-12 flex items-center justify-center">
                                ${iconMap[type] || iconMap.info}
                            </div>
                            <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">${escapeHtml(title)}</h3>
                            <p class="mb-5 text-gray-500 dark:text-gray-400">${escapeHtml(message)}</p>
                            <button type="button" class="modal-ok text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                                ${escapeHtml(buttonText)}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modalContainer.innerHTML = html;
        const modal = document.getElementById(modalId);

        const closeModal = () => {
            modal.remove();
            resolve();
        };

        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.querySelector('.modal-ok').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Focus the OK button
        modal.querySelector('.modal-ok').focus();

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleEscape);
                closeModal();
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

/**
 * Show a confirmation dialog (replacement for window.confirm)
 * @param {string} message - The message to display
 * @param {Object} options - Optional settings
 * @param {string} options.title - Modal title (default: 'Confirm')
 * @param {string} options.confirmText - Confirm button text (default: 'Yes, I\'m sure')
 * @param {string} options.cancelText - Cancel button text (default: 'Cancel')
 * @param {string} options.type - 'info' | 'warning' | 'danger' (default: 'warning')
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
export function showConfirm(message, options = {}) {
    const {
        title = 'Confirm',
        confirmText = "Yes, I'm sure",
        cancelText = 'Cancel',
        type = 'warning'
    } = options;

    initModalContainer();
    const modalId = generateId();

    const iconMap = {
        info: `<svg class="w-12 h-12 text-blue-400 dark:text-blue-200" fill="none" viewBox="0 0 20 20"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>`,
        warning: `<svg class="w-12 h-12 text-amber-400 dark:text-amber-200" fill="none" viewBox="0 0 20 20"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>`,
        danger: `<svg class="w-12 h-12 text-red-400 dark:text-red-200" fill="none" viewBox="0 0 20 20"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>`
    };

    const confirmBtnClass = type === 'danger'
        ? 'text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800'
        : 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800';

    return new Promise((resolve) => {
        const html = `
            <div id="${modalId}" tabindex="-1" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 dark:bg-gray-900/80">
                <div class="relative p-4 w-full max-w-md max-h-full">
                    <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
                        <button type="button" class="modal-close absolute top-3 end-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white">
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 14 14"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/></svg>
                        </button>
                        <div class="p-4 md:p-5 text-center">
                            <div class="mx-auto mb-4">
                                ${iconMap[type] || iconMap.warning}
                            </div>
                            <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">${escapeHtml(title)}</h3>
                            <p class="mb-5 text-gray-500 dark:text-gray-400 whitespace-pre-line">${escapeHtml(message)}</p>
                            <div class="flex justify-center gap-3">
                                <button type="button" class="modal-confirm ${confirmBtnClass} font-medium rounded-lg text-sm px-5 py-2.5">
                                    ${escapeHtml(confirmText)}
                                </button>
                                <button type="button" class="modal-cancel text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600">
                                    ${escapeHtml(cancelText)}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modalContainer.innerHTML = html;
        const modal = document.getElementById(modalId);

        const closeModal = (result) => {
            modal.remove();
            resolve(result);
        };

        modal.querySelector('.modal-close').addEventListener('click', () => closeModal(false));
        modal.querySelector('.modal-cancel').addEventListener('click', () => closeModal(false));
        modal.querySelector('.modal-confirm').addEventListener('click', () => closeModal(true));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(false);
        });

        // Focus the confirm button for easy Enter confirmation
        modal.querySelector('.modal-confirm').focus();

        // Handle keyboard shortcuts
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleKeydown);
                closeModal(false);
            } else if (e.key === 'Enter') {
                document.removeEventListener('keydown', handleKeydown);
                closeModal(true);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    });
}

/**
 * Show a custom modal with arbitrary HTML content
 * @param {Object} options - Modal settings
 * @param {string} options.title - Modal title
 * @param {string} options.content - HTML content for the modal body
 * @param {Array<Object>} options.buttons - Array of button configs { text, type, value, id }
 * @param {string} options.size - 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 * @param {Function} options.onOpen - Callback after modal opens (receives modal element)
 * @returns {Promise<any>} - Resolves with button value when closed
 */
export function showCustomModal(options = {}) {
    const {
        title = 'Modal',
        content = '',
        buttons = [{ text: 'Close', type: 'secondary', value: null }],
        size = 'md',
        onOpen = null
    } = options;

    initModalContainer();
    const modalId = generateId();

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl'
    };

    const buttonClasses = {
        primary: 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800',
        secondary: 'text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600',
        danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800',
        success: 'text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-300 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800'
    };

    const buttonsHtml = buttons.map((btn, index) => {
        const btnClass = buttonClasses[btn.type] || buttonClasses.secondary;
        const btnId = btn.id || `modal-btn-${index}`;
        return `<button type="button" class="modal-action-btn ${btnClass} font-medium rounded-lg text-sm px-5 py-2.5" data-value="${escapeHtml(String(btn.value ?? index))}" id="${btnId}">${escapeHtml(btn.text)}</button>`;
    }).join('\n');

    return new Promise((resolve) => {
        const html = `
            <div id="${modalId}" tabindex="-1" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 dark:bg-gray-900/80">
                <div class="relative p-4 w-full ${sizeClasses[size] || sizeClasses.md} max-h-full">
                    <div class="relative bg-white rounded-lg shadow dark:bg-gray-700">
                        <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${escapeHtml(title)}</h3>
                            <button type="button" class="modal-close text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white">
                                <svg class="w-3 h-3" fill="none" viewBox="0 0 14 14"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/></svg>
                            </button>
                        </div>
                        <div class="p-4 md:p-5 modal-content">
                            ${content}
                        </div>
                        <div class="flex justify-end gap-3 p-4 md:p-5 border-t dark:border-gray-600">
                            ${buttonsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;

        modalContainer.innerHTML = html;
        const modal = document.getElementById(modalId);

        const closeModal = (result) => {
            document.removeEventListener('keydown', handleEscape);
            modal.remove();
            resolve(result);
        };

        // Close button
        modal.querySelector('.modal-close').addEventListener('click', () => closeModal(null));

        // Background click closes
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(null);
        });

        // Action buttons
        modal.querySelectorAll('.modal-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const value = btn.dataset.value;
                // Try to parse as number or boolean
                if (value === 'true') closeModal(true);
                else if (value === 'false') closeModal(false);
                else if (value === 'null') closeModal(null);
                else if (!isNaN(Number(value)) && value !== '') closeModal(Number(value));
                else closeModal(value);
            });
        });

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal(null);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Call onOpen callback if provided
        if (typeof onOpen === 'function') {
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => onOpen(modal), 0);
        }
    });
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
