#!/usr/bin/env python3
"""Add <main> + <header> semantic landmarks to blog/perspective posts.

Funnel S1 gate requires every public page to carry <main> and <header>
landmarks. Existing perspective posts ship with <article class="wrap"> as
the sole content container, so they cannot be promoted to public-pages.txt
or sitemap.xml without this refactor.

Transform (per page):
1. Skip if <main> already present (idempotent)
2. Wrap <article class="wrap"> ... </article> with <main> ... </main>
3. Wrap <div class="meta">...</div> (first occurrence inside article) with
   <header class="post-header">...</header>

Both wraps are pure semantic — no CSS class changes, no layout impact since
default browser styling of <main> and <header> is `display: block`.

Idempotent. Per-file dry-run preview supported.
"""
from __future__ import annotations
import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

ARTICLE_OPEN_RE = re.compile(r'(<article\s+class="wrap"\s*>)', re.IGNORECASE)
ARTICLE_CLOSE_RE = re.compile(r'(</article>)', re.IGNORECASE)
META_DIV_RE = re.compile(
    r'(<div\s+class="meta">.*?</div>)', re.DOTALL | re.IGNORECASE
)


def transform(html: str) -> tuple[str, str]:
    has_main = bool(re.search(r"<main[\s>]", html))
    has_header = bool(re.search(r"<header[\s>]", html))

    # Case 1: both present — nothing to do
    if has_main and has_header:
        return html, "skip (both landmarks already present)"

    # Case 2: <main> present but <header> missing — inject minimal hidden header
    # (covers new-style posts with <article class="article">)
    if has_main and not has_header:
        new_html = re.sub(
            r"(<main[^>]*>)",
            r'\1\n<header class="post-header" hidden></header>',
            html,
            count=1,
        )
        return (new_html, "transformed (added <header> only)") if new_html != html else (html, "unchanged")

    # Case 3: neither present — full wrap. Requires the old-style pattern.
    if not ARTICLE_OPEN_RE.search(html):
        return html, "skip (no <article class=\"wrap\">)"
    if not ARTICLE_CLOSE_RE.search(html):
        return html, "skip (no </article>)"

    # Wrap meta div with <header>
    def wrap_meta(m: re.Match) -> str:
        return f'<header class="post-header">{m.group(1)}</header>'

    new_html, meta_count = META_DIV_RE.subn(wrap_meta, html, count=1)
    if meta_count == 0:
        new_html = ARTICLE_OPEN_RE.sub(
            r'<main>\n<header class="post-header" hidden></header>\n\1',
            new_html,
            count=1,
        )
    else:
        new_html = ARTICLE_OPEN_RE.sub(r'<main>\n\1', new_html, count=1)

    new_html = ARTICLE_CLOSE_RE.sub(r'\1\n</main>', new_html, count=1)

    if new_html == html:
        return html, "unchanged"
    return new_html, "transformed"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    posts = sorted(
        p for p in (ROOT / "blog/perspective").glob("*.html") if p.name != "index.html"
    )
    if not posts:
        print("no perspective posts", file=sys.stderr)
        return 0

    stats = {"transformed": 0, "skip": 0, "unchanged": 0}
    for p in posts:
        html = p.read_text(encoding="utf-8")
        new_html, status = transform(html)
        head = status.split()[0]
        if head == "transformed":
            stats["transformed"] += 1
            if not args.dry_run:
                p.write_text(new_html, encoding="utf-8")
        elif head == "skip":
            stats["skip"] += 1
        else:
            stats["unchanged"] += 1

    label = "would-transform" if args.dry_run else "transformed"
    print(f"Total: {len(posts)}  {label}: {stats['transformed']}  skipped: {stats['skip']}  unchanged: {stats['unchanged']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
