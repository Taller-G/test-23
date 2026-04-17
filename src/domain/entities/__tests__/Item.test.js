/**
 * Tests for the Item domain entity.
 */

import { Item } from '../Item.js';
import { DomainException } from '../../exceptions/DomainException.js';

function makeItem(overrides = {}) {
  return new Item({
    id: 'test-id-1',
    name: 'Buy milk',
    description: 'Full-fat, 2 litres',
    ...overrides,
  });
}

describe('Item entity', () => {
  describe('construction', () => {
    it('creates a valid item with required fields', () => {
      const item = makeItem();
      expect(item.id).toBe('test-id-1');
      expect(item.name).toBe('Buy milk');
      expect(item.description).toBe('Full-fat, 2 litres');
      expect(item.completed).toBe(false);
    });

    it('trims whitespace from name', () => {
      const item = makeItem({ name: '  Buy milk  ' });
      expect(item.name).toBe('Buy milk');
    });

    it('throws DomainException when name is empty', () => {
      expect(() => makeItem({ name: '' })).toThrow(DomainException);
    });

    it('throws DomainException when name exceeds 120 characters', () => {
      expect(() => makeItem({ name: 'a'.repeat(121) })).toThrow(DomainException);
    });

    it('throws DomainException when description exceeds 500 characters', () => {
      expect(() => makeItem({ description: 'x'.repeat(501) })).toThrow(DomainException);
    });

    it('defaults completed to false', () => {
      const item = makeItem();
      expect(item.completed).toBe(false);
    });

    it('accepts a pre-set completed value of true', () => {
      const item = makeItem({ completed: true });
      expect(item.completed).toBe(true);
    });
  });

  describe('complete()', () => {
    it('marks the item as completed', () => {
      const item = makeItem();
      item.complete();
      expect(item.completed).toBe(true);
    });

    it('throws DomainException when called on an already-completed item', () => {
      const item = makeItem({ completed: true });
      expect(() => item.complete()).toThrow(DomainException);
    });

    it('updates updatedAt timestamp', () => {
      const item = makeItem();
      const before = item.updatedAt;
      item.complete();
      expect(item.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('reopen()', () => {
    it('marks a completed item as pending', () => {
      const item = makeItem({ completed: true });
      item.reopen();
      expect(item.completed).toBe(false);
    });

    it('throws DomainException when called on a pending item', () => {
      const item = makeItem();
      expect(() => item.reopen()).toThrow(DomainException);
    });
  });

  describe('rename()', () => {
    it('updates the name', () => {
      const item = makeItem();
      item.rename('Buy oat milk');
      expect(item.name).toBe('Buy oat milk');
    });

    it('throws DomainException for an empty new name', () => {
      const item = makeItem();
      expect(() => item.rename('')).toThrow(DomainException);
    });
  });

  describe('toSnapshot()', () => {
    it('returns a plain object with all fields', () => {
      const item = makeItem();
      const snap = item.toSnapshot();
      expect(snap).toMatchObject({
        id: 'test-id-1',
        name: 'Buy milk',
        description: 'Full-fat, 2 litres',
        completed: false,
      });
      expect(snap.createdAt).toBeInstanceOf(Date);
      expect(snap.updatedAt).toBeInstanceOf(Date);
    });
  });
});
