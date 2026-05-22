#!/usr/bin/env python3
"""Add magazine/{BOOK}/{CHAPTER}/ chapter pages to sitemap.xml.

The Observatory builder (_build/build_observatory.py) generates 358 chapter
pages but never registers them in sitemap.xml — only magazine.html is listed.
Google has no entry point to crawl the 358 articles.

This script:
1. Reads current sitemap.xml
2. Globs magazine/*/*/index.html
3. Inserts <url> entries for any missing chapter pages, alphabetically sorted
   relative to existing magazine entries
4. Preserves all other entries verbatim

Idempotent: re-running with no filesystem changes produces no diff.

Usage:
    python3 scripts/sync-magazine-sitemap.py
    python3 scripts/sync-magazine-sitemap.py --dry-run
"""
from __future__ import annotations
import argparse
import re
import sys
import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITEMAP = ROOT / "sitemap.xml"
BASE_URL = "https://www.nedabah.org"


def collect_chapter_urls() -> list[str]:
    pages = sorted((ROOT / "magazine").glob("*/*/index.html"))
    urls = []
    for p in pages:
        rel = p.relative_to(ROOT).as_posix()
        # Strip /index.html to match canonical (`magazine/GEN/1/`)
        url_path = rel[: -len("index.html")]
        urls.append(f"{BASE_URL}/{url_path}")
    return urls


def get_file_lastmod(p: Path) -> str:
    ts = datetime.datetime.fromtimestamp(p.stat().st_mtime, tz=datetime.timezone.utc)
    return ts.strftime("%Y-%m-%d")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not SITEMAP.exists():
        print(f"missing: {SITEMAP}", file=sys.stderr)
        return 2

    text = SITEMAP.read_text(encoding="utf-8")
    chapter_urls = collect_chapter_urls()
    if not chapter_urls:
        print("no chapter pages found", file=sys.stderr)
        return 0

    existing_locs = set(re.findall(r"<loc>([^<]+)</loc>", text))
    new_entries = []
    for url in chapter_urls:
        if url in existing_locs:
            continue
        page_path = ROOT / url.replace(BASE_URL + "/", "") / "index.html"
        lastmod = get_file_lastmod(page_path) if page_path.exists() else "2026-05-20"
        new_entries.append(f"  <url><loc>{url}</loc><lastmod>{lastmod}</lastmod></url>")

    if not new_entries:
        print("sitemap already up-to-date for magazine chapters")
        return 0

    # Insert before </urlset>
    closing = "</urlset>"
    if closing not in text:
        print(f"malformed sitemap: missing {closing}", file=sys.stderr)
        return 2

    insertion = "\n".join(new_entries) + "\n"
    new_text = text.replace(closing, insertion + closing)

    print(f"add {len(new_entries)} new entries to sitemap.xml")
    for line in new_entries[:5]:
        print(f"  + {line.strip()}")
    if len(new_entries) > 5:
        print(f"  ... +{len(new_entries) - 5} more")

    if args.dry_run:
        print("[dry-run] no changes written")
        return 0

    SITEMAP.write_text(new_text, encoding="utf-8")
    print(f"written: {SITEMAP}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
