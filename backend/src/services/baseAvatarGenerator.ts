import { existsSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import OpenAI, { toFile } from 'openai';
import sharp from 'sharp';
import type { AvatarConfig } from '@drape/shared';
import { IMAGES_DIR, SELFIES_DIR } from '../config.js';

// ─── Configuration ───────────────────────────────────────────────────────────

// ─── Client ──────────────────────────────────────────────────────────────────

let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

// ─── Prompt Builder ──────────────────────────────────────────────────────────

function buildBaseAvatarPrompt(avatarConfig: AvatarConfig): string {
  const height = avatarConfig.height || '170cm';
  const weight = avatarConfig.weight || '65kg';

  return `Transform this selfie into a full-body fashion photo of the SAME person. 
The person must look EXACTLY like they do in the reference photo — same face, same skin tone, same hair color and style, same facial features.

Physical build: This person is ${height} tall and weighs ${weight}. Generate their full body with proportions that accurately reflect this height and weight. The head-to-body ratio should be realistic for a full-body fashion photo — approximately 1:7.5 head-to-body proportion. Do NOT enlarge the head. The head should appear naturally small relative to the full body, as it does in real full-length photos taken from a slight distance.

Beauty enhancement: Apply flattering beauty enhancements — smooth and clear skin, even and luminous skin tone, soft glowing complexion, bright and defined eyes, subtle contouring on cheekbones and jawline, slightly fuller lips, and refined facial symmetry. Apply natural-toned makeup: light foundation, soft blush, neutral eyeshadow, defined brows, subtle eyeliner, and a nude/MLBB lip color. Think "professional portrait retouching" or "beauty editorial" — the person should look like a polished, idealized version of themselves while still being clearly recognizable.

Dress them in:
- A plain white crew-neck t-shirt (fitted naturally to their body)
- Plain white shorts (above the knee)
- Clean white sneakers

The photo should be:
- Full body shot, head to toe visible
- Standing in a relaxed, natural pose
- Camera positioned at waist height (not eye level) to capture natural full-body proportions
- Clean white/light grey studio background
- Soft, even studio lighting with gentle fill light
- Fashion photography style
- High quality, photorealistic

CRITICAL: The person's identity must be preserved — same face shape, same eyes, same nose, same mouth. Enhance beauty but never alter identity. The body proportions must match someone who is ${height} and ${weight}. Head must be proportionally small as in real full-body photography.`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the file path for a user's cached base avatar.
 */
function getBaseAvatarPath(userId: string): string {
  return join(IMAGES_DIR, `base-avatar-${userId}.png`);
}

/**
 * Get the URL path for a user's base avatar image.
 */
export function getBaseAvatarUrl(userId: string): string {
  return `/api/images/base-avatar-${userId}.png`;
}

/**
 * Check if a cached base avatar exists for the user.
 */
export function hasBaseAvatar(userId: string): boolean {
  return existsSync(getBaseAvatarPath(userId));
}

/**
 * Generate a base avatar from the user's selfie.
 * The result is cached as a PNG file. Subsequent calls return the cached version
 * unless `force` is true.
 *
 * @param userId - The user's ID
 * @param avatarConfig - The user's avatar configuration (must include selfieUrl)
 * @param force - If true, regenerate even if a cached version exists
 * @returns The URL path to the generated base avatar image
 */
export async function generateBaseAvatar(
  userId: string,
  avatarConfig: AvatarConfig,
  force = false,
): Promise<string> {
  const outputPath = getBaseAvatarPath(userId);
  const imageUrl = getBaseAvatarUrl(userId);

  // Return cached version if it exists and we're not forcing regeneration
  if (!force && existsSync(outputPath)) {
    return imageUrl;
  }

  // Resolve selfie path on disk
  const selfiePath = join(SELFIES_DIR, `${userId}.jpg`);
  if (!existsSync(selfiePath)) {
    throw new Error('Selfie not found. Please upload a selfie first.');
  }

  // Resize selfie for the API (1024x1024 PNG, under 4MB)
  const resizedBuffer = await sharp(selfiePath)
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toBuffer();

  const imageFile = await toFile(resizedBuffer, 'selfie.png', { type: 'image/png' });

  // Build prompt and call gpt-image-2 edit endpoint
  const prompt = buildBaseAvatarPrompt(avatarConfig);

  const response = await getClient().images.edit({
    model: 'gpt-image-2',
    image: imageFile,
    prompt,
    n: 1,
    size: '1024x1024',
  });

  const imageData = response.data?.[0];
  let buffer: Buffer;

  if (imageData?.b64_json) {
    buffer = Buffer.from(imageData.b64_json, 'base64');
  } else if (imageData?.url) {
    const imgResponse = await fetch(imageData.url);
    const arrayBuffer = await imgResponse.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    throw new Error('No image data returned from OpenAI');
  }

  // Save to disk
  mkdirSync(IMAGES_DIR, { recursive: true });
  writeFileSync(outputPath, buffer);

  return imageUrl;
}

/**
 * Delete the cached base avatar for a user (e.g., when they update their selfie or measurements).
 */
export function invalidateBaseAvatar(userId: string): void {
  const outputPath = getBaseAvatarPath(userId);
  if (existsSync(outputPath)) {
    unlinkSync(outputPath);
  }
}
