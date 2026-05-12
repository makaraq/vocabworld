const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findDuplicates() {
  // Get all vocabulary with English words
  let allVocabulary = [];
  let offset = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('vocabulary')
      .select('id, word_en, topic_id')
      .range(offset, offset + pageSize - 1);
    
    if (error || !data || data.length === 0) break;
    allVocabulary = allVocabulary.concat(data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  console.log('Fetched', allVocabulary.length, 'vocabulary entries');

  // Get all translations - with pagination
  let allTranslations = [];
  offset = 0;
  
  while (true) {
    const { data, error } = await supabase
      .from('vocabulary_translations')
      .select('vocabulary_id, language_code, translated_word')
      .range(offset, offset + pageSize - 1);
    
    if (error) {
      console.error('Error fetching translations:', error);
      break;
    }
    if (!data || data.length === 0) break;
    
    allTranslations = allTranslations.concat(data);
    console.log('Fetched', allTranslations.length, 'translations so far...');
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  console.log('Total translations:', allTranslations.length);

  // Create vocabulary map
  const vocabMap = {};
  allVocabulary.forEach(v => vocabMap[v.id] = v.word_en);

  // Find matches where translation equals English word (case-insensitive)
  const duplicates = [];
  allTranslations.forEach(t => {
    const englishWord = vocabMap[t.vocabulary_id];
    if (englishWord && t.translated_word) {
      const enLower = englishWord.toLowerCase().trim();
      const transLower = t.translated_word.toLowerCase().trim();
      if (enLower === transLower) {
        duplicates.push({
          english: englishWord,
          language: t.language_code,
          translation: t.translated_word,
          vocabId: t.vocabulary_id
        });
      }
    }
  });

  // Sort by English word
  duplicates.sort((a, b) => a.english.localeCompare(b.english));

  // Format output
  let output = 'SPRIND - IDENTICAL WORDS (English = Translation)\r\n';
  output += '='.repeat(60) + '\r\n';
  output += 'Found ' + duplicates.length + ' identical word pairs\r\n';
  output += '='.repeat(60) + '\r\n\r\n';

  // Group by English word
  const grouped = {};
  duplicates.forEach(d => {
    if (!grouped[d.english]) grouped[d.english] = [];
    grouped[d.english].push(d.language);
  });

  output += 'Unique English words with identical translations: ' + Object.keys(grouped).length + '\r\n\r\n';

  Object.keys(grouped).sort().forEach(word => {
    output += word + ' -> same in: ' + grouped[word].join(', ') + '\r\n';
  });

  require('fs').writeFileSync('identical-words.txt', output);
  console.log('\nFound', duplicates.length, 'identical word pairs');
  console.log('Unique English words with duplicates:', Object.keys(grouped).length);
  console.log('Saved to identical-words.txt');
}

findDuplicates();
