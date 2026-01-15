// Render Orchestrator
// Routes to appropriate renderer based on current theme

import { state, getTheme } from '../state.js';
import { renderCRT } from './crt.js';
import { renderModern } from './modern.js';
import { renderRetro } from './retro.js';

export function render() {
  const app = document.getElementById('app');

  // Show loading screen while initializing
  if (state.isLoading) {
    app.innerHTML = `
      <div class="loading-screen">
        <div class="loading-content">
          <p class="loading-title">INITIALIZING SYSTEM...</p>
          <p class="loading-subtitle">Connecting to backend...</p>
        </div>
      </div>
    `;
    return;
  }

  const theme = getTheme();

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

  // Default: CRT themes (8 themes)
  renderCRT();
}
