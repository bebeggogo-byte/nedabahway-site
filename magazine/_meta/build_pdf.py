#!/usr/bin/env python3
"""SBM 권별 '관찰 핵심' PDF 생성.
각 권의 완성 장(>40KB)에서 essence + 관찰된 사실(s2) + 종합 정리(synthesis)
+ 미해결 질문(s8)만 추려 읽기 좋은 PDF로 만든다. raw transcript(s1)는 제외.
사용: python3 magazine/_meta/build_pdf.py GEN [EXO JHN ...]   (인자 없으면 완성된 모든 책)
출력: magazine/_pdf/{CODE}.pdf
"""
import os, sys, glob, re, html
from bs4 import BeautifulSoup
from weasyprint import HTML

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "magazine", "_pdf")
DONE = 30000
EMOJI = {"1️⃣":"1","2️⃣":"2","3️⃣":"3","4️⃣":"4","5️⃣":"5","6️⃣":"6","7️⃣":"7","8️⃣":"8","9️⃣":"9","🌿":""}

CSS = """
@page { size: A4; margin: 20mm 18mm; @bottom-center { content: counter(page); color:#9A8; font-size:9pt; } }
body { font-family: 'Noto Serif CJK KR','Noto Sans CJK KR', serif; color:#1A1A1A; line-height:1.7; font-size:10.5pt; }
.cover { text-align:center; padding-top:80mm; page-break-after:always; }
.cover .abbr { font-size:42pt; font-weight:800; letter-spacing:-1pt; }
.cover .full { font-size:13pt; color:#A4541A; margin-top:6pt; }
.cover .book { font-size:26pt; font-weight:800; margin-top:30mm; }
.cover .book-en { font-size:12pt; color:#7A6F5F; margin-top:4pt; }
.cover .meta { font-size:10pt; color:#7A6F5F; margin-top:18mm; }
h2.ch { font-size:17pt; font-weight:800; color:#1A1A1A; border-bottom:2px solid #A4541A; padding-bottom:4pt; margin:0 0 2pt; page-break-before:always; page-break-after:avoid; }
.badge { font-size:8.5pt; color:#A4541A; letter-spacing:1pt; margin-bottom:6pt; }
.essence { font-size:11.5pt; font-style:italic; color:#3a322a; background:#FAF6EE; border-left:3px solid #A4541A; padding:8pt 12pt; margin:8pt 0 14pt; }
.sect-h { font-size:11pt; font-weight:700; color:#A4541A; margin:14pt 0 4pt; page-break-after:avoid; }
.obs h2 { font-size:10.5pt; font-weight:700; margin:10pt 0 3pt; color:#2a241c; page-break-after:avoid; }
.obs h3 { font-size:9.8pt; font-weight:700; margin:7pt 0 2pt; color:#4a423a; }
.obs p { margin:3pt 0; }
.obs ul { margin:3pt 0; padding-left:14pt; }
.obs li { margin:2pt 0; }
.obs blockquote { border-left:2px solid #1A1A1A; padding:4pt 10pt; margin:6pt 0; background:#F4F2EC; font-size:10pt; }
.obs table { border-collapse:collapse; width:100%; font-size:9pt; margin:6pt 0; }
.obs th,.obs td { border:1px solid #d8cdb8; padding:3pt 5pt; text-align:left; vertical-align:top; }
.obs th { background:#F4F2EC; }
hr.ch-end { border:0; border-top:1px dashed #d8cdb8; margin:16pt 0; }
"""

def clean(node):
    if not node: return ""
    import copy
    node = copy.copy(node)
    for t in node.find_all(["script","style"]): t.decompose()
    # 첫 실질 헤더(h2/h3) 이전의 YAML 메타블록·가이드 주석 제거
    first_h = node.find(["h2","h3"])
    if first_h:
        for el in list(node.find_all(recursive=False)):
            if el is first_h: break
            el.decompose()
    # 잔여 메타 문단 제거: '---', 영문 'key: value', LOCKED 가이드 안내문
    for p in node.find_all("p"):
        txt = p.get_text(strip=True)
        if txt in ("---","--") or re.match(r"^[a-z_]+:\s", txt) or txt.startswith("단계 라벨은 LOCKED"):
            p.decompose()
    s = str(node)
    for k,v in EMOJI.items(): s = s.replace(k,v)
    return s

def book_meta(code):
    idx = os.path.join(ROOT,"magazine",code,"index.html")
    name=code; name_en=code
    if os.path.exists(idx):
        t=open(idx,encoding="utf-8").read()
        m=re.search(r"<title>([^<·|—]+)", t)
        if m: name=m.group(1).strip()
    return name

def build(code):
    base=os.path.join(ROOT,"magazine",code)
    chs=sorted([int(os.path.basename(os.path.dirname(p)))
                for p in glob.glob(os.path.join(base,"*","index.html"))
                if os.path.basename(os.path.dirname(p)).isdigit()
                and os.path.getsize(p)>DONE])
    if not chs: 
        print(f"{code}: 완성 장 없음, 건너뜀"); return None
    name=book_meta(code)
    parts=[]
    first=BeautifulSoup(open(os.path.join(base,str(chs[0]),"index.html"),encoding="utf-8").read(),"html.parser")
    badge0=first.select_one('.obs-mast div[style*="letter-spacing"]')
    canon = badge0.get_text(strip=True).split("·",1)[1].strip() if badge0 and "·" in badge0.get_text() else ""
    parts.append(f'<div class="cover"><div class="abbr">SBM</div><div class="full">Self Bible Meditation for Maturity</div>'
                 f'<div class="book">{html.escape(name)}</div><div class="book-en">{code} · {html.escape(canon)}</div>'
                 f'<div class="meta">관찰 핵심 정리 · 완성 {len(chs)}장 · 네다바웨이 Observatory</div></div>')
    for n in chs:
        soup=BeautifulSoup(open(os.path.join(base,str(n),"index.html"),encoding="utf-8").read(),"html.parser")
        h1=soup.select_one(".obs-mast h1"); ess=soup.select_one(".obs-mast .essence")
        badge=soup.select_one('.obs-mast div[style*="letter-spacing"]')
        s2=soup.select_one("#s2 .md-body"); s8=soup.select_one("#s8 .md-body")
        syn=soup.select_one("#synthesis .synthesis-body, #synthesis .md-body")
        block=[f'<h2 class="ch">{html.escape(h1.get_text(strip=True) if h1 else code+" "+str(n))}</h2>']
        if badge: block.append(f'<div class="badge">{html.escape(badge.get_text(strip=True))}</div>')
        if ess: block.append(f'<div class="essence">{html.escape(ess.get_text(strip=True))}</div>')
        if s2: block.append(f'<div class="sect-h">관찰된 사실</div><div class="obs">{clean(s2)}</div>')
        if syn: block.append(f'<div class="sect-h">종합 정리</div><div class="obs">{clean(syn)}</div>')
        if s8: block.append(f'<div class="sect-h">미해결 질문</div><div class="obs">{clean(s8)}</div>')
        block.append('<hr class="ch-end">')
        parts.append("".join(block))
    doc=f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{''.join(parts)}</body></html>"
    os.makedirs(OUT,exist_ok=True)
    outpath=os.path.join(OUT,f"{code}.pdf")
    HTML(string=doc, base_url=ROOT).write_pdf(outpath)
    kb=os.path.getsize(outpath)//1024
    print(f"{code}: {len(chs)}장 → {outpath} ({kb}KB)")
    return outpath

def main():
    codes=sys.argv[1:]
    if not codes:
        codes=[os.path.basename(d) for d in glob.glob(os.path.join(ROOT,"magazine","*"))
               if os.path.isdir(d) and not os.path.basename(d).startswith("_")]
    for c in codes: build(c)

if __name__=="__main__": main()
