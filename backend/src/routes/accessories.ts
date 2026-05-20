import { Router, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { parseAccessoryPrompt } from '../services/wardrobeParser.js';
import {
  addAccessory,
  removeAccessory,
  toggleAccessory,
} from '../services/accessoryCompositor.js';
import { suggestAccessories } from '../services/recommendationEngine.js';
import {
  createAccessory,
  listAccessoriesByUser,
  getGeneratedOutfitById,
  listWardrobeItemsByUser,
} from '../db/repositories/index.js';

const router = Router();

/**
 * POST /api/accessories/parse
 * Accept accessory prompt text, call parser, return parsed accessory or error.
 */
router.post('/accessories/parse', (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Request body must include a "text" string' });
      return;
    }

    const result = parseAccessoryPrompt(text);
    res.json(result);
  } catch (err) {
    console.error('Error parsing accessory prompt:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/accessories/composite
 * Accept { outfitId, accessoryId, action: 'add' | 'remove' | 'toggle' },
 * call Accessory Compositor, return updated image + metadata.
 */
router.post('/accessories/composite', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const { outfitId, accessoryId, action } = req.body;

    if (!outfitId || typeof outfitId !== 'string') {
      res.status(400).json({ error: 'outfitId is required' });
      return;
    }

    if (!accessoryId || typeof accessoryId !== 'string') {
      res.status(400).json({ error: 'accessoryId is required' });
      return;
    }

    const validActions = ['add', 'remove', 'toggle'];
    if (!action || !validActions.includes(action)) {
      res.status(400).json({ error: `action must be one of: ${validActions.join(', ')}` });
      return;
    }

    // Fetch the generated outfit
    const outfit = await getGeneratedOutfitById(outfitId);
    if (!outfit) {
      res.status(404).json({ error: 'Outfit not found' });
      return;
    }

    // Fetch the accessory
    const userAccessories = await listAccessoriesByUser(userId);
    const accessory = userAccessories.find((a) => a.id === accessoryId);
    if (!accessory) {
      res.status(404).json({ error: 'Accessory not found' });
      return;
    }

    let result;
    const baseImageUrl = outfit.imageUrl;
    const currentAccessoryLayer = outfit.accessoryLayerState;

    switch (action) {
      case 'add':
        result = await addAccessory({
          baseImageUrl,
          currentAccessoryLayer,
          accessoryToAdd: accessory,
        });
        break;
      case 'remove':
        result = await removeAccessory({
          baseImageUrl,
          currentAccessoryLayer,
          accessoryToRemove: accessoryId,
        });
        break;
      case 'toggle':
        result = await toggleAccessory({
          baseImageUrl,
          currentAccessoryLayer,
          accessoryToToggle: accessoryId,
          accessory,
        });
        break;
    }

    res.json({ result });
  } catch (err) {
    console.error('Error compositing accessory:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/accessories
 * Save a new accessory to the user's shelf.
 */
router.post('/accessories', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const { type, color, material, label, emoji } = req.body;

    if (!type || typeof type !== 'string') {
      res.status(400).json({ error: 'type is required' });
      return;
    }

    if (!color || typeof color !== 'string') {
      res.status(400).json({ error: 'color is required' });
      return;
    }

    const accessory = await createAccessory({
      userId,
      type,
      color,
      material: material ?? '',
      label: label ?? `${color} ${material ?? ''} ${type}`.trim(),
      emoji: emoji ?? '💎',
    });

    res.status(201).json({ accessory });
  } catch (err) {
    console.error('Error creating accessory:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/accessories
 * List user's saved accessories.
 */
router.get('/accessories', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const accessories = await listAccessoriesByUser(userId);
    res.json({ accessories });
  } catch (err) {
    console.error('Error listing accessories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/recommendations/accessories
 * Accept { outfitId } via query params, call Recommendation Engine, return suggestions.
 */
router.get('/recommendations/accessories', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const outfitId = req.query.outfitId as string | undefined;

    if (!outfitId) {
      res.status(400).json({ error: 'outfitId query parameter is required' });
      return;
    }

    const outfit = await getGeneratedOutfitById(outfitId);
    if (!outfit) {
      res.status(404).json({ error: 'Outfit not found' });
      return;
    }

    const userAccessories = await listAccessoriesByUser(userId);
    const wardrobeItems = await listWardrobeItemsByUser(userId);

    // Extract color palette from wardrobe items
    const wardrobeColorPalette = wardrobeItems
      .map((item) => item.color)
      .filter((color) => color && color !== 'unknown');

    const suggestions = await suggestAccessories({
      currentOutfit: outfit,
      occasionContext: outfit.occasionContext,
      wardrobeColorPalette,
      userAccessories,
      accessoryHistory: [], // MVP: no history tracking yet
    });

    res.json({ suggestions });
  } catch (err) {
    console.error('Error getting accessory recommendations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
