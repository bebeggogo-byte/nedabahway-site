#!/usr/bin/env python3
"""resources/_data/feed.json 검증 — 발행 전 게이트.

- 스키마 일치
- id 중복 없음
- url 파일 실재 (visibility=public/internal)
- visibility=public이면 qa_passed=true 강제
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # resources/
SITE_ROOT = ROOT.parent  # nedabahway-site/
FEED = ROOT / "_data" / "feed.json"

VALID_FORMATS = {"wks", "tpl", "evd", "prm", "dgn", "gid", "crt", "med"}
VALID_VIS = {"public", "internal", "draft"}


def fail(msg: str) -> None:
    print(f"✗ {msg}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    if not FEED.exists():
        fail(f"feed.json 없음: {FEED}")

    data = json.loads(FEED.read_text(encoding="utf-8"))
    items = data.get("items", [])
    seen_ids: set[str] = set()
    errors: list[str] = []

    for i, item in enumerate(items):
        prefix = f"item[{i}] {item.get('id', '<no-id>')}"

        for key in ("id", "format", "visibility", "title", "summary", "version", "published", "url", "qa_passed"):
            if key not in item:
                errors.append(f"{prefix}: 필수키 누락 '{key}'")

        if item.get("format") not in VALID_FORMATS:
            errors.append(f"{prefix}: format 부적합 '{item.get('format')}'")

        if item.get("visibility") not in VALID_VIS:
            errors.append(f"{prefix}: visibility 부적합 '{item.get('visibility')}'")

        item_id = item.get("id", "")
        if item_id in seen_ids:
            errors.append(f"{prefix}: id 중복")
        seen_ids.add(item_id)

        if item.get("visibility") == "public" and not item.get("qa_passed"):
            errors.append(f"{prefix}: public인데 qa_passed=false")

        url = item.get("url", "")
        if url.startswith("/") and item.get("visibility") in ("public", "internal"):
            file_path = SITE_ROOT / url.lstrip("/")
            if not file_path.exists():
                errors.append(f"{prefix}: url 파일 실재하지 않음 {file_path}")

    if errors:
        for e in errors:
            print(f"✗ {e}", file=sys.stderr)
        print(f"\n검증 실패: {len(errors)}건", file=sys.stderr)
        sys.exit(1)

    print(f"✓ feed.json 검증 통과 — {len(items)}건")


if __name__ == "__main__":
    main()
