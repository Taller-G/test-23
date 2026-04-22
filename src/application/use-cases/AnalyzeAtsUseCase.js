/**
 * AnalyzeAtsUseCase
 *
 * Orchestrates a full ATS analysis:
 *   1. Validates raw input (non-empty CV text and job description text).
 *   2. Extracts keywords from the job description using KeywordExtractorDomainService
 *      (stopword-filtered, deduped, multi-word-phrase-aware).
 *   3. Delegates scoring + section detection to AtsAnalysisDomainService.
 *   4. Returns an AtsAnalysisDTO — never a raw domain entity.
 *
 * The use case accepts EITHER:
 *   • { cvText, jobDescriptionText } — full raw JD text; keywords are extracted automatically.
 *   • { cvText, keywords }           — a pre-built keyword array (used by unit tests / API callers).
 *
 * At least one of jobDescriptionText or keywords must be supplied.
 *
 * Layer: Application → Use Cases
 * Imports: application + domain only
 */

import { KeywordExtractorDomainService } from '../../domain/services/KeywordExtractorDomainService.js';
import { AtsAnalysisDomainService } from '../../domain/services/AtsAnalysisDomainService.js';
import { AtsAnalysisDTO } from '../dtos/AtsAnalysisDTO.js';
import { ApplicationException } from '../exceptions/ApplicationException.js';

export class AnalyzeAtsUseCase {
  #keywordExtractor;
  #domainService;

  constructor() {
    this.#keywordExtractor = new KeywordExtractorDomainService();
    this.#domainService = new AtsAnalysisDomainService();
  }

  /**
   * @param {{ cvText: string, jobDescriptionText?: string, keywords?: string[] }} dto
   * @returns {AtsAnalysisDTO}
   * @throws {ApplicationException} on invalid input
   */
  execute({ cvText, jobDescriptionText, keywords }) {
    if (typeof cvText !== 'string' || cvText.trim().length === 0) {
      throw new ApplicationException('CV text must not be empty.', 'VALIDATION_ERROR');
    }

    /** @type {string[]} */
    let resolvedKeywords;

    if (
      typeof jobDescriptionText === 'string' &&
      jobDescriptionText.trim().length > 0
    ) {
      // Primary path: extract keywords from the raw job description text
      resolvedKeywords = this.#keywordExtractor.extract(jobDescriptionText);

      if (resolvedKeywords.length === 0) {
        throw new ApplicationException(
          'No meaningful keywords could be extracted from the job description. ' +
            'Try adding more specific technical terms or requirements.',
          'NO_KEYWORDS_EXTRACTED'
        );
      }
    } else if (Array.isArray(keywords) && keywords.length > 0) {
      // Fallback path: caller supplied an explicit keyword list
      resolvedKeywords = keywords;
    } else {
      throw new ApplicationException(
        'Provide either a job description text or at least one keyword.',
        'VALIDATION_ERROR'
      );
    }

    const result = this.#domainService.analyse(cvText, resolvedKeywords);
    const snapshot = result.toSnapshot();

    return new AtsAnalysisDTO({
      score: snapshot.score,
      tier: snapshot.tier,
      foundKeywords: snapshot.foundKeywords,
      missingKeywords: snapshot.missingKeywords,
      detectedSections: snapshot.detectedSections,
    });
  }
}
