// Legal Matter Tracker - Frontend
// Vanilla JS for maximum compatibility and zero build step

const API_BASE = window.location.origin + '/api';

// Color Themes - 8 options!
const THEMES = {
  amber: {
    name: 'AMBER CRT',
    primary: '#ffb000',
    primaryDim: '#ffcc66',
    primaryGlow: 'rgba(255,176,0,0.8)',
    background: '#1a1408',
    danger: '#ff6b6b',
    dangerDim: '#ff9999',
    dangerBg: 'rgba(139,0,0,0.15)',
    success: '#33ff33'
  },
  green: {
    name: 'NUCLEAR',
    primary: '#39ff14',
    primaryDim: '#6bff4d',
    primaryGlow: 'rgba(57,255,20,0.8)',
    background: '#0a0f0a',
    danger: '#ff3333',
    dangerDim: '#ff8888',
    dangerBg: 'rgba(139,0,0,0.15)',
    success: '#39ff14'
  },
  blue: {
    name: 'MAINFRAME',
    primary: '#00d4ff',
    primaryDim: '#5ae4ff',
    primaryGlow: 'rgba(0,212,255,0.8)',
    background: '#080d12',
    danger: '#ff6b6b',
    dangerDim: '#ff9999',
    dangerBg: 'rgba(139,0,0,0.15)',
    success: '#00ff88'
  },
  pink: {
    name: 'VAPOR',
    primary: '#ff71ce',
    primaryDim: '#ff9ddb',
    primaryGlow: 'rgba(255,113,206,0.8)',
    background: '#1a0a14',
    danger: '#ff6b6b',
    dangerDim: '#ff9999',
    dangerBg: 'rgba(139,0,0,0.15)',
    success: '#00ffcc'
  },
  red: {
    name: 'DEFCON',
    primary: '#ff3333',
    primaryDim: '#ff8888',
    primaryGlow: 'rgba(255,51,51,0.8)',
    background: '#140808',
    danger: '#ffcc00',
    dangerDim: '#ffe066',
    dangerBg: 'rgba(139,100,0,0.15)',
    success: '#33ff33'
  },
  white: {
    name: 'PAPER',
    primary: '#333333',
    primaryDim: '#666666',
    primaryGlow: 'rgba(0,0,0,0.4)',
    background: '#f5f5f0',
    danger: '#cc0000',
    dangerDim: '#990000',
    dangerBg: 'rgba(200,0,0,0.08)',
    success: '#008800'
  },
  purple: {
    name: 'CYBERPUNK',
    primary: '#bf00ff',
    primaryDim: '#d966ff',
    primaryGlow: 'rgba(191,0,255,0.8)',
    background: '#0f0a14',
    danger: '#ff0066',
    dangerDim: '#ff5599',
    dangerBg: 'rgba(139,0,50,0.15)',
    success: '#00ffaa'
  },
  orange: {
    name: 'HAZMAT',
    primary: '#ff6600',
    primaryDim: '#ff9944',
    primaryGlow: 'rgba(255,102,0,0.8)',
    background: '#141008',
    danger: '#ff3333',
    dangerDim: '#ff8888',
    dangerBg: 'rgba(139,0,0,0.15)',
    success: '#33ff33'
  },
  modern: {
    name: 'MINIMAL 2025',
    primary: '#e8e8e8',
    primaryDim: '#8a8a8a',
    primaryGlow: 'rgba(0,0,0,0)',
    background: '#0d0d0d',
    danger: '#ff6b6b',
    dangerDim: '#ff8787',
    dangerBg: 'rgba(255,107,107,0.08)',
    success: '#51cf66',
    // Modern-specific properties
    cardBg: 'rgba(24,24,24,0.8)',
    cardBorder: 'rgba(255,255,255,0.06)',
    shadow: '0 8px 32px rgba(0,0,0,0.4)',
    borderRadius: '12px',
    accentGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    accentSolid: '#667eea',
    isModern: true
  },
  retro: {
    name: 'GEOCITIES 1996',
    primary: '#0000ff',
    primaryDim: '#0066cc',
    primaryGlow: 'rgba(255,255,0,0.5)',
    background: '#c0c0c0',
    danger: '#ff0000',
    dangerDim: '#ff6600',
    dangerBg: 'rgba(255,255,0,0.3)',
    success: '#00ff00',
    // Retro-specific properties
    accent1: '#ff00ff',
    accent2: '#00ffff',
    textShadow: '2px 2px #000000',
    borderStyle: 'ridge',
    isRetro: true
  }
};

// ============ CONFIGURATION ============
// Set your default theme here: 'amber', 'green', 'blue', 'pink', 'red', 'white', 'purple', 'orange', 'modern'
const DEFAULT_THEME = 'amber';
// =======================================

// Load saved theme or use default
let currentThemeKey = localStorage.getItem('legal-tracker-theme') || DEFAULT_THEME;
let theme = THEMES[currentThemeKey] || THEMES[DEFAULT_THEME];

// Funny sarcastic session messages
const SESSION_MESSAGES = [
  'TERMINAL: /dev/billable-hours • SESSION: EXPENSIVE',
  'TERMINAL: /dev/null/wallet • SESSION: RETAINER-ACTIVE',
  'TERMINAL: /usr/bin/broke • SESSION: LITIGIOUS',
  'TERMINAL: /opt/out/money • SESSION: DISCOVERY-PHASE',
  'TERMINAL: /home/less • SESSION: MOTION-PENDING',
  'TERMINAL: /var/empty/bank • SESSION: DEPOSITIONS-R-US',
  'TERMINAL: /etc/poverty • SESSION: LEGAL-EAGLE',
  'TERMINAL: /dev/bankruptcy • SESSION: OBJECTION',
  'TERMINAL: /proc/wallet/empty • SESSION: SUSTAINED',
  'TERMINAL: /tmp/savings • SESSION: CASE-CLOSED-WALLET',
  'TERMINAL: /bin/cash/gone • SESSION: ATTORNEY-FEES',
  'TERMINAL: /dev/zero/dollars • SESSION: COUNSEL-REQUIRED',
  'TERMINAL: /mnt/debt • SESSION: HEARSAY-EXPENSIVE',
  'TERMINAL: /sys/tem/broke • SESSION: LEGAL-COUNSEL',
  'TERMINAL: /root/of/evil • SESSION: BILLABLE-HOURS',
  'TERMINAL: /lost/wages • SESSION: MOTION-GRANTED',
  'TERMINAL: /dev/oid/bank • SESSION: JURY-DUTY-PAY',
  'TERMINAL: /usr/share/poverty • SESSION: PRECEDENT',
  'TERMINAL: /var/log/expenses • SESSION: BRIEF-EXPENSIVE',
  'TERMINAL: /etc/legal/fees • SESSION: SUBPOENA',
];

// Self-deprecating status messages
const STATUS_MESSAGES = {
  ALERT: ['ALERT', 'OH NO', 'AGAIN?!', 'REALLY?', 'NOT AGAIN', 'YIKES'],
  WARNING: ['WARNING', 'TOO SOON', 'CAREFUL', 'DANGER ZONE', 'UH OH'],
  MONITOR: ['MONITOR', 'FRAGILE', 'HOLDING ON', 'BARELY SAFE'],
  NOMINAL: ['NOMINAL', 'LAWYER-FREE', 'WINNING', 'SAFE...ISH', 'FREE (FOR NOW)']
};

// Sarcastic money messages
const MONEY_MESSAGES = [
  'it never really stops',
  'your financial regret, quantified',
  'the meter is always running',
  'could have been a boat',
  'that law degree paid for itself',
  'justice isn\'t free (obviously)',
  'the American dream, itemized',
  'probably should have settled',
  'your kids\' college fund, redirected',
  'at least someone\'s kids are going to college'
];

// Main label variations
const LABEL_MESSAGES = [
  '&gt; DAYS SINCE LAST LEGAL REPRESENTATION AGREEMENT:',
  '&gt; DAYS SINCE LAST FINANCIALLY RUINOUS DECISION:',
  '&gt; TIME ELAPSED SINCE PREVIOUS LEGAL CATASTROPHE:',
  '&gt; STREAK WITHOUT HIRING SOMEONE SMARTER THAN YOU:',
  '&gt; DAYS OF FREEDOM FROM ESQUIRE TYRANNY:',
  '&gt; YOUR LAWYER-FREE WINNING STREAK:'
];

// 90s Retro Messages
const RETRO_MESSAGES = {
  header: [
    '~*~UNDER CONSTRUCTION~*~ Since 1996',
    '☆.·:*¨¨*:·. LEGAL TRACKER .·:*¨¨*:·.☆',
    '<<< You are visitor #0000001 >>>',
    '✿◕ ‿ ◕✿ ATTORNEY FREE ZONE ✿◕ ‿ ◕✿',
    '░░▒▒▓▓ LAWYER COUNTER 2000 ▓▓▒▒░░'
  ],
  footer: [
    'Best viewed in Netscape Navigator 4.0',
    'Optimized for 800x600 resolution',
    'This page is JAVA-FREE (unlike your legal bills)',
    'Proud member of the Attorney-Free WebRing',
    'Email the webmaster: totally_not_broke@geocities.com'
  ],
  status: [
    '>>> SURF\'S UP! <<<',
    '~~ AS IF! ~~',
    '** BOOYAH! **',
    'TALK TO THE HAND',
    '¡¡ ALL THAT !!',
    'WHATEVER',
    'NOT!'
  ]
};

// State
let state = {
  daysSince: 0,
  lastMatterDate: new Date(),
  lifetimeSpent: 0,
  displayedSpent: 0,
  drainStartTime: new Date(),
  drainEnabled: true,
  drainRateCents: 50,
  matters: [],
  stats: { total_matters: 0, matters_this_year: 0, max_streak: 0 },
  currentIP: null,
  isAuthorized: true,
  isLoading: true,
  showDatePicker: false,
  showLog: false,
  showMoneySettings: false,
  showDrainSettings: false,
  showThemePicker: false,
  authError: false,
  sessionMessage: SESSION_MESSAGES[Math.floor(Math.random() * SESSION_MESSAGES.length)],
  moneyMessage: MONEY_MESSAGES[Math.floor(Math.random() * MONEY_MESSAGES.length)],
  labelMessage: LABEL_MESSAGES[Math.floor(Math.random() * LABEL_MESSAGES.length)],
  timeBreakdown: { hours: 0, minutes: 0, seconds: 0 }
};

// Colors (from current theme)
const getColors = () => ({
  amber: theme.primary,
  amberDim: theme.primaryDim,
  amberGlow: theme.primaryGlow
});

let { amber, amberDim, amberGlow } = getColors();

// ============ API Functions ============

async function fetchStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    const data = await res.json();

    state.daysSince = data.days_since;
    state.lastMatterDate = new Date(data.last_matter_date);
    state.lifetimeSpent = data.lifetime_spent;
    state.displayedSpent = data.total_spent || data.lifetime_spent;
    state.drainStartTime = new Date(data.drain_start_time);
    state.drainEnabled = data.drain_enabled !== undefined ? data.drain_enabled : true;
    state.drainRateCents = data.drain_rate_cents !== undefined ? data.drain_rate_cents : 50;
    state.stats = data.stats;
    state.currentIP = data.your_ip;
    state.isAuthorized = true; // We'll find out on write attempts

    return data;
  } catch (err) {
    console.error('Failed to fetch status:', err);
  }
}

async function fetchMatters() {
  try {
    const res = await fetch(`${API_BASE}/matters`);
    state.matters = await res.json();
  } catch (err) {
    console.error('Failed to fetch matters:', err);
  }
}

async function logMatter(matterDate, note, cost) {
  try {
    const res = await fetch(`${API_BASE}/matters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matter_date: matterDate || new Date().toISOString(),
        note: note || 'No details provided',
        cost: cost || 0
      })
    });

    if (res.status === 403) {
      state.authError = true;
      state.isAuthorized = false;
      render();
      setTimeout(() => { state.authError = false; render(); }, 3000);
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

async function deleteMatter(id) {
  try {
    const res = await fetch(`${API_BASE}/matters/${id}`, { method: 'DELETE' });

    if (res.status === 403) {
      state.authError = true;
      render();
      setTimeout(() => { state.authError = false; render(); }, 3000);
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

async function updateDrainSettings(enabled, rateCents) {
  try {
    const res = await fetch(`${API_BASE}/settings/drain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, rate_cents: rateCents })
    });

    if (res.status === 403) {
      state.authError = true;
      render();
      setTimeout(() => { state.authError = false; render(); }, 3000);
      return false;
    }

    const data = await res.json();
    return data.success;
  } catch (err) {
    console.error('Failed to update drain settings:', err);
    return false;
  }
}

async function updateLifetimeSpent(amount, add = false) {
  try {
    const res = await fetch(`${API_BASE}/settings/lifetime-spent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, add })
    });

    if (res.status === 403) {
      state.authError = true;
      render();
      setTimeout(() => { state.authError = false; render(); }, 3000);
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

async function setLastMatterDate(date) {
  try {
    const res = await fetch(`${API_BASE}/settings/last-matter-date`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date })
    });

    if (res.status === 403) {
      state.authError = true;
      render();
      setTimeout(() => { state.authError = false; render(); }, 3000);
      return false;
    }

    await fetchStatus();
    return true;
  } catch (err) {
    console.error('Failed to set last matter date:', err);
    return false;
  }
}

// ============ Render Functions ============

function updateTimeBreakdown() {
  const now = new Date();
  const lastMatter = new Date(state.lastMatterDate);
  const diffMs = now - lastMatter;

  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);

  state.timeBreakdown = {
    hours: totalHours % 24,
    minutes: totalMinutes % 60,
    seconds: totalSeconds % 60
  };
}

function getStatusText() {
  let category;
  if (state.daysSince === 0) category = 'ALERT';
  else if (state.daysSince < 7) category = 'WARNING';
  else if (state.daysSince < 30) category = 'MONITOR';
  else category = 'NOMINAL';

  const messages = STATUS_MESSAGES[category];
  return messages[Math.floor(Math.random() * messages.length)];
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).replace(/\//g, '-');
}

function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDateLong(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).toUpperCase();
}

function renderModern() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div style="min-height: 100vh; background: ${theme.background}; padding: 2rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;">
      <div style="max-width: 1000px; margin: 0 auto;">

        <!-- Modern Header -->
        <div style="background: ${theme.cardBg}; backdrop-filter: blur(10px); border-radius: ${theme.borderRadius}; padding: 2rem; margin-bottom: 1.5rem; box-shadow: ${theme.shadow}; border: 1px solid ${theme.cardBorder};">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h1 style="margin: 0; font-size: 1.5rem; font-weight: 600; color: ${theme.primary};">Legal Matter Tracker</h1>
              <p style="margin: 0.5rem 0 0 0; color: ${theme.primaryDim}; font-size: 0.9rem;">${state.sessionMessage.split('•')[0].trim()}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <button onclick="toggleThemePicker()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: ${theme.primary}; padding: 0.6rem 1.2rem; border-radius: 8px; font-size: 0.9rem; cursor: pointer; font-family: inherit; font-weight: 500;">
                Change Theme
              </button>
              <span style="color: ${state.isAuthorized ? theme.success : theme.danger}; font-size: 0.9rem;">
                ${state.isAuthorized ? '● AUTHORIZED' : '● READ-ONLY'}
              </span>
            </div>
          </div>
        </div>

        ${state.showThemePicker ? `
          <div style="background: ${theme.cardBg}; backdrop-filter: blur(10px); border-radius: ${theme.borderRadius}; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: ${theme.shadow}; border: 1px solid ${theme.cardBorder};">
            <h3 style="margin: 0 0 1rem 0; font-size: 1.1rem; font-weight: 600; color: ${theme.primary};">Select Theme</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem;">
              ${Object.entries(THEMES).map(([key, t]) => `
                <button
                  onclick="setTheme('${key}')"
                  style="
                    padding: 1rem;
                    background: ${key === currentThemeKey ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.05)'};
                    border: 1px solid ${key === currentThemeKey ? '#667eea' : 'rgba(255,255,255,0.15)'};
                    border-radius: 8px;
                    cursor: pointer;
                    font-family: inherit;
                    transition: all 0.2s ease;
                    color: ${key === currentThemeKey ? 'white' : '#e8e8e8'};
                    font-weight: ${key === currentThemeKey ? '600' : '400'};
                  "
                >
                  ${t.name}
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Main Counter Card -->
        <div style="background: ${theme.cardBg}; backdrop-filter: blur(10px); border-radius: ${theme.borderRadius}; padding: 3rem 2rem; margin-bottom: 1.5rem; box-shadow: ${theme.shadow}; border: 1px solid ${theme.cardBorder}; text-align: center;">
          <div style="font-size: 0.85rem; color: ${state.daysSince < 7 ? theme.danger : theme.primaryDim}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; font-weight: 600;">
            ${getStatusText()}
          </div>
          <div style="font-size: 0.9rem; color: ${theme.primaryDim}; letter-spacing: 0.05em; margin-bottom: 1rem; font-weight: 400;">
            ${state.labelMessage.replace('&gt;', '').trim()}
          </div>
          <div style="font-size: clamp(5rem, 20vw, 8rem); font-weight: 700; color: ${theme.primary}; line-height: 1; margin: 1rem 0;">
            ${state.daysSince}
          </div>
          <div data-time-display style="font-size: 1.2rem; color: ${theme.primary}; margin-top: 1rem; font-weight: 500; font-variant-numeric: tabular-nums;">
            ${String(state.timeBreakdown.hours).padStart(2, '0')}:${String(state.timeBreakdown.minutes).padStart(2, '0')}:${String(state.timeBreakdown.seconds).padStart(2, '0')}
          </div>
          <div style="font-size: 0.95rem; color: ${theme.primaryDim}; margin-top: 0.5rem;">
            Last matter: ${formatDateLong(state.lastMatterDate)}
          </div>
        </div>

        <!-- Money Card -->
        <div style="background: linear-gradient(135deg, rgba(255,71,87,0.05) 0%, rgba(255,107,122,0.05) 100%); backdrop-filter: blur(10px); border-radius: ${theme.borderRadius}; padding: 2rem; margin-bottom: 1.5rem; box-shadow: ${theme.shadow}; border: 1px solid rgba(255,71,87,0.2);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="font-size: 0.85rem; color: ${theme.danger}; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; font-weight: 600;">
                Lifetime Legal Fees
              </div>
              <div data-money-display style="font-size: 2.5rem; font-weight: 700; color: ${theme.danger};">
                $${state.displayedSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              ${state.drainEnabled ? `<div style="font-size: 0.8rem; color: ${theme.dangerDim}; margin-top: 0.5rem;">+$${(state.drainRateCents / 100).toFixed(2)}/sec (${state.moneyMessage})</div>` : `<div style="font-size: 0.8rem; color: ${theme.primaryDim}; margin-top: 0.5rem; font-style: italic;">Auto-drain disabled</div>`}
            </div>
            <div style="display: flex; gap: 0.75rem;">
              <button onclick="toggleDrainSettings()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,71,87,0.3); color: ${theme.danger}; padding: 0.6rem 1.2rem; border-radius: 8px; font-size: 0.9rem; cursor: pointer; font-family: inherit; font-weight: 500;">
                ${state.showDrainSettings ? 'Close' : 'Configure Drain'}
              </button>
              <button onclick="toggleMoneySettings()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,71,87,0.3); color: ${theme.danger}; padding: 0.6rem 1.2rem; border-radius: 8px; font-size: 0.9rem; cursor: pointer; font-family: inherit; font-weight: 500;">
                ${state.showMoneySettings ? 'Close' : 'Edit Amount'}
              </button>
            </div>
          </div>

          ${state.showDrainSettings ? `
            <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,71,87,0.2);">
              <h4 style="margin: 0 0 1rem 0; font-size: 1rem; color: ${theme.danger}; font-weight: 600;">Auto-Drain Configuration</h4>
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <input type="checkbox" id="drainEnabled" ${state.drainEnabled ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
                  <label for="drainEnabled" style="color: ${theme.primary}; font-size: 0.95rem; cursor: pointer;">Enable automatic drain</label>
                </div>
                <div>
                  <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: ${theme.primaryDim};">Drain rate (cents per second)</label>
                  <input type="number" id="drainRateInput" value="${state.drainRateCents}" min="0" step="1" style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: ${theme.primary}; border-radius: 8px; font-family: inherit; font-size: 1rem; box-sizing: border-box;">
                  <p style="font-size: 0.8rem; color: ${theme.primaryDim}; margin: 0.5rem 0 0 0;">Current: $${(state.drainRateCents / 100).toFixed(2)}/sec = $${((state.drainRateCents / 100) * 60).toFixed(2)}/min = $${((state.drainRateCents / 100) * 3600).toFixed(2)}/hour</p>
                </div>
                <button onclick="saveDrainSettings()" style="padding: 0.75rem; background: ${theme.danger}; border: none; color: white; border-radius: 8px; cursor: pointer; font-family: inherit; font-weight: 500;">Save Drain Settings</button>
                <p style="font-size: 0.85rem; color: ${theme.dangerDim}; margin: 0; font-style: italic;">⚠️ Changing drain settings will reset the accumulation timer</p>
              </div>
            </div>
          ` : ''}

          ${state.showMoneySettings ? `
            <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,71,87,0.2);">
              <input type="number" id="moneyInput" placeholder="Enter amount" step="0.01" style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: ${theme.primary}; border-radius: 8px; font-family: inherit; font-size: 1rem; box-sizing: border-box; margin-bottom: 1rem;">
              <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <button onclick="setMoney()" style="flex: 1; min-width: 120px; padding: 0.75rem; background: ${theme.danger}; border: none; color: white; border-radius: 8px; cursor: pointer; font-family: inherit; font-weight: 500;">Set Total</button>
                <button onclick="addMoney()" style="flex: 1; min-width: 120px; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: ${theme.danger}; border-radius: 8px; cursor: pointer; font-family: inherit; font-weight: 500;">Add Amount</button>
                <button onclick="resetMoney()" style="padding: 0.75rem 1.5rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: ${theme.primaryDim}; border-radius: 8px; cursor: pointer; font-family: inherit;">Reset</button>
              </div>
              <p style="font-size: 0.85rem; color: ${theme.dangerDim}; margin: 1rem 0 0 0; font-style: italic;">💡 Pro tip: Set this to your actual lifetime legal spend for maximum emotional damage. Or lie to yourself, we won't judge.</p>
            </div>
          ` : ''}
        </div>

        <!-- Stats Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <div style="background: ${theme.cardBg}; backdrop-filter: blur(10px); border-radius: ${theme.borderRadius}; padding: 1.5rem; box-shadow: ${theme.shadow}; border: 1px solid ${theme.cardBorder}; text-align: center;">
            <div style="font-size: 0.75rem; color: ${theme.primaryDim}; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">Record Streak</div>
            <div style="font-size: 2rem; font-weight: 700; color: ${theme.primary};">${state.stats.max_streak}</div>
          </div>
          <div style="background: ${theme.cardBg}; backdrop-filter: blur(10px); border-radius: ${theme.borderRadius}; padding: 1.5rem; box-shadow: ${theme.shadow}; border: 1px solid ${theme.cardBorder}; text-align: center;">
            <div style="font-size: 0.75rem; color: ${theme.primaryDim}; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">This Year</div>
            <div style="font-size: 2rem; font-weight: 700; color: ${theme.danger};">${state.stats.matters_this_year}</div>
          </div>
          <div style="background: ${theme.cardBg}; backdrop-filter: blur(10px); border-radius: ${theme.borderRadius}; padding: 1.5rem; box-shadow: ${theme.shadow}; border: 1px solid ${theme.cardBorder}; text-align: center;">
            <div style="font-size: 0.75rem; color: ${theme.primaryDim}; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">All Time</div>
            <div style="font-size: 2rem; font-weight: 700; color: ${theme.primary};">${state.stats.total_matters}</div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <button onclick="toggleDatePicker()" style="padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: ${theme.primary}; border-radius: 8px; cursor: pointer; font-family: inherit; font-weight: 500;">
            ${state.showDatePicker ? 'Cancel' : 'Log Past Matter'}
          </button>
          <button onclick="toggleLog()" style="padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: ${theme.primary}; border-radius: 8px; cursor: pointer; font-family: inherit; font-weight: 500;">
            ${state.showLog ? 'Hide' : 'View'} History (${state.matters.length})
          </button>
          <button onclick="quickLogMatter()" style="padding: 1rem; background: ${theme.accentGradient}; border: none; color: white; border-radius: 8px; cursor: pointer; font-family: inherit; font-weight: 600; box-shadow: 0 4px 14px rgba(102,126,234,0.4);">
            Log Matter Today
          </button>
        </div>

        ${state.showDatePicker ? `
          <div style="background: ${theme.cardBg}; backdrop-filter: blur(10px); border-radius: ${theme.borderRadius}; padding: 2rem; margin-bottom: 1.5rem; box-shadow: ${theme.shadow}; border: 1px solid ${theme.cardBorder};">
            <h3 style="margin: 0 0 1.5rem 0; font-size: 1.1rem; font-weight: 600; color: ${theme.primary};">Log Past Matter</h3>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div>
                <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: ${theme.primaryDim}; font-weight: 500;">Date & Time</label>
                <input type="datetime-local" id="matterDate" max="${new Date().toISOString().slice(0, 16)}" style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: ${theme.primary}; border-radius: 8px; font-family: inherit; font-size: 1rem;">
              </div>
              <div>
                <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: ${theme.primaryDim}; font-weight: 500;">Note (optional)</label>
                <input type="text" id="matterNote" placeholder="e.g., Estate planning attorney" style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: ${theme.primary}; border-radius: 8px; font-family: inherit; font-size: 1rem; box-sizing: border-box;">
              </div>
              <div>
                <label style="display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: ${theme.primaryDim}; font-weight: 500;">Cost (optional)</label>
                <input type="number" id="matterCost" placeholder="e.g., 5000" step="0.01" style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: ${theme.primary}; border-radius: 8px; font-family: inherit; font-size: 1rem; box-sizing: border-box;">
              </div>
              <button onclick="submitManualMatter()" style="padding: 1rem; background: ${theme.accentGradient}; border: none; color: white; border-radius: 8px; cursor: pointer; font-family: inherit; font-weight: 600; margin-top: 0.5rem;">
                Save Matter
              </button>
            </div>
          </div>
        ` : ''}

        ${state.showLog ? `
          <div style="background: ${theme.cardBg}; backdrop-filter: blur(10px); border-radius: ${theme.borderRadius}; padding: 2rem; margin-bottom: 1.5rem; box-shadow: ${theme.shadow}; border: 1px solid ${theme.cardBorder};">
            <h3 style="margin: 0 0 1.5rem 0; font-size: 1.1rem; font-weight: 600; color: ${theme.primary};">Matter History (${state.matters.length} records)</h3>
            ${state.matters.length === 0 ? `
              <p style="font-size: 0.9rem; color: ${theme.primaryDim}; font-style: italic;">No matters recorded. Congratulations, you're winning at life! (For now...)</p>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 400px; overflow-y: auto;">
                ${state.matters.map((matter) => `
                  <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <div style="font-weight: 600; color: ${theme.primary}; margin-bottom: 0.25rem;">${formatDateTime(matter.matter_date)}</div>
                      <div style="font-size: 0.9rem; color: ${theme.primaryDim};">${matter.note}</div>
                      ${matter.cost ? `<div style="font-size: 0.85rem; color: ${theme.danger}; margin-top: 0.25rem;">$${parseFloat(matter.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : ''}
                    </div>
                    <button onclick="deleteMatterById(${matter.id})" style="background: transparent; border: 1px solid rgba(255,71,87,0.3); color: ${theme.danger}; padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500;">Delete</button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        ` : ''}
      </div>
    </div>
  `;

  startCursorBlink();
}

function renderRetro() {
  const app = document.getElementById('app');
  const retroHeader = RETRO_MESSAGES.header[Math.floor(Math.random() * RETRO_MESSAGES.header.length)];
  const retroFooter = RETRO_MESSAGES.footer[Math.floor(Math.random() * RETRO_MESSAGES.footer.length)];
  const retroStatus = state.daysSince < 7 ? 'NOT!' : RETRO_MESSAGES.status[Math.floor(Math.random() * RETRO_MESSAGES.status.length)];

  app.innerHTML = `
    <div style="min-height: 100vh; background: ${theme.background}; background-image: url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect width=%2250%22 height=%2250%22 fill=%22%23d3d3d3%22/%3E%3Crect x=%2250%22 y=%2250%22 width=%2250%22 height=%2250%22 fill=%22%23d3d3d3%22/%3E%3C/svg%3E'); padding: 1rem; font-family: 'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', cursive;">
      <div style="max-width: 900px; margin: 0 auto; border: 8px ${theme.borderStyle} ${theme.accent1}; background: white; box-shadow: 10px 10px 0 rgba(0,0,0,0.3);">

        <!-- Header -->
        <div style="background: linear-gradient(45deg, ${theme.accent1} 0%, ${theme.accent2} 100%); padding: 1.5rem; border-bottom: 5px ${theme.borderStyle} ${theme.primary};">
          <div style="text-align: center;">
            <h1 style="margin: 0; font-size: 2.5rem; color: yellow; text-shadow: ${theme.textShadow}; font-weight: bold; letter-spacing: 3px;">
              ⚖️ LAWYER-FREE ZONE ⚖️
            </h1>
            <p style="margin: 0.5rem 0 0 0; font-size: 1.1rem; color: white; text-shadow: 1px 1px black; font-weight: bold;">
              ${retroHeader}
            </p>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; flex-wrap: wrap; gap: 0.75rem;">
            <div style="display: flex; gap: 5px; align-items: center;">
              <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='88' height='31'><rect width='88' height='31' fill='%23ff0000'/><text x='44' y='20' font-family='Arial' font-size='14' fill='white' text-anchor='middle' font-weight='bold'>NEW!</text></svg>" />
              <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='88' height='31'><rect width='88' height='31' fill='%2300ff00'/><text x='44' y='20' font-family='Arial' font-size='12' fill='black' text-anchor='middle' font-weight='bold'>ATTORNEY</text><text x='44' y='28' font-family='Arial' font-size='8' fill='black' text-anchor='middle'>FREE</text></svg>" />
            </div>

            <div style="display: flex; gap: 0.75rem; align-items: center;">
              <span style="color: ${state.isAuthorized ? 'lime' : 'red'}; font-weight: bold; text-shadow: 1px 1px black; font-size: 0.95rem;">
                ${state.isAuthorized ? '✅ ADMIN' : '👁️ READ ONLY'}
              </span>
              <button onclick="toggleThemePicker()" style="padding: 0.6rem 1.2rem; background: yellow; border: 4px outset gray; font-family: inherit; font-size: 0.95rem; font-weight: bold; cursor: pointer; color: black;">
                🎨 ${state.showThemePicker ? 'CLOSE' : 'THEMES'}
              </button>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div style="padding: 2rem 1.5rem;">

          <!-- Theme Picker -->
          ${state.showThemePicker ? `
            <div style="background: yellow; border: 5px double ${theme.primary}; padding: 1.5rem; margin-bottom: 1.5rem;">
              <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; color: ${theme.danger}; text-shadow: 1px 1px ${theme.primary};">☆ CHOOSE YOUR THEME! ☆</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem;">
                ${Object.entries(THEMES).map(([key, t]) => `
                  <button onclick="setTheme('${key}')" style="
                    padding: 1rem;
                    background: ${key === currentThemeKey ? 'linear-gradient(135deg, #ff00ff 0%, #00ffff 100%)' : 'white'};
                    border: 4px ${key === currentThemeKey ? 'inset' : 'outset'} gray;
                    cursor: pointer;
                    font-family: inherit;
                    font-weight: bold;
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
          <div style="background: linear-gradient(90deg, ${theme.danger} 0%, ${theme.dangerDim} 50%, ${theme.danger} 100%); border: 4px ${theme.borderStyle} ${theme.primary}; padding: 1rem; margin-bottom: 1.5rem; text-align: center;">
            <p style="margin: 0; font-size: 1.8rem; color: yellow; text-shadow: ${theme.textShadow}; font-weight: bold; animation: flash 1s infinite;">
              ${retroStatus}
            </p>
          </div>

          <!-- Main Counter -->
          <div style="background: linear-gradient(135deg, #ffff00 0%, #ffcc00 100%); border: 6px ${theme.borderStyle} ${theme.primary}; padding: 2rem; margin-bottom: 1.5rem; text-align: center; box-shadow: 5px 5px 0 rgba(0,0,0,0.2);">
            <p style="margin: 0 0 1rem 0; font-size: 1.2rem; color: ${theme.danger}; font-weight: bold; text-shadow: 1px 1px white;">
              ✨ DAYS WITHOUT CALLING 1-800-LAWYERS ✨
            </p>
            <div style="background: black; border: 5px inset gray; padding: 2rem; margin: 1rem 0;">
              <p style="margin: 0; font-size: clamp(5rem, 20vw, 10rem); color: ${theme.success}; text-shadow: 0 0 20px ${theme.success}, 0 0 40px ${theme.success}; font-weight: bold; font-family: 'Courier New', monospace;">
                ${state.daysSince}
              </p>
              <p data-time-display style="margin: 1rem 0 0 0; font-size: 1.8rem; color: ${theme.accent2}; font-weight: bold; font-family: 'Courier New', monospace;">
                ${String(state.timeBreakdown.hours).padStart(2, '0')}:${String(state.timeBreakdown.minutes).padStart(2, '0')}:${String(state.timeBreakdown.seconds).padStart(2, '0')}
              </p>
            </div>
            <p style="margin: 1rem 0 0 0; font-size: 1rem; color: ${theme.primary}; font-weight: bold;">
              Last Matter: ${formatDateLong(state.lastMatterDate)}
            </p>
          </div>

          <!-- Money Counter -->
          <div style="background: linear-gradient(45deg, #ff0000 0%, #ff6600 100%); border: 6px ${theme.borderStyle} yellow; padding: 1.5rem; margin-bottom: 1.5rem;">
            <div style="text-align: center;">
              <p style="margin: 0 0 0.5rem 0; font-size: 1.5rem; color: yellow; text-shadow: ${theme.textShadow}; font-weight: bold;">
                💸 CA-CHING! YOUR LEGAL BILL$ 💸
              </p>
              <p data-money-display style="margin: 0; font-size: 3rem; color: white; text-shadow: 3px 3px black; font-weight: bold;">
                $${state.displayedSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              ${state.drainEnabled ? `<p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: yellow; font-weight: bold;">+$${(state.drainRateCents / 100).toFixed(2)}/sec (the meter never stops!)</p>` : ''}
              <button onclick="toggleMoneySettings()" style="margin-top: 1rem; padding: 0.8rem 1.5rem; background: yellow; border: 4px outset gray; font-family: inherit; font-size: 1.1rem; font-weight: bold; cursor: pointer; color: black;">
                ${state.showMoneySettings ? '✖ CLOSE' : '✎ EDIT TOTAL'}
              </button>
            </div>

            ${state.showMoneySettings ? `
              <div style="background: white; border: 4px inset gray; padding: 1.5rem; margin-top: 1rem;">
                <input type="number" id="moneyInput" placeholder="Enter amount" step="0.01" style="width: 100%; padding: 0.75rem; background: white; border: 3px inset gray; font-family: inherit; font-size: 1.2rem; box-sizing: border-box; margin-bottom: 1rem;">
                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                  <button onclick="setMoney()" style="flex: 1; min-width: 120px; padding: 0.75rem; background: lime; border: 4px outset gray; font-family: inherit; font-weight: bold; cursor: pointer;">SET IT!</button>
                  <button onclick="addMoney()" style="flex: 1; min-width: 120px; padding: 0.75rem; background: aqua; border: 4px outset gray; font-family: inherit; font-weight: bold; cursor: pointer;">ADD MORE</button>
                  <button onclick="resetMoney()" style="padding: 0.75rem 1.5rem; background: #ff6600; border: 4px outset gray; color: white; font-family: inherit; font-weight: bold; cursor: pointer;">RESET</button>
                </div>
                <p style="margin: 1rem 0 0 0; font-size: 0.9rem; color: ${theme.primary}; font-weight: bold;">💡 TIP: Enter your real total for maximum guilt trip!</p>
              </div>
            ` : ''}
          </div>

          <!-- Stats -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div style="background: #00ffff; border: 5px ${theme.borderStyle} ${theme.primary}; padding: 1.5rem; text-align: center;">
              <p style="margin: 0; font-size: 0.9rem; font-weight: bold; color: ${theme.primary};">★ RECORD STREAK ★</p>
              <p style="margin: 0.5rem 0 0 0; font-size: 3rem; font-weight: bold; color: ${theme.danger}; text-shadow: 2px 2px white;">${state.stats.max_streak}</p>
            </div>
            <div style="background: #ff00ff; border: 5px ${theme.borderStyle} ${theme.primary}; padding: 1.5rem; text-align: center;">
              <p style="margin: 0; font-size: 0.9rem; font-weight: bold; color: white;">★ THIS YEAR ★</p>
              <p style="margin: 0.5rem 0 0 0; font-size: 3rem; font-weight: bold; color: yellow; text-shadow: ${theme.textShadow};">${state.stats.matters_this_year}</p>
            </div>
            <div style="background: #ffff00; border: 5px ${theme.borderStyle} ${theme.primary}; padding: 1.5rem; text-align: center;">
              <p style="margin: 0; font-size: 0.9rem; font-weight: bold; color: ${theme.primary};">★ ALL TIME ★</p>
              <p style="margin: 0.5rem 0 0 0; font-size: 3rem; font-weight: bold; color: ${theme.danger}; text-shadow: 2px 2px white;">${state.stats.total_matters}</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <button onclick="toggleDatePicker()" style="padding: 1.2rem; background: ${state.showDatePicker ? '#ff6600' : 'lime'}; border: 5px outset gray; font-family: inherit; font-size: 1.1rem; font-weight: bold; cursor: pointer;">
              ${state.showDatePicker ? '✖ CANCEL' : '📅 LOG PAST'}
            </button>
            <button onclick="toggleLog()" style="padding: 1.2rem; background: ${state.showLog ? '#ff6600' : 'aqua'}; border: 5px outset gray; font-family: inherit; font-size: 1.1rem; font-weight: bold; cursor: pointer;">
              ${state.showLog ? '✖ HIDE' : '📜 VIEW'} LOG (${state.matters.length})
            </button>
            <button onclick="quickLogMatter()" style="padding: 1.2rem; background: red; color: yellow; border: 5px outset gray; font-family: inherit; font-size: 1.1rem; font-weight: bold; cursor: pointer; text-shadow: 1px 1px black;">
              🚨 LOG NOW!
            </button>
          </div>

          ${state.showDatePicker ? `
            <div style="background: #ffffcc; border: 6px double ${theme.primary}; padding: 2rem; margin-bottom: 1.5rem;">
              <h3 style="margin: 0 0 1.5rem 0; color: ${theme.danger}; text-shadow: 1px 1px yellow; font-size: 1.5rem;">📝 LOG A PAST MATTER</h3>
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                  <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: ${theme.primary};">Date & Time:</label>
                  <input type="datetime-local" id="matterDate" max="${new Date().toISOString().slice(0, 16)}" style="width: 100%; padding: 0.75rem; border: 3px inset gray; font-family: inherit; font-size: 1.1rem;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: ${theme.primary};">Note:</label>
                  <input type="text" id="matterNote" placeholder="What happened..." style="width: 100%; padding: 0.75rem; border: 3px inset gray; font-family: inherit; font-size: 1.1rem; box-sizing: border-box;">
                </div>
                <div>
                  <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: ${theme.primary};">Cost ($):</label>
                  <input type="number" id="matterCost" placeholder="How much..." step="0.01" style="width: 100%; padding: 0.75rem; border: 3px inset gray; font-family: inherit; font-size: 1.1rem; box-sizing: border-box;">
                </div>
                <button onclick="submitManualMatter()" style="padding: 1rem; background: lime; border: 5px outset gray; font-family: inherit; font-size: 1.2rem; font-weight: bold; cursor: pointer; margin-top: 0.5rem;">
                  ✔️ SAVE IT!
                </button>
              </div>
            </div>
          ` : ''}

          ${state.showLog ? `
            <div style="background: white; border: 6px ${theme.borderStyle} ${theme.accent2}; padding: 2rem; margin-bottom: 1.5rem;">
              <h3 style="margin: 0 0 1.5rem 0; color: ${theme.danger}; text-shadow: 1px 1px cyan; font-size: 1.5rem;">📜 MATTER LOG (${state.matters.length} Total)</h3>
              ${state.matters.length === 0 ? `
                <p style="font-size: 1.2rem; color: ${theme.primary}; font-weight: bold; text-align: center;">🎉 NO MATTERS! YOU'RE WINNING! 🎉</p>
              ` : `
                <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 400px; overflow-y: auto;">
                  ${state.matters.map((matter) => `
                    <div style="background: #f0f0f0; border: 4px ${theme.borderStyle} gray; padding: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                      <div style="flex: 1;">
                        <div style="font-weight: bold; color: ${theme.primary}; font-size: 1.1rem; margin-bottom: 0.25rem;">${formatDateTime(matter.matter_date)}</div>
                        <div style="color: black; font-size: 0.95rem;">${matter.note}</div>
                        ${matter.cost ? `<div style="color: ${theme.danger}; font-weight: bold; margin-top: 0.25rem;">Cost: $${parseFloat(matter.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : ''}
                      </div>
                      <button onclick="deleteMatterById(${matter.id})" style="padding: 0.5rem 1rem; background: red; color: yellow; border: 4px outset gray; cursor: pointer; font-weight: bold; font-family: inherit;">DELETE</button>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div style="background: linear-gradient(45deg, ${theme.primary} 0%, ${theme.primaryDim} 100%); padding: 1.5rem; border-top: 5px ${theme.borderStyle} ${theme.accent1}; text-align: center;">
          <p style="margin: 0; color: yellow; font-size: 0.9rem; text-shadow: 1px 1px black; font-weight: bold;">
            ${retroFooter}
          </p>
          <p style="margin: 0.5rem 0 0 0; color: white; font-size: 0.8rem; text-shadow: 1px 1px black;">
            © 1996-∞ • Made with &lt;blink&gt; and &lt;marquee&gt; • ${state.isAuthorized ? '✅ ADMIN' : '👁️ READ ONLY'}
          </p>
        </div>
      </div>
    </div>
  `;

  startCursorBlink();
}

function render() {
  const app = document.getElementById('app');

  if (state.isLoading) {
    app.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; color: ${theme.primary}; background: ${theme.background};">
        <div style="text-align: center;">
          <p style="font-size: 1.5rem; text-shadow: 0 0 10px ${theme.primaryGlow};">INITIALIZING SYSTEM...</p>
          <p style="color: ${theme.primaryDim}; font-size: 1rem;">Connecting to backend...</p>
        </div>
      </div>
    `;
    return;
  }

  // Modern theme gets completely different rendering
  if (theme.isModern) {
    renderModern();
    return;
  }

  // Retro theme gets completely different rendering
  if (theme.isRetro) {
    renderRetro();
    return;
  }

  const statusColor = state.daysSince < 7 ? theme.danger : theme.primary;
  const statusGlow = state.daysSince < 7 ? theme.danger : theme.primaryGlow;

  app.innerHTML = `
    ${state.authError ? `
      <div style="position: fixed; inset: 0; background: rgba(255,0,0,0.2); display: flex; align-items: center; justify-content: center; z-index: 200;">
        <div style="background: ${theme.background}; border: 2px solid ${theme.danger}; padding: 2rem 3rem; text-align: center;">
          <p style="color: ${theme.danger}; font-size: 1.5rem; margin: 0; text-shadow: 0 0 10px ${theme.danger};">⛔ ACCESS DENIED ⛔</p>
          <p style="color: ${theme.danger}; font-size: 1rem; margin: 1rem 0 0 0; opacity: 0.8;">UNAUTHORIZED IP ADDRESS</p>
          <p style="color: ${theme.dangerDim}; font-size: 0.9rem; margin: 0.5rem 0 0 0;">Your IP: ${state.currentIP || 'UNKNOWN'}</p>
        </div>
      </div>
    ` : ''}

    <div style="padding: 2rem; max-width: 1200px; margin: 0 auto; position: relative; z-index: 10;">
      
      <!-- Header -->
      <div style="border-bottom: 1px solid ${theme.primaryDim}; padding-bottom: 1rem; margin-bottom: 2rem;">
        <div style="background: rgba(0,0,0,0.3); border: 2px solid ${theme.primary}; padding: 1rem 1.5rem;">
          <div style="text-align: center; color: ${theme.primary}; font-size: 1.3rem; text-shadow: 0 0 15px ${theme.primaryGlow}; letter-spacing: 0.15em; font-weight: bold;">
            LEGAL MATTER MONITORING SYSTEM
          </div>
          <div style="text-align: center; color: ${theme.primaryDim}; font-size: 0.9rem; margin-top: 0.25rem; text-shadow: 0 0 8px ${theme.primaryGlow};">
            v3.2.1 • ${theme.name}
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
          <span style="color: ${theme.primaryDim}; font-size: 1rem; letter-spacing: 0.05em; text-shadow: 0 0 8px ${theme.primaryGlow};">
            ${state.sessionMessage}
          </span>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <button onclick="toggleThemePicker()" style="background: transparent; border: 1px solid ${theme.primaryDim}; color: ${theme.primaryDim}; padding: 0.4rem 0.8rem; font-size: 0.9rem; cursor: pointer; font-family: inherit;">
              THEME
            </button>
            <span style="color: ${state.isAuthorized ? theme.success : theme.danger}; font-size: 1rem; text-shadow: 0 0 8px ${state.isAuthorized ? theme.success : theme.danger};">
              ${state.isAuthorized ? '● AUTHORIZED' : '● READ-ONLY MODE'}
            </span>
          </div>
        </div>
      </div>

      <!-- Theme Picker -->
      ${state.showThemePicker ? `
        <div style="background: rgba(0,0,0,0.4); border: 1px solid ${theme.primary}; padding: 1.5rem; margin-bottom: 2rem;">
          <p style="color: ${theme.primary}; font-size: 0.9rem; margin: 0 0 1rem 0; text-shadow: 0 0 10px ${theme.primaryGlow};">&gt; SELECT DISPLAY THEME:</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem;">
            ${Object.entries(THEMES).map(([key, t]) => `
              <button 
                onclick="setTheme('${key}')" 
                style="
                  padding: 0.75rem;
                  background: ${key === currentThemeKey ? t.primary + '22' : 'rgba(0,0,0,0.3)'};
                  border: 2px solid ${key === currentThemeKey ? t.primary : t.primaryDim};
                  cursor: pointer;
                  font-family: inherit;
                  transition: all 0.2s ease;
                  text-align: left;
                "
              >
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                  <div style="width: 12px; height: 12px; background: ${t.primary}; border-radius: 2px; box-shadow: 0 0 8px ${t.primaryGlow};"></div>
                  <div style="width: 12px; height: 12px; background: ${t.danger}; border-radius: 2px;"></div>
                </div>
                <p style="color: ${t.primary}; font-size: 0.8rem; margin: 0; text-shadow: 0 0 8px ${t.primaryGlow};">${t.name}</p>
                <p style="color: ${t.primaryDim}; font-size: 0.65rem; margin: 0.25rem 0 0 0;">${key === currentThemeKey ? '● ACTIVE' : ''}</p>
              </button>
            `).join('')}
          </div>
          <p style="color: ${theme.primaryDim}; font-size: 0.7rem; margin: 1rem 0 0 0;">
            Theme preference is saved to your browser.
          </p>
        </div>
      ` : ''}

      <!-- Status Line -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding: 0.75rem 1rem; background: ${theme.primary}11; border: 1px solid ${theme.primaryDim};">
        <span style="color: ${theme.primaryDim}; font-size: 1.1rem; text-shadow: 0 0 8px ${theme.primaryGlow};">STATUS:</span>
        <span class="${state.daysSince < 7 ? 'blink' : ''}" style="color: ${statusColor}; font-size: 1.1rem; text-shadow: 0 0 15px ${statusGlow};">
          [${getStatusText()}]
        </span>
      </div>

      <!-- Main Display -->
      <div style="background: rgba(0,0,0,0.4); border: 2px solid ${theme.primary}; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 0 30px ${theme.primary}22, inset 0 0 60px rgba(0,0,0,0.5);">
        <p style="color: ${theme.primaryDim}; font-size: 1.3rem; margin: 0 0 1.5rem 0; letter-spacing: 0.1em; text-shadow: 0 0 10px ${theme.primaryGlow};">
          ${state.labelMessage}
        </p>
        <div style="text-align: center; padding: 2rem 0;">
          <span style="font-size: clamp(6rem, 25vw, 12rem); color: ${theme.primary}; text-shadow: 0 0 40px ${theme.primaryGlow}, 0 0 80px ${theme.primary}77, 0 0 100px ${theme.primary}44; letter-spacing: 0.1em;">
            ${String(state.daysSince).padStart(2, '0')}
          </span>
        </div>
        <p data-time-display style="color: ${theme.primary}; font-size: 2rem; margin: 1rem 0 0 0; text-align: center; text-shadow: 0 0 15px ${theme.primaryGlow}; letter-spacing: 0.15em; font-variant-numeric: tabular-nums;">
          ${String(state.timeBreakdown.hours).padStart(2, '0')}:${String(state.timeBreakdown.minutes).padStart(2, '0')}:${String(state.timeBreakdown.seconds).padStart(2, '0')}
        </p>
        <p style="color: ${theme.primaryDim}; font-size: 1.1rem; margin: 0.5rem 0 0 0; text-align: center; text-shadow: 0 0 10px ${theme.primaryGlow};">
          LAST MATTER: ${formatDateLong(state.lastMatterDate)}
        </p>
      </div>

      <!-- Money Counter -->
      <div style="background: ${theme.dangerBg}; border: 1px solid ${theme.dangerDim}; padding: 1.25rem 1.5rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <p style="color: ${theme.danger}; font-size: 0.95rem; margin: 0; letter-spacing: 0.15em; text-shadow: 0 0 10px ${theme.danger};">LIFETIME_LEGAL_FEES:</p>
          <p data-money-display style="color: ${theme.danger}; font-size: 3rem; margin: 0.25rem 0 0 0; text-shadow: 0 0 25px ${theme.danger}, 0 0 40px ${theme.danger}77; letter-spacing: 0.05em;">
            $${state.displayedSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          ${state.drainEnabled ? `<p style="color: ${theme.dangerDim}; font-size: 0.9rem; margin: 0.25rem 0 0 0; text-shadow: 0 0 8px ${theme.danger};">+$${(state.drainRateCents / 100).toFixed(2)}/sec (${state.moneyMessage})</p>` : ''}
        </div>
        <button onclick="toggleMoneySettings()" style="background: transparent; border: 1px solid ${theme.dangerDim}; color: ${theme.danger}; padding: 0.6rem 1.2rem; font-size: 1rem; cursor: pointer; font-family: inherit; text-shadow: 0 0 8px ${theme.danger};">
          ${state.showMoneySettings ? 'CLOSE' : 'EDIT'}
        </button>
      </div>

      <!-- Money Settings Panel -->
      ${state.showMoneySettings ? `
        <div style="background: rgba(0,0,0,0.4); border: 1px solid ${theme.dangerDim}; padding: 1.5rem; margin-bottom: 1.5rem;">
          <p style="color: ${theme.danger}; font-size: 0.9rem; margin: 0 0 1rem 0; text-shadow: 0 0 10px ${theme.danger};">&gt; FINANCIAL DAMAGE CONFIGURATION:</p>
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
              <label style="color: ${theme.dangerDim}; font-size: 0.8rem; display: block; margin-bottom: 0.5rem; text-shadow: 0 0 8px ${theme.danger};">ENTER AMOUNT ($):</label>
              <input type="number" id="moneyInput" placeholder="e.g., 15000" step="0.01" style="width: 100%; padding: 0.75rem; background: #0a0a0a; border: 1px solid ${theme.dangerDim}; color: ${theme.danger}; font-family: inherit; font-size: 1rem; box-sizing: border-box;">
            </div>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <button onclick="setMoney()" style="flex: 1; min-width: 120px; padding: 0.75rem 1rem; background: ${theme.dangerBg}; border: 1px solid ${theme.danger}; color: ${theme.danger}; font-size: 0.85rem; cursor: pointer; font-family: inherit;">SET_TOTAL</button>
              <button onclick="addMoney()" style="flex: 1; min-width: 120px; padding: 0.75rem 1rem; background: ${theme.dangerBg}; border: 1px solid ${theme.danger}; color: ${theme.danger}; font-size: 0.85rem; cursor: pointer; font-family: inherit;">ADD_TO_TOTAL</button>
              <button onclick="resetMoney()" style="padding: 0.75rem 1rem; background: transparent; border: 1px solid ${theme.dangerDim}; color: ${theme.dangerDim}; font-size: 0.85rem; cursor: pointer; font-family: inherit;">RESET</button>
            </div>
            <p style="color: ${theme.dangerDim}; font-size: 0.75rem; margin: 0;">💡 PRO TIP: Set this to your actual lifetime legal spend for maximum emotional damage. Or lie to yourself, we won't judge.</p>
          </div>
        </div>
      ` : ''}

      <!-- Stats -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem;">
        <div style="background: rgba(0,0,0,0.3); border: 1px solid ${theme.primaryDim}; padding: 1rem; text-align: center;">
          <p style="color: ${theme.primaryDim}; font-size: 0.9rem; margin: 0; text-shadow: 0 0 8px ${theme.primaryGlow};">RECORD_MAX</p>
          <p style="color: ${theme.primary}; font-size: 2.2rem; margin: 0.5rem 0 0 0; text-shadow: 0 0 15px ${theme.primaryGlow}, 0 0 30px ${theme.primary}44;">${state.stats.max_streak}</p>
        </div>
        <div style="background: rgba(0,0,0,0.3); border: 1px solid ${theme.primaryDim}; padding: 1rem; text-align: center;">
          <p style="color: ${theme.primaryDim}; font-size: 0.9rem; margin: 0; text-shadow: 0 0 8px ${theme.primaryGlow};">COUNT_YTD</p>
          <p style="color: ${theme.danger}; font-size: 2.2rem; margin: 0.5rem 0 0 0; text-shadow: 0 0 15px ${theme.danger}, 0 0 30px ${theme.danger}77;">${String(state.stats.matters_this_year).padStart(2, '0')}</p>
        </div>
        <div style="background: rgba(0,0,0,0.3); border: 1px solid ${theme.primaryDim}; padding: 1rem; text-align: center;">
          <p style="color: ${theme.primaryDim}; font-size: 0.9rem; margin: 0; text-shadow: 0 0 8px ${theme.primaryGlow};">LIFETIME</p>
          <p style="color: ${theme.primary}; font-size: 2.2rem; margin: 0.5rem 0 0 0; text-shadow: 0 0 12px ${theme.primaryGlow}, 0 0 25px ${theme.primary}44;">${String(state.stats.total_matters).padStart(2, '0')}</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
        <button onclick="toggleDatePicker()" style="flex: 1; min-width: 150px; padding: 0.9rem 1.5rem; background: transparent; border: 1px solid ${theme.primaryDim}; color: ${theme.primaryDim}; font-size: 1.05rem; cursor: pointer; font-family: inherit; text-shadow: 0 0 8px ${theme.primaryGlow};">
          &gt; ${state.showDatePicker ? 'CANCEL' : 'SET_DATE_MANUAL'}
        </button>
        <button onclick="toggleLog()" style="flex: 1; min-width: 150px; padding: 0.9rem 1.5rem; background: transparent; border: 1px solid ${theme.primaryDim}; color: ${theme.primaryDim}; font-size: 1.05rem; cursor: pointer; font-family: inherit; text-shadow: 0 0 8px ${theme.primaryGlow};">
          &gt; ${state.showLog ? 'HIDE_LOG' : 'VIEW_LOG'} (${state.matters.length})
        </button>
        <button onclick="quickLogMatter()" style="flex: 1; min-width: 200px; padding: 0.9rem 1.5rem; background: ${theme.dangerBg}; border: 1px solid ${theme.danger}; color: ${theme.danger}; font-size: 1.05rem; cursor: pointer; font-family: inherit; text-shadow: 0 0 12px ${theme.danger};">
          &gt; LOG_MATTER_NOW
        </button>
      </div>

      <!-- Date Picker Panel -->
      ${state.showDatePicker ? `
        <div style="background: rgba(0,0,0,0.4); border: 1px solid ${theme.primary}; padding: 1.5rem; margin-bottom: 1.5rem;">
          <p style="color: ${theme.primary}; font-size: 0.9rem; margin: 0 0 1rem 0; text-shadow: 0 0 10px ${theme.primaryGlow};">&gt; MANUAL MATTER ENTRY:</p>
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
              <label style="color: ${theme.primaryDim}; font-size: 0.8rem; display: block; margin-bottom: 0.5rem; text-shadow: 0 0 8px ${theme.primaryGlow};">MATTER_DATE_TIME:</label>
              <input type="datetime-local" id="matterDate" max="${new Date().toISOString().slice(0, 16)}" style="width: 100%; padding: 0.75rem; background: #0a0a0a; border: 1px solid ${theme.primaryDim}; color: ${theme.primary}; font-family: inherit; font-size: 1rem;">
            </div>
            <div>
              <label style="color: ${theme.primaryDim}; font-size: 0.8rem; display: block; margin-bottom: 0.5rem; text-shadow: 0 0 8px ${theme.primaryGlow};">NOTE (optional):</label>
              <input type="text" id="matterNote" placeholder="e.g., Estate planning attorney" style="width: 100%; padding: 0.75rem; background: #0a0a0a; border: 1px solid ${theme.primaryDim}; color: ${theme.primary}; font-family: inherit; font-size: 1rem; box-sizing: border-box;">
            </div>
            <div>
              <label style="color: ${theme.primaryDim}; font-size: 0.8rem; display: block; margin-bottom: 0.5rem; text-shadow: 0 0 8px ${theme.primaryGlow};">COST ($, optional):</label>
              <input type="number" id="matterCost" placeholder="e.g., 5000" step="0.01" style="width: 100%; padding: 0.75rem; background: #0a0a0a; border: 1px solid ${theme.primaryDim}; color: ${theme.primary}; font-family: inherit; font-size: 1rem; box-sizing: border-box;">
            </div>
            <button onclick="submitManualMatter()" style="padding: 0.75rem 1.5rem; background: ${theme.primary}22; border: 1px solid ${theme.primary}; color: ${theme.primary}; font-size: 0.9rem; cursor: pointer; font-family: inherit;">
              &gt; CONFIRM_ENTRY
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Matter Log -->
      ${state.showLog ? `
        <div style="background: rgba(0,0,0,0.4); border: 1px solid ${theme.primary}; padding: 1.5rem; margin-bottom: 1.5rem; max-height: 400px; overflow-y: auto;">
          <p style="color: ${theme.primary}; font-size: 0.9rem; margin: 0 0 1rem 0; text-shadow: 0 0 10px ${theme.primaryGlow};">&gt; MATTER LOG (${state.matters.length} records):</p>
          ${state.matters.length === 0 ? `
            <p style="color: ${theme.primaryDim}; font-size: 0.85rem; font-style: italic;">No matters recorded. Congratulations, you're winning at life! (For now...)</p>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${state.matters.map((matter, idx) => `
                <div style="padding: 0.75rem 1rem; background: rgba(0,0,0,0.3); border: 1px solid ${theme.primaryDim}; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                  <div style="flex: 1;">
                    <p style="color: ${theme.primary}; font-size: 0.85rem; margin: 0;">
                      [${String(state.matters.length - idx).padStart(3, '0')}] ${formatDateTime(matter.matter_date)}
                    </p>
                    <p style="color: ${theme.primaryDim}; font-size: 0.8rem; margin: 0.25rem 0 0 0;">${matter.note}</p>
                    ${matter.days_since !== undefined ? `<p style="color: #666; font-size: 0.75rem; margin: 0.25rem 0 0 0;">Streak broken: ${matter.days_since} days</p>` : ''}
                    ${matter.cost ? `<p style="color: ${theme.danger}; font-size: 0.75rem; margin: 0.25rem 0 0 0;">Cost: $${parseFloat(matter.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>` : ''}
                  </div>
                  <button onclick="deleteMatterById(${matter.id})" style="background: transparent; border: 1px solid ${theme.dangerDim}; color: ${theme.danger}; padding: 0.25rem 0.5rem; font-size: 0.75rem; cursor: pointer; font-family: inherit;">DEL</button>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      ` : ''}

      <!-- Terminal Prompt -->
      <div style="margin-top: 2rem; color: ${theme.primary}; font-size: 0.85rem; text-shadow: 0 0 8px ${theme.primaryGlow};">
        <span style="color: ${theme.primaryDim}; text-shadow: 0 0 8px ${theme.primaryGlow};">user@legal-tracker:~$</span> status --watch<span id="cursor" style="margin-left: 2px;">▋</span>
      </div>

      <!-- Footer -->
      <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid ${theme.primaryDim}; color: ${theme.primaryDim}; font-size: 0.7rem;">
        <p style="margin: 0; text-shadow: 0 0 8px ${theme.primaryGlow};">YOUR_IP: ${state.currentIP || 'DETECTING...'} • STATUS: ${state.isAuthorized ? 'READ/WRITE' : 'READ_ONLY'}</p>
      </div>
    </div>
  `;

  // Start cursor blink
  startCursorBlink();
}

// ============ UI Functions ============

let cursorInterval;
function startCursorBlink() {
  if (cursorInterval) clearInterval(cursorInterval);
  cursorInterval = setInterval(() => {
    const cursor = document.getElementById('cursor');
    if (cursor) {
      cursor.style.opacity = cursor.style.opacity === '0' ? '1' : '0';
    }
  }, 530);
}

let drainInterval;
function startDrain() {
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
      moneyDisplay.textContent = '$' + state.displayedSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }, 1000);
}

function toggleDatePicker() {
  state.showDatePicker = !state.showDatePicker;
  render();
}

function toggleLog() {
  state.showLog = !state.showLog;
  render();
}

function toggleMoneySettings() {
  state.showMoneySettings = !state.showMoneySettings;
  render();
}

function toggleDrainSettings() {
  state.showDrainSettings = !state.showDrainSettings;
  render();
}

async function saveDrainSettings() {
  const enabled = document.getElementById('drainEnabled')?.checked;
  const rateCents = parseInt(document.getElementById('drainRateInput')?.value);

  if (rateCents !== undefined && (isNaN(rateCents) || rateCents < 0)) {
    alert('Please enter a valid drain rate (0 or greater)');
    return;
  }

  const success = await updateDrainSettings(enabled, rateCents);
  if (success) {
    await fetchStatus(); // Refresh to get new settings
    state.showDrainSettings = false;
    render();
  }
}

function toggleThemePicker() {
  state.showThemePicker = !state.showThemePicker;
  render();
}

function setTheme(themeKey) {
  if (THEMES[themeKey]) {
    currentThemeKey = themeKey;
    theme = THEMES[themeKey];
    localStorage.setItem('legal-tracker-theme', themeKey);
    
    // Update color variables
    const colors = getColors();
    amber = colors.amber;
    amberDim = colors.amberDim;
    amberGlow = colors.amberGlow;
    
    applyTheme();
    state.showThemePicker = false;
    render();
  }
}

async function quickLogMatter() {
  await logMatter(null, 'Quick log - no details provided', 0);
  render();
}

async function submitManualMatter() {
  const dateInput = document.getElementById('matterDate');
  const noteInput = document.getElementById('matterNote');
  const costInput = document.getElementById('matterCost');
  
  if (!dateInput.value) {
    alert('Please select a date');
    return;
  }
  
  await logMatter(
    dateInput.value + 'T12:00:00',
    noteInput.value || 'Manual entry',
    parseFloat(costInput.value) || 0
  );
  
  state.showDatePicker = false;
  render();
}

async function deleteMatterById(id) {
  if (confirm('Delete this matter? This cannot be undone.')) {
    await deleteMatter(id);
    render();
  }
}

async function setMoney() {
  const input = document.getElementById('moneyInput');
  if (input && input.value) {
    await updateLifetimeSpent(parseFloat(input.value), false);
    await fetchStatus(); // Refresh to get new drain_start_time
    state.showMoneySettings = false;
    render();
  }
}

async function addMoney() {
  const input = document.getElementById('moneyInput');
  if (input && input.value) {
    await updateLifetimeSpent(parseFloat(input.value), true);
    await fetchStatus(); // Refresh to get new drain_start_time
    render();
  }
}

async function resetMoney() {
  if (confirm('Reset lifetime spent to $0? This cannot be undone.')) {
    await updateLifetimeSpent(0, false);
    await fetchStatus(); // Refresh to get new drain_start_time
    render();
  }
}

// ============ Initialize ============

function applyTheme() {
  document.documentElement.style.setProperty('--bg-color', theme.background);
  document.documentElement.style.setProperty('--primary', theme.primary);
  document.documentElement.style.setProperty('--primary-dim', theme.primaryDim);
  document.body.style.background = theme.background;
}

async function init() {
  applyTheme();
  await fetchStatus();
  await fetchMatters();
  state.isLoading = false;
  render();
  startDrain();

  // Update time breakdown every second without full re-render
  setInterval(() => {
    updateTimeBreakdown();

    // Only update time display elements without re-rendering everything
    const timeElements = document.querySelectorAll('[data-time-display]');
    timeElements.forEach(el => {
      el.textContent = `${String(state.timeBreakdown.hours).padStart(2, '0')}:${String(state.timeBreakdown.minutes).padStart(2, '0')}:${String(state.timeBreakdown.seconds).padStart(2, '0')}`;
    });
  }, 1000);
}

init();
