#!/usr/bin/env python3
"""normalize-gnav.py

Sweep all root-level *.html files and rewrite the <ul class="gnav__links">
block so every page exposes the same top-level menu.

Standard menu (v2 IA):
  강의·코칭 / 콘텐츠 / 활동기록 / 소개   +  강의 의뢰 → (CTA)

Per-file active mapping defines which menu item is highlighted.
Pages without a gnav__links block are skipped (e.g. legacy redirect stubs).

Run: python3 scripts/normalize-gnav.py
"""
from __future__ import annotations
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

STANDARD_MENU = [
    ("/programs.html",   "강의·코칭"),
    ("/content.html",    "콘텐츠"),
    ("/activities.html", "활동기록"),
    ("/about.html",      "소개"),
]
CTA = ("/contact.html", "강의 의뢰 →")

ACTIVE_BY_FILE = {
    # 강의·코칭
    "programs.html":     "/programs.html",
    "coaching.html":     "/programs.html",
    "book-excerpt.html": "/programs.html",
    "lectures.html":     "/programs.html",
    # 소개
    "about.html":     "/about.html",
    "about.en.html":  "/about.html",
    "org.html":       "/about.html",
    "iden.html":      "/about.html",
    "cases.html":     "/about.html",
    "faq.html":       "/about.html",
    "glossary.html":  "/about.html",
    # 콘텐츠
    "content.html":    "/content.html",
    "magazine.html":   "/content.html",
    "learning.html":   "/content.html",
    "newsletter.html": "/content.html",
    "keywords.html":   "/content.html",
    "ai.html":         "/content.html",
    "sbm.html":        "/content.html",
    "korea-seo.html":  "/content.html",
    # 활동기록
    "activities.html": "/activities.html",
    "voices.html":     "/activities.html",
    "recommend.html":  "/activities.html",
    "timeline.html":   "/activities.html",
    # 강의 의뢰
    "contact.html": "/contact.html",
}

GNAV_BLOCK_RE = re.compile(
    r'<ul\s+class="gnav__links"[^>]*>[\s\S]*?</ul>', re.IGNORECASE
)


def build_nav(active_href: str | None) -> str:
    items = []
    for href, label in STANDARD_MENU:
        cls = "gnav__link is-active" if href == active_href else "gnav__link"
        items.append(f'      <li><a href="{href}" class="{cls}">{label}</a></li>')
    cta_href, cta_label = CTA
    cta_cls = "gnav__cta is-active" if cta_href == active_href else "gnav__cta"
    items.append(f'      <li><a href="{cta_href}" class="{cta_cls}">{cta_label}</a></li>')
    return '<ul class="gnav__links" id="gnavLinks">\n' + "\n".join(items) + "\n    </ul>"


def process(file: pathlib.Path) -> str:
    text = file.read_text(encoding="utf-8")
    if not GNAV_BLOCK_RE.search(text):
        return "skip-no-gnav"
    active = ACTIVE_BY_FILE.get(file.name)
    new_nav = build_nav(active)
    new_text, n = GNAV_BLOCK_RE.subn(new_nav, text, count=1)
    if n == 0 or new_text == text:
        return "skip-unchanged"
    file.write_text(new_text, encoding="utf-8")
    return f"updated (active={active or 'none'})"


def main() -> int:
    files = sorted(ROOT.glob("*.html"))
    stats = {"updated": 0, "skipped": 0}
    for f in files:
        try:
            result = process(f)
        except Exception as e:
            print(f"  ERROR {f.name}: {e}", file=sys.stderr)
            continue
        if result.startswith("updated"):
            stats["updated"] += 1
            print(f"  ✓ {f.name:30s}  {result}")
        else:
            stats["skipped"] += 1
    print(f"\n{stats['updated']} updated, {stats['skipped']} skipped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
