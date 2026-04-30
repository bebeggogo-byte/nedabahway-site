#!/usr/bin/env python3
"""BlogPosting schema v2 마이그레이션 — author.sameAs 추가.

v1(migrate_blogposting.py)이 이미 박은 marker 블록을 v2 marker로 교체.
author 객체에 sameAs 배열 추가 (LinkedIn + YouTube + Naver Blog).
멱등 — 여러 번 실행해도 결과 동일.

사용:
    python3 _build/seo_patches/migrate_blogposting_v2.py            # 적용
    python3 _build/seo_patches/migrate_blogposting_v2.py --dry-run

생성: 2026-05-01 (LinkedIn URL 추가에 따른 v2)
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

# v1 marker (제거 대상)
V1_BEGIN = "<!-- BEGIN seo_patches: blogposting -->"
V1_END = "<!-- END seo_patches: blogposting -->"
# v2 marker (이번에 새로 박는다)
V2_BEGIN = "<!-- BEGIN seo_patches: blogposting v2 -->"
V2_END = "<!-- END seo_patches: blogposting v2 -->"

DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")
TITLE_RE = re.compile(r"<title>\s*([^<]+?)\s*</title>", re.IGNORECASE)
DESC_RE = re.compile(r'<meta\s+name="description"\s+content="([^"]+)"', re.IGNORECASE)
CANONICAL_RE = re.compile(r'<link\s+rel="canonical"\s+href="([^"]+)"', re.IGNORECASE)
OG_IMAGE_RE = re.compile(r'<meta\s+property="og:image"\s+content="([^"]+)"', re.IGNORECASE)

AUTHOR_SAMEAS = [
    "https://www.linkedin.com/in/nedabah-way-3605413aa/",
    "https://www.youtube.com/channel/UCWnbno58Hrtiu8fPjrCCTfQ",
    "https://blog.naver.com/nedabah",
]


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
    date_str = date_m.group(1) if date_m else datetime.now().strftime("%Y-%m-%d")

    return {"title": title, "description": desc[:300], "url": url, "image": image, "date": date_str}


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
            "sameAs": AUTHOR_SAMEAS,
        },
        "publisher": {
            "@type": "Organization",
            "@id": "https://www.nedabah.org/#organization",
            "name": "네다바웨이",
            "alternateName": "Nedabahway",
            "url": "https://www.nedabah.org",
            "logo": {"@type": "ImageObject", "url": "https://www.nedabah.org/assets/og-default.svg"},
            "sameAs": AUTHOR_SAMEAS,
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
        f"{V2_BEGIN}\n"
        f'<script type="application/ld+json">\n'
        f"{json.dumps(schema, ensure_ascii=False, indent=2)}\n"
        f"</script>\n"
        f"{V2_END}"
    )

    # v1 마커 제거
    pat_v1 = re.compile(re.escape(V1_BEGIN) + r".*?" + re.escape(V1_END), re.DOTALL)
    html = pat_v1.sub("", html)
    # v2 마커 교체 또는 추가
    pat_v2 = re.compile(re.escape(V2_BEGIN) + r".*?" + re.escape(V2_END), re.DOTALL)
    if pat_v2.search(html):
        new_html = pat_v2.sub(block, html)
    else:
        if "</head>" not in html:
            return f"no </head>: {p.name}"
        new_html = html.replace("</head>", block + "\n</head>", 1)

    if new_html == p.read_text(encoding="utf-8"):
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

    files = [f for f in sorted(PERSPECTIVE_DIR.glob("*.html")) if f.name != "index.html"]
    print(f"target files: {len(files)}")

    patched = 0
    for f in files:
        msg = patch_file(f, args.dry_run)
        if msg.startswith("patched") or msg.startswith("would-patch"):
            patched += 1
    print(f"---\ntotal: {patched}/{len(files)}")


if __name__ == "__main__":
    main()
