/**
 * Data Management - Route Dispatcher
 * Routes to appropriate sub-page based on path
 */

import { renderOverview } from './overview.js';
import { renderAiSettings } from './ai-settings.js';
import { renderBackupStorage } from './backup-storage.js';
import { renderWipeData } from './wipe-data.js';

export async function renderDataManagement(container, subPath = '') {
    switch (subPath) {
        case '/ai':
            return renderAiSettings(container);
        case '/backup':
            return renderBackupStorage(container);
        case '/wipe':
            return renderWipeData(container);
        default:
            return renderOverview(container);
    }
}
