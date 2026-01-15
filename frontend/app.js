// Legal Matter Tracker - Frontend
// Vanilla JS for maximum compatibility and zero build step

import { DISPLAY } from './utils.js';
import { state, pageLoadStart } from './state.js';
import { fetchStatus, fetchMatters, fetchVersion, checkAuthStatus } from './api.js';
import { render } from './render/index.js';
import { updateTimeBreakdown } from './render/shared.js';
import {
  applyTheme,
  startDrain,
  setRenderCallback,
  bindHandlersToWindow
} from './handlers.js';

// Set the render callback for handlers to use
setRenderCallback(render);

// Bind all handlers to window for onclick attributes in HTML
bindHandlersToWindow();

// Apply initial theme
applyTheme();

// Initialize application
async function init() {
  // Fetch all data in parallel
  await Promise.all([
    fetchStatus(),
    fetchMatters(),
    fetchVersion(),
    checkAuthStatus()
  ]);

  // Calculate page load time
  state.pageLoadTime = Math.round(performance.now() - pageLoadStart);

  // Mark loading complete
  state.isLoading = false;

  // Render the UI
  render();

  // Start the money drain counter
  startDrain();

  // Update time breakdown every second without full re-render
  setInterval(() => {
    updateTimeBreakdown();

    // Only update time display elements without re-rendering everything
    const timeElements = document.querySelectorAll('[data-time-display]');
    timeElements.forEach(el => {
      el.textContent = DISPLAY.formatTimeBreakdown(state.timeBreakdown);
    });
  }, 1000);
}

// Start the application
init();
