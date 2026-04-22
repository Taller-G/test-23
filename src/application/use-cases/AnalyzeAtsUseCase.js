/**
 * AnalyzeAtsUseCase
 *
 * Orchestrates an ATS keyword analysis:
 *   1. Validates raw input (non-empty CV text, at least one keyword).
 *   2. Delegates scoring logic to AtsAnalysisDomainService.
 *   3. Returns an AtsAnalysisDTO — never a raw domain entity.
 *
 * Layer: Application → Use Cases
 * Imports: application + domain only
 */

import { AtsAnalysisDomainService } from '../../domain/services/AtsAnalysisDomainService.js';
import { AtsAnalysisDTO } from '../dtos/AtsAnalysisDTO.js';
import { ApplicationException } from '../exceptions/ApplicationException.js';

export class AnalyzeAtsUseCase {
  #domainService;

  constructor() {
    this.#domainService = new AtsAnalysisDomainService();
  }

  /**
   * @param {{ cvText: string, keywords: string[] }} dto
   * @returns {AtsAnalysisDTO}
   * @throws {ApplicationException} on invalid input
   */
  execute({ cvText, keywords }) {
    if (typeof cvText !== 'string' || cvText.trim().length === 0) {
      throw new ApplicationException('CV text must not be empty.', 'VALIDATION_ERROR');
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
      throw new ApplicationException(
        'At least one keyword is required.',
        'VALIDATION_ERROR'
      );
    }

    const result = this.#domainService.analyse(cvText, keywords);
    const snapshot = result.toSnapshot();

    return new AtsAnalysisDTO({
      score: snapshot.score,
      tier: snapshot.tier,
      foundKeywords: snapshot.foundKeywords,
      missingKeywords: snapshot.missingKeywords,
    });
  }
}
