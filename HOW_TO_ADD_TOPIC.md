# How to Add a New Topic to Vocab World

This guide walks you through adding a new vocabulary topic to your language learning app.

## Overview

Your app currently has **42 topics** (IDs 1-42). Topics organize vocabulary into themed learning sections.

### Current Topic Structure

- **Free Topics (IDs 1-3)**: Greetings, Numbers, Time
- **Premium Topics (IDs 4-42)**: All other topics
- **Last Added**: Topic 42 - "Daily Language"

## Required Components

When adding a new topic, you need to create:

1. ✅ **Topic metadata** (name, description, optional icon)
2. ✅ **Vocabulary words** (20-100 recommended)
3. ✅ **Translations** (50 languages × number of words)
4. ✅ **Topic name translations** (50 languages)
5. ⚠️ **Audio files** (optional but recommended)
6. ⚠️ **Example sentences** (optional, 3 per word per language)
7. ⚠️ **Phonetics** (optional, IPA transcriptions)

## Step-by-Step Process

### 1. Plan Your Topic

Choose your topic details:
- **Topic ID**: 43 (next available)
- **Name**: English name (e.g., "Animals", "Cooking", "Sports")
- **Description**: Brief description (e.g., "Common animals and wildlife vocabulary")
- **Icon**: Optional SVG icon for UI

### 2. Prepare Vocabulary List

Create a list of words for your topic:
- **Recommended**: 20-100 words per topic
- **Include**: English word, part of speech, difficulty level (1-3), context/category
- **Example**:
  ```javascript
  { word: 'dog', partOfSpeech: 'noun', difficulty: 1, context: 'PETS' }
  { word: 'cat', partOfSpeech: 'noun', difficulty: 1, context: 'PETS' }
  { word: 'elephant', partOfSpeech: 'noun', difficulty: 2, context: 'WILD ANIMALS' }
  ```

### 3. Use the Template Script

We've provided a template script that automates most of the process:

**File**: `scripts/add-new-topic-template.mjs`

#### Configure the script:

```javascript
const TOPIC_CONFIG = {
  id: 43,
  name: 'Your Topic Name',
  description: 'Brief description',
  icon: null // Optional SVG
};

const VOCABULARY_WORDS = [
  { word: 'example', partOfSpeech: 'noun', difficulty: 1, context: 'CATEGORY' },
  // Add all your words here...
];
```

#### Run the script:

```bash
node scripts/add-new-topic-template.mjs
```

This will:
- ✅ Insert topic into `topics` table
- ✅ Insert vocabulary into `vocabulary` table
- ✅ Generate translations for all 50 languages (using Gemini AI)
- ✅ Generate topic name translations
- ⏱️ Takes ~15-20 minutes

### 4. Update Frontend

Add your new topic to the frontend API route:

**File**: `app/api/topics/route.ts`

Add this object to the `TOPICS_DATA` array:

```typescript
{
  "id": 43,
  "name": "Your Topic Name",
  "description": "Brief description",
  "icon": "<svg>...</svg>" // Optional
}
```

Insert it in the appropriate position (topics are ordered by ID).

### 5. Generate Audio (Optional but Recommended)

Audio files are stored in Backblaze B2 cloud storage. You'll need to:
1. Generate TTS audio for all translations
2. Upload to Backblaze B2
3. Update `vocabulary_translations.audio_url` column
4. Update `backblaze-urls-20250909-180354.csv` mapping file

**Note**: This requires a separate audio generation script (not included in basic template).

### 6. Generate Example Sentences (Optional)

Generate 3 example sentences per word per language:
- Use Google Gemini API
- Insert into `example_sentences` table
- Each sentence should demonstrate word usage

**Existing script**: `scripts/generate-example-sentences.ts`

### 7. Generate Phonetics (Optional)

Generate IPA phonetic transcriptions:
- Use espeak-ng or Google TTS
- Insert into `vocabulary_phonetics` table
- One phonetic per word per language

### 8. Test Your Topic

1. **Database check**:
   ```sql
   SELECT * FROM topics WHERE id = 43;
   SELECT COUNT(*) FROM vocabulary WHERE topic_id = 43;
   SELECT COUNT(*) FROM vocabulary_translations vt 
   JOIN vocabulary v ON v.id = vt.vocabulary_id 
   WHERE v.topic_id = 43;
   ```

2. **Frontend check**:
   - Restart your dev server: `npm run dev`
   - Navigate to the app
   - Check if new topic appears in topic list
   - Click on topic and verify vocabulary loads

3. **Audio check**:
   - Play audio for translated words
   - Verify audio URLs are working
   - Check audio playback in mobile app

### 9. Deploy to Production

1. Commit changes:
   ```bash
   git add .
   git commit -m "Add new topic: [Topic Name]"
   git push
   ```

2. Verify database in production Supabase

3. Deploy frontend (Vercel auto-deploys on push)

4. Test in production environment

## Database Schema Reference

### Topics Table
```sql
CREATE TABLE topics (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### Vocabulary Table
```sql
CREATE TABLE vocabulary (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  word_en TEXT NOT NULL,
  context TEXT,
  part_of_speech TEXT,
  difficulty_level TEXT,
  learning_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### Vocabulary Translations Table
```sql
CREATE TABLE vocabulary_translations (
  id SERIAL PRIMARY KEY,
  vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id),
  language_code TEXT NOT NULL,
  translated_word TEXT NOT NULL,
  audio_url TEXT,
  translation_source TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### Topic Translations Table
```sql
CREATE TABLE topic_translations (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  language_code TEXT NOT NULL,
  translated_name TEXT NOT NULL,
  translated_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(topic_id, language_code)
)
```

## Supported Languages (50)

Arabic, Bulgarian, Bengali, Catalan, Corsican, Czech, Welsh, Danish, German, Greek, Spanish, Estonian, Basque, Persian, Finnish, French, Irish, Hebrew, Hindi, Croatian, Hungarian, Italian, Japanese, Georgian, Korean, Luxembourgish, Lithuanian, Latvian, Macedonian, Maltese, Dutch, Norwegian, Polish, Portuguese, Romanian, Russian, Slovak, Slovenian, Albanian, Serbian, Swedish, Tamil, Telugu, Thai, Turkish, Ukrainian, Urdu, Vietnamese, Chinese

## Troubleshooting

### "Duplicate key violation"
- Topic ID already exists - use next available ID
- Word already exists in topic - check your vocabulary list

### "Gemini API rate limit"
- Script includes 2-second delays between batches
- If you hit limits, wait a few minutes and re-run

### "Missing translations"
- Check Gemini API key in `.env.local`
- Verify API quota hasn't been exceeded
- Re-run translation-only portion

### "Topic not appearing in app"
- Verify `app/api/topics/route.ts` has been updated
- Restart dev server
- Clear browser cache
- Check browser console for errors

### "Audio not playing"
- Verify `audio_url` column is populated
- Check Backblaze B2 credentials
- Test audio URL directly in browser
- Verify `/api/universal-audio` endpoint

## Access Control

By default, new topics are **premium-only**. To make a topic free:

1. Edit `lib/subscription/subscription-service.ts`
2. Update `FREE_TOPIC_IDS` array:
   ```typescript
   const FREE_TOPIC_IDS = [1, 2, 3, 43] // Add your topic ID
   ```

## Best Practices

✅ **DO:**
- Use clear, descriptive topic names
- Group related words in the same topic
- Include difficulty levels (1=beginner, 2=intermediate, 3=advanced)
- Add context categories for better organization
- Test thoroughly before deploying
- Generate audio for better user experience

❌ **DON'T:**
- Use duplicate topic IDs
- Skip translations (app requires all 50 languages)
- Add too many words (keep topics focused)
- Forget to update frontend code
- Deploy without testing

## Additional Resources

- **Database Schema**: `supabase-schema.sql`
- **Example Topic**: See Topic 42 (Daily Language) implementation
- **Translation Script**: `scripts/generate-topic-translations.ts`
- **Common Phrases Example**: `scripts/insert-common-phrases-to-supabase.mjs`
- **Audio Documentation**: `OFFLINE_AUDIO_CACHE.md`
- **Example Sentences Guide**: `EXAMPLE_SENTENCES_SETUP.md`

## Support

If you encounter issues:
1. Check database logs in Supabase Dashboard
2. Review browser console for frontend errors
3. Verify environment variables in `.env.local`
4. Check API quotas (Gemini, Google TTS)
5. Review this documentation

---

**Ready to add your topic?** Edit `scripts/add-new-topic-template.mjs` and run it!
