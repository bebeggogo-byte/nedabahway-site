#!/usr/bin/env python3
"""Build a single PDF workbook from the 9 automation guides.

Output: resources/automation/automation-9-workbook.pdf
Tooling: WeasyPrint (Python-only, no LaTeX dependency)
Fonts:   Noto Sans KR / Noto Serif KR loaded from Google Fonts (cached on first build)

Usage: python3 scripts/build-automation-pdf.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

import markdown
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

AUTO_DIR = ROOT / "resources" / "automation"
OUT = AUTO_DIR / "automation-9-workbook.pdf"

CSS_TEXT = """
/* System Korean fonts — keep PDF size manageable. Build host needs:
   apt-get install fonts-nanum fonts-noto-cjk  (or equivalent on other OS).
   No Google Fonts @import to avoid network dependency and to skip the
   fontTools setUnicodeRanges issue with Noto Sans KR woff2 subsets. */

@page {
  size: A4;
  margin: 22mm 18mm 22mm 18mm;
  @bottom-center {
    content: counter(page) " / " counter(pages);
    font-family: 'Noto Sans CJK KR','NanumSquare','NanumGothic',sans-serif, sans-serif;
    font-size: 9pt;
    color: #8a7a64;
  }
  @top-right {
    content: string(chapter);
    font-family: 'Noto Sans CJK KR','NanumSquare','NanumGothic',sans-serif, sans-serif;
    font-size: 8.5pt;
    color: #b45309;
    letter-spacing: .12em;
  }
}
@page :first { margin: 0; @bottom-center{content:none;} @top-right{content:none;} }

body {
  font-family: 'Noto Sans CJK KR','NanumSquare','NanumGothic',sans-serif, sans-serif;
  font-size: 10.5pt;
  line-height: 1.65;
  color: #222;
}

.cover {
  page: cover;
  page-break-after: always;
  background: linear-gradient(160deg,#3a322a 0%, #1f1a14 100%);
  color: #fbf6ec;
  padding: 80mm 18mm 30mm 18mm;
  margin: -22mm -18mm;
  height: 297mm;
  box-sizing: border-box;
}
.cover .label { font-size: 9pt; letter-spacing: .25em; color:#d97706; font-weight:700;}
.cover h1 { font-family:'Noto Serif CJK KR',serif; font-size:42pt; line-height:1.15; margin:6mm 0 4mm; font-weight:900;}
.cover .sub { font-family:'Noto Serif CJK KR',serif; font-size:18pt; color:#e5d8c4; margin:0 0 24mm;}
.cover .meta { font-size: 10pt; color:#cbb89c; line-height:1.85;}

.toc { page-break-after: always; }
.toc h2 { font-family:'Noto Serif CJK KR',serif; font-size:22pt; color:#3a322a; margin:0 0 6mm; }
.toc ol { padding-left: 6mm; }
.toc li { margin:.4rem 0; font-size: 11pt; }
.toc li small { color:#8a7a64; }

.chapter { page-break-before: always; string-set: chapter content(); }
.chapter > h1 {
  font-family:'Noto Serif CJK KR',serif;
  font-size: 22pt;
  margin: 0 0 4mm;
  color: #3a322a;
  border-bottom: 2px solid #b45309;
  padding-bottom: 3mm;
}
.chapter > h2 { font-size: 14pt; color:#3a322a; margin: 8mm 0 3mm; padding-left:3mm; border-left:3px solid #b45309; page-break-after: avoid; }
.chapter > h3 { font-size: 12pt; color:#3a322a; margin: 6mm 0 2mm; page-break-after: avoid; }
.chapter > h4 { font-size: 10.5pt; color:#6a604f; margin: 4mm 0 2mm; }
.chapter p { margin: 0 0 3mm; }
.chapter ul, .chapter ol { margin: 0 0 4mm 5mm; padding: 0; }
.chapter li { margin:.2rem 0; }

.chapter blockquote {
  background:#fbf6ec; border-left: 3px solid #b45309;
  padding: 3mm 5mm; margin: 3mm 0; color:#3a322a;
  border-radius: 0 4px 4px 0;
}

.chapter table { width:100%; border-collapse: collapse; margin: 3mm 0 5mm; font-size: 9.5pt; page-break-inside: avoid; }
.chapter th { background:#fbf6ec; text-align:left; padding:1.4mm 2mm; border-bottom:1.5px solid #e5d8c4; }
.chapter td { padding:1.4mm 2mm; border-bottom:1px solid #eee; vertical-align: top; }

.chapter code { background:#f3eee2; padding: .2mm 1mm; border-radius:2px; font-family:'JetBrains Mono','Menlo',monospace; font-size:9.5pt; }
.chapter pre {
  background:#1f1a14; color:#f5e9d4;
  padding: 3mm 4mm; border-radius:4px;
  overflow: hidden; line-height:1.45; font-size:8.5pt;
  white-space: pre-wrap; word-break: break-all;
  page-break-inside: avoid;
}
.chapter pre code { background:transparent; color:inherit; padding:0; font-size: inherit; }

.starter-card {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm;
  margin: 3mm 0 6mm; padding: 4mm 5mm;
  background:#fbf6ec; border:1px solid #e5d8c4; border-radius: 4px;
  font-size: 9.5pt;
}
.starter-card .si { font-size: 7.5pt; color:#8a7a64; letter-spacing:.1em; font-weight:700; text-transform: uppercase; }
.starter-card .sv { font-size: 10pt; color:#3a322a; margin-top: 1mm; font-weight:600; }

.section-title {
  font-family:'Noto Serif CJK KR',serif;
  font-size: 18pt; color:#fbf6ec;
  background:#3a322a; padding: 22mm 18mm; margin: -22mm -18mm 12mm;
  page-break-after: avoid;
}
.section-title small { display:block; font-family:'Noto Sans CJK KR','NanumSquare','NanumGothic',sans-serif,sans-serif; font-size:9.5pt; letter-spacing:.2em; color:#d97706; font-weight:700; margin-bottom: 3mm; }
"""


def render_md(text: str) -> str:
    return markdown.markdown(
        text,
        extensions=["fenced_code", "tables", "sane_lists", "attr_list"],
        output_format="html5",
    )


def chapter_html(slug: str, meta: dict[str, Any]) -> str:
    md_path = AUTO_DIR / f"{slug}.md"
    body = render_md(md_path.read_text(encoding="utf-8"))
    body = re.sub(r"<h1[^>]*>.*?</h1>", "", body, count=1, flags=re.DOTALL)
    starter = f"""
    <div class="starter-card">
      <div><div class="si">난이도</div><div class="sv">{meta['level']}</div></div>
      <div><div class="si">예상 소요</div><div class="sv">{meta['time']}</div></div>
      <div><div class="si">전제 조건</div><div class="sv">{meta['prereq']}</div></div>
      <div><div class="si">월 비용</div><div class="sv">0원</div></div>
    </div>
    """
    return f"""<section class="chapter">
      <h1>{meta['tag']} · {meta['title']}</h1>
      <p style="color:#6a604f;font-style:italic;margin:-2mm 0 4mm;">{meta['summary']}</p>
      {starter}
      {body}
    </section>"""


def section_divider(label: str, count: int) -> str:
    return f"""<section class="chapter section-title">
      <small>{SITE_NAME.upper()} · WORKBOOK</small>
      {label} 자동화 ({count}선)
    </section>"""


def main() -> None:
    cover = f"""
    <section class="cover">
      <div class="label">RESOURCE · WORKBOOK</div>
      <h1>{COURSE_TITLE}</h1>
      <div class="sub">{COURSE_SUBTITLE}</div>
      <div class="meta">
        9개 자동화 통합본 · 완성 코드 · 시트 템플릿 · 트러블슈팅<br>
        Google Apps Script · Gemini · Slack · 월 0원<br><br>
        강사 {AUTHOR} · {SITE_NAME} · nedabah.org/auto
      </div>
    </section>
    """

    toc_items = []
    for i, (slug, meta) in enumerate(CARDS.items(), 1):
        toc_items.append(
            f'<li><strong>{meta["tag"]}</strong> · {meta["title"]} '
            f'<small>(난이도 {meta["level"]} · {meta["time"]})</small></li>'
        )
    toc = f"""
    <section class="toc">
      <h2>목차</h2>
      <ol>{''.join(toc_items)}</ol>
      <p style="margin-top:8mm;color:#8a7a64;font-size:9.5pt;">자료 허브: nedabah.org/auto · 강의 의뢰: nedabah.way@gmail.com</p>
    </section>
    """

    chapters: list[str] = []
    last_section = None
    section_counts = {"기획": 3, "HR": 3, "마케팅": 3}
    for slug, meta in CARDS.items():
        if meta["section"] != last_section:
            chapters.append(section_divider(meta["section"], section_counts[meta["section"]]))
            last_section = meta["section"]
        chapters.append(chapter_html(slug, meta))

    html = f"""<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>{COURSE_TITLE} · 워크북</title></head>
    <body>{cover}{toc}{''.join(chapters)}</body></html>"""

    print("Rendering PDF (this may take 30~60s on first run while fonts download)…")
    HTML(string=html, base_url=str(ROOT)).write_pdf(
        target=str(OUT),
        stylesheets=[CSS(string=CSS_TEXT)],
    )
    size_kb = OUT.stat().st_size // 1024
    print(f"WROTE {OUT.relative_to(ROOT)} ({size_kb} KB)")


if __name__ == "__main__":
    main()
