/**
 * Resolve a backend image path to a full URL.
 * In development, images are served from localhost:3001.
 * In production, they're served from the Railway backend.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

// Strip /api suffix to get the backend origin
const BACKEND_ORIGIN = API_BASE_URL.endsWith('/api')
  ? API_BASE_URL.slice(0, -4)
  : API_BASE_URL.replace(/\/api$/, '');

/**
 * Convert a relative image path (e.g., /api/uploads/photo.jpg) to a full URL.
 * If the path is already absolute (http/https/blob), returns it as-is.
 */
export function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  return `${BACKEND_ORIGIN}${path}`;
}
