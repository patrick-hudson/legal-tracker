// CRT Theme Renderer
// Handles 8 CRT themes: AMBER, NUCLEAR, MAINFRAME, VAPOR, DEFCON, PAPER, CYBERPUNK, HAZMAT

import { DISPLAY } from '../utils.js';
import { THEMES } from '../themes.js';
import { state, getTheme, getThemeKey } from '../state.js';
import { getStatusText, formatDateTime, formatDateLong, renderFooter } from './shared.js';
import { startCursorBlink } from '../handlers.js';

export function renderCRT() {
  const app = document.getElementById('app');
  const theme = getTheme();
  const currentThemeKey = getThemeKey();

  const statusColor = state.daysSince < 7 ? theme.danger : theme.primary;
  const statusGlow = state.daysSince < 7 ? theme.danger : theme.primaryGlow;

  app.innerHTML = `
    ${state.authError ? `
      <div class="auth-error-overlay">
        <div class="auth-error-box">
          <p class="auth-error-title">⛔ ACCESS DENIED ⛔</p>
          <p class="auth-error-message">UNAUTHORIZED IP ADDRESS</p>
          <p class="auth-error-ip">Your IP: ${state.currentIP || 'UNKNOWN'}</p>
        </div>
      </div>
    ` : ''}

    <div class="container">

      <!-- Header -->
      <div class="header">
        <div class="header-box">
          <div class="title">
            LEGAL MATTER v${state.version}
          </div>
          <div class="subtitle">
            <span class="letter">L</span>egal
            <span class="letter">E</span>xpense
            <span class="letter">G</span>overnance
            <span class="letter">A</span>llocation
            <span class="letter">L</span>edger<br>
            <span class="letter">M</span>anagement
            <span class="letter">A</span>pplication for
            <span class="letter">T</span>racking
            <span class="letter">T</span>ime,
            <span class="letter">E</span>xpenses,
            <span class="letter">R</span>etainers
          </div>
          <div class="theme-name">
            ${theme.name}
          </div>
        </div>
        <div class="header-controls">
          <span class="session-message">
            ${state.sessionMessage}
          </span>
          <div class="header-buttons">
            <button onclick="toggleThemePicker()" class="btn btn-primary">
              THEME
            </button>
            <span class="status-indicator ${state.isAuthorized ? 'status-authorized' : 'status-readonly'}">
              ${state.isAuthorized ? '● AUTHORIZED' : '● READ-ONLY MODE'}
            </span>
          </div>
        </div>
      </div>

      <!-- Theme Picker -->
      ${state.showThemePicker ? `
        <div class="theme-picker">
          <p class="theme-picker-title">&gt; SELECT DISPLAY THEME:</p>
          <div class="theme-grid">
            ${Object.entries(THEMES).map(([key, t]) => `
              <button
                onclick="setTheme('${key}')"
                class="theme-button"
                style="
                  background: ${key === currentThemeKey ? t.primary + '22' : 'rgba(0,0,0,0.3)'};
                  border: 2px solid ${key === currentThemeKey ? t.primary : t.primaryDim};
                "
              >
                <div class="theme-colors">
                  <div class="theme-color-dot" style="background: ${t.primary}; box-shadow: 0 0 8px ${t.primaryGlow};"></div>
                  <div class="theme-color-dot" style="background: ${t.danger};"></div>
                </div>
                <p class="theme-button-name" style="color: ${t.primary}; text-shadow: 0 0 8px ${t.primaryGlow};">${t.name}</p>
                <p class="theme-button-status" style="color: ${t.primaryDim};">${key === currentThemeKey ? '● ACTIVE' : ''}</p>
              </button>
            `).join('')}
          </div>
          <p class="theme-note">
            Theme preference is saved to your browser.
          </p>
        </div>
      ` : ''}

      <!-- Status Line -->
      <div class="status-line" style="background: ${theme.primary}11;">
        <span class="status-label">STATUS:</span>
        <span class="${state.daysSince < 7 ? 'blink' : ''} status-value" style="color: ${statusColor}; text-shadow: 0 0 15px ${statusGlow};">
          [${getStatusText()}]
        </span>
      </div>

      <!-- Main Display -->
      <div class="main-display" style="box-shadow: 0 0 30px ${theme.primary}22, inset 0 0 60px rgba(0,0,0,0.5);">
        <p class="display-label">
          ${state.labelMessage}
        </p>
        <div class="counter-wrapper">
          <span class="counter-main" style="text-shadow: 0 0 40px ${theme.primaryGlow}, 0 0 80px ${theme.primary}77, 0 0 100px ${theme.primary}44;">
            ${String(state.daysSince).padStart(2, '0')}
          </span>
        </div>
        <p data-time-display class="time-display">
          ${DISPLAY.formatTimeBreakdown(state.timeBreakdown)}
        </p>
        <p class="last-matter">
          LAST MATTER: ${formatDateLong(state.lastMatterDate)}
        </p>
      </div>

      <!-- Money Counter -->
      <div class="money-counter">
        <div class="money-info">
          <p class="money-label">LIFETIME_LEGAL_FEES:</p>
          <p data-money-display class="money-amount">
            ${DISPLAY.formatCurrency(state.displayedSpent)}
          </p>
          ${state.drainEnabled ? `<p class="money-drain-info">+$${DISPLAY.formatDrainRate(state.drainRateCents).perSec}/sec (${state.moneyMessage})</p>` : ''}
        </div>
        <button onclick="toggleMoneySettings()" class="btn btn-danger">
          ${state.showMoneySettings ? 'CLOSE' : 'EDIT'}
        </button>
      </div>

      <!-- Money Settings Panel -->
      ${state.showMoneySettings ? `
        <div class="settings-panel">
          <p class="settings-title">&gt; FINANCIAL DAMAGE CONFIGURATION:</p>
          <div class="settings-form">
            <div>
              <label class="form-label">ENTER AMOUNT ($):</label>
              <input type="number" id="moneyInput" placeholder="e.g., 15000" step="0.01" class="form-input">
            </div>
            <div class="form-buttons">
              <button onclick="setMoney()" class="btn btn-danger" style="flex: 1; min-width: 120px; padding: 0.75rem 1rem; font-size: 1rem;">SET_TOTAL</button>
              <button onclick="addMoney()" class="btn btn-danger" style="flex: 1; min-width: 120px; padding: 0.75rem 1rem; font-size: 1rem;">ADD_TO_TOTAL</button>
              <button onclick="resetMoney()" class="btn btn-primary" style="padding: 0.75rem 1rem; font-size: 1rem;">RESET</button>
            </div>
            <p class="settings-note">💡 PRO TIP: Set this to your actual lifetime legal spend for maximum emotional damage. Or lie to yourself, we won't judge.</p>
          </div>
        </div>
      ` : ''}

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <p class="stat-label">RECORD_MAX</p>
          <p class="stat-value" style="text-shadow: 0 0 15px ${theme.primaryGlow}, 0 0 30px ${theme.primary}44;">${DISPLAY.displayOrDash(state.stats.max_streak, '0')}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">COUNT_YTD</p>
          <p class="stat-value stat-value-danger" style="text-shadow: 0 0 15px ${theme.danger}, 0 0 30px ${theme.danger}77;">${String(state.stats.matters_this_year).padStart(2, '0')}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">LIFETIME</p>
          <p class="stat-value" style="text-shadow: 0 0 12px ${theme.primaryGlow}, 0 0 25px ${theme.primary}44;">${String(state.stats.total_matters).padStart(2, '0')}</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button onclick="toggleDatePicker()" class="action-button">
          &gt; ${state.showDatePicker ? 'CANCEL' : 'SET_DATE_MANUAL'}
        </button>
        <button onclick="toggleLog()" class="action-button">
          &gt; ${state.showLog ? 'HIDE_LOG' : 'VIEW_LOG'} (${state.matters.length})
        </button>
        <button onclick="quickLogMatter()" class="action-button action-button-primary">
          &gt; LOG_MATTER_NOW
        </button>
      </div>

      <!-- Date Picker Panel -->
      ${state.showDatePicker ? `
        <div class="theme-picker">
          <p class="theme-picker-title">&gt; MANUAL MATTER ENTRY:</p>
          <div class="settings-form">
            <div>
              <label class="form-label">MATTER_DATE_TIME:</label>
              <input type="datetime-local" id="matterDate" max="${new Date().toISOString().slice(0, 16)}" class="form-input">
            </div>
            <div>
              <label class="form-label">NOTE (optional):</label>
              <input type="text" id="matterNote" placeholder="e.g., Estate planning attorney" class="form-input">
            </div>
            <div>
              <label class="form-label">COST ($, optional):</label>
              <input type="number" id="matterCost" placeholder="e.g., 5000" step="0.01" class="form-input">
            </div>
            <button onclick="submitManualMatter()" class="btn btn-primary" style="padding: 0.75rem 1.5rem; font-size: 1.05rem;">
              &gt; CONFIRM_ENTRY
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Matter Log -->
      ${state.showLog ? `
        <div class="matter-log">
          <p class="matter-log-title">&gt; MATTER LOG (${state.matters.length} records):</p>
          ${state.matters.length === 0 ? `
            <p class="matter-empty">No matters recorded. Congratulations, you're winning at life! (For now...)</p>
          ` : `
            <div class="matter-list">
              ${state.matters.map((matter, idx) => `
                <div class="matter-item">
                  <div class="matter-info">
                    <p class="matter-date">
                      [${String(state.matters.length - idx).padStart(3, '0')}] ${formatDateTime(matter.matter_date)}
                    </p>
                    <p class="matter-note">${matter.note}</p>
                    ${matter.days_since !== undefined ? `<p class="matter-streak">Streak broken: ${matter.days_since} days</p>` : ''}
                    ${DISPLAY.formatMatterCost(matter.cost) !== null ? `<p class="matter-cost">Cost: ${DISPLAY.formatMatterCost(matter.cost)}</p>` : ''}
                  </div>
                  <button onclick="deleteMatterById(${matter.id})" class="matter-delete-btn">DEL</button>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      ` : ''}

      <!-- Terminal Prompt -->
      <div class="terminal-prompt">
        <span class="terminal-user">user@legal-tracker:~$</span> status --watch<span id="cursor" class="terminal-cursor">▋</span>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p class="footer-text">YOUR_IP: ${state.currentIP || 'DETECTING...'} • STATUS: ${state.isAuthorized ? 'READ/WRITE' : 'READ_ONLY'}</p>
      </div>

      ${renderFooter('crt-footer')}
    </div>
  `;

  // Start cursor blink
  startCursorBlink();
}
