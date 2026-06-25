#!/usr/bin/env python3
"""
App Store Screenshot Composer
Composites optional headline text, a device frame, and an app screenshot
into a pixel-perfect App Store Connect image at any of the accepted
canvas sizes.

The device's screen region is always sized to match the input
screenshot's own aspect ratio, so the screenshot exactly fills the
screen with no stretching and no leftover gap.
"""

import argparse
import os
from PIL import Image, ImageDraw, ImageFont, ImageChops

# ── Reference design (everything below is proportional to this) ─────
REF_W = 1290
REF_H = 2796

REF_BEZEL = 15
REF_SCREEN_CORNER_R = 62
REF_DEVICE_Y_TEXT = 720      # device top when there's a headline above it
REF_DEVICE_Y_NOTEXT = 150    # device top when there's no headline
REF_BOTTOM_MARGIN_NOTEXT = 150  # bottom margin when device is fully visible (no bleed)
REF_BLEED_PAST_CANVAS = 300  # how far past the canvas bottom the device bleeds
MAX_DEVICE_W_FRAC = 0.82     # device never wider than this fraction of canvas width

# ── Typography (sizes at REF_W; scaled by canvas width at render time) ─
VERB_SIZE_MAX = 256
VERB_SIZE_MIN = 150
DESC_SIZE = 124
VERB_DESC_GAP = 20
DESC_LINE_GAP = 24
TEXT_TOP = 200


def _find_black_font():
    candidates = [
        "/Library/Fonts/SF-Pro-Display-Black.otf",                    # macOS
        "C:/Windows/Fonts/seguibl.ttf",                                # Windows: Segoe UI Black
        "C:/Windows/Fonts/ariblk.ttf",                                 # Windows: Arial Black
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",        # Linux fallback
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return candidates[0]


FONT_PATH = _find_black_font()


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def word_wrap(draw, text, font, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = f"{cur} {w}".strip()
        if draw.textlength(test, font=font) <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def fit_font(text, max_w, size_max, size_min):
    """Return the largest font size where text fits within max_w."""
    dummy = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    for size in range(size_max, size_min - 1, -4):
        font = ImageFont.truetype(FONT_PATH, size)
        bbox = dummy.textbbox((0, 0), text, font=font)
        if (bbox[2] - bbox[0]) <= max_w:
            return font
    return ImageFont.truetype(FONT_PATH, size_min)


def draw_centered(draw, y, text, font, canvas_w, max_w=None, line_gap=DESC_LINE_GAP, fill="white"):
    lines = word_wrap(draw, text, font, max_w) if max_w else [text]
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        h = bbox[3] - bbox[1]
        # Use anchor="mt" (middle-top) for pixel-perfect horizontal centering
        # Adjust y by bbox[1] offset so text top aligns with intended position
        draw.text((canvas_w // 2, y - bbox[1]), line, fill=fill, font=font, anchor="mt")
        y += h + line_gap
    return y


def build_device_frame(device_w, device_h, bezel, corner_r):
    """Draw an iPhone-style frame at an arbitrary size — rounded body, screen
    cutout, dynamic island, side buttons. Generated fresh per-call so the
    rounded corners always land exactly at the edges of device_h (no
    mismatch between a pre-rendered asset and the requested size)."""
    frame = Image.new("RGBA", (device_w, device_h), (0, 0, 0, 0))
    fd = ImageDraw.Draw(frame)
    fd.rounded_rectangle([0, 0, device_w - 1, device_h - 1], radius=corner_r, fill=(30, 30, 30, 255))
    fd.rounded_rectangle([1, 1, device_w - 2, device_h - 2], radius=max(corner_r - 1, 1), fill=(20, 20, 20, 255))

    screen_w = device_w - 2 * bezel
    screen_h = device_h - 2 * bezel
    cutout = Image.new("L", (device_w, device_h), 255)
    ImageDraw.Draw(cutout).rounded_rectangle(
        [bezel, bezel, bezel + screen_w, bezel + screen_h],
        radius=max(corner_r - bezel, 1),
        fill=0,
    )
    frame.putalpha(ImageChops.multiply(frame.getchannel("A"), cutout))

    # No dynamic island drawn here — simulator screenshots already bake the
    # status bar and island into their own pixels, so drawing a second one
    # on top would double up and misalign with the real one underneath.

    # Side buttons (purely decorative, only drawn if they fit within device_h)
    btn_color = (25, 25, 25, 255)
    fd2 = ImageDraw.Draw(frame)
    for x0, x1, y0, y1 in (
        (device_w, device_w + 4, 340, 460),   # power (right)
        (-4, 0, 280, 360),                    # volume up (left)
        (-4, 0, 380, 460),                    # volume down (left)
        (-4, 0, 180, 220),                    # silent switch (left)
    ):
        if y1 < device_h:
            fd2.rounded_rectangle([x0, y0, x1, y1], radius=2, fill=btn_color)

    return frame


def compose(bg_hex, verb, desc, screenshot_path, output_path, canvas_w=REF_W, canvas_h=REF_H, text_color="white"):
    bg = hex_to_rgb(bg_hex)
    # All vertical/font measurements scale off canvas HEIGHT, not width.
    # The reference design's proportions assume a tall phone aspect ratio;
    # canvases with a very different aspect ratio (e.g. iPad's wider shape)
    # would otherwise get oversized text and a too-high device if scaled
    # by width instead.
    scale = canvas_h / REF_H
    has_text = bool(verb or desc)

    # ── 1. Canvas ───────────────────────────────────────────────────
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (*bg, 255))
    draw = ImageDraw.Draw(canvas)

    bezel = round(REF_BEZEL * scale)
    screen_corner_r = round(REF_SCREEN_CORNER_R * scale)
    device_y = round((REF_DEVICE_Y_TEXT if has_text else REF_DEVICE_Y_NOTEXT) * scale)
    screen_y = device_y + bezel

    # ── 2. Headline text (optional — skipped entirely if both empty) ─
    if has_text:
        max_text_w = int(canvas_w * 0.92)
        verb_font = fit_font(verb.upper(), max_text_w, int(VERB_SIZE_MAX * scale), int(VERB_SIZE_MIN * scale))
        desc_font = ImageFont.truetype(FONT_PATH, int(DESC_SIZE * scale))

        y = int(TEXT_TOP * scale)
        if verb:
            y = draw_centered(draw, y, verb.upper(), verb_font, canvas_w, line_gap=int(DESC_LINE_GAP * scale), fill=text_color)
            y += int(VERB_DESC_GAP * scale)
        if desc:
            draw_centered(draw, y, desc.upper(), desc_font, canvas_w, max_w=max_text_w, line_gap=int(DESC_LINE_GAP * scale), fill=text_color)

    # ── 3. Derive screen size from the screenshot's OWN aspect ratio ─
    # This guarantees the screenshot always fills the screen exactly —
    # no stretching, and no leftover gap below it.
    shot = Image.open(screenshot_path).convert("RGBA")
    shot_aspect = shot.width / shot.height  # width:height, e.g. ~0.46 for a tall phone shot

    if has_text:
        target_screen_h = (canvas_h - screen_y) + round(REF_BLEED_PAST_CANVAS * scale)
    else:
        bottom_margin = round(REF_BOTTOM_MARGIN_NOTEXT * scale)
        target_screen_h = (canvas_h - screen_y - bottom_margin)

    screen_w = round(target_screen_h * shot_aspect)

    # Cap width so the phone never looks wider than the canvas allows.
    max_screen_w = round(canvas_w * MAX_DEVICE_W_FRAC) - 2 * bezel
    if screen_w > max_screen_w:
        screen_w = max_screen_w
        target_screen_h = round(screen_w / shot_aspect)

    screen_h = target_screen_h
    device_w = screen_w + 2 * bezel
    device_h = screen_h + 2 * bezel

    device_x = (canvas_w - device_w) // 2
    screen_x = device_x + bezel

    # Resize screenshot to exactly fill the screen (aspect-matched, so no distortion)
    shot = shot.resize((screen_w, screen_h), Image.LANCZOS)

    # ── 4. Screenshot into screen area (rounded-rect mask) ───────────
    scr_mask = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(scr_mask).rounded_rectangle(
        [screen_x, screen_y, screen_x + screen_w, screen_y + screen_h],
        radius=screen_corner_r,
        fill=255,
    )

    scr_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    scr_layer.paste(shot, (screen_x, screen_y))
    scr_layer.putalpha(scr_mask)

    canvas = Image.alpha_composite(canvas, scr_layer)

    # ── 5. Device frame, generated to match exactly ──────────────────
    frame_template = build_device_frame(device_w, device_h, bezel, screen_corner_r + bezel)

    frame_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    frame_layer.paste(frame_template, (device_x, device_y))
    canvas = Image.alpha_composite(canvas, frame_layer)

    # ── 6. Save ────────────────────────────────────────────────────
    canvas.convert("RGB").save(output_path, "PNG")
    print(f"OK: {output_path} ({canvas_w}x{canvas_h})")


def main():
    p = argparse.ArgumentParser(description="Compose App Store screenshot")
    p.add_argument("--bg", required=True, help="Background hex colour (#E31837)")
    p.add_argument("--verb", default="", help="Action verb (TRACK). Omit for no headline.")
    p.add_argument("--desc", default="", help="Benefit descriptor (TRADING CARD PRICES). Omit for no headline.")
    p.add_argument("--screenshot", required=True, help="Simulator screenshot path")
    p.add_argument("--output", required=True, help="Output file path")
    p.add_argument("--width", type=int, default=REF_W, help="Canvas width in px (default 1290)")
    p.add_argument("--height", type=int, default=REF_H, help="Canvas height in px (default 2796)")
    p.add_argument("--text-color", default="white", help="Headline text colour, hex or name (default white)")
    args = p.parse_args()

    compose(args.bg, args.verb, args.desc, args.screenshot, args.output, args.width, args.height, args.text_color)


if __name__ == "__main__":
    main()
