#!/usr/bin/env python3
"""관점 노트 100편에 BlogPosting schema 자동 주입 — 일괄 마이그레이션.

대상: blog/perspective/*.html (index.html 제외)
방식: 각 파일에 marker 블록을 두고 BlogPosting JSON-LD 1건 삽입.
멱등(idempotent) — 여러 번 실행해도 결과 동일.

사용:
    python3 _build/seo_patches/migrate_blogposting.py            # 적용
    python3 _build/seo_patches/migrate_blogposting.py --dry-run  # 미리보기

생성: 2026-05-01
"""
from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent.parent
PERSPECTIVE_DIR = ROOT / "blog" / "perspective"

MARKER_BEGIN = "<!-- BEGIN seo_patches: blogposting -->"
MARKER_END = "<!-- END seo_patches: blogposting -->"

DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")
TITLE_RE = re.compile(r"<title>\s*([^<]+?)\s*</title>", re.IGNORECASE)
DESC_RE = re.compile(r'<meta\s+name="description"\s+content="([^"]+)"', re.IGNORECASE)
CANONICAL_RE = re.compile(r'<link\s+rel="canonical"\s+href="([^"]+)"', re.IGNORECASE)
OG_IMAGE_RE = re.compile(r'<meta\s+property="og:image"\s+content="([^"]+)"', re.IGNORECASE)


def extract_meta(html: str, fname: str) -> dict:
    title_m = TITLE_RE.search(html)
    title = title_m.group(1) if title_m else fname
    title = re.split(r"[—|·\|]", title, maxsplit=1)[0].strip() or fname

    desc_m = DESC_RE.search(html)
    desc = desc_m.group(1) if desc_m else ""

    canon_m = CANONICAL_RE.search(html)
    url = canon_m.group(1) if canon_m else f"https://www.nedabah.org/blog/perspective/{fname}"

    img_m = OG_IMAGE_RE.search(html)
    image = img_m.group(1) if img_m else "https://www.nedabah.org/assets/og-default.svg"

    date_m = DATE_RE.search(fname)
    if date_m:
        date_str = date_m.group(1)
    else:
        date_str = datetime.now().strftime("%Y-%m-%d")

    return {
        "title": title,
        "description": desc[:300],
        "url": url,
        "image": image,
        "date": date_str,
    }


def build_schema(meta: dict) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": meta["title"],
        "description": meta["description"],
        "datePublished": meta["date"],
        "dateModified": meta["date"],
        "author": {
            "@type": "Person",
            "@id": "https://www.nedabah.org/about.html#kim-changhwan",
            "name": "김창환",
            "alternateName": "Kim Changhwan",
            "url": "https://www.nedabah.org/about.html",
        },
        "publisher": {
            "@type": "Organization",
            "@id": "https://www.nedabah.org/#organization",
            "name": "네다바웨이",
            "alternateName": "Nedabahway",
            "url": "https://www.nedabah.org",
            "logo": {
                "@type": "ImageObject",
                "url": "https://www.nedabah.org/assets/og-default.svg",
            },
        },
        "mainEntityOfPage": meta["url"],
        "url": meta["url"],
        "image": meta["image"],
        "inLanguage": "ko-KR",
        "isPartOf": {
            "@type": "Blog",
            "name": "관점 노트 — 네다바웨이",
            "url": "https://www.nedabah.org/blog/perspective/",
        },
    }


def patch_file(p: Path, dry: bool) -> str:
    html = p.read_text(encoding="utf-8")
    meta = extract_meta(html, p.name)
    schema = build_schema(meta)
    block = (
        f"{MARKER_BEGIN}\n"
        f'<script type="application/ld+json">\n'
        f"{json.dumps(schema, ensure_ascii=False, indent=2)}\n"
        f"</script>\n"
        f"{MARKER_END}"
    )

    pat = re.compile(
        re.escape(MARKER_BEGIN) + r".*?" + re.escape(MARKER_END),
        re.DOTALL,
    )
    if pat.search(html):
        new_html = pat.sub(block, html)
    else:
        if "</head>" not in html:
            return f"no </head>: {p.name}"
        new_html = html.replace("</head>", block + "\n</head>", 1)

    if new_html == html:
        return f"unchanged: {p.name}"
    if dry:
        return f"would-patch: {p.name} ({meta['date']})"
    p.write_text(new_html, encoding="utf-8")
    return f"patched: {p.name} ({meta['date']})"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not PERSPECTIVE_DIR.exists():
        print(f"[fail] missing dir: {PERSPECTIVE_DIR}")
        sys.exit(1)

    files = sorted(PERSPECTIVE_DIR.glob("*.html"))
    files = [f for f in files if f.name != "index.html"]
    print(f"target files: {len(files)}")

    patched = 0
    for f in files:
        msg = patch_file(f, args.dry_run)
        print("  " + msg)
        if msg.startswith("patched") or msg.startswith("would-patch"):
            patched += 1
    print(f"---\ntotal: {patched}/{len(files)}")


if __name__ == "__main__":
    main()
