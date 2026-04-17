/**
 * ItemController
 *
 * Thin adapter between the UI event system and application use cases.
 * Responsibilities:
 *   • Validate / coerce raw input from the view.
 *   • Call the appropriate use case.
 *   • Return a plain result object (success payload or error descriptor).
 *
 * This controller is framework-agnostic: it receives and returns plain objects
 * so it can be driven by the browser DOM, a REST endpoint, or a test harness.
 *
 * Layer: Interfaces → Controllers
 * Imports: application use cases + DTOs only. NO domain / infrastructure.
 */

import { CreateItemUseCase } from '../../application/use-cases/CreateItemUseCase.js';
import { GetAllItemsUseCase } from '../../application/use-cases/GetAllItemsUseCase.js';
import { GetItemByIdUseCase } from '../../application/use-cases/GetItemByIdUseCase.js';
import { CompleteItemUseCase } from '../../application/use-cases/CompleteItemUseCase.js';
import { DeleteItemUseCase } from '../../application/use-cases/DeleteItemUseCase.js';
import { DomainException } from '../../domain/exceptions/DomainException.js';
import { ApplicationException } from '../../application/exceptions/ApplicationException.js';

export class ItemController {
  /**
   * @param {import('../../domain/repositories/IItemRepository.js').IItemRepository} itemRepository
   */
  constructor(itemRepository) {
    this.#createItem = new CreateItemUseCase(itemRepository);
    this.#getAllItems = new GetAllItemsUseCase(itemRepository);
    this.#getItemById = new GetItemByIdUseCase(itemRepository);
    this.#completeItem = new CompleteItemUseCase(itemRepository);
    this.#deleteItem = new DeleteItemUseCase(itemRepository);
  }

  #createItem;
  #getAllItems;
  #getItemById;
  #completeItem;
  #deleteItem;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  #ok(data) {
    return { ok: true, data };
  }

  #fail(error) {
    const isDomain = error instanceof DomainException;
    const isApp = error instanceof ApplicationException;

    return {
      ok: false,
      error: {
        message: error.message,
        code: isApp ? error.code : isDomain ? 'DOMAIN_ERROR' : 'UNKNOWN_ERROR',
      },
    };
  }

  // ── Actions (thin: validate → use case → respond) ───────────────────────────

  /**
   * Create a new item.
   * @param {{ name: string, description?: string }} input
   */
  async create(input) {
    const name = typeof input?.name === 'string' ? input.name.trim() : '';

    if (!name) {
      return this.#fail({ message: 'Name is required.', code: 'VALIDATION_ERROR' });
    }

    try {
      const dto = await this.#createItem.execute({
        name,
        description: input?.description ?? '',
      });
      return this.#ok(dto);
    } catch (err) {
      return this.#fail(err);
    }
  }

  /**
   * List all items.
   */
  async list() {
    try {
      const items = await this.#getAllItems.execute();
      return this.#ok(items);
    } catch (err) {
      return this.#fail(err);
    }
  }

  /**
   * Get a single item by id.
   * @param {{ id: string }} input
   */
  async get(input) {
    const id = typeof input?.id === 'string' ? input.id.trim() : '';

    if (!id) {
      return this.#fail({ message: 'Id is required.', code: 'VALIDATION_ERROR' });
    }

    try {
      const dto = await this.#getItemById.execute({ id });
      return this.#ok(dto);
    } catch (err) {
      return this.#fail(err);
    }
  }

  /**
   * Mark an item as complete.
   * @param {{ id: string }} input
   */
  async complete(input) {
    const id = typeof input?.id === 'string' ? input.id.trim() : '';

    if (!id) {
      return this.#fail({ message: 'Id is required.', code: 'VALIDATION_ERROR' });
    }

    try {
      const dto = await this.#completeItem.execute({ id });
      return this.#ok(dto);
    } catch (err) {
      return this.#fail(err);
    }
  }

  /**
   * Delete an item.
   * @param {{ id: string }} input
   */
  async delete(input) {
    const id = typeof input?.id === 'string' ? input.id.trim() : '';

    if (!id) {
      return this.#fail({ message: 'Id is required.', code: 'VALIDATION_ERROR' });
    }

    try {
      const result = await this.#deleteItem.execute({ id });
      return this.#ok(result);
    } catch (err) {
      return this.#fail(err);
    }
  }
}
