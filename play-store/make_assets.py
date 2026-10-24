"""Google Play listing images: phone screenshots, feature graphic, 512px icon.

Built from the raw app captures in screenshots-source/. Those were taken on an
iPhone, so the iOS status bar and Dynamic Island are painted out and the
screen sits in a neutral Android-style frame (Play rejects other platforms'
devices in listing images).

    python play-store/make_assets.py      (needs D:/tmp/fonts/SpaceGrotesk-*.ttf)
"""

import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'play-store')
SRC = os.path.join(ROOT, 'screenshots-source')
FONT_BOLD = 'D:/tmp/fonts/SpaceGrotesk-700.ttf'
FONT_MED = 'D:/tmp/fonts/SpaceGrotesk-500.ttf'

INK = (30, 20, 36)
ORANGE = (232, 85, 28)
PEACH = (251, 236, 226)

SHOTS = [
    ('flashcard-hello', 'PICTURE FLASHCARDS', 'Learn words\nthat stick'),
    ('flashcard-nice-to-meet-you', 'NATIVE AUDIO', 'Hear every\nword spoken'),
    ('quick-recall', 'SMART REVIEW', 'Never lose\na word again'),
    ('example-sentence', 'REAL SENTENCES', 'Ready for\nreal life'),
    ('account-stats', 'DAILY PROGRESS', 'Keep your\nstreak alive'),
    ('my-words-playlists', 'MY WORDS', 'Your words,\nyour way'),
    ('topics-grid', '50 LANGUAGES', 'Start with\nwhat matters'),
]

STATUS_H = 170  # rows of the 1320x2868 capture holding the iOS status bar


def backdrop(w, h):
    """Peach canvas with soft orange glows, matching the App Store set."""
    im = Image.new('RGB', (w, h), PEACH)
    glow = Image.new('RGB', (w, h), PEACH)
    d = ImageDraw.Draw(glow)
    r = int(w * 0.55)
    d.ellipse((-r // 2, -r // 3, r, r), fill=(246, 178, 140))
    d.ellipse((w - r // 2, int(h * 0.55), w + r // 2, int(h * 0.55) + r), fill=(247, 190, 150))
    return Image.blend(im, glow.filter(ImageFilter.GaussianBlur(w // 6)), 0.85)


def clean_capture(name):
    """The capture without the iOS status bar and island, plus an Android one."""
    im = Image.open(os.path.join(SRC, name + '.png')).convert('RGB')
    # Blend each column from the clean top edge down to the first row under
    # the status bar; copying rows from below would drag in page titles.
    edges = Image.new('RGB', (im.width, 2))
    edges.paste(im.crop((0, 6, im.width, 7)), (0, 0))
    edges.paste(im.crop((0, STATUS_H, im.width, STATUS_H + 1)), (0, 1))
    im.paste(edges.resize((im.width, STATUS_H), Image.BILINEAR), (0, 0))
    d = ImageDraw.Draw(im)
    d.text((80, 62), '9:41', font=ImageFont.truetype(FONT_MED, 46), fill='white')
    # signal, wifi-less minimal set: signal bars + battery
    x = im.width - 230
    for i in range(4):
        bh = 14 + i * 9
        d.rectangle((x + i * 16, 104 - bh, x + i * 16 + 10, 104), fill='white')
    bx = im.width - 150
    d.rounded_rectangle((bx, 70, bx + 66, 104), radius=8, outline='white', width=4)
    d.rectangle((bx + 8, 78, bx + 50, 96), fill='white')
    d.rectangle((bx + 68, 80, bx + 73, 94), fill='white')
    return im


def phone(screen, width):
    """Android-style frame: thin dark bezel, rounded corners, punch-hole camera."""
    bezel = max(10, width // 60)
    sw = width - 2 * bezel
    sh = round(screen.height * sw / screen.width)
    screen = screen.resize((sw, sh), Image.LANCZOS)
    h = sh + 2 * bezel
    r = width // 9
    frame = Image.new('RGBA', (width, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(frame)
    d.rounded_rectangle((0, 0, width - 1, h - 1), radius=r, fill=(18, 18, 20, 255))
    mask = Image.new('L', (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh - 1), radius=r - bezel, fill=255)
    frame.paste(screen, (bezel, bezel), mask)
    cam = width // 32
    cx, cy = width // 2, bezel + cam * 2
    d.ellipse((cx - cam, cy - cam, cx + cam, cy + cam), fill=(8, 8, 10, 255))
    return frame


def shadowed(canvas, layer, xy, blur=40, alpha=90):
    sh = Image.new('RGBA', layer.size, (0, 0, 0, 0))
    sh.putalpha(layer.getchannel('A').point(lambda a: alpha if a else 0))
    pad = blur * 3
    big = Image.new('RGBA', (layer.width + pad * 2, layer.height + pad * 2), (0, 0, 0, 0))
    big.paste(sh, (pad, pad))
    big = big.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(big, (xy[0] - pad, xy[1] - pad + blur // 2))
    canvas.alpha_composite(layer, xy)


def centered(d, y, text, font, fill, spacing=0, tracking=0):
    for line in text.split('\n'):
        if tracking:
            widths = [d.textlength(c, font=font) + tracking for c in line]
            x = (d.im.size[0] - (sum(widths) - tracking)) / 2
            for c, w in zip(line, widths):
                d.text((x, y), c, font=font, fill=fill)
                x += w
        else:
            w = d.textlength(line, font=font)
            d.text(((d.im.size[0] - w) / 2, y), line, font=font, fill=fill)
        y += font.size + spacing
    return y


def screenshot(name, eyebrow, headline, w=1080, h=1920):
    canvas = backdrop(w, h).convert('RGBA')
    d = ImageDraw.Draw(canvas)
    y = centered(d, 120, eyebrow, ImageFont.truetype(FONT_BOLD, 36), ORANGE, tracking=4)
    centered(d, y + 28, headline, ImageFont.truetype(FONT_BOLD, 112), INK, spacing=6)
    device = phone(clean_capture(name), int(w * 0.80))
    shadowed(canvas, device, ((w - device.width) // 2, 560))
    return canvas.convert('RGB')


def feature_graphic():
    w, h = 1024, 500
    canvas = backdrop(w, h).convert('RGBA')
    d = ImageDraw.Draw(canvas)
    icon = Image.open(os.path.join(ROOT, 'assets', 'icon-only.png')).convert('RGBA').resize((150, 150), Image.LANCZOS)
    m = Image.new('L', icon.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, 149, 149), radius=34, fill=255)
    icon.putalpha(m)
    shadowed(canvas, icon, (64, 92), blur=18, alpha=70)
    d.text((64, 268), 'Sprind', font=ImageFont.truetype(FONT_BOLD, 84), fill=INK)
    d.text((68, 370), 'Learn languages fast.', font=ImageFont.truetype(FONT_MED, 38), fill=ORANGE)
    device = phone(clean_capture('flashcard-hello'), 330)
    device = device.rotate(-8, resample=Image.BICUBIC, expand=True)
    shadowed(canvas, device, (620, 40), blur=24, alpha=80)
    return canvas.convert('RGB')


def main():
    shots = os.path.join(OUT, 'screenshots')
    os.makedirs(shots, exist_ok=True)
    for i, (name, eyebrow, headline) in enumerate(SHOTS, 1):
        slug = headline.replace('\n', ' ').replace(',', '').lower().replace(' ', '-')
        screenshot(name, eyebrow, headline).save(os.path.join(shots, f'{i:02d}-{slug}.png'))
    feature_graphic().save(os.path.join(OUT, 'feature-graphic.png'))
    Image.open(os.path.join(ROOT, 'assets', 'icon-only.png')).convert('RGB').resize(
        (512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-512.png'))
    print('done')


if __name__ == '__main__':
    main()
