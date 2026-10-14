import { loadFont } from '@remotion/fonts'
import { staticFile } from 'remotion'
import { FONT_FACES } from './generated/font-faces'

let loaded = false

/** Registers every bundled face; Remotion holds the render until they load. */
export function loadFonts() {
  if (loaded) return
  loaded = true
  for (const face of FONT_FACES) {
    loadFont({
      family: face.family,
      url: staticFile(`fonts/${face.file}`),
      weight: face.weight,
      style: face.style,
      unicodeRange: face.unicodeRange,
      display: 'block',
    })
  }
}
