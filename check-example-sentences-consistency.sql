-- Check if example sentences are consistent across languages
-- This should show the SAME 3 sentences translated to different languages

-- Check for vocabulary_id 851 (frustrated)
SELECT 
  es.vocabulary_id,
  v.word_en,
  es.language_code,
  es.sentence_order,
  es.sentence,
  es.translation
FROM example_sentences es
JOIN vocabulary v ON es.vocabulary_id = v.id
WHERE es.vocabulary_id = 851
ORDER BY es.sentence_order, es.language_code;

-- Quick check: Count how many languages have data
SELECT 
  vocabulary_id,
  COUNT(DISTINCT language_code) as language_count,
  COUNT(*) as total_sentences
FROM example_sentences 
WHERE vocabulary_id = 851
GROUP BY vocabulary_id;
