-- Migration to add image_url and color columns to hubs table
-- Run this in Supabase SQL Editor

ALTER TABLE hubs 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS color VARCHAR(7);

-- Add comments for documentation
COMMENT ON COLUMN hubs.image_url IS 'URL to the hub image from Giphy or other source';
COMMENT ON COLUMN hubs.color IS 'Hex color code for the hub (e.g., #FF6B6B)';

-- Optional: Add check constraint for color format (hex colors)
ALTER TABLE hubs 
ADD CONSTRAINT check_color_format 
CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');