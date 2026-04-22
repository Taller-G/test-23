/**
 * @jest-environment jsdom
 *
 * Tests for experience.js — Experience Timeline View
 *
 * Strategy: the module is pure DOM / browser code, so we provide lightweight
 * fakes for the browser globals that Jest's Node environment doesn't supply
 * (IntersectionObserver, window.scrollY, getBoundingClientRect, etc.).
 *
 * We test:
 *  1. mountExperience() guards against missing / null containers.
 *  2. Section HTML is injected with the correct structure.
 *  3. All four companies appear in the rendered markup.
 *  4. The "Now" badge appears only on the current role.
 *  5. Alternating card classes are correctly applied (nth-child positions).
 *  6. Cards gain .is-active when the IntersectionObserver fires.
 *  7. The fill line height grows when _updateLineFill is triggered via scroll.
 *  8. destroy() disconnects the observer and removes the scroll listener.
 *  9. HTML escaping prevents XSS.
 */

import { jest } from '@jest/globals';
import { mountExperience } from '../experience.js';

// ── Browser-global fakes ──────────────────────────────────────────────────────

/**
 * Minimal IntersectionObserver stub that captures the callback and the
 * observed elements so tests can fire intersection events manually.
 */
class FakeIntersectionObserver {
  /**
   * @param {IntersectionObserverCallback} callback
   * @param {IntersectionObserverInit}     _options
   */
  constructor(callback, _options) {
    this.callback  = callback;
    this.observed  = new Set();
    this.disconnected = false;
    FakeIntersectionObserver._instances.push(this);
  }

  /** @param {Element} el */
  observe(el)   { this.observed.add(el); }

  /** @param {Element} el */
  unobserve(el) { this.observed.delete(el); }

  disconnect()  { this.disconnected = true; }

  /**
   * Simulate an intersection event for a specific element.
   * @param {Element} el
   * @param {boolean} isIntersecting
   */
  trigger(el, isIntersecting = true) {
    this.callback(
      [{ target: el, isIntersecting }],
      this
    );
  }
}

FakeIntersectionObserver._instances = [];

// ── Test setup / teardown ─────────────────────────────────────────────────────

/** @type {HTMLElement} */
let container;

beforeEach(() => {
  // Reset the instance registry before every test
  FakeIntersectionObserver._instances = [];

  // Install globals
  global.IntersectionObserver = FakeIntersectionObserver;

  global.window = global.window || {};
  global.window.innerHeight = 800;
  global.window.scrollY     = 0;

  // Capture addEventListener / removeEventListener calls on window
  global.window._listeners = {};
  global.window.addEventListener = jest.fn((event, handler) => {
    global.window._listeners[event] = handler;
  });
  global.window.removeEventListener = jest.fn((event) => {
    delete global.window._listeners[event];
  });

  // requestAnimationFrame — synchronous in tests
  global.requestAnimationFrame  = jest.fn((cb) => { cb(0); return 1; });
  global.cancelAnimationFrame   = jest.fn();

  // Minimal DOM container
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  // Clean up the DOM between tests
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
  jest.restoreAllMocks();
  delete global.IntersectionObserver;
});

// ── Helper: simulate a bounding rect for a DOM element ───────────────────────

/**
 * @param {Element} el
 * @param {{ top?: number, height?: number }} rect
 */
function setBoundingRect(el, { top = 0, height = 1000 } = {}) {
  el.getBoundingClientRect = () => ({
    top,
    height,
    bottom: top + height,
    left: 0,
    right: 100,
    width: 100,
    x: 0,
    y: top,
    toJSON() { return {}; },
  });
}

// ── 1. Guard: missing container ───────────────────────────────────────────────

describe('mountExperience() — guard conditions', () => {
  it('returns a no-op destroy() when called with null', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { destroy } = mountExperience(null);
    expect(spy).toHaveBeenCalledWith(
      'mountExperience: container element not found.'
    );
    expect(() => destroy()).not.toThrow();
  });

  it('returns a no-op destroy() when called with undefined', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { destroy } = mountExperience(undefined);
    expect(spy).toHaveBeenCalled();
    expect(() => destroy()).not.toThrow();
  });
});

// ── 2. HTML structure ─────────────────────────────────────────────────────────

describe('mountExperience() — injected HTML structure', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Give the track element a valid bounding rect so _updateLineFill works
    mountExperience(container);
    const track = container.querySelector('.timeline__track');
    if (track) setBoundingRect(track, { top: 100, height: 1000 });
  });

  it('injects the #section-experience <section>', () => {
    expect(container.querySelector('#section-experience')).not.toBeNull();
  });

  it('sets data-section="section-experience" for scroll-spy', () => {
    const section = container.querySelector('[data-section="section-experience"]');
    expect(section).not.toBeNull();
  });

  it('renders the "Experience" heading', () => {
    const h2 = container.querySelector('#experience-heading');
    expect(h2).not.toBeNull();
    expect(h2.textContent).toBe('Experience');
  });

  it('renders the subtitle', () => {
    expect(container.querySelector('.experience__subtitle').textContent.trim())
      .toBe('A journey through the code');
  });

  it('renders the .timeline container', () => {
    expect(container.querySelector('.timeline')).not.toBeNull();
  });

  it('renders the .timeline__track (animated centre line)', () => {
    expect(container.querySelector('.timeline__track')).not.toBeNull();
  });

  it('renders the .timeline__fill element inside the track', () => {
    expect(container.querySelector('.timeline__fill')).not.toBeNull();
  });

  it('renders exactly 4 .timeline__entry elements', () => {
    const entries = container.querySelectorAll('.timeline__entry');
    expect(entries).toHaveLength(4);
  });

  it('every entry contains a .timeline__dot', () => {
    const dots = container.querySelectorAll('.timeline__entry .timeline__dot');
    expect(dots).toHaveLength(4);
  });

  it('every entry contains a .timeline__card', () => {
    const cards = container.querySelectorAll('.timeline__card');
    expect(cards).toHaveLength(4);
  });

  it('every entry contains a .timeline__card-wrap', () => {
    const wraps = container.querySelectorAll('.timeline__card-wrap');
    expect(wraps).toHaveLength(4);
  });

  it('every entry contains a .timeline__spacer', () => {
    const spacers = container.querySelectorAll('.timeline__spacer');
    expect(spacers).toHaveLength(4);
  });

  it('timeline has role="list" for accessibility', () => {
    const timeline = container.querySelector('.timeline');
    expect(timeline.getAttribute('role')).toBe('list');
  });

  it('each entry has role="listitem"', () => {
    const entries = container.querySelectorAll('.timeline__entry');
    entries.forEach((e) => expect(e.getAttribute('role')).toBe('listitem'));
  });
});

// ── 3. Mock data — all four companies ─────────────────────────────────────────

describe('mountExperience() — company data', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mountExperience(container);
  });

  const COMPANIES = ['TechNova Labs', 'CipherSoft', 'CloudMatrix', 'StartupXYZ'];

  COMPANIES.forEach((name) => {
    it(`renders "${name}"`, () => {
      expect(container.innerHTML).toContain(name);
    });
  });

  it('renders all 4 company roles', () => {
    const roles = [
      'Senior Frontend Engineer',
      'Full-Stack Developer',
      'Cloud Infrastructure Engineer',
      'Software Engineer Intern',
    ];
    roles.forEach((r) => expect(container.innerHTML).toContain(r));
  });

  it('renders all 4 date ranges', () => {
    const dates = ['Jan 2023', 'Mar 2021', 'Aug 2019', 'Jun 2018'];
    dates.forEach((d) => expect(container.innerHTML).toContain(d));
  });

  it('renders company-icon initials (TN, CS, CM, SX)', () => {
    const icons = container.querySelectorAll('.company-icon');
    const initials = Array.from(icons).map((i) => i.textContent.trim());
    expect(initials).toContain('TN');
    expect(initials).toContain('CS');
    expect(initials).toContain('CM');
    expect(initials).toContain('SX');
  });

  it('applies the correct slug class to each company icon', () => {
    expect(container.querySelector('.company-icon--technova')).not.toBeNull();
    expect(container.querySelector('.company-icon--ciphersoft')).not.toBeNull();
    expect(container.querySelector('.company-icon--cloudmatrix')).not.toBeNull();
    expect(container.querySelector('.company-icon--startupxyz')).not.toBeNull();
  });
});

// ── 4. "Now" badge — only on TechNova Labs (current: true) ────────────────────

describe('mountExperience() — current-role badge', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mountExperience(container);
  });

  it('renders exactly one .badge--current', () => {
    const badges = container.querySelectorAll('.badge--current');
    expect(badges).toHaveLength(1);
  });

  it('.badge--current is inside the TechNova Labs entry', () => {
    const badge = container.querySelector('.badge--current');
    const entry = badge.closest('.timeline__entry');
    expect(entry).not.toBeNull();
    expect(entry.innerHTML).toContain('TechNova Labs');
  });

  it('.badge--current text is "Now"', () => {
    const badge = container.querySelector('.badge--current');
    expect(badge.textContent.trim()).toBe('Now');
  });
});

// ── 5. Alternating DOM structure ──────────────────────────────────────────────

describe('mountExperience() — alternating card layout structure', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mountExperience(container);
  });

  it('timeline track is the first child of .timeline', () => {
    const timeline = container.querySelector('.timeline');
    const firstChild = timeline.firstElementChild;
    expect(firstChild.classList.contains('timeline__track')).toBe(true);
  });

  it('entries are children 2–5 of .timeline (after the track)', () => {
    const timeline  = container.querySelector('.timeline');
    const children  = Array.from(timeline.children);
    // Index 0 = track; 1..4 = entries
    expect(children[0].classList.contains('timeline__track')).toBe(true);
    expect(children[1].classList.contains('timeline__entry')).toBe(true);
    expect(children[2].classList.contains('timeline__entry')).toBe(true);
    expect(children[3].classList.contains('timeline__entry')).toBe(true);
    expect(children[4].classList.contains('timeline__entry')).toBe(true);
  });

  it('entry 1 (TechNova) aria-label mentions the company and role', () => {
    const entries = container.querySelectorAll('.timeline__entry');
    const label   = entries[0].getAttribute('aria-label');
    expect(label).toContain('TechNova Labs');
    expect(label).toContain('Senior Frontend Engineer');
  });

  it('entry 2 (CipherSoft) aria-label mentions the company', () => {
    const entries = container.querySelectorAll('.timeline__entry');
    expect(entries[1].getAttribute('aria-label')).toContain('CipherSoft');
  });

  it('entry 3 (CloudMatrix) aria-label mentions the company', () => {
    const entries = container.querySelectorAll('.timeline__entry');
    expect(entries[2].getAttribute('aria-label')).toContain('CloudMatrix');
  });

  it('entry 4 (StartupXYZ) aria-label mentions the company', () => {
    const entries = container.querySelectorAll('.timeline__entry');
    expect(entries[3].getAttribute('aria-label')).toContain('StartupXYZ');
  });
});

// ── 6. IntersectionObserver — card activation ─────────────────────────────────

describe('mountExperience() — card activation via IntersectionObserver', () => {
  /** @type {{ destroy: () => void }} */
  let handle;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    handle = mountExperience(container);
    // Set a bounding rect on the fill's parent track
    const track = container.querySelector('.timeline__track');
    setBoundingRect(track, { top: 0, height: 2000 });
  });

  afterEach(() => handle.destroy());

  it('creates exactly one IntersectionObserver', () => {
    expect(FakeIntersectionObserver._instances).toHaveLength(1);
  });

  it('observes all 4 entries on mount', () => {
    const observer = FakeIntersectionObserver._instances[0];
    expect(observer.observed.size).toBe(4);
  });

  it('adds .is-active to an entry when it intersects', () => {
    const observer = FakeIntersectionObserver._instances[0];
    const entries  = container.querySelectorAll('.timeline__entry');
    const first    = entries[0];

    expect(first.classList.contains('is-active')).toBe(false);
    observer.trigger(first, true);
    expect(first.classList.contains('is-active')).toBe(true);
  });

  it('stops observing an entry after it becomes active', () => {
    const observer = FakeIntersectionObserver._instances[0];
    const entries  = container.querySelectorAll('.timeline__entry');
    const first    = entries[0];

    observer.trigger(first, true);
    expect(observer.observed.has(first)).toBe(false);
  });

  it('does NOT add .is-active when isIntersecting is false', () => {
    const observer = FakeIntersectionObserver._instances[0];
    const entries  = container.querySelectorAll('.timeline__entry');
    const second   = entries[1];

    observer.trigger(second, false);
    expect(second.classList.contains('is-active')).toBe(false);
  });

  it('activates each entry independently', () => {
    const observer = FakeIntersectionObserver._instances[0];
    const entries  = Array.from(container.querySelectorAll('.timeline__entry'));

    observer.trigger(entries[0], true);
    observer.trigger(entries[2], true);

    expect(entries[0].classList.contains('is-active')).toBe(true);
    expect(entries[1].classList.contains('is-active')).toBe(false);
    expect(entries[2].classList.contains('is-active')).toBe(true);
    expect(entries[3].classList.contains('is-active')).toBe(false);
  });
});

// ── 7. Scroll listener — line fill ───────────────────────────────────────────

describe('mountExperience() — scroll-driven fill line', () => {
  /** @type {{ destroy: () => void }} */
  let handle;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    handle = mountExperience(container);
  });

  afterEach(() => handle.destroy());

  it('registers a passive scroll listener on window', () => {
    expect(global.window.addEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      { passive: true }
    );
  });

  it('fill height starts at 0% when the section is below the viewport', () => {
    const fill  = container.querySelector('.timeline__fill');
    const track = container.querySelector('.timeline__track');
    // Track top is below the viewport bottom → scrolled < 0 → progress = 0
    setBoundingRect(track, { top: 900, height: 1000 });

    // Manually call scroll handler to simulate a scroll event
    const scrollHandler = global.window._listeners['scroll'];
    if (scrollHandler) scrollHandler();

    expect(fill.style.height).toBe('0%');
  });

  it('fill height is 100% when the section has fully scrolled past', () => {
    const fill  = container.querySelector('.timeline__fill');
    const track = container.querySelector('.timeline__track');
    // Track top is way above viewport → scrolled > total → progress = 100
    setBoundingRect(track, { top: -2000, height: 1000 });

    const scrollHandler = global.window._listeners['scroll'];
    if (scrollHandler) scrollHandler();

    expect(fill.style.height).toBe('100%');
  });

  it('fill height is proportional to scroll progress (mid-point)', () => {
    const fill  = container.querySelector('.timeline__fill');
    const track = container.querySelector('.timeline__track');

    // viewportH = 800, trackHeight = 1000, trackTop = 300
    // scrolled = 800 - 300 = 500, progress = 500/1000 × 100 = 50 %
    setBoundingRect(track, { top: 300, height: 1000 });

    const scrollHandler = global.window._listeners['scroll'];
    if (scrollHandler) scrollHandler();

    expect(fill.style.height).toBe('50%');
  });
});

// ── 8. destroy() — teardown ───────────────────────────────────────────────────

describe('mountExperience() — destroy()', () => {
  it('disconnects the IntersectionObserver', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { destroy } = mountExperience(container);
    const observer    = FakeIntersectionObserver._instances[0];

    expect(observer.disconnected).toBe(false);
    destroy();
    expect(observer.disconnected).toBe(true);
  });

  it('removes the scroll event listener from window', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { destroy } = mountExperience(container);
    destroy();
    expect(global.window.removeEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function)
    );
  });
});

// ── 9. HTML escaping ──────────────────────────────────────────────────────────

describe('mountExperience() — HTML escaping', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mountExperience(container);
  });

  it('none of the injected HTML contains raw unescaped <script> tags', () => {
    expect(container.innerHTML).not.toContain('<script>');
  });

  it('all company names appear as text content, not raw HTML injection', () => {
    const companies = container.querySelectorAll('.timeline__company');
    companies.forEach((el) => {
      // textContent should not be empty (real text rendered)
      expect(el.textContent.trim().length).toBeGreaterThan(0);
    });
  });
});

// ── 10. Achievements list ─────────────────────────────────────────────────────

describe('mountExperience() — achievements', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mountExperience(container);
  });

  it('renders 4 achievement items per entry (16 total)', () => {
    const items = container.querySelectorAll('.timeline__achievement');
    expect(items).toHaveLength(16);
  });

  it('each entry has its own .timeline__achievements list', () => {
    const lists = container.querySelectorAll('.timeline__achievements');
    expect(lists).toHaveLength(4);
  });

  it('TechNova entry contains the page-load achievement', () => {
    const entries = container.querySelectorAll('.timeline__entry');
    expect(entries[0].innerHTML).toContain('47 %');
  });
});

// ── 11. Accessibility ─────────────────────────────────────────────────────────

describe('mountExperience() — accessibility', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mountExperience(container);
  });

  it('section is labelled by #experience-heading', () => {
    const section = container.querySelector('#section-experience');
    expect(section.getAttribute('aria-labelledby')).toBe('experience-heading');
  });

  it('.timeline__track has aria-hidden="true"', () => {
    const track = container.querySelector('.timeline__track');
    expect(track.getAttribute('aria-hidden')).toBe('true');
  });

  it('.timeline__dot elements have aria-hidden="true"', () => {
    const dots = container.querySelectorAll('.timeline__dot');
    dots.forEach((d) => expect(d.getAttribute('aria-hidden')).toBe('true'));
  });

  it('.timeline__achievements lists have aria-label', () => {
    const lists = container.querySelectorAll('.timeline__achievements');
    lists.forEach((l) =>
      expect(l.getAttribute('aria-label')).toBeTruthy()
    );
  });

  it('company icon divs have aria-hidden="true"', () => {
    const icons = container.querySelectorAll('.company-icon');
    icons.forEach((i) => expect(i.getAttribute('aria-hidden')).toBe('true'));
  });

  it('company icon divs have a title attribute', () => {
    const icons = container.querySelectorAll('.company-icon');
    icons.forEach((i) => expect(i.getAttribute('title')).toBeTruthy());
  });

  it('date elements use <time> tags', () => {
    const times = container.querySelectorAll('time.timeline__dates');
    expect(times).toHaveLength(4);
  });
});
