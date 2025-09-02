-- Add image_url and color columns to topics table
-- Run this in your Supabase SQL Editor

ALTER TABLE topics 
ADD COLUMN image_url TEXT,
ADD COLUMN color TEXT;

-- Optional: Add comments to document the new columns
COMMENT ON COLUMN topics.image_url IS 'URL for topic image from Giphy';
COMMENT ON COLUMN topics.color IS 'Hex color code for topic theme';