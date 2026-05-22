import { readFileSync } from 'fs';
import OpenAI from 'openai';
import type { VisionAnalysisResult, IdentifiedItem } from '@drape/shared';
import { KNOWN_TYPES, KNOWN_COLORS, KNOWN_MATERIALS } from './wardrobeParser.js';

// ─── Client ──────────────────────────────────────────────────────────────────

let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

/**
 * Replace the default OpenAI client. Useful for injecting a mock in tests.
 */
export function setClient(c: unknown): void {
  client = c as OpenAI;
}

/**
 * Reset the client so the next call to `getClient` creates a fresh one.
 */
export function resetClient(): void {
  client = undefined;
}

// ─── Normalization ───────────────────────────────────────────────────────────

/**
 * Normalize a raw item from GPT-4o output against the known vocabulary.
 * - type: matched against KNOWN_TYPES (case-insensitive), falls back to original value
 * - color: matched against KNOWN_COLORS (case-insensitive), falls back to "unknown"
 * - material: matched against KNOWN_MATERIALS (case-insensitive), falls back to "unknown"
 */
export function normalizeItem(raw: { type: string; color: string; material: string; details?: string }): IdentifiedItem {
  const normalizedType = findMatch(raw.type, KNOWN_TYPES) ?? raw.type.toLowerCase();
  const normalizedColor = findMatch(raw.color, KNOWN_COLORS) ?? 'unknown';
  const normalizedMaterial = findMatch(raw.material, KNOWN_MATERIALS) ?? 'unknown';

  return {
    type: normalizedType,
    color: normalizedColor,
    material: normalizedMaterial,
    details: raw.details,
  };
}

/**
 * Find a case-insensitive match in the vocabulary array.
 */
function findMatch(value: string, vocabulary: readonly string[]): string | null {
  const lower = value.toLowerCase().trim();
  for (const known of vocabulary) {
    if (known.toLowerCase() === lower) {
      return known;
    }
  }
  return null;
}

// ─── Vision Analysis ─────────────────────────────────────────────────────────

/**
 * Analyze a photo to identify clothing items using GPT-4o vision.
 * Reads the image file, sends it to GPT-4o with a structured prompt,
 * parses the JSON response, and normalizes each item against the vocabulary.
 */
export async function analyzePhoto(imagePath: string): Promise<VisionAnalysisResult> {
  try {
    // Read image and convert to base64
    const imageBuffer = readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Determine MIME type from extension
    const ext = imagePath.split('.').pop()?.toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'webp') mimeType = 'image/webp';

    const prompt = `Identify all clothing items and shoes visible in this photo. Return a JSON array where each item has:
- type (e.g., shirt, pants, dress, sneakers, boots)
- color (e.g., navy, black, white, cream)
- material (e.g., cotton, denim, silk, leather, suede, wool, linen, polyester)
- details: a short description of distinguishing features. Include:
  * Neckline (crew neck, v-neck, collared, turtleneck, scoop neck, off-shoulder, etc.)
  * Sleeve length (sleeveless, short sleeve, 3/4 sleeve, long sleeve)
  * Fit (slim, regular, oversized, cropped, relaxed)
  * Pattern (solid, striped, plaid, floral, graphic, etc.)
  * Any other notable features (buttons, zipper, hood, pockets, pleats, etc.)
- bbox: approximate bounding box as [top, left, bottom, right] in percentages (0-100) of the image dimensions

Be VERY precise about what you see. If the shirt has no collar, say "crew neck" or "round neck" — do NOT say "collared". If pants are wide-leg, say so. Describe exactly what is in the photo.

Focus on the main/central person if multiple people are visible. Include shoes/footwear. Do not include accessories like jewelry, watches, or bags.

Known types: ${KNOWN_TYPES.join(', ')}
Known colors: ${KNOWN_COLORS.join(', ')}
Known materials: ${KNOWN_MATERIALS.join(', ')}

Return ONLY a valid JSON array, no other text. Example format:
[{"type": "sweater", "color": "cream", "material": "wool", "details": "crew neck, long sleeve, relaxed fit, solid, ribbed knit texture", "bbox": [10, 20, 55, 80]}, {"type": "sneakers", "color": "white", "material": "leather", "details": "low-top, lace-up, clean minimal design", "bbox": [75, 25, 95, 75]}]`;

    const response = await getClient().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      return { success: false, items: [], error: 'No response from vision model' };
    }

    // Parse JSON from response (handle potential markdown code blocks)
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const rawItems = JSON.parse(jsonStr) as Array<{ type: string; color: string; material: string; details?: string; bbox?: [number, number, number, number] }>;

    if (!Array.isArray(rawItems)) {
      return { success: false, items: [], error: 'Vision model returned invalid format' };
    }

    // Crop thumbnails from the original photo using bounding boxes
    const sharp = (await import('sharp')).default;
    const imageMetadata = await sharp(imageBuffer).metadata();
    const imgWidth = imageMetadata.width ?? 1;
    const imgHeight = imageMetadata.height ?? 1;

    const items: IdentifiedItem[] = [];

    for (const raw of rawItems) {
      const normalized = normalizeItem({
        type: raw.type ?? '',
        color: raw.color ?? '',
        material: raw.material ?? '',
        details: raw.details ?? undefined,
      });

      let thumbnailUrl: string | undefined;

      if (raw.bbox && Array.isArray(raw.bbox) && raw.bbox.length === 4) {
        try {
          const [top, left, bottom, right] = raw.bbox;
          const cropLeft = Math.max(0, Math.round((left / 100) * imgWidth));
          const cropTop = Math.max(0, Math.round((top / 100) * imgHeight));
          const cropWidth = Math.min(imgWidth - cropLeft, Math.round(((right - left) / 100) * imgWidth));
          const cropHeight = Math.min(imgHeight - cropTop, Math.round(((bottom - top) / 100) * imgHeight));

          if (cropWidth > 10 && cropHeight > 10) {
            const { v4: uuidv4 } = await import('uuid');
            const { writeFile, mkdir } = await import('fs/promises');
            const { join } = await import('path');

            const thumbnailsDir = join(process.cwd(), 'generated-images', 'thumbnails');
            await mkdir(thumbnailsDir, { recursive: true });

            const filename = `${uuidv4()}.png`;
            const croppedBuffer = await sharp(imageBuffer)
              .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
              .resize(256, 256, { fit: 'cover' })
              .png()
              .toBuffer();

            await writeFile(join(thumbnailsDir, filename), croppedBuffer);
            thumbnailUrl = `/api/images/thumbnails/${filename}`;
          }
        } catch (cropErr) {
          console.error('Failed to crop thumbnail:', cropErr);
          // Continue without thumbnail
        }
      }

      items.push({
        ...normalized,
        bbox: raw.bbox,
        thumbnailUrl,
      });
    }

    return { success: true, items };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error during photo analysis';
    console.error('Vision analysis error:', error);
    return { success: false, items: [], error: message };
  }
}
