// Theme Definitions
// 10 themes: 8 CRT, 1 Modern, 1 Retro

export const THEMES = {
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

export const DEFAULT_THEME = 'amber';
