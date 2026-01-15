// Modern Theme Renderer
// Handles MINIMAL 2025 theme

import { DISPLAY } from '../utils.js';
import { THEMES } from '../themes.js';
import { state, getTheme, getThemeKey } from '../state.js';
import { getStatusText, formatDateTime, formatDateLong, renderFooter } from './shared.js';
import { startCursorBlink } from '../handlers.js';

export function renderModern() {
  const app = document.getElementById('app');
  const theme = getTheme();
  const currentThemeKey = getThemeKey();

  app.innerHTML = `
    <div class="modern-page">
      <div class="modern-container">

        <!-- Modern Header -->
        <div class="modern-card">
          <div class="modern-header">
            <div>
              <h1 class="modern-title">LEGAL MATTER v${state.version}</h1>
              <p class="modern-subtitle">
                <span class="letter">L</span>egal
                <span class="letter">E</span>xpense
                <span class="letter">G</span>overnance
                <span class="letter">A</span>llocation
                <span class="letter">L</span>edger
                <span class="letter">M</span>anagement
                <span class="letter">A</span>pplication for
                <span class="letter">T</span>racking
                <span class="letter">T</span>ime,
                <span class="letter">E</span>xpenses,
                <span class="letter">R</span>etainers
              </p>
            </div>
            <div class="modern-header-buttons">
              <button onclick="toggleThemePicker()" class="modern-btn">
                Change Theme
              </button>
              <span class="modern-status ${!state.isAuthorized ? 'modern-status-readonly' : ''}">
                ${state.isAuthorized ? '● AUTHORIZED' : '● READ-ONLY'}
              </span>
            </div>
          </div>
        </div>

        ${state.showThemePicker ? `
          <div class="modern-card">
            <h3 class="modern-theme-title">Select Theme</h3>
            <div class="modern-theme-grid">
              ${Object.entries(THEMES).map(([key, t]) => `
                <button
                  onclick="setTheme('${key}')"
                  class="modern-action-button ${key === currentThemeKey ? 'modern-action-button-accent' : ''}"
                  style="${key === currentThemeKey ? 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: 1px solid #667eea; color: white; font-weight: 600;' : ''}"
                >
                  ${t.name}
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Main Counter Card -->
        <div class="modern-counter-card">
          <div class="modern-status-badge" style="color: ${state.daysSince < 7 ? theme.danger : theme.primaryDim};">
            ${getStatusText()}
          </div>
          <div class="modern-label">
            ${state.labelMessage.replace('&gt;', '').trim()}
          </div>
          <div class="modern-counter">
            ${state.daysSince}
          </div>
          <div data-time-display class="modern-time">
            ${DISPLAY.formatTimeBreakdown(state.timeBreakdown)}
          </div>
          <div class="modern-last-matter">
            Last matter: ${formatDateLong(state.lastMatterDate)}
          </div>
        </div>

        <!-- Money Card -->
        <div class="modern-money-card">
          <div class="modern-money-header">
            <div>
              <div class="modern-money-label">
                Lifetime Legal Fees
              </div>
              <div data-money-display class="modern-money-amount">
                ${DISPLAY.formatCurrency(state.displayedSpent)}
              </div>
              ${state.drainEnabled ? `<div class="modern-money-drain">+$${DISPLAY.formatDrainRate(state.drainRateCents).perSec}/sec (${state.moneyMessage})</div>` : `<div class="money-drain-disabled">Auto-drain disabled</div>`}
            </div>
            <div class="modern-money-buttons">
              <button onclick="toggleDrainSettings()" class="modern-btn-danger">
                ${state.showDrainSettings ? 'Close' : 'Configure Drain'}
              </button>
              <button onclick="toggleMoneySettings()" class="modern-btn-danger">
                ${state.showMoneySettings ? 'Close' : 'Edit Amount'}
              </button>
            </div>
          </div>

          ${state.showDrainSettings ? `
            <div class="modern-panel">
              <h4 class="modern-panel-title">Auto-Drain Configuration</h4>
              <div class="settings-form">
                <div class="form-checkbox-wrapper">
                  <input type="checkbox" id="drainEnabled" ${state.drainEnabled ? 'checked' : ''} class="form-checkbox">
                  <label for="drainEnabled" class="form-checkbox-label">Enable automatic drain</label>
                </div>
                <div>
                  <label class="modern-input-label">Drain rate (cents per second)</label>
                  <input type="number" id="drainRateInput" value="${state.drainRateCents}" min="0" step="1" class="modern-input">
                  <p class="form-hint">Current: $${DISPLAY.formatDrainRate(state.drainRateCents).perSec}/sec = $${DISPLAY.formatDrainRate(state.drainRateCents).perMin}/min = $${DISPLAY.formatDrainRate(state.drainRateCents).perHour}/hour</p>
                </div>
                <button onclick="saveDrainSettings()" class="modern-button-primary">Save Drain Settings</button>
                <p class="settings-note">⚠️ Changing drain settings will reset the accumulation timer</p>
              </div>
            </div>
          ` : ''}

          ${state.showMoneySettings ? `
            <div class="modern-panel">
              <input type="number" id="moneyInput" placeholder="Enter amount" step="0.01" class="modern-input" style="margin-bottom: 1rem;">
              <div class="form-button-group">
                <button onclick="setMoney()" class="modern-button-primary" style="flex: 1; min-width: 120px;">Set Total</button>
                <button onclick="addMoney()" class="modern-button-secondary">Add Amount</button>
                <button onclick="resetMoney()" class="modern-btn" style="padding: 0.75rem 1.5rem;">Reset</button>
              </div>
              <p class="settings-note" style="margin-top: 1rem;">💡 Pro tip: Set this to your actual lifetime legal spend for maximum emotional damage. Or lie to yourself, we won't judge.</p>
            </div>
          ` : ''}
        </div>

        <!-- Stats Grid -->
        <div class="modern-stats-grid">
          <div class="modern-stat-card">
            <div class="modern-stat-label">Record Streak</div>
            <div class="modern-stat-value">${DISPLAY.displayOrDash(state.stats.max_streak, '0')}</div>
          </div>
          <div class="modern-stat-card">
            <div class="modern-stat-label">This Year</div>
            <div class="modern-stat-value modern-stat-value-danger">${state.stats.matters_this_year}</div>
          </div>
          <div class="modern-stat-card">
            <div class="modern-stat-label">All Time</div>
            <div class="modern-stat-value">${state.stats.total_matters}</div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="modern-action-grid">
          <button onclick="toggleDatePicker()" class="modern-action-button">
            ${state.showDatePicker ? 'Cancel' : 'Log Past Matter'}
          </button>
          <button onclick="toggleLog()" class="modern-action-button">
            ${state.showLog ? 'Hide' : 'View'} History (${state.matters.length})
          </button>
          <button onclick="quickLogMatter()" class="modern-action-button-accent">
            Log Matter Today
          </button>
        </div>

        ${state.showDatePicker ? `
          <div class="modern-card">
            <h3 class="modern-theme-title">Log Past Matter</h3>
            <div class="settings-form">
              <div>
                <label class="modern-input-label">Date & Time</label>
                <input type="datetime-local" id="matterDate" max="${new Date().toISOString().slice(0, 16)}" class="modern-input">
              </div>
              <div>
                <label class="modern-input-label">Note (optional)</label>
                <input type="text" id="matterNote" placeholder="e.g., Estate planning attorney" class="modern-input">
              </div>
              <div>
                <label class="modern-input-label">Cost (optional)</label>
                <input type="number" id="matterCost" placeholder="e.g., 5000" step="0.01" class="modern-input">
              </div>
              <button onclick="submitManualMatter()" class="modern-action-button-accent" style="padding: 1rem; margin-top: 0.5rem;">
                Save Matter
              </button>
            </div>
          </div>
        ` : ''}

        ${state.showLog ? `
          <div class="modern-card">
            <h3 class="modern-theme-title">Matter History (${state.matters.length} records)</h3>
            ${state.matters.length === 0 ? `
              <p class="matter-empty" style="font-size: 1.05rem;">No matters recorded. Congratulations, you're winning at life! (For now...)</p>
            ` : `
              <div class="modern-log-list">
                ${state.matters.map((matter) => `
                  <div class="modern-log-item">
                    <div>
                      <div class="modern-log-date">${formatDateTime(matter.matter_date)}</div>
                      <div class="modern-log-note">${matter.note}</div>
                      ${DISPLAY.formatMatterCost(matter.cost) !== null ? `<div class="modern-log-cost">${DISPLAY.formatMatterCost(matter.cost)}</div>` : ''}
                    </div>
                    <button onclick="deleteMatterById(${matter.id})" class="modern-delete-btn">Delete</button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        ` : ''}
      </div>
      ${renderFooter('modern-footer')}
    </div>
  `;

  startCursorBlink();
}
