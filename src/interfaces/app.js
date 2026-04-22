/**
 * app.js — Browser Entry Point
 *
 * Wires together infrastructure, use cases, and the UI.
 * This is the composition root: the only file allowed to know
 * about both infrastructure (repository) and interfaces (controller/view).
 *
 * Layer: Interfaces → Entry Point
 */

import { LocalStorageItemRepository } from '../infrastructure/repositories/LocalStorageItemRepository.js';
import { ItemController } from './controllers/ItemController.js';
import { renderApp } from './views/renderApp.js';
import { mountAtsAnalyzer } from './views/atsAnalyzer.js';

// ── Composition Root ──────────────────────────────────────────────────────────
const repository = new LocalStorageItemRepository();
const controller = new ItemController(repository);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderApp(controller);

  // Mount ATS Analyzer into its dedicated section
  const atsSection = document.getElementById('section-ats');
  if (atsSection) {
    mountAtsAnalyzer(atsSection);
  }
});
