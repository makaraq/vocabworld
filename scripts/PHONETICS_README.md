# Phonetics Generation Guide

This guide explains how to generate IPA phonetic transcriptions for all vocabulary words using eSpeak-NG.

## Prerequisites

### Install eSpeak-NG

**Windows (using Chocolatey):**
```powershell
choco install espeak-ng
```

**Windows (Manual):**
1. Download from: https://github.com/espeak-ng/espeak-ng/releases
2. Install the `.msi` file
3. Add to PATH: `C:\Program Files\eSpeak NG\`

**Mac:**
```bash
brew install espeak-ng
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get install espeak-ng
```

### Verify Installation

```bash
espeak-ng --version
```

You should see version info like: `eSpeak NG text-to-speech: 1.51`

## Database Setup

Before running the script, apply the phonetics schema to your Supabase database:

1. Open Supabase Dashboard → SQL Editor
2. Run the contents of `add-phonetics-schema.sql`
3. This creates the `vocabulary_phonetics` table

## Usage

### Basic Usage (Process ALL vocabulary)

```bash
npm run generate-phonetics
```

This will:
- Fetch all vocabulary entries
- Generate phonetics for English + all translations
- Skip existing entries (safe to re-run)

### Options

**Limit number of entries (for testing):**
```bash
npm run generate-phonetics -- --limit=10
```

**Process specific language only:**
```bash
npm run generate-phonetics -- --language=es
```

**Process specific topic:**
```bash
npm run generate-phonetics -- --topic=42
```

**Combine options:**
```bash
npm run generate-phonetics -- --language=fr --limit=50 --topic=1
```

**Force regenerate (overwrite existing):**
```bash
npm run generate-phonetics -- --force
```

**Start at specific offset:**
```bash
npm run generate-phonetics -- --offset=100 --limit=50
```

## Examples

### Test with 5 words first
```bash
npm run generate-phonetics -- --limit=5
```

### Generate phonetics for Spanish only
```bash
npm run generate-phonetics -- --language=es
```

### Process Common Phrases topic (ID 42)
```bash
npm run generate-phonetics -- --topic=42
```

### Regenerate all French phonetics
```bash
npm run generate-phonetics -- --language=fr --force
```

## Output Example

```
🚀 Starting phonetic generation...
Options: { limit: 5 }

📚 Processing 5 vocabulary entries...

[1/5] Processing: "hello" (ID: 1)
  🇬🇧 Generating English phonetic...
     ✅ Saved: /həloʊ/
  🌍 Generating es phonetic: "hola"
     ✅ Saved: /ˈola/
  🌍 Generating fr phonetic: "bonjour"
     ✅ Saved: /bɔ̃ʒuʁ/

[2/5] Processing: "goodbye" (ID: 2)
  🇬🇧 Generating English phonetic...
     ✅ Saved: /ɡʊdbaɪ/
  ...

✅ Phonetic generation complete!
   Success: 87
   Errors: 0
   Skipped: 13
```

## Performance Notes

- Processing ~10,000 entries takes approximately 15-20 minutes
- The script adds a 100ms delay between entries to avoid system overload
- Safe to stop (Ctrl+C) and resume - won't duplicate existing phonetics
- Use `--limit` and `--offset` to process in batches

## Troubleshooting

### "eSpeak-NG not found"
- Ensure eSpeak-NG is installed and in your system PATH
- Restart terminal after installation
- Windows users may need to restart computer

### "Failed to generate phonetic"
- Some languages may not have full eSpeak-NG support
- These will be logged but won't stop the script
- Check language code mapping in `ESPEAK_LANGUAGE_MAP`

### Database Connection Errors
- Verify `.env.local` has correct Supabase credentials
- Check `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Memory Issues (Large datasets)
- Process in batches using `--limit` and `--offset`
- Example: Process 1000 at a time
  ```bash
  npm run generate-phonetics -- --limit=1000 --offset=0
  npm run generate-phonetics -- --limit=1000 --offset=1000
  npm run generate-phonetics -- --limit=1000 --offset=2000
  ```

## Next Steps

After generating phonetics:

1. **Add UI Toggle**: Add `showPhonetics` setting to settings modal
2. **Display Phonetics**: Update word cards to show IPA below words
3. **Test Display**: Verify phonetics render correctly across languages

## Data Structure

Phonetics are stored in `vocabulary_phonetics` table:

```sql
CREATE TABLE vocabulary_phonetics (
  id BIGSERIAL PRIMARY KEY,
  vocabulary_id BIGINT REFERENCES vocabulary(id),
  language_code VARCHAR(10),
  phonetic_ipa TEXT,
  phonetic_system VARCHAR(50) DEFAULT 'IPA',
  source VARCHAR(100) DEFAULT 'espeak-ng',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vocabulary_id, language_code)
);
```

Each word can have multiple phonetic entries (one per language).
