/**
 * Translate Verbs to 46 Languages using Ollama - Version 3
 * STRICT VALIDATION: Ensures translations are in correct script/language
 * 
 * Usage: node scripts/translate-verbs-v3.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'qwen2.5:7b';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data', 'verbs-v2');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'progress.json');

const REQUEST_DELAY = 2000;  // 2 seconds between requests
const MAX_RETRIES = 4;

// Script detection patterns
const SCRIPT_PATTERNS = {
  arabic: /[\u0600-\u06FF\u0750-\u077F]/,
  cyrillic: /[\u0400-\u04FF]/,
  bengali: /[\u0980-\u09FF]/,
  latin: /^[a-zA-ZÀ-ÿĀ-žŁłŃńŚśŹźŻżÆæØøÅåÄäÖöÜüẞß\s\-']+$/,
  greek: /[\u0370-\u03FF]/,
  hebrew: /[\u0590-\u05FF]/,
  devanagari: /[\u0900-\u097F]/,
  japanese: /[\u3040-\u30FF\u4E00-\u9FFF]/,
  georgian: /[\u10A0-\u10FF]/,
  korean: /[\uAC00-\uD7AF\u1100-\u11FF]/,
  thai: /[\u0E00-\u0E7F]/,
  chinese: /[\u4E00-\u9FFF]/,
  vietnamese: /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i
};

// Language configurations with script requirements
const TARGET_LANGUAGES = {
  ar: { name: 'Arabic', script: 'arabic', mustHaveScript: true },
  bg: { name: 'Bulgarian', script: 'cyrillic', mustHaveScript: true },
  bn: { name: 'Bengali', script: 'bengali', mustHaveScript: true },
  ca: { name: 'Catalan', script: 'latin', mustHaveScript: false },
  co: { name: 'Corsican', script: 'latin', mustHaveScript: false },
  cs: { name: 'Czech', script: 'latin', mustHaveScript: false },
  cy: { name: 'Welsh', script: 'latin', mustHaveScript: false },
  da: { name: 'Danish', script: 'latin', mustHaveScript: false },
  de: { name: 'German', script: 'latin', mustHaveScript: false },
  el: { name: 'Greek', script: 'greek', mustHaveScript: true },
  es: { name: 'Spanish', script: 'latin', mustHaveScript: false },
  et: { name: 'Estonian', script: 'latin', mustHaveScript: false },
  eu: { name: 'Basque', script: 'latin', mustHaveScript: false },
  fa: { name: 'Persian', script: 'arabic', mustHaveScript: true },
  fi: { name: 'Finnish', script: 'latin', mustHaveScript: false },
  fr: { name: 'French', script: 'latin', mustHaveScript: false },
  ga: { name: 'Irish', script: 'latin', mustHaveScript: false },
  he: { name: 'Hebrew', script: 'hebrew', mustHaveScript: true },
  hi: { name: 'Hindi', script: 'devanagari', mustHaveScript: true },
  hr: { name: 'Croatian', script: 'latin', mustHaveScript: false },
  hu: { name: 'Hungarian', script: 'latin', mustHaveScript: false },
  it: { name: 'Italian', script: 'latin', mustHaveScript: false },
  ja: { name: 'Japanese', script: 'japanese', mustHaveScript: true },
  ka: { name: 'Georgian', script: 'georgian', mustHaveScript: true },
  ko: { name: 'Korean', script: 'korean', mustHaveScript: true },
  lb: { name: 'Luxembourgish', script: 'latin', mustHaveScript: false },
  lt: { name: 'Lithuanian', script: 'latin', mustHaveScript: false },
  lv: { name: 'Latvian', script: 'latin', mustHaveScript: false },
  mk: { name: 'Macedonian', script: 'cyrillic', mustHaveScript: true },
  mt: { name: 'Maltese', script: 'latin', mustHaveScript: false },
  nl: { name: 'Dutch', script: 'latin', mustHaveScript: false },
  no: { name: 'Norwegian', script: 'latin', mustHaveScript: false },
  pl: { name: 'Polish', script: 'latin', mustHaveScript: false },
  pt: { name: 'Portuguese', script: 'latin', mustHaveScript: false },
  ro: { name: 'Romanian', script: 'latin', mustHaveScript: false },
  ru: { name: 'Russian', script: 'cyrillic', mustHaveScript: true },
  sk: { name: 'Slovak', script: 'latin', mustHaveScript: false },
  sl: { name: 'Slovenian', script: 'latin', mustHaveScript: false },
  sq: { name: 'Albanian', script: 'latin', mustHaveScript: false },
  sr: { name: 'Serbian', script: 'cyrillic', mustHaveScript: true },
  sv: { name: 'Swedish', script: 'latin', mustHaveScript: false },
  th: { name: 'Thai', script: 'thai', mustHaveScript: true },
  tr: { name: 'Turkish', script: 'latin', mustHaveScript: false },
  uk: { name: 'Ukrainian', script: 'cyrillic', mustHaveScript: true },
  vi: { name: 'Vietnamese', script: 'latin', mustHaveScript: false, hasVietnamese: true },
  zh: { name: 'Chinese', script: 'chinese', mustHaveScript: true }
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

// Check if text contains the required script
function hasCorrectScript(text, langCode, langInfo) {
  const pattern = SCRIPT_PATTERNS[langInfo.script];
  
  // For non-latin scripts that must have their script
  if (langInfo.mustHaveScript && pattern) {
    return pattern.test(text);
  }
  
  // For Vietnamese, check for tone marks
  if (langInfo.hasVietnamese) {
    return SCRIPT_PATTERNS.vietnamese.test(text) || SCRIPT_PATTERNS.latin.test(text);
  }
  
  // For latin scripts, ensure it's not just English
  if (langInfo.script === 'latin') {
    // Check it's valid latin
    return SCRIPT_PATTERNS.latin.test(text);
  }
  
  return true;
}

// Check if text is pure English (to reject)
function isPureEnglish(text, original) {
  // Common English words that shouldn't appear as translations
  const englishWords = ['the', 'to', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'can', 'this', 'that', 'these', 'those', 'here', 'there', 'where', 'when', 'what',
    'which', 'who', 'how', 'why', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'any', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
    'very', 'just', 'also', 'now', 'new', 'old', 'high', 'long', 'little', 'big',
    'small', 'large', 'good', 'great', 'first', 'last', 'next', 'back', 'still', 'well'];
  
  const lowerText = text.toLowerCase();
  
  // If it matches the original exactly
  if (lowerText === original.toLowerCase()) {
    return true;
  }
  
  // If it contains common English words
  const words = lowerText.split(/\s+/);
  for (const word of words) {
    if (englishWords.includes(word)) {
      return true;
    }
  }
  
  // Check if it looks like an English verb form
  if (/^(to\s+)?\w+(ing|ed|s|es)$/i.test(text)) {
    return true;
  }
  
  return false;
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

// Load/Save progress
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

// Clean the response
function cleanTranslation(text) {
  if (!text) return null;
  
  let cleaned = text.trim();
  
  // Remove quotes
  cleaned = cleaned.replace(/^["'`«»„"]+|["'`«»"„]+$/g, '');
  
  // Take only first line
  cleaned = cleaned.split('\n')[0].trim();
  
  // Remove common prefixes
  cleaned = cleaned.replace(/^(Translation|Answer|Result|Output|The\s+\w+\s+translation\s+is|In\s+\w+):\s*/i, '');
  
  // Remove parenthetical notes
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  
  // Remove trailing explanations
  cleaned = cleaned.split(/\s*[-–—:,]\s+(?=[A-Z]|this|which|meaning)/)[0].trim();
  
  // Remove "to " prefix for infinitive
  cleaned = cleaned.replace(/^to\s+/i, '');
  
  // Take first option if multiple given with /
  if (cleaned.includes(' / ')) {
    cleaned = cleaned.split(' / ')[0].trim();
  }
  
  return cleaned;
}

// Validate translation
function validateTranslation(original, translation, langCode, langInfo) {
  if (!translation || translation.length === 0) {
    return { valid: false, reason: 'empty' };
  }
  
  // Too long
  if (translation.length > 40) {
    return { valid: false, reason: 'too_long' };
  }
  
  // Too many words
  const wordCount = translation.split(/\s+/).length;
  if (wordCount > 4) {
    return { valid: false, reason: 'too_many_words' };
  }
  
  // Check for correct script
  if (!hasCorrectScript(translation, langCode, langInfo)) {
    return { valid: false, reason: 'wrong_script' };
  }
  
  // Check if it's pure English (for non-English scripts this is always bad)
  if (langInfo.mustHaveScript && isPureEnglish(translation, original)) {
    return { valid: false, reason: 'english_detected' };
  }
  
  // For latin scripts, additional check
  if (langInfo.script === 'latin' && !langInfo.mustHaveScript) {
    // If it's exactly the English word for non-cognate languages
    if (translation.toLowerCase() === original.toLowerCase()) {
      // Allow cognates for some languages (they exist)
      const cognateLanguages = ['es', 'fr', 'it', 'pt', 'ca', 'ro'];
      if (!cognateLanguages.includes(langCode)) {
        return { valid: false, reason: 'same_as_english' };
      }
    }
  }
  
  return { valid: true, cleaned: translation };
}

// Translate with Ollama
async function translateWithOllama(verb, langCode, langInfo, attempt) {
  const prompts = [
    // Attempt 1: Very direct
    `Translate to ${langInfo.name}: "${verb}" (verb/action word). Reply with ONLY the ${langInfo.name} word.`,
    
    // Attempt 2: More context  
    `How do you say the verb "${verb}" in ${langInfo.name}? Answer with just the ${langInfo.name} word, no English.`,
    
    // Attempt 3: Explicit format
    `Give me the ${langInfo.name} translation for the action "${verb}". Format: only the ${langInfo.name} word, nothing else.`,
    
    // Attempt 4: Different approach
    `${langInfo.name} verb for "${verb}": (respond in ${langInfo.name} only)`
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
          temperature: 0.05,  // Very low
          num_predict: 25,    // Short
          top_p: 0.8,
          top_k: 10,
          repeat_penalty: 1.5
        }
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.response || null;
  } catch (error) {
    return null;
  }
}

// Translate single verb with retries
async function translateVerb(verb, langCode, langInfo) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const rawResponse = await translateWithOllama(verb, langCode, langInfo, attempt);
    const cleaned = cleanTranslation(rawResponse);
    const validation = validateTranslation(verb, cleaned, langCode, langInfo);
    
    if (validation.valid) {
      return validation.cleaned;
    }
    
    if (attempt < MAX_RETRIES) {
      await sleep(800);
    }
  }
  
  return null;  // Failed - mark for manual review
}

// Check Ollama
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
  console.log('⚠ Ollama not running. Start: ollama serve');
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
  
  const failed = [];
  let successCount = 0;
  
  for (let i = startIndex; i < verbs.length; i++) {
    const { verb, category } = verbs[i];
    
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
      failed.push(verb);
      translations[verb] = { translation: null, category, needsReview: true };
      console.log(` ✗ FAILED`);
    }
    
    // Save every 10 verbs
    if ((i + 1) % 10 === 0 || i === verbs.length - 1) {
      fs.writeFileSync(outputFile, JSON.stringify(translations, null, 2));
      progress.currentVerbIndex = i + 1;
      saveProgress(progress);
    }
    
    await sleep(REQUEST_DELAY);
  }
  
  fs.writeFileSync(outputFile, JSON.stringify(translations, null, 2));
  
  return { successCount, failedCount: failed.length, failed };
}

// Main
async function main() {
  console.log('='.repeat(60));
  console.log('VERB TRANSLATION v3 - Strict Validation');
  console.log('='.repeat(60));
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  if (!await checkOllama()) {
    process.exit(1);
  }
  
  const verbs = getUniqueVerbs();
  const langCodes = Object.keys(TARGET_LANGUAGES);
  
  console.log(`\nVerbs: ${verbs.length} | Languages: ${langCodes.length}`);
  console.log(`Est. time: ~${Math.ceil((verbs.length * langCodes.length * REQUEST_DELAY) / 60000)} min\n`);
  
  const progress = loadProgress();
  
  // Find start position
  let startLangIndex = 0;
  if (progress.currentLanguage) {
    startLangIndex = Math.max(0, langCodes.indexOf(progress.currentLanguage));
  }
  while (progress.completedLanguages.includes(langCodes[startLangIndex])) {
    startLangIndex++;
  }
  
  const summary = [];
  
  for (let li = startLangIndex; li < langCodes.length; li++) {
    const langCode = langCodes[li];
    const langInfo = TARGET_LANGUAGES[langCode];
    
    console.log(`\n[${li + 1}/${langCodes.length}] ${langInfo.name} (${langCode})`);
    console.log('-'.repeat(40));
    
    progress.currentLanguage = langCode;
    progress.currentVerbIndex = 0;
    saveProgress(progress);
    
    const result = await translateLanguage(langCode, langInfo, verbs, progress);
    
    summary.push({
      langCode,
      langName: langInfo.name,
      success: result.successCount,
      failed: result.failedCount,
      failedVerbs: result.failed
    });
    
    progress.completedLanguages.push(langCode);
    progress.currentLanguage = null;
    progress.currentVerbIndex = 0;
    saveProgress(progress);
    
    console.log(`   Done: ${result.successCount}/${verbs.length} ✓ | ${result.failedCount} need review`);
  }
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('COMPLETE');
  console.log('='.repeat(60));
  
  const needsReview = summary.filter(s => s.failed > 0);
  if (needsReview.length > 0) {
    console.log('\n⚠ Languages needing manual review:');
    for (const s of needsReview) {
      console.log(`   ${s.langName}: ${s.failed} verbs`);
    }
    fs.writeFileSync(path.join(OUTPUT_DIR, 'needs-review.json'), JSON.stringify(needsReview, null, 2));
  }
  
  console.log(`\nOutput: ${OUTPUT_DIR}`);
  console.log('✓ Done!');
}

main().catch(console.error);
