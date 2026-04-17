/**
 * renderApp — View / UI Renderer
 *
 * Manages the browser DOM for the dasdasdsa application.
 * Calls ItemController for all data operations; never touches repositories
 * or domain objects directly.
 *
 * Layer: Interfaces → Views
 * Imports: application DTOs (via controller results) only.
 */

/**
 * @param {import('../controllers/ItemController.js').ItemController} controller
 */
export function renderApp(controller) {
  const root = document.getElementById('app');

  if (!root) {
    console.error('renderApp: #app element not found in the DOM.');
    return;
  }

  root.innerHTML = buildShell();

  const form = document.getElementById('item-form');
  const nameInput = document.getElementById('item-name');
  const descInput = document.getElementById('item-desc');
  const listEl = document.getElementById('item-list');
  const feedbackEl = document.getElementById('feedback');

  // ── Initial load ────────────────────────────────────────────────────────────
  loadItems();

  // ── Form submit ─────────────────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFeedback();

    const result = await controller.create({
      name: nameInput.value,
      description: descInput.value,
    });

    if (result.ok) {
      nameInput.value = '';
      descInput.value = '';
      showFeedback(`✅ "${result.data.name}" added.`, 'success');
      loadItems();
    } else {
      showFeedback(`❌ ${result.error.message}`, 'error');
    }
  });

  // ── List click delegation ────────────────────────────────────────────────────
  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) {
      return;
    }

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    clearFeedback();

    if (action === 'complete') {
      const result = await controller.complete({ id });
      if (result.ok) {
        showFeedback(`✔ "${result.data.name}" marked as completed.`, 'success');
      } else {
        showFeedback(`❌ ${result.error.message}`, 'error');
      }
      loadItems();
    }

    if (action === 'delete') {
      const result = await controller.delete({ id });
      if (result.ok) {
        showFeedback(`🗑 Item deleted.`, 'success');
      } else {
        showFeedback(`❌ ${result.error.message}`, 'error');
      }
      loadItems();
    }
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────

  async function loadItems() {
    const result = await controller.list();

    if (!result.ok) {
      listEl.innerHTML = `<li class="error-item">Failed to load items: ${result.error.message}</li>`;
      return;
    }

    if (result.data.length === 0) {
      listEl.innerHTML = '<li class="empty-state">No items yet. Add one above!</li>';
      return;
    }

    listEl.innerHTML = result.data.map(renderItem).join('');
  }

  /**
   * @param {import('../../application/dtos/ItemDTO.js').ItemDTO} item
   * @returns {string}
   */
  function renderItem(item) {
    const completedClass = item.completed ? 'item--completed' : '';
    const formattedDate = new Date(item.createdAt).toLocaleDateString();

    return `
      <li class="item ${completedClass}" data-id="${item.id}">
        <div class="item__body">
          <span class="item__name">${escapeHtml(item.name)}</span>
          ${item.description ? `<span class="item__desc">${escapeHtml(item.description)}</span>` : ''}
          <span class="item__meta">
            <span class="item__status badge badge--${item.status}">${item.status}</span>
            <span class="item__date">${formattedDate}</span>
          </span>
        </div>
        <div class="item__actions">
          ${
            !item.completed
              ? `<button class="btn btn--success btn--sm"
                   data-action="complete"
                   data-id="${item.id}"
                   title="Mark as completed">
                   ✓ Complete
                 </button>`
              : ''
          }
          <button class="btn btn--danger btn--sm"
                  data-action="delete"
                  data-id="${item.id}"
                  title="Delete item">
            ✕ Delete
          </button>
        </div>
      </li>`;
  }

  function showFeedback(message, type) {
    feedbackEl.textContent = message;
    feedbackEl.className = `feedback feedback--${type}`;
    feedbackEl.setAttribute('aria-live', 'polite');
  }

  function clearFeedback() {
    feedbackEl.textContent = '';
    feedbackEl.className = 'feedback';
  }
}

// ── HTML template ─────────────────────────────────────────────────────────────

function buildShell() {
  return `
    <header class="header">
      <div class="header__inner">
        <h1 class="header__title">dasdasdsa</h1>
        <p class="header__subtitle">A clean-architecture item manager</p>
      </div>
    </header>

    <main class="main">
      <section class="card" aria-label="Add new item">
        <h2 class="card__title">Add Item</h2>
        <form id="item-form" class="form" novalidate>
          <div class="form__group">
            <label class="form__label" for="item-name">Name <span aria-hidden="true">*</span></label>
            <input
              class="form__input"
              id="item-name"
              type="text"
              placeholder="Enter item name…"
              maxlength="120"
              required
              autocomplete="off"
            />
          </div>
          <div class="form__group">
            <label class="form__label" for="item-desc">Description</label>
            <input
              class="form__input"
              id="item-desc"
              type="text"
              placeholder="Optional description…"
              maxlength="500"
              autocomplete="off"
            />
          </div>
          <button class="btn btn--primary" type="submit">＋ Add Item</button>
        </form>
        <div id="feedback" class="feedback" role="alert" aria-live="polite"></div>
      </section>

      <section class="card" aria-label="Item list">
        <h2 class="card__title">Items</h2>
        <ul id="item-list" class="item-list" aria-label="Items">
          <li class="empty-state">Loading…</li>
        </ul>
      </section>
    </main>

    <footer class="footer">
      <p>dasdasdsa &mdash; Built with Clean Architecture &amp; Vanilla JS</p>
    </footer>`;
}

// ── Security helper ───────────────────────────────────────────────────────────

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
