/**
 * Translate Verbs to 46 Languages using Ollama (Local LLM)
 * With resume capability - tracks progress and can continue from where it stopped
 * 
 * Usage: node scripts/translate-verbs-ollama.js
 * 
 * Make sure Ollama is running: ollama serve
 */

const fs = require('fs');
const path = require('path');

// Ollama Configuration
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'qwen2.5:7b'; // Using Qwen 2.5 7B for better translation quality

// Progress file path
const PROGRESS_FILE = path.join(__dirname, '..', 'public', 'data', 'verbs-translation-progress.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'verbs-vocabulary.json');

// 46 Target Languages
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
    completedLanguages: []
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

// Translate using Ollama
async function translateWithOllama(verb, targetLang, langName) {
  const prompt = `Translate the English verb "${verb}" to ${langName}. 
This is a VERB (action word), so translate it as a verb in infinitive form.
For example: "clean" in Turkish = "temizlemek" (not "temiz")
Only respond with the single translated word/phrase, nothing else.`;

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 50
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    let translation = data.response?.trim() || null;
    
    if (translation) {
      // Clean up - remove quotes, extra explanations
      translation = translation.replace(/^["']|["']$/g, '');
      translation = translation.split('\n')[0].trim();
      translation = translation.split('(')[0].trim(); // Remove parenthetical notes
      translation = translation.split('-')[0].trim(); // Remove dash explanations
    }
    
    return translation;
  } catch (error) {
    console.error(`   Error: ${error.message}`);
    return null;
  }
}

// Check if Ollama is running
async function checkOllama() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Ollama is running');
      console.log(`📦 Available models: ${data.models?.map(m => m.name).join(', ') || 'none'}`);
      return true;
    }
  } catch (e) {
    console.error('❌ Ollama is not running. Start it with: ollama serve');
    return false;
  }
}

// Main translation function
async function translateAllVerbs() {
  console.log('🚀 Starting verb translations with Ollama (Local LLM)\n');
  console.log(`🤖 Model: ${MODEL}\n`);
  
  // Check Ollama
  if (!(await checkOllama())) {
    process.exit(1);
  }
  
  const allVerbs = getAllVerbs();
  const langCodes = Object.keys(TARGET_LANGUAGES);
  
  console.log(`\n📊 Total verbs: ${allVerbs.length}`);
  console.log(`🌍 Total languages: ${langCodes.length}`);
  console.log(`📝 Total translations needed: ${allVerbs.length * langCodes.length}\n`);

  // Load previous progress
  let progress = loadProgress();
  
  if (progress.completedLanguages?.length > 0) {
    console.log(`📂 Resuming from previous progress...`);
    console.log(`   Completed languages: ${progress.completedLanguages.length}/${langCodes.length}`);
    console.log(`   Languages done: ${progress.completedLanguages.join(', ')}\n`);
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
    saveProgress(progress);
  }

  // Process each language
  for (let langIdx = progress.lastLanguageIndex; langIdx < langCodes.length; langIdx++) {
    const langCode = langCodes[langIdx];
    const langName = TARGET_LANGUAGES[langCode];
    
    if (progress.completedLanguages?.includes(langCode)) {
      console.log(`⏭️  Skipping ${langName} (already completed)`);
      continue;
    }

    console.log(`\n🌍 Translating to ${langName} (${langCode}) [${langIdx + 1}/${langCodes.length}]`);
    
    let successCount = 0;
    let failCount = 0;
    const startVerbIdx = (langIdx === progress.lastLanguageIndex) ? progress.lastVerbIndex : 0;

    for (let verbIdx = startVerbIdx; verbIdx < allVerbs.length; verbIdx++) {
      const { verb } = allVerbs[verbIdx];
      
      // Skip if already translated
      if (progress.translations[verb]?.translations[langCode]) {
        successCount++;
        continue;
      }

      process.stdout.write(`   [${verbIdx + 1}/${allVerbs.length}] "${verb}" -> `);
      
      const translation = await translateWithOllama(verb, langCode, langName);
      
      if (translation && translation.length < 100) {
        progress.translations[verb].translations[langCode] = {
          word: translation,
          confidence: 0.9
        };
        successCount++;
        console.log(`"${translation}"`);
      } else {
        failCount++;
        console.log(`FAILED`);
      }

      // Save progress every 5 verbs
      if (verbIdx % 5 === 0) {
        progress.lastLanguageIndex = langIdx;
        progress.lastVerbIndex = verbIdx;
        saveProgress(progress);
      }
    }

    // Mark language as completed
    if (!progress.completedLanguages) progress.completedLanguages = [];
    progress.completedLanguages.push(langCode);
    progress.lastVerbIndex = 0;
    progress.lastLanguageIndex = langIdx + 1;
    saveProgress(progress);
    
    console.log(`   ✅ ${langName}: ${successCount} translated, ${failCount} failed`);
  }

  // Generate final vocabulary JSON
  generateVocabularyJson(progress.translations);
  
  console.log('\n✨ Translation complete!');
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

// Run
translateAllVerbs().catch(console.error);
