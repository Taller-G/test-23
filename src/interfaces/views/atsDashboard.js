/**
 * atsDashboard.js — ATS Results Dashboard View
 *
 * Renders the ATS analyser form and the animated results panel.
 * Results panel features:
 *  • Animated SVG donut/gauge chart with dynamic neon colour (red / yellow / green).
 *  • Slide-up entrance animation when results appear.
 *  • Keyword badges — green for found, red for missing.
 *  • CV section detection panel (experience, education, skills, contact).
 *  • At least 3 generic CV improvement suggestions.
 *  • "Copy report" button that writes a plain-text summary to the clipboard.
 *
 * The form accepts:
 *  • CV / Résumé text (pasted plain text)
 *  • Job Description text (full text — keywords are extracted automatically
 *    server-side via KeywordExtractorDomainService, filtering EN/ES stopwords)
 *
 * Layer: Interfaces → Views
 * Imports: nothing from application or domain — receives DTOs via the controller.
 */

import { AtsController } from '../controllers/AtsController.js';

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Generic CV improvement suggestions always shown in the results panel.
 * @type {string[]}
 */
const GENERIC_SUGGESTIONS = [
  'Tailor your professional summary to mirror the job description language and highlight your most relevant skills.',
  'Use strong action verbs (e.g. "led", "built", "reduced", "delivered") to begin each bullet point in your experience section.',
  'Quantify your achievements wherever possible — numbers, percentages, and timeframes make impact concrete and scannable.',
  'Ensure your CV uses a clean, single-column layout with standard section headings (Experience, Education, Skills) that ATS parsers recognise.',
  'Include both the abbreviated and full forms of key terms (e.g. "AI / Artificial Intelligence") to maximise keyword coverage.',
];

/**
 * Metadata for each canonical CV section shown in the detection panel.
 * @type {Array<{ key: string, label: string, labelEs: string, icon: string }>}
 */
const CV_SECTIONS_META = [
  { key: 'experience',  label: 'Experience',  labelEs: 'Experiencia', icon: '💼' },
  { key: 'education',   label: 'Education',   labelEs: 'Educación',   icon: '🎓' },
  { key: 'skills',      label: 'Skills',      labelEs: 'Habilidades', icon: '⚡' },
  { key: 'contact',     label: 'Contact',     labelEs: 'Contacto',    icon: '📬' },
];

// Gauge SVG geometry
const GAUGE_RADIUS = 80;
const GAUGE_CX = 100;
const GAUGE_CY = 100;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Mounts the ATS dashboard into the given container element and wires all
 * interactions. The controller is instantiated internally so the view has
 * a single public dependency: the container element.
 *
 * @param {HTMLElement} container — DOM node to inject into (replaces innerHTML).
 * @returns {{ destroy: () => void }} Teardown helper.
 */
export function mountAtsDashboard(container) {
  if (!container) {
    console.error('mountAtsDashboard: container element not found.');
    return { destroy: () => {} };
  }

  const controller = new AtsController();

  container.innerHTML = _buildSection();

  const form              = container.querySelector('#ats-form');
  const cvInput           = container.querySelector('#ats-cv-text');
  const jdInput           = container.querySelector('#ats-jd-text');
  const resultsPanel      = container.querySelector('#ats-results');
  const formError         = container.querySelector('#ats-form-error');

  if (!form || !cvInput || !jdInput || !resultsPanel || !formError) {
    console.error('mountAtsDashboard: required DOM elements missing after mount.');
    return { destroy: () => {} };
  }

  // ── Form submission ─────────────────────────────────────────────────────────

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _clearError(formError);

    const result = controller.analyze({
      cvText: cvInput.value,
      jobDescriptionText: jdInput.value,
    });

    if (!result.ok) {
      _showError(formError, result.error.message);
      return;
    }

    _renderResults(resultsPanel, result.data);
  });

  // ── Reset — hide results when inputs change significantly ───────────────────

  const onInputChange = () => {
    if (resultsPanel.classList.contains('ats-results--visible')) {
      resultsPanel.classList.remove('ats-results--visible');
    }
  };

  cvInput.addEventListener('input', onInputChange);
  jdInput.addEventListener('input', onInputChange);

  return {
    destroy() {
      cvInput.removeEventListener('input', onInputChange);
      jdInput.removeEventListener('input', onInputChange);
    },
  };
}

// ── Private: render results panel ────────────────────────────────────────────

/**
 * Populate and reveal the results panel with animated gauge + keyword badges.
 *
 * @param {HTMLElement} panel
 * @param {import('../../application/dtos/AtsAnalysisDTO.js').AtsAnalysisDTO} dto
 */
function _renderResults(panel, dto) {
  const { score, tier, foundKeywords, missingKeywords, detectedSections } = dto;

  // Inject dynamic HTML
  panel.innerHTML = _buildResultsHTML(
    score,
    tier,
    foundKeywords,
    missingKeywords,
    detectedSections
  );

  // Trigger slide-up + run the gauge animation on next frame so CSS transition fires
  requestAnimationFrame(() => {
    panel.classList.add('ats-results--visible');

    // Animate the SVG arc after the panel has appeared
    requestAnimationFrame(() => {
      _animateGauge(panel, score);
    });
  });

  // Wire "Copy report" button
  const copyBtn = panel.querySelector('#ats-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      _copyReportToClipboard(
        copyBtn,
        score,
        tier,
        foundKeywords,
        missingKeywords,
        detectedSections
      );
    });
  }
}

// ── Private: gauge animation ─────────────────────────────────────────────────

/**
 * Drives the SVG donut-arc animation by interpolating stroke-dashoffset from
 * the "empty" value down to the target value over ~1.2 s with ease-out easing.
 * Also drives the glow duplicate arc in sync.
 *
 * @param {HTMLElement} panel
 * @param {number}      score  — 0-100
 */
function _animateGauge(panel, score) {
  const arc  = panel.querySelector('#ats-gauge-arc');
  const glow = panel.querySelector('.ats-gauge__glow');
  if (!arc) return;

  const targetOffset =
    GAUGE_CIRCUMFERENCE - (score / 100) * GAUGE_CIRCUMFERENCE;

  // Start at the "empty" state
  arc.style.strokeDashoffset  = String(GAUGE_CIRCUMFERENCE);
  if (glow) glow.style.strokeDashoffset = String(GAUGE_CIRCUMFERENCE);

  const duration = 1200; // ms
  const start    = performance.now();

  function step(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);

    const currentOffset =
      GAUGE_CIRCUMFERENCE - eased * (GAUGE_CIRCUMFERENCE - targetOffset);

    arc.style.strokeDashoffset = String(currentOffset);
    if (glow) glow.style.strokeDashoffset = String(currentOffset);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

// ── Private: clipboard ────────────────────────────────────────────────────────

/**
 * Builds a plain-text report and copies it to the clipboard.
 * Briefly changes the button label to confirm success or failure.
 *
 * @param {HTMLElement} btn
 * @param {number}      score
 * @param {string}      tier
 * @param {string[]}    foundKeywords
 * @param {string[]}    missingKeywords
 * @param {{ experience: boolean, education: boolean, skills: boolean, contact: boolean }} detectedSections
 */
function _copyReportToClipboard(
  btn,
  score,
  tier,
  foundKeywords,
  missingKeywords,
  detectedSections
) {
  const tierLabel = { low: 'Low', medium: 'Medium', high: 'High' }[tier] ?? tier;

  const sectionLines = CV_SECTIONS_META.map(({ key, label }) => {
    const detected = detectedSections?.[key] ?? false;
    return `  ${detected ? '✓' : '✗'} ${label}`;
  });

  const lines = [
    '══════════════════════════════════════',
    '  ATS ANALYSIS REPORT',
    '══════════════════════════════════════',
    '',
    `  Score : ${score}/100  (${tierLabel})`,
    '',
    '──────────────────────────────────────',
    '  CV SECTIONS DETECTED',
    '──────────────────────────────────────',
    ...sectionLines,
    '',
    '──────────────────────────────────────',
    '  KEYWORDS FOUND',
    '──────────────────────────────────────',
    foundKeywords.length > 0
      ? foundKeywords.map((k) => `  ✓ ${k}`).join('\n')
      : '  (none)',
    '',
    '──────────────────────────────────────',
    '  KEYWORDS MISSING',
    '──────────────────────────────────────',
    missingKeywords.length > 0
      ? missingKeywords.map((k) => `  ✗ ${k}`).join('\n')
      : '  (none)',
    '',
    '──────────────────────────────────────',
    '  IMPROVEMENT SUGGESTIONS',
    '──────────────────────────────────────',
    ...GENERIC_SUGGESTIONS.map((s, i) => `  ${i + 1}. ${s}`),
    '',
    '══════════════════════════════════════',
  ];

  const text = lines.join('\n');

  navigator.clipboard
    .writeText(text)
    .then(() => {
      const original = btn.textContent;
      btn.textContent = '✓ Copied!';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 2000);
    })
    .catch(() => {
      const original = btn.textContent;
      btn.textContent = '✗ Failed';
      setTimeout(() => {
        btn.textContent = original;
      }, 2000);
    });
}

// ── Private: error helpers ────────────────────────────────────────────────────

/**
 * @param {HTMLElement} el
 * @param {string}      message
 */
function _showError(el, message) {
  el.textContent = `⚠ ${message}`;
  el.removeAttribute('hidden');
  el.setAttribute('aria-live', 'assertive');
}

/** @param {HTMLElement} el */
function _clearError(el) {
  el.textContent = '';
  el.setAttribute('hidden', '');
}

// ── HTML builders ─────────────────────────────────────────────────────────────

/**
 * Builds the complete ATS section HTML string (form + empty results panel).
 * @returns {string}
 */
function _buildSection() {
  return `
    <section
      class="ats"
      id="section-ats"
      data-section="section-ats"
      aria-labelledby="ats-heading"
    >
      <header class="ats__header">
        <h2 id="ats-heading" class="ats__title">ATS Analyser</h2>
        <p class="ats__subtitle">
          Paste your CV and a job description — keywords are extracted automatically
        </p>
      </header>

      <!-- ── Input form ──────────────────────────────────────────────────────── -->
      <div class="ats__form-card card" aria-label="ATS analysis inputs">
        <form id="ats-form" class="ats__form form" novalidate>

          <div class="form__group">
            <label class="form__label" for="ats-cv-text">
              CV / Résumé Text <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="ats-cv-text"
              class="form__input ats__textarea"
              placeholder="Paste your full CV or résumé here…"
              rows="8"
              required
              aria-describedby="ats-cv-hint"
            ></textarea>
            <span id="ats-cv-hint" class="ats__field-hint">
              Paste the complete text of your CV, including all sections.
            </span>
          </div>

          <div class="form__group">
            <label class="form__label" for="ats-jd-text">
              Job Description <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="ats-jd-text"
              class="form__input ats__textarea"
              placeholder="Paste the full job description here — keywords will be extracted automatically…"
              rows="6"
              required
              aria-describedby="ats-jd-hint"
            ></textarea>
            <span id="ats-jd-hint" class="ats__field-hint">
              Paste the complete job posting. Stopwords (EN/ES) are filtered out automatically.
            </span>
          </div>

          <p id="ats-form-error" class="ats__form-error" role="alert" hidden></p>

          <button class="btn btn--primary ats__submit-btn" type="submit">
            ⚡ Analyse CV
          </button>

        </form>
      </div>

      <!-- ── Results panel — hidden until analysis runs ──────────────────────── -->
      <div
        id="ats-results"
        class="ats-results"
        aria-label="ATS analysis results"
        aria-live="polite"
      ></div>

    </section>`;
}

/**
 * Builds the full results panel HTML after an analysis run.
 *
 * @param {number}   score
 * @param {string}   tier         — "low" | "medium" | "high"
 * @param {string[]} found
 * @param {string[]} missing
 * @param {{ experience: boolean, education: boolean, skills: boolean, contact: boolean }} detectedSections
 * @returns {string}
 */
function _buildResultsHTML(score, tier, found, missing, detectedSections) {
  return `
    <div class="ats-results__inner">

      <!-- ── Gauge + score ────────────────────────────────────────────────── -->
      <div class="ats-results__gauge-section" aria-label="ATS score: ${score} out of 100">
        ${_buildGaugeSVG(tier)}
        <div class="ats-results__score-label">
          <span class="ats-results__score-value ats-results__score-value--${tier}">${score}</span>
          <span class="ats-results__score-unit">/ 100</span>
        </div>
        <p class="ats-results__tier-label ats-results__tier-label--${tier}">
          ${_tierText(tier)}
        </p>
      </div>

      <!-- ── CV section detection ──────────────────────────────────────────── -->
      ${_buildSectionsHTML(detectedSections)}

      <!-- ── Keywords ─────────────────────────────────────────────────────── -->
      <div class="ats-results__keywords">

        <div class="ats-results__kw-group" aria-label="Found keywords">
          <h3 class="ats-results__kw-heading ats-results__kw-heading--found">
            <span class="ats-results__kw-icon" aria-hidden="true">✓</span>
            Found <span class="ats-results__kw-count">(${found.length})</span>
          </h3>
          ${
            found.length > 0
              ? `<ul class="ats-results__kw-list" role="list">
                  ${found.map((k) => `<li><span class="badge badge--kw-found">${_escapeHtml(k)}</span></li>`).join('')}
                </ul>`
              : `<p class="ats-results__kw-empty">No keywords from the job description were found in the CV.</p>`
          }
        </div>

        <div class="ats-results__kw-group" aria-label="Missing keywords">
          <h3 class="ats-results__kw-heading ats-results__kw-heading--missing">
            <span class="ats-results__kw-icon" aria-hidden="true">✗</span>
            Missing <span class="ats-results__kw-count">(${missing.length})</span>
          </h3>
          ${
            missing.length > 0
              ? `<ul class="ats-results__kw-list" role="list">
                  ${missing.map((k) => `<li><span class="badge badge--kw-missing">${_escapeHtml(k)}</span></li>`).join('')}
                </ul>
                <p class="ats-results__kw-tip">
                  ▸ Incorporate these keywords naturally into your CV to improve your ATS score.
                </p>`
              : `<p class="ats-results__kw-empty">All keywords were found — great match!</p>`
          }
        </div>

      </div>

      <!-- ── Suggestions ───────────────────────────────────────────────────── -->
      <div class="ats-results__suggestions" aria-label="Improvement suggestions">
        <h3 class="ats-results__suggestions-heading">
          <span aria-hidden="true">💡</span> Improvement Suggestions
        </h3>
        <ol class="ats-results__suggestions-list">
          ${GENERIC_SUGGESTIONS.map(
            (s) =>
              `<li class="ats-results__suggestion">${_escapeHtml(s)}</li>`
          ).join('')}
        </ol>
      </div>

      <!-- ── Copy report ────────────────────────────────────────────────────── -->
      <div class="ats-results__actions">
        <button
          id="ats-copy-btn"
          class="btn btn--secondary"
          type="button"
          aria-label="Copy full ATS report to clipboard"
        >
          📋 Copy Report
        </button>
      </div>

    </div>`;
}

/**
 * Builds the CV section detection panel HTML.
 *
 * @param {{ experience: boolean, education: boolean, skills: boolean, contact: boolean }} detectedSections
 * @returns {string}
 */
function _buildSectionsHTML(detectedSections) {
  const sectionItems = CV_SECTIONS_META.map(({ key, label, labelEs, icon }) => {
    const detected = detectedSections?.[key] ?? false;
    const stateClass = detected
      ? 'ats-section-chip--found'
      : 'ats-section-chip--missing';
    const stateIcon  = detected ? '✓' : '✗';
    const ariaLabel  = `${label} section ${detected ? 'detected' : 'not detected'} in CV`;

    return `
      <li
        class="ats-section-chip ${stateClass}"
        aria-label="${ariaLabel}"
      >
        <span class="ats-section-chip__icon" aria-hidden="true">${icon}</span>
        <span class="ats-section-chip__label">
          <span class="ats-section-chip__name">${_escapeHtml(label)}</span>
          <span class="ats-section-chip__name-es">${_escapeHtml(labelEs)}</span>
        </span>
        <span class="ats-section-chip__state" aria-hidden="true">${stateIcon}</span>
      </li>`;
  }).join('');

  const detectedCount = CV_SECTIONS_META.filter(
    ({ key }) => detectedSections?.[key]
  ).length;

  return `
    <div class="ats-results__sections" aria-label="CV section detection">
      <h3 class="ats-results__sections-heading">
        <span aria-hidden="true">🗂</span> CV Sections Detected
        <span class="ats-results__sections-count">${detectedCount} / ${CV_SECTIONS_META.length}</span>
      </h3>
      <ul class="ats-section-chips" role="list">
        ${sectionItems}
      </ul>
      ${
        detectedCount < CV_SECTIONS_META.length
          ? `<p class="ats-results__sections-tip">
               ▸ Missing sections reduce ATS parse-ability. Add clear headings that match
               standard section names (Experience, Education, Skills, Contact).
             </p>`
          : `<p class="ats-results__sections-ok">
               ✦ All key sections detected — your CV structure is ATS-friendly.
             </p>`
      }
    </div>`;
}

/**
 * Builds the SVG donut gauge.
 * The animated arc (#ats-gauge-arc) starts at stroke-dashoffset = circumference
 * (invisible) and is driven to its final position by _animateGauge().
 *
 * @param {string} tier — "low" | "medium" | "high"
 * @returns {string}
 */
function _buildGaugeSVG(tier) {
  const r    = GAUGE_RADIUS;
  const cx   = GAUGE_CX;
  const cy   = GAUGE_CY;
  const circ = GAUGE_CIRCUMFERENCE;

  return `
    <svg
      class="ats-gauge"
      viewBox="0 0 200 200"
      width="180"
      height="180"
      role="img"
      aria-hidden="true"
    >
      <!-- Background track -->
      <circle
        class="ats-gauge__track"
        cx="${cx}"
        cy="${cy}"
        r="${r}"
        fill="none"
        stroke-width="14"
        stroke-linecap="round"
      />
      <!-- Animated arc — colour driven by tier via CSS custom property -->
      <circle
        id="ats-gauge-arc"
        class="ats-gauge__arc ats-gauge__arc--${tier}"
        cx="${cx}"
        cy="${cy}"
        r="${r}"
        fill="none"
        stroke-width="14"
        stroke-linecap="round"
        stroke-dasharray="${circ}"
        stroke-dashoffset="${circ}"
        transform="rotate(-90 ${cx} ${cy})"
      />
      <!-- Glow duplicate (behind, blurred via CSS filter) -->
      <circle
        class="ats-gauge__glow ats-gauge__glow--${tier}"
        cx="${cx}"
        cy="${cy}"
        r="${r}"
        fill="none"
        stroke-width="18"
        stroke-linecap="round"
        stroke-dasharray="${circ}"
        stroke-dashoffset="${circ}"
        transform="rotate(-90 ${cx} ${cy})"
        aria-hidden="true"
      />
    </svg>`;
}

/**
 * Human-readable label for the score tier.
 * @param {string} tier
 * @returns {string}
 */
function _tierText(tier) {
  return (
    {
      low:    '⚠ Low Match — significant improvements needed',
      medium: '◑ Medium Match — close, but room to grow',
      high:   '✦ Strong Match — excellent ATS fit',
    }[tier] ?? tier
  );
}

/**
 * Minimal HTML escaping to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function _escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
