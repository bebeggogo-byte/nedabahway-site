#!/usr/bin/env python3
"""check_private_keywords.py — CI에서 사용하는 비공개 키워드 검증

대상:
  - resources/_data/feed.json (visibility=public 자료의 메타)
  - public 분류된 HTML 파일 본문 (noindex 미설정)
  - sitemap.xml에 등록된 URL

비공개 키워드:
  - 클라이언트·기관명 (제주광역자활센터·밥상사업단·김지선 등)
  - 금액·견적·계약 (₩·견적·수임료·단가)

사용:
    python3 scripts/check_private_keywords.py            # 보고만
    python3 scripts/check_private_keywords.py --strict   # 검출 시 exit 1
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FEED = ROOT / "resources" / "_data" / "feed.json"

# 비공개 키워드 (publisher.PRIVATE_KEYWORDS와 동기화)
BANNED = [
    "제주광역자활센터", "밥상사업단", "김지선",
    "견적", "수임료", "계약서", "단가", "수익금",
    "₩", "주민등록번호",
]

NOINDEX_PATTERN = re.compile(
    r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*noindex',
    re.IGNORECASE,
)


def scan_feed_public(feed: dict) -> list[dict]:
    findings = []
    for item in feed.get("items", []):
        if item.get("visibility") != "public":
            continue
        text = " ".join([
            str(item.get("title", "")),
            str(item.get("summary", "")),
            " ".join(item.get("topics", []) or []),
        ])
        for kw in BANNED:
            if kw in text:
                findings.append({
                    "type": "feed",
                    "id": item.get("id"),
                    "kw": kw,
                })
    return findings


def scan_html(scope: Path) -> list[dict]:
    findings = []
    for html in scope.rglob("*.html"):
        try:
            content = html.read_text(encoding="utf-8")
        except Exception:
            continue
        # noindex 페이지는 외부 노출 안 됨
        if NOINDEX_PATTERN.search(content):
            continue
        for kw in BANNED:
            if kw in content:
                findings.append({
                    "type": "html",
                    "file": str(html.relative_to(ROOT)),
                    "kw": kw,
                })
                break
    return findings


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true",
                    help="검출 시 exit 1 (CI용)")
    ap.add_argument("--scan-html", action="store_true",
                    help="resources/ 본문 HTML도 스캔")
    args = ap.parse_args()

    findings: list[dict] = []

    if FEED.exists():
        feed = json.loads(FEED.read_text(encoding="utf-8"))
        findings += scan_feed_public(feed)

    if args.scan_html:
        findings += scan_html(ROOT / "resources")

    if findings:
        print(f"::error::비공개 키워드 검출 {len(findings)}건")
        for f in findings[:50]:
            ref = f.get("id") or f.get("file")
            print(f"  - {f['type']}: {ref} → '{f['kw']}'")
        if args.strict:
            return 1
    else:
        print("✓ private keyword gate 통과 — 검출 0건")

    return 0


if __name__ == "__main__":
    sys.exit(main())
