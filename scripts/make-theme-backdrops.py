"""Builds the image backdrops for the app themes from public/bg.jpeg.

  public/themes/mono.jpg          greyscale
  public/themes/plum-duotone.jpg  plum shadows to cream highlights

Run: python3 scripts/make-theme-backdrops.py   (needs Pillow and numpy)
"""
import os

import numpy as np
from PIL import Image

root = os.path.join(os.path.dirname(__file__), "..", "public")
src = Image.open(os.path.join(root, "bg.jpeg")).convert("RGB")
src.thumbnail((2560, 1440))
rgb = np.asarray(src).astype(np.float32) / 255
gray = rgb @ np.array([0.3, 0.59, 0.11], np.float32)

out = os.path.join(root, "themes")
os.makedirs(out, exist_ok=True)


def save(name, arr):
    Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8)).save(os.path.join(out, name), quality=85, optimize=True, progressive=True)
    print("wrote", name)


save("mono.jpg", np.stack([gray] * 3, -1))
lo, hi = np.array([0.12, 0.05, 0.14]), np.array([1.0, 0.86, 0.6])
save("plum-duotone.jpg", lo + (hi - lo) * gray[..., None] ** 1.1)
