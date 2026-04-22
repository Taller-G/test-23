/**
 * KeywordExtractorDomainService unit tests.
 *
 * Covers:
 *  • Returns an array of strings
 *  • Filters English stopwords
 *  • Filters Spanish stopwords
 *  • Case-insensitive deduplication (keywords are lowercased)
 *  • Short / purely-numeric tokens are excluded
 *  • Multi-word technical phrases are captured as single keywords
 *  • Phrase tokens are not re-tokenised individually
 *  • Empty / whitespace-only input yields empty array
 *  • Invalid input throws DomainException
 *  • Tokens with internal punctuation relevant to tech are preserved (c++, c#, .net)
 *  • Result is returned in < 500 ms (performance acceptance criterion)
 */

import { KeywordExtractorDomainService } from '../KeywordExtractorDomainService.js';
import { DomainException } from '../../exceptions/DomainException.js';

describe('KeywordExtractorDomainService', () => {
  let extractor;

  beforeEach(() => {
    extractor = new KeywordExtractorDomainService();
  });

  // ── Return type ─────────────────────────────────────────────────────────────

  test('returns an array', () => {
    const result = extractor.extract('We need a React developer.');
    expect(Array.isArray(result)).toBe(true);
  });

  test('all items in the result are non-empty strings', () => {
    const result = extractor.extract('Looking for a Python and TypeScript engineer.');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((kw) => {
      expect(typeof kw).toBe('string');
      expect(kw.trim().length).toBeGreaterThan(0);
    });
  });

  // ── Stopword filtering — English ────────────────────────────────────────────

  test('filters common English stopwords', () => {
    const result = extractor.extract(
      'We are looking for a developer who is able to work in a team.'
    );
    const STOPWORDS = ['we', 'are', 'for', 'a', 'who', 'is', 'to', 'in'];
    STOPWORDS.forEach((sw) => {
      expect(result).not.toContain(sw);
    });
  });

  test('does not filter meaningful English technical terms', () => {
    const result = extractor.extract(
      'The candidate must have experience with React, TypeScript, and Docker.'
    );
    expect(result).toContain('react');
    expect(result).toContain('typescript');
    expect(result).toContain('docker');
  });

  // ── Stopword filtering — Spanish ────────────────────────────────────────────

  test('filters common Spanish stopwords', () => {
    const result = extractor.extract(
      'Buscamos un desarrollador con experiencia en React y TypeScript.'
    );
    const ES_STOPWORDS = ['un', 'con', 'en', 'y'];
    ES_STOPWORDS.forEach((sw) => {
      expect(result).not.toContain(sw);
    });
  });

  test('extracts meaningful terms from a Spanish job description', () => {
    const result = extractor.extract(
      'Buscamos ingeniero backend con conocimientos en Python, Django y PostgreSQL.'
    );
    expect(result).toContain('python');
    expect(result).toContain('django');
    expect(result).toContain('postgresql');
  });

  // ── Case normalisation & deduplication ─────────────────────────────────────

  test('returns all keywords in lowercase', () => {
    const result = extractor.extract('React TYPESCRIPT Python');
    result.forEach((kw) => {
      expect(kw).toBe(kw.toLowerCase());
    });
  });

  test('deduplicates identical keywords (case-insensitive)', () => {
    const result = extractor.extract('React react REACT');
    const reactCount = result.filter((k) => k === 'react').length;
    expect(reactCount).toBe(1);
  });

  // ── Short / numeric token filtering ────────────────────────────────────────

  test('excludes purely numeric tokens', () => {
    const result = extractor.extract('Minimum 3 years of experience with 5 technologies.');
    expect(result).not.toContain('3');
    expect(result).not.toContain('5');
  });

  test('excludes single-character tokens', () => {
    const result = extractor.extract('Knowledge of C and Java.');
    expect(result).not.toContain('');
    // Single 'c' by itself should be excluded (< 2 chars)
    const singleChars = result.filter((k) => k.length < 2);
    expect(singleChars).toHaveLength(0);
  });

  // ── Multi-word phrase detection ─────────────────────────────────────────────

  test('captures "machine learning" as a single keyword', () => {
    const result = extractor.extract(
      'Experience with machine learning and neural networks is a plus.'
    );
    expect(result).toContain('machine learning');
  });

  test('captures "ci/cd" as a single keyword', () => {
    const result = extractor.extract('Familiarity with CI/CD pipelines and DevOps.');
    expect(result).toContain('ci/cd');
  });

  test('captures "node.js" as a single keyword', () => {
    const result = extractor.extract('Backend development using Node.js and Express.');
    expect(result).toContain('node.js');
  });

  test('captures "rest api" as a single keyword', () => {
    const result = extractor.extract('Design and implement REST API endpoints.');
    expect(result).toContain('rest api');
  });

  test('captures "amazon web services" as a single keyword', () => {
    const result = extractor.extract(
      'Deploy infrastructure on Amazon Web Services using Terraform.'
    );
    expect(result).toContain('amazon web services');
  });

  test('captures Spanish multi-word phrase "trabajo en equipo"', () => {
    const result = extractor.extract(
      'Se valorará trabajo en equipo y comunicación efectiva.'
    );
    expect(result).toContain('trabajo en equipo');
  });

  // ── Phrase constituent tokens not re-extracted ──────────────────────────────

  test('"machine" and "learning" are not returned separately when phrase is found', () => {
    const result = extractor.extract('Experience with machine learning is required.');
    // The phrase is present
    expect(result).toContain('machine learning');
    // Individual tokens should NOT appear (they were consumed by the phrase)
    expect(result).not.toContain('machine');
    expect(result).not.toContain('learning');
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  test('returns empty array for empty string', () => {
    const result = extractor.extract('');
    expect(result).toEqual([]);
  });

  test('returns empty array for whitespace-only string', () => {
    const result = extractor.extract('   \n\t  ');
    expect(result).toEqual([]);
  });

  test('returns empty array for text containing only stopwords', () => {
    const result = extractor.extract('the and or but is a an in on at to of');
    expect(result).toEqual([]);
  });

  // ── Duplicate phrase deduplication ─────────────────────────────────────────

  test('deduplicates a multi-word phrase that appears multiple times', () => {
    const result = extractor.extract(
      'machine learning and machine learning engineer with machine learning expertise.'
    );
    const count = result.filter((k) => k === 'machine learning').length;
    expect(count).toBe(1);
  });

  test('deduplicates a single-token keyword that appears multiple times', () => {
    const result = extractor.extract('Python developer, Python engineer, Python expert.');
    const count = result.filter((k) => k === 'python').length;
    expect(count).toBe(1);
  });

  // ── Invalid inputs ──────────────────────────────────────────────────────────

  test('throws DomainException when input is null', () => {
    expect(() => extractor.extract(null)).toThrow(DomainException);
  });

  test('throws DomainException when input is a number', () => {
    expect(() => extractor.extract(42)).toThrow(DomainException);
  });

  test('throws DomainException when input is an array', () => {
    expect(() => extractor.extract(['React', 'TypeScript'])).toThrow(DomainException);
  });

  // ── Performance ─────────────────────────────────────────────────────────────

  test('completes extraction in under 500 ms for a long job description', () => {
    const longJD = `
      We are looking for a Senior Full-Stack Engineer with 5+ years of experience
      building scalable web applications. You will work with React, TypeScript,
      Node.js, GraphQL, PostgreSQL, Redis, and Docker. Experience with Amazon Web
      Services, CI/CD pipelines, and microservices architecture is required.
      Knowledge of machine learning and data science is a plus.
      Strong problem-solving skills and excellent communication skills are essential.
      You must be able to work independently and as a team player in an agile environment.
      Responsibilities include designing REST API endpoints, writing unit testing and
      integration testing suites, conducting code review sessions, and mentoring
      junior developers. Familiarity with Kubernetes, Terraform, and infrastructure
      as code is highly desirable.
    `.repeat(10); // inflate to a realistic-length document

    const start = performance.now();
    const result = extractor.extract(longJD);
    const elapsed = performance.now() - start;

    expect(Array.isArray(result)).toBe(true);
    expect(elapsed).toBeLessThan(500);
  });
});
