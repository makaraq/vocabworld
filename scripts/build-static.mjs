#!/usr/bin/env node
// Cross-platform assembler for the 'out/' static export from Next.js 16 build artifacts.
// Next.js 16 stopped writing out/ automatically; this replicates that step.
//
// Unlike build-ios.mjs (which is macOS/bash-only — it inlines `CAPACITOR_BUILD=true` and
// uses LANG=… in the npm script), this passes CAPACITOR_BUILD through the execSync env
// object, so it runs identically on Windows, macOS, and Linux. Used by `npm run build:android`.

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const root = path.resolve(import.meta.dirname, '..')
const nextDir = path.join(root, '.next')
const outDir = path.join(root, 'out')

// 1. Run Next.js build (static export gated by CAPACITOR_BUILD in next.config.mjs)
console.log('Building Next.js...')
execSync('npx next build', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, CAPACITOR_BUILD: 'true' },
})

// 2. Clean and recreate out/
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

// 3. Copy public/ assets
const publicDir = path.join(root, 'public')
if (fs.existsSync(publicDir)) {
  copyDir(publicDir, outDir)
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

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
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
