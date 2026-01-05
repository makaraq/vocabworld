// Full Verb Translation Script - 400+ verbs × 49 languages
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// All verbs from verbs.txt (exact list)
const ALL_VERBS = [
  // 1. Basic
  'walk', 'run', 'jump', 'hop', 'skip', 'crawl', 'climb', 'slide', 'swing', 'stretch',
  'bend', 'lift', 'carry', 'drag', 'push', 'pull', 'hold', 'grab', 'drop', 'throw',
  'catch', 'kick', 'hit', 'press', 'twist', 'turn', 'rotate', 'flip', 'shake', 'wave',
  'reach', 'lean', 'rest', 'balance', 'spin', 'arrange', 'adjust', 'shift', 'tie', 'untie',
  'wrap', 'unwrap', 'fold', 'unfold', 'pack', 'unpack', 'be', 'become', 'seem', 'appear',
  'remain', 'stay', 'exist', 'happen', 'occur', 'change', 'improve', 'decline', 'continue',
  'stop', 'begin', 'end', 'last',
  
  // 2. Daily Routine
  'wake', 'get up', 'wash', 'shower', 'bathe', 'brush', 'comb', 'dress', 'eat', 'drink',
  'snack', 'cook', 'bake', 'reheat', 'clean', 'tidy', 'organize', 'vacuum', 'sweep', 'mop',
  'dust', 'wash dishes', 'rinse', 'wipe', 'scrub', 'dry', 'shop', 'refill', 'charge', 'relax',
  'nap', 'sleep', 'prepare', 'schedule', 'cancel', 'check', 'monitor', 'plan', 'wait',
  'search', 'find', 'lose', 'replace',
  
  // 3. Mental
  'think', 'know', 'believe', 'consider', 'imagine', 'wonder', 'remember', 'forget', 'realize',
  'guess', 'predict', 'expect', 'recognize', 'notice', 'focus', 'concentrate', 'decide', 'choose',
  'compare', 'analyze', 'evaluate', 'estimate', 'solve', 'question', 'suspect', 'doubt', 'learn',
  'study', 'memorize', 'calculate', 'reflect', 'understand', 'like', 'love', 'hate', 'enjoy',
  'prefer', 'want', 'need', 'miss', 'care', 'worry', 'fear', 'panic', 'stress', 'calm',
  'appreciate', 'value', 'respect', 'dislike', 'regret', 'hope', 'trust', 'surprise', 'shock',
  'annoy', 'bother', 'confuse', 'embarrass', 'frustrate', 'satisfy', 'comfort', 'cheer',
  
  // 4. Communication
  'say', 'tell', 'talk', 'speak', 'discuss', 'chat', 'explain', 'describe', 'announce', 'report',
  'reply', 'answer', 'ask', 'interrupt', 'suggest', 'recommend', 'complain', 'argue', 'debate',
  'whisper', 'shout', 'yell', 'mention', 'remind', 'warn', 'advise', 'encourage', 'persuade',
  'invite', 'respond', 'translate', 'inform', 'comment', 'confirm', 'deny', 'admit',
  
  // 6. Social
  'meet', 'greet', 'welcome', 'visit', 'host', 'join', 'help', 'support', 'assist', 'share',
  'care for', 'hug', 'kiss', 'hold hands', 'date', 'marry', 'befriend', 'follow', 'lead',
  'guide', 'introduce', 'cooperate', 'protect', 'include', 'exclude',
  
  // 7. Work
  'work', 'write', 'read', 'edit', 'revise', 'review', 'inspect', 'complete', 'submit',
  'create', 'design', 'build', 'assemble', 'debug', 'research', 'document', 'train', 'teach',
  'update', 'upload', 'download', 'print', 'scan', 'record', 'track', 'manage', 'supervise',
  
  // 8. Travel
  'go', 'come', 'move', 'leave', 'arrive', 'enter', 'exit', 'travel', 'fly', 'drive', 'ride',
  'board', 'land', 'park', 'accelerate', 'reverse', 'cross', 'wander', 'explore', 'return',
  'rush', 'hurry', 'navigate',
  
  // 9. Household
  'sanitize', 'iron', 'store', 'repair', 'fix', 'disassemble', 'install', 'uninstall', 'remove',
  'connect', 'disconnect', 'lock', 'unlock', 'decorate', 'polish', 'hammer', 'saw', 'glue',
  
  // 10. Money
  'buy', 'sell', 'pay', 'owe', 'borrow', 'lend', 'rent', 'save', 'spend', 'invest', 'earn',
  'refund', 'exchange', 'order', 'select', 'withdraw', 'deposit', 'budget',
  
  // 11. Food
  'fry', 'grill', 'boil', 'steam', 'slice', 'cut', 'chop', 'mix', 'stir', 'pour', 'serve',
  'taste', 'season', 'marinate', 'chew', 'swallow', 'deliver', 'digest',
  
  // 12. Nature
  'rain', 'snow', 'hail', 'sleet', 'freeze', 'melt', 'shine', 'blow', 'grow', 'bloom',
  'wither', 'sprout', 'fall', 'quake', 'erode', 'burn', 'flood', 'float', 'sink', 'rise', 'set',
  
  // 13. Health
  'breathe', 'inhale', 'exhale', 'cough', 'sneeze', 'sweat', 'bleed', 'heal', 'recover', 'ache',
  'hurt', 'strain', 'exercise', 'faint', 'vomit', 'blink', 'squint', 'tremble',
  
  // 14. Technology
  'click', 'tap', 'scroll', 'swipe', 'browse', 'upgrade', 'copy', 'paste', 'delete', 'reset',
  'restart', 'log in', 'log out', 'sync', 'stream', 'encrypt', 'backup'
];

// Remove duplicates
const UNIQUE_VERBS = [...new Set(ALL_VERBS)];

// 49 target languages (excluding English)
const TARGET_LANGUAGES = [
  { code: 'ar', name: 'Arabic' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ca', name: 'Catalan' },
  { code: 'cs', name: 'Czech' },
  { code: 'cy', name: 'Welsh' },
  { code: 'da', name: 'Danish' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'es', name: 'Spanish' },
  { code: 'et', name: 'Estonian' },
  { code: 'eu', name: 'Basque' },
  { code: 'fa', name: 'Persian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'ga', name: 'Irish' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hr', name: 'Croatian' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'id', name: 'Indonesian' },
  { code: 'is', name: 'Icelandic' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'lv', name: 'Latvian' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mr', name: 'Marathi' },
  { code: 'mt', name: 'Maltese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'no', name: 'Norwegian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'sv', name: 'Swedish' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'zh', name: 'Chinese' }
];

const RESULTS_FILE = 'scripts/verb-translations-full.json';
const PROGRESS_FILE = 'scripts/verb-translations-progress.json';

async function translateVerbs(verbs, language) {
  const prompt = `Translate these English verbs to ${language.name}.

RULES:
1. These are ACTION VERBS - translate as verbs, not nouns or adjectives
2. Return ONLY ONE WORD per translation - no parentheses, no explanations, no alternatives
3. Use the infinitive/base verb form
4. Example: "clean" = verb "to clean" (temizlemek in Turkish), not adjective "clean"

Output ONLY valid JSON: {"english": "translation", ...}

Words: ${JSON.stringify(verbs)}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw error;
  }
}

async function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (e) {}
  return { completed: [], translations: {} };
}

async function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

async function runFullTranslation() {
  console.log('🚀 Full Verb Translation - Gemini 2.0 Flash');
  console.log(`📝 ${UNIQUE_VERBS.length} unique verbs × ${TARGET_LANGUAGES.length} languages`);
  console.log(`📊 Total translations: ~${UNIQUE_VERBS.length * TARGET_LANGUAGES.length}\n`);

  // Load previous progress
  let progress = await loadProgress();
  console.log(`📂 Resuming from ${progress.completed.length} completed languages\n`);

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  for (const lang of TARGET_LANGUAGES) {
    // Skip if already completed
    if (progress.completed.includes(lang.code)) {
      console.log(`⏭️  ${lang.name} (${lang.code}) - already done`);
      successCount++;
      continue;
    }

    console.log(`\n🌐 [${progress.completed.length + 1}/${TARGET_LANGUAGES.length}] Translating to ${lang.name}...`);
    
    try {
      const translations = await translateVerbs(UNIQUE_VERBS, lang);
      const wordCount = Object.keys(translations).length;
      
      progress.translations[lang.code] = translations;
      progress.completed.push(lang.code);
      await saveProgress(progress);
      
      console.log(`✅ ${lang.name}: ${wordCount} words translated`);
      console.log(`   Sample: clean → ${translations['clean']}, eat → ${translations['eat']}`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ ${lang.name} failed: ${error.message}`);
      failCount++;
    }

    // Rate limit: 5 seconds between requests
    if (progress.completed.length < TARGET_LANGUAGES.length) {
      console.log(`   ⏳ Waiting 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Success: ${successCount}/${TARGET_LANGUAGES.length} languages`);
  console.log(`❌ Failed: ${failCount} languages`);
  console.log(`⏱️  Time: ${elapsed} minutes`);
  console.log(`📝 Verbs: ${UNIQUE_VERBS.length}`);
  console.log(`📊 Total translations: ${successCount * UNIQUE_VERBS.length}`);

  // Save final results
  fs.writeFileSync(RESULTS_FILE, JSON.stringify({
    metadata: {
      verbCount: UNIQUE_VERBS.length,
      languageCount: successCount,
      totalTranslations: successCount * UNIQUE_VERBS.length,
      generatedAt: new Date().toISOString()
    },
    verbs: UNIQUE_VERBS,
    translations: progress.translations
  }, null, 2), 'utf8');

  console.log(`\n💾 Saved to ${RESULTS_FILE}`);
}

runFullTranslation().catch(console.error);
