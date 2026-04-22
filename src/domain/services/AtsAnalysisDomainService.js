/**
 * AtsAnalysisDomainService
 *
 * Pure domain logic for ATS keyword analysis.
 * Determines which keywords from a job description appear in a CV text,
 * computes the match score, and produces an AtsResult entity.
 *
 * Rules (business logic lives here, not in use cases):
 *  • Matching is case-insensitive and whole-word aware.
 *  • Score = (foundKeywords.length / totalKeywords.length) * 100.
 *  • Duplicate keywords in the input list are deduplicated before analysis.
 *  • If the keyword list is empty the score is 0.
 *
 * Layer: Domain → Services
 * Imports: domain only (AtsResult, DomainException)
 */

import { AtsResult } from '../entities/AtsResult.js';
import { DomainException } from '../exceptions/DomainException.js';

export class AtsAnalysisDomainService {
  /**
   * Analyse the CV text against a list of job-description keywords and return
   * an AtsResult entity representing the match.
   *
   * @param {string}   cvText    — raw CV / résumé text
   * @param {string[]} keywords  — list of keywords extracted from the job description
   * @returns {AtsResult}
   * @throws {DomainException} on invalid inputs
   */
  analyse(cvText, keywords) {
    if (typeof cvText !== 'string') {
      throw new DomainException('CV text must be a string.');
    }
    if (!Array.isArray(keywords)) {
      throw new DomainException('Keywords must be an array.');
    }

    // Deduplicate and normalise keywords
    const unique = [
      ...new Set(keywords.map((k) => k.trim().toLowerCase()).filter((k) => k.length > 0)),
    ];

    if (unique.length === 0) {
      return new AtsResult({ score: 0, foundKeywords: [], missingKeywords: [] });
    }

    const normalised = cvText.toLowerCase();

    const found = [];
    const missing = [];

    for (const keyword of unique) {
      if (this.#cvContainsKeyword(normalised, keyword)) {
        found.push(keyword);
      } else {
        missing.push(keyword);
      }
    }

    const score = (found.length / unique.length) * 100;

    return new AtsResult({ score, foundKeywords: found, missingKeywords: missing });
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Returns true if the keyword appears as a whole word (or phrase) in the CV text.
   * Multi-word phrases are matched literally (case-insensitive, already normalised).
   *
   * @param {string} normalisedCv
   * @param {string} keyword  — already lowercased
   * @returns {boolean}
   */
  #cvContainsKeyword(normalisedCv, keyword) {
    // For multi-word phrases, use a plain includes check (order-sensitive literal match)
    if (keyword.includes(' ')) {
      return normalisedCv.includes(keyword);
    }

    // For single tokens, match on word boundaries so "java" does not match "javascript"
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i');
    return pattern.test(normalisedCv);
  }
}
