#!/usr/bin/env python3
"""Build a single PDF workbook from the 9 automation guides.

Output: resources/automation/automation-9-workbook.pdf
Tooling: WeasyPrint (Python-only, no LaTeX dependency)
Fonts:   System Korean fonts (Noto Sans/Serif CJK KR via fonts-noto-cjk).
         No Google Fonts @import to avoid the fontTools setUnicodeRanges issue.

Design priorities (post v1 fix):
- Conservative layout: no negative margins, no full-bleed backgrounds.
- Each chapter has a stable column-major text flow with controlled page breaks.
- Code blocks are pre-wrap with fixed font and explicit page-break-inside avoid.
- Cover and TOC are simple, easy to render correctly.

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
   No Google Fonts @import to avoid the fontTools setUnicodeRanges issue with
   downloaded Noto Sans KR woff2 subsets. */

@page {
  size: A4;
  margin: 22mm 18mm;
  @bottom-center {
    content: counter(page) " / " counter(pages);
    font-family: 'Noto Sans CJK KR', sans-serif;
    font-size: 9pt;
    color: #8a7a64;
  }
}

body {
  font-family: 'Noto Sans CJK KR', 'NanumSquare', sans-serif;
  font-size: 10.5pt;
  line-height: 1.6;
  color: #222;
}

/* ─── 표지 ─── */
.cover {
  page-break-after: always;
  text-align: left;
  padding-top: 60mm;
}
.cover .label {
  font-size: 9pt; letter-spacing: .25em; color: #b45309;
  font-weight: 700;
}
.cover h1 {
  font-family: 'Noto Serif CJK KR', serif;
  font-size: 38pt; line-height: 1.15;
  margin: 6mm 0 2mm;
  color: #3a322a;
}
.cover .sub {
  font-family: 'Noto Serif CJK KR', serif;
  font-size: 17pt; color: #6a604f;
  margin: 0 0 36mm;
  font-weight: 400;
}
.cover .meta {
  font-size: 10.5pt; color: #3a322a; line-height: 1.85;
}
.cover .meta strong { color: #3a322a; }
.cover hr.divider {
  border: none; border-top: 2px solid #b45309;
  width: 30mm; margin: 0 0 6mm; padding: 0;
}

/* ─── 목차 ─── */
.toc { page-break-after: always; }
.toc h2 {
  font-family: 'Noto Serif CJK KR', serif;
  font-size: 22pt; color: #3a322a; margin: 0 0 6mm;
}
.toc .toc-section {
  font-weight: 700; color: #b45309;
  font-size: 10pt; letter-spacing: .12em;
  margin-top: 6mm;
}
.toc ol {
  padding-left: 6mm; margin: 2mm 0;
}
.toc li {
  margin: 1mm 0;
  font-size: 10.5pt;
  page-break-inside: avoid;
}
.toc li small { color: #8a7a64; font-size: 9pt; }

/* ─── 챕터 (각 자동화 1개) ─── */
.chapter {
  page-break-before: always;
}
.chapter .ch-tag {
  display: block;
  font-size: 9pt; letter-spacing: .14em; color: #b45309;
  font-weight: 700;
  margin-bottom: 2mm;
}
.chapter h1 {
  font-family: 'Noto Serif CJK KR', serif;
  font-size: 22pt; color: #3a322a; line-height: 1.2;
  margin: 0 0 3mm;
}
.chapter .summary {
  color: #6a604f; font-style: italic; margin: 0 0 5mm;
  font-size: 10.5pt; line-height: 1.55;
}

/* 메타 카드 */
.starter-card {
  border: 1px solid #e5d8c4; background: #fbf6ec;
  border-radius: 4px; padding: 4mm 5mm;
  margin: 0 0 6mm;
  font-size: 9.5pt;
  page-break-inside: avoid;
}
.starter-card .row { display: block; padding: 1mm 0; }
.starter-card .si {
  display: inline-block; width: 22mm;
  font-size: 8pt; color: #8a7a64; letter-spacing: .08em;
  font-weight: 700; text-transform: uppercase;
}
.starter-card .sv { color: #3a322a; font-weight: 600; }

/* 도구 박스 */
.tool-cta {
  background: #fff8ea; border: 1px solid #e8d2a4;
  border-radius: 4px; padding: 3mm 5mm;
  margin: 0 0 6mm;
  font-size: 9.5pt;
  page-break-inside: avoid;
}
.tool-cta strong { color: #b45309; }
.tool-cta .url { font-family: monospace; color: #3a322a; }

/* 본문 */
.chapter h2 {
  font-size: 13pt; color: #3a322a; margin: 7mm 0 2mm;
  padding-left: 3mm; border-left: 3px solid #b45309;
  page-break-after: avoid;
}
.chapter h3 {
  font-size: 11pt; color: #3a322a; margin: 5mm 0 1mm;
  page-break-after: avoid;
}
.chapter h4 {
  font-size: 10pt; color: #6a604f; margin: 4mm 0 1mm;
}
.chapter p { margin: 0 0 3mm; }
.chapter ul, .chapter ol {
  margin: 0 0 3mm 0;
  padding-left: 5mm;
}
.chapter li { margin: .5mm 0; }

.chapter blockquote {
  background: #fbf6ec; border-left: 3px solid #b45309;
  padding: 2mm 5mm; margin: 2mm 0 3mm;
  color: #3a322a;
  page-break-inside: avoid;
}

.chapter table {
  width: 100%; border-collapse: collapse;
  margin: 2mm 0 4mm;
  font-size: 9pt;
  page-break-inside: avoid;
}
.chapter th {
  background: #fbf6ec; text-align: left;
  padding: 1.5mm 2mm; border-bottom: 1.5px solid #e5d8c4;
  font-weight: 700;
}
.chapter td {
  padding: 1.5mm 2mm; border-bottom: 1px solid #eee;
  vertical-align: top;
}

/* 인라인 코드 */
.chapter code {
  background: #f3eee2; padding: 0 1mm;
  border-radius: 2px;
  font-family: 'Noto Sans Mono CJK KR', 'JetBrains Mono', monospace;
  font-size: 9pt;
}

/* 코드 블록 — 안전한 줄 바꿈 (word-break: break-all 제거 — 텍스트 중복 렌더링 유발) */
.chapter pre {
  background: #1f1a14; color: #f5e9d4;
  padding: 3mm 4mm; border-radius: 4px;
  margin: 2mm 0 3mm;
  font-family: 'Noto Sans Mono CJK KR', 'JetBrains Mono', 'Courier New', monospace;
  font-size: 7.6pt;
  line-height: 1.4;
  /* pre-wrap: 원래 개행 유지, 너무 긴 줄은 wrap. word-wrap: break-word: 긴 단어만 나눔 */
  white-space: pre-wrap;
  word-wrap: break-word;
  /* 코드 블록 내부 페이지 분할 허용 (긴 코드라도 한 페이지에 강제 안 함) */
  page-break-inside: auto;
  /* 컨테이너 leak 방지 */
  overflow: hidden;
  max-width: 100%;
}
.chapter pre code {
  background: transparent; color: inherit;
  padding: 0; font-size: inherit;
  font-family: inherit;
}

/* 외부 링크 표시 (PDF에서는 클릭 가능) */
.chapter a { color: #b45309; text-decoration: none; }
.chapter a:hover { text-decoration: underline; }
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
      <div class="row"><span class="si">난이도</span><span class="sv">{meta['level']}</span></div>
      <div class="row"><span class="si">예상 소요</span><span class="sv">{meta['time']}</span></div>
      <div class="row"><span class="si">전제 조건</span><span class="sv">{meta['prereq']}</span></div>
      <div class="row"><span class="si">월 비용</span><span class="sv">0원</span></div>
    </div>
    """

    tool_box = ""
    if meta.get("tool"):
        tool_box = f"""
        <div class="tool-cta">
          <strong>⚡ 셋업 전에 결과부터:</strong> 같은 로직을 브라우저에서 입력 한 번으로 실행하는 미니 도구가 있습니다 →
          <span class="url">nedabah.org{meta['tool']}</span>
        </div>
        """

    return f"""<section class="chapter">
      <span class="ch-tag">{meta['tag']} · {meta['section']} 자동화</span>
      <h1>{meta['title']}</h1>
      <p class="summary">{meta['summary']}</p>
      {starter}
      {tool_box}
      {body}
    </section>"""


def main() -> None:
    cover = f"""
    <section class="cover">
      <hr class="divider">
      <div class="label">RESOURCE · WORKBOOK</div>
      <h1>{COURSE_TITLE}</h1>
      <div class="sub">{COURSE_SUBTITLE}</div>
      <div class="meta">
        <strong>9개 자동화 통합본</strong> · 완성 코드 · 시트 템플릿 · 트러블슈팅<br>
        Google Apps Script · Gemini · Slack · 월 0원 운영<br>
        브라우저 도구 9선 — 입력만으로 결과 즉시 생성<br><br>
        강사 {AUTHOR} · {SITE_NAME}<br>
        자료 허브: nedabah.org/auto<br>
        도구 모음: nedabah.org/auto/tools
      </div>
    </section>
    """

    sections = {"기획": [], "HR": [], "마케팅": []}
    for slug, meta in CARDS.items():
        sections[meta["section"]].append((slug, meta))

    toc_parts = ['<section class="toc"><h2>목차</h2>']
    n = 1
    for sec_label, items in sections.items():
        toc_parts.append(f'<div class="toc-section">{sec_label.upper()} 자동화 ({len(items)}선)</div>')
        toc_parts.append('<ol>')
        for slug, meta in items:
            toc_parts.append(
                f'<li><strong>{meta["tag"]}</strong> · {meta["title"]} '
                f'<small>(난이도 {meta["level"]} · {meta["time"]})</small></li>'
            )
            n += 1
        toc_parts.append('</ol>')
    toc_parts.append('<p style="margin-top:8mm;color:#8a7a64;font-size:9.5pt;">자료 허브: nedabah.org/auto · 도구 모음: nedabah.org/auto/tools · 강의 의뢰: nedabah.way@gmail.com</p>')
    toc_parts.append('</section>')
    toc = ''.join(toc_parts)

    chapters: list[str] = []
    for slug, meta in CARDS.items():
        chapters.append(chapter_html(slug, meta))

    html = (
        '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">'
        f'<title>{COURSE_TITLE} · 워크북</title></head>'
        f'<body>{cover}{toc}{"".join(chapters)}</body></html>'
    )

    print("Rendering PDF (system Korean fonts, may take 30~120s)…")
    HTML(string=html, base_url=str(ROOT)).write_pdf(
        target=str(OUT),
        stylesheets=[CSS(string=CSS_TEXT)],
    )
    size_kb = OUT.stat().st_size // 1024
    print(f"WROTE {OUT.relative_to(ROOT)} ({size_kb} KB)")


if __name__ == "__main__":
    main()
