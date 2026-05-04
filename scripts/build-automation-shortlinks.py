#!/usr/bin/env python3
"""Generate short-URL redirect HTML files at /auto/{1..9}.html.

Each redirects to its corresponding guide page using meta-refresh and
location.replace fallback. Sources of truth: the CARDS dict in
build-automation-pages.py.

Usage: python3 scripts/build-automation-shortlinks.py
"""
from __future__ import annotations

import sys
from pathlib import Path

# Reuse CARDS metadata from sibling build script.
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from automation_meta import CARDS  # type: ignore  # noqa: E402

AUTO_DIR = ROOT / "auto"

TPL = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title} — 자동화 9선 | 네다바웨이</title>
<meta http-equiv="refresh" content="0; url={target}">
<link rel="canonical" href="https://www.nedabah.org{target}">
<meta name="robots" content="noindex,follow">
<meta property="og:title" content="{title} — 자동화 9선">
<meta property="og:description" content="{summary}">
<meta property="og:url" content="https://www.nedabah.org{target}">
<meta property="og:image" content="https://www.nedabah.org/assets/og-automation-9.svg">
<meta property="og:locale" content="ko_KR">
<script>location.replace('{target}');</script>
</head>
<body style="font-family:system-ui,-apple-system,'Noto Sans KR',sans-serif;text-align:center;padding:3rem 1.5rem;color:#3a322a;">
<p>{title} 가이드로 이동합니다…</p>
<p><a href="{target}">자동으로 이동되지 않으면 여기를 누르세요 →</a></p>
</body>
</html>
"""


def main() -> None:
    AUTO_DIR.mkdir(exist_ok=True)
    for slug, meta in CARDS.items():
        sid = meta["short_id"]
        target = f"/resources/automation/{slug}.html"
        page = TPL.format(title=meta["title"], summary=meta["summary"], target=target)
        (AUTO_DIR / f"{sid}.html").write_text(page, encoding="utf-8")
        print(f"WROTE auto/{sid}.html → {target}")


if __name__ == "__main__":
    main()
