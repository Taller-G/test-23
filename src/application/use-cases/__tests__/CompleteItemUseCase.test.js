/**
 * Tests for CompleteItemUseCase.
 */

import { CompleteItemUseCase } from '../CompleteItemUseCase.js';
import { CreateItemUseCase } from '../CreateItemUseCase.js';
import { InMemoryItemRepository } from '../../../infrastructure/repositories/InMemoryItemRepository.js';
import { ApplicationException } from '../../exceptions/ApplicationException.js';
import { DomainException } from '../../../domain/exceptions/DomainException.js';

describe('CompleteItemUseCase', () => {
  let repository;
  let createItem;
  let completeItem;

  beforeEach(() => {
    repository = new InMemoryItemRepository();
    createItem = new CreateItemUseCase(repository);
    completeItem = new CompleteItemUseCase(repository);
  });

  it('marks an item as completed and returns updated DTO', async () => {
    const created = await createItem.execute({ name: 'Read book' });
    const completed = await completeItem.execute({ id: created.id });

    expect(completed.completed).toBe(true);
    expect(completed.status).toBe('completed');
  });

  it('throws ApplicationException for a non-existent id', async () => {
    await expect(completeItem.execute({ id: 'ghost-id' })).rejects.toThrow(ApplicationException);
  });

  it('throws DomainException when completing an already-completed item', async () => {
    const created = await createItem.execute({ name: 'Run 5k' });
    await completeItem.execute({ id: created.id });
    await expect(completeItem.execute({ id: created.id })).rejects.toThrow(DomainException);
  });
});
