#!/bin/sh
set -e

brew install node

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci --legacy-peer-deps

# The Next.js static export (output: 'export') inlines NEXT_PUBLIC_* vars at
# build time, so these two PUBLIC values must be present in the environment when
# `next build` runs. Define them in App Store Connect -> Xcode Cloud -> your
# workflow -> Environment; they propagate to this script and its child processes.
# The service-role key is intentionally NOT required here (the build no longer
# instantiates service-role clients at module load).
missing=""
[ -z "$NEXT_PUBLIC_SUPABASE_URL" ] && missing="$missing NEXT_PUBLIC_SUPABASE_URL"
[ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] && missing="$missing NEXT_PUBLIC_SUPABASE_ANON_KEY"
if [ -n "$missing" ]; then
  echo "ERROR: missing required build env var(s):$missing" >&2
  echo "Set them in Xcode Cloud workflow Environment, then re-run." >&2
  exit 1
fi
echo "Supabase env present (URL length: ${#NEXT_PUBLIC_SUPABASE_URL})"

npm run build:ios

cd "$CI_PRIMARY_REPOSITORY_PATH/ios/App"
pod install
