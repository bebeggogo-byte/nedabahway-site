#!/usr/bin/env python3
"""Convert resources/automation/**/*.md to styled HTML pages matching site theme.

Usage: python3 scripts/build-automation-pages.py
Output: HTML next to each .md, in resources/automation/{section}/{slug}.html

Each guide is wrapped with:
- Site nav and footer
- Open Graph + Twitter card meta + Schema.org HowTo JSON-LD
- "초보자 카드" (난이도 / 예상 소요 / 전제조건)
- Code copy buttons + line numbers (assets/code-copy.js)
- Share bar floating widget (assets/share-bar.js)
- Mobile-tuned typography
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent
AUTO_DIR = ROOT / "resources" / "automation"
sys.path.insert(0, str(ROOT / "scripts"))
from automation_meta import CARDS, OG_IMAGE  # noqa: E402

# CARDS / OG_IMAGE imported from automation_meta — single source of truth.

PAGE_TPL = """<!DOCTYPE html>
<html lang="ko">
<head>
<link rel="stylesheet" href="/assets/nedabah.bundle.css">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title} — 자동화 9선 | 네다바웨이</title>
<meta name="description" content="{summary}">
<link rel="canonical" href="https://www.nedabah.org{canonical}">
<meta property="og:title" content="{title} — 자동화 9선">
<meta property="og:description" content="{summary}">
<meta property="og:url" content="https://www.nedabah.org{canonical}">
<meta property="og:type" content="article">
<meta property="og:image" content="{og_image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{summary}">
<meta name="twitter:image" content="{og_image}">
<meta name="keywords" content="{section} 자동화, Apps Script, Gemini, 노코드, 업무자동화, {tag}">

<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "{title}",
  "description": "{summary}",
  "url": "https://www.nedabah.org{canonical}",
  "inLanguage": "ko-KR",
  "tool": ["Google Apps Script","Google Sheets","Gemini API","Slack"],
  "totalTime": "{iso_time}",
  "publisher": {{"@id": "https://www.nedabah.org/#organization"}}
}}
</script>

<style>
.guide-body {{ font-family:'Noto Sans KR',sans-serif; line-height:1.8; color:#222; max-width:780px; margin:2rem auto; padding:0 1.4rem; }}
.guide-body h1 {{ font-family:'Noto Serif KR',serif; font-size:2rem; line-height:1.3; margin:.4rem 0 1rem; }}
.guide-body h2 {{ font-size:1.35rem; margin-top:2.5rem; padding-left:.6rem; border-left:4px solid #b45309; color:#3a322a; }}
.guide-body h3 {{ font-size:1.1rem; margin-top:1.6rem; color:#3a322a; }}
.guide-body h4 {{ font-size:1rem; margin-top:1.2rem; color:#6a604f; }}
.guide-body blockquote {{ background:#fbf6ec; border-left:4px solid #b45309; padding:.6rem 1.2rem; color:#3a322a; margin:1rem 0; border-radius:0 8px 8px 0; }}
.guide-body table {{ width:100%; border-collapse:collapse; margin:1rem 0; font-size:.95rem; }}
.guide-body th {{ background:#fbf6ec; text-align:left; padding:.55rem .7rem; border-bottom:2px solid #e5d8c4; }}
.guide-body td {{ padding:.5rem .7rem; border-bottom:1px solid #eee; vertical-align:top; }}
.guide-body code {{ background:#f3eee2; padding:.1rem .35rem; border-radius:4px; font-family:'JetBrains Mono','Menlo',monospace; font-size:.92em; }}
.guide-body pre {{ background:#1f1a14; color:#f5e9d4; padding:1rem 1.2rem; border-radius:8px; overflow-x:auto; line-height:1.55; font-size:.86rem; }}
.guide-body pre code {{ background:transparent; color:inherit; padding:0; }}
.guide-body ul, .guide-body ol {{ line-height:1.8; }}
.guide-body a {{ color:#b45309; }}
.tag-pill {{ display:inline-block; font-size:.72rem; letter-spacing:.14em; font-weight:700; padding:.22rem .6rem; border-radius:99px; background:#fbf6ec; color:#b45309; border:1px solid #e5d8c4; }}
.guide-meta {{ color:#6a604f; font-size:.92rem; margin-top:.4rem; }}
.starter-card {{ display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:.8rem; max-width:780px; margin:1.4rem auto 0; padding:1rem 1.2rem; background:#fbf6ec; border:1px solid #e5d8c4; border-radius:10px; font-family:'Noto Sans KR',sans-serif; }}
.starter-card .si {{ font-size:.72rem; color:#8a7a64; letter-spacing:.1em; font-weight:700; text-transform:uppercase; }}
.starter-card .sv {{ font-size:1rem; color:#3a322a; margin-top:.2rem; font-weight:600; }}
.related-aside {{ margin:3rem auto 4rem; max-width:780px; padding:1.6rem 1.8rem; background:#fbf6ec; border-radius:12px; }}
.related-aside h2 {{ margin-top:0; font-size:1.05rem; border:none; padding:0; }}
.related-aside ul {{ list-style:none; padding:0; line-height:2; }}
.glossary-link {{ display:inline-block; margin-top:.4rem; font-size:.85rem; color:#6a604f; }}
@media (max-width:520px) {{
  .guide-body {{ font-size:.96rem; padding:0 1.1rem; }}
  .guide-body h1 {{ font-size:1.55rem; }}
  .guide-body h2 {{ font-size:1.15rem; }}
  .guide-body table {{ font-size:.86rem; }}
  .guide-body table th, .guide-body table td {{ padding:.4rem .45rem; }}
  .starter-card {{ grid-template-columns:repeat(2, 1fr); padding:.85rem 1rem; }}
}}
</style>
</head>
<body>
<nav class="gnav" role="navigation" aria-label="주요 메뉴">
  <div class="gnav__inner">
    <a href="/" class="gnav__logo">네다바웨이</a>
    <ul class="gnav__links">
      <li><a href="/lectures/business-automation.html" class="gnav__link">강의</a></li>
      <li><a href="/resources/automation/" class="gnav__link">자동화 허브</a></li>
      <li><a href="/resources/automation/glossary.html" class="gnav__link">용어집</a></li>
      <li><a href="/contact.html" class="gnav__cta">강의 의뢰 →</a></li>
    </ul>
  </div>
</nav>

<header style="max-width:780px;margin:2.4rem auto 0;padding:0 1.4rem;font-family:'Noto Sans KR',sans-serif;">
  <p style="font-size:.78rem;color:#b45309;letter-spacing:.18em;font-weight:700;">RESOURCE · {section_upper} 자동화 · <span class="tag-pill">{tag}</span></p>
</header>

<section class="starter-card" aria-label="이 자동화 한눈에">
  <div><div class="si">난이도</div><div class="sv">{level}</div></div>
  <div><div class="si">예상 소요</div><div class="sv">{time}</div></div>
  <div><div class="si">전제 조건</div><div class="sv">{prereq}</div></div>
  <div><div class="si">월 비용</div><div class="sv">0원</div></div>
</section>

<article class="guide-body">
{body}
<p class="glossary-link">처음 보는 용어가 있나요? → <a href="/resources/automation/glossary.html">자동화 용어집(15개)</a></p>
</article>

<aside class="related-aside">
  <h2>이 자동화와 함께 보면 좋은 자료</h2>
  <ul>
    <li>→ <a href="/resources/automation/">자동화 9선 자료 허브로 돌아가기</a></li>
    <li>→ <a href="/resources/automation/glossary.html">초보자 용어집</a></li>
    <li>→ <a href="/lectures/business-automation.html">강의 페이지: 조직 업무 자동화 실무 9선</a></li>
    <li>→ <a href="/contact.html">조직 맞춤 워크숍 의뢰</a></li>
  </ul>
</aside>

<footer style="max-width:780px;margin:0 auto 4rem;padding:1.5rem;border-top:1px solid #e5d8c4;font-size:.85rem;color:#8a7a64;font-family:'Noto Sans KR',sans-serif;">
  <p>김창환 · 네다바웨이 · 제주 출발 전국 출강 · <a href="mailto:nedabah.way@gmail.com">nedabah.way@gmail.com</a></p>
</footer>

<script src="/assets/code-copy.js" defer></script>
<script src="/assets/share-bar.js" defer></script>
</body>
</html>
"""


def render(md_text: str) -> str:
    """Render markdown to HTML with code/table extensions."""
    return markdown.markdown(
        md_text,
        extensions=[
            "fenced_code",
            "tables",
            "sane_lists",
            "attr_list",
            "toc",
        ],
        output_format="html5",
    )


def to_iso_duration(time_str: str) -> str:
    """Convert "30분" / "1시간 30분" to ISO 8601 duration."""
    minutes = 0
    for n, unit in re.findall(r"(\d+)\s*(분|시간)", time_str):
        minutes += int(n) * (60 if unit == "시간" else 1)
    hours, rem = divmod(minutes, 60)
    parts = "PT"
    if hours:
        parts += f"{hours}H"
    if rem or not hours:
        parts += f"{rem}M"
    return parts


def main() -> None:
    for slug, meta in CARDS.items():
        md_path = AUTO_DIR / f"{slug}.md"
        if not md_path.exists():
            print(f"SKIP missing: {md_path}")
            continue
        body_html = render(md_path.read_text(encoding="utf-8"))
        body_html = re.sub(r"<h1[^>]*>.*?</h1>", "", body_html, count=1, flags=re.DOTALL)
        page = PAGE_TPL.format(
            title=meta["title"],
            summary=meta["summary"],
            section=meta["section"],
            section_upper=meta["section"].upper(),
            tag=meta["tag"],
            level=meta["level"],
            time=meta["time"],
            prereq=meta["prereq"],
            iso_time=to_iso_duration(meta["time"]),
            canonical=f"/resources/automation/{slug}.html",
            og_image=OG_IMAGE,
            body=body_html,
        )
        page = page.replace(
            '<article class="guide-body">\n',
            f'<article class="guide-body">\n<h1>{meta["title"]}</h1>\n<p class="guide-meta">{meta["summary"]}</p>\n',
            1,
        )
        out_path = AUTO_DIR / f"{slug}.html"
        out_path.write_text(page, encoding="utf-8")
        print(f"WROTE {out_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
