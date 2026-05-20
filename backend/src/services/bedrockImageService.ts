import OpenAI, { toFile } from 'openai';
import { createReadStream } from 'fs';

// ─── Configuration ───────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const name = error.name;
    if (
      name === 'RateLimitError' ||
      name === 'APIConnectionError' ||
      name === 'InternalServerError'
    ) {
      return true;
    }
    // Check for rate limit status code
    if ('status' in error && (error as { status: number }).status === 429) {
      return true;
    }
  }
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate an image from a text prompt using OpenAI's gpt-image-2 model.
 *
 * Implements retry with exponential backoff (max 3 attempts) for rate limits
 * and connection errors.
 *
 * @param prompt - The text prompt describing the image to generate
 * @returns A Buffer containing the decoded image bytes
 */
export async function generateImage(prompt: string): Promise<Buffer> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await getClient().images.generate({
        model: 'gpt-image-2',
        prompt,
        n: 1,
        size: '1024x1024',
      });

      const imageData = response.data?.[0];

      if (imageData?.b64_json) {
        return Buffer.from(imageData.b64_json, 'base64');
      }

      // If URL is returned instead of base64, fetch it
      if (imageData?.url) {
        const imgResponse = await fetch(imageData.url);
        const arrayBuffer = await imgResponse.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }

      throw new Error('No image data returned from OpenAI');
    } catch (error: unknown) {
      lastError = error;

      if (attempt < MAX_RETRIES && isRetryableError(error)) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Generate an outfit image using a reference selfie via OpenAI's gpt-image-2
 * image editing endpoint. The selfie is used as the base image and the prompt
 * instructs the model to dress the person in the requested outfit.
 *
 * @param prompt - The text prompt describing how to dress the person
 * @param referenceImagePath - Absolute path to the user's selfie file
 * @returns A Buffer containing the decoded image bytes
 */
export async function generateOutfitWithReference(
  prompt: string,
  referenceImagePath: string,
): Promise<Buffer> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const imageFile = await toFile(createReadStream(referenceImagePath));

      const response = await getClient().images.edit({
        model: 'gpt-image-2',
        image: imageFile,
        prompt,
        n: 1,
        size: '1024x1024',
      });

      const imageData = response.data?.[0];

      if (imageData?.b64_json) {
        return Buffer.from(imageData.b64_json, 'base64');
      }

      if (imageData?.url) {
        const imgResponse = await fetch(imageData.url);
        const arrayBuffer = await imgResponse.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }

      throw new Error('No image data returned from OpenAI');
    } catch (error: unknown) {
      lastError = error;

      if (attempt < MAX_RETRIES && isRetryableError(error)) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
