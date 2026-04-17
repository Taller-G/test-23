/**
 * Tests for GetAllItemsUseCase.
 */

import { GetAllItemsUseCase } from '../GetAllItemsUseCase.js';
import { CreateItemUseCase } from '../CreateItemUseCase.js';
import { CompleteItemUseCase } from '../CompleteItemUseCase.js';
import { InMemoryItemRepository } from '../../../infrastructure/repositories/InMemoryItemRepository.js';

describe('GetAllItemsUseCase', () => {
  let repository;
  let getAllItems;
  let createItem;
  let completeItem;

  beforeEach(() => {
    repository = new InMemoryItemRepository();
    getAllItems = new GetAllItemsUseCase(repository);
    createItem = new CreateItemUseCase(repository);
    completeItem = new CompleteItemUseCase(repository);
  });

  it('returns an empty array when there are no items', async () => {
    const items = await getAllItems.execute();
    expect(items).toEqual([]);
  });

  it('returns all created items as DTOs', async () => {
    await createItem.execute({ name: 'Alpha' });
    await createItem.execute({ name: 'Beta' });
    const items = await getAllItems.execute();
    expect(items).toHaveLength(2);
  });

  it('returns items sorted: pending before completed', async () => {
    const { id } = await createItem.execute({ name: 'First (will complete)' });
    await createItem.execute({ name: 'Second (stays pending)' });
    await completeItem.execute({ id });

    const items = await getAllItems.execute();
    expect(items[0].status).toBe('pending');
    expect(items[1].status).toBe('completed');
  });
});
