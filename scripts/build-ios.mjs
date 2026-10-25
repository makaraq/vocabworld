#!/usr/bin/env node
// Assembles the 'out/' static export directory from Next.js 16 build artifacts.
// Next.js 16 stopped writing out/ automatically; this replicates that step.

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const root = path.resolve(import.meta.dirname, '..')
const nextDir = path.join(root, '.next')
const outDir = path.join(root, 'out')

// 1. Run Next.js build
console.log('Building Next.js...')
execSync('CAPACITOR_BUILD=true npx next build', { cwd: root, stdio: 'inherit', env: { ...process.env, CAPACITOR_BUILD: 'true' } })

// 2. Clean and recreate out/
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

// 3. Copy public/ assets, minus what the app never reads from its bundle:
//  - the audio lookup CSVs (~37 MB), read only by the server's audio API
//  - the flashcard art, which the app loads from the site and caches
//    (lib/offline/word-image-cache.ts) so the install doesn't grow with it
const publicDir = path.join(root, 'public')
const skipFromBundle = new Set([
  path.join(publicDir, 'data', 'backblaze-urls-20250909-180354.csv'),
  path.join(publicDir, 'data', 'common-phrases-b2-urls.csv'),
  path.join(publicDir, 'data', 'verb-b2-urls.csv'),
  path.join(publicDir, 'word-images'),
])
if (fs.existsSync(publicDir)) {
  copyDir(publicDir, outDir, skipFromBundle)
}

// 4. Copy _next/static bundles
const staticSrc = path.join(nextDir, 'static')
const staticDest = path.join(outDir, '_next', 'static')
if (fs.existsSync(staticSrc)) {
  copyDir(staticSrc, staticDest)
}

// 5. Copy HTML pages from .next/server/app
const appDir = path.join(nextDir, 'server', 'app')
copyHtmlPages(appDir, outDir)

console.log('out/ assembled successfully.')

function copyDir(src, dest, skip = new Set()) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (skip.has(srcPath)) continue
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, skip)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function copyHtmlPages(src, dest, rel = '') {
  if (!fs.existsSync(src)) return
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const relPath = path.join(rel, entry.name)
    if (entry.isDirectory()) {
      // skip api directory — not needed in static export
      if (entry.name === 'api') continue
      copyHtmlPages(srcPath, dest, relPath)
    } else if (entry.name.endsWith('.html')) {
      // map index.html -> out/index.html, foo.html -> out/foo/index.html
      let destRel = relPath
      if (path.basename(relPath) !== 'index.html') {
        destRel = path.join(path.dirname(relPath), path.basename(relPath, '.html'), 'index.html')
      }
      const destPath = path.join(dest, destRel)
      fs.mkdirSync(path.dirname(destPath), { recursive: true })
      fs.copyFileSync(srcPath, destPath)
    }
  }
}
