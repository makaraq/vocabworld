#!/usr/bin/env node
// Generates Android launcher icons + splash images from assets/ sources, overwriting the
// files Capacitor scaffolds under android/app/src/main/res. Uses the project's top-level
// `sharp` (the @capacitor/assets tool won't install on Windows — it bundles an old sharp
// that needs Visual Studio build tools). Re-run after changing assets/icon-only.png or
// assets/splash.png. Brand color: #fb6602 (matches capacitor.config.ts splash background).

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const root = path.resolve(import.meta.dirname, '..')
const res = path.join(root, 'android/app/src/main/res')
const iconSrc = path.join(root, 'assets/icon-only.png')   // 1024x1024 brand icon
const splashSrc = path.join(root, 'assets/splash.png')    // 2732x2732 brand splash
const BRAND = '#fb6602'

// Standard Android densities → legacy launcher px (48dp base) and adaptive px (108dp base).
const launcherPx   = { mdpi: 48,  hdpi: 72,  xhdpi: 96,  xxhdpi: 144, xxxhdpi: 192 }
const foregroundPx = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 }

const circleMask = (size) =>
  Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`)

async function run() {
  // 1. Legacy square + round launcher icons
  for (const [d, size] of Object.entries(launcherPx)) {
    const dir = path.join(res, `mipmap-${d}`)
    await sharp(iconSrc).resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'))
    await sharp(iconSrc)
      .resize(size, size)
      .composite([{ input: circleMask(size), blend: 'dest-in' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'))
  }

  // 2. Adaptive icon foreground — icon at ~66% in the centered safe zone, transparent canvas
  for (const [d, size] of Object.entries(foregroundPx)) {
    const inner = Math.round(size * 0.66)
    const offset = Math.round((size - inner) / 2)
    const fg = await sharp(iconSrc).resize(inner, inner).png().toBuffer()
    await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: fg, top: offset, left: offset }])
      .png()
      .toFile(path.join(res, `mipmap-${d}`, 'ic_launcher_foreground.png'))
  }

  // 3. Splash — match each scaffolded splash.png's existing dimensions, logo centered on brand bg
  const splashDirs = fs.readdirSync(res).filter((d) => /^drawable(-(land|port))?(-\w+dpi)?$/.test(d))
  let splashCount = 0
  for (const dir of splashDirs) {
    const file = path.join(res, dir, 'splash.png')
    if (!fs.existsSync(file)) continue
    const { width, height } = await sharp(file).metadata()
    await sharp(splashSrc)
      .resize(width, height, { fit: 'contain', background: BRAND })
      .png()
      .toFile(file + '.tmp')
    fs.renameSync(file + '.tmp', file)
    splashCount++
  }

  // 4. Notification small icon (ic_notification) — Android renders the small icon as a
  //    white-on-transparent silhouette. Extract the bright "S" glyph by luminance threshold.
  const notifPx = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 }
  for (const [d, size] of Object.entries(notifPx)) {
    const dir = path.join(res, `drawable-${d}`)
    fs.mkdirSync(dir, { recursive: true })
    const a = await sharp(iconSrc).resize(size, size).grayscale().normalise().threshold(165).raw().toBuffer()
    const rgba = Buffer.alloc(size * size * 4)
    for (let i = 0; i < size * size; i++) {
      rgba[i * 4] = 255; rgba[i * 4 + 1] = 255; rgba[i * 4 + 2] = 255; rgba[i * 4 + 3] = a[i]
    }
    await sharp(rgba, { raw: { width: size, height: size, channels: 4 } })
      .png()
      .toFile(path.join(dir, 'ic_notification.png'))
  }

  console.log(`Android icons + ${splashCount} splash images + notification icons generated (brand ${BRAND}).`)
}

run().catch((e) => { console.error(e); process.exit(1) })
