// Turns a WOFF2 web font back into a TrueType file, so the iPhone app's native
// screens can use exactly the font the web pages do (Space Grotesk, which
// next/font/google stores as WOFF2). iOS can't load WOFF2 itself.
//
//   node scripts/woff2-to-ttf.mjs <in.woff2> <out.ttf> [--rename "Family"]
//
// --rename gives the font its own family and PostScript names, for a second
// subset that sits beside the first as a fallback (CoreText won't register two
// fonts with one name).
//
// Follows the W3C WOFF2 spec: the tables come out of one Brotli stream, and a
// transformed glyf/loca (and hmtx) are rebuilt. Glyph outlines are written out
// plainly (two-byte coordinates, no flag repeats): a little larger, identical
// shapes.

import fs from 'node:fs'
import zlib from 'node:zlib'

const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ',
  'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS',
  'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc',
  'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop',
  'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill',
]

class Reader {
  constructor(buf) { this.b = buf; this.p = 0 }
  u8() { return this.b[this.p++] }
  u16() { const v = this.b.readUInt16BE(this.p); this.p += 2; return v }
  i16() { const v = this.b.readInt16BE(this.p); this.p += 2; return v }
  u32() { const v = this.b.readUInt32BE(this.p); this.p += 4; return v }
  bytes(n) { const s = this.b.subarray(this.p, this.p + n); this.p += n; return s }
  base128() {
    let v = 0
    for (let i = 0; i < 5; i++) {
      const c = this.u8()
      if (i === 0 && c === 0x80) throw new Error('UIntBase128 with a leading zero')
      v = v * 128 + (c & 0x7f)
      if (!(c & 0x80)) return v
    }
    throw new Error('UIntBase128 longer than 5 bytes')
  }
  u255() {
    const c = this.u8()
    if (c === 253) return this.u16()
    if (c === 255) return this.u8() + 253
    if (c === 254) return this.u8() + 506
    return c
  }
}

const withSign = (flag, value) => (flag & 1 ? value : -value)

function simpleGlyph(nContours, bbox, endPts, instructions, onCurve, xs, ys) {
  const n = xs.length
  const out = Buffer.alloc(10 + 2 * nContours + 2 + instructions.length + n + 4 * n)
  let p = 0
  out.writeInt16BE(nContours, p); p += 2
  for (const v of bbox) { out.writeInt16BE(v, p); p += 2 }
  for (const e of endPts) { out.writeUInt16BE(e, p); p += 2 }
  out.writeUInt16BE(instructions.length, p); p += 2
  instructions.copy(out, p); p += instructions.length
  for (let i = 0; i < n; i++) out[p++] = onCurve[i] ? 1 : 0
  let last = 0
  for (let i = 0; i < n; i++) { out.writeInt16BE(xs[i] - last, p); p += 2; last = xs[i] }
  last = 0
  for (let i = 0; i < n; i++) { out.writeInt16BE(ys[i] - last, p); p += 2; last = ys[i] }
  return out
}

function compositeGlyph(bbox, components, instructions) {
  const out = Buffer.alloc(10 + components.length + (instructions ? 2 + instructions.length : 0))
  let p = 0
  out.writeInt16BE(-1, p); p += 2
  for (const v of bbox) { out.writeInt16BE(v, p); p += 2 }
  components.copy(out, p); p += components.length
  if (instructions) {
    out.writeUInt16BE(instructions.length, p); p += 2
    instructions.copy(out, p)
  }
  return out
}

/** Rebuilds glyf from the transformed form; also returns each glyph's xMin, for hmtx. */
function decodeGlyf(data) {
  const r = new Reader(data)
  r.u16() // reserved
  r.u16() // optionFlags (an overlap bitmap may follow the streams; not needed)
  const numGlyphs = r.u16()
  r.u16() // indexFormat: loca is rebuilt in the long format whatever it was
  const sizes = Array.from({ length: 7 }, () => r.u32())
  const streams = []
  let p = r.p
  for (const size of sizes) { streams.push(new Reader(data.subarray(p, p + size))); p += size }
  const [contours, points, flagStream, glyphStream, compositeStream, bboxStream, instructionStream] = streams
  const bboxBitmap = bboxStream.bytes(4 * Math.floor((numGlyphs + 31) / 32))

  const glyphs = []
  const xMins = []
  for (let g = 0; g < numGlyphs; g++) {
    const nContours = contours.i16()
    const hasBbox = (bboxBitmap[g >> 3] & (0x80 >> (g & 7))) !== 0
    if (nContours === 0) {
      glyphs.push(Buffer.alloc(0))
      xMins.push(0)
      continue
    }
    if (nContours > 0) {
      const endPts = []
      let total = 0
      for (let c = 0; c < nContours; c++) { total += points.u255(); endPts.push(total - 1) }
      const flags = flagStream.bytes(total)
      const xs = [], ys = [], onCurve = []
      let x = 0, y = 0
      for (let i = 0; i < total; i++) {
        const flag = flags[i] & 0x7f
        onCurve.push((flags[i] >> 7) === 0)
        const d = glyphStream.bytes(flag < 84 ? 1 : flag < 120 ? 2 : flag < 124 ? 3 : 4)
        let dx, dy
        if (flag < 10) {
          dx = 0
          dy = withSign(flag, ((flag & 14) << 7) + d[0])
        } else if (flag < 20) {
          dx = withSign(flag, (((flag - 10) & 14) << 7) + d[0])
          dy = 0
        } else if (flag < 84) {
          const b0 = flag - 20
          dx = withSign(flag, 1 + (b0 & 0x30) + (d[0] >> 4))
          dy = withSign(flag >> 1, 1 + ((b0 & 0x0c) << 2) + (d[0] & 0x0f))
        } else if (flag < 120) {
          const b0 = flag - 84
          dx = withSign(flag, 1 + (Math.floor(b0 / 12) << 8) + d[0])
          dy = withSign(flag >> 1, 1 + (((b0 % 12) >> 2) << 8) + d[1])
        } else if (flag < 124) {
          dx = withSign(flag, (d[0] << 4) + (d[1] >> 4))
          dy = withSign(flag >> 1, ((d[1] & 0x0f) << 8) + d[2])
        } else {
          dx = withSign(flag, (d[0] << 8) + d[1])
          dy = withSign(flag >> 1, (d[2] << 8) + d[3])
        }
        x += dx
        y += dy
        xs.push(x)
        ys.push(y)
      }
      const instructions = instructionStream.bytes(glyphStream.u255())
      const bbox = hasBbox
        ? [bboxStream.i16(), bboxStream.i16(), bboxStream.i16(), bboxStream.i16()]
        : [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
      glyphs.push(simpleGlyph(nContours, bbox, endPts, instructions, onCurve, xs, ys))
      xMins.push(bbox[0])
      continue
    }
    // Composite: its component records are copied as they are.
    const start = compositeStream.p
    let more = true, hasInstructions = false
    while (more) {
      const flags = compositeStream.u16()
      compositeStream.u16() // glyph index
      compositeStream.p += flags & 0x0001 ? 4 : 2
      if (flags & 0x0008) compositeStream.p += 2
      else if (flags & 0x0040) compositeStream.p += 4
      else if (flags & 0x0080) compositeStream.p += 8
      if (flags & 0x0100) hasInstructions = true
      more = (flags & 0x0020) !== 0
    }
    const components = compositeStream.b.subarray(start, compositeStream.p)
    const bbox = [bboxStream.i16(), bboxStream.i16(), bboxStream.i16(), bboxStream.i16()]
    const instructions = hasInstructions ? instructionStream.bytes(glyphStream.u255()) : null
    glyphs.push(compositeGlyph(bbox, components, instructions))
    xMins.push(bbox[0])
  }
  return { glyphs, xMins }
}

function decodeHmtx(data, numGlyphs, numHMetrics, xMins) {
  const r = new Reader(data)
  const flags = r.u8()
  const advances = Array.from({ length: numHMetrics }, () => r.u16())
  const lsbs = []
  for (let i = 0; i < numHMetrics; i++) lsbs.push(flags & 1 ? xMins[i] : r.i16())
  for (let i = numHMetrics; i < numGlyphs; i++) lsbs.push(flags & 2 ? xMins[i] : r.i16())
  const out = Buffer.alloc(4 * numHMetrics + 2 * (numGlyphs - numHMetrics))
  let p = 0
  for (let i = 0; i < numHMetrics; i++) { out.writeUInt16BE(advances[i], p); out.writeInt16BE(lsbs[i], p + 2); p += 4 }
  for (let i = numHMetrics; i < numGlyphs; i++) { out.writeInt16BE(lsbs[i], p); p += 2 }
  return out
}

/** Swaps the family (1, 16), full (4) and PostScript (6) names for `family`. */
function renameFont(name, family) {
  const r = new Reader(name)
  r.u16()
  const count = r.u16()
  const stringOffset = r.u16()
  const records = []
  for (let i = 0; i < count; i++) {
    const rec = { platform: r.u16(), encoding: r.u16(), language: r.u16(), id: r.u16(), length: r.u16(), offset: r.u16() }
    rec.bytes = name.subarray(stringOffset + rec.offset, stringOffset + rec.offset + rec.length)
    records.push(rec)
  }
  const postscript = family.replace(/[^A-Za-z0-9-]/g, '')
  const encode = (rec, text) => {
    if (rec.platform === 3 || rec.platform === 0) {
      const b = Buffer.alloc(text.length * 2)
      for (let i = 0; i < text.length; i++) b.writeUInt16BE(text.charCodeAt(i), i * 2)
      return b
    }
    return Buffer.from(text, 'latin1')
  }
  for (const rec of records) {
    if (rec.id === 1 || rec.id === 16 || rec.id === 4) rec.bytes = encode(rec, family)
    else if (rec.id === 6) rec.bytes = encode(rec, postscript)
  }
  const strings = Buffer.concat(records.map((rec) => rec.bytes))
  const out = Buffer.alloc(6 + 12 * count + strings.length)
  out.writeUInt16BE(0, 0)
  out.writeUInt16BE(count, 2)
  out.writeUInt16BE(6 + 12 * count, 4)
  let offset = 0
  records.forEach((rec, i) => {
    const p = 6 + 12 * i
    out.writeUInt16BE(rec.platform, p)
    out.writeUInt16BE(rec.encoding, p + 2)
    out.writeUInt16BE(rec.language, p + 4)
    out.writeUInt16BE(rec.id, p + 6)
    out.writeUInt16BE(rec.bytes.length, p + 8)
    out.writeUInt16BE(offset, p + 10)
    offset += rec.bytes.length
  })
  strings.copy(out, 6 + 12 * count)
  return out
}

function checksum(buf) {
  let sum = 0
  const padded = buf.length % 4 ? Buffer.concat([buf, Buffer.alloc(4 - (buf.length % 4))]) : buf
  for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0
  return sum
}

export function woff2ToTtf(woff2, { rename } = {}) {
  const r = new Reader(woff2)
  if (r.u32() !== 0x774f4632) throw new Error('not a WOFF2 file')
  const flavor = r.u32()
  if (flavor === 0x74746366) throw new Error('font collections are not handled')
  r.u32() // length
  const numTables = r.u16()
  r.u16() // reserved
  r.u32() // totalSfntSize
  const compressedSize = r.u32()
  r.p += 24 // versions, metadata and private-data locations

  const tables = []
  for (let i = 0; i < numTables; i++) {
    const flags = r.u8()
    const tag = (flags & 0x3f) === 63 ? r.bytes(4).toString('latin1') : KNOWN_TAGS[flags & 0x3f]
    const version = flags >> 6
    const origLength = r.base128()
    const transformed = tag === 'glyf' || tag === 'loca' ? version !== 3 : version !== 0
    const length = transformed ? r.base128() : origLength
    tables.push({ tag, transformed, length })
  }
  const stream = zlib.brotliDecompressSync(woff2.subarray(r.p, r.p + compressedSize))
  let offset = 0
  for (const t of tables) { t.data = stream.subarray(offset, offset + t.length); offset += t.length }

  const byTag = Object.fromEntries(tables.map((t) => [t.tag, t]))
  const out = new Map(tables.map((t) => [t.tag, Buffer.from(t.data)]))
  const numGlyphs = out.get('maxp').readUInt16BE(4)

  if (byTag.glyf?.transformed) {
    const { glyphs, xMins } = decodeGlyf(byTag.glyf.data)
    if (glyphs.length !== numGlyphs) throw new Error(`glyf has ${glyphs.length} glyphs, maxp says ${numGlyphs}`)
    const padded = glyphs.map((g) => (g.length % 4 ? Buffer.concat([g, Buffer.alloc(4 - (g.length % 4))]) : g))
    const loca = Buffer.alloc(4 * (numGlyphs + 1))
    let at = 0
    padded.forEach((g, i) => { loca.writeUInt32BE(at, 4 * i); at += g.length })
    loca.writeUInt32BE(at, 4 * numGlyphs)
    out.set('glyf', Buffer.concat(padded))
    out.set('loca', loca)
    out.get('head').writeInt16BE(1, 50) // indexToLocFormat: long
    if (byTag.hmtx?.transformed) {
      const numHMetrics = out.get('hhea').readUInt16BE(34)
      out.set('hmtx', decodeHmtx(byTag.hmtx.data, numGlyphs, numHMetrics, xMins))
    }
  } else if (byTag.hmtx?.transformed) {
    throw new Error('a transformed hmtx needs a transformed glyf')
  }
  if (rename) out.set('name', renameFont(out.get('name'), rename))

  const tags = [...out.keys()].sort()
  const n = tags.length
  const entrySelector = Math.floor(Math.log2(n))
  const searchRange = 16 * 2 ** entrySelector
  const header = Buffer.alloc(12 + 16 * n)
  header.writeUInt32BE(flavor, 0)
  header.writeUInt16BE(n, 4)
  header.writeUInt16BE(searchRange, 6)
  header.writeUInt16BE(entrySelector, 8)
  header.writeUInt16BE(n * 16 - searchRange, 10)
  out.get('head').writeUInt32BE(0, 8) // checkSumAdjustment, filled in below
  const parts = [header]
  let position = header.length
  tags.forEach((tag, i) => {
    const data = out.get(tag)
    const record = 12 + 16 * i
    header.write(tag, record, 'latin1')
    header.writeUInt32BE(checksum(data), record + 4)
    header.writeUInt32BE(position, record + 8)
    header.writeUInt32BE(data.length, record + 12)
    const padding = (4 - (data.length % 4)) % 4
    parts.push(data, Buffer.alloc(padding))
    position += data.length + padding
  })
  const font = Buffer.concat(parts)
  const headAt = header.readUInt32BE(12 + 16 * tags.indexOf('head') + 8)
  font.writeUInt32BE((0xb1b0afba - checksum(font)) >>> 0, headAt + 8)
  return font
}

if (process.argv[1] && process.argv[1].endsWith('woff2-to-ttf.mjs')) {
  const [input, output, flag, family] = process.argv.slice(2)
  if (!input || !output) {
    console.error('usage: node scripts/woff2-to-ttf.mjs <in.woff2> <out.ttf> [--rename "Family"]')
    process.exit(1)
  }
  const font = woff2ToTtf(fs.readFileSync(input), { rename: flag === '--rename' ? family : undefined })
  fs.writeFileSync(output, font)
  console.log(`${output}: ${font.length} bytes`)
}
