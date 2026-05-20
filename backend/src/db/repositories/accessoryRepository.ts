import { v4 as uuidv4 } from 'uuid';
import type { Accessory } from '@drape/shared';
import { pool } from '../connection.js';

interface CreateAccessoryInput {
  userId: string;
  type: string;
  color: string;
  material: string;
  label: string;
  emoji: string;
  imageUrl?: string;
}

function rowToAccessory(row: Record<string, unknown>): Accessory {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as string,
    color: row.color as string,
    material: (row.material as string) ?? '',
    label: row.label as string,
    emoji: (row.emoji as string) ?? '',
    imageUrl: (row.image_url as string) ?? undefined,
    createdAt: new Date(row.created_at as string),
  };
}

export async function createAccessory(
  input: CreateAccessoryInput
): Promise<Accessory> {
  const id = uuidv4();
  const result = await pool.query(
    `INSERT INTO accessories (id, user_id, type, color, material, label, emoji, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      input.userId,
      input.type,
      input.color,
      input.material,
      input.label,
      input.emoji,
      input.imageUrl ?? null,
    ]
  );
  return rowToAccessory(result.rows[0]);
}

export async function listAccessoriesByUser(
  userId: string
): Promise<Accessory[]> {
  const result = await pool.query(
    `SELECT * FROM accessories WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(rowToAccessory);
}

export async function deleteAccessory(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM accessories WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}
