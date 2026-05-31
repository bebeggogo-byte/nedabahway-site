"""Map a seed to its Naver category (business-funnel taxonomy) + tray folder.

Used by the daily organizer so each generated post lands in
naver_ready/<folder>/<slug>/naver.html, ready for manual paste into the
matching Naver blog category. Categories are organized by buyer segment and
conversion goal (see naver_categories.json), so each post funnels toward a
specific revenue line.

Routing precedence:
  1. seed['series'] or plan_id series (e.g. "A2-001" -> "A2") -> category.series
  2. seed['cluster'] (Obsidian-mined: 진로교육|AI리터러시|리더십|HRD|자기계발|코칭) -> category.clusters
  3. default category (BRAND / 관점 노트)

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
    default = next((c for c in cats if c.get("default")), cats[0])

    # 1. series match (plan-driven seeds): seed['series'] or plan_id prefix "A2-001" -> "A2"
    series = (seed.get("series") or "").strip().upper()
    if not series:
        plan_id = (seed.get("plan_id") or "").strip().upper()
        if "-" in plan_id:
            series = plan_id.split("-", 1)[0]
    if series:
        for c in cats:
            if series in [s.upper() for s in c.get("series", [])]:
                return c

    # 2. cluster match (Obsidian-mined seeds)
    cluster = (seed.get("cluster") or "").strip()
    if cluster:
        for c in cats:
            if cluster in c.get("clusters", []):
                return c

    # 3. default
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
