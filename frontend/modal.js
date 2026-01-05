/**
 * Modal Utility for Frontend
 * Provides Promise-based alert and confirm dialogs using vanilla CSS
 * that adapts to the current theme (CRT, Modern, Retro)
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
 * Detect current theme from body classes
 * @returns {'crt' | 'modern' | 'retro'}
 */
function detectTheme() {
    const body = document.body;
    if (body.classList.contains('modern-page')) return 'modern';
    if (body.classList.contains('retro-page')) return 'retro';
    return 'crt';
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get modal styles based on current theme
 */
function getModalStyles(theme) {
    const baseOverlay = `
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 1rem;
    `;

    const styles = {
        crt: {
            overlay: `${baseOverlay} background: rgba(0, 0, 0, 0.85);`,
            box: `
                background: var(--background, #1a1408);
                border: 2px solid var(--primary, #ffb000);
                padding: 2rem;
                max-width: 400px;
                width: 100%;
                text-align: center;
                box-shadow: 0 0 30px var(--primary-glow, rgba(255, 176, 0, 0.3));
            `,
            title: `
                color: var(--primary, #ffb000);
                font-size: 1.4rem;
                margin: 0 0 1rem 0;
                text-shadow: 0 0 10px var(--primary-glow, rgba(255, 176, 0, 0.8));
                font-family: 'Courier New', monospace;
            `,
            message: `
                color: var(--primary-dim, #ffcc66);
                font-size: 1.1rem;
                margin: 0 0 1.5rem 0;
                line-height: 1.5;
                font-family: 'Courier New', monospace;
                white-space: pre-line;
            `,
            buttonPrimary: `
                padding: 0.6rem 1.5rem;
                background: transparent;
                border: 1px solid var(--primary, #ffb000);
                color: var(--primary, #ffb000);
                font-size: 1.1rem;
                cursor: pointer;
                font-family: 'Courier New', monospace;
                text-shadow: 0 0 8px var(--primary-glow, rgba(255, 176, 0, 0.8));
                margin: 0 0.5rem;
            `,
            buttonSecondary: `
                padding: 0.6rem 1.5rem;
                background: transparent;
                border: 1px solid var(--primary-dim, #ffcc66);
                color: var(--primary-dim, #ffcc66);
                font-size: 1.1rem;
                cursor: pointer;
                font-family: 'Courier New', monospace;
                margin: 0 0.5rem;
            `,
            buttonDanger: `
                padding: 0.6rem 1.5rem;
                background: transparent;
                border: 1px solid var(--danger, #ff6b6b);
                color: var(--danger, #ff6b6b);
                font-size: 1.1rem;
                cursor: pointer;
                font-family: 'Courier New', monospace;
                text-shadow: 0 0 8px var(--danger, #ff6b6b);
                margin: 0 0.5rem;
            `
        },
        modern: {
            overlay: `${baseOverlay} background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px);`,
            box: `
                background: var(--card-bg, rgba(24, 24, 24, 0.95));
                border-radius: var(--border-radius, 12px);
                padding: 2rem;
                max-width: 400px;
                width: 100%;
                text-align: center;
                box-shadow: var(--shadow, 0 8px 32px rgba(0, 0, 0, 0.4));
                border: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
            `,
            title: `
                color: var(--primary, #ffb000);
                font-size: 1.4rem;
                margin: 0 0 1rem 0;
                font-weight: 600;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            `,
            message: `
                color: var(--primary-dim, #999);
                font-size: 1.05rem;
                margin: 0 0 1.5rem 0;
                line-height: 1.5;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                white-space: pre-line;
            `,
            buttonPrimary: `
                padding: 0.7rem 1.5rem;
                background: var(--primary, #ffb000);
                border: none;
                color: #000;
                font-size: 1rem;
                cursor: pointer;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                font-weight: 500;
                border-radius: 8px;
                margin: 0 0.5rem;
            `,
            buttonSecondary: `
                padding: 0.7rem 1.5rem;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.15);
                color: var(--primary-dim, #999);
                font-size: 1rem;
                cursor: pointer;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                font-weight: 500;
                border-radius: 8px;
                margin: 0 0.5rem;
            `,
            buttonDanger: `
                padding: 0.7rem 1.5rem;
                background: var(--danger, #ff6b6b);
                border: none;
                color: #fff;
                font-size: 1rem;
                cursor: pointer;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                font-weight: 500;
                border-radius: 8px;
                margin: 0 0.5rem;
            `
        },
        retro: {
            overlay: `${baseOverlay} background: rgba(0, 0, 0, 0.6);`,
            box: `
                background: #ffffcc;
                border: 6px ridge blue;
                padding: 1.5rem;
                max-width: 400px;
                width: 100%;
                text-align: center;
                box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.3);
            `,
            title: `
                color: #ff0000;
                font-size: 1.5rem;
                margin: 0 0 1rem 0;
                font-weight: bold;
                text-shadow: 2px 2px #ffff00;
                font-family: 'Comic Sans MS', 'Chalkboard SE', cursive;
            `,
            message: `
                color: #000080;
                font-size: 1.1rem;
                margin: 0 0 1.5rem 0;
                line-height: 1.5;
                font-family: 'Comic Sans MS', 'Chalkboard SE', cursive;
                font-weight: bold;
                white-space: pre-line;
            `,
            buttonPrimary: `
                padding: 0.7rem 1.5rem;
                background: lime;
                border: 4px outset gray;
                color: #000;
                font-size: 1.1rem;
                cursor: pointer;
                font-family: 'Comic Sans MS', 'Chalkboard SE', cursive;
                font-weight: bold;
                margin: 0 0.5rem;
            `,
            buttonSecondary: `
                padding: 0.7rem 1.5rem;
                background: #cccccc;
                border: 4px outset gray;
                color: #000;
                font-size: 1.1rem;
                cursor: pointer;
                font-family: 'Comic Sans MS', 'Chalkboard SE', cursive;
                font-weight: bold;
                margin: 0 0.5rem;
            `,
            buttonDanger: `
                padding: 0.7rem 1.5rem;
                background: #ff0000;
                border: 4px outset gray;
                color: #ffff00;
                font-size: 1.1rem;
                cursor: pointer;
                font-family: 'Comic Sans MS', 'Chalkboard SE', cursive;
                font-weight: bold;
                text-shadow: 1px 1px #000;
                margin: 0 0.5rem;
            `
        }
    };

    return styles[theme] || styles.crt;
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
    const theme = detectTheme();
    const styles = getModalStyles(theme);

    // Use danger styling for error type
    const buttonStyle = type === 'error' ? styles.buttonDanger : styles.buttonPrimary;

    return new Promise((resolve) => {
        const html = `
            <div id="${modalId}" style="${styles.overlay}">
                <div style="${styles.box}">
                    <h3 style="${styles.title}">${escapeHtml(title)}</h3>
                    <p style="${styles.message}">${escapeHtml(message)}</p>
                    <div>
                        <button type="button" class="modal-ok" style="${buttonStyle}">${escapeHtml(buttonText)}</button>
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
 * @param {string} options.confirmText - Confirm button text (default: 'Yes')
 * @param {string} options.cancelText - Cancel button text (default: 'Cancel')
 * @param {string} options.type - 'info' | 'warning' | 'danger' (default: 'warning')
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
export function showConfirm(message, options = {}) {
    const {
        title = 'Confirm',
        confirmText = 'Yes',
        cancelText = 'Cancel',
        type = 'warning'
    } = options;

    initModalContainer();
    const modalId = generateId();
    const theme = detectTheme();
    const styles = getModalStyles(theme);

    // Use danger styling for danger type confirmations
    const confirmButtonStyle = type === 'danger' ? styles.buttonDanger : styles.buttonPrimary;

    return new Promise((resolve) => {
        const html = `
            <div id="${modalId}" style="${styles.overlay}">
                <div style="${styles.box}">
                    <h3 style="${styles.title}">${escapeHtml(title)}</h3>
                    <p style="${styles.message}">${escapeHtml(message)}</p>
                    <div>
                        <button type="button" class="modal-confirm" style="${confirmButtonStyle}">${escapeHtml(confirmText)}</button>
                        <button type="button" class="modal-cancel" style="${styles.buttonSecondary}">${escapeHtml(cancelText)}</button>
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

        modal.querySelector('.modal-confirm').addEventListener('click', () => closeModal(true));
        modal.querySelector('.modal-cancel').addEventListener('click', () => closeModal(false));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(false);
        });

        // Focus the cancel button (safer default)
        modal.querySelector('.modal-cancel').focus();

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleEscape);
                closeModal(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}
