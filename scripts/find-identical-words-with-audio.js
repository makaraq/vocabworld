const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findIdenticalWordsWithAudio() {
  console.log('Loading B2 audio mappings...');
  
  // Load and parse B2 CSV file
  const csvContent = fs.readFileSync('backblaze-urls-20250909-180354.csv', 'utf8');
  const lines = csvContent.split('\n').slice(1); // Skip header
  
  // Create a map of wordId -> set of languages that have audio
  const audioMap = {};
  lines.forEach(line => {
    if (!line.trim()) return;
    // Extract wordId from filename (e.g., "alnilam_1197_.wav" or "alnilam_1197_word.wav")
    const match = line.match(/alnilam_(\d+)_/);
    if (match) {
      const wordId = parseInt(match[1]);
      // Extract language code (first field before /)
      const langMatch = line.match(/^"?([a-z]{2})\//i);
      if (langMatch) {
        const lang = langMatch[1].toLowerCase();
        if (!audioMap[wordId]) audioMap[wordId] = new Set();
        audioMap[wordId].add(lang);
      }
    }
  });
  console.log('Loaded audio mappings for', Object.keys(audioMap).length, 'words');
  
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
    if (allTranslations.length % 10000 === 0) {
      console.log('Fetched', allTranslations.length, 'translations...');
    }
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
  
  // Find identical words (case-insensitive) and check audio
  const identicalWords = [];
  const uniqueEnglishWords = new Set();
  const languageStats = {};
  const audioStats = { withAudio: 0, withoutAudio: 0 };
  const missingAudioList = [];
  
  allTranslations.forEach(t => {
    const vocab = vocabMap[t.vocabulary_id];
    if (!vocab) return;
    
    const engWord = vocab.word_en.toLowerCase().trim();
    const transWord = t.translated_word.toLowerCase().trim();
    
    if (engWord === transWord) {
      // Check if audio exists for this word in this language
      const hasAudio = audioMap[t.vocabulary_id] && audioMap[t.vocabulary_id].has(t.language_code);
      
      const wordEntry = {
        wordId: t.vocabulary_id,
        english: vocab.word_en,
        language: t.language_code,
        languageName: langNames[t.language_code] || t.language_code,
        topic: topicMap[vocab.topic_id] || 'Unknown',
        hasAudio: hasAudio
      };
      
      identicalWords.push(wordEntry);
      uniqueEnglishWords.add(vocab.word_en);
      languageStats[t.language_code] = (languageStats[t.language_code] || 0) + 1;
      
      if (hasAudio) {
        audioStats.withAudio++;
      } else {
        audioStats.withoutAudio++;
        missingAudioList.push(wordEntry);
      }
    }
  });
  
  // Sort by language then by word
  identicalWords.sort((a, b) => {
    if (a.languageName !== b.languageName) return a.languageName.localeCompare(b.languageName);
    return a.english.localeCompare(b.english);
  });
  
  missingAudioList.sort((a, b) => {
    if (a.languageName !== b.languageName) return a.languageName.localeCompare(b.languageName);
    return a.english.localeCompare(b.english);
  });
  
  // Generate report
  let output = 'IDENTICAL WORDS - ENGLISH AND OTHER LANGUAGES (WITH AUDIO STATUS)\r\n';
  output += '='.repeat(70) + '\r\n';
  output += 'Generated: ' + new Date().toISOString() + '\r\n';
  output += 'Total identical word pairs: ' + identicalWords.length + '\r\n';
  output += 'Unique English words with matches: ' + uniqueEnglishWords.size + '\r\n';
  output += '\r\n';
  output += '--- AUDIO STATUS ---\r\n';
  output += 'With B2 Audio: ' + audioStats.withAudio + ' (' + Math.round(audioStats.withAudio / identicalWords.length * 100) + '%)\r\n';
  output += 'Missing Audio: ' + audioStats.withoutAudio + ' (' + Math.round(audioStats.withoutAudio / identicalWords.length * 100) + '%)\r\n';
  output += '='.repeat(70) + '\r\n\r\n';
  
  // Stats by language
  output += '--- MATCHES BY LANGUAGE ---\r\n';
  const sortedLangs = Object.entries(languageStats).sort((a, b) => b[1] - a[1]);
  sortedLangs.forEach(([lang, count]) => {
    output += (langNames[lang] || lang) + ': ' + count + ' words\r\n';
  });
  output += '\r\n';
  
  // All words grouped by language with audio status
  output += '\r\n' + '='.repeat(70) + '\r\n';
  output += 'ALL IDENTICAL WORDS BY LANGUAGE\r\n';
  output += '(✓ = has audio, ✗ = missing audio)\r\n';
  output += '='.repeat(70) + '\r\n';
  
  let currentLang = null;
  identicalWords.forEach(item => {
    if (item.languageName !== currentLang) {
      currentLang = item.languageName;
      output += '\r\n--- ' + currentLang.toUpperCase() + ' (' + languageStats[item.language] + ' matches) ---\r\n';
    }
    const audioIcon = item.hasAudio ? '✓' : '✗';
    output += audioIcon + ' ' + item.english + ' [' + item.topic + '] (ID: ' + item.wordId + ')\r\n';
  });
  
  // Missing audio section
  output += '\r\n\r\n' + '='.repeat(70) + '\r\n';
  output += 'WORDS MISSING B2 AUDIO (' + audioStats.withoutAudio + ' total)\r\n';
  output += '='.repeat(70) + '\r\n';
  
  currentLang = null;
  missingAudioList.forEach(item => {
    if (item.languageName !== currentLang) {
      currentLang = item.languageName;
      const langMissing = missingAudioList.filter(x => x.language === item.language).length;
      output += '\r\n--- ' + currentLang.toUpperCase() + ' (' + langMissing + ' missing) ---\r\n';
    }
    output += item.english + ' [' + item.topic + '] (ID: ' + item.wordId + ')\r\n';
  });
  
  fs.writeFileSync('identical-words-with-audio-status.txt', output);
  console.log('\nExported to identical-words-with-audio-status.txt');
  console.log('Total identical pairs:', identicalWords.length);
  console.log('With audio:', audioStats.withAudio);
  console.log('Missing audio:', audioStats.withoutAudio);
}

findIdenticalWordsWithAudio();
