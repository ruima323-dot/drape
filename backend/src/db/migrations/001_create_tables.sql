-- Migration 001: Create all tables and indexes for Drape Style Discovery
-- Requirements: 1.4, 9.3

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ───────────────────────────────────────────────────────────────────

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_config JSONB,
    style_profile JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Wardrobe Items ──────────────────────────────────────────────────────────

CREATE TABLE wardrobe_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    color VARCHAR(100) NOT NULL,
    material VARCHAR(100),
    fit VARCHAR(100),
    occasions TEXT[],
    image_url VARCHAR(2048),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wardrobe_items_user_id ON wardrobe_items(user_id);

-- ─── Accessories ─────────────────────────────────────────────────────────────

CREATE TABLE accessories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    color VARCHAR(100) NOT NULL,
    material VARCHAR(100),
    label VARCHAR(255) NOT NULL,
    emoji VARCHAR(10),
    image_url VARCHAR(2048),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accessories_user_id ON accessories(user_id);

-- ─── Generated Outfits ──────────────────────────────────────────────────────

CREATE TABLE generated_outfits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    occasion_context VARCHAR(50) NOT NULL,
    wardrobe_item_ids UUID[],
    accessory_ids UUID[],
    accessory_layer_state JSONB,
    image_url VARCHAR(2048) NOT NULL,
    avatar_image_url VARCHAR(2048),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_generated_outfits_user_id_created_at ON generated_outfits(user_id, created_at);

-- ─── Saved Outfits ──────────────────────────────────────────────────────────

CREATE TABLE saved_outfits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generated_outfit_id UUID NOT NULL REFERENCES generated_outfits(id) ON DELETE CASCADE,
    name VARCHAR(255),
    note VARCHAR(280),
    occasion_context VARCHAR(50),
    saved_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_outfits_user_id_saved_at ON saved_outfits(user_id, saved_at);
CREATE INDEX idx_saved_outfits_user_id_occasion_context ON saved_outfits(user_id, occasion_context);
