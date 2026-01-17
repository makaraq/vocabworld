# Common Phrases Topic Setup Guide

## ✅ Completed Steps

1. **Audio Generation** - Generated 39,700 audio files
   - Google TTS: 37,318 files (47 languages)
   - Azure TTS: 2,382 files (3 languages: Welsh, Irish, Maltese)

2. **B2 Upload** - Uploaded all 39,700 files to Backblaze B2
   - Bucket: `voco-audio-library`
   - Path: `CommonPhrases/{language_code}/{filename}.wav`
   - URLs saved in: `scripts/common-phrases-b2-urls.csv`

## 🔧 Required Database Setup

### Step 1: Add audio_url Column

**In Supabase Dashboard > SQL Editor**, run:

```sql
ALTER TABLE vocabulary_translations 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

CREATE INDEX IF NOT EXISTS idx_vocabulary_translations_audio 
ON vocabulary_translations(vocabulary_id, language_code) 
WHERE audio_url IS NOT NULL;
```

### Step 2: Update Audio URLs

After adding the column, run this script:

```bash
node scripts/update-database-with-b2-urls.mjs
```

This will update all 39,700 vocabulary_translations records with their B2 audio URLs.

## 📊 Topic Information

- **Topic ID**: 42
- **Topic Name**: Common Phrases
- **Total Phrases**: 794
- **Languages**: 50 (all supported languages)
- **Total Audio Files**: 39,700 (794 × 50)
- **Audio Format**: WAV, 24kHz, 16-bit mono PCM

## 🎯 Verification Steps

After database update, verify:

```sql
-- Check audio URLs are populated
SELECT 
  language_code, 
  COUNT(*) as total, 
  COUNT(audio_url) as with_audio
FROM vocabulary_translations 
WHERE vocabulary_id IN (SELECT id FROM vocabulary WHERE topic_id = 42)
GROUP BY language_code;

-- Should show 794 records per language with audio URLs
```

## 🚀 Git Push Checklist

Before pushing to Git:

- [x] Audio files generated
- [x] Audio files uploaded to B2
- [x] CSV mappings created
- [ ] Database audio_url column added (manual step)
- [ ] Database records updated with B2 URLs
- [ ] Topic tested in app UI
- [ ] Ready to push

## 📁 Files to Commit

- `scripts/common-phrases-b2-urls.csv` - B2 URL mappings
- `scripts/azure-audio-mappings.csv` - Azure file mappings
- `scripts/google-audio-mappings-2026-01-16.csv` - Google file mappings
- `ADD_AUDIO_URL_COLUMN.sql` - Database migration SQL
- All generation/upload scripts in `scripts/` directory

**Note**: Do NOT commit audio files in `scripts/common-phrases-audio/` - they're uploaded to B2
