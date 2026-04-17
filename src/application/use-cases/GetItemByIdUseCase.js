/**
 * GetItemByIdUseCase
 *
 * Fetches a single Item by its identifier.
 *
 * Layer: Application → Use Cases
 * Imports: application + domain only
 */

import { ItemMapper } from '../mappers/ItemMapper.js';
import { ApplicationException } from '../exceptions/ApplicationException.js';

export class GetItemByIdUseCase {
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
   * @returns {Promise<import('../dtos/ItemDTO.js').ItemDTO>}
   */
  async execute({ id }) {
    const item = await this.#itemRepository.findById(id);

    if (!item) {
      throw new ApplicationException(`Item with id "${id}" was not found.`, 'NOT_FOUND');
    }

    return ItemMapper.toDTO(item);
  }
}
