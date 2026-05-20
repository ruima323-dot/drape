import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// ─── Configuration ───────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? '';

// JWKS client for ECC key verification
const client = SUPABASE_URL
  ? jwksClient({
      jwksUri: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
    })
  : null;

/**
 * Extend Express Request to include userId extracted from auth.
 */
export interface AuthenticatedRequest extends Request {
  userId: string;
}

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
}

/**
 * Get the signing key from JWKS endpoint.
 */
function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  if (!client) {
    callback(new Error('JWKS client not configured'));
    return;
  }
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Verify a JWT token. Tries JWKS first (ECC keys), falls back to shared secret.
 */
function verifyToken(token: string): Promise<SupabaseJwtPayload> {
  return new Promise((resolve, reject) => {
    // If we have a legacy JWT secret, try that first (simpler)
    if (SUPABASE_JWT_SECRET) {
      try {
        const payload = jwt.verify(token, SUPABASE_JWT_SECRET) as SupabaseJwtPayload;
        resolve(payload);
        return;
      } catch {
        // Fall through to JWKS verification
      }
    }

    // Try JWKS verification (for ECC keys)
    if (client) {
      jwt.verify(token, getKey, { algorithms: ['ES256', 'RS256', 'HS256'] }, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded as SupabaseJwtPayload);
        }
      });
    } else {
      reject(new Error('No verification method available'));
    }
  });
}

/**
 * Authentication middleware.
 *
 * Verifies the Supabase JWT from the Authorization header.
 * Falls back to x-user-id header for local development.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // If no verification is configured, treat token as userId (local dev)
    if (!SUPABASE_JWT_SECRET && !client) {
      (req as AuthenticatedRequest).userId = token;
      next();
      return;
    }

    // Verify the token
    verifyToken(token)
      .then((payload) => {
        (req as AuthenticatedRequest).userId = payload.sub;
        next();
      })
      .catch(() => {
        res.status(401).json({ error: 'Invalid or expired token' });
      });
    return;
  }

  // Fallback to x-user-id header (local development)
  const headerValue = req.headers['x-user-id'];
  if (typeof headerValue === 'string' && headerValue.trim()) {
    (req as AuthenticatedRequest).userId = headerValue.trim();
    next();
    return;
  }

  res.status(401).json({ error: 'Authentication required' });
}
