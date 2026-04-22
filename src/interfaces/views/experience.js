/**
 * experience.js — Experience Timeline View
 *
 * Renders a vertical interactive timeline with 4 mocked work experiences.
 * Scroll-driven animations are powered by IntersectionObserver:
 *   • The centre SVG fill line grows as entries come into view.
 *   • Each card slides in from its side (left/right alternating on desktop,
 *     right on mobile) when it enters the viewport.
 *   • Connector dots glow neon when their card activates.
 *
 * Layer : Interfaces → Views
 * Imports: nothing from application or domain — pure presentation.
 */

// ── Mock data ─────────────────────────────────────────────────────────────────

/** @typedef {{ company: string, slug: string, initials: string, role: string, dates: string, current: boolean, description: string, achievements: string[] }} Experience */

/** @type {Experience[]} */
const EXPERIENCES = [
  {
    company: 'TechNova Labs',
    slug: 'technova',
    initials: 'TN',
    role: 'Senior Frontend Engineer',
    dates: 'Jan 2023 — Present',
    current: true,
    description:
      'Led the redesign of the core SaaS dashboard serving 40 000+ monthly active users. ' +
      'Defined the component architecture, design-token system, and performance budget.',
    achievements: [
      'Reduced initial page load by 47 % through code-splitting and lazy hydration.',
      'Built a real-time data-visualisation layer using WebSockets and Canvas API.',
      'Mentored 4 junior engineers; introduced weekly design-review rituals.',
      'Shipped an accessible component library (WCAG 2.1 AA) adopted across 3 products.',
    ],
  },
  {
    company: 'CipherSoft',
    slug: 'ciphersoft',
    initials: 'CS',
    role: 'Full-Stack Developer',
    dates: 'Mar 2021 — Dec 2022',
    current: false,
    description:
      'Core contributor to an end-to-end encrypted file-sharing platform built on Node.js ' +
      'and React. Owned the cryptographic pipeline and the browser extension.',
    achievements: [
      'Implemented AES-256-GCM client-side encryption with zero-knowledge key derivation.',
      'Designed and deployed a multi-region CDN strategy cutting p99 latency by 62 %.',
      'Migrated 1.2 M user accounts from a legacy monolith to microservices with zero downtime.',
      'Open-sourced an RSA key-exchange utility that reached 3 k GitHub stars.',
    ],
  },
  {
    company: 'CloudMatrix',
    slug: 'cloudmatrix',
    initials: 'CM',
    role: 'Cloud Infrastructure Engineer',
    dates: 'Aug 2019 — Feb 2021',
    current: false,
    description:
      'Owned the Kubernetes cluster fleet for a B2B analytics SaaS. Championed the ' +
      'adoption of GitOps workflows and drove the migration from bare-metal to GKE.',
    achievements: [
      'Reduced infrastructure costs by 38 % by right-sizing nodes and adopting spot instances.',
      'Authored Terraform modules used across 6 engineering teams.',
      'Designed auto-scaling policies that sustained 5× traffic spikes during product launches.',
      'Achieved 99.97 % uptime SLA for 18 consecutive months.',
    ],
  },
  {
    company: 'StartupXYZ',
    slug: 'startupxyz',
    initials: 'SX',
    role: 'Software Engineer Intern → Junior Engineer',
    dates: 'Jun 2018 — Jul 2019',
    current: false,
    description:
      'First engineering role at a pre-Series A fintech startup. Worked across the full ' +
      'stack — from REST API design to mobile-responsive UI — in a fast-paced, 8-person team.',
    achievements: [
      'Built the onboarding funnel that increased activation rate from 34 % to 61 %.',
      'Integrated Plaid and Stripe APIs, enabling the payments feature to go live in 6 weeks.',
      'Wrote the initial test suite that brought coverage from 12 % to 74 %.',
      'Promoted to Junior Engineer 3 months early based on performance reviews.',
    ],
  },
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Mounts the Experience section into the given container element and wires all
 * scroll-driven animations via IntersectionObserver.
 *
 * @param {HTMLElement} container - The DOM node to inject into (replaces innerHTML).
 * @returns {{ destroy: () => void }} Teardown function to disconnect observers.
 */
export function mountExperience(container) {
  if (!container) {
    console.error('mountExperience: container element not found.');
    return { destroy: () => {} };
  }

  container.innerHTML = _buildSection();

  // Grab the live elements we need to drive
  const trackFill = /** @type {HTMLElement|null} */ (
    container.querySelector('.timeline__fill')
  );
  const entries = /** @type {NodeListOf<HTMLElement>} */ (
    container.querySelectorAll('.timeline__entry')
  );

  if (!trackFill || !entries.length) {
    console.error('mountExperience: timeline elements not found after mount.');
    return { destroy: () => {} };
  }

  // ── IntersectionObserver — card slide-in ─────────────────────────────────

  const cardObserver = new IntersectionObserver(
    (records) => {
      records.forEach((record) => {
        if (record.isIntersecting) {
          /** @type {HTMLElement} */ (record.target).classList.add('is-active');
          // Once the card has appeared we don't need to watch it any more
          cardObserver.unobserve(record.target);
        }
      });
      // After any card activates, recalculate the line fill
      _updateLineFill(trackFill, entries);
    },
    {
      // Trigger when 20 % of the entry is inside the viewport
      threshold: 0.2,
      rootMargin: '0px 0px -60px 0px',
    }
  );

  entries.forEach((entry) => cardObserver.observe(entry));

  // ── Scroll listener — grow the centre line ────────────────────────────────

  const onScroll = _throttle(() => _updateLineFill(trackFill, entries), 30);
  window.addEventListener('scroll', onScroll, { passive: true });

  // Run once on mount so the line is correct if the section is already visible
  _updateLineFill(trackFill, entries);

  // ── Teardown ─────────────────────────────────────────────────────────────
  return {
    destroy() {
      cardObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
    },
  };
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Updates the CSS custom property `--timeline-progress` on the fill element
 * to reflect how far the user has scrolled through the timeline section.
 *
 * Progress is computed as the fraction of the timeline container that has
 * passed the bottom of the viewport, clamped to [0, 100].
 *
 * @param {HTMLElement} fill
 * @param {NodeListOf<HTMLElement>} entries
 */
function _updateLineFill(fill, entries) {
  const track = fill.parentElement;
  if (!track) return;

  const trackRect = track.getBoundingClientRect();
  const viewportH  = window.innerHeight;

  // How far the track's top has scrolled above the bottom of the viewport
  const scrolled   = viewportH - trackRect.top;
  const total      = trackRect.height;

  if (total <= 0) return;

  const progress   = Math.min(100, Math.max(0, (scrolled / total) * 100));
  fill.style.setProperty('--timeline-progress', `${progress}%`);

  // Also keep the CSS variable on the fill element itself for the height rule
  fill.style.height = `${progress}%`;
}

/**
 * Minimal leading-edge throttle using requestAnimationFrame.
 * @param {() => void} fn
 * @param {number} limitMs
 * @returns {() => void}
 */
function _throttle(fn, limitMs) {
  let lastRun = 0;
  let raf     = null;
  return function throttled() {
    const now = Date.now();
    if (now - lastRun >= limitMs) {
      lastRun = now;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fn);
    }
  };
}

// ── HTML builders ─────────────────────────────────────────────────────────────

/**
 * Builds the full Experience section HTML string.
 * @returns {string}
 */
function _buildSection() {
  return `
    <section
      class="experience"
      id="section-experience"
      data-section="section-experience"
      aria-labelledby="experience-heading"
    >
      <header class="experience__header">
        <h2 id="experience-heading" class="experience__title">Experience</h2>
        <p class="experience__subtitle">A journey through the code</p>
      </header>

      <div class="timeline" role="list" aria-label="Work experience timeline">

        <!-- Animated centre line -->
        <div class="timeline__track" aria-hidden="true">
          <div class="timeline__fill"></div>
        </div>

        ${EXPERIENCES.map((exp, index) => _buildEntry(exp, index)).join('')}

      </div>
    </section>`;
}

/**
 * Builds one timeline entry (card + dot + spacer).
 *
 * @param {Experience} exp
 * @param {number}     index  0-based position in EXPERIENCES array
 * @returns {string}
 */
function _buildEntry(exp, index) {
  const currentBadge = exp.current
    ? `<span class="badge badge--current" aria-label="Current position">Now</span>`
    : '';

  const achievementItems = exp.achievements
    .map(
      (a) =>
        `<li class="timeline__achievement" role="listitem">${_escapeHtml(a)}</li>`
    )
    .join('');

  return `
    <div
      class="timeline__entry"
      role="listitem"
      aria-label="${_escapeHtml(exp.company)} — ${_escapeHtml(exp.role)}"
    >
      <!-- Centre connector dot -->
      <div class="timeline__dot" aria-hidden="true"></div>

      <!-- Card slot (left for odd, right for even) -->
      <div class="timeline__card-wrap">
        <article class="timeline__card" aria-label="${_escapeHtml(exp.company)}">

          <header class="timeline__card-header">
            <!-- CSS initials icon -->
            <div
              class="company-icon company-icon--${_escapeHtml(exp.slug)}"
              aria-hidden="true"
              title="${_escapeHtml(exp.company)}"
            >${_escapeHtml(exp.initials)}</div>

            <div class="timeline__card-meta">
              <span class="timeline__company">
                ${_escapeHtml(exp.company)}${currentBadge}
              </span>
              <span class="timeline__role">${_escapeHtml(exp.role)}</span>
              <time class="timeline__dates">${_escapeHtml(exp.dates)}</time>
            </div>
          </header>

          <div class="timeline__divider" aria-hidden="true"></div>

          <p class="timeline__description">${_escapeHtml(exp.description)}</p>

          <ul class="timeline__achievements" aria-label="Key achievements">
            ${achievementItems}
          </ul>

        </article>
      </div>

      <!-- Empty spacer fills the opposite column on desktop -->
      <div class="timeline__spacer" aria-hidden="true"></div>
    </div>`;
}

/**
 * Minimal HTML escaping to prevent XSS via mocked-data strings.
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
