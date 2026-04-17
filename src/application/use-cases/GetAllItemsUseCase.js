/**
 * GetAllItemsUseCase
 *
 * Retrieves all items, sorted by the domain service ordering rules.
 *
 * Layer: Application → Use Cases
 * Imports: application + domain only
 */

import { ItemDomainService } from '../../domain/services/ItemDomainService.js';
import { ItemMapper } from '../mappers/ItemMapper.js';

export class GetAllItemsUseCase {
  /**
   * @param {import('../../domain/repositories/IItemRepository.js').IItemRepository} itemRepository
   */
  constructor(itemRepository) {
    this.#itemRepository = itemRepository;
    this.#domainService = new ItemDomainService();
  }

  /** @type {import('../../domain/repositories/IItemRepository.js').IItemRepository} */
  #itemRepository;

  /** @type {ItemDomainService} */
  #domainService;

  /**
   * @returns {Promise<import('../dtos/ItemDTO.js').ItemDTO[]>}
   */
  async execute() {
    const items = await this.#itemRepository.findAll();
    const sorted = this.#domainService.sort(items);
    return ItemMapper.toDTOList(sorted);
  }
}
