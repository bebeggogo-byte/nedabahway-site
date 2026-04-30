#!/usr/bin/env python3
"""사이트 표준 메타 링크 자동 주입.

manifest, opensearch, RSS 자동 검색, alternate language 등 표준 메타 링크를
모든 핵심 페이지에 자동 추가.
"""
from __future__ import annotations
import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

PAGES = [
    "index.html",
    "about.html",
    "contact.html",
    "programs.html",
    "iden.html",
    "learning.html",
    "sbm.html",
    "blog/perspective/index.html",
    "resources/index.html",
    "lectures/index.html",
    "topics/index.html",
    "feeds/index.html",
    "timeline.html",
    "diagnosis.html",
    "book-excerpt.html",
]

MARKER_BEGIN = "<!-- BEGIN seo_patches: meta_links -->"
MARKER_END = "<!-- END seo_patches: meta_links -->"

META_LINKS = """<link rel="manifest" href="/manifest.webmanifest">
<link rel="search" type="application/opensearchdescription+xml" title="네다바웨이 검색" href="/opensearch.xml">
<link rel="alternate" type="application/rss+xml" title="관점 노트 RSS" href="/blog/perspective/feed.xml">
<link rel="alternate" type="application/atom+xml" title="관점 노트 Atom" href="/blog/perspective/feed.atom">
<link rel="alternate" type="application/feed+json" title="관점 노트 JSON Feed" href="/blog/perspective/feed.json">
<link rel="alternate" type="application/rss+xml" title="Still Hands RSS" href="/blog/feed.xml">
<link rel="me" href="https://www.linkedin.com/in/nedabah-way-3605413aa/">
<link rel="me" href="https://www.youtube.com/channel/UCWnbno58Hrtiu8fPjrCCTfQ">
<link rel="me" href="https://blog.naver.com/nedabah">
<link rel="author" href="/about.html">
<link rel="publisher" href="https://www.nedabah.org/">
<meta name="theme-color" content="#3a322a">
<meta name="application-name" content="네다바웨이">
<meta name="apple-mobile-web-app-title" content="네다바웨이">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">"""


def render_block() -> str:
    return f"{MARKER_BEGIN}\n{META_LINKS}\n{MARKER_END}"


def patch_file(target: str, dry: bool):
    fpath = ROOT / target
    if not fpath.exists():
        return False, f"missing: {target}"
    html = fpath.read_text(encoding="utf-8")
    block = render_block()
    pat = re.compile(re.escape(MARKER_BEGIN) + r".*?" + re.escape(MARKER_END), re.DOTALL)
    if pat.search(html):
        new_html = pat.sub(block, html)
    else:
        if "</head>" not in html:
            return False, f"no </head>: {target}"
        new_html = html.replace("</head>", block + "\n</head>", 1)
    if new_html == html:
        return True, f"unchanged: {target}"
    if dry:
        return True, f"would-patch: {target}"
    fpath.write_text(new_html, encoding="utf-8")
    return True, f"patched: {target}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    rc = 0
    for target in PAGES:
        ok, msg = patch_file(target, args.dry_run)
        print(("[ok] " if ok else "[fail] ") + msg)
        if not ok:
            rc = 1
    sys.exit(rc)


if __name__ == "__main__":
    main()
