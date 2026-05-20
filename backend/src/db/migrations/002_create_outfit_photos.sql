-- Migration 002: Create outfit_photos table for photo-based outfit documentation
-- Requirements: 10.1, 10.2

CREATE TABLE outfit_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_url VARCHAR(2048) NOT NULL,
    wardrobe_item_ids UUID[] NOT NULL DEFAULT '{}',
    occasion_context VARCHAR(50) NOT NULL,
    note VARCHAR(280),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outfit_photos_user_id_created_at ON outfit_photos(user_id, created_at);
CREATE INDEX idx_outfit_photos_user_id_occasion_context ON outfit_photos(user_id, occasion_context);
