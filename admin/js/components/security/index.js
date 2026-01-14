/**
 * Security - Route Dispatcher
 * Routes to appropriate sub-page based on path
 */

import { renderOverview } from './overview.js';
import { renderApiKeys } from './api-keys.js';
import { renderAccount } from './account.js';

export async function renderSecurity(container, subPath = '') {
    switch (subPath) {
        case '/api-keys':
            return renderApiKeys(container);
        case '/account':
            return renderAccount(container);
        default:
            return renderOverview(container);
    }
}
