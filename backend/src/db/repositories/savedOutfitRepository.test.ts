import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OccasionContext } from '@drape/shared';

// Mock the pool before importing the module
vi.mock('../connection.js', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import { pool } from '../connection.js';
import {
  createSavedOutfit,
  getSavedOutfitById,
  listSavedOutfitsByUser,
  listSavedOutfitsByUserGroupedByMonth,
} from './savedOutfitRepository.js';

const mockQuery = vi.mocked(pool.query);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createSavedOutfit', () => {
  it('should reject a note longer than 280 characters', async () => {
    const longNote = 'a'.repeat(281);
    await expect(
      createSavedOutfit({
        userId: 'user-1',
        generatedOutfitId: 'outfit-1',
        note: longNote,
      })
    ).rejects.toThrow('Note must not exceed 280 characters (received 281)');

    // Ensure no DB call was made
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('should accept a note of exactly 280 characters', async () => {
    const note = 'a'.repeat(280);
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'new-id',
          user_id: 'user-1',
          generated_outfit_id: 'outfit-1',
          name: null,
          note,
          occasion_context: null,
          saved_at: '2024-06-15T10:00:00Z',
        },
      ],
      rowCount: 1,
      command: 'INSERT',
      oid: 0,
      fields: [],
    });

    const result = await createSavedOutfit({
      userId: 'user-1',
      generatedOutfitId: 'outfit-1',
      note,
    });

    expect(result.note).toBe(note);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('should accept an empty note', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'new-id',
          user_id: 'user-1',
          generated_outfit_id: 'outfit-1',
          name: null,
          note: '',
          occasion_context: null,
          saved_at: '2024-06-15T10:00:00Z',
        },
      ],
      rowCount: 1,
      command: 'INSERT',
      oid: 0,
      fields: [],
    });

    const result = await createSavedOutfit({
      userId: 'user-1',
      generatedOutfitId: 'outfit-1',
      note: '',
    });

    expect(result.note).toBe('');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('should accept undefined note', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'new-id',
          user_id: 'user-1',
          generated_outfit_id: 'outfit-1',
          name: null,
          note: null,
          occasion_context: null,
          saved_at: '2024-06-15T10:00:00Z',
        },
      ],
      rowCount: 1,
      command: 'INSERT',
      oid: 0,
      fields: [],
    });

    const result = await createSavedOutfit({
      userId: 'user-1',
      generatedOutfitId: 'outfit-1',
    });

    expect(result.note).toBeUndefined();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('should store occasion_context when provided', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'new-id',
          user_id: 'user-1',
          generated_outfit_id: 'outfit-1',
          name: 'My outfit',
          note: 'Great look',
          occasion_context: 'work',
          saved_at: '2024-06-15T10:00:00Z',
        },
      ],
      rowCount: 1,
      command: 'INSERT',
      oid: 0,
      fields: [],
    });

    const result = await createSavedOutfit({
      userId: 'user-1',
      generatedOutfitId: 'outfit-1',
      name: 'My outfit',
      note: 'Great look',
      occasionContext: 'work',
    });

    expect(result.occasionContext).toBe('work');
    expect(mockQuery).toHaveBeenCalledTimes(1);
    // Verify the occasion_context was passed as a parameter
    const callArgs = mockQuery.mock.calls[0][1] as unknown[];
    expect(callArgs[5]).toBe('work');
  });
});

describe('getSavedOutfitById', () => {
  it('should return null when outfit not found', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });

    const result = await getSavedOutfitById('nonexistent');
    expect(result).toBeNull();
  });

  it('should return a mapped outfit when found', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'outfit-1',
          user_id: 'user-1',
          generated_outfit_id: 'gen-1',
          name: 'Summer look',
          note: 'Loved it',
          occasion_context: 'casual',
          saved_at: '2024-07-20T14:30:00Z',
        },
      ],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });

    const result = await getSavedOutfitById('outfit-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('outfit-1');
    expect(result!.userId).toBe('user-1');
    expect(result!.generatedOutfitId).toBe('gen-1');
    expect(result!.name).toBe('Summer look');
    expect(result!.note).toBe('Loved it');
    expect(result!.occasionContext).toBe('casual');
    expect(result!.savedAt).toBeInstanceOf(Date);
  });
});

describe('listSavedOutfitsByUser', () => {
  it('should filter by occasion_context when provided', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'outfit-1',
          user_id: 'user-1',
          generated_outfit_id: 'gen-1',
          name: null,
          note: null,
          occasion_context: 'work',
          saved_at: '2024-06-15T10:00:00Z',
        },
      ],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });

    const result = await listSavedOutfitsByUser('user-1', 'work');
    expect(result).toHaveLength(1);
    expect(result[0].occasionContext).toBe('work');

    // Verify the query included the occasion_context filter
    const queryStr = mockQuery.mock.calls[0][0] as string;
    expect(queryStr).toContain('occasion_context');
    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params).toContain('work');
  });

  it('should return all outfits when no filter provided', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'outfit-1',
          user_id: 'user-1',
          generated_outfit_id: 'gen-1',
          name: null,
          note: null,
          occasion_context: 'work',
          saved_at: '2024-06-15T10:00:00Z',
        },
        {
          id: 'outfit-2',
          user_id: 'user-1',
          generated_outfit_id: 'gen-2',
          name: null,
          note: null,
          occasion_context: 'casual',
          saved_at: '2024-06-14T10:00:00Z',
        },
      ],
      rowCount: 2,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });

    const result = await listSavedOutfitsByUser('user-1');
    expect(result).toHaveLength(2);
  });
});

describe('listSavedOutfitsByUserGroupedByMonth', () => {
  it('should group outfits by month and sort most recent first', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'outfit-3',
          user_id: 'user-1',
          generated_outfit_id: 'gen-3',
          name: null,
          note: null,
          occasion_context: 'work',
          saved_at: '2024-07-20T10:00:00Z',
        },
        {
          id: 'outfit-2',
          user_id: 'user-1',
          generated_outfit_id: 'gen-2',
          name: null,
          note: null,
          occasion_context: 'casual',
          saved_at: '2024-07-10T10:00:00Z',
        },
        {
          id: 'outfit-1',
          user_id: 'user-1',
          generated_outfit_id: 'gen-1',
          name: null,
          note: null,
          occasion_context: 'night_out',
          saved_at: '2024-06-15T10:00:00Z',
        },
      ],
      rowCount: 3,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });

    const groups = await listSavedOutfitsByUserGroupedByMonth('user-1');

    expect(groups).toHaveLength(2);
    // Most recent month first
    expect(groups[0].year).toBe(2024);
    expect(groups[0].month).toBe(7);
    expect(groups[0].outfits).toHaveLength(2);
    expect(groups[1].year).toBe(2024);
    expect(groups[1].month).toBe(6);
    expect(groups[1].outfits).toHaveLength(1);
  });

  it('should return empty array when user has no outfits', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
      command: 'SELECT',
      oid: 0,
      fields: [],
    });

    const groups = await listSavedOutfitsByUserGroupedByMonth('user-1');
    expect(groups).toHaveLength(0);
  });
});
