/**
 * generateId — Application Utility
 *
 * Produces a unique string identifier.
 * Uses the browser's crypto.randomUUID() when available,
 * otherwise falls back to a uuid-v4-style generator using Math.random().
 *
 * Layer: Application → Utils
 * Imports: application only (no third-party deps)
 */

/**
 * @returns {string}  A UUID-v4 string.
 */
export function generateId() {
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  // Fallback — RFC 4122 v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}
