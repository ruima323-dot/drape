import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import { pool } from '../db/connection.js';

/**
 * Middleware that ensures a user record exists in the database.
 * If the authenticated user doesn't have a record yet (first API call after signup),
 * it creates one automatically.
 */
export async function ensureUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  if (!userId) {
    next();
    return;
  }

  try {
    // Check if user exists
    const result = await pool.query(
      `SELECT id FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Create user record — email and name will be updated later from the token
      await pool.query(
        `INSERT INTO users (id, email, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [userId, `user-${userId.slice(0, 8)}@drape.style`, 'New User']
      );
    }
  } catch {
    // Non-critical — if this fails, the user will get a 404 on profile endpoints
    // but other endpoints will still work
  }

  next();
}
