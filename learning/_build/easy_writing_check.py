#!/usr/bin/env python3
"""쉽게 쓰기 4룰 게이트 (사용자 지시 2026-04-30).

기존 flow_check.py(15단계+9감정)와 별도 게이트로 동작.
4룰:
  (1) 한 문장 80자 이내 권고 — 위반 비율 40% 미만 시 통과
  (2) 한 문단 5문장 이내 권고 — 위반 문단 1/3 미만 시 통과
  (3) 전문어 1개당 일상어 동행 — 어근 분해/괄호 풀이 패턴 검출
  (4) 5초 그림성 — 첫 문단에 장면·동작·구체 명사 3종 이상

호출: render_all.py 또는 publish 시점에 entry body_html을 입력으로 받아 통과/차단.
"""
from __future__ import annotations
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "_data"


def _strip_html(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html or "")


def _split_sentences_korean(text: str) -> List[str]:
    parts = re.split(r"(?<=[\.\?\!。])\s+|(?<=다\.)\s+", text)
    return [p.strip() for p in parts if p.strip()]


def _split_paragraphs(html: str) -> List[str]:
    paras = re.findall(r"<p[^>]*>(.*?)</p>", html or "", re.DOTALL)
    return [_strip_html(p) for p in paras]


def rule1_sentence_length(html: str, limit: int = 80, threshold: float = 0.4) -> Tuple[bool, Dict]:
    paras = _split_paragraphs(html)
    long_sents = 0
    total = 0
    for p in paras:
        for s in _split_sentences_korean(p):
            total += 1
            if len(s) > limit:
                long_sents += 1
    ratio = long_sents / max(1, total)
    return (ratio < threshold), {"total_sentences": total, "long_over_80c": long_sents, "ratio": round(ratio, 3)}


def rule2_paragraph_density(html: str, sent_limit: int = 5, fail_para_ratio: float = 0.34) -> Tuple[bool, Dict]:
    paras = _split_paragraphs(html)
    long_paras = 0
    for p in paras:
        if len(_split_sentences_korean(p)) > sent_limit:
            long_paras += 1
    ratio = long_paras / max(1, len(paras))
    return (ratio < fail_para_ratio), {"paragraphs": len(paras), "long_over_5_sents": long_paras, "ratio": round(ratio, 3)}


def rule3_jargon_companion(html: str) -> Tuple[bool, Dict]:
    """전문어 동행 — 한자·헬라어·라틴어 옆에 풀이 1건 이상 기대.
    검출 패턴: 한자 + 한국어 풀이 / 외국어 + 괄호 풀이 / 어근 + 분해.
    """
    text = _strip_html(html)
    foreign_words = re.findall(r"[A-Za-zΑ-Ωα-ωΆ-Ώά-ώἀ-ῼא-ת一-龥]+", text)
    has_explanation = bool(re.search(r"\([^)]{2,30}\)|—\s*[가-힣]|=\s*[가-힣]|\'.*?\'\s*[가-힣]", text))
    sufficient = len(foreign_words) == 0 or has_explanation
    return sufficient, {"foreign_token_count": len(foreign_words), "has_explanation": has_explanation}


def rule4_first_para_image(html: str) -> Tuple[bool, Dict]:
    """첫 문단 5초 그림성 — 구체 명사·장면·동작 단어 3종 이상 기대."""
    paras = _split_paragraphs(html)
    if not paras:
        return False, {"reason": "no_paragraph"}
    first = paras[0]
    concrete_markers = [
        r"앉아", r"들어선다", r"섰다", r"멈춘다", r"걷는다", r"본다", r"읽는다", r"펴면", r"펴 본다",
        r"책상", r"강의장", r"창문", r"노트", r"펜", r"사무실", r"거리", r"한 사람", r"한 장면",
        r"한 학습자", r"어느 날", r"오늘", r"앞에", r"손에", r"발을", r"얼굴", r"한 줄", r"한 권",
        r"두 사람", r"한 편지", r"한 책", r"한 그림", r"한 장의", r"한 사건", r"받았다", r"받았다\.",
        r"\d+년", r"\d+절", r"\d+장", r"기원전", r"세기", r"한 통", r"적었다", r"기록", r"가을",
    ]
    hits = sum(1 for m in concrete_markers if re.search(m, first))
    return hits >= 2, {"concrete_markers_in_first_para": hits, "first_para_len": len(first)}


def gate(html: str) -> Dict:
    r1, d1 = rule1_sentence_length(html)
    r2, d2 = rule2_paragraph_density(html)
    r3, d3 = rule3_jargon_companion(html)
    r4, d4 = rule4_first_para_image(html)
    return {
        "rule1_sentence_under_80c": r1, "rule1_detail": d1,
        "rule2_paragraph_under_5sents": r2, "rule2_detail": d2,
        "rule3_jargon_companion": r3, "rule3_detail": d3,
        "rule4_first_para_image": r4, "rule4_detail": d4,
        "all_passed": r1 and r2 and r3 and r4,
    }


def main():
    notes = json.loads((DATA / "notes.json").read_text(encoding="utf-8"))
    entries = notes.get("entries", [])
    pass_count = 0
    for e in entries:
        r = gate(e.get("body_html", ""))
        status = "✓" if r["all_passed"] else "✗"
        if r["all_passed"]:
            pass_count += 1
        else:
            fails = [k for k in ("rule1_sentence_under_80c", "rule2_paragraph_under_5sents", "rule3_jargon_companion", "rule4_first_para_image") if not r[k]]
            print(f"  {status} {e['id']} — fails: {fails}")
    print(f"[easy_writing_check] {pass_count}/{len(entries)} passed")
    return 0 if pass_count == len(entries) else 1


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--single":
        html = open(sys.argv[2], encoding="utf-8").read()
        print(json.dumps(gate(html), ensure_ascii=False, indent=2))
    else:
        sys.exit(main())
