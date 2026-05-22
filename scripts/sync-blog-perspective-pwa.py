#!/usr/bin/env python3
"""Add rel=manifest link to blog/perspective/*.html posts (PWA wiring).

Funnel S4 PWA gate requires every PUBLIC page to carry <link rel="manifest">.
102 perspective posts ship with valid JSON-LD + Person reference but no manifest.

NOTE on sitemap/public-pages: this script does NOT register the posts in
sitemap.xml or public-pages.txt. Those posts use <article>-only semantic
structure (no <main> or <header> landmarks), which would fail the Funnel S1
landmark gate if elevated to the public set. Adding manifest is a defensive
PWA wiring — once landmark refactor is done, a follow-up cycle can promote
the posts.

Idempotent: re-runs are no-ops when the marker block is already present.
"""
from __future__ import annotations
import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_TAG = '<link rel="manifest" href="/manifest.webmanifest">'
MARKER = "<!-- BEGIN seo_patches: blog_perspective_pwa -->"
END_MARKER = "<!-- END seo_patches: blog_perspective_pwa -->"


def inject_manifest(page: Path, dry: bool) -> tuple[bool, str]:
    rel = page.relative_to(ROOT).as_posix()
    html = page.read_text(encoding="utf-8")
    if MARKER in html:
        return True, f"unchanged (marker present): {rel}"
    if 'rel="manifest"' in html:
        return True, f"unchanged (manifest already): {rel}"
    if "</head>" not in html:
        return False, f"no </head>: {rel}"
    block = f"{MARKER}\n{MANIFEST_TAG}\n{END_MARKER}"
    new_html = html.replace("</head>", block + "\n</head>", 1)
    if dry:
        return True, f"would-patch: {rel}"
    page.write_text(new_html, encoding="utf-8")
    return True, f"patched: {rel}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    posts = sorted(
        p for p in (ROOT / "blog/perspective").glob("*.html") if p.name != "index.html"
    )
    if not posts:
        print("no blog/perspective posts found", file=sys.stderr)
        return 0

    patched = unchanged = failed = 0
    for p in posts:
        ok, msg = inject_manifest(p, args.dry_run)
        if not ok:
            failed += 1
            print(f"  [fail] {msg}")
        elif msg.startswith(("patched", "would-patch")):
            patched += 1
        else:
            unchanged += 1
    print(f"Total: {len(posts)}  patched: {patched}  unchanged: {unchanged}  failed: {failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
