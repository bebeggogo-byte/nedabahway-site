#!/usr/bin/env python3
"""Inject search-engine site-verification meta tags into index.html.

Usage:
    # After registering at https://searchadvisor.naver.com/
    python3 scripts/add-search-engine-verification.py naver <CONTENT-CODE>

    # After registering at https://webmaster.kakao.com/
    python3 scripts/add-search-engine-verification.py daum <CONTENT-CODE>

    # Bing Webmaster Tools (https://www.bing.com/webmasters/)
    python3 scripts/add-search-engine-verification.py bing <CONTENT-CODE>

    # Yandex (https://webmaster.yandex.com/)
    python3 scripts/add-search-engine-verification.py yandex <CONTENT-CODE>

Idempotent: re-running with same provider replaces the existing tag rather than
duplicating. Removes the tag with `--remove`.

The verification tag is inserted next to the existing google-site-verification
tag in index.html (and only index.html — verifying the root is sufficient for
all major search engines).
"""
from __future__ import annotations
import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "index.html"

PROVIDER_META_NAME = {
    "naver": "naver-site-verification",
    "daum": "daum-site-verification",
    "bing": "msvalidate.01",
    "yandex": "yandex-verification",
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("provider", choices=sorted(PROVIDER_META_NAME.keys()))
    ap.add_argument("code", nargs="?", help="verification content code from the provider")
    ap.add_argument("--remove", action="store_true", help="remove the tag instead of adding")
    args = ap.parse_args()

    meta_name = PROVIDER_META_NAME[args.provider]
    if not args.remove and not args.code:
        ap.error("code is required when not using --remove")

    if not TARGET.exists():
        print(f"missing: {TARGET}", file=sys.stderr)
        return 2

    html = TARGET.read_text(encoding="utf-8")

    pattern = re.compile(
        rf'<meta name="{re.escape(meta_name)}" content="[^"]*"\s*/?>\s*\n?',
        re.IGNORECASE,
    )

    if args.remove:
        new_html, n = pattern.subn("", html)
        if n == 0:
            print(f"no {meta_name} tag found")
            return 0
        TARGET.write_text(new_html, encoding="utf-8")
        print(f"removed {n} occurrence(s) of {meta_name}")
        return 0

    new_tag = f'<meta name="{meta_name}" content="{args.code}" />\n'
    if pattern.search(html):
        new_html = pattern.sub(new_tag, html, count=1)
        action = "updated"
    else:
        anchor = re.compile(r'(<meta name="google-site-verification"[^>]*>\s*\n?)', re.IGNORECASE)
        m = anchor.search(html)
        if m:
            insert_at = m.end()
            new_html = html[:insert_at] + new_tag + html[insert_at:]
            action = "inserted (after google-site-verification)"
        else:
            head_close = html.find("</head>")
            if head_close < 0:
                print("no </head> found", file=sys.stderr)
                return 2
            new_html = html[:head_close] + new_tag + html[head_close:]
            action = "inserted (before </head>)"

    if new_html == html:
        print("no change")
        return 0
    TARGET.write_text(new_html, encoding="utf-8")
    print(f"{action}: {meta_name} = {args.code}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
