// ─── Constants ───────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ─── Public API ──────────────────────────────────────────────────────────────

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an uploaded file's MIME type and size.
 * Accepts only image/jpeg, image/png, image/webp with max size 10 MB.
 */
export function validateUploadedFile(file: { mimetype: string; size: number }): FileValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file format. Accepted formats: JPEG, PNG, WebP. Received: ${file.mimetype}`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is 10 MB. Received: ${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    };
  }

  return { valid: true };
}
