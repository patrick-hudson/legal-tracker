/**
 * Unit Tests for Display Utilities Module (Backend-compatible version)
 * Tests the core utility functions that don't require DOM
 *
 * Run with: npm test
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// Set up a minimal DOM environment for escapeHtml
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;

// Now import the module (after setting up document)
const {
    isFiniteNumber,
    safeNumber,
    formatCurrency,
    formatInt,
    formatPercent,
    formatDate,
    formatDuration,
    displayOrDash,
    displayOrPlaceholder,
    escapeHtml,
    formatDrainPreview,
    formatErrorMessage,
    renderErrorBanner,
    renderEmptyState,
    renderTableCell,
    PLACEHOLDER
} = await import('../../admin/js/display-utils.js');

describe('Display Utils Module', () => {

    describe('isFiniteNumber', () => {
        it('should return true for valid numbers', () => {
            assert.strictEqual(isFiniteNumber(0), true);
            assert.strictEqual(isFiniteNumber(42), true);
            assert.strictEqual(isFiniteNumber(-100), true);
            assert.strictEqual(isFiniteNumber(3.14), true);
            assert.strictEqual(isFiniteNumber('123'), true);
            assert.strictEqual(isFiniteNumber('3.14'), true);
        });

        it('should return false for invalid values', () => {
            assert.strictEqual(isFiniteNumber(null), false);
            assert.strictEqual(isFiniteNumber(undefined), false);
            assert.strictEqual(isFiniteNumber(NaN), false);
            assert.strictEqual(isFiniteNumber(Infinity), false);
            assert.strictEqual(isFiniteNumber(-Infinity), false);
            assert.strictEqual(isFiniteNumber('abc'), false);
            assert.strictEqual(isFiniteNumber(''), false);
        });
    });

    describe('safeNumber', () => {
        it('should return number for valid inputs', () => {
            assert.strictEqual(safeNumber(42), 42);
            assert.strictEqual(safeNumber('123'), 123);
            assert.strictEqual(safeNumber(3.14), 3.14);
            assert.strictEqual(safeNumber('3.14'), 3.14);
            assert.strictEqual(safeNumber(0), 0);
        });

        it('should return null for invalid inputs', () => {
            assert.strictEqual(safeNumber(null), null);
            assert.strictEqual(safeNumber(undefined), null);
            assert.strictEqual(safeNumber(''), null);
            assert.strictEqual(safeNumber('abc'), null);
            assert.strictEqual(safeNumber(NaN), null);
            assert.strictEqual(safeNumber(Infinity), null);
        });
    });

    describe('formatCurrency', () => {
        it('should format valid currency values', () => {
            assert.strictEqual(formatCurrency(0), '$0.00');
            assert.strictEqual(formatCurrency(100), '$100.00');
            assert.strictEqual(formatCurrency(1234.56), '$1,234.56');
            assert.strictEqual(formatCurrency(1000000), '$1,000,000.00');
        });

        it('should handle cents conversion', () => {
            assert.strictEqual(formatCurrency(10000, { fromCents: true }), '$100.00');
            assert.strictEqual(formatCurrency(12345, { fromCents: true }), '$123.45');
            assert.strictEqual(formatCurrency(0, { fromCents: true }), '$0.00');
        });

        it('should return placeholder for null values', () => {
            assert.strictEqual(formatCurrency(null), PLACEHOLDER.DASH);
        });

        it('should return placeholder for undefined values', () => {
            assert.strictEqual(formatCurrency(undefined), PLACEHOLDER.DASH);
        });

        it('should return placeholder for non-numeric string values', () => {
            assert.strictEqual(formatCurrency('abc'), PLACEHOLDER.DASH);
        });

        it('should return placeholder for NaN values', () => {
            assert.strictEqual(formatCurrency(NaN), PLACEHOLDER.DASH);
        });

        it('should use custom placeholder', () => {
            assert.strictEqual(formatCurrency(null, { placeholder: 'N/A' }), 'N/A');
        });

        it('should show zero when showZero is true', () => {
            assert.strictEqual(formatCurrency(0, { showZero: true }), '$0.00');
        });

        it('should return placeholder for zero when showZero is false', () => {
            assert.strictEqual(formatCurrency(0, { showZero: false }), PLACEHOLDER.DASH);
        });
    });

    describe('formatInt', () => {
        it('should format valid integers', () => {
            assert.strictEqual(formatInt(42), '42');
            assert.strictEqual(formatInt(0), '0');
            assert.strictEqual(formatInt(-10), '-10');
            assert.strictEqual(formatInt(3.7), '3'); // Floors the value
        });

        it('should handle padding', () => {
            assert.strictEqual(formatInt(5, { padStart: 3 }), '005');
            assert.strictEqual(formatInt(42, { padStart: 5 }), '00042');
        });

        it('should return placeholder for invalid values', () => {
            assert.strictEqual(formatInt(null), PLACEHOLDER.DASH);
            assert.strictEqual(formatInt(undefined), PLACEHOLDER.DASH);
            assert.strictEqual(formatInt('abc'), PLACEHOLDER.DASH);
        });
    });

    describe('formatPercent', () => {
        it('should format valid percentages', () => {
            assert.strictEqual(formatPercent(50, 100), '50.0%');
            assert.strictEqual(formatPercent(1, 4), '25.0%');
            assert.strictEqual(formatPercent(0, 100), '0.0%');
        });

        it('should handle custom decimals', () => {
            assert.strictEqual(formatPercent(1, 3, { decimals: 2 }), '33.33%');
        });

        it('should return placeholder for divide by zero', () => {
            assert.strictEqual(formatPercent(5, 0), PLACEHOLDER.DASH);
        });

        it('should return placeholder for null numerator', () => {
            assert.strictEqual(formatPercent(null, 100), PLACEHOLDER.DASH);
        });

        it('should return placeholder for null denominator', () => {
            assert.strictEqual(formatPercent(50, null), PLACEHOLDER.DASH);
        });

        it('should return placeholder for non-numeric values', () => {
            assert.strictEqual(formatPercent('abc', 100), PLACEHOLDER.DASH);
        });
    });

    describe('formatDate', () => {
        it('should format valid dates', () => {
            const result = formatDate('2024-01-15T12:00:00.000Z', { format: 'short' });
            // The exact format depends on locale, but should contain the date
            assert.ok(result.includes('2024') || result.includes('24'));
        });

        it('should return placeholder for null', () => {
            assert.strictEqual(formatDate(null), PLACEHOLDER.DASH);
        });

        it('should return placeholder for undefined', () => {
            assert.strictEqual(formatDate(undefined), PLACEHOLDER.DASH);
        });

        it('should return placeholder for empty string', () => {
            assert.strictEqual(formatDate(''), PLACEHOLDER.DASH);
        });

        it('should return placeholder for "null" string', () => {
            assert.strictEqual(formatDate('null'), PLACEHOLDER.DASH);
        });

        it('should return placeholder for invalid date strings', () => {
            assert.strictEqual(formatDate('not a date'), PLACEHOLDER.DASH);
            assert.strictEqual(formatDate('invalid'), PLACEHOLDER.DASH);
        });
    });

    describe('formatDuration', () => {
        it('should format zero seconds', () => {
            assert.strictEqual(formatDuration(0), '0s');
        });

        it('should format seconds and minutes', () => {
            assert.strictEqual(formatDuration(65), '1m 5s');
        });

        it('should format hours, minutes, and seconds', () => {
            assert.strictEqual(formatDuration(3661), '1h 1m 1s');
        });

        it('should format hours only when no minutes/seconds', () => {
            assert.strictEqual(formatDuration(3600), '1h');
        });

        it('should format duration in clock format', () => {
            assert.strictEqual(formatDuration(0, { format: 'clock' }), '00:00:00');
            assert.strictEqual(formatDuration(3661, { format: 'clock' }), '01:01:01');
            assert.strictEqual(formatDuration(36000, { format: 'clock' }), '10:00:00');
        });

        it('should format duration in long format', () => {
            assert.strictEqual(formatDuration(0, { format: 'long' }), '0 seconds');
            assert.strictEqual(formatDuration(1, { format: 'long' }), '1 second');
            assert.strictEqual(formatDuration(60, { format: 'long' }), '1 minute');
            assert.strictEqual(formatDuration(3600, { format: 'long' }), '1 hour');
        });

        it('should return placeholder for null values', () => {
            assert.strictEqual(formatDuration(null), PLACEHOLDER.DASH);
        });

        it('should return placeholder for negative values', () => {
            assert.strictEqual(formatDuration(-1), PLACEHOLDER.DASH);
        });

        it('should return placeholder for non-numeric values', () => {
            assert.strictEqual(formatDuration('abc'), PLACEHOLDER.DASH);
        });
    });

    describe('displayOrDash', () => {
        it('should return string value for valid string inputs', () => {
            assert.strictEqual(displayOrDash('hello'), 'hello');
        });

        it('should return string value for number inputs', () => {
            assert.strictEqual(displayOrDash(42), '42');
        });

        it('should return string value for zero', () => {
            assert.strictEqual(displayOrDash(0), '0');
        });

        it('should return placeholder for null', () => {
            assert.strictEqual(displayOrDash(null), PLACEHOLDER.DASH);
        });

        it('should return placeholder for undefined', () => {
            assert.strictEqual(displayOrDash(undefined), PLACEHOLDER.DASH);
        });

        it('should return placeholder for empty string', () => {
            assert.strictEqual(displayOrDash(''), PLACEHOLDER.DASH);
        });

        it('should return placeholder for "null" string', () => {
            assert.strictEqual(displayOrDash('null'), PLACEHOLDER.DASH);
        });
    });

    describe('displayOrPlaceholder', () => {
        it('should return NOT_SET for setting context', () => {
            assert.strictEqual(displayOrPlaceholder(null, 'setting'), PLACEHOLDER.NOT_SET);
        });

        it('should return ERROR for error context', () => {
            assert.strictEqual(displayOrPlaceholder(null, 'error'), PLACEHOLDER.ERROR);
        });

        it('should return LOADING for loading context', () => {
            assert.strictEqual(displayOrPlaceholder(null, 'loading'), PLACEHOLDER.LOADING);
        });

        it('should return DASH for data context', () => {
            assert.strictEqual(displayOrPlaceholder(null, 'data'), PLACEHOLDER.DASH);
        });

        it('should return value for valid inputs', () => {
            assert.strictEqual(displayOrPlaceholder('test', 'setting'), 'test');
        });
    });

    describe('escapeHtml', () => {
        it('should escape script tags', () => {
            const result = escapeHtml('<script>alert("xss")</script>');
            assert.ok(!result.includes('<script>'));
            assert.ok(result.includes('&lt;script&gt;'));
        });

        it('should escape ampersands', () => {
            assert.strictEqual(escapeHtml('a & b'), 'a &amp; b');
        });

        it('should pass through plain text', () => {
            assert.strictEqual(escapeHtml('hello'), 'hello');
        });

        it('should return empty string for null', () => {
            assert.strictEqual(escapeHtml(null), '');
        });

        it('should return empty string for undefined', () => {
            assert.strictEqual(escapeHtml(undefined), '');
        });

        it('should return empty string for empty input', () => {
            assert.strictEqual(escapeHtml(''), '');
        });

        it('should return custom placeholder for null with placeholder', () => {
            assert.strictEqual(escapeHtml(null, 'N/A'), 'N/A');
        });
    });

    describe('formatDrainPreview', () => {
        it('should calculate drain preview correctly for 100 cents/sec', () => {
            const result = formatDrainPreview(100); // 100 cents/sec = $1/sec
            assert.strictEqual(result.perHour, '3600.00');
            assert.strictEqual(result.perDay, '86400.00');
            assert.strictEqual(result.isValid, true);
        });

        it('should handle zero rate', () => {
            const result = formatDrainPreview(0);
            assert.strictEqual(result.perHour, '0.00');
            assert.strictEqual(result.perDay, '0.00');
            assert.strictEqual(result.isValid, true);
        });

        it('should return invalid for null values', () => {
            const result = formatDrainPreview(null);
            assert.strictEqual(result.isValid, false);
            assert.strictEqual(result.perHour, PLACEHOLDER.DASH);
        });

        it('should return invalid for negative values', () => {
            const result = formatDrainPreview(-1);
            assert.strictEqual(result.isValid, false);
        });

        it('should return invalid for non-numeric values', () => {
            const result = formatDrainPreview('abc');
            assert.strictEqual(result.isValid, false);
        });
    });

    describe('formatErrorMessage', () => {
        it('should format error objects', () => {
            const error = new Error('Test error');
            assert.strictEqual(formatErrorMessage(error), 'Test error');
        });

        it('should format string errors', () => {
            assert.strictEqual(formatErrorMessage('Something went wrong'), 'Something went wrong');
        });

        it('should return fallback for null errors', () => {
            assert.strictEqual(formatErrorMessage(null), 'An unknown error occurred');
        });

        it('should return fallback for empty string errors', () => {
            assert.strictEqual(formatErrorMessage(''), 'An unknown error occurred');
        });

        it('should escape HTML in error messages', () => {
            const result = formatErrorMessage('<script>alert("xss")</script>');
            assert.ok(!result.includes('<script>'));
        });
    });

    describe('renderErrorBanner', () => {
        it('should render error banner with message', () => {
            const html = renderErrorBanner('Test error');
            assert.ok(html.includes('Test error'));
            assert.ok(html.includes('bg-red-50'));
            assert.ok(html.includes('text-red-800'));
        });

        it('should render error banner with custom prefix', () => {
            const html = renderErrorBanner('Test error', 'Custom prefix:');
            assert.ok(html.includes('Custom prefix:'));
        });

        it('should escape HTML in error message', () => {
            const html = renderErrorBanner('<script>xss</script>');
            assert.ok(!html.includes('<script>xss</script>'));
        });
    });

    describe('renderEmptyState', () => {
        it('should render empty state with message', () => {
            const html = renderEmptyState('No data available');
            assert.ok(html.includes('No data available'));
            assert.ok(html.includes('text-gray-500'));
        });

        it('should render empty state with icon', () => {
            const html = renderEmptyState('No data', '📭');
            assert.ok(html.includes('📭'));
        });

        it('should escape HTML in message', () => {
            const html = renderEmptyState('<script>xss</script>');
            assert.ok(!html.includes('<script>xss</script>'));
        });
    });

    describe('renderTableCell', () => {
        it('should render text cells', () => {
            assert.strictEqual(renderTableCell('hello'), 'hello');
            assert.strictEqual(renderTableCell(null), PLACEHOLDER.DASH);
        });

        it('should render currency cells', () => {
            assert.strictEqual(renderTableCell(100, { type: 'currency' }), '$100.00');
            assert.strictEqual(renderTableCell(10000, { type: 'currency', fromCents: true }), '$100.00');
        });

        it('should render date cells', () => {
            const result = renderTableCell('2024-01-15T12:00:00Z', { type: 'date' });
            assert.ok(result.includes('2024') || result.includes('24'));
        });

        it('should render number cells', () => {
            assert.strictEqual(renderTableCell(42, { type: 'number' }), '42');
        });

        it('should escape HTML in text cells', () => {
            const result = renderTableCell('<script>xss</script>');
            assert.ok(!result.includes('<script>'));
        });
    });

    describe('PLACEHOLDER constants', () => {
        it('should have DASH placeholder', () => {
            assert.ok(PLACEHOLDER.DASH);
            assert.strictEqual(PLACEHOLDER.DASH, '—');
        });

        it('should have NOT_SET placeholder', () => {
            assert.ok(PLACEHOLDER.NOT_SET);
        });

        it('should have NO_DATA placeholder', () => {
            assert.ok(PLACEHOLDER.NO_DATA);
        });

        it('should have UNKNOWN placeholder', () => {
            assert.ok(PLACEHOLDER.UNKNOWN);
        });

        it('should have ERROR placeholder', () => {
            assert.ok(PLACEHOLDER.ERROR);
        });

        it('should have LOADING placeholder', () => {
            assert.ok(PLACEHOLDER.LOADING);
        });
    });
});
