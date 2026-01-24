# Example Sentences Generation System - Complete Overview

## 🎯 What This Does

Generates 3 contextual example sentences for every vocabulary word in your database using Google Gemini AI. Users will see these sentences when they long-press a flashcard, displayed in both the learning language and their native language.

## 📁 Files Created

### Database Schema
- **`add-example-sentences-schema.sql`** - Creates the `example_sentences` table with proper indexes, RLS policies, and triggers

### Scripts
- **`scripts/generate-example-sentences.ts`** - Main generation script that fetches words, calls Gemini API, and saves results
- **`scripts/check-example-sentences-setup.ts`** - Pre-flight verification script to check all requirements

### Documentation
- **`QUICKSTART_EXAMPLE_SENTENCES.md`** - Quick 3-step guide to run the test batch
- **`EXAMPLE_SENTENCES_SETUP.md`** - Detailed documentation with troubleshooting

### Package.json Updates
- Added `generate-examples` script
- Added `check-examples-setup` script

## 🚀 Quick Start (3 Steps)

### 1. Run Database Schema
In Supabase Dashboard SQL Editor, run:
```sql
-- From file: add-example-sentences-schema.sql
```

### 2. Add API Key to .env.local
```bash
GEMINI_API_KEY=your_api_key_from_google_ai_studio
```
Get key from: https://makersuite.google.com/app/apikey

### 3. Run Test Batch (45 Turkish Words)
```bash
npm run check-examples-setup  # Verify everything is ready
npm run generate-examples -- --language tr --limit 45
```

## 📊 Database Schema

```sql
CREATE TABLE example_sentences (
  id SERIAL PRIMARY KEY,
  vocabulary_id INTEGER REFERENCES vocabulary(id),
  language_code TEXT NOT NULL,
  sentence TEXT NOT NULL,           -- Example in target language
  translation TEXT,                 -- English translation
  sentence_order INTEGER (1-3),     -- Which of 3 sentences
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## 🔧 Command Options

```bash
# Test batch - 45 Turkish words
npm run generate-examples -- --language tr --limit 45

# All Turkish words
npm run generate-examples -- --language tr

# All words in all languages (long-running)
npm run generate-examples

# Resume from specific position
npm run generate-examples -- --language tr --start-from 100 --limit 50
```

## 📈 Scale & Performance

| Batch Size | Time | Cost | Use Case |
|------------|------|------|----------|
| 45 words | 1-2 min | FREE | Test batch (recommended first) |
| 2,000 words (1 language) | 40-60 min | FREE | Single language generation |
| 100,000 words (all) | 30-40 hours | $5-10 | Full database population |

**Rate Limiting**: 1 second delay between requests (respects Gemini free tier: 15/min)

## ✨ Features

✅ **Smart Skip Logic** - Won't regenerate existing sentences  
✅ **Error Recovery** - Continues if individual words fail  
✅ **Progress Tracking** - Real-time console output  
✅ **Result Logging** - Saves JSON file with timestamp  
✅ **Resumable** - Can restart from any position  
✅ **Database-Driven** - Direct integration with Supabase  

## 🎨 Example Output

For Turkish word "merhaba" (hello):

```json
{
  "vocabulary_id": 1,
  "word_en": "hello",
  "translated_word": "merhaba",
  "language_code": "tr",
  "sentences": [
    {
      "sentence": "Merhaba, nasılsın?",
      "translation": "Hello, how are you?"
    },
    {
      "sentence": "Sabah herkese merhaba dedim.",
      "translation": "I said hello to everyone in the morning."
    },
    {
      "sentence": "Merhaba demek güzel bir alışkanlıktır.",
      "translation": "Saying hello is a nice habit."
    }
  ],
  "success": true
}
```

## 🔌 How to Use Generated Sentences in UI

After generation, fetch sentences in your flashcard component:

```typescript
// components/learning/flashcard.tsx
const fetchExampleSentences = async (wordId: number, langCode: string) => {
  const { data, error } = await supabase
    .from('example_sentences')
    .select('*')
    .eq('vocabulary_id', wordId)
    .eq('language_code', langCode)
    .order('sentence_order', { ascending: true })
  
  return data // Returns 3 sentences
}

// Show on long press
<Flashcard
  onLongPress={async () => {
    const examples = await fetchExampleSentences(word.id, languageCode)
    showExamplesModal(examples)
  }}
/>
```

## 🛠️ Troubleshooting

### Pre-Flight Check Failed?
```bash
npm run check-examples-setup
```
This will tell you exactly what's missing.

### Common Issues

**"Missing GEMINI_API_KEY"**
- Add to `.env.local` and restart terminal

**"example_sentences table not found"**
- Run the SQL schema in Supabase Dashboard

**"Rate limit exceeded"**
- Free tier allows 15 requests/minute
- Script already includes 1-second delays
- Consider upgrading to paid tier for faster generation

**"Invalid JSON response"**
- Script handles this automatically
- Failed words are logged and can be regenerated

## 📦 Dependencies

All required packages already installed:
- ✅ `@supabase/supabase-js` (database)
- ✅ `@google/generative-ai` (Gemini API)
- ✅ `tsx` (TypeScript execution)

## 🎯 Next Steps After Generation

1. **Create API endpoint**: `app/api/example-sentences/route.ts`
2. **Update flashcard UI**: Add long-press handler
3. **Add examples modal**: Show sentences in overlay
4. **Implement caching**: Store frequently accessed sentences
5. **Add user feedback**: Let users rate sentence quality

## 💡 Tips

- Start with the **test batch** (45 words) to verify everything works
- Generate **one language at a time** for easier monitoring
- Run **overnight** for full database generation
- Check **results JSON files** if anything looks wrong
- Use `--start-from` to **resume** interrupted runs

## 📞 Support

Check the documentation files for detailed information:
- `QUICKSTART_EXAMPLE_SENTENCES.md` - Fast setup guide
- `EXAMPLE_SENTENCES_SETUP.md` - Comprehensive documentation

---

**Ready to start?** Run the test batch:

```bash
npm run check-examples-setup
npm run generate-examples -- --language tr --limit 45
```

Expected result: 45 Turkish words with 135 example sentences in ~90 seconds! 🚀
