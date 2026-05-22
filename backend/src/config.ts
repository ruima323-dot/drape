import { join } from 'path';

/**
 * Base directory for persistent file storage.
 * In production (Railway), this points to the mounted volume.
 * In development, it defaults to the project root (process.cwd()).
 */
export const DATA_DIR = process.env.DATA_DIR || process.cwd();

export const IMAGES_DIR = join(DATA_DIR, 'generated-images');
export const THUMBNAILS_DIR = join(DATA_DIR, 'generated-images', 'thumbnails');
export const UPLOAD_DIR = join(DATA_DIR, 'uploaded-photos');
export const SELFIES_DIR = join(DATA_DIR, 'uploaded-photos', 'selfies');
