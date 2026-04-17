/**
 * Item Entity
 *
 * Core domain entity representing an item managed by the application.
 * Protects its own invariants in the constructor — no invalid state is possible.
 *
 * Layer: Domain → Entities
 * Imports: domain only (ItemId value object, DomainException)
 */

import { ItemId } from '../value-objects/ItemId.js';
import { DomainException } from '../exceptions/DomainException.js';

export class Item {
  /** @type {ItemId} */
  #id;

  /** @type {string} */
  #name;

  /** @type {string} */
  #description;

  /** @type {boolean} */
  #completed;

  /** @type {Date} */
  #createdAt;

  /** @type {Date} */
  #updatedAt;

  /**
   * @param {object} props
   * @param {string} props.id
   * @param {string} props.name
   * @param {string} props.description
   * @param {boolean} [props.completed]
   * @param {Date}    [props.createdAt]
   * @param {Date}    [props.updatedAt]
   */
  constructor({ id, name, description, completed = false, createdAt, updatedAt }) {
    this.#id = new ItemId(id);
    this.#setName(name);
    this.#setDescription(description);
    this.#completed = completed;
    this.#createdAt = createdAt instanceof Date ? createdAt : new Date();
    this.#updatedAt = updatedAt instanceof Date ? updatedAt : new Date();
  }

  // ── Private Guards ──────────────────────────────────────────────────────────

  #setName(name) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new DomainException('Item name must be a non-empty string.');
    }
    if (name.trim().length > 120) {
      throw new DomainException('Item name must not exceed 120 characters.');
    }
    this.#name = name.trim();
  }

  #setDescription(description) {
    if (typeof description !== 'string') {
      throw new DomainException('Item description must be a string.');
    }
    if (description.length > 500) {
      throw new DomainException('Item description must not exceed 500 characters.');
    }
    this.#description = description;
  }

  // ── Public Accessors ────────────────────────────────────────────────────────

  get id() {
    return this.#id.value;
  }

  get name() {
    return this.#name;
  }

  get description() {
    return this.#description;
  }

  get completed() {
    return this.#completed;
  }

  get createdAt() {
    return this.#createdAt;
  }

  get updatedAt() {
    return this.#updatedAt;
  }

  // ── Domain Behaviour ────────────────────────────────────────────────────────

  /**
   * Mark this item as completed.
   * @throws {DomainException} if already completed.
   */
  complete() {
    if (this.#completed) {
      throw new DomainException('Item is already completed.');
    }
    this.#completed = true;
    this.#updatedAt = new Date();
  }

  /**
   * Reopen a completed item.
   * @throws {DomainException} if not yet completed.
   */
  reopen() {
    if (!this.#completed) {
      throw new DomainException('Item is not completed and cannot be reopened.');
    }
    this.#completed = false;
    this.#updatedAt = new Date();
  }

  /**
   * Rename the item.
   * @param {string} newName
   */
  rename(newName) {
    this.#setName(newName);
    this.#updatedAt = new Date();
  }

  /**
   * Update the description.
   * @param {string} newDescription
   */
  updateDescription(newDescription) {
    this.#setDescription(newDescription);
    this.#updatedAt = new Date();
  }

  /**
   * Plain-object snapshot — safe to pass across layer boundaries.
   * @returns {object}
   */
  toSnapshot() {
    return {
      id: this.#id.value,
      name: this.#name,
      description: this.#description,
      completed: this.#completed,
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt,
    };
  }
}
