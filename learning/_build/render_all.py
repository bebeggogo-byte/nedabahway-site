#!/usr/bin/env python3
"""학습페이지 빌더 — 1회 호출로 인덱스·카테고리·단계 페이지·진척도 데이터 자동 재생성.

SSoT: learning/_data/notes.json
인풋: categories.json·stages.json·notes.json
출력:
  - learning/index.html (40카테고리 매트릭스, 자동 갱신)
  - learning/notes/{slug}.html (entry 1건당 1페이지)
  - learning/_data/progress.json (KPI 누적)
  - sitemap 자동 패치 (선택)
"""
from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent      # learning/
SITE = ROOT.parent                                  # nedabahway-site/
DATA = ROOT / "_data"
NOTES_DIR = ROOT / "notes"
NOTES_DIR.mkdir(parents=True, exist_ok=True)

CATEGORIES = json.loads((DATA / "categories.json").read_text(encoding="utf-8"))
STAGES = json.loads((DATA / "stages.json").read_text(encoding="utf-8"))
NOTES = json.loads((DATA / "notes.json").read_text(encoding="utf-8"))


def compute_progress():
    """카테고리·기둥·단계별 누적 통계 산출."""
    by_cat = defaultdict(lambda: {"count": 0, "score": 0, "stages": defaultdict(int), "rotations": defaultdict(int)})
    by_pillar = defaultdict(lambda: {"count": 0, "score": 0})
    by_giant = defaultdict(int)
    coords_filled = set()  # (category_id, stage_id, rotation)

    weight_map = {s["id"]: s["weight"] for s in STAGES["steps"]}

    for n in NOTES["entries"]:
        cid = n["category_id"]
        pid = n["pillar_id"]
        sid = n["stage_id"]
        rot = n["rotation"]
        w = weight_map.get(sid, 1)

        by_cat[cid]["count"] += 1
        by_cat[cid]["score"] += w
        by_cat[cid]["stages"][sid] += 1
        by_cat[cid]["rotations"][rot] += 1

        by_pillar[pid]["count"] += 1
        by_pillar[pid]["score"] += w

        if n.get("giant_id"):
            by_giant[n["giant_id"]] += 1

        coords_filled.add((cid, sid, rot))

    total_categories = len(CATEGORIES["categories"])
    total_coords = total_categories * 30
    sar = (len(coords_filled) / total_coords) * 100 if total_coords else 0

    progress = {
        "updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "total_entries": len(NOTES["entries"]),
        "coords_filled": len(coords_filled),
        "matrix_total": total_coords,
        "sar_percent": round(sar, 2),
        "by_category": {str(k): {"count": v["count"], "score": v["score"], "stages": dict(v["stages"]), "rotations": dict(v["rotations"])} for k, v in by_cat.items()},
        "by_pillar": {str(k): v for k, v in by_pillar.items()},
        "by_giant": dict(by_giant),
    }
    (DATA / "progress.json").write_text(json.dumps(progress, ensure_ascii=False, indent=2), encoding="utf-8")
    return progress


def render_note_page(entry: dict) -> str:
    """학습 entry 1건 → HTML 페이지."""
    cat = next((c for c in CATEGORIES["categories"] if c["id"] == entry["category_id"]), None)
    pillar = next((p for p in CATEGORIES["pillars"] if p["id"] == entry["pillar_id"]), None)
    stage = next((s for s in STAGES["steps"] if s["id"] == entry["stage_id"]), None)
    cat_name = cat["name"] if cat else "-"
    pillar_name = pillar["name"] if pillar else "-"
    stage_name = stage["name"] if stage else "-"

    body = entry.get("body_html", entry.get("summary", ""))
    cites_html = ""
    if entry.get("cites"):
        cites_html = "<ul>" + "".join(f"<li>{c}</li>" for c in entry["cites"]) + "</ul>"

    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{entry['title']} — 학습노트</title>
<meta name="description" content="{entry.get('summary','')}">
<link rel="canonical" href="https://www.nedabah.org/learning/notes/{entry['id']}.html">
<style>
body{{font-family:'Pretendard','Noto Sans KR',sans-serif;background:#fafaf7;color:#0a0a0a;line-height:1.7;max-width:760px;margin:0 auto;padding:48px 24px}}
.meta{{font-size:13px;color:#6b7280;margin-bottom:8px}}
.meta span{{margin-right:14px}}
h1{{font-size:32px;letter-spacing:-.02em;margin-bottom:16px}}
.summary{{font-size:17px;color:#1f1f23;margin-bottom:32px;padding:16px 20px;background:#fff;border-left:3px solid #0891b2;border-radius:6px}}
.body{{font-size:15px;color:#1f1f23}}
.body p{{margin-bottom:14px}}
.cites{{margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280}}
.back{{display:inline-block;margin-top:40px;font-size:13px;color:#0891b2}}
</style>
</head>
<body>
<div class="meta">
  <span>{pillar_name} · {cat_name}</span>
  <span>{stage_name} · 회전 {entry['rotation']}</span>
  <span>{entry['format'].upper()}</span>
  <span>{entry['published']}</span>
</div>
<h1>{entry['title']}</h1>
<div class="summary">{entry.get('summary','')}</div>
<div class="body">{body}</div>
<div class="cites"><strong>출처</strong> {cites_html or '<span style="color:#9ca3af">' + entry.get('source','') + '</span>'}</div>
<a class="back" href="/learning.html">← 학습노트 매트릭스로</a>
</body>
</html>
"""


def render_index(progress: dict) -> str:
    """40카테고리·10기둥·도트 매트릭스 인덱스. learning.html이 fetch로 로드할 데이터는 progress.json + notes.json."""
    return f"""<!-- 자동 생성: render_all.py @ {progress['updated']} -->
<!-- 총 entry {progress['total_entries']}, 채움 좌표 {progress['coords_filled']}/{progress['matrix_total']}, SAR {progress['sar_percent']}% -->
"""


def main():
    progress = compute_progress()

    # entry별 페이지 생성
    for n in NOTES["entries"]:
        if n.get("visibility") != "public":
            continue
        slug = n["id"]
        out = NOTES_DIR / f"{slug}.html"
        out.write_text(render_note_page(n), encoding="utf-8")

    # 인덱스 메타 (learning.html은 fetch로 progress.json + notes.json 직접 로드)
    (ROOT / "_index_meta.html").write_text(render_index(progress), encoding="utf-8")

    print(f"[render_all] OK")
    print(f"  entries: {progress['total_entries']}")
    print(f"  coords filled: {progress['coords_filled']}/{progress['matrix_total']} ({progress['sar_percent']}%)")
    print(f"  pages rendered: {sum(1 for n in NOTES['entries'] if n.get('visibility') == 'public')}")


if __name__ == "__main__":
    main()
