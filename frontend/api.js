// API Functions
// All fetch operations for the public frontend

import { DISPLAY } from './utils.js';
import { state } from './state.js';

// Public API for read-only operations (no auth required)
const API_BASE = window.location.origin + '/api';
// Admin API for write operations (requires session cookie from admin login)
const ADMIN_API_BASE = window.location.origin + '/admin/api';

// Re-export for use in other modules
export { API_BASE, ADMIN_API_BASE };

export async function fetchStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    const data = await res.json();

    state.daysSince = DISPLAY.safeNumber(data.days_since) ?? 0;
    state.lastMatterDate = new Date(data.last_matter_date);
    state.lifetimeSpent = DISPLAY.safeNumber(data.lifetime_spent) ?? 0;
    // Use nullish coalescing to handle 0 correctly (|| would skip 0)
    state.displayedSpent = data.total_spent ?? data.lifetime_spent ?? 0;
    state.drainStartTime = new Date(data.drain_start_time);
    state.drainEnabled = data.drain_enabled !== undefined ? data.drain_enabled : true;
    state.drainRateCents = DISPLAY.safeNumber(data.drain_rate_cents_per_second) ?? 50;
    state.stats = data.stats ?? { total_matters: 0, matters_this_year: 0, max_streak: 0 };
    state.currentIP = data.your_ip;

    return data;
  } catch (err) {
    console.error('Failed to fetch status:', err);
  }
}

export async function checkAuthStatus() {
  try {
    const res = await fetch(`${ADMIN_API_BASE}/auth/validate`, {
      credentials: 'same-origin'
    });
    const data = await res.json();
    state.isAuthorized = data.valid === true;
  } catch (err) {
    state.isAuthorized = false;
  }
}

export async function fetchMatters() {
  try {
    const res = await fetch(`${API_BASE}/matters`);
    state.matters = await res.json();
  } catch (err) {
    console.error('Failed to fetch matters:', err);
  }
}

export async function fetchVersion() {
  try {
    const res = await fetch(`${API_BASE}/version`);
    const data = await res.json();
    state.version = data.version || 'unknown';
    state.commitHash = data.commitHash;
    state.commitHashShort = data.commitHashShort;
    state.commitPushed = data.commitPushed;
    state.nodeVersion = data.nodeVersion;
    state.environment = data.environment;
  } catch (err) {
    console.error('Failed to fetch version:', err);
    state.version = 'error';
  }
}

export async function logMatter(matterDate, note, cost, renderCallback) {
  try {
    const res = await fetch(`${ADMIN_API_BASE}/matters`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matter_date: matterDate || new Date().toISOString(),
        note: note || 'No details provided',
        cost: cost || 0
      })
    });

    if (res.status === 401 || res.status === 403) {
      state.authError = true;
      state.isAuthorized = false;
      if (renderCallback) renderCallback();
      setTimeout(() => { state.authError = false; if (renderCallback) renderCallback(); }, 3000);
      return false;
    }

    await fetchStatus();
    await fetchMatters();
    return true;
  } catch (err) {
    console.error('Failed to log matter:', err);
    return false;
  }
}

export async function deleteMatter(id, renderCallback) {
  try {
    const res = await fetch(`${ADMIN_API_BASE}/matters/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });

    if (res.status === 401 || res.status === 403) {
      state.authError = true;
      state.isAuthorized = false;
      if (renderCallback) renderCallback();
      setTimeout(() => { state.authError = false; if (renderCallback) renderCallback(); }, 3000);
      return false;
    }

    await fetchStatus();
    await fetchMatters();
    return true;
  } catch (err) {
    console.error('Failed to delete matter:', err);
    return false;
  }
}

export async function updateDrainSettings(enabled, rateCents, renderCallback) {
  try {
    const res = await fetch(`${ADMIN_API_BASE}/settings/drain`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, rate_cents: rateCents })
    });

    if (res.status === 401 || res.status === 403) {
      state.authError = true;
      state.isAuthorized = false;
      if (renderCallback) renderCallback();
      setTimeout(() => { state.authError = false; if (renderCallback) renderCallback(); }, 3000);
      return false;
    }

    const data = await res.json();
    return data.success;
  } catch (err) {
    console.error('Failed to update drain settings:', err);
    return false;
  }
}

export async function updateLifetimeSpent(amount, add = false, renderCallback) {
  try {
    const res = await fetch(`${ADMIN_API_BASE}/settings/lifetime-spent`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, add })
    });

    if (res.status === 401 || res.status === 403) {
      state.authError = true;
      state.isAuthorized = false;
      if (renderCallback) renderCallback();
      setTimeout(() => { state.authError = false; if (renderCallback) renderCallback(); }, 3000);
      return false;
    }

    const data = await res.json();
    state.lifetimeSpent = data.lifetime_spent;
    state.displayedSpent = data.lifetime_spent;
    return true;
  } catch (err) {
    console.error('Failed to update lifetime spent:', err);
    return false;
  }
}

export async function setLastMatterDate(date, renderCallback) {
  try {
    const res = await fetch(`${ADMIN_API_BASE}/settings/last-matter-date`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date })
    });

    if (res.status === 401 || res.status === 403) {
      state.authError = true;
      state.isAuthorized = false;
      if (renderCallback) renderCallback();
      setTimeout(() => { state.authError = false; if (renderCallback) renderCallback(); }, 3000);
      return false;
    }

    await fetchStatus();
    return true;
  } catch (err) {
    console.error('Failed to set last matter date:', err);
    return false;
  }
}
