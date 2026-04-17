/**
 * Tests for the ItemId value object.
 */

import { ItemId } from '../ItemId.js';
import { DomainException } from '../../exceptions/DomainException.js';

describe('ItemId value object', () => {
  it('stores a valid string id', () => {
    const id = new ItemId('abc-123');
    expect(id.value).toBe('abc-123');
  });

  it('trims surrounding whitespace', () => {
    const id = new ItemId('  abc-123  ');
    expect(id.value).toBe('abc-123');
  });

  it('throws DomainException for an empty string', () => {
    expect(() => new ItemId('')).toThrow(DomainException);
  });

  it('throws DomainException for whitespace-only string', () => {
    expect(() => new ItemId('   ')).toThrow(DomainException);
  });

  it('returns true for equals() with same value', () => {
    const a = new ItemId('x');
    const b = new ItemId('x');
    expect(a.equals(b)).toBe(true);
  });

  it('returns false for equals() with different value', () => {
    const a = new ItemId('x');
    const b = new ItemId('y');
    expect(a.equals(b)).toBe(false);
  });

  it('returns false for equals() with non-ItemId argument', () => {
    const a = new ItemId('x');
    expect(a.equals('x')).toBe(false);
  });

  it('toString() returns the raw value', () => {
    const id = new ItemId('hello');
    expect(id.toString()).toBe('hello');
  });
});
