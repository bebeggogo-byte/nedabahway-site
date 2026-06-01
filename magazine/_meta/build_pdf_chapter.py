#!/usr/bin/env python3
"""SBM 장별 '관찰 핵심' PDF 생성. 각 완성 장을 개별 PDF로 만든다.
한 장의 essence + 관찰된 사실(s2) + 종합 정리(synthesis) + 미해결 질문(s8)만 추림(raw transcript 제외).
사용: python3 magazine/_meta/build_pdf_chapter.py GEN [EXO ...]   (인자 없으면 완성된 모든 책)
출력: magazine/_pdf/{CODE}/{N}.pdf
"""
import os, sys, glob, re, html
from bs4 import BeautifulSoup
from weasyprint import HTML

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "magazine", "_pdf")
DONE = 30000
EMOJI = {"1️⃣":"1","2️⃣":"2","3️⃣":"3","4️⃣":"4","5️⃣":"5","6️⃣":"6","7️⃣":"7","8️⃣":"8","9️⃣":"9","🌿":""}

CSS = """
@page { size: A4; margin: 18mm 16mm; @bottom-center { content: counter(page); color:#9A8; font-size:9pt; } }
body { font-family: 'Noto Serif CJK KR','Noto Sans CJK KR', serif; color:#1A1A1A; line-height:1.7; font-size:10.5pt; }
.badge { font-size:8.5pt; color:#A4541A; letter-spacing:1pt; }
h1.ch { font-size:20pt; font-weight:800; margin:2pt 0 2pt; }
.essence { font-size:11.5pt; font-style:italic; color:#3a322a; background:#FAF6EE; border-left:3px solid #A4541A; padding:8pt 12pt; margin:10pt 0 14pt; }
.sect-h { font-size:11pt; font-weight:700; color:#A4541A; margin:14pt 0 4pt; page-break-after:avoid; }
.obs h2 { font-size:10.5pt; font-weight:700; margin:10pt 0 3pt; color:#2a241c; page-break-after:avoid; }
.obs h3 { font-size:9.8pt; font-weight:700; margin:7pt 0 2pt; color:#4a423a; }
.obs p { margin:3pt 0; } .obs ul { margin:3pt 0; padding-left:14pt; } .obs li { margin:2pt 0; }
.obs blockquote { border-left:2px solid #1A1A1A; padding:4pt 10pt; margin:6pt 0; background:#F4F2EC; font-size:10pt; }
.obs table { border-collapse:collapse; width:100%; font-size:9pt; margin:6pt 0; }
.obs th,.obs td { border:1px solid #d8cdb8; padding:3pt 5pt; text-align:left; vertical-align:top; }
.obs th { background:#F4F2EC; }
.foot { margin-top:18pt; padding-top:8pt; border-top:1px solid #d8cdb8; font-size:8pt; color:#8a7a64; }
"""

def clean(node):
    if not node: return ""
    import copy
    node = copy.copy(node)
    for t in node.find_all(["script","style"]): t.decompose()
    first_h = node.find(["h2","h3"])
    if first_h:
        for el in list(node.find_all(recursive=False)):
            if el is first_h: break
            el.decompose()
    for p in node.find_all("p"):
        txt = p.get_text(strip=True)
        if txt in ("---","--") or re.match(r"^[a-z_]+:\s", txt) or txt.startswith("단계 라벨은 LOCKED"):
            p.decompose()
    s = str(node)
    for k,v in EMOJI.items(): s = s.replace(k,v)
    return s

def build_one(code, n):
    f = os.path.join(ROOT,"magazine",code,str(n),"index.html")
    if not os.path.exists(f) or os.path.getsize(f) <= DONE: return False
    soup = BeautifulSoup(open(f,encoding="utf-8").read(),"html.parser")
    h1 = soup.select_one(".obs-mast h1"); ess = soup.select_one(".obs-mast .essence")
    badge = soup.select_one('.obs-mast div[style*="letter-spacing"]')
    s2 = soup.select_one("#s2 .md-body"); s8 = soup.select_one("#s8 .md-body")
    syn = soup.select_one("#synthesis .synthesis-body, #synthesis .md-body")
    parts = []
    if badge: parts.append(f'<div class="badge">{html.escape(badge.get_text(strip=True))}</div>')
    parts.append(f'<h1 class="ch">{html.escape(h1.get_text(strip=True) if h1 else code+" "+str(n))}</h1>')
    if ess: parts.append(f'<div class="essence">{html.escape(ess.get_text(strip=True))}</div>')
    if s2: parts.append(f'<div class="sect-h">관찰된 사실</div><div class="obs">{clean(s2)}</div>')
    if syn: parts.append(f'<div class="sect-h">종합 정리</div><div class="obs">{clean(syn)}</div>')
    if s8: parts.append(f'<div class="sect-h">미해결 질문</div><div class="obs">{clean(s8)}</div>')
    parts.append('<div class="foot">SBM — Self Bible Meditation for Maturity · 네다바웨이 Observatory · '
                 f'www.nedabah.org/magazine/{code}/{n}/ · 관찰 핵심(가상 대화 제외)</div>')
    doc = f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{''.join(parts)}</body></html>"
    outdir = os.path.join(OUT, code); os.makedirs(outdir, exist_ok=True)
    HTML(string=doc, base_url=ROOT).write_pdf(os.path.join(outdir, f"{n}.pdf"))
    return True

def main():
    codes = sys.argv[1:]
    if not codes:
        codes = [os.path.basename(d) for d in glob.glob(os.path.join(ROOT,"magazine","*"))
                 if os.path.isdir(d) and not os.path.basename(d).startswith("_")]
    for code in codes:
        chs = sorted(int(os.path.basename(os.path.dirname(p)))
                     for p in glob.glob(os.path.join(ROOT,"magazine",code,"*","index.html"))
                     if os.path.basename(os.path.dirname(p)).isdigit())
        made = sum(1 for n in chs if build_one(code, n))
        print(f"{code}: 장별 PDF {made}개 생성 → magazine/_pdf/{code}/")

if __name__ == "__main__": main()
