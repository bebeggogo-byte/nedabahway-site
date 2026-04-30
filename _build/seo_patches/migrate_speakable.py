#!/usr/bin/env python3
"""Speakable schema — 음성 검색·Google Assistant 인용 대상 표시.

각 관점 노트의 첫 단락을 speakable 영역으로 표시.
"""
from __future__ import annotations
import argparse
import re
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
PERSPECTIVE_DIR = ROOT / "blog" / "perspective"

MARKER_BEGIN = "<!-- BEGIN seo_patches: speakable -->"
MARKER_END = "<!-- END seo_patches: speakable -->"


def build_schema(url: str) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "url": url,
        "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": ["h1", ".lead", "article p:first-of-type", ".speakable"]
        }
    }


def patch_file(p: Path, dry: bool) -> str:
    html = p.read_text(encoding="utf-8")
    url = f"https://www.nedabah.org/blog/perspective/{p.name}"
    schema = build_schema(url)
    block = (
        f"{MARKER_BEGIN}\n"
        f'<script type="application/ld+json">\n'
        f"{json.dumps(schema, ensure_ascii=False, indent=2)}\n"
        f"</script>\n"
        f"{MARKER_END}"
    )
    pat = re.compile(re.escape(MARKER_BEGIN) + r".*?" + re.escape(MARKER_END), re.DOTALL)
    if pat.search(html):
        new_html = pat.sub(block, html)
    elif "</head>" in html:
        new_html = html.replace("</head>", block + "\n</head>", 1)
    else:
        return f"skip: {p.name}"
    if new_html == html:
        return f"unchanged: {p.name}"
    if dry:
        return f"would-patch: {p.name}"
    p.write_text(new_html, encoding="utf-8")
    return f"patched: {p.name}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
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
