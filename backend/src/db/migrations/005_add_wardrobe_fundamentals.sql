-- Migration 005: Add wardrobe fundamentals cache column to users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wardrobe_fundamentals JSONB;
