import { generateItemThumbnail, beautifyThumbnail, THUMBNAIL_ENABLED } from './thumbnailGenerator.js';
import { pool } from '../db/connection.js';

/**
 * Queue thumbnail generation for a wardrobe item (text-input items only).
 * Generates an AI product image from the item description.
 */
export function queueThumbnailGeneration(
  itemId: string,
  item: { type: string; color: string; material: string; details?: string }
): void {
  if (!THUMBNAIL_ENABLED) {
    return;
  }

  setImmediate(async () => {
    try {
      const imageUrl = await generateItemThumbnail(item);
      if (imageUrl) {
        await pool.query(
          'UPDATE wardrobe_items SET image_url = $1 WHERE id = $2',
          [imageUrl, itemId]
        );
      }
    } catch (error) {
      console.error(`[thumbnailQueue] Failed to generate thumbnail for item ${itemId}:`, error);
    }
  });
}

/**
 * Queue beautification of a cropped thumbnail.
 *
 * The raw crop is already saved as the item's image_url (shown immediately).
 * This function generates a clean flat-lay version in the background and
 * replaces the raw crop when done.
 *
 * All items in a batch are processed in parallel for speed.
 */
export function queueThumbnailBeautification(
  items: { itemId: string; cropUrl: string; type: string; color: string; material: string; details?: string }[]
): void {
  if (!THUMBNAIL_ENABLED || items.length === 0) {
    return;
  }

  setImmediate(async () => {
    // Process all items in parallel
    await Promise.allSettled(
      items.map(async ({ itemId, cropUrl, type, color, material, details }) => {
        try {
          const beautifiedUrl = await beautifyThumbnail(cropUrl, { type, color, material, details });
          if (beautifiedUrl) {
            await pool.query(
              'UPDATE wardrobe_items SET image_url = $1 WHERE id = $2',
              [beautifiedUrl, itemId]
            );
          }
        } catch (error) {
          console.error(`[thumbnailQueue] Failed to beautify thumbnail for item ${itemId}:`, error);
          // Raw crop remains as the thumbnail — acceptable fallback
        }
      })
    );
  });
}
