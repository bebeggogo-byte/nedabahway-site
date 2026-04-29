#!/usr/bin/env python3
"""의식 15단계 + 감정 9단계 흐름 검사기 (QUALITY_STRATEGY §5·§6).

각 학습 entry의 본문(body_html)에서 형식별 필수 단계 출현 여부를 휴리스틱으로 검사.
완벽한 NLP 분석 X — 키워드·구조·인용·CTA 마커로 1차 게이트.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "_data"

# 의식 15단계 — 형식별 필수 단계 (QUALITY §5)
REQUIRED_FLOW = {
    "essay": [1, 2, 3, 4, 6, 7, 11, 12, 13, 15],
    "paper": [1, 5, 6, 7, 8, 9, 12, 14, 15],
    "book":  [1, 2, 6, 7, 8, 9, 10, 11, 12, 15],
    "synth": [1, 6, 7, 8, 9, 11, 12, 13, 14, 15],
    "field": [1, 2, 3, 10, 12, 13, 15],
    "diary": [1, 4, 15],
}

# 감정 9단계 — 의식 단계와 매핑 (QUALITY §6)
EMOTION_MAP = {
    1: [1, 4],          # 호기심 ← 주의·질문
    2: [2],             # 안도 ← 공감대
    3: [2, 10],         # 공감 ← 공감대·사례
    4: [4, 5, 8],       # 흥미 ← 질문·가설·깊이
    5: [6, 7, 9, 12],   # 인지 ← 근거·반례·비교·결론
    6: [8, 10, 14],     # 감동 ← 깊이·사례·한계
    7: [11, 13],        # 자기적용 ← 다리·1동작
    8: [13, 15],        # 결심 ← 1동작·다음
    9: [15],            # 여운 ← 다음
}

# 단계별 키워드/구조 마커 (휴리스틱)
STAGE_MARKERS = {
    1:  [r"^\S+", r"이런 자리", r"누군가", r"어느 날", r"문득"],  # 주의 끌기 - 첫 줄 존재
    2:  [r"같은 자리", r"우리도", r"나도 그랬다", r"낯설지 않", r"공감"],
    3:  [r"문제는", r"여기서 막힌다", r"답답함", r"실은", r"진짜 문제"],
    4:  [r"왜\s", r"무엇이", r"어떻게\s", r"\?", r"의문"],
    5:  [r"가설", r"이렇게 본다면", r"한 답은", r"방향은"],
    6:  [r"\[PEER\]", r"\[POLICY\]", r"\[STAT\]", r"DOI", r"arXiv", r"논문", r"보고서", r"통계"],
    7:  [r"그러나", r"반대로", r"반례", r"한계", r"비판", r"다른 자료는"],
    8:  [r"표면 너머", r"구조는", r"안을 들여다보면", r"해부", r"분해"],
    9:  [r"비교하면", r"서양의", r"동양의", r"고대의", r"근대의", r"같은 자리"],
    10: [r"강의에서", r"코칭에서", r"현장에서", r"한 분과", r"본인은"],
    11: [r"마치", r"비유하자면", r"쉽게 말하면", r"일상에서는", r"예를 들어"],
    12: [r"결국", r"한 문장으로", r"종합하면", r"즉,", r"요컨대"],
    13: [r"오늘 한 동작", r"독자는", r"적용한다면", r"실천", r"한 가지만"],
    14: [r"이 글이 답하지 못한", r"한계는", r"다음 글에서", r"확인이 필요한"],
    15: [r"다음", r"이어서", r"앞으로", r"여운", r"닿는다면"],
}


def detect_stages(text: str) -> set[int]:
    """본문에서 출현한 의식 단계 집합 반환."""
    found = set()
    for stage, patterns in STAGE_MARKERS.items():
        for p in patterns:
            if re.search(p, text, re.MULTILINE):
                found.add(stage)
                break
    return found


def detect_emotions(stages: set[int]) -> set[int]:
    """출현한 의식 단계로부터 매핑 가능한 감정 단계 추정."""
    emotions = set()
    for em, st_list in EMOTION_MAP.items():
        if any(s in stages for s in st_list):
            emotions.add(em)
    return emotions


def check_entry(entry: dict) -> dict:
    fmt = entry.get("format", "")
    text = (entry.get("body_html", "") + "\n" + entry.get("summary", "") + "\n" + entry.get("title", ""))
    stages = detect_stages(text)
    emotions = detect_emotions(stages)
    required = set(REQUIRED_FLOW.get(fmt, []))
    missing_stages = required - stages
    return {
        "id": entry.get("id"),
        "format": fmt,
        "stages_found": sorted(stages),
        "stages_required": sorted(required),
        "stages_missing": sorted(missing_stages),
        "emotions_found": sorted(emotions),
        "pass": len(missing_stages) == 0 and len(emotions) >= 5,
    }


def main():
    notes = json.loads((DATA / "notes.json").read_text(encoding="utf-8"))
    entries = notes.get("entries", [])
    fails = []
    for e in entries:
        r = check_entry(e)
        if not r["pass"]:
            fails.append(r)
            print(f"  ✗ {r['id']} ({r['format']}) — missing stages: {r['stages_missing']} · emotions: {len(r['emotions_found'])}/9")
    if fails:
        print(f"[flow_check] FAIL — {len(fails)}/{len(entries)}")
        return 1
    print(f"[flow_check] PASS — {len(entries)} entries")
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
