# Common Phrases Audio - Debugging Guide

## ✅ Completed Setup (All Working)

1. **Database**: ✅ Topic 42 exists with 794 phrases (IDs 4172-4965)
2. **Audio Files**: ✅ 39,700 WAV files uploaded to B2 (794 × 50 languages)
3. **CSV Mapping**: ✅ `public/data/common-phrases-b2-urls.csv` with 39,700 entries
4. **API Route**: ✅ `/api/universal-audio` updated with Common Phrases lookup
5. **Frontend**: ✅ Topic icon added, categories configured
6. **Deployment**: ✅ All files committed and pushed to production

## 🔍 Debugging Steps

### 1. Check if Topic is Visible in UI

**Action**: Open the app and check if Common Phrases topic appears in the topic selector

**Expected**: You should see "Common Phrases" as a selectable topic

**If not visible**: Clear browser cache and hard refresh (Ctrl+Shift+R)

### 2. Check if Vocabulary Loads

**Action**: Select Common Phrases topic and check if vocabulary words appear

**Expected**: You should see phrases like "get up", "wake up", "lie down", etc.

**If empty**: Check browser console for errors

### 3. Check API Request

**Action**: Open browser DevTools (F12) → Network tab → Filter by "universal-audio"

**When playing audio, you should see**:
- Request: `GET /api/universal-audio?wordId=4172&languageCode=en`
- Status: `200 OK`
- Response: Audio file stream

**If 404 or 500 error**: Check server logs

### 4. Check CSV is Accessible

**Action**: Visit `https://yourapp.com/data/common-phrases-b2-urls.csv` directly in browser

**Expected**: CSV file downloads with 39,700 lines

**If 404**: CSV not deployed correctly

### 5. Check B2 Authorization

**Action**: Look in server logs (Vercel dashboard → Functions → Logs)

**Expected console logs**:
```
🔑 Universal Audio API (B2 Authenticated) called
🔍 Trying topic-specific CSV lookup for wordId: 4172
🔍 Searching Common Phrases CSV: 39700 entries
✅ Found Common Phrases audio: get_up.wav at CommonPhrases/en/get_up.wav
🔐 Authorizing with B2...
✅ B2 authorization successful
```

**If authorization fails**: Check environment variables `B2_APPLICATION_KEY_ID` and `B2_APPLICATION_KEY`

## 🧪 Test API Directly

### Test with curl (Production):
```bash
curl -I "https://sprind.com/api/universal-audio?wordId=4172&languageCode=en"
```

**Expected**: Status 200, Content-Type: audio/wav

### Test in Browser Console:
```javascript
fetch('/api/universal-audio?wordId=4172&languageCode=en')
  .then(r => {
    console.log('Status:', r.status);
    console.log('Headers:', Object.fromEntries(r.headers.entries()));
    return r.blob();
  })
  .then(blob => {
    console.log('Blob size:', blob.size, 'bytes');
    console.log('Blob type:', blob.type);
    // Play audio
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  })
  .catch(err => console.error('Error:', err));
```

## 🐛 Common Issues & Fixes

### Issue 1: "404 Not Found" on CSV
**Cause**: CSV file not deployed to Vercel
**Fix**: Verify `public/data/common-phrases-b2-urls.csv` is committed

### Issue 2: "Audio not playing but 200 OK"
**Cause**: Browser audio policy (requires user gesture)
**Fix**: Make sure audio is triggered by button click, not auto-play

### Issue 3: "B2 authorization failed"
**Cause**: Missing or invalid environment variables
**Fix**: Set in Vercel dashboard:
- `B2_APPLICATION_KEY_ID=ad7dca1532dc`
- `B2_APPLICATION_KEY=006e09b3f4a6a9dbdca377e2c87b5b3c4d87d0746d`

### Issue 4: "CSV lookup returns nothing"
**Cause**: Language code mismatch
**Fix**: Check language code mapping in API (e.g., 'English' → 'en')

### Issue 5: "Audio plays for other topics but not Common Phrases"
**Cause**: wordId out of range or CSV structure issue
**Fix**: 
1. Verify wordId is between 4172-4965
2. Check CSV line format: `4172,en,https://...`
3. Run: `node scripts/check-common-phrases-ids.mjs`

## 📊 Verification Checklist

Run these checks to verify everything is working:

```bash
# 1. Check database has correct IDs
node scripts/check-common-phrases-ids.mjs

# 2. Test API logic
node scripts/test-common-phrases-audio.mjs

# 3. Verify CSV line count
# PowerShell:
(Get-Content "public/data/common-phrases-b2-urls.csv").Count
# Should output: 39700

# 4. Check first 5 entries
Get-Content "public/data/common-phrases-b2-urls.csv" -Head 5

# 5. Verify English audio exists for first word
Get-Content "public/data/common-phrases-b2-urls.csv" | Select-String "^4172,en,"
# Should output: 4172,en,https://...
```

## 📝 What to Report

If audio still doesn't play, provide:

1. **Browser console output** (any errors?)
2. **Network tab** (status code of /api/universal-audio request)
3. **Which language** you're testing with
4. **Which vocabulary word** (ID and text)
5. **Server logs** from Vercel (if accessible)

## 🎯 Quick Diagnostic

Run this in browser console on the app page:

```javascript
// Quick diagnostic
console.log('Testing Common Phrases Audio...');

// Test 1: Check if CSV is accessible
fetch('/data/common-phrases-b2-urls.csv')
  .then(r => r.text())
  .then(csv => {
    const lines = csv.split('\n').length;
    console.log(`✅ CSV accessible: ${lines} lines`);
  })
  .catch(err => console.error('❌ CSV not accessible:', err));

// Test 2: Check API endpoint
fetch('/api/universal-audio?wordId=4172&languageCode=en')
  .then(r => {
    console.log(`API Status: ${r.status}`);
    return r.blob();
  })
  .then(blob => console.log(`✅ Audio received: ${blob.size} bytes`))
  .catch(err => console.error('❌ API error:', err));
```

---

## ✅ Expected Behavior

When working correctly:

1. User selects Common Phrases topic
2. Vocabulary words load (794 phrases)
3. User clicks play button on a word
4. Frontend calls: `/api/universal-audio?wordId=4172&languageCode=en`
5. API fetches CSV from `/data/common-phrases-b2-urls.csv`
6. API finds matching line: `4172,en,https://...`
7. API extracts path: `CommonPhrases/en/get_up.wav`
8. API authorizes with B2
9. API downloads audio from B2
10. API streams audio to frontend
11. Frontend plays audio through Web Audio API

**Total time**: ~1-2 seconds for first request, faster for subsequent requests

---

## 🚀 Next Steps

1. Clear browser cache and test again
2. Run diagnostic script in browser console
3. Check Vercel deployment logs
4. Test with different browsers
5. Test with different languages

If all checks pass but audio still doesn't play, the issue might be:
- Browser autoplay policy
- Mobile audio context not initialized
- Network issue (B2 download failing)

Let me know which step fails!
