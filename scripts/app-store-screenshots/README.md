# App Store screenshots

Captures the real app (Liquid Glass, default theme) signed in as a sample
Spanish learner, at the App Store sizes:

- iPhone 6.9": 1320 × 2868 (440 × 956 pt @3x)
- iPad 13": 2064 × 2752 (1032 × 1376 pt @2x)

No real account or database is involved. `mock_supabase.py` stands in for
Supabase: it signs the browser in as one sample user and answers table reads
from `sample.json`, which `build_sample.py` builds (words from
`public/data/vocabulary.json`; progress, streak, rank, playlists and example
sentences are sample values). The app's own API routes run against it.

```bash
cd scripts/app-store-screenshots
npm i --no-save playwright-core@1.55.0     # Chromium: set the path in lib.mjs
python3 mock_supabase.py sample.json &      # port 54321
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy \
  SUPABASE_SERVICE_ROLE_KEY=dummy npx next dev -p 3123 &   # from the repo root
python3 build_sample.py sample.json         # needs the dev server (reads /api/topics)
node capture.mjs iphone                     # → out/iphone/*.png
node capture.mjs ipad                       # → out/ipad/*.png (drop account-progress)
python3 compose.py                          # → screenshots/final (+ /ipad)
```

Copy `out/*` into `screenshots-source/` to keep the raw captures. The status
bar (9:41, full battery) is drawn over each capture; the dev-only Next.js badge
is hidden.
