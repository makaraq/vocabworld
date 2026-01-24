# Example Sentences Generation Setup

This guide explains how to generate example sentences for vocabulary words using Google Gemini AI.

## Prerequisites

1. **Supabase Setup**: Your database should have the vocabulary tables set up
2. **Google Gemini API Key**: Get one from [Google AI Studio](https://makersuite.google.com/app/apikey)
3. **Node.js & npm**: Required to run the generation script

## Step 1: Database Schema Setup

Run the SQL schema to create the `example_sentences` table:

```bash
# In Supabase Dashboard → SQL Editor, run:
add-example-sentences-schema.sql
```

This creates:
- `example_sentences` table with vocabulary_id, language_code, sentence, translation
- Indexes for performance
- Row Level Security policies
- Unique constraints to prevent duplicates

## Step 2: Environment Variables

Add your Gemini API key to `.env.local`:

```bash
# Get your API key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Existing variables (should already be set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 3: Install Dependencies

Ensure you have `tsx` installed for TypeScript execution:

```bash
npm install tsx --save-dev
```

## Step 4: Run Generation Script

### Test Batch (45 Turkish Words)

Start with a small test batch to verify everything works:

```bash
npm run generate-examples -- --language tr --limit 45
```

### Generate for All Turkish Words

```bash
npm run generate-examples -- --language tr
```

### Generate for All Words in All Languages

```bash
npm run generate-examples
```

### Command Options

- `--language <code>`: Language code (e.g., tr, es, fr, de)
- `--limit <number>`: Maximum number of words to process
- `--start-from <number>`: Skip first N words (useful for resuming)

## How It Works

1. **Fetches vocabulary** from Supabase database
2. **For each word**, sends a prompt to Gemini asking for 3 example sentences
3. **Gemini generates** contextual sentences in the target language with English translations
4. **Saves to database** in the `example_sentences` table
5. **Logs results** to a JSON file with timestamp

## Example Output

For the Turkish word "merhaba" (hello):

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

## Features

- ✅ **Rate limiting**: 1 second delay between API calls to respect Gemini rate limits
- ✅ **Skip duplicates**: Won't regenerate sentences that already exist
- ✅ **Error handling**: Continues processing if individual words fail
- ✅ **Progress tracking**: Shows real-time progress during generation
- ✅ **Result logging**: Saves detailed JSON file with all results
- ✅ **Resumable**: Can restart from specific position if interrupted

## Expected Timeline

For 45 words (test batch):
- Approximately 60-90 seconds
- ~1-2 seconds per word

For full Turkish vocabulary (~2,000 words):
- Approximately 40-60 minutes
- Rate limited to prevent API throttling

For all languages (~100,000 words):
- Approximately 30-40 hours
- Best run overnight or in batches by language

## Monitoring Progress

The script provides real-time output:

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
```

## Cost Considerations

Google Gemini API Pricing (as of 2024):
- **Free tier**: 15 requests per minute, 1,500 requests per day
- **Paid tier**: $0.50 per 1 million characters

For this use case:
- Test batch (45 words): **FREE** (well within free tier)
- Full generation (100K words): Approximately $5-10 depending on prompt length

## Troubleshooting

### "Missing GEMINI_API_KEY" Error

Add the API key to `.env.local`:
```bash
GEMINI_API_KEY=your_actual_key_here
```

### "Rate limit exceeded" Error

The script already includes 1-second delays. If you still hit limits:
- Increase delay in `scripts/generate-example-sentences.ts`
- Reduce batch size with `--limit` flag
- Upgrade to paid Gemini API tier

### "Invalid JSON response" Error

Gemini sometimes returns non-JSON text. The script cleans this up automatically, but if it persists:
- Check the error log in the results JSON file
- The word will be skipped and can be regenerated later

### Database Connection Issues

Verify your Supabase credentials:
```bash
npm run check-env
```

## Next Steps

After generating example sentences:

1. **Update UI Components** to display sentences when user long-presses flashcard
2. **Add API endpoint** to fetch example sentences
3. **Implement caching** for frequently accessed sentences
4. **Add user feedback** to improve sentence quality

## Example Integration in Flashcard Component

```tsx
// components/learning/flashcard.tsx
const { data: examples } = await supabase
  .from('example_sentences')
  .select('*')
  .eq('vocabulary_id', wordId)
  .eq('language_code', languageCode)
  .order('sentence_order', { ascending: true })

// Show on long press
onLongPress={() => showExamples(examples)}
```
