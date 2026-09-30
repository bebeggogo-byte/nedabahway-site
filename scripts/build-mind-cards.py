#!/usr/bin/env python3
"""Render the 6 MINDS digital card set (phone portrait, 1080x1920 PNG).

  assets/cards/mind-<k>-front.png       character, colour-character name, definition, when I get energy, three signals, pair mind
  assets/cards/mind-<k>-back-base.png   blank back (foil frame, inner card, footer). The browser draws the person's own
                                        result on it (assets/mind-cards.js renderBack), or a labelled sample before the test.

Quality notes
  - Everything is drawn at 2x (2160x3840) and downsampled with Lanczos, so type and outlines stay crisp.
  - The frame is a foil band: mind colour gradient + diagonal light streaks + fine hatch, on paper grain.
  - Character panels get a paint splash, an inner glow, a drop shadow and an ink outline.

Fonts: Pretendard OTF directory via env PRETENDARD (default: scratchpad npm package path).
Copy source: .moai/project/six-minds-data.json
Re-run:  PRETENDARD=/path/to/static python3 scripts/build-mind-cards.py
"""
import json, math, os, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT_DIR = os.environ.get('PRETENDARD', '/tmp/claude-0/-home-user-nedabahway-site/edc7b93a-289f-59f8-9c94-9bdaeff80630/scratchpad/pret/package/dist/public/static')
OUT = ROOT / 'assets' / 'cards'; OUT.mkdir(exist_ok=True)
M = json.loads((ROOT / '.moai/project/six-minds-data.json').read_text(encoding='utf-8'))
COLOR = {m['k']: m['c'] for m in M}
PAPER = (241, 237, 229); INK = (27, 27, 27); CARD = (251, 249, 244); MUTE = (92, 87, 80); BODY = (52, 50, 47)
S = 2                      # supersample factor
W, H = 1080 * S, 1920 * S  # working canvas
FRAME = 30 * S             # foil band width outside the inner card
R_OUT, R_IN = 64 * S, 46 * S
PAD = 92 * S               # inner text margin
HASH = '#네다바웨이 #식스마인드 #6MINDS'

_fc = {}
def font(w, s):
    k = (w, s)
    if k not in _fc: _fc[k] = ImageFont.truetype(f'{FONT_DIR}/Pretendard-{w}.otf', int(s * S))
    return _fc[k]
def px(v): return int(v * S)
def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
def mix(a, b, t): t = max(0., min(1., t)); return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def wrap(d, text, f, maxw):
    lines = []
    for para in text.split('\n'):
        cur = ''
        for w in para.split(' '):
            t = (cur + ' ' + w).strip()
            if d.textlength(t, font=f) <= maxw: cur = t
            else:
                if cur: lines.append(cur)
                while d.textlength(w, font=f) > maxw:
                    k = len(w)
                    while k > 1 and d.textlength(w[:k], font=f) > maxw: k -= 1
                    lines.append(w[:k]); w = w[k:]
                cur = w
        lines.append(cur)
    return lines

def draw_par(d, xy, text, f, fill, maxw, lh=1.45, align='left'):
    x, y = xy
    for ln in wrap(d, text, f, maxw):
        tx = x if align == 'left' else x + (maxw - d.textlength(ln, font=f)) / 2
        d.text((tx, y), ln, font=f, fill=fill); y += int(f.size * lh)
    return y

def par_height(d, text, f, maxw, lh=1.45):
    return len(wrap(d, text, f, maxw)) * int(f.size * lh)

# ---------- surfaces ----------
def foil(c):
    """Foil band: mind-colour gradient with diagonal light streaks and a fine hatch. Built small, upscaled."""
    w, h = 270, 480
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    u = x / w; v = y / h
    c1 = np.array(hexrgb(c), np.float32); white = np.array([255, 255, 255], np.float32); ink = np.array([28, 26, 24], np.float32)
    c_light = c1 * .45 + white * .55; c_deep = c1 * .72 + ink * .28
    t = (u * .55 + v * .45)
    base = np.where((t < .5)[..., None], c1 + (c_light - c1) * (t * 2)[..., None], c_light + (c_deep - c_light) * ((t - .5) * 2)[..., None])
    # diagonal light streaks (holo sheen)
    diag = (u * 1.0 + v * .6)
    sheen = (np.sin(diag * 22.0) * .5 + .5) ** 6 * .55 + (np.sin(diag * 5.5 + 1.2) * .5 + .5) ** 3 * .35
    base = base + (white - base) * sheen[..., None] * .7
    # rainbow tint bands, very subtle
    hue = np.stack([np.sin(diag * 9 + 0), np.sin(diag * 9 + 2.1), np.sin(diag * 9 + 4.2)], -1) * 14
    base = np.clip(base + hue, 0, 255)
    img = Image.fromarray(base.astype(np.uint8), 'RGB').resize((W, H), Image.BICUBIC)
    # fine hatch
    hatch = Image.new('L', (W, H), 0); hd = ImageDraw.Draw(hatch)
    for i in range(-H, W + H, 14 * S): hd.line((i, 0, i + H, H), fill=28, width=S)
    img = ImageChops.subtract(img, Image.merge('RGB', (hatch, hatch, hatch)))
    return img

def grain(img, amount=9):
    n = Image.effect_noise((W, H), 30).filter(ImageFilter.GaussianBlur(0.6))
    n = ImageChops.subtract(n, Image.new('L', (W, H), 128)).point(lambda p: int(p * amount / 40))
    return ImageChops.add(img, Image.merge('RGB', (n, n, n)))

def rounded_mask(box, r):
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).rounded_rectangle(box, radius=r, fill=255); return m

def card_base(c):
    base = Image.new('RGB', (W, H), PAPER)
    base.paste(foil(c), (0, 0), rounded_mask((px(18), px(18), W - px(18), H - px(18)), R_OUT))
    d = ImageDraw.Draw(base)
    d.rounded_rectangle((px(18), px(18), W - px(18), H - px(18)), radius=R_OUT, outline=INK, width=px(4))
    inner_box = (px(18) + FRAME, px(18) + FRAME, W - px(18) - FRAME, H - px(18) - FRAME)
    # inner card with grain and an inset shadow line
    inner = grain(Image.new('RGB', (W, H), CARD), 7)
    base.paste(inner, (0, 0), rounded_mask(inner_box, R_IN))
    d = ImageDraw.Draw(base)
    d.rounded_rectangle(inner_box, radius=R_IN, outline=mix(hexrgb(c), INK, .35), width=px(3))
    # corner sparkles
    for (cx, cy) in [(px(48), px(48)), (W - px(48), px(48)), (px(48), H - px(48)), (W - px(48), H - px(48))]:
        star(d, cx, cy, px(10), (255, 255, 255))
    return base

def star(d, cx, cy, r, fill):
    pts = []
    for i in range(8):
        a = i * math.pi / 4; rr = r if i % 2 == 0 else r * .32
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    d.polygon(pts, fill=fill)

def shadow_paste(img, layer, box, r, blur=18, off=(0, 14), alpha=110):
    """Paste `layer` (RGB) into rounded box with a soft drop shadow."""
    x0, y0, x1, y1 = box
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((x0 + off[0] * S, y0 + off[1] * S, x1 + off[0] * S, y1 + off[1] * S), radius=r, fill=(20, 16, 12, alpha))
    sh = sh.filter(ImageFilter.GaussianBlur(blur * S))
    img.paste(sh, (0, 0), sh)
    m = Image.new('L', (x1 - x0, y1 - y0), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, x1 - x0, y1 - y0), radius=r, fill=255)
    img.paste(layer.resize((x1 - x0, y1 - y0), Image.LANCZOS), (x0, y0), m)

def art_panel(img, m, c, box):
    """Character art with paint splash, radial glow, ink outline and a gloss streak."""
    x0, y0, x1, y1 = box; w, h = x1 - x0, y1 - y0
    col = hexrgb(c)
    bg = Image.new('RGB', (w, h), mix(col, (255, 255, 255), .82))
    # radial glow
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rad = np.sqrt(((xx - w * .5) / (w * .6)) ** 2 + ((yy - h * .42) / (h * .6)) ** 2)
    glow = np.clip(1 - rad, 0, 1) ** 1.6
    arr = np.array(bg, np.float32); white = np.array([255, 255, 255], np.float32)
    arr = arr + (white - arr) * glow[..., None] * .9
    bg = Image.fromarray(arr.astype(np.uint8), 'RGB')
    # paint blobs
    blob = Image.new('RGBA', (w, h), (0, 0, 0, 0)); bd = ImageDraw.Draw(blob); cc = col + (170,)
    bd.ellipse((w * .02, h * .22, w * .78, h * .98), fill=cc); bd.ellipse((w * .3, h * .04, w * .99, h * .7), fill=cc); bd.ellipse((w * .18, h * .5, w * .96, h * 1.0), fill=cc)
    blob = blob.filter(ImageFilter.GaussianBlur(14 * S)); bg.paste(blob, (0, 0), blob)
    # character (crop the brand character tighter, then fit)
    ch = Image.open(ROOT / 'assets/brand' / f'char-{m["k"]}.jpg').convert('RGB')
    cw, chh = ch.size; ch = ch.crop((int(cw * .04), int(chh * .04), int(cw * .96), int(chh * .96)))
    side = int(min(w, h) * .96); ch = ch.resize((side, side), Image.LANCZOS)
    ch = ch.filter(ImageFilter.UnsharpMask(radius=2, percent=70, threshold=2))
    cm = Image.new('L', (side, side), 0); ImageDraw.Draw(cm).rounded_rectangle((0, 0, side, side), radius=px(40), fill=255)
    # soften the character's own square background into the panel
    fade = Image.new('L', (side, side), 255); fd = ImageDraw.Draw(fade)
    for i in range(px(26)): fd.rounded_rectangle((i, i, side - i, side - i), radius=px(40), outline=int(255 * i / px(26)), width=1)
    cm = ImageChops.multiply(cm, fade)
    bg.paste(ch, ((w - side) // 2, (h - side) // 2), cm)
    shadow_paste(img, bg, box, px(44), blur=16, off=(0, 16), alpha=120)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(box, radius=px(44), outline=INK, width=px(6))

def coin(d, cx, cy, r, c, text, f):
    col = hexrgb(c)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=INK)
    d.ellipse((cx - r + px(4), cy - r + px(4), cx + r - px(4), cy + r - px(4)), outline=col, width=px(3))
    tw = d.textlength(text, font=f); d.text((cx - tw / 2, cy - f.size * .58), text, font=f, fill=PAPER)

def header(img, d, i, m, c):
    col = hexrgb(c)
    coin(d, PAD + px(34), px(150), px(34), c, f'0{i + 1}', font('ExtraBold', 30))
    d.text((PAD + px(88), px(120)), m['n'], font=font('Black', 72), fill=INK)
    d.text((PAD + px(92), px(206)), m['char'] + '  ·  ' + m['en'].upper(), font=font('Bold', 28), fill=mix(col, INK, .25))
    # brand symbol top-right
    sym = Image.open(ROOT / 'assets/brand/nw-symbol.png').convert('RGBA')
    sw = px(120); sym = sym.resize((sw, int(sym.height * sw / sym.width)), Image.LANCZOS)
    img.paste(sym, (W - PAD - sw, px(112)), sym)

def footer(d, c):
    y = H - px(150)
    d.line((PAD, y, W - PAD, y), fill=(206, 199, 186), width=px(3))
    d.text((PAD, y + px(24)), 'NEDABAHWAY · Different People, Bigger World', font=font('SemiBold', 22), fill=MUTE)
    t = 'nedabah.org/minds'; d.text((W - PAD - d.textlength(t, font=font('SemiBold', 22)), y + px(24)), t, font=font('SemiBold', 22), fill=MUTE)
    d.text((PAD, y + px(62)), HASH, font=font('Bold', 22), fill=hexrgb(c))

def label_pill(d, x, y, text, fill, fg, f):
    tw = d.textlength(text, font=f)
    d.rounded_rectangle((x, y, x + tw + px(28), y + f.size + px(16)), radius=px(20), fill=fill)
    d.text((x + px(14), y + px(7)), text, font=f, fill=fg)
    return y + f.size + px(16)

def finish(img):
    return img.resize((W // S, H // S), Image.LANCZOS)

# ---------- faces ----------
def front(i, m):
    c = COLOR[m['k']]; col = hexrgb(c)
    img = card_base(c); d = ImageDraw.Draw(img)
    header(img, d, i, m, c)
    ART_H = px(660)
    art_panel(img, m, c, (PAD + px(20), px(268), W - PAD - px(20), px(268) + ART_H))
    d = ImageDraw.Draw(img)
    y = px(268) + ART_H + px(40)
    # quote ribbon
    q = f'“{m["q"]}”'; fq = font('Bold', 32); tw = d.textlength(q, font=fq)
    d.rounded_rectangle(((W - tw) / 2 - px(30), y, (W + tw) / 2 + px(30), y + px(66)), radius=px(33), fill=INK)
    d.text(((W - tw) / 2, y + px(13)), q, font=fq, fill=PAPER); y += px(100)
    # definition
    y = draw_par(d, (PAD, y), m['d'], font('ExtraBold', 40), INK, W - 2 * PAD, 1.3) + px(10)
    d.rounded_rectangle((PAD, y, PAD + px(120), y + px(8)), radius=px(4), fill=col); y += px(30)
    # charge source
    d.text((PAD, y), '언제 힘이 나나', font=font('ExtraBold', 25), fill=mix(col, INK, .25)); y += px(38)
    y = draw_par(d, (PAD, y), m['src'], font('Medium', 28), BODY, W - 2 * PAD, 1.5) + px(14)
    # signals
    rows = [('잘 쓰고 있을 때', m['on'], (16, 185, 129)), ('거의 안 쓸 때', m['low'], (156, 163, 175)), ('지나치게 쓸 때', m['over'], (239, 68, 68))]
    for k, v, cc in rows:
        fh = par_height(d, v, font('Medium', 24), W - 2 * PAD - px(56), 1.4) + px(54)
        d.rounded_rectangle((PAD, y, W - PAD, y + fh), radius=px(18), fill=(236, 231, 220))
        d.rounded_rectangle((PAD, y, PAD + px(10), y + fh), radius=px(5), fill=cc)
        d.text((PAD + px(28), y + px(14)), k, font=font('ExtraBold', 24), fill=INK)
        draw_par(d, (PAD + px(28), y + px(44)), v, font('Medium', 24), BODY, W - 2 * PAD - px(56), 1.4)
        y += fh + px(8)
    # pair mind row with avatar
    y += px(6); rh = px(96)
    if y + rh > H - px(170): y = H - px(170) - rh
    d.rounded_rectangle((PAD, y, W - PAD, y + rh), radius=px(24), fill=INK)
    pc = Image.open(ROOT / 'assets/brand' / f'char-{m["pair_k"]}.jpg').convert('RGB').resize((px(72), px(72)), Image.LANCZOS)
    pm = Image.new('L', (px(72), px(72)), 0); ImageDraw.Draw(pm).ellipse((0, 0, px(72), px(72)), fill=255)
    img.paste(pc, (PAD + px(14), y + px(12)), pm); d = ImageDraw.Draw(img)
    d.ellipse((PAD + px(14), y + px(12), PAD + px(86), y + px(84)), outline=hexrgb(COLOR[m['pair_k']]), width=px(3))
    pair = next(x for x in M if x['k'] == m['pair_k'])
    d.text((PAD + px(104), y + px(16)), f'짝이 되는 마음 · {pair["char"]}', font=font('Bold', 21), fill=(200, 194, 182))
    d.text((PAD + px(104), y + px(44)), f'{m["pair_n"]} · {m["pair_w"]}', font=font('Bold', 25), fill=PAPER)
    footer(d, c)
    return finish(img)

def back_base(i, m):
    """Blank back: frame + footer only. assets/mind-cards.js draws the result layer on top (same 1080x1920 grid)."""
    c = COLOR[m['k']]
    img = card_base(c); d = ImageDraw.Draw(img)
    footer(d, c)
    return finish(img)

if __name__ == '__main__':
    TH = OUT / 'thumb'; TH.mkdir(exist_ok=True)
    for i, m in enumerate(M):
        f = front(i, m); b = back_base(i, m)
        f.save(OUT / f'mind-{m["k"]}-front.png', optimize=True)
        b.save(OUT / f'mind-{m["k"]}-back-base.png', optimize=True)
        # gallery thumbnail (360 wide JPG) so pages do not load the full PNG for previews
        f.resize((360, 640), Image.LANCZOS).save(TH / f'mind-{m["k"]}-front.jpg', quality=86, optimize=True)
        print('card', m['k'])
