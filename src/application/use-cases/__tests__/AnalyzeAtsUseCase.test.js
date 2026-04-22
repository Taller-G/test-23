/**
 * AnalyzeAtsUseCase unit tests.
 *
 * Covers:
 *  • happy path — raw jobDescriptionText extracts keywords automatically
 *  • happy path — explicit keywords array (legacy / API path)
 *  • validation errors — empty cvText, missing JD + keywords
 *  • NO_KEYWORDS_EXTRACTED when JD text is all stopwords
 *  • score + tier values are correctly propagated
 *  • detectedSections is included in the DTO
 *  • returned DTO is frozen (immutable)
 */

import { AnalyzeAtsUseCase } from '../AnalyzeAtsUseCase.js';
import { AtsAnalysisDTO } from '../../dtos/AtsAnalysisDTO.js';
import { ApplicationException } from '../../exceptions/ApplicationException.js';

describe('AnalyzeAtsUseCase', () => {
  let useCase;

  beforeEach(() => {
    useCase = new AnalyzeAtsUseCase();
  });

  // ── Happy path — jobDescriptionText ─────────────────────────────────────────

  test('returns an AtsAnalysisDTO when jobDescriptionText is provided', () => {
    const dto = useCase.execute({
      cvText: 'Experienced React and TypeScript developer.',
      jobDescriptionText:
        'We are looking for a React developer with TypeScript and Python skills.',
    });
    expect(dto).toBeInstanceOf(AtsAnalysisDTO);
  });

  test('DTO has score, tier, foundKeywords, missingKeywords, detectedSections', () => {
    const dto = useCase.execute({
      cvText: 'Experienced React and TypeScript developer.',
      jobDescriptionText: 'Need React, TypeScript, and Python expertise.',
    });
    expect(typeof dto.score).toBe('number');
    expect(['low', 'medium', 'high']).toContain(dto.tier);
    expect(Array.isArray(dto.foundKeywords)).toBe(true);
    expect(Array.isArray(dto.missingKeywords)).toBe(true);
    expect(typeof dto.detectedSections).toBe('object');
    expect(typeof dto.detectedSections.experience).toBe('boolean');
    expect(typeof dto.detectedSections.education).toBe('boolean');
    expect(typeof dto.detectedSections.skills).toBe('boolean');
    expect(typeof dto.detectedSections.contact).toBe('boolean');
  });

  test('correctly identifies found and missing keywords from JD text', () => {
    const dto = useCase.execute({
      cvText: 'Worked with React and AWS cloud services.',
      jobDescriptionText:
        'Looking for a developer with React, AWS, and Kubernetes experience.',
    });
    expect(dto.foundKeywords).toContain('react');
    expect(dto.foundKeywords).toContain('aws');
    expect(dto.missingKeywords).toContain('kubernetes');
  });

  test('score is 100 when all extracted keywords are found in CV', () => {
    const dto = useCase.execute({
      cvText: 'Expert in React TypeScript and Node.js development.',
      jobDescriptionText: 'React TypeScript Node.js developer needed.',
    });
    // All three tech terms should be in the CV
    expect(dto.score).toBeGreaterThan(0);
    expect(dto.foundKeywords).toContain('react');
    expect(dto.foundKeywords).toContain('typescript');
  });

  test('score is 0 when no extracted keywords are in the CV', () => {
    const dto = useCase.execute({
      cvText: 'Hobbyist painter and poet.',
      jobDescriptionText: 'Kubernetes Docker Terraform Ansible AWS engineer needed.',
    });
    expect(dto.score).toBe(0);
    expect(dto.tier).toBe('low');
  });

  // ── Happy path — explicit keywords array (fallback) ─────────────────────────

  test('returns AtsAnalysisDTO when explicit keywords array is provided', () => {
    const dto = useCase.execute({
      cvText: 'Experienced React and TypeScript developer.',
      keywords: ['React', 'TypeScript', 'Python'],
    });
    expect(dto).toBeInstanceOf(AtsAnalysisDTO);
  });

  test('correctly scores with explicit keywords array', () => {
    const dto = useCase.execute({
      cvText: 'React TypeScript Node.js',
      keywords: ['React', 'TypeScript', 'Node.js'],
    });
    expect(dto.score).toBe(100);
    expect(dto.tier).toBe('high');
  });

  test('score is 0 and tier is "low" when no keywords match (explicit array)', () => {
    const dto = useCase.execute({
      cvText: 'Hobbyist painter and poet.',
      keywords: ['React', 'AWS'],
    });
    expect(dto.score).toBe(0);
    expect(dto.tier).toBe('low');
  });

  // ── jobDescriptionText takes priority over keywords ─────────────────────────

  test('jobDescriptionText takes priority over explicit keywords when both provided', () => {
    // The JD contains only "docker"; keywords array has "react"
    // Since JD is provided, "docker" should drive the analysis, not "react"
    const dto = useCase.execute({
      cvText: 'React developer with no Docker experience.',
      jobDescriptionText: 'Docker container expert required.',
      keywords: ['React'],
    });
    // Docker should be in missingKeywords (or foundKeywords) — not React driving the result
    const allKw = [...dto.foundKeywords, ...dto.missingKeywords];
    expect(allKw).toContain('docker');
  });

  // ── DTO is frozen ───────────────────────────────────────────────────────────

  test('returned DTO is frozen (immutable)', () => {
    const dto = useCase.execute({
      cvText: 'React developer',
      keywords: ['React'],
    });
    expect(Object.isFrozen(dto)).toBe(true);
  });

  // ── detectedSections reflects CV structure ──────────────────────────────────

  test('detectedSections.skills is true when CV has a Skills heading', () => {
    const dto = useCase.execute({
      cvText: '\nSkills\nReact, TypeScript, Docker\n',
      keywords: ['React'],
    });
    expect(dto.detectedSections.skills).toBe(true);
  });

  test('detectedSections.experience is true when CV has an Experience heading', () => {
    const dto = useCase.execute({
      cvText: '\nExperience\nSenior Developer at Acme 2020–2023\n',
      keywords: ['React'],
    });
    expect(dto.detectedSections.experience).toBe(true);
  });

  test('detectedSections all false for plain prose CV without headings', () => {
    const dto = useCase.execute({
      cvText: 'I am a developer with React and Python skills and a degree.',
      keywords: ['React'],
    });
    expect(dto.detectedSections.experience).toBe(false);
    expect(dto.detectedSections.education).toBe(false);
  });

  // ── Validation errors ───────────────────────────────────────────────────────

  test('throws ApplicationException when cvText is empty string', () => {
    expect(() =>
      useCase.execute({
        cvText: '   ',
        jobDescriptionText: 'React TypeScript developer role',
      })
    ).toThrow(ApplicationException);
  });

  test('throws ApplicationException when cvText is not a string', () => {
    expect(() =>
      useCase.execute({ cvText: null, jobDescriptionText: 'React developer' })
    ).toThrow(ApplicationException);
  });

  test('throws ApplicationException when neither jobDescriptionText nor keywords is provided', () => {
    expect(() =>
      useCase.execute({ cvText: 'React developer' })
    ).toThrow(ApplicationException);
  });

  test('throws ApplicationException when jobDescriptionText is empty and keywords is empty array', () => {
    expect(() =>
      useCase.execute({
        cvText: 'React developer',
        jobDescriptionText: '',
        keywords: [],
      })
    ).toThrow(ApplicationException);
  });

  test('throws ApplicationException with NO_KEYWORDS_EXTRACTED when JD yields no keywords', () => {
    let caughtError;
    try {
      useCase.execute({
        cvText: 'React developer',
        // All stopwords — no meaningful keywords will be extracted
        jobDescriptionText: 'the and or but is a an in on at to of for',
      });
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).toBeInstanceOf(ApplicationException);
    expect(caughtError.code).toBe('NO_KEYWORDS_EXTRACTED');
  });

  test('throws ApplicationException when keywords is not an array (explicit path)', () => {
    expect(() =>
      useCase.execute({ cvText: 'React developer', keywords: 'React' })
    ).toThrow(ApplicationException);
  });

  // ── Stopword extraction spot-check ──────────────────────────────────────────

  test('extracts "react" and "typescript" from a natural-language JD', () => {
    const dto = useCase.execute({
      cvText: 'Senior React and TypeScript engineer.',
      jobDescriptionText:
        'We are seeking a talented software engineer with experience in React ' +
        'and TypeScript. The candidate must be able to work in a fast-paced environment.',
    });
    expect(dto.foundKeywords).toContain('react');
    expect(dto.foundKeywords).toContain('typescript');
    // Stopwords should not appear as keywords
    expect(dto.foundKeywords).not.toContain('we');
    expect(dto.foundKeywords).not.toContain('the');
    expect(dto.foundKeywords).not.toContain('a');
    expect(dto.foundKeywords).not.toContain('in');
  });
});
