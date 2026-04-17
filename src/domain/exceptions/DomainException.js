/**
 * DomainException
 *
 * Base class for all domain-layer exceptions.
 * Use this (or a subclass) when a domain invariant is violated.
 *
 * Layer: Domain → Exceptions
 * Imports: domain only
 */

export class DomainException extends Error {
  /**
   * @param {string} message  Human-readable description of the violation.
   */
  constructor(message) {
    super(message);
    this.name = 'DomainException';

    // Maintains proper prototype chain in transpiled environments.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainException);
    }
  }
}
