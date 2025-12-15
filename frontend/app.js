// Legal Incident Tracker - Frontend
// Vanilla JS for maximum compatibility and zero build step

const API_BASE = window.location.origin + '/api';

// Config
const DRAIN_RATE = 0.50; // $/sec for the creeping counter
const DRAIN_ENABLED = true;

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
  }
};

// ============ CONFIGURATION ============
// Set your default theme here: 'amber', 'green', 'blue', 'pink', 'red', 'white', 'purple', 'orange'
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

// State
let state = {
  daysSince: 0,
  lastIncidentDate: new Date(),
  lifetimeSpent: 0,
  displayedSpent: 0,
  incidents: [],
  stats: { total_incidents: 0, incidents_this_year: 0, max_streak: 0 },
  currentIP: null,
  isAuthorized: true,
  isLoading: true,
  showDatePicker: false,
  showLog: false,
  showMoneySettings: false,
  showThemePicker: false,
  authError: false,
  sessionMessage: SESSION_MESSAGES[Math.floor(Math.random() * SESSION_MESSAGES.length)]
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
    state.lastIncidentDate = new Date(data.last_incident_date);
    state.lifetimeSpent = data.lifetime_spent;
    state.displayedSpent = data.lifetime_spent;
    state.stats = data.stats;
    state.currentIP = data.your_ip;
    state.isAuthorized = true; // We'll find out on write attempts
    
    return data;
  } catch (err) {
    console.error('Failed to fetch status:', err);
  }
}

async function fetchIncidents() {
  try {
    const res = await fetch(`${API_BASE}/incidents`);
    state.incidents = await res.json();
  } catch (err) {
    console.error('Failed to fetch incidents:', err);
  }
}

async function logIncident(incidentDate, note, cost) {
  try {
    const res = await fetch(`${API_BASE}/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        incident_date: incidentDate || new Date().toISOString(), 
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
    await fetchIncidents();
    return true;
  } catch (err) {
    console.error('Failed to log incident:', err);
    return false;
  }
}

async function deleteIncident(id) {
  try {
    const res = await fetch(`${API_BASE}/incidents/${id}`, { method: 'DELETE' });
    
    if (res.status === 403) {
      state.authError = true;
      render();
      setTimeout(() => { state.authError = false; render(); }, 3000);
      return false;
    }
    
    await fetchStatus();
    await fetchIncidents();
    return true;
  } catch (err) {
    console.error('Failed to delete incident:', err);
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

async function setLastIncidentDate(date) {
  try {
    const res = await fetch(`${API_BASE}/settings/last-incident-date`, {
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
    console.error('Failed to set last incident date:', err);
    return false;
  }
}

// ============ Render Functions ============

function getStatusText() {
  if (state.daysSince === 0) return 'ALERT';
  if (state.daysSince < 7) return 'WARNING';
  if (state.daysSince < 30) return 'MONITOR';
  return 'NOMINAL';
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).replace(/\//g, '-');
}

function formatDateLong(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }).toUpperCase();
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

    <div style="padding: 2rem; max-width: 900px; margin: 0 auto; position: relative; z-index: 10;">
      
      <!-- Header -->
      <div style="border-bottom: 1px solid ${theme.primaryDim}; padding-bottom: 1rem; margin-bottom: 2rem;">
        <div style="color: ${theme.primary}; font-size: 1.2rem; letter-spacing: 0.1em; text-shadow: 0 0 10px ${theme.primaryGlow};">
          ╔═══════════════════════════════════════════════════════════╗
        </div>
        <div style="color: ${theme.primary}; font-size: 1.2rem; padding: 0.5rem 0; text-shadow: 0 0 10px ${theme.primaryGlow}; letter-spacing: 0.05em;">
          ║ LEGAL INCIDENT MONITORING SYSTEM v3.2.1 • ${theme.name.padEnd(12, ' ')} ║
        </div>
        <div style="color: ${theme.primary}; font-size: 1.2rem; letter-spacing: 0.1em; text-shadow: 0 0 10px ${theme.primaryGlow};">
          ╚═══════════════════════════════════════════════════════════╝
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
          &gt; DAYS SINCE LAST LEGAL REPRESENTATION AGREEMENT:
        </p>
        <div style="text-align: center; padding: 2rem 0;">
          <span style="font-size: clamp(6rem, 25vw, 12rem); color: ${theme.primary}; text-shadow: 0 0 40px ${theme.primaryGlow}, 0 0 80px ${theme.primary}77, 0 0 100px ${theme.primary}44; letter-spacing: 0.1em;">
            ${String(state.daysSince).padStart(2, '0')}
          </span>
        </div>
        <p style="color: ${theme.primaryDim}; font-size: 1.1rem; margin: 1rem 0 0 0; text-align: center; text-shadow: 0 0 10px ${theme.primaryGlow};">
          LAST INCIDENT: ${formatDateLong(state.lastIncidentDate)}
        </p>
      </div>

      <!-- Money Counter -->
      <div style="background: ${theme.dangerBg}; border: 1px solid ${theme.dangerDim}; padding: 1.25rem 1.5rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <p style="color: ${theme.danger}; font-size: 0.95rem; margin: 0; letter-spacing: 0.15em; text-shadow: 0 0 10px ${theme.danger};">LIFETIME_LEGAL_FEES:</p>
          <p style="color: ${theme.danger}; font-size: 3rem; margin: 0.25rem 0 0 0; text-shadow: 0 0 25px ${theme.danger}, 0 0 40px ${theme.danger}77; letter-spacing: 0.05em;">
            $${state.displayedSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          ${DRAIN_ENABLED ? `<p style="color: ${theme.dangerDim}; font-size: 0.9rem; margin: 0.25rem 0 0 0; text-shadow: 0 0 8px ${theme.danger};">+$${DRAIN_RATE.toFixed(2)}/sec (it never really stops)</p>` : ''}
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
            <p style="color: ${theme.dangerDim}; font-size: 0.75rem; margin: 0;">TIP: Set this to your actual lifetime legal spend for maximum emotional damage.</p>
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
          <p style="color: ${theme.danger}; font-size: 2.2rem; margin: 0.5rem 0 0 0; text-shadow: 0 0 15px ${theme.danger}, 0 0 30px ${theme.danger}77;">${String(state.stats.incidents_this_year).padStart(2, '0')}</p>
        </div>
        <div style="background: rgba(0,0,0,0.3); border: 1px solid ${theme.primaryDim}; padding: 1rem; text-align: center;">
          <p style="color: ${theme.primaryDim}; font-size: 0.9rem; margin: 0; text-shadow: 0 0 8px ${theme.primaryGlow};">LIFETIME</p>
          <p style="color: ${theme.primary}; font-size: 2.2rem; margin: 0.5rem 0 0 0; text-shadow: 0 0 12px ${theme.primaryGlow}, 0 0 25px ${theme.primary}44;">${String(state.stats.total_incidents).padStart(2, '0')}</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
        <button onclick="toggleDatePicker()" style="flex: 1; min-width: 150px; padding: 0.9rem 1.5rem; background: transparent; border: 1px solid ${theme.primaryDim}; color: ${theme.primaryDim}; font-size: 1.05rem; cursor: pointer; font-family: inherit; text-shadow: 0 0 8px ${theme.primaryGlow};">
          &gt; ${state.showDatePicker ? 'CANCEL' : 'SET_DATE_MANUAL'}
        </button>
        <button onclick="toggleLog()" style="flex: 1; min-width: 150px; padding: 0.9rem 1.5rem; background: transparent; border: 1px solid ${theme.primaryDim}; color: ${theme.primaryDim}; font-size: 1.05rem; cursor: pointer; font-family: inherit; text-shadow: 0 0 8px ${theme.primaryGlow};">
          &gt; ${state.showLog ? 'HIDE_LOG' : 'VIEW_LOG'} (${state.incidents.length})
        </button>
        <button onclick="quickLogIncident()" style="flex: 1; min-width: 200px; padding: 0.9rem 1.5rem; background: ${theme.dangerBg}; border: 1px solid ${theme.danger}; color: ${theme.danger}; font-size: 1.05rem; cursor: pointer; font-family: inherit; text-shadow: 0 0 12px ${theme.danger};">
          &gt; LOG_INCIDENT_NOW
        </button>
      </div>

      <!-- Date Picker Panel -->
      ${state.showDatePicker ? `
        <div style="background: rgba(0,0,0,0.4); border: 1px solid ${theme.primary}; padding: 1.5rem; margin-bottom: 1.5rem;">
          <p style="color: ${theme.primary}; font-size: 0.9rem; margin: 0 0 1rem 0; text-shadow: 0 0 10px ${theme.primaryGlow};">&gt; MANUAL INCIDENT ENTRY:</p>
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
              <label style="color: ${theme.primaryDim}; font-size: 0.8rem; display: block; margin-bottom: 0.5rem; text-shadow: 0 0 8px ${theme.primaryGlow};">INCIDENT_DATE:</label>
              <input type="date" id="incidentDate" max="${new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 0.75rem; background: #0a0a0a; border: 1px solid ${theme.primaryDim}; color: ${theme.primary}; font-family: inherit; font-size: 1rem;">
            </div>
            <div>
              <label style="color: ${theme.primaryDim}; font-size: 0.8rem; display: block; margin-bottom: 0.5rem; text-shadow: 0 0 8px ${theme.primaryGlow};">NOTE (optional):</label>
              <input type="text" id="incidentNote" placeholder="e.g., Estate planning attorney" style="width: 100%; padding: 0.75rem; background: #0a0a0a; border: 1px solid ${theme.primaryDim}; color: ${theme.primary}; font-family: inherit; font-size: 1rem; box-sizing: border-box;">
            </div>
            <div>
              <label style="color: ${theme.primaryDim}; font-size: 0.8rem; display: block; margin-bottom: 0.5rem; text-shadow: 0 0 8px ${theme.primaryGlow};">COST ($, optional):</label>
              <input type="number" id="incidentCost" placeholder="e.g., 5000" step="0.01" style="width: 100%; padding: 0.75rem; background: #0a0a0a; border: 1px solid ${theme.primaryDim}; color: ${theme.primary}; font-family: inherit; font-size: 1rem; box-sizing: border-box;">
            </div>
            <button onclick="submitManualIncident()" style="padding: 0.75rem 1.5rem; background: ${theme.primary}22; border: 1px solid ${theme.primary}; color: ${theme.primary}; font-size: 0.9rem; cursor: pointer; font-family: inherit;">
              &gt; CONFIRM_ENTRY
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Incident Log -->
      ${state.showLog ? `
        <div style="background: rgba(0,0,0,0.4); border: 1px solid ${theme.primary}; padding: 1.5rem; margin-bottom: 1.5rem; max-height: 400px; overflow-y: auto;">
          <p style="color: ${theme.primary}; font-size: 0.9rem; margin: 0 0 1rem 0; text-shadow: 0 0 10px ${theme.primaryGlow};">&gt; INCIDENT LOG (${state.incidents.length} records):</p>
          ${state.incidents.length === 0 ? `
            <p style="color: ${theme.primaryDim}; font-size: 0.85rem; font-style: italic;">No incidents recorded. Keep it that way!</p>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${state.incidents.map((incident, idx) => `
                <div style="padding: 0.75rem 1rem; background: rgba(0,0,0,0.3); border: 1px solid ${theme.primaryDim}; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                  <div style="flex: 1;">
                    <p style="color: ${theme.primary}; font-size: 0.85rem; margin: 0;">
                      [${String(state.incidents.length - idx).padStart(3, '0')}] ${formatDate(incident.incident_date)}
                    </p>
                    <p style="color: ${theme.primaryDim}; font-size: 0.8rem; margin: 0.25rem 0 0 0;">${incident.note}</p>
                    ${incident.days_since !== undefined ? `<p style="color: #666; font-size: 0.75rem; margin: 0.25rem 0 0 0;">Streak broken: ${incident.days_since} days</p>` : ''}
                    ${incident.cost ? `<p style="color: ${theme.danger}; font-size: 0.75rem; margin: 0.25rem 0 0 0;">Cost: $${parseFloat(incident.cost).toLocaleString()}</p>` : ''}
                  </div>
                  <button onclick="deleteIncidentById(${incident.id})" style="background: transparent; border: 1px solid ${theme.dangerDim}; color: ${theme.danger}; padding: 0.25rem 0.5rem; font-size: 0.75rem; cursor: pointer; font-family: inherit;">DEL</button>
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
  if (!DRAIN_ENABLED) return;
  if (drainInterval) clearInterval(drainInterval);
  drainInterval = setInterval(() => {
    state.displayedSpent += DRAIN_RATE;
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

async function quickLogIncident() {
  await logIncident(null, 'Quick log - no details provided', 0);
  render();
}

async function submitManualIncident() {
  const dateInput = document.getElementById('incidentDate');
  const noteInput = document.getElementById('incidentNote');
  const costInput = document.getElementById('incidentCost');
  
  if (!dateInput.value) {
    alert('Please select a date');
    return;
  }
  
  await logIncident(
    dateInput.value + 'T12:00:00',
    noteInput.value || 'Manual entry',
    parseFloat(costInput.value) || 0
  );
  
  state.showDatePicker = false;
  render();
}

async function deleteIncidentById(id) {
  if (confirm('Delete this incident? This cannot be undone.')) {
    await deleteIncident(id);
    render();
  }
}

async function setMoney() {
  const input = document.getElementById('moneyInput');
  if (input && input.value) {
    await updateLifetimeSpent(parseFloat(input.value), false);
    state.showMoneySettings = false;
    render();
  }
}

async function addMoney() {
  const input = document.getElementById('moneyInput');
  if (input && input.value) {
    await updateLifetimeSpent(parseFloat(input.value), true);
    render();
  }
}

async function resetMoney() {
  if (confirm('Reset lifetime spent to $0? This cannot be undone.')) {
    await updateLifetimeSpent(0, false);
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
  await fetchIncidents();
  state.isLoading = false;
  render();
  startDrain();
}

init();
