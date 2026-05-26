import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { getUserById, listWardrobeItemsByUser } from '../db/repositories/index.js';
import { pool } from '../db/connection.js';

const router = Router();

// ─── OpenAI Client ───────────────────────────────────────────────────────────

let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface FundamentalItem {
  category: string;
  description: string;
  owned: boolean;
  ownedItem?: string;
  chapter: number;
  emoji: string;
}

interface FundamentalsData {
  collectionName: string;
  narrative: string;
  items: FundamentalItem[];
  completionPercent: number;
  generatedAt: string;
  wardrobeHash: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create a simple hash of the wardrobe to detect changes.
 */
function hashWardrobe(items: { type: string; color: string }[]): string {
  const sorted = items.map((i) => `${i.type}:${i.color}`).sort().join('|');
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

// ─── Route ───────────────────────────────────────────────────────────────────

/**
 * GET /api/fundamentals
 * Returns the user's personalized wardrobe fundamentals analysis.
 * Cached — only regenerates when wardrobe changes.
 */
router.get('/fundamentals', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;

    const [user, wardrobeItems] = await Promise.all([
      getUserById(userId),
      listWardrobeItemsByUser(userId),
    ]);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (wardrobeItems.length < 2) {
      res.json({ fundamentals: null, reason: 'Add more items to your wardrobe to see your collection story.' });
      return;
    }

    // Check cache — regenerate only if wardrobe changed
    const currentHash = hashWardrobe(wardrobeItems);

    const cacheResult = await pool.query(
      `SELECT wardrobe_fundamentals FROM users WHERE id = $1`,
      [userId]
    );

    if (cacheResult.rows.length > 0 && cacheResult.rows[0].wardrobe_fundamentals) {
      const cached = cacheResult.rows[0].wardrobe_fundamentals as FundamentalsData;
      if (cached.wardrobeHash === currentHash) {
        res.json({ fundamentals: cached });
        return;
      }
    }

    // Generate new analysis
    const wardrobeSummary = wardrobeItems
      .map((item) => `${item.color} ${item.material} ${item.type} (${item.occasions?.join(', ') || 'untagged'})`)
      .join('\n');

    const styleProfile = user.styleProfile?.preferences ?? {};
    const aesthetic = styleProfile.aesthetic ?? 'not specified';
    const colorPref = styleProfile.colorPreference ?? 'not specified';
    const brands = styleProfile.favoriteBrands ?? [];
    const brandsStr = Array.isArray(brands) && brands.filter(Boolean).length > 0
      ? brands.filter(Boolean).join(', ')
      : 'not specified';

    const prompt = `You are a personal stylist building a personalized capsule collection for someone. Analyze their wardrobe and identify 8-10 "fundamental" pieces that would make their wardrobe complete.

CURRENT WARDROBE:
${wardrobeSummary}

STYLE PREFERENCES:
- Aesthetic: ${aesthetic}
- Color preference: ${colorPref}
- Favorite brands: ${brandsStr}

TASK:
1. Give this collection a creative name that reflects their personal style (e.g., "The Quiet Luxe Edit", "Urban Minimalist Capsule", "The Effortless Palette")
2. Write a 1-sentence narrative about what this collection represents for them
3. Identify 8-10 fundamental pieces. For each:
   - If they ALREADY OWN it, mark it as owned and reference the specific item
   - If they DON'T own it, describe what they need
   - Assign a chapter number (order of importance)
   - Assign a fitting emoji

The fundamentals should be personalized to THEIR style — not generic. A minimalist needs different basics than someone who loves bold prints.

Respond with JSON:
{
  "collectionName": "Creative collection name",
  "narrative": "One sentence about what completing this collection means for them",
  "items": [
    {
      "category": "Short category name (e.g., 'The Perfect White Tee')",
      "description": "Why this piece matters and what to look for",
      "owned": true/false,
      "ownedItem": "If owned, which specific item from their wardrobe matches (e.g., 'white cotton t-shirt')",
      "chapter": 1,
      "emoji": "👕"
    }
  ]
}

Order items by chapter number. Put owned items first to show progress, then missing items as upcoming chapters.`;

    const completion = await getClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: 'Failed to generate fundamentals' });
      return;
    }

    const parsed = JSON.parse(content);
    const items = parsed.items as FundamentalItem[];
    const ownedCount = items.filter((i) => i.owned).length;

    const fundamentals: FundamentalsData = {
      collectionName: parsed.collectionName,
      narrative: parsed.narrative,
      items,
      completionPercent: Math.round((ownedCount / items.length) * 100),
      generatedAt: new Date().toISOString(),
      wardrobeHash: currentHash,
    };

    // Cache
    await pool.query(
      `UPDATE users SET wardrobe_fundamentals = $2, updated_at = NOW() WHERE id = $1`,
      [userId, JSON.stringify(fundamentals)]
    );

    res.json({ fundamentals });
  } catch (err) {
    console.error('Error generating fundamentals:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
