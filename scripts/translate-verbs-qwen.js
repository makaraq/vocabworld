/**
 * Translate Verbs using Qwen 2.5 7B
 * Optimized prompts for multilingual translation
 * 
 * Usage: node scripts/translate-verbs-qwen.js
 */

const fs = require('fs');
const path = require('path');

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'qwen2.5:7b';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data', 'verbs-v2');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'progress.json');

const REQUEST_DELAY = 2500;
const MAX_RETRIES = 5;

// Script validators
const SCRIPTS = {
  arabic: {
    test: (t) => /[\u0600-\u06FF]/.test(t) && !/[a-zA-Z]/.test(t)
  },
  cyrillic: {
    test: (t) => /[\u0400-\u04FF]/.test(t) && !/[a-zA-Z]/.test(t)
  },
  bengali: {
    test: (t) => /[\u0980-\u09FF]/.test(t)
  },
  greek: {
    test: (t) => /[\u0370-\u03FF]/.test(t) && !/[a-zA-Z]/.test(t)
  },
  hebrew: {
    test: (t) => /[\u0590-\u05FF]/.test(t)
  },
  devanagari: {
    test: (t) => /[\u0900-\u097F]/.test(t)
  },
  japanese: {
    test: (t) => /[\u3040-\u30FF\u4E00-\u9FFF]/.test(t)
  },
  georgian: {
    test: (t) => /[\u10A0-\u10FF]/.test(t)
  },
  korean: {
    test: (t) => /[\uAC00-\uD7AF]/.test(t)
  },
  thai: {
    test: (t) => /[\u0E00-\u0E7F]/.test(t)
  },
  chinese: {
    test: (t) => /[\u4E00-\u9FFF]/.test(t) && !/[a-zA-Z]/.test(t)
  },
  latin: {
    test: (t) => /^[a-zA-ZÀ-ÿĀ-žŁłŃńŚśŹźŻżÆæØøÅåÄäÖöÜüẞßČčĎďĚěŇňŘřŠšŤťŽžĐđĆćŞşĞğİıÇçÑñƏəĂăÂâÎîȘșȚț\s\-']+$/.test(t)
  }
};

const LANGUAGES = {
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

const VERBS = {
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

function getVerbs() {
  const map = new Map();
  for (const [cat, verbs] of Object.entries(VERBS)) {
    for (const v of verbs) {
      if (!map.has(v)) map.set(v, cat);
    }
  }
  return Array.from(map.entries()).map(([verb, category]) => ({ verb, category }));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (e) {}
  return { done: [], current: null, index: 0 };
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

// Extract just the translation word from response
function extractWord(raw, langInfo) {
  if (!raw) return null;
  
  let text = raw.trim();
  
  // Take first line
  text = text.split('\n')[0];
  
  // Remove markdown bold
  text = text.replace(/\*\*/g, '');
  
  // Remove quotes
  text = text.replace(/["'`«»„""]/g, '');
  
  // Remove parenthetical romanization like (mashy)
  text = text.replace(/\s*\([^)]*\)\s*/g, ' ');
  
  // Remove numbering like "1." or "2."
  text = text.replace(/^\d+\.\s*/, '');
  
  // Remove common prefixes
  text = text.replace(/^(The\s+)?(translation|word|verb|answer|result)\s*(is|for)?:?\s*/i, '');
  
  // For non-latin scripts, extract just the non-latin part
  if (langInfo.script !== 'latin') {
    const scriptPatterns = {
      arabic: /[\u0600-\u06FF\u0750-\u077F]+/g,
      cyrillic: /[\u0400-\u04FF]+/g,
      bengali: /[\u0980-\u09FF]+/g,
      greek: /[\u0370-\u03FF]+/g,
      hebrew: /[\u0590-\u05FF]+/g,
      devanagari: /[\u0900-\u097F]+/g,
      japanese: /[\u3040-\u30FF\u4E00-\u9FFF]+/g,
      georgian: /[\u10A0-\u10FF]+/g,
      korean: /[\uAC00-\uD7AF]+/g,
      thai: /[\u0E00-\u0E7F]+/g,
      chinese: /[\u4E00-\u9FFF]+/g
    };
    
    const pattern = scriptPatterns[langInfo.script];
    if (pattern) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Take the longest match (most likely the actual word)
        text = matches.reduce((a, b) => a.length >= b.length ? a : b);
      }
    }
  } else {
    // For latin, clean up punctuation
    text = text.replace(/[.,!?;:*#@]+/g, '').trim();
    
    // Take first word/phrase before explanations
    text = text.split(/\s+[-–—:]\s+/)[0];
    text = text.split(/\s*\/\s*/)[0];
    
    // Remove "to " prefix
    text = text.replace(/^to\s+/i, '');
  }
  
  return text.trim();
}

function validate(text, langCode, langInfo, original) {
  if (!text || text.length < 1) return false;
  if (text.length > 25) return false;
  
  const validator = SCRIPTS[langInfo.script];
  if (!validator || !validator.test(text)) return false;
  
  // For latin, reject if same as English (except cognates)
  if (langInfo.script === 'latin') {
    if (text.toLowerCase() === original.toLowerCase()) {
      const cognateOK = ['es', 'fr', 'it', 'pt', 'ca', 'ro', 'de', 'nl'].includes(langCode);
      if (!cognateOK) return false;
    }
  }
  
  return true;
}

async function callOllama(prompt) {
  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 30,
          top_p: 0.8
        }
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.response || null;
  } catch (e) {
    return null;
  }
}

async function translate(verb, langCode, langInfo) {
  // Different prompt strategies
  const prompts = [
    // Strategy 1: Direct dictionary lookup style
    `Dictionary: "${verb}" in ${langInfo.name} = `,
    
    // Strategy 2: Single word request
    `What is the ${langInfo.name} word for "${verb}"? Just the word:`,
    
    // Strategy 3: Translation only
    `Translate "${verb}" to ${langInfo.name}. One word answer:`,
    
    // Strategy 4: Fill in blank
    `English "${verb}" = ${langInfo.name} "`,
    
    // Strategy 5: Very explicit
    `Give me ONLY the ${langInfo.name} translation of the verb "${verb}". No explanation, no romanization, just the ${langInfo.name} word:`
  ];

  for (let i = 0; i < MAX_RETRIES; i++) {
    const prompt = prompts[i % prompts.length];
    const raw = await callOllama(prompt);
    const extracted = extractWord(raw, langInfo);
    
    if (validate(extracted, langCode, langInfo, verb)) {
      return extracted;
    }
    
    await sleep(400);
  }
  
  return null;
}

async function checkOllama() {
  try {
    const res = await fetch('http://localhost:11434/api/tags');
    if (!res.ok) return false;
    const data = await res.json();
    return data.models?.some(m => m.name.includes('qwen2.5'));
  } catch (e) {
    console.log('⚠ Ollama not running. Start: ollama serve');
    return false;
  }
}

async function translateLang(code, info, verbs, progress) {
  const file = path.join(OUTPUT_DIR, `${code}.json`);
  let data = {};
  let start = 0;
  
  if (progress.current === code && fs.existsSync(file)) {
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
      start = progress.index;
      console.log(`   Resuming from ${start + 1}/${verbs.length}`);
    } catch (e) {}
  }
  
  let ok = 0, fail = 0;
  const failed = [];
  
  for (let i = start; i < verbs.length; i++) {
    const { verb, category } = verbs[i];
    
    if (data[verb]?.translation) {
      ok++;
      continue;
    }
    
    process.stdout.write(`   [${i + 1}/${verbs.length}] "${verb}"...`);
    
    const translation = await translate(verb, code, info);
    
    if (translation) {
      data[verb] = { translation, category };
      ok++;
      console.log(` ✓ ${translation}`);
    } else {
      data[verb] = { translation: null, category, failed: true };
      fail++;
      failed.push(verb);
      console.log(` ✗`);
    }
    
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
      progress.index = i + 1;
      saveProgress(progress);
    }
    
    await sleep(REQUEST_DELAY);
  }
  
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return { ok, fail, failed };
}

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  VERB TRANSLATOR - Qwen 2.5 7B');
  console.log('═'.repeat(60));
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  if (!await checkOllama()) {
    console.log('⚠ qwen2.5:7b not available');
    process.exit(1);
  }
  
  const verbs = getVerbs();
  const langs = Object.keys(LANGUAGES);
  
  console.log(`\n  Verbs: ${verbs.length}`);
  console.log(`  Languages: ${langs.length}`);
  console.log(`  Total: ${verbs.length * langs.length}\n`);
  
  const progress = loadProgress();
  
  let startIdx = 0;
  if (progress.current) {
    startIdx = Math.max(0, langs.indexOf(progress.current));
  }
  while (progress.done.includes(langs[startIdx]) && startIdx < langs.length) {
    startIdx++;
  }
  
  const summary = [];
  
  for (let i = startIdx; i < langs.length; i++) {
    const code = langs[i];
    const info = LANGUAGES[code];
    
    console.log(`[${i + 1}/${langs.length}] ${info.name} (${code})`);
    console.log('─'.repeat(40));
    
    progress.current = code;
    progress.index = 0;
    saveProgress(progress);
    
    const result = await translateLang(code, info, verbs, progress);
    
    summary.push({ code, name: info.name, ...result });
    
    progress.done.push(code);
    progress.current = null;
    progress.index = 0;
    saveProgress(progress);
    
    console.log(`   Done: ${result.ok}/${verbs.length} (${result.fail} failed)\n`);
  }
  
  console.log('═'.repeat(60));
  console.log('  COMPLETE');
  console.log('═'.repeat(60));
  
  const needsReview = summary.filter(s => s.fail > 0);
  if (needsReview.length > 0) {
    console.log('\n  ⚠ Need review:');
    for (const s of needsReview) {
      console.log(`    ${s.name}: ${s.fail}`);
    }
    fs.writeFileSync(path.join(OUTPUT_DIR, 'needs-review.json'), JSON.stringify(needsReview, null, 2));
  }
  
  console.log(`\n  Output: ${OUTPUT_DIR}\n`);
}

main().catch(console.error);
