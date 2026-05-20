#!/usr/bin/env python3
"""Inject WebApplication + Person JSON-LD into auto/<tool>/index.html.

The auto/ directory hosts interactive browser-side tools (kpi-comment,
lead-scoring, content-calendar, etc.). Each tool page currently ships with
zero structured data — Google cannot identify them as software, nor link
them to the creator (김창환) or publisher (네다바웨이).

This script:
1. Globs auto/*/index.html (skips auto/N.html redirect stubs)
2. Extracts title, description, canonical URL
3. Emits a WebApplication block with creator/publisher references that
   match the canonical Person + Organization @ids used site-wide

Idempotent. Marker block distinct from inject_schemas.py and
inject_magazine_articles.py.
"""
from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
MARKER_BEGIN = "<!-- BEGIN seo_patches: inject_auto_tools.py -->"
MARKER_END = "<!-- END seo_patches: inject_auto_tools.py -->"

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


def build_webapp(meta: dict, rel: str) -> dict:
    canonical = meta["canonical"] or f"https://www.nedabah.org/{rel}"
    name = (meta["title"] or "").split(" | ")[0].strip()
    return {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "@id": f"{canonical}#webapp",
        "name": name,
        "description": meta["description"] or "",
        "url": canonical,
        "applicationCategory": "ProductivityApplication",
        "operatingSystem": "Any",
        "browserRequirements": "Requires JavaScript. Modern browsers (Chrome, Safari, Firefox, Edge).",
        "isAccessibleForFree": True,
        "inLanguage": "ko-KR",
        "creator": {
            "@type": "Person",
            "@id": "https://www.nedabah.org/about.html#kim-changhwan",
            "name": "김창환",
            "url": "https://www.nedabah.org/about.html",
        },
        "publisher": {
            "@type": ["Organization", "EducationalOrganization"],
            "@id": "https://www.nedabah.org/#organization",
            "name": "네다바웨이",
        },
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "KRW",
        },
    }


def patch_file(page: Path, dry: bool) -> tuple[bool, str]:
    rel = page.relative_to(ROOT).as_posix()
    html = page.read_text(encoding="utf-8")
    meta = extract_meta(html)
    if not meta["title"]:
        return False, f"no <title>: {rel}"
    schema = build_webapp(meta, rel)
    block = "\n".join([
        MARKER_BEGIN,
        '<script type="application/ld+json">',
        json.dumps(schema, ensure_ascii=False, indent=2),
        "</script>",
        MARKER_END,
    ])
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

    pages = sorted((ROOT / "auto").glob("**/index.html"))
    if not pages:
        print("no auto/*/index.html pages found", file=sys.stderr)
        return 0

    rc = 0
    counts = {"patched": 0, "would-patch": 0, "unchanged": 0, "failed": 0}
    for p in pages:
        ok, msg = patch_file(p, args.dry_run)
        head = msg.split(":")[0]
        if not ok:
            counts["failed"] += 1
            rc = 1
            print(f"  [fail] {msg}")
        else:
            counts[head] = counts.get(head, 0) + 1
    print(f"\nTotal: {len(pages)}  " + "  ".join(f"{k}: {v}" for k, v in counts.items()))
    return rc


if __name__ == "__main__":
    sys.exit(main())
