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
import { mountExperience } from './views/experience.js';
import { mountAtsDashboard } from './views/atsDashboard.js';

// ── Composition Root ──────────────────────────────────────────────────────────
const repository = new LocalStorageItemRepository();
const controller = new ItemController(repository);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Mount the item manager (form + list)
  renderApp(controller);

  // Mount the Experience timeline section
  const experienceRoot = document.getElementById('experience-root');
  if (experienceRoot) {
    mountExperience(experienceRoot);
  }

  // Mount the ATS Analyser dashboard
  const atsRoot = document.getElementById('ats-root');
  if (atsRoot) {
    mountAtsDashboard(atsRoot);
  }
});
