/**
 * AtsAnalysisDTO
 *
 * Plain data object returned by AnalyzeAtsUseCase.
 * Never exposes a domain entity directly across layer boundaries.
 *
 * Layer: Application → DTOs
 * Imports: none
 */

export class AtsAnalysisDTO {
  /**
   * @param {object}   props
   * @param {number}   props.score              — integer 0-100
   * @param {string}   props.tier               — "low" | "medium" | "high"
   * @param {string[]} props.foundKeywords       — keywords found in the CV
   * @param {string[]} props.missingKeywords     — keywords absent from the CV
   * @param {{ experience: boolean, education: boolean, skills: boolean, contact: boolean }} props.detectedSections
   *   — canonical CV sections detected in the text
   */
  constructor({ score, tier, foundKeywords, missingKeywords, detectedSections }) {
    this.score = score;
    this.tier = tier;
    this.foundKeywords = foundKeywords;
    this.missingKeywords = missingKeywords;
    this.detectedSections = detectedSections;

    Object.freeze(this);
  }
}
