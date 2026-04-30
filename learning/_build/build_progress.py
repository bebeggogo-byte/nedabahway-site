#!/usr/bin/env python3
"""build_progress.py — notes.json → progress.json 자동 재생성 (2026-05-01)

learning.html이 기대하는 스키마 v2:
{
  "total_entries":    int,
  "coords_filled":    int,
  "matrix_total":     int,
  "sar_percent":      float,
  "updated":          ISO,
  "by_category": {
    "<cat_id>": {
      "count":     글 수,
      "score":     가중 점수 (단계 1·2=1점·3·4=2점·5·6=3점),
      "stages":    {<stage_id>: <max rotation 채움>},
      "rotations": {<rotation>: True}
    }
  }
}

사용:
  python3 learning/_build/build_progress.py
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # learning/
SITE = ROOT.parent  # nedabahway-site/
NOTES = ROOT / "_data" / "notes.json"
PROGRESS = ROOT / "_data" / "progress.json"
CATS = ROOT / "_data" / "categories.json"

# 가중치 (STRATEGY_v1 §2)
STAGE_WEIGHT = {1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3}
MAX_STAGE = 6
MAX_ROTATION = 5  # STRATEGY_v1 §2: 5회전


def load_notes() -> list[dict]:
    if not NOTES.exists():
        return []
    data = json.loads(NOTES.read_text(encoding="utf-8"))
    return data.get("entries") or data.get("items") or []


def load_categories() -> list[dict]:
    if not CATS.exists():
        return []
    return json.loads(CATS.read_text(encoding="utf-8")).get("categories", [])


def main() -> int:
    entries = load_notes()
    cats = load_categories()
    matrix_total = len(cats) * MAX_STAGE * MAX_ROTATION  # 44 × 6 × 5 = 1320

    # by_category 집계
    by_cat: dict[int, dict] = defaultdict(
        lambda: {"count": 0, "score": 0, "stages": {}, "rotations": {}}
    )

    coords_filled_set = set()  # (cat_id, stage, rotation) — 중복 제거

    for e in entries:
        if e.get("visibility", "public") != "public":
            continue

        cat_id = e.get("category_id")
        if cat_id is None:
            continue

        stage_id = int(e.get("stage_id", 1))
        rotation = int(e.get("rotation", 1))
        if stage_id < 1 or stage_id > MAX_STAGE:
            stage_id = 1
        if rotation < 1 or rotation > MAX_ROTATION:
            rotation = 1

        stat = by_cat[cat_id]
        stat["count"] += 1
        stat["score"] += STAGE_WEIGHT.get(stage_id, 1)

        # stages: {stage: max rotation}
        prev = stat["stages"].get(str(stage_id), 0)
        if rotation > prev:
            stat["stages"][str(stage_id)] = rotation

        # rotations: {rotation: True}
        stat["rotations"][str(rotation)] = True

        # coord (cat_id, stage, rotation) 채움 합집합
        coords_filled_set.add((cat_id, stage_id, rotation))

    coords_filled = len(coords_filled_set)
    sar_percent = round(coords_filled / matrix_total * 100, 2) if matrix_total else 0

    # by_category 키를 문자열로 (learning.html이 String(c.id) 사용)
    by_category = {str(k): v for k, v in by_cat.items()}

    progress = {
        "schema_version": "2.0",
        "updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "target": 100,
        "current": len(entries),
        "total_entries": len(entries),
        "coords_filled": coords_filled,
        "matrix_total": matrix_total,
        "sar_percent": sar_percent,
        "by_category": by_category,
    }

    PROGRESS.write_text(json.dumps(progress, ensure_ascii=False, indent=2), encoding="utf-8")

    # 보고
    print(f"✓ progress.json 재생성")
    print(f"  total_entries:  {progress['total_entries']}")
    print(f"  coords_filled:  {coords_filled} / {matrix_total}")
    print(f"  sar_percent:    {sar_percent}%")
    print(f"  by_category:    {len(by_category)} 카테고리 채움")
    return 0


if __name__ == "__main__":
    sys.exit(main())
