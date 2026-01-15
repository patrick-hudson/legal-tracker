// Display Utilities
// Safe formatting helpers for consistent display

export const DISPLAY = {
  DASH: '—',

  /**
   * Safely convert value to number, return null if invalid
   */
  safeNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
  },

  /**
   * Format currency safely
   * @param {*} value - Value in dollars (or cents if fromCents=true)
   * @param {Object} options - { fromCents: false, placeholder: '—' }
   */
  formatCurrency(value, options = {}) {
    const { fromCents = false, placeholder = this.DASH } = options;
    const num = this.safeNumber(value);
    if (num === null) return placeholder;
    const dollars = fromCents ? num / 100 : num;
    return '$' + dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  /**
   * Format drain rate display safely
   */
  formatDrainRate(centsPerSecond) {
    const num = this.safeNumber(centsPerSecond);
    if (num === null || num < 0) return { perSec: this.DASH, perMin: this.DASH, perHour: this.DASH };
    const dollarsPerSecond = num / 100;
    return {
      perSec: dollarsPerSecond.toFixed(2),
      perMin: (dollarsPerSecond * 60).toFixed(2),
      perHour: (dollarsPerSecond * 3600).toFixed(2)
    };
  },

  /**
   * Safely format matter cost for display
   * Note: Frontend receives cost in dollars from API, not cents
   */
  formatMatterCost(cost) {
    const num = this.safeNumber(cost);
    if (num === null) return null; // Return null to allow conditional rendering
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  /**
   * Safely display a value or return placeholder
   */
  displayOrDash(value, placeholder = this.DASH) {
    if (value === null || value === undefined || value === '' || value === 'null') return placeholder;
    return String(value);
  },

  /**
   * Format time breakdown (HH:MM:SS) with validity check
   */
  formatTimeBreakdown(breakdown) {
    if (!breakdown || breakdown.isValid === false) return this.DASH;
    const h = String(breakdown.hours ?? 0).padStart(2, '0');
    const m = String(breakdown.minutes ?? 0).padStart(2, '0');
    const s = String(breakdown.seconds ?? 0).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
};
