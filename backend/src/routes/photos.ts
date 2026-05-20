import { Router, Request, Response } from 'express';
import multer from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { OccasionContext, IdentifiedItem } from '@drape/shared';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { validateUploadedFile } from '../services/fileValidator.js';
import { analyzePhoto } from '../services/visionAnalyzer.js';
import { checkItems } from '../services/deduplicationService.js';
import {
  createWardrobeItem,
  createOutfitPhoto,
  getOutfitPhotoById,
  deleteOutfitPhoto,
} from '../db/repositories/index.js';
import { queueThumbnailGeneration, queueThumbnailBeautification } from '../services/thumbnailQueue.js';

// ─── Configuration ───────────────────────────────────────────────────────────

const VALID_OCCASIONS: OccasionContext[] = ['work', 'casual', 'night_out'];
const MAX_NOTE_LENGTH = 280;
const UPLOAD_DIR = join(process.cwd(), 'uploaded-photos');

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = file.originalname.split('.').pop() ?? 'jpg';
    cb(null, `${uniqueSuffix}.${ext}`);
  },
});

const upload = multer({ storage });

// ─── Router ──────────────────────────────────────────────────────────────────

const router = Router();

/**
 * POST /api/photos/upload
 * Upload a photo, validate it, run vision analysis, return identified items.
 */
router.post('/photos/upload', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No photo file provided. Use field name "photo".' });
      return;
    }

    // Validate file format and size
    const validation = validateUploadedFile({ mimetype: file.mimetype, size: file.size });
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    // Run vision analysis
    const result = await analyzePhoto(file.path);

    if (!result.success) {
      res.status(500).json({ error: result.error ?? 'Vision analysis failed' });
      return;
    }

    const photoUrl = `/api/uploads/${file.filename}`;

    res.status(200).json({ photoUrl, items: result.items });
  } catch (err) {
    console.error('Error uploading photo:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/photos/save
 * Save an outfit photo with items, occasion context, and optional note.
 */
router.post('/photos/save', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const { photoUrl, items, occasionContext, note, takenAt } = req.body;

    // Validate required fields
    if (!photoUrl || typeof photoUrl !== 'string') {
      res.status(400).json({ error: 'photoUrl is required' });
      return;
    }

    if (!occasionContext || !VALID_OCCASIONS.includes(occasionContext)) {
      res.status(400).json({
        error: `occasionContext must be one of: ${VALID_OCCASIONS.join(', ')}`,
      });
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

    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'items must be an array of IdentifiedItem objects' });
      return;
    }

    // Deduplicate items against existing wardrobe
    const deduplicationResult = await checkItems(userId, items as IdentifiedItem[]);

    // Insert new wardrobe items
    const newWardrobeItemIds: string[] = [];
    const itemsToBeautify: { itemId: string; cropUrl: string; type: string; color: string; material: string }[] = [];

    for (const item of deduplicationResult.newItems) {
      const wardrobeItem = await createWardrobeItem({
        userId,
        type: item.type,
        color: item.color,
        material: item.material,
        fit: 'regular',
        occasions: [occasionContext as OccasionContext],
        imageUrl: item.thumbnailUrl ?? undefined,
      });
      newWardrobeItemIds.push(wardrobeItem.id);

      if (item.thumbnailUrl) {
        // Has a raw crop — queue beautification to replace it with a clean version
        itemsToBeautify.push({
          itemId: wardrobeItem.id,
          cropUrl: item.thumbnailUrl,
          type: item.type,
          color: item.color,
          material: item.material,
        });
      } else {
        // No crop available — generate AI thumbnail from description
        queueThumbnailGeneration(wardrobeItem.id, {
          type: item.type,
          color: item.color,
          material: item.material,
        });
      }
    }

    // Queue beautification for all cropped items in parallel
    if (itemsToBeautify.length > 0) {
      queueThumbnailBeautification(itemsToBeautify);
    }

    // Collect all wardrobe item IDs (new + existing matches)
    const existingIds = deduplicationResult.existingItems.map((m) => m.wardrobeItemId);
    const allWardrobeItemIds = [...newWardrobeItemIds, ...existingIds];

    // Create outfit photo record
    const outfitPhoto = await createOutfitPhoto({
      userId,
      photoUrl,
      wardrobeItemIds: allWardrobeItemIds,
      occasionContext: occasionContext as OccasionContext,
      note: note ?? undefined,
      takenAt: takenAt ? new Date(takenAt) : undefined,
    });

    res.status(201).json({
      outfitPhoto,
      newItemCount: deduplicationResult.newItems.length,
    });
  } catch (err) {
    console.error('Error saving photo:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/photos/:id
 * Get outfit photo detail.
 */
router.get('/photos/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const outfitPhoto = await getOutfitPhotoById(id);

    if (!outfitPhoto) {
      res.status(404).json({ error: 'Outfit photo not found' });
      return;
    }

    res.json({ outfitPhoto });
  } catch (err) {
    console.error('Error fetching outfit photo:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/photos/:id
 * Delete an outfit photo record.
 */
router.delete('/photos/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await deleteOutfitPhoto(id);
    if (!deleted) {
      res.status(404).json({ error: 'Outfit photo not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting outfit photo:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
