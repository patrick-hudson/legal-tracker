/**
 * Matter Detail - Timeline Rendering
 */

import { formatDate } from '../../display-utils.js';
import { escapeHtml } from '../../modal.js';
import {
    INTERACTION_TYPES,
    DIRECTION_LABELS,
    COLOR_CLASSES,
    formatFileSize,
    getDirectionBadge
} from './shared.js';

export function renderTimeline(notes, attachments, order = 'desc') {
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
                                        const colors = COLOR_CLASSES[interactionConfig.color] || COLOR_CLASSES.gray;
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
