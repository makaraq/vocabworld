#!/bin/bash
set -e

echo "Installing npm dependencies..."
npm ci

echo "Installing iOS pods..."
cd ios/App
pod install
cd ../..

echo "Done. Run 'npm run dev' to start the web app."
echo "Open ios/App/App.xcworkspace in Xcode to build for iOS."
