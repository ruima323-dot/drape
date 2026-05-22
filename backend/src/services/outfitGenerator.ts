import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import OpenAI, { toFile } from 'openai';
import sharp from 'sharp';
import type {
  WardrobeItem,
  OccasionContext,
  AvatarConfig,
  StyleProfile,
  GeneratedOutfit,
} from '@drape/shared';
import { buildPrompt, buildReferencePrompt } from './promptBuilder.js';
import { generateImage } from './bedrockImageService.js';
import { createGeneratedOutfit } from '../db/repositories/generatedOutfitRepository.js';
import { IMAGES_DIR, SELFIES_DIR } from '../config.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OutfitGenerationParams {
  userId: string;
  occasionContext: OccasionContext;
  wardrobeItems: WardrobeItem[];
  avatarConfig: AvatarConfig;
  styleProfile?: StyleProfile;
}

// ─── OpenAI Client ───────────────────────────────────────────────────────────

let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

// ─── Local image storage ─────────────────────────────────────────────────────

function ensureImagesDir(): void {
  if (!existsSync(IMAGES_DIR)) {
    mkdirSync(IMAGES_DIR, { recursive: true });
  }
}

function saveImageLocally(outfitId: string, imageBuffer: Buffer): string {
  ensureImagesDir();
  const filename = `${outfitId}.png`;
  writeFileSync(join(IMAGES_DIR, filename), imageBuffer);
  // Return a URL that the backend will serve
  return `/api/images/${filename}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate an outfit end-to-end:
 *   1. If user has a selfie/base avatar, use gpt-image-2 edit endpoint to redress them
 *   2. Otherwise fall back to text-only generation
 *   3. Save the image locally
 *   4. Store a GeneratedOutfit record in the database
 *
 * @param params - The generation parameters including user context and wardrobe
 * @returns The persisted GeneratedOutfit with all metadata
 */
export async function generateOutfit(
  params: OutfitGenerationParams
): Promise<GeneratedOutfit> {
  const {
    userId,
    occasionContext,
    wardrobeItems,
    avatarConfig,
    styleProfile,
  } = params;

  let imageBuffer: Buffer;

  // Prefer using the base avatar as reference (it already looks like the user)
  const baseAvatarPath = join(IMAGES_DIR, `base-avatar-${userId}.png`);
  const selfiePath = join(SELFIES_DIR, `${userId}.jpg`);

  // Use the base avatar or selfie as reference for the edit endpoint
  const referencePath = existsSync(baseAvatarPath)
    ? baseAvatarPath
    : existsSync(selfiePath)
      ? selfiePath
      : null;

  if (referencePath) {
    // Use gpt-image-2 edit endpoint with the reference image
    const prompt = buildReferencePrompt(wardrobeItems, occasionContext, avatarConfig, styleProfile);
    console.log('[outfitGenerator] Using reference-based generation');
    console.log('[outfitGenerator] Reference:', referencePath);
    console.log('[outfitGenerator] Prompt:', prompt);

    // Resize reference to 1024x1024 PNG for the API
    const resizedBuffer = await sharp(referencePath)
      .resize(1024, 1024, { fit: 'cover' })
      .png()
      .toBuffer();

    const imageFile = await toFile(resizedBuffer, 'reference.png', { type: 'image/png' });

    const response = await getClient().images.edit({
      model: 'gpt-image-2',
      image: imageFile,
      prompt,
      n: 1,
      size: '1024x1024',
    });

    const imageData = response.data?.[0];

    if (imageData?.b64_json) {
      imageBuffer = Buffer.from(imageData.b64_json, 'base64');
    } else if (imageData?.url) {
      const imgResponse = await fetch(imageData.url);
      const arrayBuffer = await imgResponse.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error('No image data returned from OpenAI');
    }
  } else {
    // Fallback: text-only generation (no selfie available)
    const prompt = buildPrompt(wardrobeItems, occasionContext, avatarConfig, styleProfile);
    console.log('[outfitGenerator] Using text-only generation (no selfie)');
    console.log('[outfitGenerator] Prompt:', prompt);
    imageBuffer = await generateImage(prompt);
  }

  // Save locally
  const outfitId = uuidv4();
  const imageUrl = saveImageLocally(outfitId, imageBuffer);

  // Store the record in the database
  const wardrobeItemIds = wardrobeItems.map((item) => item.id);
  const generatedOutfit = await createGeneratedOutfit({
    userId,
    occasionContext,
    wardrobeItemIds,
    accessoryIds: [],
    accessoryLayerState: { activeAccessories: [] },
    imageUrl,
  });

  return generatedOutfit;
}
