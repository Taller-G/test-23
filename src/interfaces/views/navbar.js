/**
 * navbar.js — Floating Glassmorphism Navbar View
 *
 * Responsibilities (UI-only, no business logic):
 *  • Render the fixed navbar HTML into the DOM
 *  • Animate logo glitch via data-text attribute
 *  • Scroll-spy: highlight the active nav link as sections enter the viewport
 *  • Scroll listener: add/remove .navbar--scrolled for glass intensification
 *  • Hamburger toggle: open/close mobile menu with ARIA state management
 *  • Close mobile menu on link click or Escape key
 *
 * Layer: Interfaces → Views
 * Imports: nothing from application or domain — pure presentation.
 */

/** Navigation items: label + section id (must match data-section attrs in shell) */
const NAV_ITEMS = [
  { label: 'Experience', section: 'section-experience' },
  { label: 'ATS',        section: 'section-ats' },
  { label: 'Map',        section: 'section-map' },
  { label: 'Add Item',   section: 'section-add' },
  { label: 'Items',      section: 'section-list' },
];

/** Initials shown inside the logo box */
const LOGO_INITIALS = 'DA';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Mounts the navbar into the DOM and wires all interactive behaviours.
 * Call once after the page shell is rendered.
 *
 * @returns {{ destroy: () => void }} — teardown function for cleanup.
 */
export function mountNavbar() {
  _injectNavbarHTML();

  const navbar       = document.getElementById('navbar');
  const hamburger    = document.getElementById('navbar-hamburger');
  const mobileMenu   = document.getElementById('navbar-mobile-menu');

  if (!navbar || !hamburger || !mobileMenu) {
    console.error('mountNavbar: navbar elements not found in DOM.');
    return { destroy: () => {} };
  }

  // ── Scroll: glass intensification + scroll-spy ──────────────────────────
  const onScroll = _throttle(() => {
    _updateScrolledState(navbar);
    _updateActiveLinks();
  }, 80);

  window.addEventListener('scroll', onScroll, { passive: true });

  // Run once immediately so state is correct on first render
  _updateScrolledState(navbar);
  _updateActiveLinks();

  // ── Hamburger toggle ────────────────────────────────────────────────────
  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.getAttribute('aria-expanded') === 'true';
    _setMenuOpen(!isOpen, hamburger, mobileMenu);
  });

  // ── Close on mobile link click ──────────────────────────────────────────
  mobileMenu.addEventListener('click', (e) => {
    if (e.target.closest('.navbar__mobile-link')) {
      _setMenuOpen(false, hamburger, mobileMenu);
    }
  });

  // ── Close on Escape ─────────────────────────────────────────────────────
  const onKeydown = (e) => {
    if (e.key === 'Escape') {
      _setMenuOpen(false, hamburger, mobileMenu);
    }
  };
  document.addEventListener('keydown', onKeydown);

  // ── Close when viewport grows past mobile breakpoint ────────────────────
  const mq = window.matchMedia('(max-width: 640px)');
  const onMqChange = (ev) => {
    if (!ev.matches) {
      _setMenuOpen(false, hamburger, mobileMenu);
    }
  };
  mq.addEventListener('change', onMqChange);

  // ── Teardown ─────────────────────────────────────────────────────────────
  return {
    destroy() {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('keydown', onKeydown);
      mq.removeEventListener('change', onMqChange);
    },
  };
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Injects the navbar and mobile-menu HTML before the first child of <body>
 * (or before #app if present) so it sits above all page content.
 */
function _injectNavbarHTML() {
  // Avoid double-mounting
  if (document.getElementById('navbar')) { return; }

  const desktopLinks = NAV_ITEMS.map((item) =>
    `<a
       class="navbar__link"
       href="#${item.section}"
       data-section-target="${item.section}"
     >${_escapeHtml(item.label)}</a>`
  ).join('');

  const mobileLinks = NAV_ITEMS.map((item) =>
    `<a
       class="navbar__mobile-link"
       href="#${item.section}"
       data-section-target="${item.section}"
     >${_escapeHtml(item.label)}</a>`
  ).join('');

  const html = `
    <nav
      id="navbar"
      class="navbar"
      role="navigation"
      aria-label="Main navigation"
    >
      <div class="navbar__inner">

        <!-- Logo / brand initials with glitch -->
        <a
          id="navbar-logo"
          class="navbar__logo"
          href="#"
          aria-label="Go to top"
          data-text="${_escapeHtml(LOGO_INITIALS)}"
        >${_escapeHtml(LOGO_INITIALS)}</a>

        <!-- Desktop links -->
        <div class="navbar__nav" role="list">
          ${desktopLinks}
        </div>

        <!-- Hamburger (mobile) -->
        <button
          id="navbar-hamburger"
          class="navbar__hamburger"
          aria-controls="navbar-mobile-menu"
          aria-expanded="false"
          aria-label="Open navigation menu"
          type="button"
        >
          <span class="hamburger__bar" aria-hidden="true"></span>
          <span class="hamburger__bar" aria-hidden="true"></span>
          <span class="hamburger__bar" aria-hidden="true"></span>
        </button>

      </div>
    </nav>

    <!-- Mobile menu panel -->
    <div
      id="navbar-mobile-menu"
      class="navbar__mobile-menu"
      role="dialog"
      aria-modal="false"
      aria-label="Navigation menu"
    >
      ${mobileLinks}
    </div>`;

  // Prepend to <body> so it is rendered before #app
  document.body.insertAdjacentHTML('afterbegin', html);
}

/**
 * Add/remove .navbar--scrolled based on window.scrollY.
 * @param {HTMLElement} navbar
 */
function _updateScrolledState(navbar) {
  const scrolled = window.scrollY > 8;
  navbar.classList.toggle('navbar--scrolled', scrolled);
}

/**
 * Scroll-spy: find which section is closest to the top of the viewport
 * and mark its corresponding nav links as .is-active.
 */
function _updateActiveLinks() {
  const sections = /** @type {NodeListOf<HTMLElement>} */ (
    document.querySelectorAll('[data-section]')
  );

  if (!sections.length) { return; }

  // Determine which section's top edge is nearest to (but still ≤) the
  // center of the viewport upper zone (navbar height + small buffer).
  const threshold = window.innerHeight * 0.35;
  let activeSection = sections[0].dataset.section;

  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= threshold) {
      activeSection = section.dataset.section;
    }
  });

  // Update both desktop and mobile links
  const allLinks = document.querySelectorAll(
    '.navbar__link[data-section-target], .navbar__mobile-link[data-section-target]'
  );

  allLinks.forEach((link) => {
    const target = link.getAttribute('data-section-target');
    link.classList.toggle('is-active', target === activeSection);
  });
}

/**
 * Open or close the mobile menu, updating ARIA attributes and CSS class.
 * @param {boolean} open
 * @param {HTMLElement} hamburger
 * @param {HTMLElement} mobileMenu
 */
function _setMenuOpen(open, hamburger, mobileMenu) {
  hamburger.setAttribute('aria-expanded', String(open));
  hamburger.setAttribute(
    'aria-label',
    open ? 'Close navigation menu' : 'Open navigation menu'
  );
  mobileMenu.classList.toggle('is-open', open);
}

/**
 * Simple leading-edge throttle to avoid layout thrashing on scroll.
 * @param {() => void} fn
 * @param {number} limitMs
 * @returns {() => void}
 */
function _throttle(fn, limitMs) {
  let lastRun = 0;
  let raf = null;
  return function throttled() {
    const now = Date.now();
    if (now - lastRun >= limitMs) {
      lastRun = now;
      if (raf) { cancelAnimationFrame(raf); }
      raf = requestAnimationFrame(fn);
    }
  };
}

/**
 * Minimal HTML escaping for content injected via innerHTML.
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
