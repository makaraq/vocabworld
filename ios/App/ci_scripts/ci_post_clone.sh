#!/bin/sh
set -e

brew install node

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci --legacy-peer-deps

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "DIAGNOSTIC: NEXT_PUBLIC_SUPABASE_URL is EMPTY in this script's environment"
else
  echo "DIAGNOSTIC: NEXT_PUBLIC_SUPABASE_URL is SET (length: ${#NEXT_PUBLIC_SUPABASE_URL})"
fi

npm run build:ios

cd "$CI_PRIMARY_REPOSITORY_PATH/ios/App"
pod install
