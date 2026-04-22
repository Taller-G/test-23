/**
 * AtsResult entity unit tests.
 *
 * Covers:
 *  • constructor invariant enforcement
 *  • score rounding
 *  • tier classification thresholds
 *  • foundKeywords / missingKeywords normalisation
 *  • toSnapshot immutability
 */

import { AtsResult } from '../AtsResult.js';
import { DomainException } from '../../exceptions/DomainException.js';

describe('AtsResult', () => {
  // ── Valid construction ──────────────────────────────────────────────────────

  test('creates a valid AtsResult with all fields', () => {
    const result = new AtsResult({
      score: 72,
      foundKeywords: ['React', 'TypeScript'],
      missingKeywords: ['GraphQL'],
    });

    expect(result.score).toBe(72);
    expect(result.foundKeywords).toEqual(['react', 'typescript']);
    expect(result.missingKeywords).toEqual(['graphql']);
  });

  test('rounds fractional scores to the nearest integer', () => {
    const result = new AtsResult({
      score: 66.6,
      foundKeywords: [],
      missingKeywords: [],
    });
    expect(result.score).toBe(67);
  });

  test('accepts score of 0', () => {
    const result = new AtsResult({ score: 0, foundKeywords: [], missingKeywords: [] });
    expect(result.score).toBe(0);
  });

  test('accepts score of 100', () => {
    const result = new AtsResult({ score: 100, foundKeywords: ['node'], missingKeywords: [] });
    expect(result.score).toBe(100);
  });

  // ── Tier classification ─────────────────────────────────────────────────────

  test('tier is "low" when score < 50', () => {
    const r = new AtsResult({ score: 49, foundKeywords: [], missingKeywords: [] });
    expect(r.tier).toBe('low');
  });

  test('tier is "low" when score is 0', () => {
    const r = new AtsResult({ score: 0, foundKeywords: [], missingKeywords: [] });
    expect(r.tier).toBe('low');
  });

  test('tier is "medium" when score is exactly 50', () => {
    const r = new AtsResult({ score: 50, foundKeywords: [], missingKeywords: [] });
    expect(r.tier).toBe('medium');
  });

  test('tier is "medium" when score is 74', () => {
    const r = new AtsResult({ score: 74, foundKeywords: [], missingKeywords: [] });
    expect(r.tier).toBe('medium');
  });

  test('tier is "high" when score is exactly 75', () => {
    const r = new AtsResult({ score: 75, foundKeywords: [], missingKeywords: [] });
    expect(r.tier).toBe('high');
  });

  test('tier is "high" when score is 100', () => {
    const r = new AtsResult({ score: 100, foundKeywords: [], missingKeywords: [] });
    expect(r.tier).toBe('high');
  });

  // ── Keyword normalisation ───────────────────────────────────────────────────

  test('normalises keywords to lowercase and trims whitespace', () => {
    const r = new AtsResult({
      score: 50,
      foundKeywords: ['  React  ', 'NODE.JS'],
      missingKeywords: ['  GraphQL '],
    });
    expect(r.foundKeywords).toEqual(['react', 'node.js']);
    expect(r.missingKeywords).toEqual(['graphql']);
  });

  test('foundKeywords getter returns a copy — mutation does not affect the entity', () => {
    const r = new AtsResult({ score: 50, foundKeywords: ['react'], missingKeywords: [] });
    const copy = r.foundKeywords;
    copy.push('hacked');
    expect(r.foundKeywords).toEqual(['react']);
  });

  test('missingKeywords getter returns a copy', () => {
    const r = new AtsResult({ score: 50, foundKeywords: [], missingKeywords: ['python'] });
    const copy = r.missingKeywords;
    copy.push('hacked');
    expect(r.missingKeywords).toEqual(['python']);
  });

  // ── toSnapshot ──────────────────────────────────────────────────────────────

  test('toSnapshot returns a plain object with all fields', () => {
    const r = new AtsResult({
      score: 80,
      foundKeywords: ['aws'],
      missingKeywords: ['azure'],
    });
    const snap = r.toSnapshot();
    expect(snap).toEqual({
      score: 80,
      tier: 'high',
      foundKeywords: ['aws'],
      missingKeywords: ['azure'],
    });
  });

  // ── Invariant violations ────────────────────────────────────────────────────

  test('throws DomainException when score is below 0', () => {
    expect(
      () => new AtsResult({ score: -1, foundKeywords: [], missingKeywords: [] })
    ).toThrow(DomainException);
  });

  test('throws DomainException when score is above 100', () => {
    expect(
      () => new AtsResult({ score: 101, foundKeywords: [], missingKeywords: [] })
    ).toThrow(DomainException);
  });

  test('throws DomainException when score is NaN', () => {
    expect(
      () => new AtsResult({ score: NaN, foundKeywords: [], missingKeywords: [] })
    ).toThrow(DomainException);
  });

  test('throws DomainException when foundKeywords is not an array', () => {
    expect(
      () => new AtsResult({ score: 50, foundKeywords: 'react', missingKeywords: [] })
    ).toThrow(DomainException);
  });

  test('throws DomainException when missingKeywords is not an array', () => {
    expect(
      () => new AtsResult({ score: 50, foundKeywords: [], missingKeywords: null })
    ).toThrow(DomainException);
  });

  test('throws DomainException when a keyword is an empty string', () => {
    expect(
      () => new AtsResult({ score: 50, foundKeywords: [''], missingKeywords: [] })
    ).toThrow(DomainException);
  });
});
