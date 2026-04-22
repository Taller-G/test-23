/**
 * map.js — Interactive Map View (Leaflet.js)
 *
 * Renders a dark-themed interactive map using Leaflet.js (via CDN) with:
 *  • CartoDB Dark Matter tiles for visual coherence with the neon portfolio theme.
 *  • At least 4 custom neon markers (CSS-styled) at mocked developer locations.
 *  • Popups on each marker with contextual info.
 *  • Custom zoom controls (Leaflet default controls disabled).
 *  • Fade-in entrance animation when the section enters the viewport.
 *  • Responsive layout that adapts to the container width.
 *
 * Leaflet is expected to be loaded globally via CDN before this module runs.
 * The module guards against its absence and logs a clear error.
 *
 * Layer : Interfaces → Views
 * Imports: nothing from application or domain — pure presentation.
 */

// ── Mock data — developer locations ──────────────────────────────────────────

/**
 * @typedef {{ id: string, lat: number, lng: number, city: string, country: string,
 *             period: string, role: string, description: string,
 *             color: 'cyan' | 'magenta' | 'green' | 'yellow' }} MapMarker
 */

/** @type {MapMarker[]} */
const MAP_MARKERS = [
  {
    id: 'san-francisco',
    lat: 37.7749,
    lng: -122.4194,
    city: 'San Francisco',
    country: 'USA',
    period: 'Jan 2023 — Present',
    role: 'Senior Frontend Engineer @ TechNova Labs',
    description:
      'Current base. Leading the redesign of the core SaaS dashboard ' +
      'and defining the component architecture for 40 000+ monthly users.',
    color: 'cyan',
  },
  {
    id: 'berlin',
    lat: 52.52,
    lng: 13.405,
    city: 'Berlin',
    country: 'Germany',
    period: 'Mar 2021 — Dec 2022',
    role: 'Full-Stack Developer @ CipherSoft',
    description:
      'Built an end-to-end encrypted file-sharing platform on Node.js and React. ' +
      'Owned the cryptographic pipeline and the browser extension.',
    color: 'magenta',
  },
  {
    id: 'singapore',
    lat: 1.3521,
    lng: 103.8198,
    city: 'Singapore',
    country: 'Singapore',
    period: 'Aug 2019 — Feb 2021',
    role: 'Cloud Infrastructure Engineer @ CloudMatrix',
    description:
      'Managed a Kubernetes cluster fleet for a B2B analytics SaaS. ' +
      'Championed GitOps and migrated infrastructure from bare-metal to GKE.',
    color: 'green',
  },
  {
    id: 'london',
    lat: 51.5074,
    lng: -0.1278,
    city: 'London',
    country: 'UK',
    period: 'Jun 2018 — Jul 2019',
    role: 'Software Engineer @ StartupXYZ',
    description:
      'First engineering role at a pre-Series A fintech startup. ' +
      'Built the onboarding funnel and integrated Plaid & Stripe APIs.',
    color: 'yellow',
  },
];

// Map initial view — centred on Europe/Atlantic to keep all markers visible
const MAP_CENTER = [30, -10];
const MAP_ZOOM   = 2;

// CartoDB Dark Matter tile layer (free, no API key required)
const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
  '&copy; <a href="https://carto.com/attributions">CARTO</a>';

// ── Neon colour map ───────────────────────────────────────────────────────────

/** @type {Record<string, { hex: string, glow: string }>} */
const NEON_COLORS = {
  cyan:    { hex: '#00f5ff', glow: 'rgba(0,245,255,0.6)' },
  magenta: { hex: '#ff00e5', glow: 'rgba(255,0,229,0.6)' },
  green:   { hex: '#39ff14', glow: 'rgba(57,255,20,0.6)' },
  yellow:  { hex: '#ffb800', glow: 'rgba(255,184,0,0.6)' },
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Mounts the Map section into the given container element.
 * Wires a Leaflet map with custom neon markers, popups, zoom controls,
 * and an IntersectionObserver-driven fade-in animation.
 *
 * Requires Leaflet to be available as `window.L` (loaded via CDN).
 *
 * @param {HTMLElement} container  DOM node to inject the section into.
 * @returns {{ destroy: () => void }} Teardown function.
 */
export function mountMap(container) {
  if (!container) {
    console.error('mountMap: container element not found.');
    return { destroy: () => {} };
  }

  // Guard: Leaflet must be loaded via CDN before this module runs
  if (typeof window === 'undefined' || !window.L) {
    console.error(
      'mountMap: Leaflet (window.L) is not available. ' +
        'Ensure the Leaflet CDN <script> is included before app.js.'
    );
    container.innerHTML = _buildSection(/* mapReady */ false);
    return { destroy: () => {} };
  }

  container.innerHTML = _buildSection(/* mapReady */ true);

  const section  = container.querySelector('#section-map');
  const mapEl    = container.querySelector('#map-canvas');
  const zoomInBtn  = container.querySelector('#map-zoom-in');
  const zoomOutBtn = container.querySelector('#map-zoom-out');
  const resetBtn   = container.querySelector('#map-reset');

  if (!section || !mapEl) {
    console.error('mountMap: required DOM elements missing after mount.');
    return { destroy: () => {} };
  }

  // ── Initialise Leaflet map ──────────────────────────────────────────────────
  const L = window.L;

  const map = L.map(mapEl, {
    center: MAP_CENTER,
    zoom: MAP_ZOOM,
    zoomControl: false,        // disable default Leaflet zoom widget
    attributionControl: true,
    scrollWheelZoom: true,
  });

  // CartoDB Dark Matter tile layer
  L.tileLayer(TILE_URL, {
    attribution: TILE_ATTRIBUTION,
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  // ── Custom neon markers & popups ────────────────────────────────────────────
  const leafletMarkers = MAP_MARKERS.map((data) => {
    const icon = _buildMarkerIcon(data.color);
    const marker = L.marker([data.lat, data.lng], { icon }).addTo(map);
    marker.bindPopup(_buildPopupContent(data), {
      maxWidth: 260,
      minWidth: 220,
      className: 'map-popup',
    });
    return marker;
  });

  // ── Custom zoom controls ────────────────────────────────────────────────────
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => map.zoomIn());
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => map.zoomOut());
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => map.setView(MAP_CENTER, MAP_ZOOM));
  }

  // ── Fade-in on viewport entry (IntersectionObserver) ───────────────────────
  let observer = null;

  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            section.classList.add('is-visible');
            // Invalidate the map size once the section is visible so tiles load
            // correctly (Leaflet can't compute dimensions while hidden).
            map.invalidateSize();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(section);
  } else {
    // Fallback for environments without IntersectionObserver (SSR tests)
    section.classList.add('is-visible');
  }

  // ── Teardown ──────────────────────────────────────────────────────────────
  return {
    destroy() {
      if (observer) observer.disconnect();
      leafletMarkers.forEach((m) => m.remove());
      map.remove();
    },
  };
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Creates a Leaflet DivIcon with a neon CSS marker pin shape.
 * Uses inline SVG so no external image files are needed.
 *
 * @param {'cyan'|'magenta'|'green'|'yellow'} color
 * @returns {L.DivIcon}
 */
function _buildMarkerIcon(color) {
  const { hex, glow } = NEON_COLORS[color] ?? NEON_COLORS.cyan;

  // Outer element must have class "map-marker" for CSS transitions.
  // The SVG pin shape is drawn inline so it scales cleanly at any DPR.
  const html = `
    <div class="map-marker map-marker--${_escapeHtml(color)}" aria-hidden="true">
      <svg
        class="map-marker__pin"
        viewBox="0 0 24 34"
        width="28"
        height="40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Pin body -->
        <path
          d="M12 0C5.373 0 0 5.373 0 12c0 8.837 10.5 22 12 22S24 20.837 24 12C24 5.373 18.627 0 12 0z"
          fill="${hex}"
          fill-opacity="0.15"
          stroke="${hex}"
          stroke-width="1.5"
        />
        <!-- Inner dot -->
        <circle cx="12" cy="12" r="4" fill="${hex}" />
      </svg>
      <div class="map-marker__pulse" style="--marker-color:${hex};--marker-glow:${glow};"></div>
    </div>`;

  return window.L.divIcon({
    html,
    className: '',             // prevent Leaflet's default white box
    iconSize: [28, 40],
    iconAnchor: [14, 40],      // bottom-center of the pin
    popupAnchor: [0, -42],
  });
}

/**
 * Builds the popup HTML string for a given marker's data.
 *
 * @param {MapMarker} data
 * @returns {string}
 */
function _buildPopupContent(data) {
  const { hex } = NEON_COLORS[data.color] ?? NEON_COLORS.cyan;
  return `
    <div class="map-popup__inner">
      <div class="map-popup__header" style="--popup-accent:${hex};">
        <span class="map-popup__city">${_escapeHtml(data.city)}</span>
        <span class="map-popup__country">${_escapeHtml(data.country)}</span>
      </div>
      <p class="map-popup__role">${_escapeHtml(data.role)}</p>
      <time class="map-popup__period">${_escapeHtml(data.period)}</time>
      <p class="map-popup__desc">${_escapeHtml(data.description)}</p>
    </div>`;
}

/**
 * Builds the full Map section HTML string.
 *
 * @param {boolean} mapReady  — false when Leaflet is unavailable (shows fallback)
 * @returns {string}
 */
function _buildSection(mapReady = true) {
  const mapBody = mapReady
    ? `<div id="map-canvas" class="map__canvas" aria-label="Interactive location map" role="application"></div>`
    : `<div class="map__unavailable" role="alert">
         <p>Interactive map unavailable — Leaflet could not be loaded.</p>
       </div>`;

  return `
    <section
      class="map-section"
      id="section-map"
      data-section="section-map"
      aria-labelledby="map-heading"
    >
      <header class="map-section__header">
        <h2 id="map-heading" class="map-section__title">World Map</h2>
        <p class="map-section__subtitle">Places I've shipped code from</p>
      </header>

      <div class="map__wrapper">

        ${mapBody}

        ${
          mapReady
            ? `<!-- Custom zoom controls (Leaflet's default disabled) -->
               <div class="map__controls" role="group" aria-label="Map zoom controls">
                 <button
                   id="map-zoom-in"
                   class="map__ctrl-btn"
                   type="button"
                   aria-label="Zoom in"
                   title="Zoom in"
                 >+</button>
                 <button
                   id="map-zoom-out"
                   class="map__ctrl-btn"
                   type="button"
                   aria-label="Zoom out"
                   title="Zoom out"
                 >−</button>
                 <button
                   id="map-reset"
                   class="map__ctrl-btn map__ctrl-btn--reset"
                   type="button"
                   aria-label="Reset map view"
                   title="Reset view"
                 >⊙</button>
               </div>`
            : ''
        }

      </div>

      <!-- Legend -->
      ${mapReady ? _buildLegend() : ''}

    </section>`;
}

/**
 * Builds the marker legend HTML.
 * @returns {string}
 */
function _buildLegend() {
  const items = MAP_MARKERS.map(
    (m) => `
      <li class="map-legend__item">
        <span class="map-legend__dot map-legend__dot--${_escapeHtml(m.color)}" aria-hidden="true"></span>
        <span class="map-legend__city">${_escapeHtml(m.city)}</span>
        <span class="map-legend__period">${_escapeHtml(m.period)}</span>
      </li>`
  ).join('');

  return `
    <ul class="map-legend" role="list" aria-label="Map legend">
      ${items}
    </ul>`;
}

/**
 * Minimal HTML escaping to prevent XSS via data strings.
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
