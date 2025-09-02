-- Subtopics Migration for Hubcap Curator
-- Add missing columns to existing tables and create subtopics table

-- Add missing columns to hubs table
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS color TEXT;

-- Add missing columns to topics table
ALTER TABLE topics ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS color TEXT;

-- Create subtopics table
CREATE TABLE IF NOT EXISTS subtopics (
  id BIGSERIAL PRIMARY KEY,
  topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for subtopics
CREATE INDEX IF NOT EXISTS idx_subtopics_topic_id ON subtopics(topic_id);
CREATE INDEX IF NOT EXISTS idx_subtopics_name ON subtopics(name);
CREATE INDEX IF NOT EXISTS idx_subtopics_created_at ON subtopics(created_at);

-- Add RLS policies for subtopics
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (restrict later)
CREATE POLICY "Allow all operations on subtopics" ON subtopics FOR ALL USING (true);

-- Update the searches table to optionally reference subtopics
ALTER TABLE searches ADD COLUMN IF NOT EXISTS subtopic_id BIGINT REFERENCES subtopics(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_searches_subtopic_id ON searches(subtopic_id);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers for all tables
DROP TRIGGER IF EXISTS update_hubs_updated_at ON hubs;
CREATE TRIGGER update_hubs_updated_at BEFORE UPDATE ON hubs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_topics_updated_at ON topics;
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subtopics_updated_at ON subtopics;
CREATE TRIGGER update_subtopics_updated_at BEFORE UPDATE ON subtopics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();