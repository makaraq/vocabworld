/**
 * Translate Verbs to 49 Languages using JigsawStack API
 * With resume capability - tracks progress and can continue from where it stopped
 * 
 * Usage: node scripts/translate-verbs-jigsaw.js
 */

const fs = require('fs');
const path = require('path');

// JigsawStack API Configuration
const JIGSAW_API_KEY = 'sk_3362f143044640e914f17fee3eafdfd1960f3725cb7607ea35ca23c717552cc0cd1be9363740f32aecf5da998b2345597c9ef3330e3023f196c2e5c581d3ff8c024szLIo4ngmZHaDwkZpd';

// Progress file path
const PROGRESS_FILE = path.join(__dirname, '..', 'public', 'data', 'verbs-translation-progress.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'verbs-vocabulary.json');

// 46 Target Languages (matching your app's supported languages)
const TARGET_LANGUAGES = {
  ar: 'Arabic', bg: 'Bulgarian', bn: 'Bengali', ca: 'Catalan',
  co: 'Corsican', cs: 'Czech', cy: 'Welsh', da: 'Danish',
  de: 'German', el: 'Greek', es: 'Spanish', et: 'Estonian',
  eu: 'Basque', fa: 'Persian', fi: 'Finnish', fr: 'French',
  ga: 'Irish', he: 'Hebrew', hi: 'Hindi', hr: 'Croatian',
  hu: 'Hungarian', it: 'Italian', ja: 'Japanese', ka: 'Georgian',
  ko: 'Korean', lb: 'Luxembourgish', lt: 'Lithuanian', lv: 'Latvian',
  mk: 'Macedonian', mt: 'Maltese', nl: 'Dutch', no: 'Norwegian',
  pl: 'Polish', pt: 'Portuguese', ro: 'Romanian', ru: 'Russian',
  sk: 'Slovak', sl: 'Slovenian', sq: 'Albanian', sr: 'Serbian',
  sv: 'Swedish', th: 'Thai', tr: 'Turkish', uk: 'Ukrainian',
  vi: 'Vietnamese', zh: 'Chinese'
};

// Verbs by category
const VERBS_BY_CATEGORY = {
  "Basic": [
    "walk", "run", "jump", "hop", "skip", "crawl", "climb", "slide", "swing", "stretch",
    "bend", "lift", "carry", "drag", "push", "pull", "hold", "grab", "drop", "throw",
    "catch", "kick", "hit", "press", "twist", "turn", "rotate", "flip", "shake", "wave",
    "reach", "lean", "rest", "balance", "spin", "arrange", "adjust", "shift", "tie", "untie",
    "wrap", "unwrap", "fold", "unfold", "pack", "unpack", "be", "become", "seem", "appear",
    "remain", "stay", "exist", "happen", "occur", "change", "improve", "decline", "continue", "stop",
    "begin", "end", "last"
  ],
  "Daily Routine": [
    "wake", "get up", "wash", "shower", "bathe", "brush", "comb", "dress", "change", "eat",
    "drink", "snack", "cook", "bake", "reheat", "clean", "tidy", "organize", "vacuum", "sweep",
    "mop", "dust", "wash dishes", "rinse", "wipe", "scrub", "dry", "shop", "refill", "charge",
    "relax", "nap", "sleep", "prepare", "schedule", "cancel", "check", "monitor", "plan", "wait",
    "search", "find", "lose", "replace"
  ],
  "Mental": [
    "think", "know", "believe", "consider", "imagine", "wonder", "remember", "forget", "realize", "guess",
    "predict", "expect", "recognize", "notice", "focus", "concentrate", "decide", "choose", "compare", "analyze",
    "evaluate", "estimate", "solve", "question", "suspect", "doubt", "learn", "study", "memorize", "calculate",
    "reflect", "understand", "like", "love", "hate", "enjoy", "prefer", "want", "need", "miss",
    "care", "worry", "fear", "panic", "stress", "calm", "appreciate", "value", "respect",
    "dislike", "regret", "hope", "trust", "surprise", "shock", "annoy", "bother", "confuse",
    "embarrass", "frustrate", "satisfy", "comfort", "cheer"
  ],
  "Communication": [
    "say", "tell", "talk", "speak", "discuss", "chat", "explain", "describe", "announce", "report",
    "reply", "answer", "ask", "interrupt", "suggest", "recommend", "complain", "argue", "debate", "whisper",
    "shout", "yell", "mention", "remind", "warn", "advise", "encourage", "persuade", "invite", "respond",
    "translate", "inform", "comment", "confirm", "deny", "admit"
  ],
  "Social": [
    "meet", "greet", "welcome", "visit", "host", "join", "help", "support", "assist",
    "share", "care for", "hug", "kiss", "hold hands", "date", "marry", "befriend", "follow", "lead",
    "guide", "introduce", "cooperate", "protect", "include", "exclude"
  ],
  "Work": [
    "work", "write", "read", "edit", "revise", "review", "inspect", "complete", "submit",
    "create", "design", "build", "assemble", "debug", "research",
    "document", "train", "teach", "update", "upload", "download", "print", "scan",
    "record", "track", "manage", "supervise"
  ],
  "Travel": [
    "go", "come", "move", "leave", "arrive", "enter", "exit", "travel", "fly", "drive",
    "ride", "board", "land", "park", "accelerate", "reverse", "cross", "wander",
    "explore", "return", "rush", "hurry", "navigate"
  ],
  "Household": [
    "wipe", "scrub", "sanitize", "iron", "store",
    "repair", "fix", "disassemble", "install", "uninstall",
    "remove", "connect", "disconnect", "lock", "unlock", "decorate", "polish",
    "hammer", "saw", "glue"
  ],
  "Money": [
    "buy", "sell", "pay", "owe", "borrow", "lend", "rent", "save", "spend", "invest",
    "earn", "refund", "exchange", "order", "select", "withdraw",
    "deposit", "budget"
  ],
  "Food": [
    "fry", "grill", "boil", "steam", "slice", "cut",
    "chop", "mix", "stir", "pour", "serve", "taste", "season", "marinate", "chew", "swallow",
    "deliver", "digest"
  ],
  "Nature": [
    "rain", "snow", "hail", "sleet", "freeze", "melt", "shine", "blow", "grow", "bloom",
    "wither", "sprout", "fall", "quake", "erode", "burn", "flood", "float", "sink", "rise", "set"
  ],
  "Health": [
    "breathe", "inhale", "exhale", "cough", "sneeze", "sweat", "bleed", "heal", "recover", "ache",
    "hurt", "strain", "exercise", "faint", "vomit", "blink",
    "squint", "tremble"
  ],
  "Technology": [
    "click", "tap", "scroll", "swipe", "browse", "upgrade",
    "copy", "paste", "delete", "reset",
    "restart", "log in", "log out", "sync", "stream", "encrypt", "backup"
  ]
};

// Helper to delay between API calls
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Load progress from file
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.log('No previous progress found, starting fresh');
  }
  return {
    translations: {},
    lastLanguageIndex: 0,
    lastVerbIndex: 0,
    completedLanguages: [],
    characterCount: 0
  };
}

// Save progress to file
function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// Get all verbs as flat array with categories
function getAllVerbs() {
  const verbs = [];
  for (const [category, verbList] of Object.entries(VERBS_BY_CATEGORY)) {
    for (const verb of verbList) {
      verbs.push({ verb, category });
    }
  }
  return verbs;
}

// Translate using JigsawStack API
async function translateWithJigsaw(text, targetLang) {
  const url = 'https://api.jigsawstack.com/v1/ai/translate';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': JIGSAW_API_KEY
      },
      body: JSON.stringify({
        current_language: 'en',
        target_language: targetLang,
        text: `Translate this English VERB to its infinitive form: "${text}". Only respond with the translated verb, nothing else.`
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`API Error: ${error}`);
      return null;
    }

    const data = await response.json();
    return data.translated_text || null;
  } catch (error) {
    console.error(`Error translating "${text}" to ${targetLang}:`, error.message);
    return null;
  }
}

// Main translation function
async function translateAllVerbs() {
  console.log('🚀 Starting verb translations with JigsawStack API\n');
  
  const allVerbs = getAllVerbs();
  const langCodes = Object.keys(TARGET_LANGUAGES);
  
  console.log(`📊 Total verbs: ${allVerbs.length}`);
  console.log(`🌍 Total languages: ${langCodes.length}`);
  console.log(`📝 Total translations needed: ${allVerbs.length * langCodes.length}\n`);

  // Load previous progress
  let progress = loadProgress();
  
  if (progress.completedLanguages.length > 0) {
    console.log(`📂 Resuming from previous progress...`);
    console.log(`   Completed languages: ${progress.completedLanguages.length}`);
    console.log(`   Characters used: ${progress.characterCount}\n`);
  }

  // Initialize translations structure
  if (!progress.translations || Object.keys(progress.translations).length === 0) {
    let wordId = 50000;
    for (const { verb, category } of allVerbs) {
      progress.translations[verb] = {
        id: wordId++,
        english: verb,
        category: category,
        translations: {}
      };
    }
  }

  // Process each language
  for (let langIdx = progress.lastLanguageIndex; langIdx < langCodes.length; langIdx++) {
    const langCode = langCodes[langIdx];
    const langName = TARGET_LANGUAGES[langCode];
    
    if (progress.completedLanguages.includes(langCode)) {
      console.log(`⏭️  Skipping ${langName} (already completed)`);
      continue;
    }

    console.log(`\n🌍 Translating to ${langName} (${langCode}) [${langIdx + 1}/${langCodes.length}]`);
    
    let successCount = 0;
    let failCount = 0;
    const startVerbIdx = (langIdx === progress.lastLanguageIndex) ? progress.lastVerbIndex : 0;

    for (let verbIdx = startVerbIdx; verbIdx < allVerbs.length; verbIdx++) {
      const { verb, category } = allVerbs[verbIdx];
      
      // Skip if already translated
      if (progress.translations[verb]?.translations[langCode]) {
        successCount++;
        continue;
      }

      console.log(`   [${verbIdx + 1}/${allVerbs.length}] "${verb}" -> ${langName}...`);
      
      const translation = await translateWithJigsaw(verb, langCode);
      
      if (translation) {
        // Clean up the translation (remove quotes, extra text)
        let cleanTranslation = translation.trim();
        cleanTranslation = cleanTranslation.replace(/^["']|["']$/g, '');
        cleanTranslation = cleanTranslation.split('\n')[0]; // Take first line only
        
        progress.translations[verb].translations[langCode] = {
          word: cleanTranslation,
          confidence: 0.95
        };
        successCount++;
        
        // Track character count
        progress.characterCount += verb.length + 100; // Approximate prompt size
      } else {
        failCount++;
      }

      // Save progress every 10 verbs
      if (verbIdx % 10 === 0) {
        progress.lastLanguageIndex = langIdx;
        progress.lastVerbIndex = verbIdx;
        saveProgress(progress);
      }

      // Rate limiting - wait 200ms between requests
      await delay(200);
    }

    // Mark language as completed
    progress.completedLanguages.push(langCode);
    progress.lastVerbIndex = 0;
    saveProgress(progress);
    
    console.log(`   ✅ ${langName}: ${successCount} translated, ${failCount} failed`);
  }

  // Generate final vocabulary JSON
  generateVocabularyJson(progress.translations);
  
  console.log('\n✨ Translation complete!');
  console.log(`📊 Total characters used: ~${progress.characterCount}`);
}

// Generate vocabulary.json format for topic 41 (Verbs)
function generateVocabularyJson(translations) {
  const vocabularyFormat = [];
  let learningOrder = 1;
  
  for (const [category, verbs] of Object.entries(VERBS_BY_CATEGORY)) {
    for (const verb of verbs) {
      const verbData = translations[verb];
      if (verbData) {
        vocabularyFormat.push({
          id: verbData.id,
          topic_id: 41,
          english: verb,
          context: `${category.toLowerCase()} - verbs`,
          category: category,
          part_of_speech: "verb",
          difficulty_level: "beginner",
          frequency_rank: 300,
          learning_order: learningOrder++,
          example_sentence: `Example using "${verb}" as a verb.`,
          translations: verbData.translations
        });
      }
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ "41": vocabularyFormat }, null, 2));
  console.log(`\n💾 Saved vocabulary to ${OUTPUT_FILE}`);
}

// Run the translation
translateAllVerbs().catch(console.error);
