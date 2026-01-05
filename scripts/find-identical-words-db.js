const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findIdenticalWords() {
  console.log('Fetching vocabulary...');
  
  // Get all vocabulary with English words
  let allVocabulary = [];
  let offset = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('vocabulary')
      .select('id, word_en, topic_id')
      .order('id')
      .range(offset, offset + pageSize - 1);
    
    if (error || !data || data.length === 0) break;
    allVocabulary = allVocabulary.concat(data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  console.log('Found', allVocabulary.length, 'vocabulary words');
  
  // Get all translations
  console.log('Fetching translations...');
  let allTranslations = [];
  offset = 0;
  
  while (true) {
    const { data, error } = await supabase
      .from('vocabulary_translations')
      .select('vocabulary_id, language_code, translated_word')
      .order('vocabulary_id')
      .range(offset, offset + pageSize - 1);
    
    if (error || !data || data.length === 0) break;
    allTranslations = allTranslations.concat(data);
    console.log('Fetched', allTranslations.length, 'translations...');
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  console.log('Total translations:', allTranslations.length);
  
  // Get topics
  const { data: topics } = await supabase.from('topics').select('id, name');
  const topicMap = {};
  topics.forEach(t => topicMap[t.id] = t.name);
  
  // Create vocabulary lookup
  const vocabMap = {};
  allVocabulary.forEach(v => {
    vocabMap[v.id] = { word_en: v.word_en, topic_id: v.topic_id };
  });
  
  // Language names
  const langNames = {
    ar: 'Arabic', bg: 'Bulgarian', bn: 'Bengali', ca: 'Catalan', cs: 'Czech',
    cy: 'Welsh', da: 'Danish', de: 'German', el: 'Greek', es: 'Spanish',
    et: 'Estonian', eu: 'Basque', fa: 'Persian', fi: 'Finnish', fr: 'French',
    ga: 'Irish', gu: 'Gujarati', he: 'Hebrew', hi: 'Hindi', hr: 'Croatian',
    hu: 'Hungarian', id: 'Indonesian', is: 'Icelandic', it: 'Italian', ja: 'Japanese',
    ko: 'Korean', lt: 'Lithuanian', lv: 'Latvian', mk: 'Macedonian', ml: 'Malayalam',
    mr: 'Marathi', mt: 'Maltese', nl: 'Dutch', no: 'Norwegian', pl: 'Polish',
    pt: 'Portuguese', ro: 'Romanian', ru: 'Russian', sk: 'Slovak', sl: 'Slovenian',
    sv: 'Swedish', ta: 'Tamil', te: 'Telugu', th: 'Thai', tr: 'Turkish',
    uk: 'Ukrainian', ur: 'Urdu', vi: 'Vietnamese', zh: 'Chinese'
  };
  
  // Find identical words (case-insensitive)
  const identicalWords = [];
  const uniqueEnglishWords = new Set();
  const languageStats = {};
  
  allTranslations.forEach(t => {
    const vocab = vocabMap[t.vocabulary_id];
    if (!vocab) return;
    
    const engWord = vocab.word_en.toLowerCase().trim();
    const transWord = t.translated_word.toLowerCase().trim();
    
    if (engWord === transWord) {
      identicalWords.push({
        english: vocab.word_en,
        language: t.language_code,
        languageName: langNames[t.language_code] || t.language_code,
        topic: topicMap[vocab.topic_id] || 'Unknown'
      });
      uniqueEnglishWords.add(vocab.word_en);
      languageStats[t.language_code] = (languageStats[t.language_code] || 0) + 1;
    }
  });
  
  // Sort by language then by word
  identicalWords.sort((a, b) => {
    if (a.languageName !== b.languageName) return a.languageName.localeCompare(b.languageName);
    return a.english.localeCompare(b.english);
  });
  
  // Generate report
  let output = 'IDENTICAL WORDS - ENGLISH AND OTHER LANGUAGES\r\n';
  output += '='.repeat(60) + '\r\n';
  output += 'Generated: ' + new Date().toISOString() + '\r\n';
  output += 'Total identical word pairs: ' + identicalWords.length + '\r\n';
  output += 'Unique English words with matches: ' + uniqueEnglishWords.size + '\r\n';
  output += '='.repeat(60) + '\r\n\r\n';
  
  // Stats by language
  output += '--- MATCHES BY LANGUAGE ---\r\n';
  const sortedLangs = Object.entries(languageStats).sort((a, b) => b[1] - a[1]);
  sortedLangs.forEach(([lang, count]) => {
    output += (langNames[lang] || lang) + ': ' + count + ' words\r\n';
  });
  output += '\r\n';
  
  // Group by language
  let currentLang = null;
  identicalWords.forEach(item => {
    if (item.languageName !== currentLang) {
      currentLang = item.languageName;
      output += '\r\n--- ' + currentLang.toUpperCase() + ' (' + languageStats[item.language] + ' matches) ---\r\n';
    }
    output += item.english + ' [' + item.topic + ']\r\n';
  });
  
  fs.writeFileSync('identical-words-database.txt', output);
  console.log('\nExported to identical-words-database.txt');
  console.log('Total identical pairs:', identicalWords.length);
  console.log('Unique English words:', uniqueEnglishWords.size);
}

findIdenticalWords();
