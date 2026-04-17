/**
 * ItemStatus Value Object
 *
 * Represents the allowed status values for an Item.
 * Enforces the closed set of valid statuses at the domain boundary.
 *
 * Layer: Domain → Value Objects
 * Imports: domain only
 */

import { DomainException } from '../exceptions/DomainException.js';

const ALLOWED_STATUSES = Object.freeze(['pending', 'completed']);

export class ItemStatus {
  /** @type {string} */
  #value;

  /**
   * @param {string} value  One of: 'pending' | 'completed'
   */
  constructor(value) {
    if (!ALLOWED_STATUSES.includes(value)) {
      throw new DomainException(
        `Invalid ItemStatus "${value}". Allowed: ${ALLOWED_STATUSES.join(', ')}.`
      );
    }
    this.#value = value;
  }

  get value() {
    return this.#value;
  }

  get isPending() {
    return this.#value === 'pending';
  }

  get isCompleted() {
    return this.#value === 'completed';
  }

  /**
   * Value-based equality.
   * @param {ItemStatus} other
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof ItemStatus)) {
      return false;
    }
    return this.#value === other.#value;
  }

  toString() {
    return this.#value;
  }

  /** Factory helpers */
  static pending() {
    return new ItemStatus('pending');
  }

  static completed() {
    return new ItemStatus('completed');
  }

  static fromBoolean(completed) {
    return completed ? ItemStatus.completed() : ItemStatus.pending();
  }
}
