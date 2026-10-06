#!/bin/sh
set -e

# Pin Node instead of taking whatever `brew install node` resolves to that day:
# Next 16 declares node >=20.9.0 with no upper bound, so an unpinned install
# silently moves to each new major and can break a build you did not change.
# Keep this in step with .nvmrc and package.json "engines".
# `brew list` guard keeps it idempotent — a plain re-install of an existing
# formula can exit non-zero and `set -e` would abort the whole script.
brew list node@22 >/dev/null 2>&1 || brew install node@22
export PATH="$(brew --prefix node@22)/bin:$PATH"
echo "node $(node -v) / npm $(npm -v)"

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci --legacy-peer-deps

# The Next.js static export (output: 'export') inlines NEXT_PUBLIC_* vars at
# build time, so these PUBLIC values must be present in the environment when
# `next build` runs. Define them in App Store Connect -> Xcode Cloud -> your
# workflow -> Environment; they propagate to this script and its child processes.
# The service-role key is intentionally NOT required here (the build no longer
# instantiates service-role clients at module load).
missing=""
[ -z "$NEXT_PUBLIC_SUPABASE_URL" ] && missing="$missing NEXT_PUBLIC_SUPABASE_URL"
[ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] && missing="$missing NEXT_PUBLIC_SUPABASE_ANON_KEY"
# lib/revenuecat-client.ts falls back to '' when this is unset, so a build without
# it ships an app that calls Purchases.configure({apiKey: ''}) — offerings come back
# empty and IAP silently does not work. That is the exact symptom behind the 1.0(55)
# 2.1(b) rejection, and the build would otherwise go green all the way to review.
[ -z "$NEXT_PUBLIC_REVENUECAT_IOS_API_KEY" ] && missing="$missing NEXT_PUBLIC_REVENUECAT_IOS_API_KEY"
if [ -n "$missing" ]; then
  echo "ERROR: missing required build env var(s):$missing" >&2
  echo "Set them in Xcode Cloud workflow Environment, then re-run." >&2
  # Names only, never values. If a variable is set in the Xcode Cloud UI but the
  # script still sees it as empty, the usual causes are a typo/trailing space in
  # the name, it being attached to a different workflow than the one that ran, or
  # the build having been started before it was saved. Listing what actually
  # reached this process distinguishes those without another guessing round.
  echo "--- NEXT_PUBLIC_* visible to this script (names only) ---" >&2
  env | grep -oE '^NEXT_PUBLIC_[A-Za-z0-9_]+' | sort | sed 's/^/  /' >&2 || true
  echo "--- end ---" >&2
  exit 1
fi
echo "Supabase env present (URL length: ${#NEXT_PUBLIC_SUPABASE_URL})"

npm run build:ios

cd "$CI_PRIMARY_REPOSITORY_PATH/ios/App"
# --repo-update refreshes the spec index first. Without it a freshly pinned pod
# version (PurchasesHybridCommon 18.12.0) can fail on a CI machine whose cached
# CocoaPods index predates it: "none of your spec sources contain a spec
# satisfying the dependency".
pod install --repo-update
