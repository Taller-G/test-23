/**
 * ItemDomainService — Domain Service
 *
 * Houses domain logic that spans multiple entities or value objects
 * and does not naturally belong to a single entity.
 *
 * Layer: Domain → Services
 * Imports: domain only
 */

import { DomainException } from '../exceptions/DomainException.js';

export class ItemDomainService {
  /**
   * Validate that a batch of items does not contain duplicate names
   * (case-insensitive). Throws if a collision is found.
   *
   * @param {import('../entities/Item.js').Item[]} existingItems
   * @param {string} candidateName
   */
  assertNoDuplicateName(existingItems, candidateName) {
    const normalised = candidateName.trim().toLowerCase();
    const collision = existingItems.some((item) => item.name.toLowerCase() === normalised);

    if (collision) {
      throw new DomainException(
        `An item named "${candidateName}" already exists. Names must be unique.`
      );
    }
  }

  /**
   * Return only the items that are pending (not completed).
   *
   * @param {import('../entities/Item.js').Item[]} items
   * @returns {import('../entities/Item.js').Item[]}
   */
  filterPending(items) {
    return items.filter((item) => !item.completed);
  }

  /**
   * Return only the items that are completed.
   *
   * @param {import('../entities/Item.js').Item[]} items
   * @returns {import('../entities/Item.js').Item[]}
   */
  filterCompleted(items) {
    return items.filter((item) => item.completed);
  }

  /**
   * Sort items: pending first, then completed; within each group by name asc.
   *
   * @param {import('../entities/Item.js').Item[]} items
   * @returns {import('../entities/Item.js').Item[]}
   */
  sort(items) {
    return [...items].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });
  }
}
