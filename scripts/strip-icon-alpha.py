#!/usr/bin/env python3
"""Remove the alpha channel from the iOS app icons (Apple rejects icons with alpha).

Lossless: decodes each RGBA PNG, composites any non-opaque pixels onto a solid
background (the icon's own corner color, or white as a fallback), and re-encodes
as a plain RGB PNG. Run from anywhere; targets the AppIcon.appiconset.
"""
import os, struct, zlib, sys

ICON_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset",
)

def read_chunks(data):
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    i = 8
    idat = bytearray()
    ihdr = None
    while i < len(data):
        ln = struct.unpack(">I", data[i:i+4])[0]
        typ = data[i+4:i+8]
        chunk = data[i+8:i+8+ln]
        if typ == b"IHDR": ihdr = chunk
        elif typ == b"IDAT": idat += chunk
        elif typ == b"IEND": break
        i += 12 + ln
    return ihdr, bytes(idat)

def paeth(a, b, c):
    p = a + b - c
    pa, pb, pc = abs(p-a), abs(p-b), abs(p-c)
    if pa <= pb and pa <= pc: return a
    if pb <= pc: return b
    return c

def unfilter(raw, width, height, bpp):
    stride = width * bpp
    out = bytearray()
    prev = bytearray(stride)
    pos = 0
    for _ in range(height):
        ft = raw[pos]; pos += 1
        line = bytearray(raw[pos:pos+stride]); pos += stride
        if ft == 1:
            for x in range(bpp, stride):
                line[x] = (line[x] + line[x-bpp]) & 0xFF
        elif ft == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 0xFF
        elif ft == 3:
            for x in range(stride):
                a = line[x-bpp] if x >= bpp else 0
                line[x] = (line[x] + ((a + prev[x]) >> 1)) & 0xFF
        elif ft == 4:
            for x in range(stride):
                a = line[x-bpp] if x >= bpp else 0
                c = prev[x-bpp] if x >= bpp else 0
                line[x] = (line[x] + paeth(a, prev[x], c)) & 0xFF
        out += line
        prev = line
    return out

def chunk(typ, data):
    return (struct.pack(">I", len(data)) + typ + data
            + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF))

def encode_rgb(width, height, rgb):
    stride = width * 3
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter: None
        raw += rgb[y*stride:(y+1)*stride]
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
            + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))

def process(path):
    with open(path, "rb") as f:
        ihdr, idat = read_chunks(f.read())
    w, h, bd, ct = struct.unpack(">IIBB", ihdr[:10])
    if ct != 6:
        return f"skip (colortype {ct}, no alpha)"
    rgba = unfilter(zlib.decompress(idat), w, h, 4)
    # corner color (top-left); use as matte if opaque, else white
    bg = rgba[0:3] if rgba[3] == 255 else b"\xff\xff\xff"
    min_a = 255
    rgb = bytearray(w * h * 3)
    for p in range(w * h):
        r, g, b, a = rgba[p*4:p*4+4]
        if a < min_a: min_a = a
        if a == 255:
            rgb[p*3], rgb[p*3+1], rgb[p*3+2] = r, g, b
        else:
            rgb[p*3]   = (r*a + bg[0]*(255-a)) // 255
            rgb[p*3+1] = (g*a + bg[1]*(255-a)) // 255
            rgb[p*3+2] = (b*a + bg[2]*(255-a)) // 255
    with open(path, "wb") as f:
        f.write(encode_rgb(w, h, bytes(rgb)))
    matte = "n/a (fully opaque)" if min_a == 255 else f"rgb{tuple(bg)}"
    return f"min_alpha={min_a:3d}  matte={matte}"

def main():
    files = sorted(f for f in os.listdir(ICON_DIR) if f.endswith(".png"))
    for f in files:
        print(f"{f:30s} {process(os.path.join(ICON_DIR, f))}")
    print(f"\nDone: {len(files)} icons re-encoded as opaque RGB.")

if __name__ == "__main__":
    main()
