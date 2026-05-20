import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ─── Configuration ───────────────────────────────────────────────────────────

const MAX_RETRIES = 2;

function getRegion(): string {
  return process.env.AWS_REGION ?? 'us-east-1';
}

function getBucketName(): string {
  return process.env.S3_BUCKET_NAME ?? '';
}

// ─── Client ──────────────────────────────────────────────────────────────────

let client: S3Client | undefined;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({ region: getRegion() });
  }
  return client;
}

/**
 * Replace the default S3 client. Useful for injecting a mock in tests.
 */
export function setClient(c: S3Client): void {
  client = c;
}

/**
 * Reset the client so the next call to `getClient` creates a fresh one.
 */
export function resetClient(): void {
  client = undefined;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Construct the public S3 URL for a given object key.
 */
export function getImageUrl(key: string): string {
  return `https://${getBucketName()}.s3.${getRegion()}.amazonaws.com/${key}`;
}

/**
 * Upload a buffer to S3 with retry logic (max 2 attempts).
 */
async function uploadToS3(key: string, imageBuffer: Buffer): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/png',
  });

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await getClient().send(command);
      return getImageUrl(key);
    } catch (error: unknown) {
      lastError = error;

      if (attempt < MAX_RETRIES) {
        continue;
      }

      throw error;
    }
  }

  // Should not be reached, but satisfies TypeScript
  throw lastError;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Upload a generated outfit image to S3.
 *
 * Key structure: `outfits/{userId}/{outfitId}.png`
 *
 * @param userId - The user's unique identifier
 * @param outfitId - The outfit's unique identifier
 * @param imageBuffer - The image data as a Buffer
 * @returns The S3 URL of the uploaded image
 */
export async function uploadOutfitImage(
  userId: string,
  outfitId: string,
  imageBuffer: Buffer
): Promise<string> {
  const key = `outfits/${userId}/${outfitId}.png`;
  return uploadToS3(key, imageBuffer);
}

/**
 * Upload an accessory image to S3.
 *
 * Key structure: `accessories/{userId}/{accessoryId}.png`
 *
 * @param userId - The user's unique identifier
 * @param accessoryId - The accessory's unique identifier
 * @param imageBuffer - The image data as a Buffer
 * @returns The S3 URL of the uploaded image
 */
export async function uploadAccessoryImage(
  userId: string,
  accessoryId: string,
  imageBuffer: Buffer
): Promise<string> {
  const key = `accessories/${userId}/${accessoryId}.png`;
  return uploadToS3(key, imageBuffer);
}
