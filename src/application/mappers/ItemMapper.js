/**
 * ItemMapper
 *
 * Converts between domain entities and application-layer DTOs.
 *
 * Layer: Application → Mappers
 * Imports: application/domain only
 */

import { ItemDTO } from '../dtos/ItemDTO.js';

export class ItemMapper {
  /**
   * Convert a domain Item entity → ItemDTO.
   * @param {import('../../domain/entities/Item.js').Item} item
   * @returns {ItemDTO}
   */
  static toDTO(item) {
    const snap = item.toSnapshot();
    return new ItemDTO({
      id: snap.id,
      name: snap.name,
      description: snap.description,
      completed: snap.completed,
      status: snap.completed ? 'completed' : 'pending',
      createdAt: snap.createdAt.toISOString(),
      updatedAt: snap.updatedAt.toISOString(),
    });
  }

  /**
   * Convert an array of Item entities → array of ItemDTOs.
   * @param {import('../../domain/entities/Item.js').Item[]} items
   * @returns {ItemDTO[]}
   */
  static toDTOList(items) {
    return items.map(ItemMapper.toDTO);
  }
}
