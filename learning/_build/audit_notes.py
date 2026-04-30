#!/usr/bin/env python3
"""audit_notes.py — 학습 노트 100편 STRATEGY_v1·8원칙 준수 자동 감사 (2026-05-01)

검사 항목 (탈락 사유):
  T1. cites_count == 0 (1차 출처 인용 누락)
  T2. format이 표준 6종 외 (paper/book/essay/synth/field/diary)
  T3. 본문 600자 미만 (essay 부실)
  T4. 자국 0 룰: '한 줄'·'자리'·'향한다'·'닿는다'·'한 사람' 합 11회 초과
  T5. 가상 인물 결: '그분이'·'한 학교장'·'한 진로교사' 등 클리셰
  T6. 결말 클리셰: '메일을 보냈다'·'한 분기 뒤'·'한 학기 뒤'
  T7. 금지 어휘 ('박는다'·'박혀'·'박혔다' 등)
  T8. visibility != public

사용:
  python3 learning/_build/audit_notes.py            # 보고만
  python3 learning/_build/audit_notes.py --json     # JSON 출력
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # learning/
SITE = ROOT.parent
NOTES_JSON = ROOT / "_data" / "notes.json"
NOTES_DIR = ROOT / "notes"

VALID_FORMATS = {"paper", "book", "essay", "synth", "field", "diary"}

JAGUK_PATTERNS = [
    re.compile(r"한\s*줄"),
    re.compile(r"자리"),
    re.compile(r"향한다"),
    re.compile(r"닿는다"),
    re.compile(r"한\s*사람"),
]

VIRTUAL_PERSON_PATTERNS = [
    re.compile(r"그분이"),
    re.compile(r"한\s*학교장"),
    re.compile(r"한\s*진로교사"),
    re.compile(r"한\s*1인\s*사업자"),
    re.compile(r"한\s*분기\s*뒤"),
    re.compile(r"한\s*학기\s*뒤"),
]

CLICHE_ENDING_PATTERNS = [
    re.compile(r"그분이.*메일을\s*보냈다"),
    re.compile(r"그분이.*어색해\s*하셨다"),
    re.compile(r"한\s*달\s*뒤.*메일을\s*보냈다"),
    re.compile(r"한\s*학기\s*뒤.*메일을\s*보냈다"),
]

BANNED_VOCAB = [
    re.compile(r"박는다"), re.compile(r"박힌다"), re.compile(r"박혀"),
    re.compile(r"박혔다"), re.compile(r"박힘"), re.compile(r"박을까"),
    re.compile(r"박음"), re.compile(r"박혀있다"), re.compile(r"못박"),
]

JAGUK_LIMIT = 11  # 한 글에서 5개 자국 단어 합 11회 초과면 탈락


def extract_body_text(html: str) -> str:
    """HTML에서 <div class="body"> 안 텍스트만 추출."""
    m = re.search(r'<div class="body">(.*?)</div>\s*\n*<div class="cites">', html, re.DOTALL)
    if not m:
        # 다른 패턴
        m = re.search(r'<div class="body">(.*?)</div>', html, re.DOTALL)
    if not m:
        return ""
    body_html = m.group(1)
    # HTML 태그 제거
    text = re.sub(r"<[^>]+>", " ", body_html)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def audit_entry(entry: dict, html_path: Path) -> dict:
    """단일 entry 감사 — 통과/탈락 판단 + 사유."""
    failures = []

    # T8. visibility
    if entry.get("visibility") != "public":
        failures.append("T8: visibility != public")

    # T1. 1차 출처
    cites = entry.get("cites_count", 0)
    if cites == 0:
        failures.append("T1: cites_count = 0 (1차 출처 누락)")

    # T2. format
    fmt = entry.get("format", "").lower()
    if fmt not in VALID_FORMATS:
        failures.append(f"T2: format '{fmt}' 비표준")

    # 본문 검사 (HTML 파일 필요)
    if not html_path.exists():
        failures.append("T0: HTML 파일 없음")
        return {"id": entry["id"], "failures": failures, "passed": False}

    html = html_path.read_text(encoding="utf-8")
    body = extract_body_text(html)
    body_len = len(body)

    # T3. 본문 길이
    if body_len < 600:
        failures.append(f"T3: 본문 {body_len}자 (< 600)")

    # T4. 자국 0 룰
    jaguk_count = sum(len(p.findall(body)) for p in JAGUK_PATTERNS)
    if jaguk_count > JAGUK_LIMIT:
        failures.append(f"T4: 자국 어휘 {jaguk_count}회 (> {JAGUK_LIMIT})")

    # T5. 가상 인물
    virtual = sum(1 for p in VIRTUAL_PERSON_PATTERNS if p.search(body))
    if virtual > 0:
        failures.append(f"T5: 가상 인물 패턴 {virtual}건")

    # T6. 결말 클리셰
    cliche = sum(1 for p in CLICHE_ENDING_PATTERNS if p.search(body))
    if cliche > 0:
        failures.append(f"T6: 결말 클리셰 {cliche}건")

    # T7. 금지 어휘
    banned = sum(len(p.findall(body)) for p in BANNED_VOCAB)
    if banned > 0:
        failures.append(f"T7: 금지 어휘 {banned}회")

    return {
        "id": entry["id"],
        "title": entry.get("title", "")[:60],
        "url": entry.get("url", ""),
        "date": entry.get("published", entry.get("date", "")),
        "category_id": entry.get("category_id"),
        "format": fmt,
        "body_len": body_len,
        "cites_count": cites,
        "jaguk_count": jaguk_count,
        "failures": failures,
        "passed": len(failures) == 0,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    notes = json.loads(NOTES_JSON.read_text(encoding="utf-8"))
    entries = notes.get("entries") or notes.get("items") or []

    results = []
    for entry in entries:
        url = entry.get("url", "")
        # /learning/notes/lrn-xxx.html
        filename = Path(url).name
        html_path = NOTES_DIR / filename
        result = audit_entry(entry, html_path)
        results.append(result)

    passed = [r for r in results if r["passed"]]
    failed = [r for r in results if not r["passed"]]

    if args.json:
        print(json.dumps({
            "total": len(results),
            "passed": len(passed),
            "failed": len(failed),
            "results": results,
        }, ensure_ascii=False, indent=2))
        return 0

    # 텍스트 출력
    print(f"\n{'='*60}")
    print(f"  학습노트 100편 STRATEGY_v1 지침 감사")
    print(f"{'='*60}\n")
    print(f"총 {len(results)}편")
    print(f"  ✅ 통과: {len(passed)}편")
    print(f"  ❌ 탈락: {len(failed)}편")
    print()

    # 탈락 사유 빈도
    from collections import Counter
    fail_reasons = Counter()
    for r in failed:
        for f in r["failures"]:
            tag = f.split(":")[0]
            fail_reasons[tag] += 1

    print("탈락 사유 분포:")
    for tag, n in fail_reasons.most_common():
        labels = {
            "T0": "HTML 파일 없음",
            "T1": "1차 출처 누락 (cites=0)",
            "T2": "format 비표준",
            "T3": "본문 600자 미만",
            "T4": "자국 어휘 11회 초과",
            "T5": "가상 인물 클리셰",
            "T6": "결말 클리셰",
            "T7": "금지 어휘",
            "T8": "visibility != public",
        }
        print(f"  {tag} {labels.get(tag, '')}: {n}건")
    print()

    # 통과·탈락 ID 목록 (간략)
    print(f"\n탈락 글 TOP 10:")
    for r in failed[:10]:
        print(f"  ❌ {r['id'][:50]}")
        for f in r['failures'][:2]:
            print(f"     · {f}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
