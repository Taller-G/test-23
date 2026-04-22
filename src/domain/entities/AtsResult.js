/**
 * AtsResult Entity
 *
 * Encapsulates the outcome of an ATS (Applicant Tracking System) analysis.
 * Enforces its own invariants — no invalid score or keyword list is possible.
 *
 * Business rules:
 *  • score must be a number in the range [0, 100].
 *  • foundKeywords and missingKeywords must be non-null arrays of strings.
 *  • A keyword may not appear in both lists simultaneously.
 *  • detectedSections must be an object with boolean flags for the four
 *    canonical CV sections: experience, education, skills, contact.
 *
 * Layer: Domain → Entities
 * Imports: domain only (DomainException)
 */

import { DomainException } from '../exceptions/DomainException.js';

/** @typedef {{ experience: boolean, education: boolean, skills: boolean, contact: boolean }} DetectedSections */

/** Canonical section names recognised by the entity. */
const SECTION_KEYS = ['experience', 'education', 'skills', 'contact'];

export class AtsResult {
  /** @type {number} — integer 0-100 */
  #score;

  /** @type {string[]} */
  #foundKeywords;

  /** @type {string[]} */
  #missingKeywords;

  /** @type {DetectedSections} */
  #detectedSections;

  /**
   * @param {object}           props
   * @param {number}           props.score            — ATS match score in [0, 100]
   * @param {string[]}         props.foundKeywords    — keywords present in the CV
   * @param {string[]}         props.missingKeywords  — keywords absent from the CV
   * @param {DetectedSections} [props.detectedSections] — CV sections detected;
   *   defaults to all-false when omitted
   */
  constructor({ score, foundKeywords, missingKeywords, detectedSections }) {
    this.#setScore(score);
    this.#setFoundKeywords(foundKeywords);
    this.#setMissingKeywords(missingKeywords);
    this.#setDetectedSections(detectedSections);

    Object.freeze(this);
  }

  // ── Private guards ──────────────────────────────────────────────────────────

  #setScore(score) {
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throw new DomainException('ATS score must be a finite number.');
    }
    if (score < 0 || score > 100) {
      throw new DomainException('ATS score must be between 0 and 100.');
    }
    this.#score = Math.round(score);
  }

  #setFoundKeywords(keywords) {
    if (!Array.isArray(keywords)) {
      throw new DomainException('foundKeywords must be an array.');
    }
    if (keywords.some((k) => typeof k !== 'string' || k.trim().length === 0)) {
      throw new DomainException('Each found keyword must be a non-empty string.');
    }
    this.#foundKeywords = keywords.map((k) => k.trim().toLowerCase());
  }

  #setMissingKeywords(keywords) {
    if (!Array.isArray(keywords)) {
      throw new DomainException('missingKeywords must be an array.');
    }
    if (keywords.some((k) => typeof k !== 'string' || k.trim().length === 0)) {
      throw new DomainException('Each missing keyword must be a non-empty string.');
    }
    this.#missingKeywords = keywords.map((k) => k.trim().toLowerCase());
  }

  /**
   * @param {DetectedSections | null | undefined} sections
   */
  #setDetectedSections(sections) {
    // Allow omission — default to all-false
    if (sections == null) {
      this.#detectedSections = Object.freeze({
        experience: false,
        education: false,
        skills: false,
        contact: false,
      });
      return;
    }

    if (typeof sections !== 'object' || Array.isArray(sections)) {
      throw new DomainException('detectedSections must be a plain object.');
    }

    for (const key of SECTION_KEYS) {
      if (typeof sections[key] !== 'boolean') {
        throw new DomainException(
          `detectedSections.${key} must be a boolean.`
        );
      }
    }

    this.#detectedSections = Object.freeze({
      experience: sections.experience,
      education: sections.education,
      skills: sections.skills,
      contact: sections.contact,
    });
  }

  // ── Public accessors ────────────────────────────────────────────────────────

  get score() {
    return this.#score;
  }

  get foundKeywords() {
    return [...this.#foundKeywords];
  }

  get missingKeywords() {
    return [...this.#missingKeywords];
  }

  /**
   * Snapshot of detected CV sections (frozen copy).
   * @returns {DetectedSections}
   */
  get detectedSections() {
    return { ...this.#detectedSections };
  }

  /**
   * Classify the score into a semantic tier used for colour-coding.
   * @returns {'low' | 'medium' | 'high'}
   */
  get tier() {
    if (this.#score < 50) return 'low';
    if (this.#score < 75) return 'medium';
    return 'high';
  }

  /**
   * Plain-object snapshot — safe to pass across layer boundaries.
   * @returns {{ score: number, foundKeywords: string[], missingKeywords: string[], tier: string, detectedSections: DetectedSections }}
   */
  toSnapshot() {
    return {
      score: this.#score,
      foundKeywords: this.foundKeywords,
      missingKeywords: this.missingKeywords,
      tier: this.tier,
      detectedSections: this.detectedSections,
    };
  }
}
