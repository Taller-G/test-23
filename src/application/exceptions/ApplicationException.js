/**
 * ApplicationException
 *
 * Raised by use cases when an operation cannot be completed.
 * Carries a machine-readable error code so the interface layer
 * can map it to the appropriate HTTP status or UI message.
 *
 * Layer: Application → Exceptions
 * Imports: application only
 */

export class ApplicationException extends Error {
  /**
   * @param {string} message  Human-readable description.
   * @param {string} code     Machine-readable code, e.g. 'NOT_FOUND', 'CONFLICT'.
   */
  constructor(message, code = 'APPLICATION_ERROR') {
    super(message);
    this.name = 'ApplicationException';
    this.code = code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApplicationException);
    }
  }
}
