/**
 * AtsController
 *
 * Thin adapter between the ATS dashboard UI and AnalyzeAtsUseCase.
 * Responsibilities:
 *   • Coerce and validate raw view inputs (CV text + job description text).
 *   • Call AnalyzeAtsUseCase with the validated inputs.
 *   • Return a plain result envelope ({ ok, data } | { ok, error }).
 *
 * The controller accepts raw job description text (not a pre-parsed keyword list).
 * Keyword extraction is delegated entirely to the use case / domain layer.
 *
 * Layer: Interfaces → Controllers
 * Imports: application use cases + DTOs only. NO domain / infrastructure.
 */

import { AnalyzeAtsUseCase } from '../../application/use-cases/AnalyzeAtsUseCase.js';
import { ApplicationException } from '../../application/exceptions/ApplicationException.js';

export class AtsController {
  #analyzeAts;

  constructor() {
    this.#analyzeAts = new AnalyzeAtsUseCase();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  #ok(data) {
    return { ok: true, data };
  }

  #fail(error) {
    const isApp = error instanceof ApplicationException;
    return {
      ok: false,
      error: {
        message: error.message,
        code: isApp ? error.code : 'UNKNOWN_ERROR',
      },
    };
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Analyse a CV text against a raw job description text.
   * Keyword extraction (stopword filtering, phrase detection) is performed
   * automatically inside the use case.
   *
   * @param {{ cvText: string, jobDescriptionText: string }} input
   * @returns {{ ok: boolean, data?: import('../../application/dtos/AtsAnalysisDTO.js').AtsAnalysisDTO, error?: { message: string, code: string } }}
   */
  analyze(input) {
    const cvText =
      typeof input?.cvText === 'string' ? input.cvText.trim() : '';
    const jobDescriptionText =
      typeof input?.jobDescriptionText === 'string'
        ? input.jobDescriptionText.trim()
        : '';

    if (!cvText) {
      return this.#fail({
        message: 'CV text is required.',
        code: 'VALIDATION_ERROR',
      });
    }

    if (!jobDescriptionText) {
      return this.#fail({
        message: 'Job description text is required.',
        code: 'VALIDATION_ERROR',
      });
    }

    try {
      const dto = this.#analyzeAts.execute({ cvText, jobDescriptionText });
      return this.#ok(dto);
    } catch (err) {
      return this.#fail(err);
    }
  }
}
