-- Supabase Schema for Hubcap Curator
-- Run this in your Supabase SQL Editor

-- Create searches table
CREATE TABLE searches (
  id BIGSERIAL PRIMARY KEY,
  topic TEXT NOT NULL,
  search_keywords TEXT, -- AI-generated keywords
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_links INTEGER DEFAULT 0
);

-- Create links table
CREATE TABLE links (
  id BIGSERIAL PRIMARY KEY,
  search_id BIGINT REFERENCES searches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  snippet TEXT,
  source TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('long_form_videos', 'short_form_videos', 'articles', 'podcasts', 'images')),
  thumbnail TEXT,
  creator TEXT,
  published_at TEXT,
  duration_sec INTEGER,
  is_removed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add unique constraint to prevent duplicate links in same search
  UNIQUE(search_id, url)
);

-- Create user_feedback table (for future use)
CREATE TABLE user_feedback (
  id BIGSERIAL PRIMARY KEY,
  link_id BIGINT REFERENCES links(id) ON DELETE CASCADE,
  feedback TEXT CHECK (feedback IN ('like', 'discard')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_searches_topic ON searches(topic);
CREATE INDEX idx_searches_created_at ON searches(created_at);
CREATE INDEX idx_links_search_id ON links(search_id);
CREATE INDEX idx_links_category ON links(category);
CREATE INDEX idx_links_source ON links(source);
CREATE INDEX idx_links_created_at ON links(created_at);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (you can restrict this later)
CREATE POLICY "Allow all operations on searches" ON searches FOR ALL USING (true);
CREATE POLICY "Allow all operations on links" ON links FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_feedback" ON user_feedback FOR ALL USING (true);