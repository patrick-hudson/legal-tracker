/**
 * Input validation helpers
 * Extracted from server.js for modularity
 */

import { INPUT_LIMITS } from './constants.js';

/**
 * Validate string length
 * @param {string} value - The string to validate
 * @param {string} fieldName - Name of the field (for error message)
 * @param {number} maxLength - Maximum allowed length
 * @throws {Error} If string exceeds maximum length
 */
export function validateStringLength(value, fieldName, maxLength) {
  if (value && value.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
}

/**
 * Validate username length
 * @param {string} username - The username to validate
 * @throws {Error} If username exceeds maximum length
 */
export function validateUsername(username) {
  validateStringLength(username, 'Username', INPUT_LIMITS.username);
}

/**
 * Validate password length
 * @param {string} password - The password to validate
 * @throws {Error} If password exceeds maximum length
 */
export function validatePassword(password) {
  validateStringLength(password, 'Password', INPUT_LIMITS.password);
}

/**
 * Validate email length
 * @param {string} email - The email to validate
 * @throws {Error} If email exceeds maximum length
 */
export function validateEmail(email) {
  validateStringLength(email, 'Email', INPUT_LIMITS.email);
}

/**
 * Validate note length
 * @param {string} note - The note to validate
 * @throws {Error} If note exceeds maximum length
 */
export function validateNote(note) {
  validateStringLength(note, 'Note', INPUT_LIMITS.note);
}

/**
 * Validate confirmation string length
 * @param {string} confirmationString - The confirmation string to validate
 * @throws {Error} If confirmation string exceeds maximum length
 */
export function validateConfirmationString(confirmationString) {
  validateStringLength(confirmationString, 'Confirmation string', INPUT_LIMITS.confirmationString);
}
