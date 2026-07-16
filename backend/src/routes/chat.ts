import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { listWardrobeItemsByUser, getUserById } from '../db/repositories/index.js';

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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Route ───────────────────────────────────────────────────────────────────

/**
 * POST /api/chat
 * Send a message to the style assistant. Accepts { message, history }.
 * Returns { reply }.
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    // Fetch user's wardrobe and profile for context
    const [wardrobeItems, user] = await Promise.all([
      listWardrobeItemsByUser(userId),
      getUserById(userId),
    ]);

    const firstName = user?.name?.split(' ')[0] ?? 'there';

    // Determine current season based on month and user's location
    const location = user?.avatarConfig?.location ?? '';
    const month = new Date().getMonth();
    const southernHemisphere = /australia|new zealand|argentina|brazil|chile|south africa|sydney|melbourne|buenos aires|são paulo|cape town/i.test(location);
    let season: string;
    if (month >= 2 && month <= 4) season = southernHemisphere ? 'autumn' : 'spring';
    else if (month >= 5 && month <= 7) season = southernHemisphere ? 'winter' : 'summer';
    else if (month >= 8 && month <= 10) season = southernHemisphere ? 'spring' : 'autumn';
    else season = southernHemisphere ? 'summer' : 'winter';

    const locationStr = location || 'unknown';

    // Build wardrobe summary
    const wardrobeSummary = wardrobeItems.length > 0
      ? wardrobeItems
          .map((item) => `- ${item.color} ${item.material} ${item.type} (${item.occasions?.join(', ') || 'untagged'})`)
          .join('\n')
      : 'No items in wardrobe yet.';

    const systemPrompt = `You are a friendly, knowledgeable personal stylist named Drape. You help ${firstName} put together outfits from their existing wardrobe.

Here is ${firstName}'s current wardrobe:
${wardrobeSummary}

Context:
- Current season: ${season}
- Location: ${locationStr}
- Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}

Rules:
- Suggest outfits using ONLY items from their wardrobe listed above
- If they ask for something they don't have items for, suggest what they could add
- Be warm, concise, and specific — name exact items by color and type
- ALWAYS consider the current season (${season}) — do not suggest heavy layers in summer or light items in winter
- Consider occasion and color coordination
- Keep responses short (2-4 sentences for simple questions, more for detailed outfit breakdowns)
- If they ask about something unrelated to fashion/style, gently redirect`;

    // Build conversation messages
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (last 10 messages max)
    if (Array.isArray(history)) {
      const recentHistory = (history as ChatMessage[]).slice(-10);
      for (const msg of recentHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    const completion = await getClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = completion.choices[0]?.message?.content ?? "Sorry, I couldn't think of a response. Try asking again!";

    res.json({ reply });
  } catch (err) {
    console.error('Error in chat:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
