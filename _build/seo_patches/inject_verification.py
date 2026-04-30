#!/usr/bin/env python3
"""검색엔진 사이트 인증 메타 태그 자동 주입.

verification_tags.json의 값이 채워지면 자동으로 <head>에 추가.
빈 값은 무시.

사용:
    python3 _build/seo_patches/inject_verification.py
"""
from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
PATCH_DIR = Path(__file__).resolve().parent
TAG_FILE = PATCH_DIR / "verification_tags.json"

PAGES = ["index.html", "about.html", "blog/perspective/index.html"]

MARKER_BEGIN = "<!-- BEGIN seo_patches: verification -->"
MARKER_END = "<!-- END seo_patches: verification -->"

META_NAMES = {
    "google_site_verification": "google-site-verification",
    "naver_site_verification": "naver-site-verification",
    "bing_site_verification": "msvalidate.01",
    "facebook_domain_verification": "facebook-domain-verification",
    "pinterest_site_verification": "p:domain_verify",
}


def load_tags() -> dict:
    if not TAG_FILE.exists():
        return {}
    return json.loads(TAG_FILE.read_text(encoding="utf-8"))


def render_block(tags: dict) -> str:
    parts = [MARKER_BEGIN]
    for k, name in META_NAMES.items():
        v = tags.get(k)
        if v and not v.startswith("_") and v.strip():
            parts.append(f'<meta name="{name}" content="{v}">')
    parts.append(MARKER_END)
    if len(parts) <= 2:
        return ""
    return "\n".join(parts)


def patch_file(target: str, block: str, dry: bool):
    fpath = ROOT / target
    if not fpath.exists():
        return False, f"missing: {target}"
    html = fpath.read_text(encoding="utf-8")
    pat = re.compile(re.escape(MARKER_BEGIN) + r".*?" + re.escape(MARKER_END), re.DOTALL)

    if not block:
        # 모든 인증값이 비어있으면 기존 marker 블록 제거
        if pat.search(html):
            new_html = pat.sub("", html)
        else:
            return True, f"no-tags: {target}"
    else:
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
    tags = load_tags()
    block = render_block(tags)
    if not block:
        print("(no verification tags filled — skipping injection. Fill verification_tags.json to activate.)")
    rc = 0
    for target in PAGES:
        ok, msg = patch_file(target, block, args.dry_run)
        print(("[ok] " if ok else "[fail] ") + msg)
        if not ok:
            rc = 1
    sys.exit(rc)


if __name__ == "__main__":
    main()
