-- Migration 003: Add style insights cache columns to users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS style_insights JSONB,
  ADD COLUMN IF NOT EXISTS insights_updated_at TIMESTAMP;
