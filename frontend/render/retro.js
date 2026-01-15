// Retro Theme Renderer
// Handles GEOCITIES 1996 theme

import { DISPLAY } from '../utils.js';
import { THEMES } from '../themes.js';
import { state, getTheme, getThemeKey, RETRO_MESSAGES } from '../state.js';
import { formatDateTime, formatDateLong, renderFooter } from './shared.js';
import { startCursorBlink } from '../handlers.js';

export function renderRetro() {
  const app = document.getElementById('app');
  const theme = getTheme();
  const currentThemeKey = getThemeKey();

  const retroHeader = RETRO_MESSAGES.header[Math.floor(Math.random() * RETRO_MESSAGES.header.length)];
  const retroFooter = RETRO_MESSAGES.footer[Math.floor(Math.random() * RETRO_MESSAGES.footer.length)];
  const retroStatus = state.daysSince < 7 ? 'NOT!' : RETRO_MESSAGES.status[Math.floor(Math.random() * RETRO_MESSAGES.status.length)];

  app.innerHTML = `
    <div class="retro-page" style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect width=%2250%22 height=%2250%22 fill=%22%23d3d3d3%22/%3E%3Crect x=%2250%22 y=%2250%22 width=%2250%22 height=%2250%22 fill=%22%23d3d3d3%22/%3E%3C/svg%3E');">
      <div class="retro-container">

        <!-- Header -->
        <div class="retro-header">
          <div class="retro-header-content">
            <h1 class="retro-title">
              ⚖️ LEGAL MATTER v${state.version} ⚖️
            </h1>
            <p class="retro-subtitle">
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
            <p class="retro-tagline">
              ${retroHeader}
            </p>
          </div>

          <div class="retro-header-controls">
            <div class="retro-badges">
              <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='88' height='31'><rect width='88' height='31' fill='%23ff0000'/><text x='44' y='20' font-family='Arial' font-size='14' fill='white' text-anchor='middle' font-weight='bold'>NEW!</text></svg>" class="retro-badge-new" />
              <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='88' height='31'><rect width='88' height='31' fill='%2300ff00'/><text x='44' y='20' font-family='Arial' font-size='12' fill='black' text-anchor='middle' font-weight='bold'>ATTORNEY</text><text x='44' y='28' font-family='Arial' font-size='8' fill='black' text-anchor='middle'>FREE</text></svg>" class="retro-badge-new" />
            </div>

            <div class="retro-header-buttons">
              <span class="retro-status ${!state.isAuthorized ? 'retro-status-readonly' : ''}">
                ${state.isAuthorized ? '✅ ADMIN' : '👁️ READ ONLY'}
              </span>
              <button onclick="toggleThemePicker()" class="retro-btn">
                🎨 ${state.showThemePicker ? 'CLOSE' : 'THEMES'}
              </button>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="retro-content">

          <!-- Theme Picker -->
          ${state.showThemePicker ? `
            <div class="retro-theme-picker">
              <h3 class="retro-theme-title">☆ CHOOSE YOUR THEME! ☆</h3>
              <div class="retro-theme-grid">
                ${Object.entries(THEMES).map(([key, t]) => `
                  <button onclick="setTheme('${key}')" class="retro-btn" style="
                    padding: 1rem;
                    background: ${key === currentThemeKey ? 'linear-gradient(135deg, #ff00ff 0%, #00ffff 100%)' : 'white'};
                    border: 4px ${key === currentThemeKey ? 'inset' : 'outset'} gray;
                    text-align: center;
                    color: ${key === currentThemeKey ? 'yellow' : 'black'};
                    text-shadow: ${key === currentThemeKey ? '1px 1px black' : 'none'};
                  ">
                    ${t.name}
                    ${key === currentThemeKey ? '<br>⭐ ACTIVE ⭐' : ''}
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Status Banner -->
          <div class="retro-status-banner">
            <p class="retro-status-text">
              ${retroStatus}
            </p>
          </div>

          <!-- Main Counter -->
          <div class="retro-counter-box">
            <p class="retro-counter-label">
              ✨ DAYS WITHOUT CALLING 1-800-LAWYERS ✨
            </p>
            <div class="retro-counter-display">
              <p class="retro-counter-value">
                ${state.daysSince}
              </p>
              <p data-time-display class="retro-time">
                ${DISPLAY.formatTimeBreakdown(state.timeBreakdown)}
              </p>
            </div>
            <p class="retro-last-matter">
              Last Matter: ${formatDateLong(state.lastMatterDate)}
            </p>
          </div>

          <!-- Money Counter -->
          <div class="retro-money-box">
            <div class="retro-money-content">
              <p class="retro-money-title">
                💸 CA-CHING! YOUR LEGAL BILL$ 💸
              </p>
              <p data-money-display class="retro-money-value">
                ${DISPLAY.formatCurrency(state.displayedSpent)}
              </p>
              ${state.drainEnabled ? `<p class="retro-money-drain">+$${DISPLAY.formatDrainRate(state.drainRateCents).perSec}/sec (the meter never stops!)</p>` : ''}
              <button onclick="toggleMoneySettings()" class="retro-money-button">
                ${state.showMoneySettings ? '✖ CLOSE' : '✎ EDIT TOTAL'}
              </button>
            </div>

            ${state.showMoneySettings ? `
              <div class="retro-settings-box">
                <input type="number" id="moneyInput" placeholder="Enter amount" step="0.01" class="retro-input">
                <div class="retro-button-group">
                  <button onclick="setMoney()" class="retro-btn-lime">SET IT!</button>
                  <button onclick="addMoney()" class="retro-btn-aqua">ADD MORE</button>
                  <button onclick="resetMoney()" class="retro-btn-orange">RESET</button>
                </div>
                <p class="retro-tip">💡 TIP: Enter your real total for maximum guilt trip!</p>
              </div>
            ` : ''}
          </div>

          <!-- Stats -->
          <div class="retro-stats-grid">
            <div class="retro-stat-card retro-stat-card-cyan">
              <p class="retro-stat-label" style="color: ${theme.primary};">★ RECORD STREAK ★</p>
              <p class="retro-stat-value" style="color: ${theme.danger};">${DISPLAY.displayOrDash(state.stats.max_streak, '0')}</p>
            </div>
            <div class="retro-stat-card retro-stat-card-magenta">
              <p class="retro-stat-label" style="color: white;">★ THIS YEAR ★</p>
              <p class="retro-stat-value" style="color: yellow; text-shadow: ${theme.textShadow};">${state.stats.matters_this_year}</p>
            </div>
            <div class="retro-stat-card retro-stat-card-yellow">
              <p class="retro-stat-label" style="color: ${theme.primary};">★ ALL TIME ★</p>
              <p class="retro-stat-value" style="color: ${theme.danger};">${state.stats.total_matters}</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="retro-action-grid">
            <button onclick="toggleDatePicker()" class="retro-action-btn ${state.showDatePicker ? 'retro-action-btn-orange' : 'retro-action-btn-lime'}">
              ${state.showDatePicker ? '✖ CANCEL' : '📅 LOG PAST'}
            </button>
            <button onclick="toggleLog()" class="retro-action-btn ${state.showLog ? 'retro-action-btn-orange' : 'retro-action-btn-aqua'}">
              ${state.showLog ? '✖ HIDE' : '📜 VIEW'} LOG (${state.matters.length})
            </button>
            <button onclick="quickLogMatter()" class="retro-action-btn retro-action-btn-red">
              🚨 LOG NOW!
            </button>
          </div>

          ${state.showDatePicker ? `
            <div class="retro-form-box">
              <h3 class="retro-form-title">📝 LOG A PAST MATTER</h3>
              <div class="retro-form-group">
                <div>
                  <label class="retro-form-label">Date & Time:</label>
                  <input type="datetime-local" id="matterDate" max="${new Date().toISOString().slice(0, 16)}" class="retro-form-input">
                </div>
                <div>
                  <label class="retro-form-label">Note:</label>
                  <input type="text" id="matterNote" placeholder="What happened..." class="retro-form-input">
                </div>
                <div>
                  <label class="retro-form-label">Cost ($):</label>
                  <input type="number" id="matterCost" placeholder="How much..." step="0.01" class="retro-form-input">
                </div>
                <button onclick="submitManualMatter()" class="retro-submit-btn">
                  ✔️ SAVE IT!
                </button>
              </div>
            </div>
          ` : ''}

          ${state.showLog ? `
            <div class="retro-log-box">
              <h3 class="retro-log-title">📜 MATTER LOG (${state.matters.length} Total)</h3>
              ${state.matters.length === 0 ? `
                <p class="retro-log-empty">🎉 NO MATTERS! YOU'RE WINNING! 🎉</p>
              ` : `
                <div class="retro-log-list">
                  ${state.matters.map((matter) => `
                    <div class="retro-log-item">
                      <div class="retro-log-info">
                        <div class="retro-log-date">${formatDateTime(matter.matter_date)}</div>
                        <div class="retro-log-note">${matter.note}</div>
                        ${DISPLAY.formatMatterCost(matter.cost) !== null ? `<div class="retro-log-cost">Cost: ${DISPLAY.formatMatterCost(matter.cost)}</div>` : ''}
                      </div>
                      <button onclick="deleteMatterById(${matter.id})" class="retro-delete-btn">DELETE</button>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div class="retro-footer">
          <p class="retro-footer-text">
            ${retroFooter}
          </p>
          <p class="retro-footer-copyright">
            © 1996-∞ • Made with &lt;blink&gt; and &lt;marquee&gt; • ${state.isAuthorized ? '✅ ADMIN' : '👁️ READ ONLY'}
          </p>
        </div>
      </div>
      ${renderFooter('retro-sys-footer')}
    </div>
  `;

  startCursorBlink();
}
