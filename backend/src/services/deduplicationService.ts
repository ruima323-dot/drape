import type { IdentifiedItem, WardrobeItem } from '@drape/shared';
import { listWardrobeItemsByUser } from '../db/repositories/index.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExistingItemMatch {
  identifiedItem: IdentifiedItem;
  wardrobeItemId: string;
}

export interface DeduplicationResult {
  newItems: IdentifiedItem[];
  existingItems: ExistingItemMatch[];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check identified items against the user's existing wardrobe.
 * An item is considered a duplicate if a wardrobe item exists with
 * matching type + color + material (case-insensitive strict equality).
 */
export async function checkItems(
  userId: string,
  items: IdentifiedItem[]
): Promise<DeduplicationResult> {
  const wardrobeItems = await listWardrobeItemsByUser(userId);

  const newItems: IdentifiedItem[] = [];
  const existingItems: ExistingItemMatch[] = [];

  for (const item of items) {
    const match = findMatch(item, wardrobeItems);
    if (match) {
      existingItems.push({ identifiedItem: item, wardrobeItemId: match.id });
    } else {
      newItems.push(item);
    }
  }

  return { newItems, existingItems };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Find a wardrobe item that matches the identified item on type + color + material
 * (case-insensitive strict equality).
 */
function findMatch(item: IdentifiedItem, wardrobeItems: WardrobeItem[]): WardrobeItem | null {
  const type = item.type.toLowerCase();
  const color = item.color.toLowerCase();
  const material = item.material.toLowerCase();

  for (const wi of wardrobeItems) {
    if (
      wi.type.toLowerCase() === type &&
      wi.color.toLowerCase() === color &&
      wi.material.toLowerCase() === material
    ) {
      return wi;
    }
  }

  return null;
}
