#!/usr/bin/env python3
"""feed_public_split.py — feed.json → feed-public.json 분리 (2026-05-01, G3)

목적:
  - feed.json (전체 메타, internal 561건 포함) 외부 노출 위험 차단
  - 공개분만 추출한 feed-public.json을 git 추적 + 외부 노출
  - feed.json은 .gitignore에 등록 권장 (로컬·CEO 콘솔만)

생성 파일:
  - resources/_data/feed-public.json   ← visibility=public + 안전 필드만
  - resources/_data/feed.public.summary.json ← KPI·통계 (외부 노출 안전)

REQ-N-1·N-2 (SPEC-SEARCH-001):
  - internal·draft 자료 0건
  - 비공개 키워드 자동 검출 자료 추가 차단
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FEED = ROOT / "_data" / "feed.json"
PUBLIC_FEED = ROOT / "_data" / "feed-public.json"
SUMMARY = ROOT / "_data" / "feed.public.summary.json"

# 외부 노출 차단 필드 (있다면 출력에서 제거)
STRIP_FIELDS = {"qa_check", "source_dept", "internal_notes", "client_ref"}

# 비공개 키워드 (publisher.py와 동일)
PRIVATE_KEYWORDS = [
    "제주광역자활센터", "밥상사업단", "김지선",
    "견적", "수임료", "계약서", "단가",
    "HAG", "결제", "수익금", "₩", "원장",
]


def has_private_keyword(item: dict) -> str | None:
    text = " ".join(str(v) for v in [
        item.get("title", ""),
        item.get("summary", ""),
        " ".join(item.get("topics", []) or []),
        " ".join(item.get("audiences", []) or []),
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

    public_items: list[dict] = []
    excluded_internal = 0
    excluded_keyword = 0
    excluded_no_qa = 0

    for item in items:
        if item.get("visibility") != "public":
            excluded_internal += 1
            continue
        if not item.get("qa_passed"):
            excluded_no_qa += 1
            continue
        kw = has_private_keyword(item)
        if kw:
            excluded_keyword += 1
            print(f"⚠ 키워드 '{kw}' → {item.get('id')} 제외", file=sys.stderr)
            continue

        # 안전 필드만 복사
        clean = {k: v for k, v in item.items() if k not in STRIP_FIELDS}
        public_items.append(clean)

    # 공개 feed
    public_data = {
        "generated": datetime.now().strftime("%Y-%m-%d"),
        "schema_version": data.get("schema_version", "1.0"),
        "total": len(public_items),
        "items": public_items,
    }
    PUBLIC_FEED.write_text(
        json.dumps(public_data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    # 통계 요약 (KPI 노출 안전 영역)
    by_format: dict[str, int] = {}
    by_topic: dict[str, int] = {}
    for it in public_items:
        f = it.get("format", "")
        by_format[f] = by_format.get(f, 0) + 1
        for t in (it.get("topics") or []):
            by_topic[t] = by_topic.get(t, 0) + 1

    summary = {
        "generated": datetime.now().strftime("%Y-%m-%d"),
        "public_count": len(public_items),
        "by_format": by_format,
        "by_topic": dict(sorted(by_topic.items(), key=lambda x: -x[1])[:20]),
        "excluded": {
            "internal": excluded_internal,
            "no_qa": excluded_no_qa,
            "private_keyword": excluded_keyword,
        },
    }
    SUMMARY.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"✓ feed-public.json — {len(public_items)}건 (전체 {len(items)})")
    print(f"  internal {excluded_internal} / qa미통과 {excluded_no_qa} / 키워드 {excluded_keyword} 제외")
    return 0


if __name__ == "__main__":
    sys.exit(main())
