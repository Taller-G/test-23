/**
 * CvSectionDetectorDomainService unit tests.
 *
 * Covers:
 *  • Returns all four boolean flags (experience, education, skills, contact)
 *  • Correctly detects each section when its heading is present
 *  • Correctly marks a section as absent when heading is missing
 *  • Case-insensitive heading detection
 *  • Accent-insensitive detection (e.g. "Experiência" → experience)
 *  • Spanish synonyms are recognised
 *  • Section heading at start of line is detected
 *  • Body text alone (no heading) does not falsely trigger section detection
 *  • All-false result for empty / no-heading text
 *  • Invalid input throws DomainException
 *  • Full CV with all sections returns all true
 *  • Performance: completes in under 500 ms
 */

import { CvSectionDetectorDomainService } from '../CvSectionDetectorDomainService.js';
import { DomainException } from '../../exceptions/DomainException.js';

// ── Fixture helpers ──────────────────────────────────────────────────────────

const CV_ALL_SECTIONS = `
John Doe
john@example.com | +1 (555) 000-0000

CONTACT
Email: john@example.com

EXPERIENCE
Senior Frontend Engineer at TechNova Labs (2023–Present)
- Led redesign of core SaaS dashboard.

EDUCATION
B.Sc. Computer Science, MIT, 2018

SKILLS
React, TypeScript, Node.js, Docker, AWS
`;

const CV_NO_SECTIONS = `
John Doe is an experienced software engineer who has worked with React and TypeScript
for over five years. He studied computer science and knows many programming skills.
`;

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CvSectionDetectorDomainService', () => {
  let detector;

  beforeEach(() => {
    detector = new CvSectionDetectorDomainService();
  });

  // ── Return shape ────────────────────────────────────────────────────────────

  test('returns an object with four boolean properties', () => {
    const result = detector.detect('some text');
    expect(typeof result).toBe('object');
    expect(typeof result.experience).toBe('boolean');
    expect(typeof result.education).toBe('boolean');
    expect(typeof result.skills).toBe('boolean');
    expect(typeof result.contact).toBe('boolean');
  });

  // ── All sections detected ───────────────────────────────────────────────────

  test('detects all four sections in a well-structured CV', () => {
    const result = detector.detect(CV_ALL_SECTIONS);
    expect(result.experience).toBe(true);
    expect(result.education).toBe(true);
    expect(result.skills).toBe(true);
    expect(result.contact).toBe(true);
  });

  // ── Individual section detection ────────────────────────────────────────────

  test('detects "experience" section heading (English)', () => {
    const result = detector.detect('\nEXPERIENCE\nSenior Developer at Acme Corp.');
    expect(result.experience).toBe(true);
  });

  test('detects "Work Experience" section heading', () => {
    const result = detector.detect('\nWork Experience\n3 years at StartupXYZ.');
    expect(result.experience).toBe(true);
  });

  test('detects "education" section heading (English)', () => {
    const result = detector.detect('\nEducation\nB.Sc. Computer Science, MIT 2018.');
    expect(result.education).toBe(true);
  });

  test('detects "Skills" section heading (English)', () => {
    const result = detector.detect('\nSkills\nReact, TypeScript, Docker');
    expect(result.skills).toBe(true);
  });

  test('detects "Technical Skills" section heading', () => {
    const result = detector.detect('\nTechnical Skills\nPython, AWS, Kubernetes');
    expect(result.skills).toBe(true);
  });

  test('detects "Contact" section heading (English)', () => {
    const result = detector.detect('\nContact\nEmail: me@example.com');
    expect(result.contact).toBe(true);
  });

  test('detects "Contact Information" section heading', () => {
    const result = detector.detect('\nContact Information\nPhone: 555-0000');
    expect(result.contact).toBe(true);
  });

  // ── Spanish synonyms ────────────────────────────────────────────────────────

  test('detects "Experiencia Laboral" (Spanish) as experience', () => {
    const result = detector.detect('\nExperiencia Laboral\nDesarrollador en Empresa X.');
    expect(result.experience).toBe(true);
  });

  test('detects "Educación" (Spanish with accent) as education', () => {
    const result = detector.detect('\nEducación\nLicenciatura en Informática, 2020.');
    expect(result.education).toBe(true);
  });

  test('detects "Formación" (Spanish) as education', () => {
    const result = detector.detect('\nFormación\nMáster en Ciencias de Datos.');
    expect(result.education).toBe(true);
  });

  test('detects "Habilidades" (Spanish) as skills', () => {
    const result = detector.detect('\nHabilidades\nReact, TypeScript, Python');
    expect(result.skills).toBe(true);
  });

  test('detects "Habilidades Técnicas" (Spanish) as skills', () => {
    const result = detector.detect('\nHabilidades Técnicas\nPython, Django, PostgreSQL');
    expect(result.skills).toBe(true);
  });

  test('detects "Contacto" (Spanish) as contact', () => {
    const result = detector.detect('\nContacto\ncorreo@ejemplo.com');
    expect(result.contact).toBe(true);
  });

  test('detects "Datos Personales" (Spanish) as contact', () => {
    const result = detector.detect('\nDatos Personales\nNombre: Juan García');
    expect(result.contact).toBe(true);
  });

  // ── Case insensitivity ──────────────────────────────────────────────────────

  test('detects section heading regardless of casing', () => {
    const lower = detector.detect('\nexperience\nDeveloper at Acme.');
    const upper = detector.detect('\nEXPERIENCE\nDeveloper at Acme.');
    const mixed = detector.detect('\nExPerIeNcE\nDeveloper at Acme.');
    expect(lower.experience).toBe(true);
    expect(upper.experience).toBe(true);
    expect(mixed.experience).toBe(true);
  });

  // ── Accent insensitivity ────────────────────────────────────────────────────

  test('detects accented Spanish headings without the accent in the synonym map', () => {
    // "Educacion" (no accent) should still match
    const result = detector.detect('\nEducacion\nIngeniería en Sistemas.');
    expect(result.education).toBe(true);
  });

  // ── Absence detection ───────────────────────────────────────────────────────

  test('returns false for experience when no heading present', () => {
    const result = detector.detect(
      'I have five years of experience working with React and Node.js.'
    );
    // "experience" used in prose should not trigger the section
    expect(result.experience).toBe(false);
  });

  test('returns false for skills when no heading present', () => {
    const result = detector.detect(
      'I have strong skills in Python and machine learning.'
    );
    expect(result.skills).toBe(false);
  });

  test('all sections false for empty string', () => {
    const result = detector.detect('');
    expect(result.experience).toBe(false);
    expect(result.education).toBe(false);
    expect(result.skills).toBe(false);
    expect(result.contact).toBe(false);
  });

  test('all sections false for plain-prose CV without headings', () => {
    const result = detector.detect(CV_NO_SECTIONS);
    expect(result.experience).toBe(false);
    expect(result.education).toBe(false);
    expect(result.skills).toBe(false);
    expect(result.contact).toBe(false);
  });

  // ── Section heading with colon ──────────────────────────────────────────────

  test('detects section with trailing colon (e.g. "Education:")', () => {
    const result = detector.detect('\nEducation:\nB.Sc. MIT 2018');
    expect(result.education).toBe(true);
  });

  test('detects section with trailing colon (e.g. "Skills:")', () => {
    const result = detector.detect('\nSkills:\nReact, TypeScript');
    expect(result.skills).toBe(true);
  });

  // ── Invalid input ───────────────────────────────────────────────────────────

  test('throws DomainException when cvText is null', () => {
    expect(() => detector.detect(null)).toThrow(DomainException);
  });

  test('throws DomainException when cvText is a number', () => {
    expect(() => detector.detect(42)).toThrow(DomainException);
  });

  test('throws DomainException when cvText is an array', () => {
    expect(() => detector.detect(['Experience'])).toThrow(DomainException);
  });

  // ── Performance ─────────────────────────────────────────────────────────────

  test('completes detection in under 500 ms for a long CV', () => {
    const longCv = CV_ALL_SECTIONS.repeat(50);
    const start = performance.now();
    const result = detector.detect(longCv);
    const elapsed = performance.now() - start;

    expect(result.experience).toBe(true);
    expect(elapsed).toBeLessThan(500);
  });
});
