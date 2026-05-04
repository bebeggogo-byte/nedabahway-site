#!/usr/bin/env python3
"""Build a one-page A4 handout PDF for in-person workshops.

Layout: 9 cards in 3x3 grid + header + QR code + short URL.
Output: resources/automation/automation-9-handout.pdf

Usage: python3 scripts/build-automation-handout.py
"""
from __future__ import annotations

import base64
import io
import sys
from pathlib import Path

import qrcode
from weasyprint import HTML, CSS

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from automation_meta import (  # noqa: E402
    AUTHOR,
    CARDS,
    COURSE_SUBTITLE,
    COURSE_TITLE,
    SITE_NAME,
)

OUT = ROOT / "resources" / "automation" / "automation-9-handout.pdf"
SHORT_URL = "https://www.nedabah.org/auto"

CSS_TEXT = """
/* System Korean fonts (no Google Fonts) — see build-automation-pdf.py for rationale. */
@page { size: A4; margin: 12mm 12mm 12mm 12mm; }

body { font-family:'Noto Sans CJK KR','NanumSquare','NanumGothic',sans-serif; color:#222; font-size:9.5pt; line-height:1.45; margin:0; }

.head { display:flex; justify-content:space-between; align-items:flex-start; gap:8mm; padding:0 0 5mm; border-bottom:2.5px solid #b45309; }
.head .left .label { font-size:7.5pt; letter-spacing:.22em; color:#b45309; font-weight:700; }
.head .left h1 { font-family:'Noto Serif CJK KR',serif; font-size:22pt; margin:1mm 0 0; line-height:1.1; color:#3a322a; }
.head .left .sub { font-size:10pt; color:#6a604f; margin-top:1.5mm; }
.head .qr { text-align:center; }
.head .qr img { width:24mm; height:24mm; border:1.5px solid #e5d8c4; padding:1mm; background:#fff; }
.head .qr .url { display:block; margin-top:1.5mm; font-size:9pt; font-weight:700; color:#3a322a; letter-spacing:.04em; }
.head .qr .hint { display:block; font-size:7pt; color:#8a7a64; margin-top:.5mm; }

.section-row { display:grid; grid-template-columns:repeat(3, 1fr); gap:3mm; margin-top:5mm; }
.cat { font-family:'Noto Serif CJK KR',serif; font-size:11pt; font-weight:700; color:#3a322a; margin:5mm 0 2mm; padding-left:2.5mm; border-left:3px solid #b45309; }
.card { border:1px solid #e5d8c4; background:#fbf6ec; border-radius:3px; padding:2.8mm 3.2mm; }
.card .tag { font-size:7pt; letter-spacing:.14em; font-weight:700; color:#b45309; }
.card h3 { font-size:10pt; margin:1mm 0 1.5mm; color:#3a322a; line-height:1.25; }
.card p { font-size:8.4pt; color:#3a322a; line-height:1.45; margin:0 0 2mm; }
.card .meta { display:flex; gap:1.5mm; flex-wrap:wrap; font-size:7.5pt; color:#6a604f; }
.card .meta span { background:#fff; border:1px solid #ece1cd; padding:.4mm 1.5mm; border-radius:99px; }
.card .meta .lvl { color:#b45309; font-weight:700; }
.card .nav { font-size:7.5pt; color:#6a604f; margin-top:1mm; }
.card .nav strong { color:#3a322a; }

.foot { margin-top:6mm; padding-top:4mm; border-top:1px dashed #e5d8c4; font-size:8pt; color:#6a604f; display:flex; justify-content:space-between; align-items:center; }
.foot strong { color:#3a322a; }
.foot .note { font-style:italic; }
"""


def qr_data_uri(url: str) -> str:
    img = qrcode.make(url, box_size=8, border=1)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def card_html(slug: str, meta: dict, n: int) -> str:
    return f"""<div class="card">
      <div class="tag">{meta['tag']} · /auto/{n}</div>
      <h3>{meta['title']}</h3>
      <p>{meta['summary']}</p>
      <div class="meta"><span class="lvl">{meta['level']}</span><span>{meta['time']}</span></div>
    </div>"""


def main() -> None:
    qr = qr_data_uri(SHORT_URL)

    sections = {"기획": [], "HR": [], "마케팅": []}
    n = 1
    for slug, meta in CARDS.items():
        sections[meta["section"]].append(card_html(slug, meta, n))
        n += 1

    body_sections = "".join(
        f'<div class="cat">{label} 자동화</div>'
        f'<div class="section-row">{"".join(cards)}</div>'
        for label, cards in sections.items()
    )

    html = f"""<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
    <title>{COURSE_TITLE} · 워크숍 핸드아웃</title></head><body>
    <div class="head">
      <div class="left">
        <div class="label">{SITE_NAME.upper()} · WORKSHOP HANDOUT</div>
        <h1>{COURSE_TITLE}</h1>
        <div class="sub">{COURSE_SUBTITLE} · 9개 자동화 1 페이지 요약</div>
      </div>
      <div class="qr">
        <img src="{qr}" alt="QR 코드 — nedabah.org/auto">
        <span class="url">nedabah.org/auto</span>
        <span class="hint">QR을 카메라로 비추세요</span>
      </div>
    </div>
    {body_sections}
    <div class="foot">
      <span><strong>{AUTHOR}</strong> · {SITE_NAME} · nedabah.way@gmail.com</span>
      <span class="note">완성 코드·시트 템플릿·트러블슈팅은 위 QR/짧은 URL로</span>
    </div>
    </body></html>"""

    print("Rendering A4 handout PDF…")
    HTML(string=html, base_url=str(ROOT)).write_pdf(
        target=str(OUT),
        stylesheets=[CSS(string=CSS_TEXT)],
    )
    size_kb = OUT.stat().st_size // 1024
    print(f"WROTE {OUT.relative_to(ROOT)} ({size_kb} KB)")


if __name__ == "__main__":
    main()
