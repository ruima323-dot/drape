-- Migration 004: Add daily recommendation cache columns to users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS daily_recommendation JSONB,
  ADD COLUMN IF NOT EXISTS daily_recommendation_date DATE;
