#!/usr/bin/env python3
"""Render the 6 MINDS digital card set (phone portrait, 1080x1920 PNG).

  assets/cards/mind-<k>-front.png   character, definition, charge source, three signals, pair mind
  assets/cards/mind-<k>-back.png    when to use more / less, insight, brand line
  assets/cards/mind-set.jpg         contact sheet for the web page

Fonts: Pretendard OTF directory via env PRETENDARD (default: scratchpad npm package path).
Copy source: .moai/project/six-minds-data.json
Re-run:  PRETENDARD=/path/to/static python3 scripts/build-mind-cards.py
"""
import json, os, pathlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT_DIR = os.environ.get('PRETENDARD', '/tmp/claude-0/-home-user-nedabahway-site/edc7b93a-289f-59f8-9c94-9bdaeff80630/scratchpad/pret/package/dist/public/static')
OUT = ROOT / 'assets' / 'cards'; OUT.mkdir(exist_ok=True)
M = json.loads((ROOT / '.moai/project/six-minds-data.json').read_text(encoding='utf-8'))
COLOR = dict(explorer='#FF6B3D', maker='#FFC857', connector='#3B82F6', supporter='#10B981', thinker='#8B5CF6', enjoyer='#F472B6')
PAPER = (241, 237, 229); INK = (27, 27, 27); CARD = (250, 248, 243)
W, H = 1080, 1920

def font(w, s): return ImageFont.truetype(f'{FONT_DIR}/Pretendard-{w}.otf', s)
def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def mix(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def wrap(d, text, f, maxw):
    words = text.split(' '); lines = []; cur = ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= maxw: cur = t
        else:
            if cur: lines.append(cur)
            # hard-break very long tokens
            while d.textlength(w, font=f) > maxw:
                k = len(w)
                while k > 1 and d.textlength(w[:k], font=f) > maxw: k -= 1
                lines.append(w[:k]); w = w[k:]
            cur = w
    if cur: lines.append(cur)
    return lines

def draw_par(d, xy, text, f, fill, maxw, lh=1.45):
    x, y = xy
    for ln in wrap(d, text, f, maxw):
        d.text((x, y), ln, font=f, fill=fill); y += int(f.size * lh)
    return y

def holo_frame(c):
    """Rounded card with a soft angular gradient border in the mind colour."""
    base = Image.new('RGB', (W, H), PAPER)
    grad = Image.new('RGB', (W, H))
    px = grad.load(); c1 = hexrgb(c); c2 = mix(c1, (255, 255, 255), .55); c3 = mix(c1, INK, .25)
    for y in range(H):
        for x in range(0, W, 4):
            t = ((x / W) * .6 + (y / H) * .4)
            col = mix(c1, c2, t * 2) if t < .5 else mix(c2, c3, (t - .5) * 2)
            for i in range(4):
                if x + i < W: px[x + i, y] = col
    mask = Image.new('L', (W, H), 0); ImageDraw.Draw(mask).rounded_rectangle((36, 36, W - 36, H - 36), radius=64, fill=255)
    base.paste(grad, (0, 0), mask)
    inner = Image.new('L', (W, H), 0); ImageDraw.Draw(inner).rounded_rectangle((70, 70, W - 70, H - 70), radius=48, fill=255)
    base.paste(Image.new('RGB', (W, H), CARD), (0, 0), inner)
    return base

def paint_blob(img, c, box, alpha=200):
    """Soft paint-splash behind the character."""
    x0, y0, x1, y1 = box
    blob = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0)); bd = ImageDraw.Draw(blob)
    col = hexrgb(c) + (alpha,)
    w, h = blob.size
    bd.ellipse((int(w * .05), int(h * .18), int(w * .8), int(h * .95)), fill=col)
    bd.ellipse((int(w * .35), int(h * .02), int(w * .98), int(h * .7)), fill=col)
    bd.ellipse((int(w * .2), int(h * .45), int(w * .95), int(h * .98)), fill=col)
    blob = blob.filter(ImageFilter.GaussianBlur(18))
    img.paste(blob, (x0, y0), blob)

def header(d, img, i, m, c):
    col = hexrgb(c)
    d.rounded_rectangle((100, 100, 300, 156), radius=28, fill=INK)
    d.text((124, 112), f'0{i+1} / 06', font=font('ExtraBold', 26), fill=PAPER)
    d.text((W - 100 - d.textlength('6 MINDS', font=font('ExtraBold', 26)), 112), '6 MINDS', font=font('ExtraBold', 26), fill=col)
    d.text((100, 190), m['n'], font=font('ExtraBold', 74), fill=INK)
    d.text((100, 282), m['en'].upper(), font=font('Bold', 30), fill=col)

def footer(d, y):
    d.line((100, y, W - 100, y), fill=(214, 207, 193), width=3)
    d.text((100, y + 22), 'NEDABAHWAY · Different People, Bigger World', font=font('SemiBold', 22), fill=(85, 80, 74))
    d.text((W - 100 - d.textlength('nedabah.org/minds', font=font('SemiBold', 22)), y + 22), 'nedabah.org/minds', font=font('SemiBold', 22), fill=(85, 80, 74))

def front(i, m):
    c = COLOR[m['k']]; col = hexrgb(c)
    img = holo_frame(c); d = ImageDraw.Draw(img)
    header(d, img, i, m, c)
    # character
    paint_blob(img, c, (150, 330, 930, 1010), alpha=150)
    ch = Image.open(ROOT / 'assets/brand' / f'char-{m["k"]}.jpg').convert('RGB').resize((600, 600), Image.LANCZOS)
    mask = Image.new('L', (600, 600), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, 600, 600), radius=60, fill=255)
    img.paste(ch, (240, 350), mask)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((240, 350, 840, 950), radius=60, outline=INK, width=5)
    # quote
    q = f'“{m["q"]}”'
    fq = font('SemiBold', 34); tw = d.textlength(q, font=fq); d.text(((W - tw) / 2, 985), q, font=fq, fill=INK)
    # definition
    y = 1060
    y = draw_par(d, (100, y), m['d'], font('Bold', 40), INK, W - 200, 1.35)
    # charge source
    d.rounded_rectangle((100, y + 14, W - 100, y + 24), radius=5, fill=col)
    y += 44
    d.text((100, y), '무엇으로 충전되나', font=font('ExtraBold', 26), fill=col); y += 40
    y = draw_par(d, (100, y), m['src'], font('Medium', 30), (46, 46, 46), W - 200, 1.5)
    # signals
    y += 18
    rows = [('켜져 있을 때', m['on'], (16, 185, 129)), ('눌려 있을 때', m['low'], (156, 163, 175)), ('넘쳐 있을 때', m['over'], (239, 68, 68))]
    for k, v, cc in rows:
        d.rounded_rectangle((100, y, 108, y + 96), radius=4, fill=cc)
        d.text((128, y), k, font=font('ExtraBold', 26), fill=INK)
        yy = draw_par(d, (128, y + 36), v, font('Medium', 26), (46, 46, 46), W - 228, 1.4)
        y = max(y + 106, yy + 14)
    # pair
    d.rounded_rectangle((100, y + 6, W - 100, y + 92), radius=22, fill=(232, 226, 213))
    d.text((124, y + 30), '짝이 되는 마음', font=font('ExtraBold', 24), fill=(85, 80, 74))
    d.text((124 + d.textlength('짝이 되는 마음', font=font('ExtraBold', 24)) + 18, y + 26), f'{m["pair_n"]} · {m["pair_w"]}', font=font('Bold', 28), fill=INK)
    footer(d, H - 150)
    return img

def back(i, m):
    c = COLOR[m['k']]; col = hexrgb(c)
    img = holo_frame(c); d = ImageDraw.Draw(img)
    header(d, img, i, m, c)
    d.text((100, 340), '이번 주, 이렇게', font=font('ExtraBold', 34), fill=INK)
    y = 410
    for k, v, cc in [('더 쓰고 싶을 때', m['more'], (16, 185, 129)), ('줄여야 할 때', m['less'], (239, 68, 68))]:
        d.rounded_rectangle((100, y, W - 100, y + 250), radius=32, fill=(232, 226, 213))
        d.rounded_rectangle((100, y, 112, y + 250), radius=6, fill=cc)
        d.text((140, y + 30), k, font=font('ExtraBold', 30), fill=cc)
        draw_par(d, (140, y + 84), v, font('SemiBold', 34), INK, W - 280, 1.45)
        y += 280
    d.text((100, y + 20), '예리하게 보면', font=font('ExtraBold', 34), fill=INK)
    d.rounded_rectangle((100, y + 76, 108, y + 76 + 12), radius=4, fill=col)
    y = draw_par(d, (100, y + 90), m['ins'], font('Medium', 31), (46, 46, 46), W - 200, 1.55)
    # small character + quote
    ch = Image.open(ROOT / 'assets/brand' / f'char-{m["k"]}.jpg').convert('RGB').resize((260, 260), Image.LANCZOS)
    mask = Image.new('L', (260, 260), 0); ImageDraw.Draw(mask).ellipse((0, 0, 260, 260), fill=255)
    cy = min(y + 60, H - 470)
    img.paste(ch, (100, cy), mask); d = ImageDraw.Draw(img)
    d.ellipse((100, cy, 360, cy + 260), outline=INK, width=5)
    draw_par(d, (400, cy + 40), f'“{m["q"]}”', font('SemiBold', 34), INK, W - 500, 1.4)
    d.text((400, cy + 170), '여섯 마음은 누구에게나 다 있습니다.\n배분만 다를 뿐입니다.', font=font('Medium', 26), fill=(85, 80, 74))
    footer(d, H - 150)
    return img

sheet = Image.new('RGB', (360 * 6 + 70, 640 * 2 + 90), PAPER)
for i, m in enumerate(M):
    f = front(i, m); b = back(i, m)
    f.save(OUT / f'mind-{m["k"]}-front.png', optimize=True); b.save(OUT / f'mind-{m["k"]}-back.png', optimize=True)
    sheet.paste(f.resize((360, 640), Image.LANCZOS), (10 + i * 360, 20)); sheet.paste(b.resize((360, 640), Image.LANCZOS), (10 + i * 360, 680))
    print('card', m['k'])
sheet.save(OUT / 'mind-set.jpg', quality=84, optimize=True)
print('sheet ok')
