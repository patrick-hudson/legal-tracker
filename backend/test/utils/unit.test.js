import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Unit Tests', () => {
  describe('Date calculations', () => {
    it('should calculate days between dates correctly', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-10');
      const daysDiff = Math.floor((date2 - date1) / (1000 * 60 * 60 * 24));

      assert.strictEqual(daysDiff, 9);
    });

    it('should handle same date', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-01');
      const daysDiff = Math.floor((date2 - date1) / (1000 * 60 * 60 * 24));

      assert.strictEqual(daysDiff, 0);
    });
  });

  describe('Cost calculations', () => {
    it('should sum costs correctly', () => {
      const costs = [100.50, 200.75, 50.25];
      const total = costs.reduce((sum, cost) => sum + cost, 0);

      assert.strictEqual(total, 351.50);
    });

    it('should handle zero costs', () => {
      const costs = [0, 0, 0];
      const total = costs.reduce((sum, cost) => sum + cost, 0);

      assert.strictEqual(total, 0);
    });

    it('should convert dollars to cents correctly', () => {
      const dollars = 123.45;
      const cents = Math.round(dollars * 100);

      assert.strictEqual(cents, 12345);
    });

    it('should convert cents to dollars correctly', () => {
      const cents = 12345;
      const dollars = cents / 100;

      assert.strictEqual(dollars, 123.45);
    });

    it('should handle decimal precision', () => {
      const testCases = [
        { dollars: 200.50, cents: 20050 },
        { dollars: 2300.00, cents: 230000 },
        { dollars: 99.99, cents: 9999 },
        { dollars: 2327.87, cents: 232787 }
      ];

      testCases.forEach(({ dollars, cents }) => {
        assert.strictEqual(Math.round(dollars * 100), cents);
        assert.strictEqual(cents / 100, dollars);
      });
    });
  });

  describe('String parsing', () => {
    it('should parse float from string', () => {
      const value = parseFloat('123.45');
      assert.strictEqual(value, 123.45);
    });

    it('should handle invalid float', () => {
      const value = parseFloat('invalid');
      assert.ok(isNaN(value));
    });

    it('should parse comma-separated IPs', () => {
      const ipString = '192.168.1.1,10.0.0.1,127.0.0.1';
      const ips = ipString.split(',').map(ip => ip.trim());

      assert.strictEqual(ips.length, 3);
      assert.strictEqual(ips[0], '192.168.1.1');
      assert.strictEqual(ips[2], '127.0.0.1');
    });
  });

  describe('Environment variable handling', () => {
    it('should handle boolean env vars', () => {
      const testCases = [
        { value: 'true', expected: true },
        { value: 'false', expected: false },
        { value: 'TRUE', expected: false },
        { value: '1', expected: false },
        { value: '', expected: false }
      ];

      testCases.forEach(({ value, expected }) => {
        const result = value === 'true';
        assert.strictEqual(result, expected);
      });
    });
  });
});
