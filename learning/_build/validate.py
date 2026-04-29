#!/usr/bin/env python3
"""학습노트 16원칙 게이트 — schema + source + qa + review + 금지어 검사.

호출: python3 _build/validate.py
종료 코드: 0=PASS, 1=FAIL (CI/배포 차단용)
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "_data"

SCHEMA = json.loads((DATA / "schema.json").read_text(encoding="utf-8"))
NOTES = json.loads((DATA / "notes.json").read_text(encoding="utf-8"))
CATEGORIES = json.loads((DATA / "categories.json").read_text(encoding="utf-8"))

# 금지 어휘 (사용자 지시 2026-04-30) — 답변·문서 어디든 차단
BANNED_WORDS = ["박는다", "박혀", "박혔다", "박힘", "박을까", "박음", "박혀있다", "못박다", "박힌"]

# 클리셰 결말 (16원칙 10번)
BANNED_ENDINGS = [
    "그분이 한 분기 뒤 메일을 보냈다",
    "한 달 뒤 그분이 메일을 보냈다",
    "그분이 처음에는 어색해하셨다",
    "한 학기 뒤 메일을 보냈다",
]

# 가상 인물 패턴 (16원칙 8번)
FABRICATED_CHAR_PATTERNS = [
    r"한 학교장(?!이름)",
    r"한 진로교사",
    r"한 1인 사업자",
    r"한 관리자",
]

REQUIRED_QA_KEYS = [
    "source_filled", "no_fabricated_chars", "no_banned_endings",
    "primary_sources_3plus", "trust_label_set", "anonymized",
]


def check_entry(entry: dict, idx: int) -> list[str]:
    errs = []
    eid = entry.get("id", f"#{idx}")

    # 1. 필수 필드
    for k in SCHEMA["required"]:
        if k not in entry or entry[k] in (None, "", []):
            errs.append(f"[{eid}] missing required: {k}")

    # 2. category_id 범위
    if entry.get("category_id"):
        cids = {c["id"] for c in CATEGORIES["categories"]}
        if entry["category_id"] not in cids:
            errs.append(f"[{eid}] invalid category_id: {entry['category_id']}")

    # 3. format
    if entry.get("format") not in {"paper", "book", "field", "essay", "diary", "synth"}:
        errs.append(f"[{eid}] invalid format: {entry.get('format')}")

    # 4. source 필드 비어 있으면 차단 (16원칙 9번)
    if not entry.get("source") or len(entry["source"]) < 5:
        errs.append(f"[{eid}] source 필드 비어 있음 또는 5자 미만 — 글 작성 9원칙 위반")

    # 5. assets[].source 검증 (16원칙 15번)
    for i, a in enumerate(entry.get("assets", [])):
        if not a.get("source"):
            errs.append(f"[{eid}] assets[{i}].source 비어 있음")

    # 6. 금지어
    body_text = entry.get("body_html", "") + " " + entry.get("summary", "") + " " + entry.get("title", "")
    for w in BANNED_WORDS:
        if w in body_text:
            errs.append(f"[{eid}] 금지 어휘 발견: '{w}'")

    # 7. 결말 클리셰
    for c in BANNED_ENDINGS:
        if c in body_text:
            errs.append(f"[{eid}] 결말 클리셰: '{c}'")

    # 8. 가상 인물 패턴
    for p in FABRICATED_CHAR_PATTERNS:
        if re.search(p, body_text):
            errs.append(f"[{eid}] 가상 인물 패턴: /{p}/")

    # 9. QA 체크 필수 키
    qa = entry.get("qa_check", {})
    for k in REQUIRED_QA_KEYS:
        if not qa.get(k):
            errs.append(f"[{eid}] qa_check.{k} = False (16원칙 미통과)")

    # 10. qa_passed 일관성
    if entry.get("visibility") == "public" and not entry.get("qa_passed"):
        errs.append(f"[{eid}] visibility=public이면서 qa_passed=False — 차단")

    return errs


def main():
    all_errs = []
    entries = NOTES.get("entries", [])
    for i, e in enumerate(entries):
        all_errs.extend(check_entry(e, i))

    if all_errs:
        print(f"[validate] FAIL — {len(all_errs)} error(s)")
        for e in all_errs:
            print(f"  ✗ {e}")
        sys.exit(1)

    print(f"[validate] PASS — {len(entries)} entries")
    sys.exit(0)


if __name__ == "__main__":
    main()
