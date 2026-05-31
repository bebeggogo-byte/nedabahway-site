"""Score, render, and sort locally-generated seeds into business category trays.

For each tools/blog_auto_500/generated/_raw/*.seed.json:
  - score against the 100-point rubric (rubric_scorer)
  - categorize (business funnel)
  - render naver.html + TO_PASTE.txt into generated/<folder>/<slug>/
  - record score + status in generated/_progress.json

Usage:
    python3 tools/blog_auto_500/bank.py
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from rubric_scorer import score          # noqa: E402
from categorize import categorize        # noqa: E402

RAW = HERE / "generated" / "_raw"
OUT = HERE / "generated"
PROGRESS = OUT / "_progress.json"

_CONTACT = "강의 의뢰: nedabah.way@gmail.com"


def render_naver(seed: dict, cat: dict) -> str:
    title = seed.get("title", seed.get("slug", ""))
    date = seed.get("date", datetime.now().strftime("%Y-%m-%d"))
    body = seed.get("body_html", "")
    src = seed.get("source", "")
    cta = cat.get("primary_cta", "")
    return (
        f"<h2>{title}</h2>\n"
        f"<p><em>김창환 · 네다바웨이 · {date}</em></p>\n"
        f"{body}\n<hr>\n"
        f'<p>원문: <a href="{src}" target="_blank" rel="noopener">{src}</a></p>\n'
        f"<p>김창환 — 강사·교육자·코치, 네다바웨이 대표. 제주 출발 전국 출강.</p>\n"
        f"<p><b>{cta}</b> · {_CONTACT}</p>\n"
    )


def load_seed(fp: Path) -> dict:
    """Load a seed JSON, auto-repairing common agent output defects:
    - unescaped straight double-quotes inside body_html (last string field)
    - coord arrays with fewer than 3 entries (pad with title)
    Repaired content is written back so generated trays stay consistent.
    """
    t = fp.read_text(encoding="utf-8")
    try:
        seed = json.loads(t)
    except Exception:
        key = '"body_html": "'
        i = t.index(key) + len(key)
        j = t.rindex('"')
        t = t[:i] + t[i:j].replace('\\"', '"').replace('"', '\\"') + t[j:]
        seed = json.loads(t)  # raise if still broken
        fp.write_text(t, encoding="utf-8")
    if len(seed.get("coord", [])) < 3:
        while len(seed.get("coord", [])) < 3:
            seed.setdefault("coord", []).append(seed.get("title", ""))
        fp.write_text(json.dumps(seed, ensure_ascii=False, indent=2), encoding="utf-8")
    return seed


def load_progress() -> dict:
    if PROGRESS.exists():
        try:
            return json.loads(PROGRESS.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"banked": {}, "updated_at": ""}


def main() -> int:
    prog = load_progress()
    rows = []
    for fp in sorted(RAW.glob("*.seed.json")):
        try:
            seed = load_seed(fp)
        except Exception as e:
            print(f"SKIP {fp.stem}: invalid JSON ({e})")
            continue
        result = score(seed)
        cat = categorize(seed)
        slug = seed.get("slug", fp.stem)
        dest = OUT / cat["folder"] / slug
        dest.mkdir(parents=True, exist_ok=True)
        (dest / "naver.html").write_text(render_naver(seed, cat), encoding="utf-8")
        (dest / "seed.json").write_text(json.dumps(seed, ensure_ascii=False, indent=2), encoding="utf-8")
        status = "발행가능" if result["publish"] else f"보류({result['total']})"
        (dest / "TO_PASTE.txt").write_text(
            f"네이버 카테고리: {cat['naver_category']}\n"
            f"타깃: {cat.get('target_buyer','')}\n"
            f"CTA: {cat.get('primary_cta','')}\n"
            f"제목: {seed.get('title')}\n"
            f"채점: {result['total']}/100  발행가능: {result['publish']}\n"
            + (f"미달: {', '.join(result['failed_items'])}\n" if result['failed_items'] else "")
            + "→ naver.html 내용을 위 카테고리에 붙여넣으세요.\n",
            encoding="utf-8")
        prog["banked"][seed.get("plan_id", slug)] = {
            "slug": slug, "folder": cat["folder"], "category": cat["naver_category"],
            "total": result["total"], "publish": result["publish"],
            "failed": result["failed_items"],
        }
        rows.append((seed.get("plan_id", slug), cat["naver_category"], result["total"],
                     result["publish"], result["failed_items"]))
    prog["updated_at"] = datetime.now().isoformat(timespec="seconds")
    PROGRESS.write_text(json.dumps(prog, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"{'PLAN':9} {'CATEGORY':22} {'SCORE':6} PUB  FAILED")
    for pid, catn, total, pub, failed in rows:
        print(f"{pid:9} {catn:22} {total:>3}/100 {str(pub):5} {','.join(failed) or '-'}")
    ok = sum(1 for r in rows if r[3])
    print(f"\n발행가능 {ok}/{len(rows)}편 · banked total {len(prog['banked'])}편")
    return 0


if __name__ == "__main__":
    sys.exit(main())
