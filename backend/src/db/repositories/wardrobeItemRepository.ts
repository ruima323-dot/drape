import { v4 as uuidv4 } from 'uuid';
import type { WardrobeItem, OccasionContext } from '@drape/shared';
import { pool } from '../connection.js';

interface CreateWardrobeItemInput {
  userId: string;
  type: string;
  color: string;
  material: string;
  fit: string;
  occasions: OccasionContext[];
  imageUrl?: string;
}

function rowToWardrobeItem(row: Record<string, unknown>): WardrobeItem {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as string,
    color: row.color as string,
    material: (row.material as string) ?? '',
    fit: (row.fit as string) ?? '',
    occasions: (row.occasions as OccasionContext[]) ?? [],
    imageUrl: (row.image_url as string) ?? undefined,
    createdAt: new Date(row.created_at as string),
  };
}

export async function createWardrobeItem(
  input: CreateWardrobeItemInput
): Promise<WardrobeItem> {
  const id = uuidv4();
  const result = await pool.query(
    `INSERT INTO wardrobe_items (id, user_id, type, color, material, fit, occasions, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      input.userId,
      input.type,
      input.color,
      input.material,
      input.fit,
      input.occasions,
      input.imageUrl ?? null,
    ]
  );
  return rowToWardrobeItem(result.rows[0]);
}

export async function listWardrobeItemsByUser(
  userId: string
): Promise<WardrobeItem[]> {
  const result = await pool.query(
    `SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(rowToWardrobeItem);
}

export async function deleteWardrobeItem(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM wardrobe_items WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getWardrobeItemById(id: string): Promise<WardrobeItem | null> {
  const result = await pool.query(
    `SELECT * FROM wardrobe_items WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return rowToWardrobeItem(result.rows[0]);
}
