#!/usr/bin/env python3
"""publish_v2.py — publish.py를 감싼 통합 발행 진입점 (2026-05-01, B후속)

publish.py + inject_search_widget.py + keyword_gate(검사) 통합.
publish.py를 수정하지 않고 v2 wrapper로 추가 단계를 박는다.

흐름:
  1. validate  (publish.py)
  2. render    (publish.py)
  3. inject_search_widget   (B 패치)
  4. keyword_gate (A 검사)
  5. (옵션) commit + push   (publish.py)

사용:
  python3 _build/publish_v2.py
  python3 _build/publish_v2.py --commit --push
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLISH = ROOT / "_build" / "publish.py"
INJECT_SEARCH = ROOT / "_build" / "inject_search_widget.py"
KEYWORD_GATE = Path.home() / "Scripts" / "agent" / "site_publisher" / "keyword_gate.py"


def run(label: str, cmd: list[str]) -> bool:
    print(f"\n→ {label}")
    print(f"  $ {' '.join(cmd)}")
    result = subprocess.run(cmd, text=True)
    if result.returncode != 0:
        print(f"  ✗ {label} 실패", file=sys.stderr)
        return False
    print(f"  ✓ {label} 완료")
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--commit", action="store_true")
    ap.add_argument("--push", action="store_true")
    ap.add_argument("--message", "-m", default="")
    ap.add_argument("--strict-keywords", action="store_true",
                    help="비공개 키워드 검출 시 발행 차단")
    args = ap.parse_args()

    # 1+2. validate + render (publish.py 호출, --skip-render 까지)
    base_cmd = ["python3", str(PUBLISH)]
    if not run("Phase 1+2: validate + render", base_cmd):
        return 1

    # 3. inject search widget (resources/index.html 등)
    if not run("Phase 3: inject search widget", ["python3", str(INJECT_SEARCH)]):
        return 1

    # 4. keyword gate
    gate_cmd = ["python3", str(KEYWORD_GATE)]
    if args.strict_keywords:
        gate_cmd.append("--strict")
    if not run("Phase 4: keyword gate", gate_cmd):
        if args.strict_keywords:
            return 1
        # strict 아니면 경고만 (이미 print됨)

    # 5. commit + push (publish.py 재호출 — skip-validate, skip-render)
    if args.commit or args.push:
        commit_cmd = ["python3", str(PUBLISH), "--skip-validate", "--skip-render"]
        if args.commit:
            commit_cmd.append("--commit")
        if args.push:
            commit_cmd.append("--push")
        if args.message:
            commit_cmd += ["-m", args.message]
        if not run("Phase 5: commit + push", commit_cmd):
            return 1

    print("\n✅ publish_v2 발행 흐름 완료")
    return 0


if __name__ == "__main__":
    sys.exit(main())
