# Common Phrases Topic - Translation & Database Setup

This guide explains how to translate and insert the Common Phrases topic (ID 42) with 963 phrases across 49 languages.

## 📁 Files Created

### Data Files
- `common-phrases-data.json` - All 963 phrases organized by 20 categories
- `common-phrases-test-batch.json` - Sample of 25 phrases for testing (5 per category)

### Scripts
- `translate-common-phrases.mjs` - Gemini AI translation script (Node.js)
- `generate-sql-from-translations.mjs` - Converts translations to SQL
- `update-topic-30-name.sql` - Database updates for topic renaming

### Generated Files (after running scripts)
- `common-phrases-test-translations.json` - Test batch translations
- `common-phrases-translations.json` - Full translations (963 phrases)
- `insert-common-phrases-test.sql` - Test SQL insert script
- `insert-common-phrases.sql` - Full SQL insert script

## 🚀 Step-by-Step Process

### Step 1: Set Up Gemini API Key

Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

**Windows PowerShell:**
```powershell
$env:GEMINI_API_KEY="your_api_key_here"
```

**Linux/Mac:**
```bash
export GEMINI_API_KEY=your_api_key_here
```

### Step 2: Install Dependencies

```bash
npm install @google/generative-ai
```

### Step 3: Run Test Translation (Recommended First)

Translate 25 sample phrases to verify quality:

```bash
node scripts/translate-common-phrases.mjs
```

This will:
- Translate 25 phrases × 49 languages = 1,225 translations
- Take approximately 5-10 minutes
- Create `common-phrases-test-translations.json`

**Review the translations** to ensure quality before proceeding to full translation.

### Step 4: Generate Test SQL

```bash
node scripts/generate-sql-from-translations.mjs
```

Creates `insert-common-phrases-test.sql` - review and run in Supabase SQL Editor.

### Step 5: Run Full Translation (After Test Success)

```bash
node scripts/translate-common-phrases.mjs --full
```

This will:
- Translate all 963 phrases × 49 languages = 47,187 translations
- Take approximately 3-5 hours
- Create `common-phrases-translations.json`

### Step 6: Generate Full SQL

```bash
node scripts/generate-sql-from-translations.mjs --full
```

Creates `insert-common-phrases.sql` with all phrase translations.

### Step 7: Database Insertion

Run the generated SQL file in your Supabase SQL Editor:

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `insert-common-phrases.sql`
3. Execute the script
4. Verify with the included SELECT query

## 📊 Topic Structure

### 20 Categories with Context-Aware Translations

1. **Daily Life & Actions** (47 phrases) - Everyday activities and routine actions
2. **Socializing & Relationships** (46 phrases) - Social interactions and relationship building
3. **Conversation Starters & Enders** (46 phrases) - Opening and closing conversations
4. **Small Talk & Casual Speech** (47 phrases) - Informal conversational expressions
5. **Sharing Information** (47 phrases) - Explaining and providing information
6. **Asking for Information** (44 phrases) - Questions and inquiries
7. **Opinions & Thoughts** (45 phrases) - Expressing personal views
8. **Agreement & Disagreement** (38 phrases) - Respectful agreement/disagreement
9. **Decisions & Choices** (38 phrases) - Making choices confidently
10. **Time & Scheduling** (48 phrases) - Managing time and scheduling
11. **Work & Productivity** (48 phrases) - Professional work management
12. **Problems & Solutions** (47 phrases) - Handling problems effectively
13. **Emotions & Reactions** (49 phrases) - Expressing feelings
14. **Politeness & Tone** (39 phrases) - Polite and respectful communication
15. **Encouragement & Support** (30 phrases) - Supporting and motivating others
16. **Money & Practical Life** (40 phrases) - Financial matters
17. **Food & Daily Needs** (30 phrases) - Food and necessities
18. **Technology & Communication** (39 phrases) - Digital technology
19. **Travel & Public Situations** (39 phrases) - Travel and transportation
20. **Learning & Self-Improvement** (30 phrases) - Personal growth

**Total: 963 phrases**

## 🌍 Target Languages (49)

European: Spanish, French, German, Italian, Portuguese, Dutch, Polish, Russian, Ukrainian, Czech, Slovak, Romanian, Hungarian, Bulgarian, Croatian, Serbian, Slovenian, Lithuanian, Latvian, Estonian, Swedish, Norwegian, Danish, Finnish, Icelandic, Greek, Turkish

Middle Eastern/African: Arabic, Hebrew, Persian, Swahili, Amharic, Yoruba, Zulu

South Asian: Hindi, Bengali, Urdu, Punjabi, Tamil, Telugu, Marathi

East/Southeast Asian: Chinese, Japanese, Korean, Vietnamese, Thai, Indonesian, Malay, Tagalog

## 🎯 Translation Strategy

### Context-Aware Approach
Each phrase is translated with:
- **Category context** (e.g., "Daily Life & Actions")
- **Category description** for semantic understanding
- **Natural idioms** - not literal word-for-word
- **Appropriate formality** matching the English style
- **Cultural adaptation** where necessary

### Example Translation Flow

**English:** "catch up" (Socializing & Relationships)
**Context:** "Social interactions and relationship building"

**French:** "rattraper" or "prendre des nouvelles"
**Spanish:** "ponerse al día"
**German:** "sich auf den neuesten Stand bringen"

The AI considers the social context to choose the most natural equivalent.

## 🔧 Troubleshooting

### Rate Limiting
If you hit API rate limits:
- Increase delay in `translate-common-phrases.mjs` (line with `setTimeout`)
- Use smaller batch size (reduce `batchSize` variable)

### API Errors
- Check your API key is valid
- Ensure you have quota remaining in Google AI Studio
- Review error messages in console output

### Translation Quality Issues
- Review test batch first before full translation
- Adjust the translation prompt if needed
- Consider manual review of critical phrases

## 📝 Database Schema

```sql
-- Topic entry
topics: id=42, name="Common Phrases", description="Essential everyday phrases"

-- Vocabulary entries
vocabulary: topic_id=42, word_en="phrase", part_of_speech="phrase", context="category description"

-- Translations (49 per phrase)
vocabulary_translations: vocabulary_id=X, language_code="es", translated_word="..."
```

## ✅ Verification

After insertion, verify with:

```sql
-- Check vocabulary count
SELECT COUNT(*) FROM vocabulary WHERE topic_id = 42;
-- Expected: 963

-- Check translation count
SELECT COUNT(*) FROM vocabulary_translations vt 
JOIN vocabulary v ON vt.vocabulary_id = v.id 
WHERE v.topic_id = 42;
-- Expected: 47,187 (963 × 49)

-- Check translations per language
SELECT language_code, COUNT(*) 
FROM vocabulary_translations vt
JOIN vocabulary v ON vt.vocabulary_id = v.id
WHERE v.topic_id = 42
GROUP BY language_code
ORDER BY language_code;
-- Each language should have 963 translations
```

## 🎉 Next Steps

After successful insertion:
1. Test the app with the new topic
2. Verify translations in the language selector
3. Check audio playback (if B2 audio files exist)
4. Update free/premium access settings as needed

## 💡 Tips

- Run test batch first to validate approach
- Monitor translation quality in different languages
- Keep translation JSON files as backup
- Consider periodic review/updates based on user feedback
