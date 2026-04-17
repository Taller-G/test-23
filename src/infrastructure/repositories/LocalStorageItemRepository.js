/**
 * LocalStorageItemRepository
 *
 * Fulfils the IItemRepository contract using the browser's localStorage API.
 * All items are serialised as JSON under a single key.
 *
 * Layer: Infrastructure → Repository Implementations
 * Imports: domain + application
 */

import { IItemRepository } from '../../domain/repositories/IItemRepository.js';
import { Item } from '../../domain/entities/Item.js';

const STORAGE_KEY = 'dasdasdsa::items';

export class LocalStorageItemRepository extends IItemRepository {
  // ── Private Helpers ─────────────────────────────────────────────────────────

  /** @returns {object[]} */
  #readRaw() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /** @param {object[]} records */
  #writeRaw(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  /**
   * Rehydrate a raw plain-object record into a domain Item entity.
   * @param {object} record
   * @returns {Item}
   */
  #toEntity(record) {
    return new Item({
      id: record.id,
      name: record.name,
      description: record.description,
      completed: record.completed,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  }

  // ── IItemRepository implementation ──────────────────────────────────────────

  async save(item) {
    const records = this.#readRaw();
    records.push(item.toSnapshot());
    this.#writeRaw(records);
  }

  async findById(id) {
    const record = this.#readRaw().find((r) => r.id === id);
    return record ? this.#toEntity(record) : null;
  }

  async findAll() {
    return this.#readRaw().map((r) => this.#toEntity(r));
  }

  async update(item) {
    const records = this.#readRaw();
    const idx = records.findIndex((r) => r.id === item.id);

    if (idx === -1) {
      throw new Error(`LocalStorageItemRepository: no item with id "${item.id}" to update.`);
    }

    records[idx] = item.toSnapshot();
    this.#writeRaw(records);
  }

  async delete(id) {
    const records = this.#readRaw();
    const filtered = records.filter((r) => r.id !== id);

    if (filtered.length === records.length) {
      throw new Error(`LocalStorageItemRepository: no item with id "${id}" to delete.`);
    }

    this.#writeRaw(filtered);
  }

  /** Remove all stored items. */
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
}
