-- Update Topic 30 name from "Common Phrases" to "Common Collocations"
-- AND create new topic 42 "Common Phrases"
-- Run this in your Supabase SQL Editor

-- Step 1: Rename existing topic 30
UPDATE topics 
SET 
  name = 'Common Collocations',
  description = 'Frequent word combinations and phrases'
WHERE id = 30;

-- Step 2: Insert new topic 42 "Common Phrases"
INSERT INTO topics (id, name, description) 
VALUES (42, 'Common Phrases', 'Essential everyday phrases and expressions')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Verify both updates
SELECT id, name, description FROM topics WHERE id IN (30, 42) ORDER BY id;
