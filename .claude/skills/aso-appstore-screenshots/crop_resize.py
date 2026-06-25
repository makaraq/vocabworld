#!/usr/bin/env python3
"""
Cross-platform replacement for the macOS-only `sips` crop/resize step.
Top-center crops each input image to the target aspect ratio (trims left/right
equally, keeps the top edge so headline text stays put), then resizes to the
exact target pixel dimensions. Saves each result as "<name>-resized.<ext>".
"""

import argparse
import os
from PIL import Image


def crop_resize(input_path, target_w, target_h):
    img = Image.open(input_path).convert("RGB")
    w, h = img.size

    crop_w = round(h * target_w / target_h)
    if crop_w <= w:
        offset_x = round((w - crop_w) / 2)
        img = img.crop((offset_x, 0, offset_x + crop_w, h))
    else:
        # Image is narrower than the target ratio needs — crop height instead (top-aligned).
        crop_h = round(w * target_h / target_w)
        img = img.crop((0, 0, w, crop_h))

    img = img.resize((target_w, target_h), Image.LANCZOS)

    base, ext = os.path.splitext(input_path)
    output_path = f"{base}-resized{ext}"
    img.save(output_path, quality=95)
    print(f"{output_path} ({target_w}x{target_h})")
    return output_path


def main():
    p = argparse.ArgumentParser(description="Crop/resize images to App Store Connect dimensions")
    p.add_argument("inputs", nargs="+", help="Input image path(s)")
    p.add_argument("--width", type=int, required=True)
    p.add_argument("--height", type=int, required=True)
    args = p.parse_args()

    for input_path in args.inputs:
        crop_resize(input_path, args.width, args.height)


if __name__ == "__main__":
    main()
