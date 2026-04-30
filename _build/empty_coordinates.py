#!/usr/bin/env python3
"""empty_coordinates.py — 4축 매트릭스 빈 좌표 발견 (2026-05-01, H1)

관점 노트 _data.json의 axis 메타를 읽어 4축 좌표 5,120개 중 발행되지 않은 빈 좌표를 찾는다.

4축:
- 주제 영역 10: 일·진로·관계·소통·리더십·번아웃·부모/자녀·AI 시대·자기이해·창직
- 독자 자리 8: 직장인·1인 사업자·관리자·학생·학부모·교사·기관 실무자·은퇴기
- 글의 형태 8: 짧은 관찰·편지·대화·의문 출발·일화·반례·고백·작은 실험
- 감정 트리거 8: 어색함·답답함·외로움·의심·후회·기대·놀람·여유

→ 10×8×8×8 = 5,120 좌표

사용:
    python3 _build/empty_coordinates.py [--limit N] [--json]

출력:
    빈 좌표 목록 (우선순위: 가장 비어있는 영역부터)
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "blog" / "perspective" / "_data.json"

TOPICS = ["일", "진로", "관계", "소통", "리더십", "번아웃", "부모", "AI시대", "자기이해", "창직"]
READERS = ["직장인", "1인사업자", "관리자", "학생", "학부모", "교사", "기관실무자", "은퇴기"]
FORMS = ["짧은관찰", "편지", "대화", "의문출발", "일화", "반례", "고백", "작은실험"]
EMOTIONS = ["어색함", "답답함", "외로움", "의심", "후회", "기대", "놀람", "여유"]


def normalize(value: str | None, choices: list[str]) -> str | None:
    """입력값을 choices 중 하나로 정규화 (느슨한 매칭)."""
    if not value:
        return None
    v = value.strip()
    for c in choices:
        if c == v or c in v or v in c:
            return c
    return None


def load_articles() -> list[dict]:
    if not DATA_PATH.exists():
        print(f"⚠ _data.json 없음: {DATA_PATH}", file=sys.stderr)
        return []
    raw = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    if isinstance(raw, list):
        return raw
    return raw.get("articles") or raw.get("items") or []


def coordinate_of(article: dict) -> tuple[str, str, str, str] | None:
    axis = article.get("axis") or {}
    t = normalize(axis.get("topic"), TOPICS)
    r = normalize(axis.get("reader"), READERS)
    f = normalize(axis.get("form"), FORMS)
    e = normalize(axis.get("emotion"), EMOTIONS)
    if not (t and r and f and e):
        return None
    return (t, r, f, e)


def find_empty(limit: int = 50) -> list[dict]:
    articles = load_articles()
    filled: set[tuple[str, str, str, str]] = set()
    by_topic: Counter[str] = Counter()

    for art in articles:
        coord = coordinate_of(art)
        if coord:
            filled.add(coord)
            by_topic[coord[0]] += 1

    # 가장 비어 있는 topic부터 우선
    topic_priority = sorted(TOPICS, key=lambda t: by_topic.get(t, 0))

    empty: list[dict] = []
    for t in topic_priority:
        for r in READERS:
            for f in FORMS:
                for e in EMOTIONS:
                    if (t, r, f, e) not in filled:
                        empty.append({
                            "topic": t,
                            "reader": r,
                            "form": f,
                            "emotion": e,
                            "topic_filled_count": by_topic.get(t, 0),
                        })
                        if len(empty) >= limit:
                            return empty
    return empty


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    articles = load_articles()
    total = len(articles)
    empty = find_empty(limit=args.limit)
    total_coords = len(TOPICS) * len(READERS) * len(FORMS) * len(EMOTIONS)
    filled_count = total_coords - sum(1 for _ in find_empty(limit=total_coords))

    if args.json:
        print(json.dumps({
            "total_coordinates": total_coords,
            "filled": filled_count,
            "filled_pct": round(filled_count / total_coords * 100, 2),
            "articles": total,
            "empty_suggestions": empty,
        }, ensure_ascii=False, indent=2))
        return

    print(f"📐 4축 매트릭스 — {total_coords} 좌표")
    print(f"   발행됨: {filled_count} ({filled_count/total_coords*100:.1f}%)")
    print(f"   글 누적: {total}편")
    print()
    print(f"🎯 다음 발행 후보 — 빈 좌표 상위 {len(empty)}개:")
    for i, c in enumerate(empty, 1):
        print(f"   {i:>2}. [{c['topic']}] {c['reader']} · {c['form']} · {c['emotion']}")


if __name__ == "__main__":
    main()
