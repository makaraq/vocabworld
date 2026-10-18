"""Puts fresh captures (out/<device>/*.png) into the captioned App Store
images, reusing each existing image's headline and device frame.

  python3 scripts/app-store-screenshots/compose.py
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
MAP = {
    '01-learn-in-order': 'topics-grid', '02-hear-native-pronunciation': 'audio-pronunciation',
    '03-listen-at-your-own-speed': 'settings-speed', '04-watch-it-add-up': 'account-stats',
    '05-see-it-in-a-sentence': 'example-sentence', '06-save-what-matters': 'my-words-playlists',
    '07-lock-it-in': 'quick-recall',
}
# final folder, screen left, screen top, screen width, corner radius (px)
GEOM = {'iphone': ('screenshots/final', 134, 754, 1052, 62), 'ipad': ('screenshots/final/ipad', 201, 724, 1662, 62)}

for dev, (fdir, x0, top, W, r) in GEOM.items():
    for fin, scr in MAP.items():
        base = Image.open(os.path.join(ROOT, fdir, fin + '.png')).convert('RGB')
        new = Image.open(os.path.join(HERE, 'out', dev, scr + '.png')).convert('RGB')
        s = new.resize((W, round(new.height * W / new.width)), Image.LANCZOS)
        h = base.height - top
        s = s.crop((0, 0, W, h))
        mask = Image.new('L', (W * 4, h * 4), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, W * 4 - 1, h * 4 + r * 8), radius=r * 4, fill=255)
        base.paste(s, (x0, top), mask.resize((W, h), Image.LANCZOS))
        base.save(os.path.join(ROOT, fdir, fin + '.png'))
        print('wrote', fdir, fin)
