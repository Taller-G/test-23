/**
 * CvSectionDetectorDomainService
 *
 * Detects which canonical sections are present in a raw CV text.
 * Canonical sections: experience, education, skills, contact.
 *
 * Detection strategy:
 *  • Each section has a set of heading synonyms in both English and Spanish.
 *  • A section is considered "detected" when at least one of its synonyms
 *    appears in the CV text as a word / phrase on its own line OR immediately
 *    followed by a delimiter character (colon, newline, dash).
 *  • Matching is case-insensitive and accent-insensitive (via normalisation).
 *
 * The result is a plain object with boolean flags for each section:
 *  { experience: boolean, education: boolean, skills: boolean, contact: boolean }
 *
 * Layer: Domain → Services
 * Imports: domain only (DomainException)
 */

import { DomainException } from '../exceptions/DomainException.js';

// ── Section synonym maps ──────────────────────────────────────────────────────

/**
 * Maps each canonical section name to its recognised heading synonyms
 * (English + Spanish, lowercase, accent-stripped where needed).
 *
 * @type {Record<string, string[]>}
 */
const SECTION_SYNONYMS = {
  experience: [
    // English
    'experience', 'work experience', 'professional experience',
    'employment history', 'employment', 'work history',
    'career history', 'career summary', 'professional background',
    'professional summary', 'positions held', 'roles',
    // Spanish
    'experiencia', 'experiencia laboral', 'experiencia profesional',
    'historial laboral', 'trayectoria profesional', 'cargos desempenados',
    'cargos desempeñados', 'puestos ocupados',
  ],
  education: [
    // English
    'education', 'academic background', 'academic history',
    'qualifications', 'academic qualifications', 'degrees',
    'academic training', 'studies', 'certifications', 'credentials',
    'training', 'courses', 'certificates',
    // Spanish
    'educacion', 'educación', 'formacion', 'formación',
    'formacion academica', 'formación académica',
    'estudios', 'titulaciones', 'titulos', 'títulos',
    'certificaciones', 'capacitacion', 'capacitación',
    'cursos', 'certificados', 'antecedentes academicos',
    'antecedentes académicos',
  ],
  skills: [
    // English
    'skills', 'technical skills', 'core skills', 'key skills',
    'competencies', 'core competencies', 'areas of expertise',
    'expertise', 'technologies', 'technology stack', 'tech stack',
    'tools', 'programming languages', 'languages', 'proficiencies',
    'abilities', 'strengths',
    // Spanish
    'habilidades', 'habilidades tecnicas', 'habilidades técnicas',
    'competencias', 'conocimientos', 'conocimientos tecnicos',
    'conocimientos técnicos', 'destrezas', 'aptitudes',
    'tecnologias', 'tecnologías', 'herramientas', 'lenguajes',
    'idiomas', 'capacidades',
  ],
  contact: [
    // English
    'contact', 'contact information', 'contact details',
    'contact info', 'personal information', 'personal details',
    'personal info', 'profile', 'about me', 'summary',
    // Spanish
    'contacto', 'informacion de contacto', 'información de contacto',
    'datos de contacto', 'datos personales', 'informacion personal',
    'información personal', 'perfil', 'sobre mi', 'sobre mí',
    'resumen', 'presentacion', 'presentación',
  ],
};

// Pre-build patterns once for each section (sorted longest synonym first to
// avoid partial-match shadowing).
const SECTION_PATTERNS = /** @type {Record<string, RegExp>} */ ({});

for (const [section, synonyms] of Object.entries(SECTION_SYNONYMS)) {
  // Sort by descending length so longer phrases are tried first.
  const sorted = [...synonyms].sort((a, b) => b.length - a.length);

  // Each synonym must appear:
  //   a) at the start of a line (possibly after whitespace), OR
  //   b) after a bullet/dash/pipe, OR
  //   c) followed immediately by a colon, newline, or end-of-string.
  // This avoids matching synonyms that are simply used in body text
  // (e.g. "I have 3 years of experience" should not trigger the section).
  const alts = sorted.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

  SECTION_PATTERNS[section] = new RegExp(
    `(?:^|[\\n\\r])[\\s\\-•·▸►*>|]*(?:${alts})(?:[:\\s\\n\\r]|$)`,
    'im'
  );
}

// ── Service class ─────────────────────────────────────────────────────────────

export class CvSectionDetectorDomainService {
  /**
   * Detect canonical CV sections present in the raw CV text.
   *
   * @param {string} cvText — raw CV / résumé text
   * @returns {{ experience: boolean, education: boolean, skills: boolean, contact: boolean }}
   * @throws {DomainException} if cvText is not a string
   */
  detect(cvText) {
    if (typeof cvText !== 'string') {
      throw new DomainException('CV text must be a string.');
    }

    // Normalise: lowercase + strip accents for resilient matching
    const normalised = this.#normalise(cvText);

    return {
      experience: SECTION_PATTERNS.experience.test(normalised),
      education: SECTION_PATTERNS.education.test(normalised),
      skills: SECTION_PATTERNS.skills.test(normalised),
      contact: SECTION_PATTERNS.contact.test(normalised),
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Lowercase and strip diacritical marks so "Experiência" matches "experience".
   * @param {string} text
   * @returns {string}
   */
  #normalise(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
