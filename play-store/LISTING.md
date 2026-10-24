# Sprind on Google Play: everything to paste in

Everything in this folder is ready to upload. Copy and paste the text below into Play Console.

| What | File |
|---|---|
| App bundle (upload this) | `android/app/build/outputs/bundle/release/app-release.aab` |
| App icon 512×512 | `play-store/icon-512.png` |
| Feature graphic 1024×500 | `play-store/feature-graphic.png` |
| Phone screenshots (7) | `play-store/screenshots/` |
| Upload key + password | `D:\sprind\keys\` (back this folder up!) |

---

## 1. Create the developer account (only you can do this)

1. Go to https://play.google.com/console/signup and sign in with the Google account that should own the app.
2. Choose **Personal** (no paperwork) or **Organization** (needs a free D-U-N-S number, but skips step 3 below).
3. Pay the one-time $25 fee and verify your ID. This can take a few days.

## 2. Create the app

- **App name:** Sprind: Learn Languages Fast
- **Default language:** English (United Kingdom) or English (United States)
- **App or game:** App
- **Free or paid:** Free (the subscription is an in-app purchase)

## 3. Closed test: 12 testers for 14 days (personal accounts only)

New personal accounts can't publish to everyone right away. You need:
- A **closed test** with **at least 12 testers** who opt in and stay opted in for **14 days in a row**.
- After 14 days, click **Apply for production** and answer a few questions about the test.

How to do it: **Testing → Closed testing → Create track**. Upload the `.aab`, then add testers by email (a Google Group is easiest). Send the opt-in link to friends and family. They must install the app from that link.

---

## Store listing text

**App name** (30 max)
```
Sprind: Learn Languages Fast
```

**Short description** (80 max)
```
Picture flashcards with native audio. Learn real words in 50 languages, fast.
```

**Full description** (4000 max)
```
Learn the words you'll actually use, in 50 languages.

Sprind turns vocabulary into short, visual flashcard sessions. You see a picture, hear the word spoken by a native voice, and it sticks. No grammar drills, no walls of text. Just the words that get you through real life.

PICTURE FLASHCARDS
Every word comes with an illustration and its translation, so you remember what it means, not just how it's spelled.

HEAR EVERY WORD SPOKEN
Native-quality audio for every word and sentence. Slow it down, speed it up, and set the pause between words to match your pace.

READY FOR REAL LIFE
Each word comes with real example sentences, so you learn how it's used, not just what it means. Start with a First Aid Kit of essentials: greetings, numbers, time, directions, emergencies and travel.

NEVER LOSE A WORD AGAIN
Smart review brings back the words you're about to forget. Quick Recall quizzes keep them fresh in a few taps.

YOUR WORDS, YOUR WAY
Save words to your own playlists, such as "Trip to Madrid" or "Words I always forget", and search any word to get its translation instantly.

KEEP YOUR STREAK ALIVE
Track words learned, your daily streak, badges and progress for each language. Join the leaderboard if you want to (it's off by default).

LEARN FROM ANY LANGUAGE
Pick your own language and the one you want to learn from 50 options, including Spanish, French, German, Italian, Portuguese, Japanese, Korean, Chinese, Arabic, Turkish and Russian. The app itself is available in 19 languages.

SPRIND PREMIUM
Try every topic free for 7 days. Premium unlocks every topic, custom playlists, word search and premium themes. Billed monthly or yearly through Google Play; cancel anytime in your Google Play subscriptions.

Privacy policy: https://www.sprind.uk/privacy-policy
Terms of service: https://www.sprind.uk/terms-of-service
```

**Category:** Education
**Tags:** Language learning, Education, Flashcards
**Contact email:** support@sprind.uk
**Website:** https://www.sprind.uk
**Privacy policy URL:** https://www.sprind.uk/privacy-policy

---

## App content forms (Policy → App content)

**Privacy policy:** https://www.sprind.uk/privacy-policy

**Ads:** No, the app does not contain ads.

**App access:** "All or some functionality is restricted". Google's reviewers need a login.
Create a free test account in the app (Continue with Email → Create one), then enter its email and password here.
Note: "Premium content requires a subscription; a 7-day free trial is available."

**Content rating (IARC questionnaire):**
- Category: *Reference, News, or Educational*
- Violence, sexual content, profanity, drugs, gambling: **No** to all
- Users can interact or exchange content with each other: **No** (no chat. The opt-in leaderboard only shows first name, photo, words and streak)
- Shares user's current location: **No**
- Digital purchases: **Yes**
- Expected rating: Everyone / PEGI 3

**Target audience:** 13–15, 16–17, 18+ (the privacy policy says not for under-13s). Appeals to children: **No**.

**News app:** No. **Government app:** No. **Financial features:** None. **Health:** None.

**Account deletion:**
- Can users create an account? **Yes**
- Delete account URL: `https://www.sprind.uk/privacy-policy#account-deletion`
- In-app: Account → Manage Account → Delete Account

**Data safety:**
- Does the app collect or share user data? **Yes, collects.** Shared with third parties: **No** (Supabase and RevenueCat are service providers, which Google doesn't count as sharing).
- Encrypted in transit: **Yes**
- Users can request deletion: **Yes**

| Data type | Collected | Purpose | Optional? |
|---|---|---|---|
| Personal info → Name | Yes | Account management, App functionality | Required |
| Personal info → Email address | Yes | Account management, App functionality | Required |
| Personal info → User IDs | Yes | Account management, App functionality | Required |
| Photos → (profile picture from Google sign-in) | Yes | App functionality (leaderboard) | Optional |
| Financial info → Purchase history | Yes | App functionality (subscription status) | Required |
| App activity → App interactions (learning progress) | Yes | App functionality | Required |
| App activity → Other user-generated content (playlists) | Yes | App functionality | Optional |

No location, contacts, messages, health, files, calendar, audio recordings, device IDs for ads, or analytics/crash SDKs.

---

## After the account exists: turn on payments (about 20 min)

The build is safe without this: it hides purchases instead of crashing. But the subscription won't work until:

1. **Play Console → Monetize → Subscriptions:** create the same products as on iOS (monthly and yearly, plus the 7-day free trial offer on yearly).
2. **RevenueCat → Project → Apps → + New → Google Play:** package `com.sprind.app`, upload a Google Cloud service-account JSON (RevenueCat walks you through this), and attach the products to the same entitlement and offering as iOS.
3. Copy the **`goog_...`** public API key into `.env.local` as `NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY`, and bump `versionCode` in `android/app/build.gradle` (1 → 2).
4. Rebuild and upload. Claude can do this step: ask it to "build the Play bundle".

---

Upload key SHA-256 (sometimes asked for):
`59:7A:B4:4A:62:59:D8:7F:60:34:B0:7C:79:19:63:1C:29:33:38:2F:4F:0B:0A:90:75:90:E2:A1:0B:AD:7A:EC`
