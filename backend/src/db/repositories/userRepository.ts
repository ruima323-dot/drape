import type { AvatarConfig, StyleProfile } from '@drape/shared';
import { pool } from '../connection.js';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarConfig: AvatarConfig | null;
  styleProfile: StyleProfile | null;
  createdAt: Date;
  updatedAt: Date;
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    avatarConfig: (row.avatar_config as AvatarConfig) ?? null,
    styleProfile: (row.style_profile as StyleProfile) ?? null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  if (result.rows.length === 0) return null;
  return rowToUser(result.rows[0]);
}

export async function updateAvatarConfig(
  userId: string,
  avatarConfig: AvatarConfig
): Promise<User | null> {
  const result = await pool.query(
    `UPDATE users
     SET avatar_config = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId, JSON.stringify(avatarConfig)]
  );
  if (result.rows.length === 0) return null;
  return rowToUser(result.rows[0]);
}

export async function updateStyleProfile(
  userId: string,
  styleProfile: StyleProfile
): Promise<User | null> {
  const result = await pool.query(
    `UPDATE users
     SET style_profile = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId, JSON.stringify(styleProfile)]
  );
  if (result.rows.length === 0) return null;
  return rowToUser(result.rows[0]);
}
