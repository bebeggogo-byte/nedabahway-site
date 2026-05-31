"""Map a seed to its Naver category + output tray folder.

Used by the daily organizer so each generated post lands in
naver_ready/<folder>/<slug>/naver.html, ready for manual paste into the
matching Naver blog category.

Routing precedence:
  1. seed['pillar'] (plan-driven seeds carry A..F/R)
  2. plan id prefix in seed['plan_id'] (e.g. "C1-001" -> "C")
  3. seed['cluster'] (Obsidian-mined seeds: 진로교육|AI리터러시|리더십|HRD|자기계발|코칭)
  4. default category (R / 관점 노트)

Standalone:
    python3 tools/blog_auto_500/categorize.py <seed.json>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

_CATS_PATH = Path(__file__).resolve().parent / "naver_categories.json"


def _load_categories() -> list[dict]:
    return json.loads(_CATS_PATH.read_text(encoding="utf-8"))["categories"]


def categorize(seed: dict) -> dict:
    """Return the category record {key, folder, naver_category, ...} for a seed."""
    cats = _load_categories()
    by_key = {c["key"]: c for c in cats}
    default = next((c for c in cats if c.get("default")), cats[-1])

    # 1. explicit pillar
    pillar = (seed.get("pillar") or "").strip().upper()
    if pillar in by_key:
        return by_key[pillar]

    # 2. plan id prefix (e.g. "C1-001" -> "C")
    plan_id = seed.get("plan_id") or ""
    if plan_id and plan_id[0].upper() in by_key:
        return by_key[plan_id[0].upper()]

    # 3. cluster match
    cluster = (seed.get("cluster") or "").strip()
    if cluster:
        for c in cats:
            if cluster in c.get("clusters", []):
                return c

    # 4. default
    return default


def target_dir(seed: dict, *, tray_root: Path) -> Path:
    """naver_ready/<folder>/<slug>/ for this seed."""
    cat = categorize(seed)
    return tray_root / cat["folder"] / seed.get("slug", "untitled")


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("usage: python3 categorize.py <seed.json>")
        return 2
    seed = json.loads(Path(argv[1]).read_text(encoding="utf-8"))
    cat = categorize(seed)
    print(json.dumps(cat, ensure_ascii=False, indent=2))
    print(f"\n→ 네이버 카테고리: {cat['naver_category']}  ·  폴더: naver_ready/{cat['folder']}/")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
