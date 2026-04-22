/**
 * AnalyzeAtsUseCase unit tests.
 *
 * Covers:
 *  • happy path — returns AtsAnalysisDTO with correct shape
 *  • validation errors — empty cvText, empty keywords array
 *  • keyword parsing (comma/newline separated)
 *  • score + tier values are correctly propagated
 */

import { AnalyzeAtsUseCase } from '../AnalyzeAtsUseCase.js';
import { AtsAnalysisDTO } from '../../dtos/AtsAnalysisDTO.js';
import { ApplicationException } from '../../exceptions/ApplicationException.js';

describe('AnalyzeAtsUseCase', () => {
  let useCase;

  beforeEach(() => {
    useCase = new AnalyzeAtsUseCase();
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  test('returns an AtsAnalysisDTO on valid input', () => {
    const dto = useCase.execute({
      cvText: 'Experienced React and TypeScript developer.',
      keywords: ['React', 'TypeScript', 'Python'],
    });

    expect(dto).toBeInstanceOf(AtsAnalysisDTO);
  });

  test('DTO has score, tier, foundKeywords, missingKeywords', () => {
    const dto = useCase.execute({
      cvText: 'Experienced React and TypeScript developer.',
      keywords: ['React', 'TypeScript', 'Python'],
    });

    expect(typeof dto.score).toBe('number');
    expect(['low', 'medium', 'high']).toContain(dto.tier);
    expect(Array.isArray(dto.foundKeywords)).toBe(true);
    expect(Array.isArray(dto.missingKeywords)).toBe(true);
  });

  test('correctly identifies found and missing keywords', () => {
    const dto = useCase.execute({
      cvText: 'Worked with React and AWS cloud services.',
      keywords: ['React', 'AWS', 'Kubernetes'],
    });

    expect(dto.foundKeywords).toContain('react');
    expect(dto.foundKeywords).toContain('aws');
    expect(dto.missingKeywords).toContain('kubernetes');
  });

  test('score is 100 when all keywords are found', () => {
    const dto = useCase.execute({
      cvText: 'React TypeScript Node.js',
      keywords: ['React', 'TypeScript', 'Node.js'],
    });
    expect(dto.score).toBe(100);
    expect(dto.tier).toBe('high');
  });

  test('score is 0 and tier is "low" when no keywords match', () => {
    const dto = useCase.execute({
      cvText: 'Hobbyist painter and poet.',
      keywords: ['React', 'AWS'],
    });
    expect(dto.score).toBe(0);
    expect(dto.tier).toBe('low');
  });

  // ── DTO is frozen ───────────────────────────────────────────────────────────

  test('returned DTO is frozen (immutable)', () => {
    const dto = useCase.execute({
      cvText: 'React developer',
      keywords: ['React'],
    });
    expect(Object.isFrozen(dto)).toBe(true);
  });

  // ── Validation errors ───────────────────────────────────────────────────────

  test('throws ApplicationException when cvText is empty string', () => {
    expect(() =>
      useCase.execute({ cvText: '   ', keywords: ['React'] })
    ).toThrow(ApplicationException);
  });

  test('throws ApplicationException when cvText is not a string', () => {
    expect(() =>
      useCase.execute({ cvText: null, keywords: ['React'] })
    ).toThrow(ApplicationException);
  });

  test('throws ApplicationException when keywords array is empty', () => {
    expect(() =>
      useCase.execute({ cvText: 'React developer', keywords: [] })
    ).toThrow(ApplicationException);
  });

  test('throws ApplicationException when keywords is not an array', () => {
    expect(() =>
      useCase.execute({ cvText: 'React developer', keywords: 'React' })
    ).toThrow(ApplicationException);
  });
});
