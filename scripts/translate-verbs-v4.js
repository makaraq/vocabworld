/**
 * Translate Verbs to 46 Languages using Ollama - Version 4
 * ULTRA STRICT: Rejects ANY mixed scripts, symbols, or garbage
 * 
 * Usage: node scripts/translate-verbs-v4.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'qwen2.5:7b';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data', 'verbs-v2');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'progress.json');

const REQUEST_DELAY = 2500;  // Slower = more reliable
const MAX_RETRIES = 5;

// PURE script patterns - must be ONLY this script (with spaces/punctuation)
const SCRIPT_VALIDATORS = {
  arabic: {
    valid: /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+$/,
    has: /[\u0600-\u06FF]/
  },
  cyrillic: {
    valid: /^[\u0400-\u04FF\s\-]+$/,
    has: /[\u0400-\u04FF]/
  },
  bengali: {
    valid: /^[\u0980-\u09FF\s]+$/,
    has: /[\u0980-\u09FF]/
  },
  greek: {
    valid: /^[\u0370-\u03FF\u1F00-\u1FFF\s\-]+$/,
    has: /[\u0370-\u03FF]/
  },
  hebrew: {
    valid: /^[\u0590-\u05FF\uFB1D-\uFB4F\s]+$/,
    has: /[\u0590-\u05FF]/
  },
  devanagari: {
    valid: /^[\u0900-\u097F\s]+$/,
    has: /[\u0900-\u097F]/
  },
  japanese: {
    valid: /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\s]+$/,
    has: /[\u3040-\u30FF\u4E00-\u9FFF]/
  },
  georgian: {
    valid: /^[\u10A0-\u10FF\u2D00-\u2D2F\s]+$/,
    has: /[\u10A0-\u10FF]/
  },
  korean: {
    valid: /^[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\s]+$/,
    has: /[\uAC00-\uD7AF]/
  },
  thai: {
    valid: /^[\u0E00-\u0E7F\s]+$/,
    has: /[\u0E00-\u0E7F]/
  },
  chinese: {
    valid: /^[\u4E00-\u9FFF\u3400-\u4DBF\s]+$/,
    has: /[\u4E00-\u9FFF]/
  },
  latin: {
    valid: /^[a-zA-ZÀ-ÿĀ-žŁłŃńŚśŹźŻżÆæØøÅåÄäÖöÜüẞßČčĎďĚěŇňŘřŠšŤťŽžĐđĆćŞşĞğİıÇçÑñ\s\-']+$/,
    has: /[a-zA-Z]/
  }
};

// Language configurations
const TARGET_LANGUAGES = {
  ar: { name: 'Arabic', script: 'arabic' },
  bg: { name: 'Bulgarian', script: 'cyrillic' },
  bn: { name: 'Bengali', script: 'bengali' },
  ca: { name: 'Catalan', script: 'latin' },
  co: { name: 'Corsican', script: 'latin' },
  cs: { name: 'Czech', script: 'latin' },
  cy: { name: 'Welsh', script: 'latin' },
  da: { name: 'Danish', script: 'latin' },
  de: { name: 'German', script: 'latin' },
  el: { name: 'Greek', script: 'greek' },
  es: { name: 'Spanish', script: 'latin' },
  et: { name: 'Estonian', script: 'latin' },
  eu: { name: 'Basque', script: 'latin' },
  fa: { name: 'Persian', script: 'arabic' },
  fi: { name: 'Finnish', script: 'latin' },
  fr: { name: 'French', script: 'latin' },
  ga: { name: 'Irish', script: 'latin' },
  he: { name: 'Hebrew', script: 'hebrew' },
  hi: { name: 'Hindi', script: 'devanagari' },
  hr: { name: 'Croatian', script: 'latin' },
  hu: { name: 'Hungarian', script: 'latin' },
  it: { name: 'Italian', script: 'latin' },
  ja: { name: 'Japanese', script: 'japanese' },
  ka: { name: 'Georgian', script: 'georgian' },
  ko: { name: 'Korean', script: 'korean' },
  lb: { name: 'Luxembourgish', script: 'latin' },
  lt: { name: 'Lithuanian', script: 'latin' },
  lv: { name: 'Latvian', script: 'latin' },
  mk: { name: 'Macedonian', script: 'cyrillic' },
  mt: { name: 'Maltese', script: 'latin' },
  nl: { name: 'Dutch', script: 'latin' },
  no: { name: 'Norwegian', script: 'latin' },
  pl: { name: 'Polish', script: 'latin' },
  pt: { name: 'Portuguese', script: 'latin' },
  ro: { name: 'Romanian', script: 'latin' },
  ru: { name: 'Russian', script: 'cyrillic' },
  sk: { name: 'Slovak', script: 'latin' },
  sl: { name: 'Slovenian', script: 'latin' },
  sq: { name: 'Albanian', script: 'latin' },
  sr: { name: 'Serbian', script: 'cyrillic' },
  sv: { name: 'Swedish', script: 'latin' },
  th: { name: 'Thai', script: 'thai' },
  tr: { name: 'Turkish', script: 'latin' },
  uk: { name: 'Ukrainian', script: 'cyrillic' },
  vi: { name: 'Vietnamese', script: 'latin' },
  zh: { name: 'Chinese', script: 'chinese' }
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

// STRICT validation - rejects any garbage
function validateTranslation(text, langCode, langInfo, originalVerb) {
  if (!text || text.length === 0) {
    return { valid: false, reason: 'empty' };
  }

  // Remove any control characters
  text = text.replace(/[\x00-\x1F\x7F]/g, '').trim();
  
  if (text.length === 0) {
    return { valid: false, reason: 'only_control_chars' };
  }

  // Reject if contains any symbols/punctuation that shouldn't be there
  const badChars = /[*><|\\/@#$%^&(){}[\]=+;:"!?.,0-9]/;
  if (badChars.test(text)) {
    return { valid: false, reason: 'contains_bad_chars' };
  }

  // Length checks
  if (text.length > 35) {
    return { valid: false, reason: 'too_long' };
  }
  
  if (text.length < 2) {
    return { valid: false, reason: 'too_short' };
  }

  // Word count check
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount > 4) {
    return { valid: false, reason: 'too_many_words' };
  }

  // Get script validator
  const validator = SCRIPT_VALIDATORS[langInfo.script];
  if (!validator) {
    return { valid: false, reason: 'unknown_script' };
  }

  // Check if text is PURELY in the correct script (no mixing)
  if (!validator.valid.test(text)) {
    return { valid: false, reason: 'mixed_or_wrong_script' };
  }

  // For non-latin scripts, ensure it actually HAS characters from that script
  if (langInfo.script !== 'latin') {
    if (!validator.has.test(text)) {
      return { valid: false, reason: 'missing_script_chars' };
    }
  }

  // For latin scripts - check it's not just the English word
  if (langInfo.script === 'latin') {
    const lowerText = text.toLowerCase();
    const lowerOriginal = originalVerb.toLowerCase();
    
    // Exact match with English is suspicious for most languages
    if (lowerText === lowerOriginal) {
      // Only allow for truly similar languages where cognates exist
      const cognateOK = ['es', 'fr', 'it', 'pt', 'ca', 'ro', 'nl', 'de'].includes(langCode);
      if (!cognateOK) {
        return { valid: false, reason: 'same_as_english' };
      }
    }
    
    // Check for common English words appearing
    const englishWords = ['the', 'to', 'is', 'are', 'a', 'an', 'in', 'on', 'at', 'for', 'of', 'with', 'and', 'or', 'but', 'not', 'this', 'that', 'it', 'team', 'work'];
    const words = lowerText.split(/\s+/);
    for (const word of words) {
      if (englishWords.includes(word) && word !== lowerOriginal) {
        return { valid: false, reason: 'contains_english_word' };
      }
    }
  }

  return { valid: true, cleaned: text };
}

// Clean raw LLM response
function cleanResponse(rawText) {
  if (!rawText) return null;
  
  let text = rawText.trim();
  
  // Take first line only
  text = text.split('\n')[0].trim();
  
  // Remove quotes of any kind
  text = text.replace(/^["'`«»„"‚']+|["'`«»"„‚']+$/g, '');
  
  // Remove common LLM prefixes
  const prefixes = [
    /^(The\s+)?\w+\s+translation\s+(is|for)[:\s]*/i,
    /^(Translation|Answer|Result|Output|Word)[:\s]*/i,
    /^In\s+\w+[:\s]*/i,
    /^The\s+verb\s+(is|for)[:\s]*/i,
    /^\w+:\s*/,  // Language: word
  ];
  
  for (const prefix of prefixes) {
    text = text.replace(prefix, '');
  }
  
  // Remove anything in parentheses
  text = text.replace(/\s*\([^)]*\)\s*/g, ' ');
  
  // Remove explanations after punctuation
  text = text.split(/\s*[-–—:]\s+/)[0];
  text = text.split(/,\s+/)[0];
  
  // Take first option if / separated
  if (text.includes('/')) {
    text = text.split('/')[0];
  }
  
  // Remove "to " prefix
  text = text.replace(/^to\s+/i, '');
  
  return text.trim();
}

// Get unique verbs
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

// Progress management
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (e) {}
  return { completedLanguages: [], currentLanguage: null, currentVerbIndex: 0 };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Call Ollama
async function callOllama(prompt) {
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
          num_predict: 20,  // Very short
          top_p: 0.7,
          top_k: 5,
          repeat_penalty: 1.5
        }
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.response || null;
  } catch (e) {
    return null;
  }
}

// Translate with multiple prompt strategies
async function translateVerb(verb, langCode, langInfo) {
  const prompts = [
    // Strategy 1: Ultra minimal
    `${langInfo.name}: ${verb} =`,
    
    // Strategy 2: Direct translation request  
    `Translate "${verb}" to ${langInfo.name}. One word only:`,
    
    // Strategy 3: Format enforced
    `Give me ONLY the ${langInfo.name} word for "${verb}". No English, no explanation:`,
    
    // Strategy 4: Dictionary style
    `${verb} (English verb) → ${langInfo.name}:`,
    
    // Strategy 5: Last resort
    `What is "${verb}" in ${langInfo.name}? Reply with just the ${langInfo.name} word.`
  ];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const prompt = prompts[Math.min(attempt, prompts.length - 1)];
    const rawResponse = await callOllama(prompt);
    const cleaned = cleanResponse(rawResponse);
    const validation = validateTranslation(cleaned, langCode, langInfo, verb);
    
    if (validation.valid) {
      return validation.cleaned;
    }
    
    // Log failure reason for debugging
    if (attempt === MAX_RETRIES - 1) {
      console.log(` [${validation.reason}]`);
    }
    
    await sleep(500);
  }
  
  return null;
}

// Check Ollama is ready
async function checkOllama() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      const hasModel = data.models?.some(m => m.name.includes('qwen2.5'));
      if (!hasModel) {
        console.log('⚠ qwen2.5:7b not found. Run: ollama pull qwen2.5:7b');
        return false;
      }
      return true;
    }
  } catch (e) {}
  console.log('⚠ Ollama not running. Start with: ollama serve');
  return false;
}

// Translate all verbs for one language
async function translateLanguage(langCode, langInfo, verbs, progress) {
  const outputFile = path.join(OUTPUT_DIR, `${langCode}.json`);
  let translations = {};
  let startIndex = 0;
  
  // Resume if needed
  if (progress.currentLanguage === langCode && fs.existsSync(outputFile)) {
    try {
      translations = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      startIndex = progress.currentVerbIndex;
      console.log(`   Resuming from ${startIndex + 1}/${verbs.length}`);
    } catch (e) {}
  }
  
  let successCount = 0;
  let failCount = 0;
  const failed = [];
  
  for (let i = startIndex; i < verbs.length; i++) {
    const { verb, category } = verbs[i];
    
    // Skip already translated
    if (translations[verb]?.translation) {
      successCount++;
      continue;
    }
    
    process.stdout.write(`   [${i + 1}/${verbs.length}] "${verb}"...`);
    
    const translation = await translateVerb(verb, langCode, langInfo);
    
    if (translation) {
      translations[verb] = { translation, category };
      successCount++;
      console.log(` ✓ ${translation}`);
    } else {
      translations[verb] = { translation: null, category, failed: true };
      failCount++;
      failed.push(verb);
      console.log(` ✗`);
    }
    
    // Save every 10 verbs
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(outputFile, JSON.stringify(translations, null, 2));
      progress.currentVerbIndex = i + 1;
      saveProgress(progress);
    }
    
    await sleep(REQUEST_DELAY);
  }
  
  // Final save
  fs.writeFileSync(outputFile, JSON.stringify(translations, null, 2));
  
  return { successCount, failCount, failed };
}

// Main
async function main() {
  console.log('═'.repeat(60));
  console.log('  VERB TRANSLATION v4 - ULTRA STRICT VALIDATION');
  console.log('═'.repeat(60));
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  if (!await checkOllama()) {
    process.exit(1);
  }
  
  const verbs = getUniqueVerbs();
  const langCodes = Object.keys(TARGET_LANGUAGES);
  
  console.log(`\n  Verbs: ${verbs.length}`);
  console.log(`  Languages: ${langCodes.length}`);
  console.log(`  Total translations: ${verbs.length * langCodes.length}`);
  console.log(`  Est. time: ~${Math.ceil((verbs.length * langCodes.length * REQUEST_DELAY) / 60000)} min\n`);
  
  const progress = loadProgress();
  
  // Find start position
  let startLangIndex = 0;
  if (progress.currentLanguage) {
    startLangIndex = Math.max(0, langCodes.indexOf(progress.currentLanguage));
  }
  while (progress.completedLanguages.includes(langCodes[startLangIndex]) && startLangIndex < langCodes.length) {
    startLangIndex++;
  }
  
  const summary = [];
  
  for (let li = startLangIndex; li < langCodes.length; li++) {
    const langCode = langCodes[li];
    const langInfo = TARGET_LANGUAGES[langCode];
    
    console.log(`\n[${li + 1}/${langCodes.length}] ${langInfo.name} (${langCode})`);
    console.log('─'.repeat(40));
    
    progress.currentLanguage = langCode;
    progress.currentVerbIndex = 0;
    saveProgress(progress);
    
    const result = await translateLanguage(langCode, langInfo, verbs, progress);
    
    summary.push({
      lang: langCode,
      name: langInfo.name,
      success: result.successCount,
      failed: result.failCount,
      failedVerbs: result.failed
    });
    
    progress.completedLanguages.push(langCode);
    progress.currentLanguage = null;
    progress.currentVerbIndex = 0;
    saveProgress(progress);
    
    const pct = Math.round((result.successCount / verbs.length) * 100);
    console.log(`   ✓ ${result.successCount}/${verbs.length} (${pct}%) | ✗ ${result.failCount} failed`);
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('  COMPLETE');
  console.log('═'.repeat(60));
  
  const needsReview = summary.filter(s => s.failed > 0);
  if (needsReview.length > 0) {
    console.log('\n  ⚠ Languages with failures:');
    for (const s of needsReview) {
      console.log(`    ${s.name}: ${s.failed} verbs need manual review`);
    }
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'needs-review.json'),
      JSON.stringify(needsReview, null, 2)
    );
  }
  
  console.log(`\n  Output: ${OUTPUT_DIR}`);
  console.log('  ✓ Done!\n');
}

main().catch(console.error);
