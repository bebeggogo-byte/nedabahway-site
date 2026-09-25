#!/usr/bin/env python3
"""Render brand v2 JPG share images (1200x630) from the Open Graph SVGs.

Reads the <text> lines of assets/og-*.svg and assets/og/*.svg (written by
scripts/build-og-images.py), then draws them on the NEDABAHWAY v2 card:
paper background, symbol + wordmark, eyebrow / title / summary in Pretendard,
three type blobs on the right and the six-color bar at the bottom.
Social apps (KakaoTalk, Facebook) do not render SVG share images, so pages
point og:image at the .jpg twins.

Usage: python3 scripts/build-og-jpg.py /path/to/pretendard/static
       (needs Pretendard-Medium/Bold/ExtraBold.otf, e.g. from the
        pretendard npm package: dist/public/static/)
"""
import re, html, sys, glob
from PIL import Image, ImageDraw, ImageFont
S=sys.argv[1]
F=lambda w,s: ImageFont.truetype(f'{S}/Pretendard-{w}.otf',s)
INK=(27,27,27); MUTE=(85,80,74); BLUE=(29,78,216); PAPER=(241,237,229)
TYPES=['explorer','maker','connector','supporter','thinker','enjoyer']
COLORS=[(255,107,61),(255,200,87),(59,130,246),(16,185,129),(139,92,246),(244,114,182)]
sym=Image.open('assets/brand/nw-symbol.png').convert('RGBA')
word=Image.open('assets/brand/nw-wordmark.png').convert('RGBA')
blobs=[Image.open(f'assets/brand/type-{t}.png').convert('RGBA') for t in TYPES]
def texts(p):
    s=open(p,encoding='utf-8').read(); out=[]
    for m in re.finditer(r'<text[^>]*font-size="(\d+)"[^>]*>(.*?)</text>',s,re.S):
        t=html.unescape(re.sub(r'<[^>]+>','',m.group(2))).strip()
        if t: out.append((int(m.group(1)),t))
    return out
def wrap(d,t,font,w):
    lines=[];cur=''
    for ch in t.split(' '):
        nxt=(cur+' '+ch).strip()
        if d.textlength(nxt,font=font)<=w: cur=nxt
        else: lines.append(cur); cur=ch
    lines.append(cur); return lines
def fit(img,h): return img.resize((int(img.width*h/img.height),h),Image.LANCZOS)
def render(src,dst,idx):
    tx=texts(src)
    big=[i for i,(sz,t) in enumerate(tx) if sz>=70 and not t.isdigit()]
    ti=big[0]; te=ti
    while te+1<len(tx) and tx[te+1][0]>=70 and not tx[te+1][1].isdigit(): te+=1
    title=' '.join(t for _,t in tx[ti:te+1])
    eyebrow=next((t for sz,t in tx[:ti] if 'NEDABAH' not in t.upper()),'')
    sub=tx[te+1][1] if te+1<len(tx) and 24<=tx[te+1][0]<70 else ''
    im=Image.new('RGBA',(1200,630),PAPER+(255,)); d=ImageDraw.Draw(im)
    # decorative blobs on the right
    picks=[(idx+k)%6 for k in (0,2,4)]
    for (x,y,h,rot),b in zip([(870,90,210,-12),(990,300,170,14),(820,370,150,6)],picks):
        bl=fit(blobs[b],h).rotate(rot,expand=True,resample=Image.BICUBIC); im.alpha_composite(bl,(x,y))
    # logo
    s=fit(sym,64); im.alpha_composite(s,(80,64)); w=fit(word,30); im.alpha_composite(w,(80+s.width+14,64+(64-30)//2+2))
    y=190
    if eyebrow:
        d.text((80,y),eyebrow,font=F('Bold',24),fill=BLUE); y+=48
    tf=F('ExtraBold',84 if len(title)<=12 else 68)
    for ln in wrap(d,title,tf,700):
        d.text((80,y),ln,font=tf,fill=INK); y+=tf.size+14
    if sub:
        y+=6; sf=F('Medium',32)
        for ln in wrap(d,sub,sf,700)[:2]:
            d.text((80,y),ln,font=sf,fill=MUTE); y+=46
    d.text((80,548),'김창환 · nedabah.org',font=F('Medium',22),fill=MUTE)
    for k,c in enumerate(COLORS): d.rectangle((k*200,618,(k+1)*200,630),fill=c)
    im.convert('RGB').save(dst,quality=88,optimize=True,progressive=True)
    return title
srcs=sorted(glob.glob('assets/og-*.svg')+glob.glob('assets/og/*.svg'))
srcs=[p for p in srcs if not p.endswith('og-default.svg')]
for i,p in enumerate(srcs):
    print(p, render(p,p[:-4]+'.jpg',i))
