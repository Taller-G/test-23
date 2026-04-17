/**
 * Tests for the ItemDomainService.
 */

import { ItemDomainService } from '../ItemDomainService.js';
import { Item } from '../../entities/Item.js';
import { DomainException } from '../../exceptions/DomainException.js';

function makeItem(id, name, completed = false) {
  return new Item({ id, name, description: '', completed });
}

describe('ItemDomainService', () => {
  let service;

  beforeEach(() => {
    service = new ItemDomainService();
  });

  describe('assertNoDuplicateName()', () => {
    it('does not throw when the name is unique', () => {
      const items = [makeItem('1', 'Apples')];
      expect(() => service.assertNoDuplicateName(items, 'Bananas')).not.toThrow();
    });

    it('throws DomainException when a duplicate name exists (case-insensitive)', () => {
      const items = [makeItem('1', 'Apples')];
      expect(() => service.assertNoDuplicateName(items, 'apples')).toThrow(DomainException);
    });

    it('does not throw for an empty list', () => {
      expect(() => service.assertNoDuplicateName([], 'Anything')).not.toThrow();
    });
  });

  describe('filterPending()', () => {
    it('returns only pending items', () => {
      const items = [makeItem('1', 'A', false), makeItem('2', 'B', true)];
      expect(service.filterPending(items)).toHaveLength(1);
      expect(service.filterPending(items)[0].name).toBe('A');
    });
  });

  describe('filterCompleted()', () => {
    it('returns only completed items', () => {
      const items = [makeItem('1', 'A', false), makeItem('2', 'B', true)];
      expect(service.filterCompleted(items)).toHaveLength(1);
      expect(service.filterCompleted(items)[0].name).toBe('B');
    });
  });

  describe('sort()', () => {
    it('puts pending items before completed items', () => {
      const items = [makeItem('1', 'A', true), makeItem('2', 'B', false)];
      const sorted = service.sort(items);
      expect(sorted[0].name).toBe('B');
      expect(sorted[1].name).toBe('A');
    });

    it('sorts alphabetically within each group', () => {
      const items = [makeItem('1', 'Zebra', false), makeItem('2', 'Apple', false)];
      const sorted = service.sort(items);
      expect(sorted[0].name).toBe('Apple');
      expect(sorted[1].name).toBe('Zebra');
    });

    it('does not mutate the original array', () => {
      const items = [makeItem('1', 'A', true), makeItem('2', 'B', false)];
      service.sort(items);
      expect(items[0].name).toBe('A');
    });
  });
});
