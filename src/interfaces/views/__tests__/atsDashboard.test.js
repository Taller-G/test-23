/**
 * @jest-environment jsdom
 *
 * Tests for atsDashboard.js — ATS export functionality
 *
 * Covers the two acceptance-criteria features:
 *  1. _buildReportText()    — report content (date, score, keywords, suggestions)
 *  2. _copyReportToClipboard via the "Copy Report" button:
 *       • clipboard.writeText called with the report text
 *       • button shows ✓ feedback for 2 s then reverts
 *       • button is disabled during feedback
 *       • failure path shows ✗ then reverts
 *  3. _downloadReportAsTxt via the "Download .txt" button:
 *       • Blob constructed with correct type
 *       • URL.createObjectURL called
 *       • <a download> appended, clicked, removed
 *       • URL.revokeObjectURL called to free memory
 *       • filename contains today's date (YYYY-MM-DD)
 *  4. mountAtsDashboard integration — both buttons present after analysis
 */

import { jest } from '@jest/globals';
import { _buildReportText, _downloadReportAsTxt, mountAtsDashboard } from '../atsDashboard.js';

// ── Shared fixture data ───────────────────────────────────────────────────────

const SCORE = 75;
const TIER = 'medium';
const FOUND = ['react', 'typescript'];
const MISSING = ['docker', 'kubernetes'];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD for today (mirrors _formatDateForFilename logic). */
function todayFilenameDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── 1. _buildReportText ───────────────────────────────────────────────────────

describe('_buildReportText()', () => {
  it('returns a non-empty string', () => {
    const text = _buildReportText(SCORE, TIER, FOUND, MISSING);
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });

  it('includes the score', () => {
    const text = _buildReportText(SCORE, TIER, FOUND, MISSING);
    expect(text).toContain('75/100');
  });

  it('includes the tier label (capitalised)', () => {
    const text = _buildReportText(SCORE, TIER, FOUND, MISSING);
    expect(text).toContain('Medium');
  });

  it('maps "low" tier to "Low"', () => {
    const text = _buildReportText(0, 'low', [], MISSING);
    expect(text).toContain('Low');
  });

  it('maps "high" tier to "High"', () => {
    const text = _buildReportText(100, 'high', FOUND, []);
    expect(text).toContain('High');
  });

  it("includes today's date somewhere in the report", () => {
    // The date is locale-formatted so we just verify a 4-digit year is present
    const text = _buildReportText(SCORE, TIER, FOUND, MISSING);
    expect(text).toMatch(/\b\d{4}\b/);
  });

  it('includes each found keyword prefixed with ✓', () => {
    const text = _buildReportText(SCORE, TIER, FOUND, MISSING);
    FOUND.forEach((k) => expect(text).toContain(`✓ ${k}`));
  });

  it('includes each missing keyword prefixed with ✗', () => {
    const text = _buildReportText(SCORE, TIER, FOUND, MISSING);
    MISSING.forEach((k) => expect(text).toContain(`✗ ${k}`));
  });

  it('shows "(none)" for found keywords when the list is empty', () => {
    const text = _buildReportText(0, 'low', [], MISSING);
    expect(text).toContain('(none)');
  });

  it('shows "(none)" for missing keywords when the list is empty', () => {
    const text = _buildReportText(100, 'high', FOUND, []);
    // Only the missing section should have (none)
    const missingIdx = text.indexOf('KEYWORDS MISSING');
    expect(text.slice(missingIdx)).toContain('(none)');
  });

  it('includes the KEYWORDS FOUND section header', () => {
    const text = _buildReportText(SCORE, TIER, FOUND, MISSING);
    expect(text).toContain('KEYWORDS FOUND');
  });

  it('includes the KEYWORDS MISSING section header', () => {
    const text = _buildReportText(SCORE, TIER, FOUND, MISSING);
    expect(text).toContain('KEYWORDS MISSING');
  });

  it('includes the IMPROVEMENT SUGGESTIONS section header', () => {
    const text = _buildReportText(SCORE, TIER, FOUND, MISSING);
    expect(text).toContain('IMPROVEMENT SUGGESTIONS');
  });

  it('includes at least 3 numbered suggestions', () => {
    const text = _buildReportText(SCORE, TIER, FOUND, MISSING);
    // Each suggestion starts with "  1. ", "  2. ", etc.
    expect(text).toContain('  1. ');
    expect(text).toContain('  2. ');
    expect(text).toContain('  3. ');
  });

  it('includes the ATS ANALYSIS REPORT title', () => {
    const text = _buildReportText(SCORE, TIER, FOUND, MISSING);
    expect(text).toContain('ATS ANALYSIS REPORT');
  });
});

// ── 2. Copy button — clipboard integration ────────────────────────────────────

describe('Copy Report button', () => {
  /** @type {HTMLElement} */
  let container;
  /** @type {{ destroy: () => void }} */
  let handle;

  // We need a real-ish AtsController; stub the network layer instead.
  // The simplest approach is to mount the dashboard, fill inputs, submit
  // the form, and let the real use case run.

  beforeEach(() => {
    // Fake clipboard API
    const writeText = jest.fn(() => Promise.resolve());
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    // Fake timers so we can fast-forward the 2-second revert
    jest.useFakeTimers();

    container = document.createElement('div');
    document.body.appendChild(container);

    handle = mountAtsDashboard(container);

    // Submit the form to make the results panel appear
    _submitForm(container);
  });

  afterEach(() => {
    handle.destroy();
    container.parentNode.removeChild(container);
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders the #ats-copy-btn after analysis', () => {
    expect(container.querySelector('#ats-copy-btn')).not.toBeNull();
  });

  it('calls navigator.clipboard.writeText with the report text on click', async () => {
    const btn = container.querySelector('#ats-copy-btn');
    btn.click();
    await Promise.resolve(); // flush microtask queue
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    const [written] = navigator.clipboard.writeText.mock.calls[0];
    expect(written).toContain('ATS ANALYSIS REPORT');
    expect(written).toContain('KEYWORDS FOUND');
    expect(written).toContain('KEYWORDS MISSING');
    expect(written).toContain('IMPROVEMENT SUGGESTIONS');
  });

  it('shows ✓ Copied! feedback immediately after successful copy', async () => {
    const btn = container.querySelector('#ats-copy-btn');
    btn.click();
    await Promise.resolve();
    expect(btn.innerHTML).toContain('✓ Copied!');
  });

  it('disables the button during the 2-second feedback window', async () => {
    const btn = container.querySelector('#ats-copy-btn');
    btn.click();
    await Promise.resolve();
    expect(btn.disabled).toBe(true);
  });

  it('restores the original label and re-enables the button after 2 s', async () => {
    const btn = container.querySelector('#ats-copy-btn');
    const originalHTML = btn.innerHTML;
    btn.click();
    await Promise.resolve();
    jest.advanceTimersByTime(2000);
    expect(btn.disabled).toBe(false);
    expect(btn.innerHTML).toBe(originalHTML);
  });

  it('shows ✗ Failed on clipboard error', async () => {
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('denied'));
    const btn = container.querySelector('#ats-copy-btn');
    btn.click();
    // Flush both the rejection microtask and the catch handler
    await Promise.resolve();
    await Promise.resolve();
    expect(btn.innerHTML).toContain('✗ Failed');
  });

  it('reverts from ✗ Failed after 2 s', async () => {
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('denied'));
    const btn = container.querySelector('#ats-copy-btn');
    const originalHTML = btn.innerHTML;
    btn.click();
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(2000);
    expect(btn.innerHTML).toBe(originalHTML);
  });
});

// ── 3. Download button — Blob + URL.createObjectURL ───────────────────────────

describe('_downloadReportAsTxt()', () => {
  /** @type {jest.Mock} */
  let createObjectURL;
  /** @type {jest.Mock} */
  let revokeObjectURL;
  /** @type {HTMLAnchorElement | null} */
  let capturedAnchor;

  beforeEach(() => {
    // Stub URL methods
    createObjectURL = jest.fn(() => 'blob:fake-url');
    revokeObjectURL = jest.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    // Intercept anchor.click() so no real download fires;
    // capture the anchor before it is removed from the DOM.
    capturedAnchor = null;
    const originalAppendChild = document.body.appendChild.bind(document.body);
    jest.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node.tagName === 'A') {
        capturedAnchor = node;
        // Stub click so it doesn't trigger browser download
        node.click = jest.fn();
        return originalAppendChild(node);
      }
      return originalAppendChild(node);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls URL.createObjectURL with a Blob', () => {
    _downloadReportAsTxt(SCORE, TIER, FOUND, MISSING);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const [blob] = createObjectURL.mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
  });

  it('creates the Blob with text/plain charset utf-8 MIME type', () => {
    _downloadReportAsTxt(SCORE, TIER, FOUND, MISSING);
    const [blob] = createObjectURL.mock.calls[0];
    expect(blob.type).toBe('text/plain;charset=utf-8');
  });

  it('Blob content contains the report text', () => {
    // Spy on the Blob constructor to capture the text parts passed to it,
    // since blob.text() / arrayBuffer() are not available in this test runner.
    const blobParts = [];
    const OrigBlob = global.Blob;
    global.Blob = class extends OrigBlob {
      constructor(parts, opts) {
        super(parts, opts);
        if (Array.isArray(parts)) blobParts.push(...parts);
      }
    };

    try {
      _downloadReportAsTxt(SCORE, TIER, FOUND, MISSING);
    } finally {
      global.Blob = OrigBlob;
    }

    const content = blobParts.join('');
    expect(content).toContain('ATS ANALYSIS REPORT');
    expect(content).toContain('KEYWORDS FOUND');
    expect(content).toContain('KEYWORDS MISSING');
  });

  it('sets anchor href to the object URL', () => {
    _downloadReportAsTxt(SCORE, TIER, FOUND, MISSING);
    expect(capturedAnchor.href).toContain('fake-url');
  });

  it('sets the download attribute to a .txt filename', () => {
    _downloadReportAsTxt(SCORE, TIER, FOUND, MISSING);
    expect(capturedAnchor.download).toMatch(/\.txt$/);
  });

  it("filename includes today's date in YYYY-MM-DD format", () => {
    _downloadReportAsTxt(SCORE, TIER, FOUND, MISSING);
    expect(capturedAnchor.download).toContain(todayFilenameDate());
  });

  it('filename starts with "ats-report-"', () => {
    _downloadReportAsTxt(SCORE, TIER, FOUND, MISSING);
    expect(capturedAnchor.download).toMatch(/^ats-report-/);
  });

  it('programmatically clicks the anchor to trigger the download', () => {
    _downloadReportAsTxt(SCORE, TIER, FOUND, MISSING);
    expect(capturedAnchor.click).toHaveBeenCalledTimes(1);
  });

  it('removes the anchor from the DOM after clicking', () => {
    _downloadReportAsTxt(SCORE, TIER, FOUND, MISSING);
    expect(document.body.contains(capturedAnchor)).toBe(false);
  });

  it('calls URL.revokeObjectURL to free memory', () => {
    _downloadReportAsTxt(SCORE, TIER, FOUND, MISSING);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });
});

// ── 4. mountAtsDashboard integration — both buttons rendered ──────────────────

describe('mountAtsDashboard() — export buttons', () => {
  /** @type {HTMLElement} */
  let container;
  /** @type {{ destroy: () => void }} */
  let handle;

  beforeEach(() => {
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText: jest.fn(() => Promise.resolve()) },
      writable: true,
      configurable: true,
    });
    global.URL.createObjectURL = jest.fn(() => 'blob:fake');
    global.URL.revokeObjectURL = jest.fn();

    container = document.createElement('div');
    document.body.appendChild(container);
    handle = mountAtsDashboard(container);
    _submitForm(container);
  });

  afterEach(() => {
    handle.destroy();
    container.parentNode.removeChild(container);
    jest.restoreAllMocks();
  });

  it('renders the #ats-copy-btn button', () => {
    expect(container.querySelector('#ats-copy-btn')).not.toBeNull();
  });

  it('renders the #ats-download-btn button', () => {
    expect(container.querySelector('#ats-download-btn')).not.toBeNull();
  });

  it('#ats-copy-btn has an aria-label mentioning clipboard', () => {
    const btn = container.querySelector('#ats-copy-btn');
    expect(btn.getAttribute('aria-label').toLowerCase()).toContain('clipboard');
  });

  it('#ats-download-btn has an aria-label mentioning .txt', () => {
    const btn = container.querySelector('#ats-download-btn');
    expect(btn.getAttribute('aria-label').toLowerCase()).toContain('.txt');
  });

  it('both buttons are inside .ats-results__actions', () => {
    const actions = container.querySelector('.ats-results__actions');
    expect(actions.querySelector('#ats-copy-btn')).not.toBeNull();
    expect(actions.querySelector('#ats-download-btn')).not.toBeNull();
  });

  it('clicking #ats-download-btn triggers URL.createObjectURL', () => {
    // Spy on appendChild so the auto-click does not fail
    jest.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node.tagName === 'A') node.click = jest.fn();
      document.body.__proto__.appendChild.call(document.body, node);
      return node;
    });

    const btn = container.querySelector('#ats-download-btn');
    btn.click();
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
  });
});

// ── Internal helper — fills and submits the ATS form ─────────────────────────

/**
 * Fills in the ATS form inside `container` with valid data and submits it,
 * so the results panel (including export buttons) is rendered.
 *
 * @param {HTMLElement} container
 */
function _submitForm(container) {
  const cvInput = container.querySelector('#ats-cv-text');
  const kwInput = container.querySelector('#ats-keywords');

  if (!cvInput || !kwInput) {
    throw new Error('_submitForm: ATS form inputs not found in container.');
  }

  cvInput.value = 'Experienced React and TypeScript developer with Docker skills.';
  kwInput.value = 'React, TypeScript, Docker, Kubernetes';

  const form = container.querySelector('#ats-form');
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}
