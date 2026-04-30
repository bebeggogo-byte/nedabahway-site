#!/usr/bin/env python3
"""search_index_builder.py — 자료실 검색 인덱스 빌더 (SPEC-SEARCH-001 M1·M2)

resources/_data/feed.json 의 visibility=public 자료만 추출하여
resources/_data/search-index.json 생성.

REQ-U-1: internal·draft 자료 0건 보장
REQ-N-1·N-2: 비공개 키워드 자동 검출 차단
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FEED = ROOT / "_data" / "feed.json"
INDEX = ROOT / "_data" / "search-index.json"

PRIVATE_KEYWORDS = [
    "제주광역자활센터", "밥상사업단", "김지선",
    "견적", "수임료", "계약서", "단가",
    "HAG", "결제", "수익금", "₩",
]


def hangul_to_jamo(s: str) -> str:
    """한글 문자열을 자모 시퀀스로 분해 (간이)."""
    CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
    out = []
    for ch in s:
        code = ord(ch)
        if 0xAC00 <= code <= 0xD7A3:
            base = code - 0xAC00
            cho = base // (21 * 28)
            out.append(CHO[cho])
        else:
            out.append(ch.lower())
    return "".join(out)


def has_private_keyword(item: dict) -> str | None:
    text = " ".join([
        item.get("title", ""),
        item.get("summary", ""),
        " ".join(item.get("topics", [])),
    ])
    for kw in PRIVATE_KEYWORDS:
        if kw in text:
            return kw
    return None


def main() -> int:
    if not FEED.exists():
        print(f"feed.json 없음: {FEED}", file=sys.stderr)
        return 1

    data = json.loads(FEED.read_text(encoding="utf-8"))
    items = data.get("items", [])

    indexed: list[dict] = []
    excluded_internal = 0
    excluded_keyword = 0

    for item in items:
        if item.get("visibility") != "public":
            excluded_internal += 1
            continue
        kw = has_private_keyword(item)
        if kw:
            excluded_keyword += 1
            print(f"⚠ 비공개 키워드 '{kw}' 검출 → 인덱싱 제외: {item.get('id')}", file=sys.stderr)
            continue

        title = item.get("title", "")
        summary = item.get("summary", "")
        search_text = f"{title} {summary} {' '.join(item.get('topics', []))} {' '.join(item.get('audiences', []))}"
        jamo = hangul_to_jamo(search_text)

        indexed.append({
            "id": item.get("id"),
            "title": title,
            "summary": summary,
            "format": item.get("format"),
            "topics": item.get("topics", []),
            "audiences": item.get("audiences", []),
            "published": item.get("published"),
            "url": item.get("url"),
            "_search_text": f"{search_text} {jamo}".lower(),
        })

    output = {
        "generated": data.get("generated", ""),
        "schema_version": "1.0",
        "total_indexed": len(indexed),
        "excluded_internal": excluded_internal,
        "excluded_keyword": excluded_keyword,
        "items": indexed,
    }

    INDEX.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    size_kb = INDEX.stat().st_size / 1024
    print(f"✓ search-index.json 생성 — {len(indexed)}건 ({size_kb:.1f} KB)")
    print(f"  internal 제외 {excluded_internal}건 / 키워드 제외 {excluded_keyword}건")
    return 0


if __name__ == "__main__":
    sys.exit(main())
