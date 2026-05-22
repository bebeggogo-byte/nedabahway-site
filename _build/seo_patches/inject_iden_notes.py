#!/usr/bin/env python3
"""Inject Article + Person + OG/Twitter meta into iden/notes/*.html.

IDEN notes are the brand's core essays on 직업의 이타성 (vocational altruism).
All 5 pages are in sitemap.xml but ship with zero structured data, so Google
cannot identify them as articles authored by 김창환 or link them to the
IDEN body of work.

Pattern follows _build/seo_patches/inject_magazine_articles.py — same marker
block discipline, distinct marker name to prevent script interference.
"""
from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
MARKER_BEGIN = "<!-- BEGIN seo_patches: inject_iden_notes.py -->"
MARKER_END = "<!-- END seo_patches: inject_iden_notes.py -->"
OG_IMAGE = "https://www.nedabah.org/assets/og-iden.svg"

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


def _esc(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def build_article(meta: dict, canonical: str) -> dict:
    headline = (meta["title"] or "").split(" · ")[0].strip()
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
            "@type": "CreativeWorkSeries",
            "@id": "https://www.nedabah.org/iden.html#series",
            "name": "IDEN — 직업의 이타성",
            "url": "https://www.nedabah.org/iden.html",
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
        "about": {
            "@type": "Thing",
            "name": "직업의 이타성",
            "description": "직업의 본질을 이타성으로 재정의하는 IDEN 사상 연구",
        },
    }


def build_og_meta(meta: dict, canonical: str) -> list[str]:
    headline = (meta["title"] or "").split(" · ")[0].strip()
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
    rel = page.relative_to(ROOT).as_posix()
    html = page.read_text(encoding="utf-8")
    meta = extract_meta(html)
    if not meta["title"]:
        return False, f"no <title>: {rel}"
    canonical = meta["canonical"] or f"https://www.nedabah.org/{rel}"
    article = build_article(meta, canonical)
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
    args = ap.parse_args()

    pages = sorted((ROOT / "iden" / "notes").glob("*.html"))
    if not pages:
        print("no iden/notes/*.html pages found", file=sys.stderr)
        return 0

    rc = 0
    for p in pages:
        ok, msg = patch_file(p, args.dry_run)
        print(("[ok] " if ok else "[fail] ") + msg)
        if not ok:
            rc = 1
    return rc


if __name__ == "__main__":
    sys.exit(main())
