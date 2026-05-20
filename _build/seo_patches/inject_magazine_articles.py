#!/usr/bin/env python3
"""Inject Article + author JSON-LD into magazine/{BOOK}/{CHAPTER}/index.html.

Magazine pages are Bible observation articles (성경 관찰 SBM). Each currently
ships with zero structured data — Google has no signal linking the 409 pages
to author 김창환 or to the parent magazine collection.

This script:
1. Globs magazine/*/*/index.html (chapter pages only — book index pages skipped)
2. Extracts title, description, canonical URL from existing markup
3. Builds Article schema with author/publisher/isPartOf references
4. Inserts inside a dedicated marker block, idempotent on re-run

Marker is distinct from inject_schemas.py so the two scripts do not interfere.

Usage:
    python3 _build/seo_patches/inject_magazine_articles.py
    python3 _build/seo_patches/inject_magazine_articles.py --dry-run
    python3 _build/seo_patches/inject_magazine_articles.py --limit 5  # first N
"""
from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

MARKER_BEGIN = "<!-- BEGIN seo_patches: inject_magazine_articles.py -->"
MARKER_END = "<!-- END seo_patches: inject_magazine_articles.py -->"

TITLE_RE = re.compile(r"<title>([^<]+)</title>", re.IGNORECASE)
DESC_RE = re.compile(r'<meta\s+name="description"\s+content="([^"]+)"', re.IGNORECASE)
CANON_RE = re.compile(r'<link\s+rel="canonical"\s+href="([^"]+)"', re.IGNORECASE)


def extract_meta(html: str) -> dict:
    title = TITLE_RE.search(html)
    desc = DESC_RE.search(html)
    canon = CANON_RE.search(html)
    return {
        "title": title.group(1).strip() if title else None,
        "description": desc.group(1).strip() if desc else None,
        "canonical": canon.group(1).strip() if canon else None,
    }


OG_IMAGE = "https://www.nedabah.org/assets/og-magazine.svg"


def build_article(meta: dict, page_path: Path) -> dict:
    canonical = meta["canonical"] or f"https://www.nedabah.org/{page_path.relative_to(ROOT)}"
    headline = (meta["title"] or "").split(" | ")[0].strip()
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        "@id": f"{canonical}#article",
        "headline": headline,
        "description": meta["description"] or "",
        "url": canonical,
        "mainEntityOfPage": canonical,
        "inLanguage": "ko-KR",
        "image": OG_IMAGE,
        "isPartOf": {
            "@type": "Blog",
            "@id": "https://www.nedabah.org/magazine.html#blog",
            "name": "Observatory — 성경 관찰",
            "url": "https://www.nedabah.org/magazine.html",
        },
        "author": {
            "@type": "Person",
            "@id": "https://www.nedabah.org/about.html#kim-changhwan",
            "name": "김창환",
            "url": "https://www.nedabah.org/about.html",
        },
        "publisher": {
            "@type": ["Organization", "EducationalOrganization"],
            "@id": "https://www.nedabah.org/#organization",
            "name": "네다바웨이",
            "logo": {
                "@type": "ImageObject",
                "url": "https://www.nedabah.org/assets/og-default.svg",
            },
        },
    }


def _esc(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def build_og_meta(meta: dict, canonical: str) -> list[str]:
    headline = (meta["title"] or "").split(" | ")[0].strip()
    description = meta["description"] or ""
    return [
        f'<meta property="og:title" content="{_esc(headline)}">',
        f'<meta property="og:description" content="{_esc(description)}">',
        f'<meta property="og:url" content="{_esc(canonical)}">',
        '<meta property="og:type" content="article">',
        f'<meta property="og:image" content="{OG_IMAGE}">',
        '<meta property="og:site_name" content="네다바웨이">',
        '<meta property="og:locale" content="ko_KR">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{_esc(headline)}">',
        f'<meta name="twitter:description" content="{_esc(description)}">',
        f'<meta name="twitter:image" content="{OG_IMAGE}">',
        '<link rel="manifest" href="/manifest.webmanifest">',
    ]


def render_block(article: dict, meta: dict, canonical: str) -> str:
    parts = [MARKER_BEGIN]
    parts.extend(build_og_meta(meta, canonical))
    parts.append('<script type="application/ld+json">')
    parts.append(json.dumps(article, ensure_ascii=False, indent=2))
    parts.append("</script>")
    parts.append(MARKER_END)
    return "\n".join(parts)


def patch_file(page: Path, dry: bool) -> tuple[bool, str]:
    rel = page.relative_to(ROOT)
    html = page.read_text(encoding="utf-8")
    meta = extract_meta(html)
    if not meta["title"]:
        return False, f"no <title>: {rel}"
    canonical = meta["canonical"] or f"https://www.nedabah.org/{rel}"
    article = build_article(meta, page)
    block = render_block(article, meta, canonical)
    pat = re.compile(re.escape(MARKER_BEGIN) + r".*?" + re.escape(MARKER_END), re.DOTALL)
    if pat.search(html):
        new_html = pat.sub(block, html)
    else:
        if "</head>" not in html:
            return False, f"no </head>: {rel}"
        new_html = html.replace("</head>", block + "\n</head>", 1)
    if new_html == html:
        return True, f"unchanged: {rel}"
    if dry:
        return True, f"would-patch: {rel}"
    page.write_text(new_html, encoding="utf-8")
    return True, f"patched: {rel}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0, help="process first N pages only")
    args = ap.parse_args()

    pages = sorted((ROOT / "magazine").glob("*/*/index.html"))
    if args.limit > 0:
        pages = pages[: args.limit]

    if not pages:
        print("no chapter pages found under magazine/*/*/index.html", file=sys.stderr)
        return 0

    rc = 0
    patched = 0
    unchanged = 0
    failed = 0
    for p in pages:
        ok, msg = patch_file(p, args.dry_run)
        if not ok:
            failed += 1
            rc = 1
            print(f"  [fail] {msg}")
        elif msg.startswith("unchanged"):
            unchanged += 1
        else:
            patched += 1
    label = "would-patch" if args.dry_run else "patched"
    print(f"\nTotal: {len(pages)}  {label}: {patched}  unchanged: {unchanged}  failed: {failed}")
    return rc


if __name__ == "__main__":
    sys.exit(main())
