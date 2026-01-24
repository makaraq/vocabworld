# Quick Start: Generate Example Sentences for Turkish Words

Follow these steps to generate example sentences for the test batch of 45 Turkish words.

## Step 1: Run Database Schema (5 minutes)

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor**
3. Open the file `add-example-sentences-schema.sql`
4. Copy and paste the SQL into the editor
5. Click **Run** to execute

This creates the `example_sentences` table in your database.

## Step 2: Add Gemini API Key (2 minutes)

1. Get your free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create or edit `.env.local` file in your project root
3. Add this line:

```bash
GEMINI_API_KEY=your_actual_api_key_here
```

Make sure your existing Supabase variables are also present:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 3: Run the Test Batch (2 minutes)

Open terminal and run:

```bash
npm run generate-examples -- --language tr --limit 45
```

## What Happens Next

The script will:
1. ✅ Connect to your Supabase database
2. ✅ Fetch 45 Turkish vocabulary words
3. ✅ Generate 3 example sentences for each word using Gemini AI
4. ✅ Save all sentences to the database
5. ✅ Create a results JSON file with timestamp

**Expected time**: 60-90 seconds for 45 words

## Example Output

```
🚀 Starting example sentence generation
Configuration: { languageCode: 'tr', limit: 45, startFrom: 0 }

📚 Fetching vocabulary words...
✅ Fetched 45 vocabulary words

[1/45] Processing: "hello" → "merhaba" (tr)
  ✅ Generated and saved 3 example sentences
[2/45] Processing: "goodbye" → "hoşça kal" (tr)
  ✅ Generated and saved 3 example sentences
...

═══════════════════════════════════════════
📊 GENERATION SUMMARY
═══════════════════════════════════════════
Total words processed: 45
✅ Successful: 45
❌ Failed: 0
⏱️  Duration: 72.35 seconds
📁 Results saved to: example-sentences-results-2026-01-24T15-30-00.json
═══════════════════════════════════════════
```

## Verify the Results

Check the generated sentences in Supabase:

```sql
SELECT 
  v.word_en,
  vt.translated_word,
  es.sentence,
  es.translation,
  es.sentence_order
FROM example_sentences es
JOIN vocabulary v ON es.vocabulary_id = v.id
JOIN vocabulary_translations vt ON v.id = vt.vocabulary_id
WHERE es.language_code = 'tr'
ORDER BY v.id, es.sentence_order
LIMIT 10;
```

## After Test Batch Succeeds

Once you verify the test batch works correctly, you can:

### Generate All Turkish Words
```bash
npm run generate-examples -- --language tr
```

### Generate All Languages (Run Overnight)
```bash
npm run generate-examples
```

## Troubleshooting

**Issue**: "Missing GEMINI_API_KEY"
- **Fix**: Add the key to `.env.local` and restart terminal

**Issue**: "Connection error"
- **Fix**: Check your Supabase credentials with `npm run check-env`

**Issue**: Rate limit errors
- **Fix**: The script includes 1-second delays. If still hitting limits, the free tier allows 15 requests/minute (we're doing ~1 per second)

## Cost

- **Test batch (45 words)**: 100% FREE ✅
- **Full Turkish (~2,000 words)**: FREE on Gemini free tier ✅
- **All languages (~100,000 words)**: ~$5-10 on paid tier

The test batch is well within Google's free tier limits!

## Ready to Start?

1. ✅ Run the SQL schema
2. ✅ Add GEMINI_API_KEY to .env.local
3. ✅ Run: `npm run generate-examples -- --language tr --limit 45`

That's it! The script handles everything else automatically.
