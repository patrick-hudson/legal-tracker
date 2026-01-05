/**
 * Display Utilities Module
 * Centralized formatting and safe display helpers for consistent UI rendering
 *
 * This module provides safe formatting functions that handle null, undefined,
 * NaN, and invalid values gracefully, returning user-friendly placeholders.
 */

// Placeholder constants for consistent display across the UI
export const PLACEHOLDER = {
    DASH: '—',           // em dash for missing values
    NOT_SET: 'Not set',
    NO_DATA: 'No data yet',
    UNKNOWN: 'Unknown',
    ERROR: 'Error',
    LOADING: 'Loading...'
};

/**
 * Check if a value is a finite number (not null, undefined, NaN, or Infinity)
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isFiniteNumber(value) {
    if (value === null || value === undefined || value === '') return false;
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num);
}

/**
 * Convert a value to a number, returning null if invalid
 * @param {*} value - Value to convert
 * @returns {number|null}
 */
export function safeNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
}

/**
 * Format a value as currency
 * @param {*} value - Value in dollars (or cents if fromCents=true)
 * @param {Object} options - Formatting options
 * @param {boolean} options.fromCents - If true, value is in cents and will be divided by 100
 * @param {string} options.placeholder - Placeholder for invalid values (default: PLACEHOLDER.DASH)
 * @param {boolean} options.showZero - If false, returns placeholder for $0 (default: true)
 * @returns {string}
 */
export function formatCurrency(value, options = {}) {
    const {
        fromCents = false,
        placeholder = PLACEHOLDER.DASH,
        showZero = true
    } = options;

    const num = safeNumber(value);

    if (num === null) {
        return placeholder;
    }

    const dollars = fromCents ? num / 100 : num;

    if (!showZero && dollars === 0) {
        return placeholder;
    }

    return '$' + dollars.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Format an integer value
 * @param {*} value - Value to format
 * @param {Object} options - Formatting options
 * @param {string} options.placeholder - Placeholder for invalid values
 * @param {number} options.padStart - Pad with leading zeros to this length
 * @returns {string}
 */
export function formatInt(value, options = {}) {
    const { placeholder = PLACEHOLDER.DASH, padStart = 0 } = options;

    const num = safeNumber(value);

    if (num === null) {
        return placeholder;
    }

    const intVal = Math.floor(num);
    const str = String(intVal);

    return padStart > 0 ? str.padStart(padStart, '0') : str;
}

/**
 * Format a percentage from numerator and denominator
 * Handles divide-by-zero and invalid values safely
 * @param {*} numerator
 * @param {*} denominator
 * @param {Object} options - Formatting options
 * @param {string} options.placeholder - Placeholder for invalid values
 * @param {number} options.decimals - Number of decimal places (default: 1)
 * @returns {string}
 */
export function formatPercent(numerator, denominator, options = {}) {
    const { placeholder = PLACEHOLDER.DASH, decimals = 1 } = options;

    const num = safeNumber(numerator);
    const denom = safeNumber(denominator);

    if (num === null || denom === null || denom === 0) {
        return placeholder;
    }

    const percent = (num / denom) * 100;

    if (!Number.isFinite(percent)) {
        return placeholder;
    }

    return percent.toFixed(decimals) + '%';
}

/**
 * Format a date value
 * @param {*} value - Date string, Date object, or timestamp
 * @param {Object} options - Formatting options
 * @param {string} options.placeholder - Placeholder for invalid values
 * @param {string} options.format - 'short', 'medium', 'long', or 'datetime' (default: 'medium')
 * @returns {string}
 */
export function formatDate(value, options = {}) {
    const { placeholder = PLACEHOLDER.DASH, format = 'medium' } = options;

    if (value === null || value === undefined || value === '' || value === 'null') {
        return placeholder;
    }

    const date = value instanceof Date ? value : new Date(value);

    if (isNaN(date.getTime())) {
        return placeholder;
    }

    const formatOptions = {
        short: { year: 'numeric', month: '2-digit', day: '2-digit' },
        medium: { year: 'numeric', month: 'short', day: 'numeric' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
        datetime: {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }
    };

    try {
        return date.toLocaleString('en-US', formatOptions[format] || formatOptions.medium);
    } catch (e) {
        console.warn('Date formatting error:', e);
        return placeholder;
    }
}

/**
 * Format a duration in seconds to human-readable format
 * @param {*} seconds - Duration in seconds
 * @param {Object} options - Formatting options
 * @param {string} options.placeholder - Placeholder for invalid values
 * @param {string} options.format - 'short' (1h 30m), 'long' (1 hour, 30 minutes), or 'clock' (01:30:00)
 * @returns {string}
 */
export function formatDuration(seconds, options = {}) {
    const { placeholder = PLACEHOLDER.DASH, format = 'short' } = options;

    const num = safeNumber(seconds);

    if (num === null || num < 0) {
        return placeholder;
    }

    const hours = Math.floor(num / 3600);
    const minutes = Math.floor((num % 3600) / 60);
    const secs = Math.floor(num % 60);

    if (format === 'clock') {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    if (format === 'long') {
        const parts = [];
        if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
        if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
        return parts.join(', ');
    }

    // short format
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
}

/**
 * Display a value or return a placeholder if the value is null/undefined/empty
 * @param {*} value - Value to display
 * @param {string} placeholder - Placeholder for empty values (default: PLACEHOLDER.DASH)
 * @returns {string}
 */
export function displayOrDash(value, placeholder = PLACEHOLDER.DASH) {
    if (value === null || value === undefined || value === '' || value === 'null') {
        return placeholder;
    }
    return String(value);
}

/**
 * Display a value or return a custom placeholder based on context
 * @param {*} value - Value to display
 * @param {string} context - Context hint: 'setting', 'data', 'error'
 * @returns {string}
 */
export function displayOrPlaceholder(value, context = 'data') {
    if (value === null || value === undefined || value === '' || value === 'null') {
        switch (context) {
            case 'setting':
                return PLACEHOLDER.NOT_SET;
            case 'error':
                return PLACEHOLDER.ERROR;
            case 'loading':
                return PLACEHOLDER.LOADING;
            default:
                return PLACEHOLDER.DASH;
        }
    }
    return String(value);
}

/**
 * Safely escape HTML to prevent XSS
 * @param {*} value - Value to escape
 * @param {string} placeholder - Placeholder for empty values
 * @returns {string}
 */
export function escapeHtml(value, placeholder = '') {
    if (value === null || value === undefined || value === '') {
        return placeholder;
    }

    const str = String(value);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Format a drain rate preview (cents per second to dollars per hour/day)
 * @param {*} centsPerSecond - Drain rate in cents per second
 * @returns {{ perHour: string, perDay: string, isValid: boolean }}
 */
export function formatDrainPreview(centsPerSecond) {
    const num = safeNumber(centsPerSecond);

    if (num === null || num < 0) {
        return {
            perHour: PLACEHOLDER.DASH,
            perDay: PLACEHOLDER.DASH,
            isValid: false
        };
    }

    const dollarsPerSecond = num / 100;
    return {
        perHour: (dollarsPerSecond * 3600).toFixed(2),
        perDay: (dollarsPerSecond * 86400).toFixed(2),
        isValid: true
    };
}

/**
 * Create a safe error message for display
 * Sanitizes the message to prevent XSS while preserving useful info
 * @param {Error|string} error - Error object or message
 * @param {string} fallback - Fallback message if error is empty
 * @returns {string}
 */
export function formatErrorMessage(error, fallback = 'An unknown error occurred') {
    if (!error) {
        return escapeHtml(fallback);
    }

    const message = error instanceof Error ? error.message : String(error);
    return escapeHtml(message) || escapeHtml(fallback);
}

/**
 * Render an error banner HTML string (safe from XSS)
 * @param {Error|string} error - Error object or message
 * @param {string} prefix - Prefix before the error message
 * @returns {string}
 */
export function renderErrorBanner(error, prefix = 'Error!') {
    const safeMessage = formatErrorMessage(error);
    const safePrefix = escapeHtml(prefix);

    return `
        <div class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
            <span class="font-medium">${safePrefix}</span> ${safeMessage}
        </div>
    `;
}

/**
 * Render an empty state HTML string
 * @param {string} message - Message to display
 * @param {string} icon - Optional icon (emoji or HTML)
 * @returns {string}
 */
export function renderEmptyState(message, icon = '') {
    const safeMessage = escapeHtml(message);
    return `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
            ${icon ? `<div class="text-4xl mb-2">${icon}</div>` : ''}
            <p>${safeMessage}</p>
        </div>
    `;
}

/**
 * Render a table cell with safe value
 * @param {*} value - Value to display
 * @param {Object} options - Options
 * @param {string} options.type - 'text', 'currency', 'date', 'number'
 * @param {string} options.placeholder - Placeholder for empty values
 * @param {boolean} options.fromCents - For currency, if value is in cents
 * @returns {string}
 */
export function renderTableCell(value, options = {}) {
    const { type = 'text', placeholder = PLACEHOLDER.DASH, fromCents = false } = options;

    switch (type) {
        case 'currency':
            return formatCurrency(value, { fromCents, placeholder });
        case 'date':
            return formatDate(value, { placeholder, format: 'datetime' });
        case 'number':
            return formatInt(value, { placeholder });
        default:
            return escapeHtml(value, placeholder);
    }
}
