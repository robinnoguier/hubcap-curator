-- Debug script for subtopics issue

-- 1. Check if subtopics table exists and its structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'subtopics'
ORDER BY ordinal_position;

-- 2. Check RLS policies on subtopics
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'subtopics';

-- 3. Check if RLS is enabled on subtopics
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'subtopics';

-- 4. Count existing subtopics
SELECT COUNT(*) as subtopic_count FROM subtopics;

-- 5. Check a sample of subtopics with their topics
SELECT 
  s.id as subtopic_id,
  s.name as subtopic_name,
  s.topic_id,
  t.name as topic_name,
  s.created_at
FROM subtopics s
LEFT JOIN topics t ON s.topic_id = t.id
ORDER BY s.created_at DESC
LIMIT 10;

-- 6. Test insert (you can comment this out if you don't want to insert test data)
-- INSERT INTO subtopics (topic_id, name, description) 
-- VALUES (1, 'Test Subtopic', 'This is a test')
-- RETURNING *;

-- 7. Check if there are any failed inserts in logs (if you have access to logs)
-- This would show in Supabase dashboard logs