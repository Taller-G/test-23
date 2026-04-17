/**
 * DeleteItemUseCase
 *
 * Removes an Item permanently.
 *
 * Layer: Application → Use Cases
 * Imports: application + domain only
 */

import { ApplicationException } from '../exceptions/ApplicationException.js';

export class DeleteItemUseCase {
  /**
   * @param {import('../../domain/repositories/IItemRepository.js').IItemRepository} itemRepository
   */
  constructor(itemRepository) {
    this.#itemRepository = itemRepository;
  }

  /** @type {import('../../domain/repositories/IItemRepository.js').IItemRepository} */
  #itemRepository;

  /**
   * @param {{ id: string }} dto
   * @returns {Promise<{ id: string }>}
   */
  async execute({ id }) {
    const item = await this.#itemRepository.findById(id);

    if (!item) {
      throw new ApplicationException(`Item with id "${id}" was not found.`, 'NOT_FOUND');
    }

    await this.#itemRepository.delete(id);

    return { id };
  }
}
