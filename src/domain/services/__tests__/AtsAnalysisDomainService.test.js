/**
 * AtsAnalysisDomainService unit tests.
 *
 * Covers:
 *  • basic keyword detection
 *  • case-insensitive matching
 *  • whole-word boundary matching (single tokens)
 *  • multi-word phrase matching
 *  • score calculation
 *  • keyword deduplication
 *  • empty inputs / edge cases
 *  • invalid inputs throw DomainException
 */

import { AtsAnalysisDomainService } from '../AtsAnalysisDomainService.js';
import { AtsResult } from '../../entities/AtsResult.js';
import { DomainException } from '../../exceptions/DomainException.js';

describe('AtsAnalysisDomainService', () => {
  let service;

  beforeEach(() => {
    service = new AtsAnalysisDomainService();
  });

  // ── Basic detection ─────────────────────────────────────────────────────────

  test('finds a keyword present in the CV text', () => {
    const result = service.analyse('I have experience with React and Node.js.', ['React']);
    expect(result.foundKeywords).toContain('react');
    expect(result.missingKeywords).not.toContain('react');
  });

  test('marks a keyword as missing when absent from the CV text', () => {
    const result = service.analyse('I have experience with React.', ['Python']);
    expect(result.missingKeywords).toContain('python');
    expect(result.foundKeywords).not.toContain('python');
  });

  // ── Case insensitivity ──────────────────────────────────────────────────────

  test('matches keywords case-insensitively', () => {
    const result = service.analyse('Proficient in TYPESCRIPT and graphQL.', [
      'typescript',
      'GraphQL',
    ]);
    expect(result.foundKeywords).toEqual(expect.arrayContaining(['typescript', 'graphql']));
    expect(result.missingKeywords).toHaveLength(0);
  });

  // ── Whole-word boundary ─────────────────────────────────────────────────────

  test('does NOT match "java" inside "javascript"', () => {
    const result = service.analyse('Experienced JavaScript developer.', ['java']);
    expect(result.missingKeywords).toContain('java');
  });

  test('matches "java" when it appears as a standalone word', () => {
    const result = service.analyse('I know Java and JavaScript.', ['java']);
    expect(result.foundKeywords).toContain('java');
  });

  test('does NOT match "react" inside "reactive"', () => {
    const result = service.analyse('Reactive programming enthusiast.', ['react']);
    expect(result.missingKeywords).toContain('react');
  });

  // ── Multi-word phrases ──────────────────────────────────────────────────────

  test('matches a multi-word phrase present in the CV', () => {
    const result = service.analyse(
      'Led team leadership initiatives across departments.',
      ['team leadership']
    );
    expect(result.foundKeywords).toContain('team leadership');
  });

  test('marks a multi-word phrase as missing when absent', () => {
    const result = service.analyse('I enjoy agile development.', ['team leadership']);
    expect(result.missingKeywords).toContain('team leadership');
  });

  // ── Score calculation ───────────────────────────────────────────────────────

  test('score is 100 when all keywords are found', () => {
    const result = service.analyse('React TypeScript Node.js', [
      'React',
      'TypeScript',
      'Node.js',
    ]);
    expect(result.score).toBe(100);
  });

  test('score is 0 when no keywords are found', () => {
    const result = service.analyse('I love painting and poetry.', ['React', 'AWS', 'Docker']);
    expect(result.score).toBe(0);
  });

  test('score is 50 when half the keywords are found', () => {
    const result = service.analyse('I am a React developer with no cloud experience.', ['React', 'AWS']);
    expect(result.score).toBe(50);
  });

  // ── Deduplication ───────────────────────────────────────────────────────────

  test('deduplicates repeated keywords before analysis', () => {
    const result = service.analyse('React developer with React experience.', [
      'React',
      'react',
      'REACT',
    ]);
    // After dedup, only one keyword → 1 found, score = 100
    expect(result.score).toBe(100);
    expect(result.foundKeywords).toHaveLength(1);
  });

  // ── Returns AtsResult instance ──────────────────────────────────────────────

  test('returns an instance of AtsResult', () => {
    const result = service.analyse('Some text', ['keyword']);
    expect(result).toBeInstanceOf(AtsResult);
  });

  // ── Empty keyword list ──────────────────────────────────────────────────────

  test('returns score 0 when keyword list is empty', () => {
    const result = service.analyse('I have many skills.', []);
    expect(result.score).toBe(0);
    expect(result.foundKeywords).toHaveLength(0);
    expect(result.missingKeywords).toHaveLength(0);
  });

  test('ignores blank keyword strings', () => {
    const result = service.analyse('React developer.', ['React', '  ', '']);
    // Only "react" is a valid keyword after filtering
    expect(result.score).toBe(100);
    expect(result.foundKeywords).toHaveLength(1);
  });

  // ── Invalid inputs ──────────────────────────────────────────────────────────

  test('throws DomainException when cvText is not a string', () => {
    expect(() => service.analyse(null, ['React'])).toThrow(DomainException);
  });

  test('throws DomainException when keywords is not an array', () => {
    expect(() => service.analyse('some text', 'React')).toThrow(DomainException);
  });
});
