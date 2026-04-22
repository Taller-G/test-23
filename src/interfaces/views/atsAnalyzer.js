/**
 * atsAnalyzer.js — ATS Analyzer View
 *
 * Renders the ATS (Applicant Tracking System) analyzer tool:
 *   • Two glassmorphism textarea panels — CV and Job Description
 *   • Character counters per field
 *   • Per-field inline validation error messages
 *   • "Analizar" button with neon scanner loading animation
 *   • Results placeholder section (ready for future analysis output)
 *
 * Layout:
 *   • Desktop (≥768px) — two-column grid
 *   • Mobile (<768px)  — single column
 *
 * Layer: Interfaces → Views
 * Imports: nothing from application or domain — pure presentation.
 */

// ── Placeholder copy ──────────────────────────────────────────────────────────

const CV_PLACEHOLDER = `Ejemplo — pega aquí tu CV completo:

Juan García
Desarrollador Full Stack | Madrid, España
juan.garcia@email.com | linkedin.com/in/juangarcia | github.com/juangarcia

EXPERIENCIA PROFESIONAL

Senior Frontend Developer — TechCorp S.L.  (2021 – presente)
• Lideré la migración de una SPA legacy en jQuery a React 18 + TypeScript,
  reduciendo el bundle inicial un 42 % y mejorando el TTI en 1.8 s.
• Implementé un design system con 60+ componentes reutilizables (Storybook).
• Mentoring de 3 juniors; code reviews diarias y pair-programming semanal.

Full Stack Developer — StartupXYZ  (2019 – 2021)
• Desarrollé microservicios REST con Node.js + Express y bases de datos
  PostgreSQL y Redis; cobertura de tests >90 % con Jest.
• Integré pasarelas de pago (Stripe, Redsys) en entorno PCI-DSS.

EDUCACIÓN
Grado en Ingeniería Informática — Universidad Politécnica de Madrid (2019)

HABILIDADES TÉCNICAS
React, TypeScript, Node.js, Python, PostgreSQL, Docker, AWS (EC2, S3, Lambda),
Git, CI/CD (GitHub Actions), Agile/Scrum`;

const JD_PLACEHOLDER = `Ejemplo — pega aquí la oferta de trabajo:

Senior Frontend Engineer — FinTech Innovators

SOBRE EL PUESTO
Buscamos un/a Senior Frontend Engineer apasionado/a por crear interfaces
de usuario de alto rendimiento para nuestra plataforma de pagos B2B que
procesa >2 M transacciones al día.

RESPONSABILIDADES
• Diseñar e implementar nuevas funcionalidades en React + TypeScript.
• Colaborar con Product y UX para traducir wireframes en componentes
  accesibles (WCAG 2.1 AA).
• Mantener y mejorar el design system interno.
• Participar activamente en code reviews y definición de arquitectura.
• Optimizar el rendimiento: Core Web Vitals, bundle size, lazy loading.

REQUISITOS
• 4+ años de experiencia con React y ecosistema moderno (hooks, context).
• TypeScript avanzado — interfaces, generics, utility types.
• Experiencia con testing (Jest, React Testing Library, Cypress).
• Conocimientos de CI/CD y despliegues en entornos cloud (AWS o GCP).
• Inglés B2 o superior.

SE VALORA
• Experiencia en sector fintech o entornos regulados.
• Conocimiento de micro-frontends y module federation.
• Contribuciones a proyectos open source.

OFRECEMOS  |  Salario 55 – 70 K€  |  Remoto 100 %  |  Stock options`;

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_CHARS = 12000;
const WARN_CHARS = 10000;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Mounts the ATS Analyzer into the given container element.
 * @param {HTMLElement} container
 * @returns {{ destroy: () => void }}
 */
export function mountAtsAnalyzer(container) {
  container.innerHTML = _buildHTML();
  return _bindInteractions(container);
}

// ── HTML builder ──────────────────────────────────────────────────────────────

/** @returns {string} */
function _buildHTML() {
  return `
    <div class="ats" id="ats-root">

      <!-- ── Section header ─────────────────────────────────────────── -->
      <header class="ats__header">
        <span class="ats__eyebrow" aria-hidden="true">// herramienta</span>
        <h2 class="ats__title">Analizador ATS</h2>
        <p class="ats__subtitle">
          Pega tu CV y la descripción del puesto para obtener un análisis
          de compatibilidad con sistemas ATS y recomendaciones de mejora.
        </p>
      </header>

      <!-- ── Two-column input grid ──────────────────────────────────── -->
      <form
        id="ats-form"
        class="ats__form"
        novalidate
        aria-label="ATS Analyzer form"
      >
        <div class="ats__grid">

          <!-- CV panel -->
          <div class="ats__panel" id="ats-panel-cv">
            <div class="ats__panel-header">
              <div class="ats__panel-icon" aria-hidden="true">📄</div>
              <div class="ats__panel-label-group">
                <label class="ats__panel-label" for="ats-cv">
                  Tu CV <span class="sr-only">(requerido)</span>
                  <span aria-hidden="true"> *</span>
                </label>
                <span class="ats__panel-hint">Copia y pega el texto completo de tu currículum</span>
              </div>
            </div>
            <textarea
              id="ats-cv"
              class="ats__textarea"
              name="cv"
              placeholder="${_escapeAttr(CV_PLACEHOLDER)}"
              maxlength="${MAX_CHARS}"
              aria-required="true"
              aria-describedby="ats-cv-error ats-cv-count"
              spellcheck="false"
              autocomplete="off"
            ></textarea>
            <div class="ats__char-count" id="ats-cv-count" aria-live="polite" aria-atomic="true">
              0 / ${MAX_CHARS.toLocaleString()}
            </div>
            <span
              class="ats__field-error"
              id="ats-cv-error"
              role="alert"
              aria-live="polite"
            ></span>
          </div>

          <!-- Job Description panel -->
          <div class="ats__panel ats__panel--jd" id="ats-panel-jd">
            <div class="ats__panel-header">
              <div class="ats__panel-icon" aria-hidden="true">💼</div>
              <div class="ats__panel-label-group">
                <label class="ats__panel-label" for="ats-jd">
                  Descripción del puesto <span class="sr-only">(requerido)</span>
                  <span aria-hidden="true"> *</span>
                </label>
                <span class="ats__panel-hint">Pega la oferta de trabajo completa (job description)</span>
              </div>
            </div>
            <textarea
              id="ats-jd"
              class="ats__textarea"
              name="jd"
              placeholder="${_escapeAttr(JD_PLACEHOLDER)}"
              maxlength="${MAX_CHARS}"
              aria-required="true"
              aria-describedby="ats-jd-error ats-jd-count"
              spellcheck="false"
              autocomplete="off"
            ></textarea>
            <div class="ats__char-count" id="ats-jd-count" aria-live="polite" aria-atomic="true">
              0 / ${MAX_CHARS.toLocaleString()}
            </div>
            <span
              class="ats__field-error"
              id="ats-jd-error"
              role="alert"
              aria-live="polite"
            ></span>
          </div>

        </div><!-- /.ats__grid -->

        <!-- ── Action bar ──────────────────────────────────────────── -->
        <div class="ats__action-bar">
          <button
            type="submit"
            id="ats-submit"
            class="btn btn--analyze"
            aria-label="Analizar compatibilidad CV con descripción del puesto"
          >
            <span class="btn__text">⚡ Analizar</span>
            <span class="btn__loader" aria-hidden="true">
              <span class="btn__loader-dot"></span>
              <span class="btn__loader-dot"></span>
              <span class="btn__loader-dot"></span>
            </span>
          </button>

          <div
            id="ats-feedback"
            class="ats__feedback"
            role="alert"
            aria-live="polite"
          ></div>
        </div>

      </form><!-- /#ats-form -->

      <!-- ── Results area (shown after analysis) ────────────────────── -->
      <div
        id="ats-results"
        class="ats__results"
        aria-label="Resultados del análisis"
        aria-live="polite"
      >
        <div class="ats__results-card">
          <div class="ats__results-icon" aria-hidden="true">🔍</div>
          <p class="ats__results-placeholder">
            Los resultados del análisis aparecerán aquí.
          </p>
        </div>
      </div>

    </div><!-- /#ats-root -->`;
}

// ── Interaction wiring ────────────────────────────────────────────────────────

/**
 * Wires all event listeners after the DOM has been injected.
 * @param {HTMLElement} container
 * @returns {{ destroy: () => void }}
 */
function _bindInteractions(container) {
  const form       = container.querySelector('#ats-form');
  const cvTextarea = container.querySelector('#ats-cv');
  const jdTextarea = container.querySelector('#ats-jd');
  const submitBtn  = container.querySelector('#ats-submit');
  const feedbackEl = container.querySelector('#ats-feedback');
  const resultsEl  = container.querySelector('#ats-results');

  if (!form || !cvTextarea || !jdTextarea || !submitBtn || !feedbackEl || !resultsEl) {
    console.error('mountAtsAnalyzer: one or more required DOM elements are missing after mount.');
    return { destroy: () => {} };
  }

  // ── Character counters ────────────────────────────────────────────────────
  _bindCharCounter(cvTextarea, container.querySelector('#ats-cv-count'));
  _bindCharCounter(jdTextarea, container.querySelector('#ats-jd-count'));

  // ── Inline validation on blur ─────────────────────────────────────────────
  cvTextarea.addEventListener('blur', () => _validateField(cvTextarea, 'ats-cv-error', 'CV'));
  jdTextarea.addEventListener('blur', () => _validateField(jdTextarea, 'ats-jd-error', 'Descripción del puesto'));

  // Clear invalid state while user types
  cvTextarea.addEventListener('input', () => {
    if (cvTextarea.value.trim()) {
      _clearFieldError(cvTextarea, 'ats-cv-error');
    }
  });
  jdTextarea.addEventListener('input', () => {
    if (jdTextarea.value.trim()) {
      _clearFieldError(jdTextarea, 'ats-jd-error');
    }
  });

  // ── Form submit ───────────────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    _clearFeedback(feedbackEl);

    // Validate both fields
    const cvValid = _validateField(cvTextarea, 'ats-cv-error', 'CV');
    const jdValid = _validateField(jdTextarea, 'ats-jd-error', 'Descripción del puesto');

    if (!cvValid || !jdValid) {
      _showFeedback(
        feedbackEl,
        '⚠ Completa ambos campos antes de analizar.',
        'error'
      );
      // Focus the first invalid field
      if (!cvValid) { cvTextarea.focus(); }
      else { jdTextarea.focus(); }
      return;
    }

    // Start loading animation
    _setLoading(submitBtn, true);
    resultsEl.classList.remove('is-visible');
    _clearFeedback(feedbackEl);

    // Simulate async analysis (placeholder for real implementation)
    await _simulateAnalysis();

    // Stop loading animation
    _setLoading(submitBtn, false);

    // Show placeholder results
    _showFeedback(
      feedbackEl,
      '✅ Análisis completado. Revisa los resultados a continuación.',
      'success'
    );
    resultsEl.classList.add('is-visible');
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  return {
    destroy() {
      // No global listeners to clean up — all are on contained elements.
    },
  };
}

// ── Field helpers ─────────────────────────────────────────────────────────────

/**
 * Bind input event to update character counter display.
 * @param {HTMLTextAreaElement} textarea
 * @param {HTMLElement|null} counterEl
 */
function _bindCharCounter(textarea, counterEl) {
  if (!counterEl) { return; }

  const update = () => {
    const len = textarea.value.length;
    counterEl.textContent = `${len.toLocaleString()} / ${MAX_CHARS.toLocaleString()}`;
    counterEl.classList.toggle('ats__char-count--warn', len >= WARN_CHARS);
  };

  textarea.addEventListener('input', update);
  // Run once in case the textarea has pre-filled content
  update();
}

/**
 * Validate a single textarea field. Adds/removes invalid CSS class and
 * shows/hides inline error message.
 * @param {HTMLTextAreaElement} textarea
 * @param {string} errorId  — id of the error <span>
 * @param {string} fieldName — human-readable field name for the message
 * @returns {boolean} — true if valid
 */
function _validateField(textarea, errorId, fieldName) {
  const errorEl = document.getElementById(errorId);
  const value   = textarea.value.trim();

  if (!value) {
    textarea.classList.add('is-invalid');
    textarea.classList.remove('is-filled');
    if (errorEl) {
      errorEl.textContent = `${fieldName} es obligatorio.`;
      errorEl.classList.add('is-visible');
    }
    textarea.setAttribute('aria-invalid', 'true');
    return false;
  }

  textarea.classList.remove('is-invalid');
  textarea.classList.add('is-filled');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.remove('is-visible');
  }
  textarea.setAttribute('aria-invalid', 'false');
  return true;
}

/**
 * Clear the error state from a field without revalidating.
 * @param {HTMLTextAreaElement} textarea
 * @param {string} errorId
 */
function _clearFieldError(textarea, errorId) {
  textarea.classList.remove('is-invalid');
  const errorEl = document.getElementById(errorId);
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.remove('is-visible');
  }
  textarea.removeAttribute('aria-invalid');
}

// ── Button helpers ────────────────────────────────────────────────────────────

/**
 * Toggle the scanner-neon loading state on the analyze button.
 * @param {HTMLButtonElement} btn
 * @param {boolean} loading
 */
function _setLoading(btn, loading) {
  btn.classList.toggle('is-loading', loading);
  btn.disabled = loading;
  btn.setAttribute('aria-busy', String(loading));
}

// ── Feedback helpers ──────────────────────────────────────────────────────────

/**
 * Display a feedback banner below the submit button.
 * @param {HTMLElement} el
 * @param {string} message
 * @param {'error'|'success'|'info'} type
 */
function _showFeedback(el, message, type) {
  el.textContent = message;
  el.className   = `ats__feedback ats__feedback--${type}`;
}

/**
 * Clear the feedback banner.
 * @param {HTMLElement} el
 */
function _clearFeedback(el) {
  el.textContent = '';
  el.className   = 'ats__feedback';
}

// ── Simulation helpers ────────────────────────────────────────────────────────

/**
 * Simulates an asynchronous analysis call (placeholder until backend exists).
 * @returns {Promise<void>}
 */
function _simulateAnalysis() {
  return new Promise((resolve) => setTimeout(resolve, 2200));
}

// ── Security helper ───────────────────────────────────────────────────────────

/**
 * Escape a string for safe use inside an HTML attribute value.
 * @param {string} str
 * @returns {string}
 */
function _escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
