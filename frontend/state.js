// State Management
// Centralized application state

import { THEMES, DEFAULT_THEME } from './themes.js';

// Session messages - randomized on page load
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

// Track page load time for performance metrics
export const pageLoadStart = performance.now();

// Application state
export const state = {
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
  timeBreakdown: { hours: 0, minutes: 0, seconds: 0 },
  // Version info
  version: 'loading...',
  commitHash: null,
  commitHashShort: null,
  commitPushed: false,
  nodeVersion: null,
  environment: null,
  pageLoadTime: 0
};

// Theme state - load from localStorage or use default
export let currentThemeKey = localStorage.getItem('legal-matters-theme') || DEFAULT_THEME;
export let theme = THEMES[currentThemeKey] || THEMES[DEFAULT_THEME];

// Update theme state
export function setThemeState(themeKey) {
  if (THEMES[themeKey]) {
    currentThemeKey = themeKey;
    theme = THEMES[themeKey];
    localStorage.setItem('legal-matters-theme', themeKey);
  }
}

// Getter for current theme (for modules that need fresh value after changes)
export function getTheme() {
  return theme;
}

// Getter for current theme key
export function getThemeKey() {
  return currentThemeKey;
}

// Status message constants
export const STATUS_MESSAGES = {
  ALERT: ['ALERT', 'OH NO', 'AGAIN?!', 'REALLY?', 'NOT AGAIN', 'YIKES'],
  WARNING: ['WARNING', 'TOO SOON', 'CAREFUL', 'DANGER ZONE', 'UH OH'],
  MONITOR: ['MONITOR', 'FRAGILE', 'HOLDING ON', 'BARELY SAFE'],
  NOMINAL: ['NOMINAL', 'LAWYER-FREE', 'WINNING', 'SAFE...ISH', 'FREE (FOR NOW)']
};

// 90s Retro Messages
export const RETRO_MESSAGES = {
  header: [
    '~*~UNDER CONSTRUCTION~*~ Since 1996',
    '☆.·:*¨¨*:·. LEGAL MATTERS .·:*¨¨*:·.☆',
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
