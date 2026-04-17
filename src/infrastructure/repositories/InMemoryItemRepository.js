/**
 * InMemoryItemRepository
 *
 * Fulfils the IItemRepository contract using a plain JavaScript Map.
 * Suitable for development, testing, and browser-only deployments.
 * Replace with a real persistence adapter (localStorage, IndexedDB, REST API)
 * without touching any other layer.
 *
 * Layer: Infrastructure → Repository Implementations
 * Imports: domain + application (implements IItemRepository, uses Item entity)
 */

import { IItemRepository } from '../../domain/repositories/IItemRepository.js';

export class InMemoryItemRepository extends IItemRepository {
  /** @type {Map<string, import('../../domain/entities/Item.js').Item>} */
  #store = new Map();

  /**
   * @param {import('../../domain/entities/Item.js').Item} item
   * @returns {Promise<void>}
   */
  async save(item) {
    this.#store.set(item.id, item);
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../../domain/entities/Item.js').Item | null>}
   */
  async findById(id) {
    return this.#store.get(id) ?? null;
  }

  /**
   * @returns {Promise<import('../../domain/entities/Item.js').Item[]>}
   */
  async findAll() {
    return Array.from(this.#store.values());
  }

  /**
   * @param {import('../../domain/entities/Item.js').Item} item
   * @returns {Promise<void>}
   */
  async update(item) {
    if (!this.#store.has(item.id)) {
      throw new Error(`InMemoryItemRepository: no item with id "${item.id}" to update.`);
    }
    this.#store.set(item.id, item);
  }

  /**
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    if (!this.#store.has(id)) {
      throw new Error(`InMemoryItemRepository: no item with id "${id}" to delete.`);
    }
    this.#store.delete(id);
  }

  /**
   * Clears all persisted items.
   * Primarily useful in test teardown.
   */
  clear() {
    this.#store.clear();
  }

  /**
   * Current item count — convenience for tests.
   * @returns {number}
   */
  get size() {
    return this.#store.size;
  }
}
