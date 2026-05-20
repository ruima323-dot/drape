import { Router, Request, Response } from 'express';
import multer from 'multer';
import { join } from 'path';
import { mkdirSync } from 'fs';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  getUserById,
  updateAvatarConfig,
  updateStyleProfile,
} from '../db/repositories/index.js';

const router = Router();

// ─── Multer config for selfie uploads ────────────────────────────────────────

const SELFIES_DIR = join(process.cwd(), 'uploaded-photos', 'selfies');
mkdirSync(SELFIES_DIR, { recursive: true });

const selfieStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, SELFIES_DIR);
  },
  filename: (req, _file, cb) => {
    const userId = (req as AuthenticatedRequest).userId;
    cb(null, `${userId}.jpg`);
  },
});

const selfieUpload = multer({
  storage: selfieStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/users/me
 * Get the current user's profile (avatar config, style profile).
 */
router.get('/users/me', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      avatarConfig: user.avatarConfig,
      styleProfile: user.styleProfile,
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/avatar
 * Accept avatar config fields, update user's avatar config.
 */
router.put('/users/avatar', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const { bodyType, skinTone, gender, height, weight, ethnicity, location, selfieUrl } = req.body;

    // bodyType and skinTone are still required for fallback text-only generation
    if (!bodyType || typeof bodyType !== 'string') {
      res.status(400).json({ error: 'bodyType is required and must be a string' });
      return;
    }

    if (!skinTone || typeof skinTone !== 'string') {
      res.status(400).json({ error: 'skinTone is required and must be a string' });
      return;
    }

    const user = await updateAvatarConfig(userId, {
      bodyType,
      skinTone,
      gender: gender ?? 'female',
      height: height || undefined,
      weight: weight || undefined,
      ethnicity: ethnicity || undefined,
      location: location || undefined,
      selfieUrl: selfieUrl || undefined,
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ avatarConfig: user.avatarConfig });
  } catch (err) {
    console.error('Error updating avatar config:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/users/selfie
 * Upload a selfie photo. Analyzes with GPT-4o vision to extract a physical
 * description, then saves both the photo URL and description to avatar_config.
 */
router.post(
  '/users/selfie',
  selfieUpload.single('selfie'),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).userId;

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const selfieUrl = `/api/uploads/selfies/${userId}.jpg`;

      // Analyze the selfie with GPT-4o vision to get a physical description
      let physicalDescription = '';
      try {
        const { readFileSync } = await import('fs');
        const imageBuffer = readFileSync(req.file.path);
        const base64Image = imageBuffer.toString('base64');

        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const visionResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Describe this person\'s physical appearance in detail for use as an image generation prompt. Include: ethnicity/race, approximate age range, hair (color, length, style), face shape, build/body type, skin tone, and any distinctive features. Be specific and factual. Return ONLY the description, no preamble. Example format: "Young East Asian woman in her late 20s, shoulder-length straight black hair, slim build, light skin, oval face, soft features"',
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                },
              ],
            },
          ],
          max_tokens: 200,
        });

        physicalDescription = visionResponse.choices?.[0]?.message?.content?.trim() ?? '';
      } catch (visionErr) {
        console.error('Failed to analyze selfie with vision:', visionErr);
        // Continue without description — will use fallback avatar config
      }

      // Get current avatar config and merge selfieUrl + description
      const user = await getUserById(userId);
      const currentConfig = user?.avatarConfig ?? {
        bodyType: 'average',
        skinTone: 'medium',
        gender: 'female' as const,
      };

      const updatedUser = await updateAvatarConfig(userId, {
        ...currentConfig,
        selfieUrl,
        physicalDescription: physicalDescription || currentConfig.physicalDescription,
      });

      if (!updatedUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ selfieUrl, physicalDescription, avatarConfig: updatedUser.avatarConfig });
    } catch (err) {
      console.error('Error uploading selfie:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * POST /api/users/style-profile
 * Accept questionnaire responses, store as style profile.
 */
router.post('/users/style-profile', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      res.status(400).json({ error: 'preferences object is required' });
      return;
    }

    const user = await updateStyleProfile(userId, { preferences });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ styleProfile: user.styleProfile });
  } catch (err) {
    console.error('Error updating style profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
