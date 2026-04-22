/**
 * AtsResult entity unit tests.
 *
 * Covers:
 *  • constructor invariant enforcement
 *  • score rounding
 *  • tier classification thresholds
 *  • foundKeywords / missingKeywords normalisation
 *  • detectedSections — defaults, valid values, and invariant violations
 *  • toSnapshot immutability and shape
 */

import { AtsResult } from '../AtsResult.js';
import { DomainException } from '../../exceptions/DomainException.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ALL_SECTIONS_TRUE  = { experience: true,  education: true,  skills: true,  contact: true  };
const ALL_SECTIONS_FALSE = { experience: false, education: false, skills: false, contact: false };

// ── Valid construction ────────────────────────────────────────────────────────

describe('AtsResult', () => {
  test('creates a valid AtsResult with all fields', () => {
    const result = new AtsResult({
      score: 72,
      foundKeywords: ['React', 'TypeScript'],
      missingKeywords: ['GraphQL'],
      detectedSections: ALL_SECTIONS_TRUE,
    });

    expect(result.score).toBe(72);
    expect(result.foundKeywords).toEqual(['react', 'typescript']);
    expect(result.missingKeywords).toEqual(['graphql']);
    expect(result.detectedSections).toEqual(ALL_SECTIONS_TRUE);
  });

  test('defaults detectedSections to all-false when omitted', () => {
    const result = new AtsResult({
      score: 50,
      foundKeywords: [],
      missingKeywords: [],
    });
    expect(result.detectedSections).toEqual(ALL_SECTIONS_FALSE);
  });

  test('defaults detectedSections to all-false when passed as undefined', () => {
    const result = new AtsResult({
      score: 50,
      foundKeywords: [],
      missingKeywords: [],
      detectedSections: undefined,
    });
    expect(result.detectedSections).toEqual(ALL_SECTIONS_FALSE);
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
    const result = new AtsResult({
      score: 100,
      foundKeywords: ['node'],
      missingKeywords: [],
    });
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
    const r = new AtsResult({
      score: 50,
      foundKeywords: [],
      missingKeywords: ['python'],
    });
    const copy = r.missingKeywords;
    copy.push('hacked');
    expect(r.missingKeywords).toEqual(['python']);
  });

  // ── detectedSections accessor ───────────────────────────────────────────────

  test('detectedSections getter returns a copy — mutation does not affect the entity', () => {
    const r = new AtsResult({
      score: 80,
      foundKeywords: [],
      missingKeywords: [],
      detectedSections: ALL_SECTIONS_TRUE,
    });
    const copy = r.detectedSections;
    copy.experience = false; // mutate the copy
    expect(r.detectedSections.experience).toBe(true); // entity unchanged
  });

  test('detectedSections supports partial true / false flags', () => {
    const r = new AtsResult({
      score: 60,
      foundKeywords: [],
      missingKeywords: [],
      detectedSections: { experience: true, education: false, skills: true, contact: false },
    });
    expect(r.detectedSections.experience).toBe(true);
    expect(r.detectedSections.education).toBe(false);
    expect(r.detectedSections.skills).toBe(true);
    expect(r.detectedSections.contact).toBe(false);
  });

  // ── toSnapshot ──────────────────────────────────────────────────────────────

  test('toSnapshot returns a plain object with all fields including detectedSections', () => {
    const r = new AtsResult({
      score: 80,
      foundKeywords: ['aws'],
      missingKeywords: ['azure'],
      detectedSections: ALL_SECTIONS_TRUE,
    });
    const snap = r.toSnapshot();
    expect(snap).toEqual({
      score: 80,
      tier: 'high',
      foundKeywords: ['aws'],
      missingKeywords: ['azure'],
      detectedSections: ALL_SECTIONS_TRUE,
    });
  });

  test('toSnapshot detectedSections is a plain object (not frozen entity ref)', () => {
    const r = new AtsResult({
      score: 50,
      foundKeywords: [],
      missingKeywords: [],
      detectedSections: ALL_SECTIONS_FALSE,
    });
    const snap = r.toSnapshot();
    expect(snap.detectedSections).toEqual(ALL_SECTIONS_FALSE);
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

  test('throws DomainException when detectedSections is not a plain object', () => {
    expect(
      () =>
        new AtsResult({
          score: 50,
          foundKeywords: [],
          missingKeywords: [],
          detectedSections: 'invalid',
        })
    ).toThrow(DomainException);
  });

  test('throws DomainException when detectedSections is an array', () => {
    expect(
      () =>
        new AtsResult({
          score: 50,
          foundKeywords: [],
          missingKeywords: [],
          detectedSections: [true, false, true, false],
        })
    ).toThrow(DomainException);
  });

  test('throws DomainException when a detectedSections flag is not boolean', () => {
    expect(
      () =>
        new AtsResult({
          score: 50,
          foundKeywords: [],
          missingKeywords: [],
          detectedSections: { experience: 1, education: false, skills: false, contact: false },
        })
    ).toThrow(DomainException);
  });
});
