/**
 * ItemId Value Object
 *
 * Wraps a string identifier for an Item.
 * Immutable; equality is by value, not reference.
 *
 * Layer: Domain → Value Objects
 * Imports: domain only
 */

import { DomainException } from '../exceptions/DomainException.js';

export class ItemId {
  /** @type {string} */
  #value;

  /**
   * @param {string} value  UUID or any non-empty string identifier.
   */
  constructor(value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new DomainException('ItemId must be a non-empty string.');
    }
    this.#value = value.trim();
  }

  get value() {
    return this.#value;
  }

  /**
   * Value-based equality.
   * @param {ItemId} other
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof ItemId)) {
      return false;
    }
    return this.#value === other.#value;
  }

  toString() {
    return this.#value;
  }
}
