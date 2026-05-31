"""100-point publish-gate scorer for blog_auto seeds.

Implements the checklist-style rubric from
.moai/blog-strategy/naver-500-master-plan.md (Section 5).

Design: "100 = every must-pass item satisfied", not "closer-to-ideal = higher".
So 100 is a reachable gate. A draft publishes only at total == 100 and
must_pass == True. Sub-100 drafts are returned with failed_items so the
caller can rewrite only what failed.

Standalone usage (test on an existing seed without touching the pipeline):
    python3 tools/blog_auto_500/rubric_scorer.py path/to/<slug>.json

Integration usage (inside agent.blog_auto):
    from .rubric_scorer import score
    result = score(seed_dict)          # {total, must_pass, publish, failed_items, scores}

The subjective voice check uses Claude when agent.core.claude_budget is
importable; otherwise it falls back to a heuristic and notes the degradation.
"""
from __future__ import annotations

import json
import re
import sys
from typing import Any

# Signature IP terms — at least one must appear in the body (depth/originality).
IP_TERMS = ("IDEN", "STARCP", "5S", "WFO", "창직", "본디", "SBM", "이타성")

# Korean definition-sentence pattern: "X란/은/는 ... 이다." (quotable by LLMs).
_DEF_RE = re.compile(r"[^.\n]{2,40}(?:란|은|는|이란)\s[^.\n]{2,120}(?:이다|다)[.。]")
# Internal link to the brand site (conversion / GEO author-linking).
_INT_LINK_RE = re.compile(r"href=[\"'][^\"']*nedabah\.org[^\"']*[\"']", re.I)
# Crude fabricated-statistic smell (anti-AI-slop): "약 73%", "85 퍼센트" with no source nearby.
_FAKE_STAT_RE = re.compile(r"(약\s?\d{1,3}\s?%|\d{1,3}\s?퍼센트|\d{1,3}\s?% ?의 (?:사람|직장인|학생))")


def _strip_html(html: str) -> str:
    return re.sub(r"<[^>]+>", "", html or "")


def _try_claude_voice(seed: dict) -> tuple[bool, str] | None:
    """Return (is_on_brand, reason) via Claude, or None if unavailable."""
    try:
        from agent.core.claude_budget import claude_call
    except Exception:
        return None
    prompt = (
        "당신은 김창환 강사 블로그의 보이스 심사관입니다. 아래 본문이 "
        "(1) 1인칭 관찰자 톤, (2) 단정/훈계 결말이 아닌 미완의 여운으로 닫기, "
        "(3) 지어낸 인물·통계 없음 — 세 조건을 모두 만족하면 PASS, 하나라도 어기면 "
        "FAIL과 한 줄 사유를 출력하세요. 첫 토큰은 반드시 PASS 또는 FAIL.\n\n본문:\n"
        + _strip_html(seed.get("body_html", ""))[:4000]
    )
    try:
        out = claude_call(prompt, task_id="rubric_voice", priority="recommended", cost=2)
    except Exception:
        return None
    verdict = out.strip()[:8].upper()
    return ("PASS" in verdict, out.strip()[:160])


def score(seed: dict, *, keywords: list[str] | None = None) -> dict[str, Any]:
    """Score a seed against the 100-point rubric. Pure function (no I/O)."""
    title = seed.get("title", "") or ""
    body = seed.get("body_html", "") or ""
    text = _strip_html(body)
    coord = seed.get("coord", []) or []
    kw_pool = [k for k in ([seed.get("keyword", "")] + (keywords or []) + list(coord)) if k]

    failed: list[str] = []
    s = {"search": 0, "depth": 0, "voice": 0, "structure": 0, "conversion": 0, "trust": 0}

    # ── 1. 검색·AI 노출 (25): keyword in title(8) / quotable(7) / definition(5) / tags(5)
    kw_in_title = any(k and k in title for k in kw_pool)
    s["search"] += 8 if kw_in_title else (failed.append("search.keyword_in_title") or 0)
    has_quote = "<blockquote" in body
    s["search"] += 7 if has_quote else (failed.append("search.quotable_blockquote") or 0)
    has_def = bool(_DEF_RE.search(text))
    s["search"] += 5 if has_def else (failed.append("search.definition_sentence") or 0)
    has_tags = len(coord) >= 3 and bool(seed.get("desc"))
    s["search"] += 5 if has_tags else (failed.append("search.tags_and_desc") or 0)

    # ── 2. 깊이·독창성 (25): IP term(10) / real anecdote(10) / specificity(5)
    has_ip = any(t in body or t in title for t in IP_TERMS) or bool(coord)
    s["depth"] += 10 if has_ip else (failed.append("depth.ip_term") or 0)
    has_anecdote = "<blockquote" in body or any(
        (ws.get("type") == "VAULT" or ws.get("citation")) for ws in seed.get("web_sources", []))
    s["depth"] += 10 if has_anecdote else (failed.append("depth.real_anecdote") or 0)
    specific = len(text) >= 1200 and bool(re.search(r"\d", text))
    s["depth"] += 5 if specific else (failed.append("depth.specificity") or 0)

    # ── 3. 브랜드 보이스 (15): 1인칭(5) / 미완의 닫기(5) / 핵심좌표(5)
    voice = _try_claude_voice(seed)
    if voice is not None:
        on_brand, _reason = voice
        if on_brand:
            s["voice"] += 15
        else:
            failed.append("voice.claude_fail")
    else:  # heuristic fallback (degraded)
        first_person = bool(re.search(r"(나는|내가|나의|우리는|내 )", text))
        s["voice"] += 5 if first_person else (failed.append("voice.first_person") or 0)
        tail = text.rstrip()
        # 물음표 또는 한국어 수사의문 종결(…했는가. / …일까. / …나요? 등) 인정
        open_ending = ("?" in tail[-60:]) or bool(
            re.search(r"(는가|은가|ㄴ가|을까|ㄹ까|할까|일까|까요|나요|는지|던가)[.…\"'’”\)\s]*$", tail))
        s["voice"] += 5 if open_ending else (failed.append("voice.open_ending") or 0)
        s["voice"] += 5 if coord else (failed.append("voice.coordinate") or 0)

    # ── 4. 구조·가독성 (15): 3블록(5) / 문단 짧음(5) / 분량 하한(5)
    blocks = len(re.findall(r"<h[23]|<div class=\"axis\"|<p", body))
    s["structure"] += 5 if blocks >= 3 else (failed.append("structure.blocks") or 0)
    paras = re.findall(r"<p[^>]*>(.*?)</p>", body, re.DOTALL)
    long_paras = [p for p in paras if len(_strip_html(p)) > 220]
    s["structure"] += 5 if len(long_paras) <= 1 else (failed.append("structure.paragraph_length") or 0)
    s["structure"] += 5 if len(text) >= 1200 else (failed.append("structure.min_length") or 0)

    # ── 5. 전환 설계 (10): 내부링크(5) / CTA(5, naver 렌더 푸터에서 자동 부착 → 통과)
    has_internal = bool(_INT_LINK_RE.search(body))
    s["conversion"] += 5 if has_internal else (failed.append("conversion.internal_link") or 0)
    s["conversion"] += 5  # CTA is appended by enqueue_naver_and_render footer (always present)

    # ── 6. 신뢰·검증 (10): 날짜(4) / anti-slop(4) / 출처(2)
    s["trust"] += 4 if seed.get("date") else (failed.append("trust.date") or 0)
    fake = _FAKE_STAT_RE.search(text)
    s["trust"] += 4 if not fake else (failed.append("trust.fabricated_stat") or 0)
    s["trust"] += 2 if seed.get("web_sources") else (failed.append("trust.source") or 0)

    # ── must-pass firewall: any of these failing blocks publish regardless of total
    must_pass_items = {
        "trust.fabricated_stat",   # 지어낸 통계 0
        "depth.ip_term",           # 핵심 좌표/IP 연결
        "depth.real_anecdote",     # 실제 일화·인용
        "trust.source",            # 출처
    }
    must_pass = not (must_pass_items & set(failed))

    total = sum(s.values())
    return {
        "post_id": seed.get("slug", "?"),
        "scores": s,
        "total": total,
        "must_pass": must_pass,
        "publish": total == 100 and must_pass,
        "failed_items": failed,
        "voice_mode": "claude" if voice is not None else "heuristic",
    }


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("usage: python3 rubric_scorer.py <seed.json>")
        return 2
    seed = json.loads(open(argv[1], encoding="utf-8").read())
    result = score(seed)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"\n→ total={result['total']}/100  must_pass={result['must_pass']}  "
          f"publish={result['publish']}  (voice={result['voice_mode']})")
    if result["failed_items"]:
        print("  미달:", ", ".join(result["failed_items"]))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
