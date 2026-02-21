-- Update topic names for topics 42 and 43
-- Topic 42: Common Phrases → Daily Language
-- Topic 43: Grammar → Essential Words

UPDATE topics 
SET name = 'Daily Language' 
WHERE id = 42;

UPDATE topics 
SET name = 'Essential Words' 
WHERE id = 43;

-- Verify the updates
SELECT id, name FROM topics WHERE id IN (42, 43) ORDER BY id;
