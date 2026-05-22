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

    // Build wardrobe summary
    const wardrobeSummary = wardrobeItems.length > 0
      ? wardrobeItems
          .map((item) => `- ${item.color} ${item.material} ${item.type} (${item.occasions?.join(', ') || 'untagged'})`)
          .join('\n')
      : 'No items in wardrobe yet.';

    const systemPrompt = `You are a friendly, knowledgeable personal stylist named Drape. You help ${firstName} put together outfits from their existing wardrobe.

Here is ${firstName}'s current wardrobe:
${wardrobeSummary}

Rules:
- Suggest outfits using ONLY items from their wardrobe listed above
- If they ask for something they don't have items for, suggest what they could add
- Be warm, concise, and specific — name exact items by color and type
- Consider occasion, weather, and color coordination
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
