// Shared Render Helpers
// Common utilities used across all render functions

import { DISPLAY } from '../utils.js';
import { state, STATUS_MESSAGES, getTheme } from '../state.js';

// Update time breakdown calculation
export function updateTimeBreakdown() {
  const now = new Date();
  const lastMatter = new Date(state.lastMatterDate);

  // Handle invalid dates gracefully
  if (!state.lastMatterDate || isNaN(lastMatter.getTime())) {
    state.timeBreakdown = { hours: 0, minutes: 0, seconds: 0, isValid: false };
    return;
  }

  const diffMs = now - lastMatter;
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);

  state.timeBreakdown = {
    hours: totalHours % 24,
    minutes: totalMinutes % 60,
    seconds: totalSeconds % 60,
    isValid: true
  };
}

// Get random status text based on days since last matter
export function getStatusText() {
  let category;
  if (state.daysSince === 0) category = 'ALERT';
  else if (state.daysSince < 7) category = 'WARNING';
  else if (state.daysSince < 30) category = 'MONITOR';
  else category = 'NOMINAL';

  const messages = STATUS_MESSAGES[category];
  return messages[Math.floor(Math.random() * messages.length)];
}

// Format date for display (MM-DD-YYYY)
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).replace(/\//g, '-');
}

// Format date and time for display
export function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

// Format date in long form
export function formatDateLong(dateStr) {
  if (!dateStr || dateStr === 'null') return DISPLAY.DASH;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return DISPLAY.DASH;
  return date.toLocaleString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).toUpperCase();
}

// Render footer component
export function renderFooter(styleClass = '') {
  // Use API environment if set, otherwise auto-detect from hostname
  const getEnvDisplay = () => {
    if (state.environment === 'production') return 'PROD';
    if (state.environment === 'development') return 'DEV';
    // Auto-detect
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'DEV' : 'PROD';
  };

  // Build display: linked if pushed, plain text with "Unpushed" if not
  const getBuildDisplay = () => {
    if (!state.commitHashShort) return 'N/A';
    if (state.commitPushed) {
      return `<a href="https://github.com/patrick-hudson/legal-tracker/commit/${state.commitHash}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">${state.commitHashShort}</a>`;
    }
    return `Unpushed (${state.commitHashShort})`;
  };

  return `
    <footer class="system-footer ${styleClass}">
      <div class="footer-content">
        <span>v${state.version}</span>
        <span class="footer-separator">•</span>
        <span>Build: ${getBuildDisplay()}</span>
        <span class="footer-separator">•</span>
        <span>${getEnvDisplay()}</span>
        <span class="footer-separator">•</span>
        <span>Load: ${state.pageLoadTime}ms</span>
      </div>
    </footer>
  `;
}
