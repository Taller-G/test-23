/**
 * Tests for InMemoryItemRepository.
 */

import { InMemoryItemRepository } from '../InMemoryItemRepository.js';
import { Item } from '../../../domain/entities/Item.js';

function makeItem(id = 'id-1', name = 'Test Item') {
  return new Item({ id, name, description: 'desc' });
}

describe('InMemoryItemRepository', () => {
  let repo;

  beforeEach(() => {
    repo = new InMemoryItemRepository();
  });

  describe('save() / findById()', () => {
    it('saves an item and retrieves it by id', async () => {
      const item = makeItem();
      await repo.save(item);
      const found = await repo.findById('id-1');
      expect(found).not.toBeNull();
      expect(found.id).toBe('id-1');
    });

    it('returns null for an unknown id', async () => {
      const found = await repo.findById('ghost');
      expect(found).toBeNull();
    });
  });

  describe('findAll()', () => {
    it('returns an empty array initially', async () => {
      expect(await repo.findAll()).toEqual([]);
    });

    it('returns all saved items', async () => {
      await repo.save(makeItem('1', 'A'));
      await repo.save(makeItem('2', 'B'));
      expect(await repo.findAll()).toHaveLength(2);
    });
  });

  describe('update()', () => {
    it('replaces the stored item', async () => {
      const item = makeItem();
      await repo.save(item);
      item.complete();
      await repo.update(item);
      const found = await repo.findById('id-1');
      expect(found.completed).toBe(true);
    });

    it('throws when updating a non-existent item', async () => {
      const item = makeItem('ghost');
      await expect(repo.update(item)).rejects.toThrow();
    });
  });

  describe('delete()', () => {
    it('removes the item from the store', async () => {
      await repo.save(makeItem());
      await repo.delete('id-1');
      expect(await repo.findById('id-1')).toBeNull();
    });

    it('throws when deleting a non-existent item', async () => {
      await expect(repo.delete('ghost')).rejects.toThrow();
    });
  });

  describe('clear()', () => {
    it('empties the store', async () => {
      await repo.save(makeItem('1', 'A'));
      await repo.save(makeItem('2', 'B'));
      repo.clear();
      expect(await repo.findAll()).toHaveLength(0);
    });
  });
});
