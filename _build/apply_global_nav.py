#!/usr/bin/env python3
"""apply_global_nav.py — 모든 HTML 페이지에 통일된 네비게이션·폰트 컨셉 적용.

작업:
  1) <head> 안에 global-fonts.css / global-nav.css 링크가 없으면 등록
  2) <body> 직후 기존 <nav class="nav">…</nav>(또는 .gnav) 제거
  3) <body> 직후에 통일 .gnav 마크업 등록 (idempotent)
  4) _archive*, node_modules, partial(<body> 없는 단편) 자동 스킵
"""
from __future__ import annotations
import re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXCL = {"_archive_magazine_old", "_archive_v2", "node_modules", ".git"}

NAV_HTML = '''<nav class="gnav" role="navigation" aria-label="주요 메뉴">
  <div class="gnav__inner">
    <a href="/" class="gnav__logo">네다바웨이</a>
    <button class="gnav__toggle" type="button" aria-label="메뉴" onclick="document.querySelector('.gnav__links').classList.toggle('is-open')">≡</button>
    <ul class="gnav__links" id="gnavLinks">
      <li><a href="/blog/perspective/" class="gnav__link">관점 노트</a></li>
      <li><a href="/learning.html" class="gnav__link">학습 노트</a></li>
      <li><a href="/ai.html" class="gnav__link">AI 작업실</a></li>
      <li><a href="/programs.html" class="gnav__link">강의·코칭</a></li>
      <li><a href="/magazine.html" class="gnav__link">성경관찰</a></li>
      <li><a href="/about.html" class="gnav__link">소개</a></li>
      <li><a href="/contact.html" class="gnav__cta">강의 의뢰 →</a></li>
    </ul>
  </div>
</nav>'''

LINK_FONTS = '<link rel="stylesheet" href="/assets/global-fonts.css">'
LINK_NAV   = '<link rel="stylesheet" href="/assets/global-nav.css">'

# 기존 nav 패턴 — class="nav" 또는 class="gnav"
PAT_OLD_NAV = re.compile(r'<nav\s+class="(?:nav|gnav)[^"]*"[^>]*>.*?</nav>', re.DOTALL | re.IGNORECASE)

def should_skip(p: Path) -> bool:
    parts = set(p.parts)
    return bool(parts & EXCL)

def main() -> int:
    targets = [p for p in ROOT.rglob("*.html") if not should_skip(p.relative_to(ROOT))]
    print(f"[apply_global_nav] candidates={len(targets)}")

    changed = 0
    skipped_no_body = 0
    for p in targets:
        try:
            txt = p.read_text(encoding="utf-8")
        except Exception as e:
            print(f"  ! read fail {p}: {e}")
            continue

        if "</body>" not in txt or "<body" not in txt:
            skipped_no_body += 1
            continue

        new_txt = txt

        # 1) head 안에 global-fonts.css 링크 등록
        if 'href="/assets/global-fonts.css"' not in new_txt:
            new_txt = new_txt.replace("</head>", f"  {LINK_FONTS}\n</head>", 1)
        # 2) head 안에 global-nav.css 링크 등록
        if 'href="/assets/global-nav.css"' not in new_txt:
            new_txt = new_txt.replace("</head>", f"  {LINK_NAV}\n</head>", 1)

        # 3) 기존 nav (class="nav" 또는 .gnav) 모두 제거
        new_txt = PAT_OLD_NAV.sub("", new_txt)

        # 4) <body> 태그 직후에 통일 nav 1회 등록
        body_open_re = re.compile(r"(<body[^>]*>)", re.IGNORECASE)
        m = body_open_re.search(new_txt)
        if not m:
            skipped_no_body += 1
            continue
        insert_pos = m.end()
        new_txt = new_txt[:insert_pos] + "\n\n" + NAV_HTML + "\n\n" + new_txt[insert_pos:]

        if new_txt != txt:
            p.write_text(new_txt, encoding="utf-8")
            changed += 1

    print(f"[apply_global_nav] changed={changed} no_body={skipped_no_body}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
