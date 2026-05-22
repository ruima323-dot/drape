import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import OpenAI from 'openai';

// ─── Configuration ───────────────────────────────────────────────────────────

export const THUMBNAIL_ENABLED = process.env.ENABLE_THUMBNAILS !== 'false';

const THUMBNAILS_DIR = join(process.cwd(), 'generated-images', 'thumbnails');

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
export function setThumbnailClient(c: unknown): void {
  client = c as OpenAI;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate a thumbnail image for a wardrobe item.
 *
 * Builds a product-photography-style prompt and calls OpenAI gpt-image-1
 * at 256x256 for a fast, cheap thumbnail.
 *
 * @returns The URL path to the generated thumbnail, or null if disabled.
 */
export async function generateItemThumbnail(
  item: { type: string; color: string; material: string; details?: string }
): Promise<string | null> {
  if (!THUMBNAIL_ENABLED) {
    return null;
  }

  const detailsDesc = item.details ? `, ${item.details}` : '';
  const prompt = `A single ${item.color} ${item.material} ${item.type}${detailsDesc}. Flat lay on white background, minimal style, product photography, no model, no person, just the garment centered. Show the item exactly as described — correct neckline, sleeve length, and fit.`;

  const response = await getClient().images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1024x1024',
  });

  const imageData = response.data?.[0];
  let imageBuffer: Buffer;

  if (imageData?.b64_json) {
    imageBuffer = Buffer.from(imageData.b64_json, 'base64');
  } else if (imageData?.url) {
    const imgResponse = await fetch(imageData.url);
    const arrayBuffer = await imgResponse.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
  } else {
    throw new Error('No image data returned from OpenAI');
  }

  // Ensure thumbnails directory exists
  await mkdir(THUMBNAILS_DIR, { recursive: true });

  const filename = `${uuidv4()}.png`;
  const filePath = join(THUMBNAILS_DIR, filename);
  await writeFile(filePath, imageBuffer);

  return `/api/images/thumbnails/${filename}`;
}

/**
 * Beautify a cropped thumbnail by generating a clean flat-lay version.
 *
 * Takes the raw crop URL (local file path), reads it, sends it to GPT-4o
 * as a reference, and generates a clean product-style image of the same item.
 *
 * @param cropUrl - The URL path of the raw crop (e.g., /api/images/thumbnails/xxx.png)
 * @param item - The item description for the prompt
 * @returns The URL path to the beautified thumbnail, or null on failure.
 */
export async function beautifyThumbnail(
  cropUrl: string,
  item: { type: string; color: string; material: string; details?: string }
): Promise<string | null> {
  if (!THUMBNAIL_ENABLED) {
    return null;
  }

  // Read the cropped image file
  const filename = cropUrl.split('/').pop();
  if (!filename) return null;

  const cropPath = join(THUMBNAILS_DIR, filename);
  let cropBuffer: Buffer;
  try {
    cropBuffer = await readFile(cropPath);
  } catch {
    console.error(`[beautify] Could not read crop file: ${cropPath}`);
    return null;
  }

  const base64Crop = cropBuffer.toString('base64');

  // Ask GPT-4o to describe the exact item from the crop, then generate a clean version
  const detailsDesc = item.details ? ` Details: ${item.details}.` : '';
  const prompt = `Generate a clean flat-lay product image of this exact ${item.color} ${item.material} ${item.type} on a plain white background.${detailsDesc} Match the exact color, pattern, texture, neckline, sleeve length, and style. No model, no body, just the garment laid flat, centered, product photography style.`;

  try {
    const response = await getClient().images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1024x1024',
    });

    const imageData = response.data?.[0];
    let imageBuffer: Buffer;

    if (imageData?.b64_json) {
      imageBuffer = Buffer.from(imageData.b64_json, 'base64');
    } else if (imageData?.url) {
      const imgResponse = await fetch(imageData.url);
      const arrayBuffer = await imgResponse.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error('No image data returned from OpenAI');
    }

    await mkdir(THUMBNAILS_DIR, { recursive: true });

    const beautifiedFilename = `${uuidv4()}-clean.png`;
    const filePath = join(THUMBNAILS_DIR, beautifiedFilename);
    await writeFile(filePath, imageBuffer);

    return `/api/images/thumbnails/${beautifiedFilename}`;
  } catch (error) {
    console.error('[beautify] Failed to generate clean thumbnail:', error);
    return null;
  }
}
