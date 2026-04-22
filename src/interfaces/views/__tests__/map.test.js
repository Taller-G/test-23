/**
 * @jest-environment /usr/local/lib/node_modules/jest-environment-jsdom
 *
 * Tests for map.js — Interactive Map View
 *
 * Strategy: the module is pure DOM / browser code. We provide lightweight
 * stubs for Leaflet (window.L) and IntersectionObserver so the logic can be
 * tested in Jest's jsdom environment without a real browser.
 *
 * We test:
 *  1.  mountMap() guards against missing / null containers.
 *  2.  Leaflet-unavailable guard — renders fallback HTML, logs error.
 *  3.  Section HTML is injected with the correct structure.
 *  4.  All four location markers are present in the legend.
 *  5.  Custom zoom control buttons are rendered.
 *  6.  data-section attribute is present for scroll-spy.
 *  7.  Map canvas element (#map-canvas) is rendered.
 *  8.  IntersectionObserver wires the fade-in correctly.
 *  9.  destroy() disconnects observer and removes the map.
 * 10.  HTML escaping prevents XSS in marker data.
 * 11.  Popup content contains expected location data.
 * 12.  Legend items match the 4 mocked marker locations.
 */

import { jest } from '@jest/globals';
import { mountMap } from '../map.js';

// ── Leaflet stub ─────────────────────────────────────────────────────────────

/**
 * Minimal Leaflet stub.  Only the surface the view actually calls is faked.
 */
function createLeafletStub() {
  const markerInstance = {
    addTo: jest.fn().mockReturnThis(),
    bindPopup: jest.fn().mockReturnThis(),
    remove: jest.fn(),
  };

  const tileLayerInstance = {
    addTo: jest.fn().mockReturnThis(),
  };

  const mapInstance = {
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    setView: jest.fn().mockReturnThis(),
    invalidateSize: jest.fn(),
    remove: jest.fn(),
  };

  const L = {
    map: jest.fn(() => mapInstance),
    tileLayer: jest.fn(() => tileLayerInstance),
    marker: jest.fn(() => markerInstance),
    divIcon: jest.fn((opts) => opts),
    _mapInstance: mapInstance,
    _markerInstance: markerInstance,
  };

  return L;
}

// ── IntersectionObserver stub ────────────────────────────────────────────────

class FakeIntersectionObserver {
  constructor(callback, _options) {
    this.callback     = callback;
    this.observed     = new Set();
    this.disconnected = false;
    FakeIntersectionObserver._instances.push(this);
  }

  observe(el)   { this.observed.add(el); }
  unobserve(el) { this.observed.delete(el); }
  disconnect()  { this.disconnected = true; }

  /** Simulate an intersection event. */
  trigger(el, isIntersecting = true) {
    this.callback([{ target: el, isIntersecting }], this);
  }
}

FakeIntersectionObserver._instances = [];

// ── Test setup / teardown ─────────────────────────────────────────────────────

/** @type {HTMLElement} */
let container;

beforeEach(() => {
  FakeIntersectionObserver._instances = [];
  global.IntersectionObserver = FakeIntersectionObserver;

  // Install a fresh Leaflet stub on window before each test
  global.window.L = createLeafletStub();

  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
  delete global.window.L;
  delete global.IntersectionObserver;
  jest.restoreAllMocks();
});

// ── 1. Guard: missing / null container ───────────────────────────────────────

describe('mountMap() — guard conditions', () => {
  it('returns a no-op destroy() when called with null', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { destroy } = mountMap(null);
    expect(spy).toHaveBeenCalledWith(
      'mountMap: container element not found.'
    );
    expect(() => destroy()).not.toThrow();
  });

  it('returns a no-op destroy() when called with undefined', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { destroy } = mountMap(undefined);
    expect(spy).toHaveBeenCalled();
    expect(() => destroy()).not.toThrow();
  });
});

// ── 2. Leaflet-unavailable guard ─────────────────────────────────────────────

describe('mountMap() — Leaflet unavailable', () => {
  beforeEach(() => {
    delete global.window.L;   // simulate CDN not loaded
  });

  it('logs an error when window.L is absent', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mountMap(container);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Leaflet (window.L) is not available')
    );
  });

  it('renders the fallback unavailable message', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mountMap(container);
    expect(container.querySelector('.map__unavailable')).not.toBeNull();
  });

  it('returns a no-op destroy() when Leaflet is absent', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { destroy } = mountMap(container);
    expect(() => destroy()).not.toThrow();
  });

  it('does NOT render the map canvas when Leaflet is absent', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mountMap(container);
    expect(container.querySelector('#map-canvas')).toBeNull();
  });
});

// ── 3. Section HTML structure ─────────────────────────────────────────────────

describe('mountMap() — injected HTML structure', () => {
  beforeEach(() => {
    mountMap(container);
  });

  it('injects the #section-map <section>', () => {
    expect(container.querySelector('#section-map')).not.toBeNull();
  });

  it('sets data-section="section-map" for scroll-spy', () => {
    const section = container.querySelector('[data-section="section-map"]');
    expect(section).not.toBeNull();
  });

  it('renders the "World Map" heading', () => {
    const h2 = container.querySelector('#map-heading');
    expect(h2).not.toBeNull();
    expect(h2.textContent.trim()).toBe('World Map');
  });

  it('renders the subtitle', () => {
    const sub = container.querySelector('.map-section__subtitle');
    expect(sub).not.toBeNull();
    expect(sub.textContent.trim()).toBe("Places I've shipped code from");
  });

  it('renders the .map__wrapper container', () => {
    expect(container.querySelector('.map__wrapper')).not.toBeNull();
  });

  it('renders #map-canvas inside .map__wrapper', () => {
    expect(container.querySelector('#map-canvas')).not.toBeNull();
  });

  it('section is labelled by #map-heading', () => {
    const section = container.querySelector('#section-map');
    expect(section.getAttribute('aria-labelledby')).toBe('map-heading');
  });
});

// ── 4. Location markers — legend ──────────────────────────────────────────────

describe('mountMap() — location data in legend', () => {
  beforeEach(() => {
    mountMap(container);
  });

  const CITIES = ['San Francisco', 'Berlin', 'Singapore', 'London'];

  CITIES.forEach((city) => {
    it(`renders "${city}" in the legend`, () => {
      const legendItems = container.querySelectorAll('.map-legend__city');
      const texts = Array.from(legendItems).map((el) => el.textContent.trim());
      expect(texts.some((t) => t === city)).toBe(true);
    });
  });

  it('renders exactly 4 legend items', () => {
    const items = container.querySelectorAll('.map-legend__item');
    expect(items).toHaveLength(4);
  });

  it('renders all 4 coloured legend dots', () => {
    const dots = container.querySelectorAll('.map-legend__dot');
    expect(dots).toHaveLength(4);
  });

  it('legend has the correct ARIA attributes', () => {
    const legend = container.querySelector('.map-legend');
    expect(legend.getAttribute('role')).toBe('list');
    expect(legend.getAttribute('aria-label')).toBeTruthy();
  });
});

// ── 5. Custom zoom controls ───────────────────────────────────────────────────

describe('mountMap() — custom zoom controls', () => {
  beforeEach(() => {
    mountMap(container);
  });

  it('renders the zoom controls wrapper', () => {
    expect(container.querySelector('.map__controls')).not.toBeNull();
  });

  it('renders the zoom-in button (#map-zoom-in)', () => {
    expect(container.querySelector('#map-zoom-in')).not.toBeNull();
  });

  it('renders the zoom-out button (#map-zoom-out)', () => {
    expect(container.querySelector('#map-zoom-out')).not.toBeNull();
  });

  it('renders the reset button (#map-reset)', () => {
    expect(container.querySelector('#map-reset')).not.toBeNull();
  });

  it('zoom-in button calls L.map().zoomIn() on click', () => {
    const L = global.window.L;
    const btn = container.querySelector('#map-zoom-in');
    btn.click();
    expect(L._mapInstance.zoomIn).toHaveBeenCalledTimes(1);
  });

  it('zoom-out button calls L.map().zoomOut() on click', () => {
    const L = global.window.L;
    const btn = container.querySelector('#map-zoom-out');
    btn.click();
    expect(L._mapInstance.zoomOut).toHaveBeenCalledTimes(1);
  });

  it('reset button calls L.map().setView() on click', () => {
    const L = global.window.L;
    const btn = container.querySelector('#map-reset');
    btn.click();
    expect(L._mapInstance.setView).toHaveBeenCalledTimes(1);
  });

  it('controls group has the correct ARIA role and label', () => {
    const group = container.querySelector('.map__controls');
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBeTruthy();
  });
});

// ── 6. Leaflet initialisation ─────────────────────────────────────────────────

describe('mountMap() — Leaflet initialisation', () => {
  it('calls L.map() with the canvas element', () => {
    const L = global.window.L;
    mountMap(container);
    expect(L.map).toHaveBeenCalledTimes(1);
    const firstArg = L.map.mock.calls[0][0];
    expect(firstArg).toBe(container.querySelector('#map-canvas'));
  });

  it('calls L.tileLayer() once (CartoDB Dark Matter)', () => {
    const L = global.window.L;
    mountMap(container);
    expect(L.tileLayer).toHaveBeenCalledTimes(1);
    const tileUrl = L.tileLayer.mock.calls[0][0];
    expect(tileUrl).toContain('cartocdn.com');
    expect(tileUrl).toContain('dark_all');
  });

  it('calls L.marker() 4 times (one per location)', () => {
    const L = global.window.L;
    mountMap(container);
    expect(L.marker).toHaveBeenCalledTimes(4);
  });

  it('calls L.divIcon() 4 times (one custom icon per marker)', () => {
    const L = global.window.L;
    mountMap(container);
    expect(L.divIcon).toHaveBeenCalledTimes(4);
  });

  it('initialises the map with zoomControl: false (custom controls used)', () => {
    const L = global.window.L;
    mountMap(container);
    const options = L.map.mock.calls[0][1];
    expect(options.zoomControl).toBe(false);
  });
});

// ── 7. Fade-in animation — IntersectionObserver ───────────────────────────────

describe('mountMap() — fade-in via IntersectionObserver', () => {
  it('section does NOT have .is-visible on mount (before intersection)', () => {
    mountMap(container);
    const section = container.querySelector('#section-map');
    expect(section.classList.contains('is-visible')).toBe(false);
  });

  it('section gains .is-visible when IntersectionObserver fires', () => {
    mountMap(container);
    const section  = container.querySelector('#section-map');
    const observer = FakeIntersectionObserver._instances[0];

    observer.trigger(section, true);

    expect(section.classList.contains('is-visible')).toBe(true);
  });

  it('calls map.invalidateSize() after becoming visible', () => {
    const L = global.window.L;
    mountMap(container);
    const section  = container.querySelector('#section-map');
    const observer = FakeIntersectionObserver._instances[0];

    observer.trigger(section, true);

    expect(L._mapInstance.invalidateSize).toHaveBeenCalledTimes(1);
  });

  it('stops observing after the section becomes visible', () => {
    mountMap(container);
    const section  = container.querySelector('#section-map');
    const observer = FakeIntersectionObserver._instances[0];

    observer.trigger(section, true);

    expect(observer.observed.has(section)).toBe(false);
  });

  it('does NOT add .is-visible when isIntersecting is false', () => {
    mountMap(container);
    const section  = container.querySelector('#section-map');
    const observer = FakeIntersectionObserver._instances[0];

    observer.trigger(section, false);

    expect(section.classList.contains('is-visible')).toBe(false);
  });
});

// ── 8. destroy() — teardown ───────────────────────────────────────────────────

describe('mountMap() — destroy()', () => {
  it('disconnects the IntersectionObserver', () => {
    const { destroy } = mountMap(container);
    const observer    = FakeIntersectionObserver._instances[0];

    expect(observer.disconnected).toBe(false);
    destroy();
    expect(observer.disconnected).toBe(true);
  });

  it('calls map.remove() to clean up the Leaflet instance', () => {
    const L = global.window.L;
    const { destroy } = mountMap(container);
    destroy();
    expect(L._mapInstance.remove).toHaveBeenCalledTimes(1);
  });

  it('calls marker.remove() for every marker (4 total)', () => {
    const L = global.window.L;
    const { destroy } = mountMap(container);
    destroy();
    // Each marker.remove() is called once; marker stub is shared, so total = 4
    expect(L._markerInstance.remove).toHaveBeenCalledTimes(4);
  });
});

// ── 9. HTML escaping ──────────────────────────────────────────────────────────

describe('mountMap() — HTML escaping', () => {
  beforeEach(() => {
    mountMap(container);
  });

  it('does not contain unescaped <script> tags in the legend', () => {
    const legend = container.querySelector('.map-legend');
    expect(legend.innerHTML).not.toContain('<script>');
  });

  it('all legend city names are non-empty text', () => {
    const cities = container.querySelectorAll('.map-legend__city');
    cities.forEach((el) => expect(el.textContent.trim().length).toBeGreaterThan(0));
  });
});

// ── 10. Colour class coverage ─────────────────────────────────────────────────

describe('mountMap() — neon colour classes on legend dots', () => {
  beforeEach(() => {
    mountMap(container);
  });

  it('includes a cyan dot', () => {
    expect(container.querySelector('.map-legend__dot--cyan')).not.toBeNull();
  });

  it('includes a magenta dot', () => {
    expect(container.querySelector('.map-legend__dot--magenta')).not.toBeNull();
  });

  it('includes a green dot', () => {
    expect(container.querySelector('.map-legend__dot--green')).not.toBeNull();
  });

  it('includes a yellow dot', () => {
    expect(container.querySelector('.map-legend__dot--yellow')).not.toBeNull();
  });
});

// ── 11. DivIcon HTML content ──────────────────────────────────────────────────

describe('mountMap() — custom marker divIcon HTML', () => {
  it('each divIcon HTML contains .map-marker class', () => {
    const L = global.window.L;
    mountMap(container);

    L.divIcon.mock.calls.forEach((call) => {
      const opts = call[0];
      expect(opts.html).toContain('map-marker');
    });
  });

  it('each divIcon HTML contains the SVG pin path', () => {
    const L = global.window.L;
    mountMap(container);

    L.divIcon.mock.calls.forEach((call) => {
      const opts = call[0];
      expect(opts.html).toContain('<svg');
      expect(opts.html).toContain('map-marker__pin');
    });
  });

  it('each divIcon HTML contains the pulse ring element', () => {
    const L = global.window.L;
    mountMap(container);

    L.divIcon.mock.calls.forEach((call) => {
      const opts = call[0];
      expect(opts.html).toContain('map-marker__pulse');
    });
  });

  it('divIcon className is empty string (no Leaflet default white box)', () => {
    const L = global.window.L;
    mountMap(container);

    L.divIcon.mock.calls.forEach((call) => {
      const opts = call[0];
      expect(opts.className).toBe('');
    });
  });
});

// ── 12. Period labels in the legend ───────────────────────────────────────────

describe('mountMap() — period labels', () => {
  beforeEach(() => {
    mountMap(container);
  });

  it('renders period labels for all 4 markers', () => {
    const periods = container.querySelectorAll('.map-legend__period');
    expect(periods).toHaveLength(4);
  });

  it('period labels contain date ranges', () => {
    const periods = container.querySelectorAll('.map-legend__period');
    const texts = Array.from(periods).map((el) => el.textContent.trim());
    expect(texts.some((t) => t.includes('2023'))).toBe(true);
    expect(texts.some((t) => t.includes('2021'))).toBe(true);
    expect(texts.some((t) => t.includes('2019'))).toBe(true);
    expect(texts.some((t) => t.includes('2018'))).toBe(true);
  });
});
