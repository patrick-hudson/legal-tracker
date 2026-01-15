// Event Handlers
// UI event handlers and user interactions

import { DISPLAY } from './utils.js';
import { THEMES } from './themes.js';
import { state, setThemeState, getTheme } from './state.js';
import {
  fetchStatus,
  logMatter,
  deleteMatter,
  updateDrainSettings,
  updateLifetimeSpent
} from './api.js';
import { showAlert, showConfirm } from './modal.js';

// Render callback - set by app.js during initialization
let renderCallback = null;
export function setRenderCallback(callback) {
  renderCallback = callback;
}

// Intervals for drain and cursor
let drainInterval = null;
let cursorInterval = null;

export function startCursorBlink() {
  if (cursorInterval) clearInterval(cursorInterval);
  cursorInterval = setInterval(() => {
    const cursor = document.getElementById('cursor');
    if (cursor) {
      cursor.style.opacity = cursor.style.opacity === '0' ? '1' : '0';
    }
  }, 530);
}

export function startDrain() {
  if (drainInterval) clearInterval(drainInterval);
  drainInterval = setInterval(() => {
    if (!state.drainEnabled) {
      state.displayedSpent = state.lifetimeSpent;
    } else {
      // Calculate total spent based on server's drain_start_time
      const now = new Date();
      const secondsElapsed = Math.floor((now - state.drainStartTime) / 1000);
      const drainRateDollars = state.drainRateCents / 100;
      const accumulatedDrain = secondsElapsed * drainRateDollars;
      state.displayedSpent = state.lifetimeSpent + accumulatedDrain;
    }

    const moneyDisplay = document.querySelector('[data-money-display]');
    if (moneyDisplay) {
      moneyDisplay.textContent = DISPLAY.formatCurrency(state.displayedSpent);
    }
  }, 1000);
}

export function toggleDatePicker() {
  state.showDatePicker = !state.showDatePicker;
  if (renderCallback) renderCallback();
}

export function toggleLog() {
  state.showLog = !state.showLog;
  if (renderCallback) renderCallback();
}

export function toggleMoneySettings() {
  state.showMoneySettings = !state.showMoneySettings;
  if (renderCallback) renderCallback();
}

export function toggleDrainSettings() {
  state.showDrainSettings = !state.showDrainSettings;
  if (renderCallback) renderCallback();
}

export async function saveDrainSettings() {
  const enabled = document.getElementById('drainEnabled')?.checked;
  const rateValue = document.getElementById('drainRateInput')?.value;
  const rateCents = DISPLAY.safeNumber(rateValue);

  if (rateCents === null || rateCents < 0) {
    await showAlert('Please enter a valid drain rate (0 or greater)', {
      title: 'Invalid Input',
      type: 'error'
    });
    return;
  }

  const success = await updateDrainSettings(enabled, rateCents, renderCallback);
  if (success) {
    await fetchStatus(); // Refresh to get new settings
    state.showDrainSettings = false;
    if (renderCallback) renderCallback();
  }
}

export function toggleThemePicker() {
  state.showThemePicker = !state.showThemePicker;
  if (renderCallback) renderCallback();
}

export function setTheme(themeKey) {
  if (THEMES[themeKey]) {
    setThemeState(themeKey);
    applyTheme();
    state.showThemePicker = false;
    if (renderCallback) renderCallback();
  }
}

export function applyTheme() {
  const theme = getTheme();
  document.documentElement.style.setProperty('--bg-color', theme.background);
  document.documentElement.style.setProperty('--primary', theme.primary);
  document.documentElement.style.setProperty('--primary-dim', theme.primaryDim);
  document.body.style.background = theme.background;
}

export async function quickLogMatter() {
  await logMatter(null, 'Quick log - no details provided', 0, renderCallback);
  if (renderCallback) renderCallback();
}

export async function submitManualMatter() {
  const dateInput = document.getElementById('matterDate');
  const noteInput = document.getElementById('matterNote');
  const costInput = document.getElementById('matterCost');

  if (!dateInput.value) {
    await showAlert('Please select a date', {
      title: 'Missing Date',
      type: 'warning'
    });
    return;
  }

  await logMatter(
    dateInput.value,
    noteInput.value || 'Manual entry',
    DISPLAY.safeNumber(costInput.value) ?? 0,
    renderCallback
  );

  state.showDatePicker = false;
  if (renderCallback) renderCallback();
}

export async function deleteMatterById(id) {
  const confirmed = await showConfirm('Delete this matter? This cannot be undone.', {
    title: 'Delete Matter',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'danger'
  });

  if (confirmed) {
    await deleteMatter(id, renderCallback);
    if (renderCallback) renderCallback();
  }
}

export async function setMoney() {
  const input = document.getElementById('moneyInput');
  const amount = DISPLAY.safeNumber(input?.value);
  if (amount !== null) {
    await updateLifetimeSpent(amount, false, renderCallback);
    await fetchStatus(); // Refresh to get new drain_start_time
    state.showMoneySettings = false;
    if (renderCallback) renderCallback();
  }
}

export async function addMoney() {
  const input = document.getElementById('moneyInput');
  const amount = DISPLAY.safeNumber(input?.value);
  if (amount !== null) {
    await updateLifetimeSpent(amount, true, renderCallback);
    await fetchStatus(); // Refresh to get new drain_start_time
    if (renderCallback) renderCallback();
  }
}

export async function resetMoney() {
  const confirmed = await showConfirm('Reset lifetime spent to $0? This cannot be undone.', {
    title: 'Reset Lifetime Spent',
    confirmText: 'Reset to $0',
    cancelText: 'Cancel',
    type: 'danger'
  });

  if (confirmed) {
    await updateLifetimeSpent(0, false, renderCallback);
    await fetchStatus(); // Refresh to get new drain_start_time
    if (renderCallback) renderCallback();
  }
}

// Export all handlers for window binding
export function bindHandlersToWindow() {
  window.toggleThemePicker = toggleThemePicker;
  window.setTheme = setTheme;
  window.toggleDatePicker = toggleDatePicker;
  window.toggleLog = toggleLog;
  window.toggleMoneySettings = toggleMoneySettings;
  window.toggleDrainSettings = toggleDrainSettings;
  window.saveDrainSettings = saveDrainSettings;
  window.quickLogMatter = quickLogMatter;
  window.submitManualMatter = submitManualMatter;
  window.deleteMatterById = deleteMatterById;
  window.setMoney = setMoney;
  window.addMoney = addMoney;
  window.resetMoney = resetMoney;
}
