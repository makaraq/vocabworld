#!/bin/sh
set -e

brew install node

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci

cd "$CI_PRIMARY_REPOSITORY_PATH/ios/App"
pod install
