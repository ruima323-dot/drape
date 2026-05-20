import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { OccasionContext } from '@drape/shared';
import { pool } from '../db/connection.js';
import {
  listWardrobeItemsByUser,
  listOutfitPhotosByUser,
  listSavedOutfitsByUser,
  getUserById,
} from '../db/repositories/index.js';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StyleInsightsData {
  summary: string;
  topColors: { color: string; count: number }[];
  topTypes: { type: string; count: number }[];
  insight: string;
  suggestion: string;
  occasionBreakdown: { work: number; casual: number; night_out: number };
}

interface StyleInsightsResponse {
  hasEnoughData: boolean;
  data?: StyleInsightsData;
}

// ─── OpenAI Client ───────────────────────────────────────────────────────────

let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countBy<T>(items: T[], keyFn: (item: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function topN(map: Map<string, number>, n: number): { key: string; count: number }[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

// ─── Route ───────────────────────────────────────────────────────────────────

const router = Router();

/**
 * GET /api/insights/style
 * Returns style insights for the authenticated user.
 * Caches results in the users table and only regenerates when new photos are added.
 */
router.get('/insights/style', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const forceRefresh = req.query.refresh === 'true';

    // Fetch outfit photos
    const outfitPhotos = await listOutfitPhotosByUser(userId);

    // Not enough data
    if (outfitPhotos.length < 3) {
      const response: StyleInsightsResponse = { hasEnoughData: false };
      res.json(response);
      return;
    }

    // Check cache — only regenerate on manual refresh
    if (!forceRefresh) {
      const userResult = await pool.query(
        `SELECT style_insights, insights_updated_at FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length > 0) {
        const { style_insights } = userResult.rows[0];

        if (style_insights) {
          const response: StyleInsightsResponse = {
            hasEnoughData: true,
            data: style_insights as StyleInsightsData,
          };
          res.json(response);
          return;
        }
      }
    }

    // Fetch wardrobe items for analysis
    const wardrobeItems = await listWardrobeItemsByUser(userId);

    // Build statistics
    const colorCounts = countBy(wardrobeItems, (item) => item.color.toLowerCase());
    const typeCounts = countBy(wardrobeItems, (item) => item.type.toLowerCase());
    const occasionCounts: Record<string, number> = { work: 0, casual: 0, night_out: 0 };

    for (const photo of outfitPhotos) {
      const occasion = photo.occasionContext;
      if (occasion in occasionCounts) {
        occasionCounts[occasion]++;
      }
    }

    const topColors = topN(colorCounts, 3);
    const topTypes = topN(typeCounts, 3);

    // Build prompt for GPT-4o
    const savedOutfits = await listSavedOutfitsByUser(userId);
    const user = await getUserById(userId);
    const firstName = user?.name?.split(' ')[0] ?? 'there';
    const prompt = buildAnalysisPrompt(firstName, wardrobeItems, outfitPhotos, savedOutfits.length, topColors, topTypes, occasionCounts);

    // Call GPT-4o (text model)
    const openai = getClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a warm, perceptive friend who genuinely cares about the person's style journey. You speak directly to them by first name, like you're having a one-on-one conversation. Your tone is personal, encouraging without being over-the-top, and insightful — like a close friend who pays attention to what they wear and reflects it back with care. Use "you" and their first name naturally. Respond ONLY with valid JSON matching the requested schema.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from GPT-4o');
    }

    const analysisResult = JSON.parse(content) as StyleInsightsData;

    // Ensure topColors and topTypes have counts from our data
    const insightsData: StyleInsightsData = {
      summary: analysisResult.summary,
      topColors: topColors.map((c) => ({ color: c.key, count: c.count })),
      topTypes: topTypes.map((t) => ({ type: t.key, count: t.count })),
      insight: analysisResult.insight,
      suggestion: analysisResult.suggestion ?? '',
      occasionBreakdown: {
        work: occasionCounts.work,
        casual: occasionCounts.casual,
        night_out: occasionCounts.night_out,
      },
    };

    // Cache the result
    await pool.query(
      `UPDATE users SET style_insights = $2, insights_updated_at = NOW() WHERE id = $1`,
      [userId, JSON.stringify(insightsData)]
    );

    const response: StyleInsightsResponse = {
      hasEnoughData: true,
      data: insightsData,
    };
    res.json(response);
  } catch (err) {
    console.error('Error generating style insights:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function buildAnalysisPrompt(
  firstName: string,
  wardrobeItems: { type: string; color: string; material: string }[],
  outfitPhotos: { occasionContext: OccasionContext }[],
  styledOutfitCount: number,
  topColors: { key: string; count: number }[],
  topTypes: { key: string; count: number }[],
  occasionCounts: Record<string, number>
): string {
  const itemList = wardrobeItems
    .map((item) => `- ${item.type} | ${item.color} | ${item.material || 'unknown material'}`)
    .join('\n');

  return `You're speaking directly to ${firstName} about their style. Be warm, personal, and specific. Use their name naturally. Focus on what they actually wore (photo entries), not the AI-styled outfits.

The person's first name is: ${firstName}

Important distinction:
- "Worn" outfits (${outfitPhotos.length}) = photos of what ${firstName} actually wore in real life
- "Styled" outfits (${styledOutfitCount}) = AI-generated looks they explored for inspiration

WARDROBE ITEMS (${wardrobeItems.length} total):
${itemList}

OUTFIT STATISTICS:
- Outfits actually worn (photos): ${outfitPhotos.length}
- Outfits styled (AI-generated): ${styledOutfitCount}
- Worn outfits by occasion: Work: ${occasionCounts.work}, Casual: ${occasionCounts.casual}, Night Out: ${occasionCounts.night_out}
- Most worn colors: ${topColors.map((c) => `${c.key} (${c.count})`).join(', ')}
- Most worn types: ${topTypes.map((t) => `${t.key} (${t.count})`).join(', ')}

Respond with JSON in this exact format:
{
  "summary": "A 2-3 sentence personal style reflection addressed directly to ${firstName}. Warm and specific, like a friend who's been paying attention. Use 'you' and their name.",
  "insight": "A 1-2 sentence deeper personal observation about what their choices say about them. Warm but honest. Address them directly.",
  "suggestion": "A 1 sentence gentle suggestion of something outside their current pattern they might enjoy trying. Frame it as curiosity, not advice — like 'Have you ever considered...' or 'I could see you in...'. Something specific and unexpected but not random."
}

Do NOT include topColors, topTypes, or occasionBreakdown in your response — those are computed from data directly.`;
}

export default router;
