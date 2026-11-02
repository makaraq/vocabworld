// Writes the Solar icons the iPhone's native screens use into the app's asset
// catalog (ios/App/App/Assets.xcassets/Solar) as vector images, template
// rendered so they take their colour from the text around them. They come
// from the same icon data the web pages draw (lib/icons/data/solar.json), so
// both look the same. Re-run after adding a name below:
//
//   node scripts/build-native-icons.mjs

import fs from 'node:fs'
import path from 'node:path'

const ICONS = [
  'add-square-bold', 'alt-arrow-down-linear', 'alt-arrow-right-linear', 'alt-arrow-up-linear',
  'arrow-right-linear', 'bell-bold', 'check-read-linear', 'close-circle-bold', 'cloud-check-bold',
  'cloud-download-bold', 'crown-bold', 'download-minimalistic-bold', 'lock-keyhole-bold', 'logout-3-bold',
  'medal-ribbons-star-bold', 'palette-bold', 'pause-bold', 'play-bold', 'settings-bold',
  'trash-bin-trash-bold', 'users-group-rounded-bold', 'widget-5-bold',
]

const solar = JSON.parse(fs.readFileSync('lib/icons/data/solar.json', 'utf8'))
const dir = 'ios/App/App/Assets.xcassets/Solar'
const info = { author: 'xcode', version: 1 }

fs.rmSync(dir, { recursive: true, force: true })
fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(dir, 'Contents.json'), JSON.stringify({ info }, null, 2) + '\n')

for (const name of ICONS) {
  const icon = solar.icons[name]
  if (!icon) throw new Error(`solar:${name} is not in lib/icons/data/solar.json`)
  const width = icon.width ?? solar.width ?? 24
  const height = icon.height ?? solar.height ?? 24
  const left = icon.left ?? solar.left ?? 0
  const top = icon.top ?? solar.top ?? 0
  // Template images use only the shape; the colour comes from the app.
  const body = icon.body.replaceAll('currentColor', '#000000')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${left} ${top} ${width} ${height}">${body}</svg>\n`
  const asset = `solar-${name}`
  const set = path.join(dir, `${asset}.imageset`)
  fs.mkdirSync(set)
  fs.writeFileSync(path.join(set, `${asset}.svg`), svg)
  fs.writeFileSync(path.join(set, 'Contents.json'), JSON.stringify({
    images: [{ filename: `${asset}.svg`, idiom: 'universal' }],
    info,
    properties: { 'preserves-vector-representation': true, 'template-rendering-intent': 'template' },
  }, null, 2) + '\n')
}
console.log(`${ICONS.length} icons written to ${dir}`)
