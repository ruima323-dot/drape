import { v4 as uuidv4 } from 'uuid';
import type { SavedOutfit, OccasionContext } from '@drape/shared';
import { pool } from '../connection.js';

const MAX_NOTE_LENGTH = 280;

interface CreateSavedOutfitInput {
  userId: string;
  generatedOutfitId: string;
  name?: string;
  note?: string;
  occasionContext?: OccasionContext;
}

export interface SavedOutfitWithContext extends SavedOutfit {
  occasionContext?: OccasionContext;
}

export interface MonthGroup {
  month: number;
  year: number;
  label: string;
  outfits: SavedOutfitWithContext[];
}

function rowToSavedOutfit(row: Record<string, unknown>): SavedOutfitWithContext {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    generatedOutfitId: row.generated_outfit_id as string,
    name: (row.name as string) ?? undefined,
    note: (row.note as string) ?? undefined,
    savedAt: new Date(row.saved_at as string),
    occasionContext: (row.occasion_context as OccasionContext) ?? undefined,
  };
}

export async function createSavedOutfit(
  input: CreateSavedOutfitInput
): Promise<SavedOutfitWithContext> {
  if (input.note !== undefined && input.note.length > MAX_NOTE_LENGTH) {
    throw new Error(
      `Note must not exceed ${MAX_NOTE_LENGTH} characters (received ${input.note.length})`
    );
  }

  const id = uuidv4();
  const result = await pool.query(
    `INSERT INTO saved_outfits (id, user_id, generated_outfit_id, name, note, occasion_context)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      id,
      input.userId,
      input.generatedOutfitId,
      input.name ?? null,
      input.note ?? null,
      input.occasionContext ?? null,
    ]
  );
  return rowToSavedOutfit(result.rows[0]);
}

export async function getSavedOutfitById(
  id: string
): Promise<SavedOutfitWithContext | null> {
  const result = await pool.query(
    `SELECT * FROM saved_outfits WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) return null;
  return rowToSavedOutfit(result.rows[0]);
}

export async function listSavedOutfitsByUser(
  userId: string,
  occasionContext?: OccasionContext
): Promise<SavedOutfitWithContext[]> {
  if (occasionContext) {
    const result = await pool.query(
      `SELECT * FROM saved_outfits
       WHERE user_id = $1 AND occasion_context = $2
       ORDER BY saved_at DESC`,
      [userId, occasionContext]
    );
    return result.rows.map(rowToSavedOutfit);
  }

  const result = await pool.query(
    `SELECT * FROM saved_outfits WHERE user_id = $1 ORDER BY saved_at DESC`,
    [userId]
  );
  return result.rows.map(rowToSavedOutfit);
}

export async function deleteSavedOutfit(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM saved_outfits WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function listSavedOutfitsByUserGroupedByMonth(
  userId: string,
  occasionContext?: OccasionContext
): Promise<MonthGroup[]> {
  const outfits = await listSavedOutfitsByUser(userId, occasionContext);

  const groupMap = new Map<string, MonthGroup>();

  for (const outfit of outfits) {
    const date = outfit.savedAt;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;

    if (!groupMap.has(key)) {
      const label = date.toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      });
      groupMap.set(key, { month, year, label, outfits: [] });
    }

    groupMap.get(key)!.outfits.push(outfit);
  }

  // Sort groups by most recent first
  return Array.from(groupMap.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}
