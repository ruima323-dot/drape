import { Router, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { parseWardrobe } from '../services/wardrobeParser.js';
import {
  createWardrobeItem,
  listWardrobeItemsByUser,
  deleteWardrobeItem,
  getWardrobeItemById,
} from '../db/repositories/index.js';
import { queueThumbnailGeneration } from '../services/thumbnailQueue.js';

const router = Router();

/**
 * POST /api/wardrobe/parse
 * Accept plain text, call Wardrobe Parser, return parsed items or errors.
 */
router.post('/wardrobe/parse', (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Request body must include a "text" string' });
      return;
    }

    const result = parseWardrobe(text);
    res.json(result);
  } catch (err) {
    console.error('Error parsing wardrobe text:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/wardrobe
 * List user's wardrobe items.
 */
router.get('/wardrobe', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const items = await listWardrobeItemsByUser(userId);
    res.json({ items });
  } catch (err) {
    console.error('Error listing wardrobe items:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/wardrobe/items
 * Store parsed wardrobe items in database.
 */
router.post('/wardrobe/items', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Request body must include a non-empty "items" array' });
      return;
    }

    const created = [];
    for (const item of items) {
      if (!item.type || !item.color) {
        res.status(400).json({ error: 'Each item must have at least "type" and "color"' });
        return;
      }

      const saved = await createWardrobeItem({
        userId,
        type: item.type,
        color: item.color,
        material: item.material ?? '',
        fit: item.fit ?? 'regular',
        occasions: item.occasions ?? ['casual'],
        imageUrl: item.imageUrl,
      });
      created.push(saved);
    }

    // Queue thumbnail generation for each new item (fire-and-forget)
    for (const item of created) {
      if (!item.imageUrl) {
        queueThumbnailGeneration(item.id, {
          type: item.type,
          color: item.color,
          material: item.material,
        });
      }
    }

    res.status(201).json({ items: created });
  } catch (err) {
    console.error('Error storing wardrobe items:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/wardrobe/items/:id
 * Get a single wardrobe item by ID (useful for polling thumbnail status).
 */
router.get('/wardrobe/items/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const item = await getWardrobeItemById(id);
    if (!item) {
      res.status(404).json({ error: 'Wardrobe item not found' });
      return;
    }
    res.json({ item });
  } catch (err) {
    console.error('Error fetching wardrobe item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/wardrobe/items/:id
 * Remove a wardrobe item.
 */
router.delete('/wardrobe/items/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await deleteWardrobeItem(id);
    if (!deleted) {
      res.status(404).json({ error: 'Wardrobe item not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting wardrobe item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/wardrobe/regenerate-thumbnails
 * Regenerate thumbnails for all items that don't have one.
 */
router.post('/wardrobe/regenerate-thumbnails', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const items = await listWardrobeItemsByUser(userId);
    const itemsWithoutThumbnails = items.filter((item) => !item.imageUrl);

    for (const item of itemsWithoutThumbnails) {
      queueThumbnailGeneration(item.id, {
        type: item.type,
        color: item.color,
        material: item.material,
      });
    }

    res.json({ queued: itemsWithoutThumbnails.length });
  } catch (err) {
    console.error('Error regenerating thumbnails:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
