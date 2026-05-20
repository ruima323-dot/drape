import { v4 as uuidv4 } from 'uuid';
import type { OutfitPhoto, OccasionContext } from '@drape/shared';
import { pool } from '../connection.js';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreateOutfitPhotoInput {
  userId: string;
  photoUrl: string;
  wardrobeItemIds: string[];
  occasionContext: OccasionContext;
  note?: string;
  takenAt?: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rowToOutfitPhoto(row: Record<string, unknown>): OutfitPhoto {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    photoUrl: row.photo_url as string,
    wardrobeItemIds: (row.wardrobe_item_ids as string[]) ?? [],
    occasionContext: row.occasion_context as OccasionContext,
    note: (row.note as string) ?? undefined,
    createdAt: new Date(row.created_at as string),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Insert a new outfit photo record.
 */
export async function createOutfitPhoto(input: CreateOutfitPhotoInput): Promise<OutfitPhoto> {
  const id = uuidv4();
  const createdAt = input.takenAt ?? new Date();
  const result = await pool.query(
    `INSERT INTO outfit_photos (id, user_id, photo_url, wardrobe_item_ids, occasion_context, note, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      id,
      input.userId,
      input.photoUrl,
      input.wardrobeItemIds,
      input.occasionContext,
      input.note ?? null,
      createdAt,
    ]
  );
  return rowToOutfitPhoto(result.rows[0]);
}

/**
 * Get an outfit photo by ID.
 */
export async function getOutfitPhotoById(id: string): Promise<OutfitPhoto | null> {
  const result = await pool.query(
    `SELECT * FROM outfit_photos WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) return null;
  return rowToOutfitPhoto(result.rows[0]);
}

/**
 * Delete an outfit photo by ID.
 * Returns true if a record was deleted, false if not found.
 */
export async function deleteOutfitPhoto(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM outfit_photos WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * List outfit photos for a user, optionally filtered by occasion context.
 * Ordered by created_at DESC (most recent first).
 */
export async function listOutfitPhotosByUser(
  userId: string,
  occasionContext?: OccasionContext
): Promise<OutfitPhoto[]> {
  if (occasionContext) {
    const result = await pool.query(
      `SELECT * FROM outfit_photos
       WHERE user_id = $1 AND occasion_context = $2
       ORDER BY created_at DESC`,
      [userId, occasionContext]
    );
    return result.rows.map(rowToOutfitPhoto);
  }

  const result = await pool.query(
    `SELECT * FROM outfit_photos WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(rowToOutfitPhoto);
}
