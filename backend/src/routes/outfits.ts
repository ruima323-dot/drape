import { Router, Request, Response } from 'express';
import type { OccasionContext, JourneyEntry } from '@drape/shared';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { generateOutfit } from '../services/outfitGenerator.js';
import {
  generateBaseAvatar,
  hasBaseAvatar,
  getBaseAvatarUrl,
} from '../services/baseAvatarGenerator.js';
import {
  getUserById,
  listWardrobeItemsByUser,
  getGeneratedOutfitById,
  createSavedOutfit,
  getSavedOutfitById,
  listSavedOutfitsByUser,
  listOutfitPhotosByUser,
  deleteSavedOutfit,
} from '../db/repositories/index.js';

const VALID_OCCASIONS: OccasionContext[] = ['work', 'casual', 'night_out'];
const MAX_NOTE_LENGTH = 280;

const router = Router();

/**
 * GET /api/outfits/base-avatar
 * Returns the user's cached base avatar URL, or null if not yet generated.
 */
router.get('/outfits/base-avatar', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;

    if (hasBaseAvatar(userId)) {
      res.json({ baseAvatarUrl: getBaseAvatarUrl(userId) });
    } else {
      res.json({ baseAvatarUrl: null });
    }
  } catch (err) {
    console.error('Error checking base avatar:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/outfits/base-avatar
 * Generate (or regenerate) the user's base avatar from their selfie.
 * Returns the URL to the generated image.
 */
router.post('/outfits/base-avatar', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const force = req.body?.force === true;

    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.avatarConfig?.selfieUrl) {
      res.status(400).json({ error: 'Please upload a selfie first.' });
      return;
    }

    const baseAvatarUrl = await generateBaseAvatar(userId, user.avatarConfig, force);
    res.status(201).json({ baseAvatarUrl });
  } catch (err) {
    console.error('Error generating base avatar:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/outfits/generate
 * Accept { occasionContext }, fetch user wardrobe + avatar config,
 * call Outfit Generator, return outfit image + metadata.
 */
router.post('/outfits/generate', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const { occasionContext } = req.body;

    if (!occasionContext || !VALID_OCCASIONS.includes(occasionContext)) {
      res.status(400).json({
        error: `occasionContext must be one of: ${VALID_OCCASIONS.join(', ')}`,
      });
      return;
    }

    // Fetch user data
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.avatarConfig) {
      res.status(400).json({ error: 'Avatar configuration is required. Please set up your avatar first.' });
      return;
    }

    const wardrobeItems = await listWardrobeItemsByUser(userId);
    if (wardrobeItems.length === 0) {
      res.status(400).json({ error: 'No wardrobe items found. Please add items to your wardrobe first.' });
      return;
    }

    const outfit = await generateOutfit({
      userId,
      occasionContext: occasionContext as OccasionContext,
      wardrobeItems,
      avatarConfig: user.avatarConfig,
      styleProfile: user.styleProfile ?? undefined,
    });

    res.status(201).json({ outfit });
  } catch (err) {
    console.error('Error generating outfit:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/outfits/save
 * Accept { generatedOutfitId, name?, note? }, validate note ≤280 chars,
 * store SavedOutfit, return saved record.
 */
router.post('/outfits/save', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const { generatedOutfitId, name, note } = req.body;

    if (!generatedOutfitId || typeof generatedOutfitId !== 'string') {
      res.status(400).json({ error: 'generatedOutfitId is required' });
      return;
    }

    if (note !== undefined && typeof note !== 'string') {
      res.status(400).json({ error: 'note must be a string' });
      return;
    }

    if (note && note.length > MAX_NOTE_LENGTH) {
      res.status(400).json({
        error: `Note must not exceed ${MAX_NOTE_LENGTH} characters (received ${note.length})`,
      });
      return;
    }

    // Verify the generated outfit exists
    const generatedOutfit = await getGeneratedOutfitById(generatedOutfitId);
    if (!generatedOutfit) {
      res.status(404).json({ error: 'Generated outfit not found' });
      return;
    }

    const savedOutfit = await createSavedOutfit({
      userId,
      generatedOutfitId,
      name: name ?? undefined,
      note: note ?? undefined,
      occasionContext: generatedOutfit.occasionContext,
    });

    res.status(201).json({ savedOutfit });
  } catch (err) {
    console.error('Error saving outfit:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/outfits/saved
 * List saved outfits and outfit photos merged chronologically, grouped by month.
 */
router.get('/outfits/saved', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const occasionContext = req.query.occasionContext as string | undefined;

    if (occasionContext && !VALID_OCCASIONS.includes(occasionContext as OccasionContext)) {
      res.status(400).json({
        error: `occasionContext filter must be one of: ${VALID_OCCASIONS.join(', ')}`,
      });
      return;
    }

    const filter = occasionContext as OccasionContext | undefined;

    // Fetch both saved outfits and outfit photos
    const [savedOutfits, outfitPhotos] = await Promise.all([
      listSavedOutfitsByUser(userId, filter),
      listOutfitPhotosByUser(userId, filter),
    ]);

    // Convert saved outfits to JourneyEntry format
    const generatedEntries: JourneyEntry[] = [];
    for (const outfit of savedOutfits) {
      const generatedOutfit = outfit.generatedOutfitId
        ? await getGeneratedOutfitById(outfit.generatedOutfitId)
        : null;

      generatedEntries.push({
        id: outfit.id,
        type: 'generated',
        occasionContext: outfit.occasionContext ?? 'casual',
        note: outfit.note,
        date: outfit.savedAt.toISOString(),
        imageUrl: generatedOutfit?.imageUrl,
        avatarImageUrl: generatedOutfit?.avatarImageUrl,
      });
    }

    // Convert outfit photos to JourneyEntry format — resolve wardrobe item details
    const userWardrobeItems = await listWardrobeItemsByUser(userId);
    const wardrobeItemMap = new Map(userWardrobeItems.map((item) => [item.id, item]));

    const photoEntries: JourneyEntry[] = outfitPhotos.map((photo) => ({
      id: photo.id,
      type: 'photo' as const,
      occasionContext: photo.occasionContext,
      note: photo.note,
      date: photo.createdAt.toISOString(),
      photoUrl: photo.photoUrl,
      wardrobeItems: photo.wardrobeItemIds
        .map((id) => {
          const item = wardrobeItemMap.get(id);
          return item
            ? { id: item.id, type: item.type, color: item.color, material: item.material }
            : null;
        })
        .filter((item): item is { id: string; type: string; color: string; material: string } => item !== null),
    }));

    // Merge and sort chronologically (most recent first)
    const allEntries = [...generatedEntries, ...photoEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Group by month
    const groupMap = new Map<string, { month: number; year: number; label: string; entries: JourneyEntry[] }>();

    for (const entry of allEntries) {
      const date = new Date(entry.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;

      if (!groupMap.has(key)) {
        const label = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        groupMap.set(key, { month, year, label, entries: [] });
      }

      groupMap.get(key)!.entries.push(entry);
    }

    // Sort groups by most recent first
    const groups = Array.from(groupMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    res.json({ groups });
  } catch (err) {
    console.error('Error listing saved outfits:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/outfits/saved/:id
 * Get full saved outfit detail.
 */
router.get('/outfits/saved/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const savedOutfit = await getSavedOutfitById(id);
    if (!savedOutfit) {
      res.status(404).json({ error: 'Saved outfit not found' });
      return;
    }

    // Optionally enrich with generated outfit details
    let generatedOutfit = null;
    if (savedOutfit.generatedOutfitId) {
      generatedOutfit = await getGeneratedOutfitById(savedOutfit.generatedOutfitId);
    }

    res.json({ savedOutfit, generatedOutfit });
  } catch (err) {
    console.error('Error fetching saved outfit:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/outfits/saved/:id
 * Delete a saved outfit record.
 */
router.delete('/outfits/saved/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await deleteSavedOutfit(id);
    if (!deleted) {
      res.status(404).json({ error: 'Saved outfit not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting saved outfit:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
