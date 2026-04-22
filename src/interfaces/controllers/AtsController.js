/**
 * AtsController
 *
 * Thin adapter between the ATS dashboard UI and the AnalyzeAtsUseCase.
 * Responsibilities:
 *   • Coerce and validate raw view input (CV text + keywords string).
 *   • Parse the comma-separated keywords field into an array.
 *   • Call AnalyzeAtsUseCase.
 *   • Return a plain result envelope ({ ok, data } | { ok, error }).
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
   * Analyse a CV text against a raw keywords string (comma or newline separated).
   *
   * @param {{ cvText: string, keywordsRaw: string }} input
   * @returns {{ ok: boolean, data?: import('../../application/dtos/AtsAnalysisDTO.js').AtsAnalysisDTO, error?: { message: string, code: string } }}
   */
  analyze(input) {
    const cvText =
      typeof input?.cvText === 'string' ? input.cvText.trim() : '';
    const keywordsRaw =
      typeof input?.keywordsRaw === 'string' ? input.keywordsRaw.trim() : '';

    if (!cvText) {
      return this.#fail({
        message: 'CV text is required.',
        code: 'VALIDATION_ERROR',
      });
    }

    if (!keywordsRaw) {
      return this.#fail({
        message: 'At least one keyword is required.',
        code: 'VALIDATION_ERROR',
      });
    }

    // Accept comma-separated, newline-separated, or mixed delimiters
    const keywords = keywordsRaw
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    try {
      const dto = this.#analyzeAts.execute({ cvText, keywords });
      return this.#ok(dto);
    } catch (err) {
      return this.#fail(err);
    }
  }
}
