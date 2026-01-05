/**
 * Translate Verbs to 46 Languages using Ollama (Local LLM) - Version 2
 * IMPROVED: Better prompts, validation, and error handling for accurate translations
 * 
 * Features:
 * - Strict validation to reject bad translations
 * - Multiple attempts with different prompts if needed
 * - Character count validation per language
 * - Saves each language to separate file
 * - Resume capability
 * 
 * Usage: node scripts/translate-verbs-v2.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'qwen2.5:7b';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data', 'verbs-v2');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'progress.json');

// Delay between requests (ms) - slower but more reliable
const REQUEST_DELAY = 1500;
const MAX_RETRIES = 3;

// 46 Target Languages with expected script info
const TARGET_LANGUAGES = {
  ar: { name: 'Arabic', script: 'arabic', maxLen: 50 },
  bg: { name: 'Bulgarian', script: 'cyrillic', maxLen: 50 },
  bn: { name: 'Bengali', script: 'bengali', maxLen: 50 },
  ca: { name: 'Catalan', script: 'latin', maxLen: 50 },
  co: { name: 'Corsican', script: 'latin', maxLen: 50 },
  cs: { name: 'Czech', script: 'latin', maxLen: 50 },
  cy: { name: 'Welsh', script: 'latin', maxLen: 50 },
  da: { name: 'Danish', script: 'latin', maxLen: 50 },
  de: { name: 'German', script: 'latin', maxLen: 50 },
  el: { name: 'Greek', script: 'greek', maxLen: 50 },
  es: { name: 'Spanish', script: 'latin', maxLen: 50 },
  et: { name: 'Estonian', script: 'latin', maxLen: 50 },
  eu: { name: 'Basque', script: 'latin', maxLen: 50 },
  fa: { name: 'Persian', script: 'arabic', maxLen: 50 },
  fi: { name: 'Finnish', script: 'latin', maxLen: 50 },
  fr: { name: 'French', script: 'latin', maxLen: 50 },
  ga: { name: 'Irish', script: 'latin', maxLen: 50 },
  he: { name: 'Hebrew', script: 'hebrew', maxLen: 50 },
  hi: { name: 'Hindi', script: 'devanagari', maxLen: 50 },
  hr: { name: 'Croatian', script: 'latin', maxLen: 50 },
  hu: { name: 'Hungarian', script: 'latin', maxLen: 50 },
  it: { name: 'Italian', script: 'latin', maxLen: 50 },
  ja: { name: 'Japanese', script: 'japanese', maxLen: 30 },
  ka: { name: 'Georgian', script: 'georgian', maxLen: 50 },
  ko: { name: 'Korean', script: 'korean', maxLen: 30 },
  lb: { name: 'Luxembourgish', script: 'latin', maxLen: 50 },
  lt: { name: 'Lithuanian', script: 'latin', maxLen: 50 },
  lv: { name: 'Latvian', script: 'latin', maxLen: 50 },
  mk: { name: 'Macedonian', script: 'cyrillic', maxLen: 50 },
  mt: { name: 'Maltese', script: 'latin', maxLen: 50 },
  nl: { name: 'Dutch', script: 'latin', maxLen: 50 },
  no: { name: 'Norwegian', script: 'latin', maxLen: 50 },
  pl: { name: 'Polish', script: 'latin', maxLen: 50 },
  pt: { name: 'Portuguese', script: 'latin', maxLen: 50 },
  ro: { name: 'Romanian', script: 'latin', maxLen: 50 },
  ru: { name: 'Russian', script: 'cyrillic', maxLen: 50 },
  sk: { name: 'Slovak', script: 'latin', maxLen: 50 },
  sl: { name: 'Slovenian', script: 'latin', maxLen: 50 },
  sq: { name: 'Albanian', script: 'latin', maxLen: 50 },
  sr: { name: 'Serbian', script: 'cyrillic', maxLen: 50 },
  sv: { name: 'Swedish', script: 'latin', maxLen: 50 },
  th: { name: 'Thai', script: 'thai', maxLen: 50 },
  tr: { name: 'Turkish', script: 'latin', maxLen: 50 },
  uk: { name: 'Ukrainian', script: 'cyrillic', maxLen: 50 },
  vi: { name: 'Vietnamese', script: 'latin', maxLen: 50 },
  zh: { name: 'Chinese', script: 'chinese', maxLen: 20 }
};

// Complete verb list by category
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
    "care", "worry", "fear", "panic", "stress", "relax", "calm", "appreciate", "value", "respect",
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
    "meet", "greet", "welcome", "visit", "invite", "host", "join", "help", "support", "assist",
    "share", "care for", "hug", "kiss", "hold hands", "date", "marry", "befriend", "follow", "lead",
    "guide", "introduce", "cooperate", "protect", "include", "exclude"
  ],
  "Work": [
    "work", "write", "read", "edit", "revise", "review", "inspect", "check", "complete", "submit",
    "organize", "schedule", "cancel", "prepare", "create", "design", "build", "assemble", "debug", "research",
    "document", "train", "teach", "learn", "report", "update", "upload", "download", "print", "scan",
    "record", "calculate", "track", "manage", "supervise", "analyze", "improve", "evaluate", "plan"
  ],
  "Travel": [
    "go", "come", "move", "leave", "arrive", "enter", "exit", "travel", "fly", "drive",
    "ride", "board", "land", "park", "stop", "accelerate", "reverse", "turn", "cross", "wander",
    "explore", "visit", "return", "rush", "hurry", "follow", "lead", "navigate"
  ],
  "Household": [
    "clean", "wash", "wipe", "dust", "scrub", "rinse", "sanitize", "fold", "iron", "store",
    "organize", "arrange", "repair", "fix", "assemble", "disassemble", "install", "uninstall", "replace", "remove",
    "connect", "disconnect", "charge", "lock", "unlock", "decorate", "polish", "hammer", "saw", "glue"
  ],
  "Money": [
    "buy", "sell", "pay", "owe", "borrow", "lend", "rent", "save", "spend", "invest",
    "earn", "refund", "exchange", "order", "return", "compare", "select", "choose", "calculate", "withdraw",
    "deposit", "budget"
  ],
  "Food": [
    "eat", "drink", "cook", "bake", "fry", "grill", "boil", "steam", "slice", "cut",
    "chop", "mix", "stir", "pour", "serve", "taste", "season", "marinate", "chew", "swallow",
    "order", "deliver", "pack", "digest"
  ],
  "Nature": [
    "rain", "snow", "hail", "sleet", "freeze", "melt", "shine", "blow", "grow", "bloom",
    "wither", "sprout", "fall", "quake", "erode", "burn", "flood", "float", "sink", "rise", "set"
  ],
  "Health": [
    "breathe", "inhale", "exhale", "cough", "sneeze", "sweat", "bleed", "heal", "recover", "ache",
    "hurt", "strain", "stretch", "exercise", "train", "rest", "faint", "vomit", "digest", "blink",
    "squint", "tremble"
  ],
  "Technology": [
    "click", "tap", "scroll", "swipe", "search", "browse", "install", "uninstall", "update", "upgrade",
    "download", "upload", "save", "copy", "paste", "delete", "remove", "reset", "restart", "log in",
    "log out", "connect", "sync", "scan", "stream", "record", "charge", "encrypt", "backup"
  ]
};

// Get unique verbs (remove duplicates across categories)
function getUniqueVerbs() {
  const verbMap = new Map();
  for (const [category, verbs] of Object.entries(VERBS_BY_CATEGORY)) {
    for (const verb of verbs) {
      if (!verbMap.has(verb)) {
        verbMap.set(verb, category);
      }
    }
  }
  return Array.from(verbMap.entries()).map(([verb, category]) => ({ verb, category }));
}

// Load progress
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (e) {}
  return { completedLanguages: [], currentLanguage: null, currentVerbIndex: 0 };
}

// Save progress
function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// Validate translation
function validateTranslation(original, translation, langInfo) {
  if (!translation) return { valid: false, reason: 'empty' };
  
  // Remove common noise
  translation = translation.trim();
  
  // Check for obvious problems
  if (translation.length > langInfo.maxLen) {
    return { valid: false, reason: 'too_long' };
  }
  
  // Check if it's just the English word repeated
  if (translation.toLowerCase() === original.toLowerCase()) {
    return { valid: false, reason: 'same_as_english' };
  }
  
  // Check if it starts with capital when original doesn't (except for German/proper nouns)
  if (langInfo.script === 'latin' && langInfo.name !== 'German') {
    if (/^[A-Z]/.test(translation) && /^[a-z]/.test(original)) {
      // Lowercase it
      translation = translation.charAt(0).toLowerCase() + translation.slice(1);
    }
  }
  
  // Check for unwanted patterns
  const badPatterns = [
    /^["'].*["']$/,  // Quoted
    /\(.*\)/,        // Parentheses
    /^Note:/i,       // Explanations
    /^Translation:/i,
    /^The\s/i,       // Starting with "The"
    /^To\s/i,        // Starting with "To"
    /in\s+\w+\s*:/i, // "in [language]:"
    /\n/,            // Newlines
    /^\d+\./,        // Numbered list
    /^-\s/,          // Bullet points
  ];
  
  for (const pattern of badPatterns) {
    if (pattern.test(translation)) {
      return { valid: false, reason: 'bad_pattern', pattern: pattern.toString() };
    }
  }
  
  // Check word count - verbs should be short
  const wordCount = translation.split(/\s+/).length;
  if (wordCount > 5) {
    return { valid: false, reason: 'too_many_words', wordCount };
  }
  
  return { valid: true, cleaned: translation };
}

// Clean and extract just the translation
function extractTranslation(response, original) {
  if (!response) return null;
  
  let text = response.trim();
  
  // Remove quotes
  text = text.replace(/^["'`]+|["'`]+$/g, '');
  
  // Take only first line
  text = text.split('\n')[0].trim();
  
  // Remove common prefixes
  text = text.replace(/^(Translation|Answer|Result|Output):\s*/i, '');
  
  // Remove parenthetical notes
  text = text.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  
  // Remove trailing explanations after dash or colon
  text = text.split(/\s*[-–—:]\s*/)[0].trim();
  
  // If multiple words separated by /, take the first one
  if (text.includes('/')) {
    text = text.split('/')[0].trim();
  }
  
  return text;
}

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Translate with Ollama - improved prompt
async function translateWithOllama(verb, langCode, langInfo, attempt = 1) {
  // Different prompt strategies based on attempt
  const prompts = [
    // Attempt 1: Direct and simple
    `Translate the English verb "${verb}" to ${langInfo.name}. Reply with ONLY the ${langInfo.name} word, nothing else.`,
    
    // Attempt 2: More context
    `What is the ${langInfo.name} translation of the verb "${verb}"? Give only the single word/phrase in ${langInfo.name}, no explanation.`,
    
    // Attempt 3: Even more explicit
    `I need the ${langInfo.name} verb for "${verb}". Output format: just the translated verb in ${langInfo.name} script. No English, no explanation, no quotes.`
  ];
  
  const prompt = prompts[Math.min(attempt - 1, prompts.length - 1)];
  
  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,  // Very low for consistency
          num_predict: 30,   // Short output
          top_p: 0.9,
          repeat_penalty: 1.2
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.response || null;
  } catch (error) {
    console.error(`   Error: ${error.message}`);
    return null;
  }
}

// Translate single verb with retries and validation
async function translateVerb(verb, langCode, langInfo) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const rawResponse = await translateWithOllama(verb, langCode, langInfo, attempt);
    const extracted = extractTranslation(rawResponse, verb);
    const validation = validateTranslation(verb, extracted, langInfo);
    
    if (validation.valid) {
      return validation.cleaned;
    }
    
    if (attempt < MAX_RETRIES) {
      console.log(`   Retry ${attempt + 1}/${MAX_RETRIES} for "${verb}" (${validation.reason})`);
      await sleep(500);
    }
  }
  
  // If all retries fail, return null (will be marked for manual review)
  console.log(`   ⚠ Failed validation for "${verb}" after ${MAX_RETRIES} attempts`);
  return null;
}

// Check if Ollama is running
async function checkOllama() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      const hasModel = data.models?.some(m => m.name.includes('qwen2.5:7b'));
      if (!hasModel) {
        console.log('⚠ qwen2.5:7b model not found. Run: ollama pull qwen2.5:7b');
        return false;
      }
      return true;
    }
  } catch (e) {}
  console.log('⚠ Ollama not running. Start it with: ollama serve');
  return false;
}

// Translate all verbs for a single language
async function translateLanguage(langCode, langInfo, verbs, progress) {
  const outputFile = path.join(OUTPUT_DIR, `${langCode}.json`);
  let translations = {};
  let startIndex = 0;
  
  // Load existing translations for this language if resuming
  if (progress.currentLanguage === langCode && fs.existsSync(outputFile)) {
    try {
      translations = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      startIndex = progress.currentVerbIndex;
      console.log(`   Resuming from verb ${startIndex + 1}/${verbs.length}`);
    } catch (e) {}
  }
  
  const failed = [];
  
  for (let i = startIndex; i < verbs.length; i++) {
    const { verb, category } = verbs[i];
    
    // Skip if already translated
    if (translations[verb]) {
      continue;
    }
    
    process.stdout.write(`   [${i + 1}/${verbs.length}] "${verb}"...`);
    
    const translation = await translateVerb(verb, langCode, langInfo);
    
    if (translation) {
      translations[verb] = { translation, category };
      console.log(` ✓ ${translation}`);
    } else {
      failed.push(verb);
      translations[verb] = { translation: null, category, needsReview: true };
      console.log(` ✗ FAILED`);
    }
    
    // Save progress every 10 verbs
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(outputFile, JSON.stringify(translations, null, 2));
      progress.currentVerbIndex = i + 1;
      saveProgress(progress);
    }
    
    await sleep(REQUEST_DELAY);
  }
  
  // Final save
  fs.writeFileSync(outputFile, JSON.stringify(translations, null, 2));
  
  return { translations, failed };
}

// Main function
async function main() {
  console.log('='.repeat(60));
  console.log('VERB TRANSLATION v2 - Accurate Translations');
  console.log('='.repeat(60));
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Check Ollama
  if (!await checkOllama()) {
    process.exit(1);
  }
  
  // Get unique verbs
  const verbs = getUniqueVerbs();
  console.log(`\nTotal unique verbs: ${verbs.length}`);
  console.log(`Total languages: ${Object.keys(TARGET_LANGUAGES).length}`);
  console.log(`Estimated time: ~${Math.ceil((verbs.length * Object.keys(TARGET_LANGUAGES).length * REQUEST_DELAY) / 60000)} minutes\n`);
  
  // Load progress
  const progress = loadProgress();
  const langCodes = Object.keys(TARGET_LANGUAGES);
  
  // Find starting language
  let startLangIndex = 0;
  if (progress.currentLanguage) {
    startLangIndex = langCodes.indexOf(progress.currentLanguage);
    if (startLangIndex === -1) startLangIndex = 0;
  }
  
  // Skip completed languages
  for (const completed of progress.completedLanguages) {
    const idx = langCodes.indexOf(completed);
    if (idx !== -1 && idx < startLangIndex) continue;
    if (idx === startLangIndex) startLangIndex++;
  }
  
  const totalFailed = [];
  
  // Process each language
  for (let li = startLangIndex; li < langCodes.length; li++) {
    const langCode = langCodes[li];
    const langInfo = TARGET_LANGUAGES[langCode];
    
    console.log(`\n[${ li + 1}/${langCodes.length}] ${langInfo.name} (${langCode})`);
    console.log('-'.repeat(40));
    
    progress.currentLanguage = langCode;
    progress.currentVerbIndex = 0;
    saveProgress(progress);
    
    const { translations, failed } = await translateLanguage(langCode, langInfo, verbs, progress);
    
    if (failed.length > 0) {
      totalFailed.push({ langCode, langName: langInfo.name, failed });
    }
    
    // Mark language as complete
    progress.completedLanguages.push(langCode);
    progress.currentLanguage = null;
    progress.currentVerbIndex = 0;
    saveProgress(progress);
    
    const successCount = Object.values(translations).filter(t => t.translation).length;
    console.log(`   Completed: ${successCount}/${verbs.length} (${failed.length} need review)`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TRANSLATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Output directory: ${OUTPUT_DIR}`);
  
  if (totalFailed.length > 0) {
    console.log('\n⚠ Some translations need manual review:');
    for (const { langCode, langName, failed } of totalFailed) {
      console.log(`   ${langName} (${langCode}): ${failed.length} verbs`);
    }
    
    // Save failed list
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'needs-review.json'),
      JSON.stringify(totalFailed, null, 2)
    );
  }
  
  console.log('\n✓ Done!');
}

main().catch(console.error);
