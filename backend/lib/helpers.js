/**
 * Request helpers
 * Extracted from server.js for modularity
 */

/**
 * Get client IP address from request
 * Handles proxy headers (x-forwarded-for, x-real-ip)
 * @param {Object} request - Fastify request object
 * @returns {string} Client IP address
 */
export function getClientIP(request) {
  // Check various headers for real IP (when behind proxy)
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIP = request.headers['x-real-ip'];
  if (realIP) {
    return realIP;
  }
  return request.ip;
}
