/**
 * CreateItemUseCase
 *
 * Orchestrates the creation of a new Item:
 *   1. Loads existing items (for uniqueness check).
 *   2. Delegates duplicate-name guard to ItemDomainService.
 *   3. Constructs a new Item entity.
 *   4. Persists via the repository interface.
 *   5. Returns an ItemDTO.
 *
 * Layer: Application → Use Cases
 * Imports: application + domain only
 */

import { Item } from '../../domain/entities/Item.js';
import { ItemDomainService } from '../../domain/services/ItemDomainService.js';
import { ItemMapper } from '../mappers/ItemMapper.js';
import { generateId } from '../utils/generateId.js';

export class CreateItemUseCase {
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
   * @param {{ name: string, description?: string }} dto
   * @returns {Promise<import('../dtos/ItemDTO.js').ItemDTO>}
   */
  async execute({ name, description = '' }) {
    const existing = await this.#itemRepository.findAll();

    // Domain rule: names must be unique
    this.#domainService.assertNoDuplicateName(existing, name);

    const item = new Item({
      id: generateId(),
      name,
      description,
    });

    await this.#itemRepository.save(item);

    return ItemMapper.toDTO(item);
  }
}
