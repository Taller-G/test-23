/**
 * IItemRepository — Repository Interface
 *
 * Defines the contract that any Item persistence adapter must satisfy.
 * This file lives in domain so that application-layer use cases can depend
 * on it without knowing about any database or storage detail.
 *
 * Layer: Domain → Repository Interfaces
 * Imports: domain only
 *
 * Concrete implementations belong in src/infrastructure/.
 */

export class IItemRepository {
  /**
   * Persist a new Item.
   * @param {import('../entities/Item.js').Item} item
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async save(_item) {
    throw new Error('IItemRepository.save() is not implemented.');
  }

  /**
   * Find an Item by its string id.
   * @param {string} id
   * @returns {Promise<import('../entities/Item.js').Item | null>}
   */
  // eslint-disable-next-line no-unused-vars
  async findById(_id) {
    throw new Error('IItemRepository.findById() is not implemented.');
  }

  /**
   * Return every Item.
   * @returns {Promise<import('../entities/Item.js').Item[]>}
   */
  async findAll() {
    throw new Error('IItemRepository.findAll() is not implemented.');
  }

  /**
   * Overwrite an existing Item's persisted state.
   * @param {import('../entities/Item.js').Item} item
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async update(_item) {
    throw new Error('IItemRepository.update() is not implemented.');
  }

  /**
   * Remove an Item by id.
   * @param {string} id
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async delete(_id) {
    throw new Error('IItemRepository.delete() is not implemented.');
  }
}
