import { v4 as uuidv4 } from 'uuid';
import type {
  GeneratedOutfit,
  OccasionContext,
  AccessoryLayerState,
} from '@drape/shared';
import { pool } from '../connection.js';

interface CreateGeneratedOutfitInput {
  userId: string;
  occasionContext: OccasionContext;
  wardrobeItemIds: string[];
  accessoryIds: string[];
  accessoryLayerState: AccessoryLayerState;
  imageUrl: string;
  avatarImageUrl?: string;
}

function rowToGeneratedOutfit(row: Record<string, unknown>): GeneratedOutfit {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    occasionContext: row.occasion_context as OccasionContext,
    wardrobeItemIds: (row.wardrobe_item_ids as string[]) ?? [],
    accessoryIds: (row.accessory_ids as string[]) ?? [],
    accessoryLayerState: (row.accessory_layer_state as AccessoryLayerState) ?? {
      activeAccessories: [],
    },
    imageUrl: row.image_url as string,
    avatarImageUrl: (row.avatar_image_url as string) ?? undefined,
    createdAt: new Date(row.created_at as string),
  };
}

export async function createGeneratedOutfit(
  input: CreateGeneratedOutfitInput
): Promise<GeneratedOutfit> {
  const id = uuidv4();
  const result = await pool.query(
    `INSERT INTO generated_outfits
       (id, user_id, occasion_context, wardrobe_item_ids, accessory_ids, accessory_layer_state, image_url, avatar_image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      input.userId,
      input.occasionContext,
      input.wardrobeItemIds,
      input.accessoryIds,
      JSON.stringify(input.accessoryLayerState),
      input.imageUrl,
      input.avatarImageUrl ?? null,
    ]
  );
  return rowToGeneratedOutfit(result.rows[0]);
}

export async function getGeneratedOutfitById(
  id: string
): Promise<GeneratedOutfit | null> {
  const result = await pool.query(
    `SELECT * FROM generated_outfits WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) return null;
  return rowToGeneratedOutfit(result.rows[0]);
}

export async function countGenerationsToday(userId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) AS count FROM generated_outfits
     WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

export async function listGeneratedOutfitsByUser(
  userId: string
): Promise<GeneratedOutfit[]> {
  const result = await pool.query(
    `SELECT * FROM generated_outfits WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(rowToGeneratedOutfit);
}
