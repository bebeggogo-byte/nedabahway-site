"""Plan-driven seed generator — fills the blog_auto PENDING pool from the
500-post master plan, gated by the 100-point rubric.

Install: copy this file (and rubric_scorer.py, categorize.py, plan_500.json,
naver_categories.json) into ~/Scripts/agent/blog_auto/, then run inside the
agent package.

Flow (fill_pool):
  next plan item -> Claude draft (grounded in author's own published page,
  no fabricated people/stats) -> seed_miner.quality_check -> rubric score ->
  if < 100: targeted rewrite up to MAX_REWRITES -> if still < 100: HOLD + skip
  (non-stop) -> if 100: stamp plan_id/series/pillar/cta -> save to PENDING.

Progress is tracked in blog_auto state as plan_progress.json so the engine
walks the plan once, never re-doing an item.

Usage:
    python3 -m agent.blog_auto.plan_runner --fill 3
    python3 -m agent.blog_auto.plan_runner --fill 1 --dry-run
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path

# Package integration (resolved when installed under agent/blog_auto/)
from . import PENDING, HOLD, LOG_DIR  # type: ignore
from .seed_miner import _call_claude, _extract_json, quality_check, save_seed, _slugify  # type: ignore
from .rubric_scorer import score  # type: ignore

PLAN_PATH = Path(__file__).resolve().parent / "plan_500.json"
PROGRESS_PATH = Path(__file__).resolve().parent / "state" / "plan_progress.json"
MAX_REWRITES = 5

# Pillar -> author's own canonical page used as the real, citable source.
PILLAR_SOURCE = {
    "A": ("https://www.nedabah.org/book-excerpt.html", "AI시대 진로직업가치관 필독서", "직업의 속성은 이타성이다"),
    "B": ("https://www.nedabah.org/ai.html", "네다바웨이 AI 스튜디오", "검증 레이어 없는 자동화는 위임이 아니라 방치다"),
    "C": ("https://www.nedabah.org/coaching.html", "본디 1:1 코칭", "관심의 원이 아니라 영향력의 원에서 시작한다"),
    "D": ("https://www.nedabah.org/sbm.html", "자기 관찰(SBM)", "번아웃은 게으름이 아니라 신호다"),
    "E": ("https://www.nedabah.org/programs.html", "네다바웨이 강의 프로그램", "질문을 던지고 4초를 견딘다"),
    "F": ("https://www.nedabah.org/sbm.html", "성경 관찰(SBM)", "다섯 번째 반복은 다섯 번째 발견이거나 다섯 번째 권태다"),
    "R": ("https://www.nedabah.org/voices.html", "수강생의 목소리", "한 사람의 일을 다시 디자인한다"),
}


def _log(msg: str):
    line = f"[{datetime.now().isoformat(timespec='seconds')}] [plan_runner] {msg}"
    print(line, flush=True)
    try:
        fp = LOG_DIR / f"blog_auto_{datetime.now():%Y-%m-%d}.log"
        with fp.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def _load_plan() -> dict:
    return json.loads(PLAN_PATH.read_text(encoding="utf-8"))


def _load_progress() -> dict:
    if PROGRESS_PATH.exists():
        try:
            return json.loads(PROGRESS_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"done_ids": [], "hold_ids": [], "cursor": 0}


def _save_progress(p: dict):
    PROGRESS_PATH.parent.mkdir(parents=True, exist_ok=True)
    PROGRESS_PATH.write_text(json.dumps(p, ensure_ascii=False, indent=2), encoding="utf-8")


def _next_plan_item(plan: dict, progress: dict) -> dict | None:
    """Return the next unprocessed plan item (batch1 first, then generator)."""
    seen = set(progress["done_ids"]) | set(progress["hold_ids"])
    for item in plan.get("batch1", []):
        if item["id"] not in seen:
            return item
    # batch1 exhausted -> generator expansion
    return _generate_item(plan, progress, seen)


def _generate_item(plan: dict, progress: dict, seen: set) -> dict | None:
    """Synthesize a plan item from series remaining + (role x topic x format)."""
    series_defs = plan.get("series", {})
    gen = plan.get("generator", {})
    roles, topics, fmts = gen.get("role_axis", []), gen.get("topic_axis", []), gen.get("format_axis", [])
    cta_pool = gen.get("cta_pool", ["강의문의"])
    if not (series_defs and roles and topics):
        return None
    # count produced per series
    produced: dict[str, int] = {}
    for sid in progress["done_ids"] + progress["hold_ids"]:
        s = sid.split("-", 1)[0]
        produced[s] = produced.get(s, 0) + 1
    # pick series with remaining capacity (lowest fill ratio first)
    candidates = [(s, d["count"]) for s, d in series_defs.items()
                  if produced.get(s, 0) < d["count"]]
    if not candidates:
        return None
    candidates.sort(key=lambda sc: produced.get(sc[0], 0) / sc[1])
    series = candidates[0][0]
    n = produced.get(series, 0) + 1
    role = roles[n % len(roles)]
    topic = topics[n % len(topics)]
    fmt = fmts[n % len(fmts)]
    cta = cta_pool[n % len(cta_pool)]
    return {
        "id": f"{series}-{n:03d}",
        "series": series,
        "title": f"{role}을(를) 위한 {topic} — {fmt}",  # 초안 제목, Claude가 다듬음
        "keyword": topic,
        "cta": cta,
        "generated": True,
    }


DRAFT_PROMPT = """당신은 김창환 강사(네다바웨이 대표)의 블로그 고스트라이터입니다.
아래 기획 항목으로 nedabah.org/blog/perspective/에 발행할 칼럼 시드를 JSON으로만 응답하세요.

# 절대 규칙 (anti-AI-slop)
- 지어낸 인물·기관·통계·일화 금지. 가상의 "어느 학교장 한 분이…" 패턴 금지.
- 인용(<blockquote>)은 아래 '저자 출처'에서 제공한 저자 본인의 문장/원칙만 사용. 외부 인물 인용 금지.
- 1인칭 관찰자 톤, 단정/훈계 결말 금지, 미완의 여운(질문)으로 닫기.

# 톤 예시
- "이 자리에 한 진실이 있다." / "관심의 원이 아니라 영향력의 원에서 시작한다."

# 요구사항 (100점 루브릭 충족)
- 제목에 핵심키워드 포함(아래 제목 사용 또는 키워드 유지하며 다듬기).
- body_html: 2000자 이상(태그 제외). 서두에 <div class="axis">좌표</div> 1~2개.
- 본문에 정의형 문장 1개("X란 …이다."). H2/H3 또는 단락 3블록 이상, 각 단락 3줄 이내.
- <blockquote>에 '저자 출처'의 원칙 문장을 인용.
- 본문에 저자 출처 URL로 가는 <a href> 내부링크 1개 이상 포함.
- 고유 프레임워크(IDEN/STARCP/5S/WFO/창직/본디/SBM/이타성) 중 1개 이상 구체 적용.

# 출력 형식 (JSON 한 덩어리, 설명·펜스 금지)
{ "topic","cluster"(진로교육|AI리터러시|리더십|HRD|자기계발|코칭 중 1),
  "genre"(thought|scene 등),"title","subtitle","coord":["..","..",".."],
  "desc","body_html","vault_quote" }

# 저자 출처 (인용·내부링크에 사용)
URL: {src_url}
페이지: {src_title}
인용 원칙: "{src_quote}"

# 기획 항목
제목: {title}
핵심키워드: {keyword}
전환 CTA: {cta}
"""

REWRITE_PROMPT = """당신은 김창환 블로그 편집자입니다. 아래 시드 body_html을 100점 루브릭에 맞게 수정하세요.
실패 항목만 고치고 나머지는 보존. 지어낸 인물·통계 금지. 인용은 저자 출처 문장만.

실패 항목: {failed}
저자 출처 인용: "{src_quote}" (URL: {src_url})

체크: 제목 키워드 포함 / <blockquote> 인용 / 정의형 문장 / H2·H3 또는 3단락 / 단락 3줄 이내 /
본문 내 {src_url} 내부링크 / 본문 2000자 이상 / 고유 프레임워크 1개.

수정한 dict 전체를 동일 JSON 스키마로 출력(설명·펜스 금지).
# 시드
{seed_json}
"""


def _normalize(seed_raw: dict, item: dict) -> dict:
    today = datetime.now().strftime("%Y-%m-%d")
    pillar = item["series"][0].upper()
    src_url, src_title, _ = PILLAR_SOURCE.get(pillar, PILLAR_SOURCE["R"])
    slug = _slugify(seed_raw.get("topic", item.get("keyword", "post")), today)
    VALID = {"scene", "aphorism", "dialogue", "letter", "checklist", "failure", "field", "thought"}
    genre = (seed_raw.get("genre") or "thought").strip()
    genre = genre if genre in VALID else "thought"
    return {
        "slug": slug,
        "plan_id": item["id"],
        "series": item["series"],
        "pillar": pillar,
        "cta": item.get("cta", ""),
        "cluster": seed_raw.get("cluster", ""),
        "genre": genre,
        "date": today,
        "coord": (seed_raw.get("coord") or [item.get("keyword", ""), "관찰", "일지"])[:5],
        "title": seed_raw.get("title", item["title"]),
        "subtitle": seed_raw.get("subtitle", ""),
        "source": src_url,
        "web_sources": [{
            "type": "AUTHOR_SITE",
            "citation": f"{src_title} (김창환, nedabah.org, {today})",
            "url": src_url,
            "reliability": "AUTHOR",
            "key_data": seed_raw.get("vault_quote", "")[:200],
        }],
        "desc": seed_raw.get("desc", seed_raw.get("title", item["title"])),
        "body_html": seed_raw.get("body_html", ""),
    }


def make_seed(item: dict, *, dry_run: bool = False) -> dict | None:
    """Generate one 100-point seed for a plan item, or None if it can't reach 100."""
    pillar = item["series"][0].upper()
    src_url, src_title, src_quote = PILLAR_SOURCE.get(pillar, PILLAR_SOURCE["R"])
    prompt = DRAFT_PROMPT.format(src_url=src_url, src_title=src_title, src_quote=src_quote,
                                 title=item["title"], keyword=item.get("keyword", ""),
                                 cta=item.get("cta", ""))
    try:
        out = _call_claude(prompt, task_id="plan_runner_draft", cost=4)
    except Exception as e:
        _log(f"draft fail {item['id']}: {e}")
        return None
    raw = _extract_json(out)
    if not raw:
        _log(f"json parse fail {item['id']}")
        return None
    seed = _normalize(raw, item)

    for attempt in range(MAX_REWRITES + 1):
        ok, reason = quality_check(seed)
        result = score(seed, keywords=[item.get("keyword", "")]) if ok else None
        if ok and result and result["publish"]:
            seed["_score"] = result["total"]
            _log(f"{item['id']} → 100점 (rewrite {attempt})")
            return seed
        failed = (result["failed_items"] if result else [f"quality:{reason}"])
        _log(f"{item['id']} 미달 [{attempt}]: {failed}")
        if attempt >= MAX_REWRITES:
            return None
        # targeted rewrite
        try:
            out2 = _call_claude(
                REWRITE_PROMPT.format(failed=", ".join(failed), src_quote=src_quote,
                                      src_url=src_url, seed_json=json.dumps(seed, ensure_ascii=False)),
                task_id="plan_runner_rewrite", cost=4)
            raw2 = _extract_json(out2)
            if raw2:
                seed = _normalize(raw2, item)
        except Exception as e:
            _log(f"rewrite fail {item['id']}: {e}")
            return None
    return None


def fill_pool(target: int = 3, *, dry_run: bool = False) -> list[str]:
    """Ensure PENDING has >= target seeds, generating from the plan as needed."""
    plan = _load_plan()
    progress = _load_progress()
    produced: list[str] = []
    guard = 0
    while len(list(PENDING.glob("*.json"))) < target and guard < target * (MAX_REWRITES + 3):
        guard += 1
        item = _next_plan_item(plan, progress)
        if not item:
            _log("플랜 소진 — 더 생성할 항목 없음")
            break
        _log(f"generate {item['id']} · {item['title']}")
        seed = make_seed(item, dry_run=dry_run)
        if not seed:
            progress["hold_ids"].append(item["id"])
            _save_progress(progress)
            continue
        if dry_run:
            print(json.dumps({"id": item["id"], "slug": seed["slug"],
                              "score": seed.get("_score"), "title": seed["title"]},
                             ensure_ascii=False, indent=2))
            produced.append(item["id"])
            continue
        save_seed(seed, target_dir=PENDING)
        progress["done_ids"].append(item["id"])
        _save_progress(progress)
        produced.append(item["id"])
    _log(f"fill_pool done: produced={len(produced)} pool={len(list(PENDING.glob('*.json')))}")
    return produced


def main(argv: list[str]) -> int:
    dry = "--dry-run" in argv
    target = 3
    if "--fill" in argv:
        try:
            target = int(argv[argv.index("--fill") + 1])
        except Exception:
            target = 3
    produced = fill_pool(target=target, dry_run=dry)
    print(f"produced {len(produced)} seed(s): {produced}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
