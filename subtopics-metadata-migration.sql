-- Migration to add metadata column to subtopics table
-- Run this in your Supabase SQL editor

-- Add metadata column to subtopics table
ALTER TABLE subtopics 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add comment to document the column
COMMENT ON COLUMN subtopics.metadata IS 'JSON object containing structured metadata fields like weight, height, etc.';

-- Create an index on metadata for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_subtopics_metadata ON subtopics USING GIN (metadata);

-- Example usage:
-- INSERT INTO subtopics (topic_id, name, description, metadata) VALUES 
-- (1, 'Conor McGregor', 'Former two-division UFC champion', '{"weight_kg": 77, "height_cm": 175, "nationality": "Irish"}');

-- Query examples:
-- SELECT * FROM subtopics WHERE metadata->>'nationality' = 'Irish';
-- SELECT * FROM subtopics WHERE (metadata->>'weight_kg')::int > 70;