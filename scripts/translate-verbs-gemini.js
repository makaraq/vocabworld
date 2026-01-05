/**
 * Translate Verbs Topic to 49 Languages using Google Gemini
 * Context-aware translation for verbs (e.g., "clean" -> "temizlemek" in Turkish, not "temiz")
 * 
 * Usage: node scripts/translate-verbs-gemini.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Gemini API Configuration - Use environment variable or fallback
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBohKAYquSsgV1vMgCFN79c_fYIXCJyAfo';
const GEMINI_MODEL = 'gemini-2.0-flash'; // Using v1 API with flash model

// 49 Target Languages (excluding English)
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

// Verbs organized by category (parsed from VERBS.txt)
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
    "dislike", "regret", "hope", "trust", "doubt", "surprise", "shock", "annoy", "bother", "confuse",
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
    "wither", "sprout", "fall", "quake", "erode", "burn", "flood", "float", "sink", "rise",
    "set"
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

// Helper to delay between API calls
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Translate a batch of verbs to a target language using Gemini
async function translateBatchWithGemini(verbs, category, targetLanguageCode, targetLanguageName) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const verbList = verbs.join(', ');
  
  const prompt = `You are a professional translator. Translate the following English VERBS to ${targetLanguageName}.

CRITICAL INSTRUCTIONS:
1. These are ALL VERBS (action words), so translate them as VERBS in their infinitive/base form
2. For example: "clean" in Turkish should be "temizlemek" (to clean), NOT "temiz" (clean as adjective)
3. "run" in German should be "laufen" (to run), NOT "Lauf" (the run/noun)
4. Multi-word verbs like "get up" or "wash dishes" should be translated as single verb phrases
5. Provide ONLY the translation, nothing else

Category: ${category}
Verbs to translate: ${verbList}

Respond in this exact JSON format (no markdown, no code blocks, just pure JSON):
{
  "verb1": "translation1",
  "verb2": "translation2"
}

Replace verb1, verb2 with the actual English verbs from the list.`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`API Error for ${targetLanguageName}: ${error}`);
      return null;
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!responseText) {
      console.error(`Empty response for ${targetLanguageName}`);
      return null;
    }

    // Clean up the response - remove markdown code blocks if present
    let cleanedResponse = responseText;
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7);
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    try {
      const translations = JSON.parse(cleanedResponse);
      return translations;
    } catch (parseError) {
      console.error(`JSON parse error for ${targetLanguageName}:`, parseError.message);
      console.error('Response was:', cleanedResponse.substring(0, 500));
      return null;
    }
  } catch (error) {
    console.error(`Error translating to ${targetLanguageName}:`, error.message);
    return null;
  }
}

// Main translation function
async function translateAllVerbs() {
  console.log('🚀 Starting verb translations with Google Gemini\n');
  console.log(`📊 Target languages: ${Object.keys(TARGET_LANGUAGES).length}`);
  
  // Calculate total verbs
  let totalVerbs = 0;
  for (const category of Object.keys(VERBS_BY_CATEGORY)) {
    totalVerbs += VERBS_BY_CATEGORY[category].length;
  }
  console.log(`📝 Total unique verbs: ${totalVerbs}`);
  console.log(`📁 Categories: ${Object.keys(VERBS_BY_CATEGORY).length}\n`);

  // Structure to hold all translations
  const allTranslations = {};
  
  // Initialize structure for each verb
  let wordId = 50000; // Start with high ID to avoid conflicts
  for (const [category, verbs] of Object.entries(VERBS_BY_CATEGORY)) {
    for (const verb of verbs) {
      allTranslations[verb] = {
        id: wordId++,
        english: verb,
        category: category,
        context: `${category.toLowerCase()} - verbs`,
        part_of_speech: "verb",
        translations: {}
      };
    }
  }

  // Translate to each language
  for (const [langCode, langName] of Object.entries(TARGET_LANGUAGES)) {
    console.log(`\n🌍 Translating to ${langName} (${langCode})...`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Process each category
    for (const [category, verbs] of Object.entries(VERBS_BY_CATEGORY)) {
      // Split into batches of 30 verbs for better API handling
      const batchSize = 30;
      for (let i = 0; i < verbs.length; i += batchSize) {
        const batch = verbs.slice(i, i + batchSize);
        
        console.log(`  📦 ${category}: batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(verbs.length/batchSize)} (${batch.length} verbs)`);
        
        const translations = await translateBatchWithGemini(batch, category, langCode, langName);
        
        if (translations) {
          for (const verb of batch) {
            const translation = translations[verb];
            if (translation) {
              allTranslations[verb].translations[langCode] = {
                word: translation,
                confidence: 0.95
              };
              successCount++;
            } else {
              console.log(`    ⚠️ Missing translation for: ${verb}`);
              failCount++;
            }
          }
        } else {
          failCount += batch.length;
        }
        
        // Rate limiting - wait 25 seconds between batches to stay within free tier limits
        console.log(`    ⏳ Waiting 25s for rate limit...`);
        await delay(25000);
      }
    }
    
    console.log(`  ✅ ${langName}: ${successCount} translated, ${failCount} failed`);
  }

  // Save the results
  const outputPath = path.join(__dirname, '..', 'public', 'data', 'verbs-translations.json');
  fs.writeFileSync(outputPath, JSON.stringify(allTranslations, null, 2));
  console.log(`\n💾 Saved translations to ${outputPath}`);

  // Generate vocabulary.json format for topic 41 (Verbs)
  const vocabularyFormat = [];
  let learningOrder = 1;
  
  for (const [category, verbs] of Object.entries(VERBS_BY_CATEGORY)) {
    for (const verb of verbs) {
      const verbData = allTranslations[verb];
      vocabularyFormat.push({
        id: verbData.id,
        topic_id: 41, // New topic ID for Verbs
        english: verb,
        context: `${category.toLowerCase()} - verbs`,
        category: category, // Added category field for display
        part_of_speech: "verb",
        difficulty_level: "beginner",
        frequency_rank: 300,
        learning_order: learningOrder++,
        example_sentence: `Example using "${verb}" as a verb.`,
        translations: verbData.translations
      });
    }
  }

  const vocabOutputPath = path.join(__dirname, '..', 'public', 'data', 'verbs-vocabulary.json');
  fs.writeFileSync(vocabOutputPath, JSON.stringify({ "41": vocabularyFormat }, null, 2));
  console.log(`💾 Saved vocabulary format to ${vocabOutputPath}`);
  
  // Summary
  console.log('\n📊 Translation Summary:');
  console.log(`   Total verbs: ${totalVerbs}`);
  console.log(`   Languages: ${Object.keys(TARGET_LANGUAGES).length}`);
  console.log(`   Total translations: ${totalVerbs * Object.keys(TARGET_LANGUAGES).length}`);
  
  return allTranslations;
}

// Run the translation
translateAllVerbs().catch(console.error);
