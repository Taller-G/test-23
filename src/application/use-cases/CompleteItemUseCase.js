/**
 * CompleteItemUseCase
 *
 * Marks an existing Item as completed.
 *
 * Layer: Application → Use Cases
 * Imports: application + domain only
 */

import { ItemMapper } from '../mappers/ItemMapper.js';
import { ApplicationException } from '../exceptions/ApplicationException.js';

export class CompleteItemUseCase {
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

    // Domain entity enforces the invariant (throws DomainException if already done)
    item.complete();

    await this.#itemRepository.update(item);

    return ItemMapper.toDTO(item);
  }
}
