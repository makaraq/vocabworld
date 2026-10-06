#!/bin/sh
set -e

brew install node

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
  exit 1
fi
echo "Supabase env present (URL length: ${#NEXT_PUBLIC_SUPABASE_URL})"

npm run build:ios

cd "$CI_PRIMARY_REPOSITORY_PATH/ios/App"
pod install
