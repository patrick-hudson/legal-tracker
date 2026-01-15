/**
 * Matter Detail Component
 * Shows individual matter details, private notes, and attachments
 *
 * Split into modules:
 * - shared.js: Constants, utilities, and state
 * - timeline.js: Activity timeline rendering
 * - notes.js: Private notes section
 * - attachments.js: File attachments section
 * - view.js: Main view rendering and edit matter modal
 */

import api from '../../api/index.js';
import { formatErrorMessage } from '../../display-utils.js';
import { renderMatterView } from './view.js';

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

    // Create reload function that can be passed to sub-components
    const reloadMatter = async () => {
        const updatedMatter = await api.getMatter(matterId);
        renderMatterView(container, updatedMatter, reloadMatter);
    };

    try {
        const matter = await api.getMatter(matterId);
        renderMatterView(container, matter, reloadMatter);
    } catch (error) {
        container.innerHTML = `
            <div class="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
                <span class="font-medium">Error!</span> ${formatErrorMessage(error)}
            </div>
            <a href="#/matters" class="text-blue-600 hover:underline">&larr; Back to Matters</a>
        `;
    }
}
