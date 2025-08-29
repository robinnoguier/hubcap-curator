-- Updated Supabase Schema for Hubcap Curator
-- Hub → Topic → Links hierarchy
-- Run this in your Supabase SQL Editor (this will update existing schema)

-- Create hubs table
CREATE TABLE IF NOT EXISTS hubs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create topics table
CREATE TABLE IF NOT EXISTS topics (
  id BIGSERIAL PRIMARY KEY,
  hub_id BIGINT REFERENCES hubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update searches table to include topic context
ALTER TABLE searches ADD COLUMN IF NOT EXISTS topic_id BIGINT REFERENCES topics(id) ON DELETE CASCADE;
ALTER TABLE searches ADD COLUMN IF NOT EXISTS search_description TEXT; -- Detailed search context

-- Add indexes for the new tables
CREATE INDEX IF NOT EXISTS idx_hubs_name ON hubs(name);
CREATE INDEX IF NOT EXISTS idx_hubs_created_at ON hubs(created_at);
CREATE INDEX IF NOT EXISTS idx_topics_hub_id ON topics(hub_id);
CREATE INDEX IF NOT EXISTS idx_topics_name ON topics(name);
CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at);
CREATE INDEX IF NOT EXISTS idx_searches_topic_id ON searches(topic_id);

-- Add RLS policies for new tables
ALTER TABLE hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (restrict later)
CREATE POLICY "Allow all operations on hubs" ON hubs FOR ALL USING (true);
CREATE POLICY "Allow all operations on topics" ON topics FOR ALL USING (true);

-- Add some sample data for testing
INSERT INTO hubs (name, description) VALUES 
  ('Hyrox', 'Functional fitness and Hyrox competition training'),
  ('Tech', 'Technology, programming, and software development'),
  ('Health', 'General health, wellness, and medical information')
ON CONFLICT DO NOTHING;

-- Add sample topics
INSERT INTO topics (hub_id, name, description) VALUES 
  (1, 'Nutrition', 'Nutrition strategies for Hyrox training and competition'),
  (1, 'Training', 'Workout routines and training methodologies for Hyrox'),
  (2, 'AI & ML', 'Artificial Intelligence and Machine Learning resources'),
  (3, 'Mental Health', 'Mental wellness and psychological health resources')
ON CONFLICT DO NOTHING;