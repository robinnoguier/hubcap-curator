# Fix for Subtopics Not Persisting in Production

## Problem
Subtopics created via AI wizard appear locally but disappear after refresh in production.

## Root Cause
The `subtopics` table doesn't exist in the production Supabase database. The migration SQL file exists locally but hasn't been run on production.

## Solution

### Run this SQL migration in your production Supabase dashboard:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `subtopics-migration.sql`
4. Execute the migration

### Or run this combined migration:

```sql
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

-- Add missing columns to hubs table (if not already added)
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS color TEXT;

-- Add missing columns to topics table (if not already added)
ALTER TABLE topics ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS color TEXT;

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_subtopics_updated_at ON subtopics;
CREATE TRIGGER update_subtopics_updated_at BEFORE UPDATE ON subtopics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Verification Steps

After running the migration:

1. Check that the table exists:
```sql
SELECT * FROM subtopics LIMIT 1;
```

2. Test creating a subtopic via the AI wizard
3. Refresh the page - subtopics should now persist

## Additional Notes

- The issue only affects production because your local Supabase already has the subtopics table
- All other migration files (`supabase-migration.sql`, `hub-members-migration.sql`) should also be run if not already applied
- Consider setting up automatic migrations for future deployments