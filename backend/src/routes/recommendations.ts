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

interface DailyRecommendation {
  item: string;
  brand: string;
  reason: string;
  pairingTip: string;
  generatedAt: string;
}

// ─── Route ───────────────────────────────────────────────────────────────────

/**
 * GET /api/recommendations/daily
 * Returns today's clothing recommendation for the user.
 * Cached in the users table — only regenerates once per day.
 */
router.get('/recommendations/daily', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;

    // Check cache — see if we already have today's recommendation
    const cacheResult = await pool.query(
      `SELECT daily_recommendation, daily_recommendation_date FROM users WHERE id = $1`,
      [userId]
    );

    if (cacheResult.rows.length > 0) {
      const { daily_recommendation, daily_recommendation_date } = cacheResult.rows[0];
      const today = new Date().toISOString().split('T')[0];

      if (daily_recommendation && daily_recommendation_date === today) {
        res.json({ recommendation: daily_recommendation });
        return;
      }
    }

    // Generate a new recommendation
    const [user, wardrobeItems] = await Promise.all([
      getUserById(userId),
      listWardrobeItemsByUser(userId),
    ]);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (wardrobeItems.length < 3) {
      res.json({ recommendation: null, reason: 'Add more items to your wardrobe for personalized recommendations.' });
      return;
    }

    // Build wardrobe summary
    const wardrobeSummary = wardrobeItems
      .map((item) => `${item.color} ${item.material} ${item.type}`)
      .join(', ');

    // Get style profile
    const styleProfile = user.styleProfile?.preferences ?? {};
    const aesthetic = styleProfile.aesthetic ?? 'not specified';
    const colorPref = styleProfile.colorPreference ?? 'not specified';
    const brands = styleProfile.favoriteBrands ?? [];
    const brandsStr = Array.isArray(brands) && brands.filter(Boolean).length > 0
      ? brands.filter(Boolean).join(', ')
      : 'not specified';

    const prompt = `You are a personal stylist. Based on this person's wardrobe and preferences, suggest ONE specific clothing item they should consider adding to their wardrobe.

CURRENT WARDROBE:
${wardrobeSummary}

STYLE PREFERENCES:
- Aesthetic: ${aesthetic}
- Color preference: ${colorPref}
- Favorite brands: ${brandsStr}

RULES:
- Suggest something they do NOT already own (check the wardrobe list carefully)
- The item should fill a gap or complement their existing pieces
- Suggest from their favorite brands, or a brand with a similar aesthetic
- Be specific: include color, material, and style details
- Keep it practical and within their style

Respond with JSON in this exact format:
{
  "item": "A specific item description (e.g., 'Camel wool midi coat')",
  "brand": "Brand name (from their favorites or similar)",
  "reason": "1-2 sentences explaining why this fills a gap in their wardrobe",
  "pairingTip": "1 sentence suggesting how to style it with items they already own"
}`;

    const completion = await getClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: 'Failed to generate recommendation' });
      return;
    }

    const recommendation: DailyRecommendation = {
      ...JSON.parse(content),
      generatedAt: new Date().toISOString(),
    };

    // Cache in database
    const today = new Date().toISOString().split('T')[0];
    await pool.query(
      `UPDATE users SET daily_recommendation = $2, daily_recommendation_date = $3, updated_at = NOW() WHERE id = $1`,
      [userId, JSON.stringify(recommendation), today]
    );

    res.json({ recommendation });
  } catch (err) {
    console.error('Error generating daily recommendation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
