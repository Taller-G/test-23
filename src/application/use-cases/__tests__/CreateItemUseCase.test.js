/**
 * Tests for CreateItemUseCase.
 */

import { CreateItemUseCase } from '../CreateItemUseCase.js';
import { InMemoryItemRepository } from '../../../infrastructure/repositories/InMemoryItemRepository.js';
import { DomainException } from '../../../domain/exceptions/DomainException.js';

describe('CreateItemUseCase', () => {
  let repository;
  let useCase;

  beforeEach(() => {
    repository = new InMemoryItemRepository();
    useCase = new CreateItemUseCase(repository);
  });

  it('creates a new item and returns a DTO', async () => {
    const dto = await useCase.execute({ name: 'Walk the dog', description: 'Morning walk' });

    expect(dto.id).toBeDefined();
    expect(dto.name).toBe('Walk the dog');
    expect(dto.description).toBe('Morning walk');
    expect(dto.completed).toBe(false);
    expect(dto.status).toBe('pending');
    expect(dto.createdAt).toBeDefined();
  });

  it('persists the item in the repository', async () => {
    await useCase.execute({ name: 'Clean desk' });
    expect(repository.size).toBe(1);
  });

  it('uses empty string as default description', async () => {
    const dto = await useCase.execute({ name: 'No desc' });
    expect(dto.description).toBe('');
  });

  it('throws DomainException when creating a duplicate-named item', async () => {
    await useCase.execute({ name: 'Duplicate' });
    await expect(useCase.execute({ name: 'Duplicate' })).rejects.toThrow(DomainException);
  });

  it('is case-insensitive for duplicate detection', async () => {
    await useCase.execute({ name: 'Duplicate' });
    await expect(useCase.execute({ name: 'DUPLICATE' })).rejects.toThrow(DomainException);
  });
});
