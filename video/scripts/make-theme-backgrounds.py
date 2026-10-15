"""Recolours the app's backdrop (public/app/bg.jpeg) for the theme lab.

Writes public/themes/*.jpg (git-ignored). Run after `npm run sync`:
  python3 scripts/make-theme-backgrounds.py   (needs Pillow and numpy)
"""
import colorsys
import os

import numpy as np
from PIL import Image

root = os.path.join(os.path.dirname(__file__), "..")
src = Image.open(os.path.join(root, "public", "app", "bg.jpeg")).convert("RGB")
src.thumbnail((2400, 1350))
out = os.path.join(root, "public", "themes")
os.makedirs(out, exist_ok=True)
rgb = np.asarray(src).astype(np.float32) / 255


def hsv(a):
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = np.where(m & (mx == r), ((g - b) / np.where(m, d, 1)) % 6, h)
    h = np.where(m & (mx == g), (b - r) / np.where(m, d, 1) + 2, h)
    h = np.where(m & (mx == b), (r - g) / np.where(m, d, 1) + 4, h)
    return (h / 6) % 1, np.where(mx > 0, d / np.where(mx > 0, mx, 1), 0), mx


def from_hsv(h, s, v):
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    chans = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]
    res = np.zeros(h.shape + (3,), np.float32)
    for k, (r, g, b) in enumerate(chans):
        mask = i == k
        res[mask] = np.stack([r[mask], g[mask], b[mask]], -1)
    return res


H, S, V = hsv(rgb)


def save(name, arr):
    Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8)).save(os.path.join(out, name + ".jpg"), quality=86)
    print("wrote", name)


for name, deg in (("hue-rose", -35), ("hue-lime", 55), ("hue-teal", 130), ("hue-ocean", 190), ("hue-indigo", 240), ("hue-magenta", 295)):
    save(name, from_hsv((H + deg / 360) % 1, S, V))
save("muted", from_hsv(H, S * 0.45, V))
save("dim", from_hsv(H, np.clip(S * 1.05, 0, 1), V * 0.55))
gray = rgb @ np.array([0.3, 0.59, 0.11], np.float32)
save("mono", np.stack([gray] * 3, -1))
# A warm duotone: shadows plum, highlights cream.
lo, hi = np.array([0.12, 0.05, 0.14]), np.array([1.0, 0.86, 0.6])
save("duotone-plum", lo + (hi - lo) * gray[..., None] ** 1.1)
