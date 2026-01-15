/**
 * Matter Detail - Shared Constants and Utilities
 */

import { formatDate } from '../../display-utils.js';

// Notes state management (shared between modules)
export let currentNotesSort = 'newest';
export let currentNotesSearch = '';

export function setNotesSort(value) {
    currentNotesSort = value;
}

export function setNotesSearch(value) {
    currentNotesSearch = value;
}

// Interaction type labels and icons
export const INTERACTION_TYPES = {
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
export const DIRECTION_LABELS = {
    incoming: { label: 'Incoming', color: 'green', icon: 'M19 14l-7 7m0 0l-7-7m7 7V3' },
    outgoing: { label: 'Outgoing', color: 'blue', icon: 'M5 10l7-7m0 0l7 7m-7-7v18' },
    internal: { label: 'Internal', color: 'gray', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' }
};

// Color classes for badges
export const COLOR_CLASSES = {
    gray: { bg: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', dot: 'bg-gray-400 dark:bg-gray-500', ring: 'ring-gray-100 dark:ring-gray-800', icon: 'text-gray-600 dark:text-gray-300' },
    green: { bg: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', dot: 'bg-green-500 dark:bg-green-400', ring: 'ring-green-100 dark:ring-green-900', icon: 'text-green-600 dark:text-green-300' },
    blue: { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', dot: 'bg-blue-500 dark:bg-blue-400', ring: 'ring-blue-100 dark:ring-blue-900', icon: 'text-blue-600 dark:text-blue-300' },
    purple: { bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', dot: 'bg-purple-500 dark:bg-purple-400', ring: 'ring-purple-100 dark:ring-purple-900', icon: 'text-purple-600 dark:text-purple-300' },
    red: { bg: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', dot: 'bg-red-500 dark:bg-red-400', ring: 'ring-red-100 dark:ring-red-900', icon: 'text-red-600 dark:text-red-300' },
    amber: { bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', dot: 'bg-amber-500 dark:bg-amber-400', ring: 'ring-amber-100 dark:ring-amber-900', icon: 'text-amber-600 dark:text-amber-300' },
    indigo: { bg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300', dot: 'bg-indigo-500 dark:bg-indigo-400', ring: 'ring-indigo-100 dark:ring-indigo-900', icon: 'text-indigo-600 dark:text-indigo-300' },
    teal: { bg: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300', dot: 'bg-teal-500 dark:bg-teal-400', ring: 'ring-teal-100 dark:ring-teal-900', icon: 'text-teal-600 dark:text-teal-300' }
};

// Toast notification
export function showToast(message, type = 'info') {
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

// File size formatting
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get file icon based on content type
export function getFileIcon(contentType) {
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

// Check if file type is previewable
export function isPreviewable(contentType) {
    const previewableTypes = [
        'application/pdf',
        'text/plain',
        'text/rtf',
        'application/rtf'
    ];
    return previewableTypes.includes(contentType);
}

// Get direction badge HTML
export function getDirectionBadge(direction) {
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
