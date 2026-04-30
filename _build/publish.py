#!/usr/bin/env python3
"""publish.py — 사이트 발행 단일 진입점 (2026-05-01, H7)

D25 5단계 발행 흐름을 1개 명령으로 통합:
  1. validate (resources/_build/validate.py)
  2. render   (resources/_build/render_all.py)
  3. (옵션) commit
  4. (옵션) push

사용:
    python3 _build/publish.py                  # 1·2단계만
    python3 _build/publish.py --commit         # 1·2·3 (commit)
    python3 _build/publish.py --commit --push  # 1·2·3·4 (push까지)
    python3 _build/publish.py --message "..."  # commit 메시지 지정

외부영향 7종 중 push는 사용자 명시 옵션이 있을 때만 실행.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESOURCES_BUILD = ROOT / "resources" / "_build"
VALIDATE = RESOURCES_BUILD / "validate.py"
RENDER_ALL = RESOURCES_BUILD / "render_all.py"


def run(label: str, cmd: list[str], cwd: Path | None = None) -> bool:
    print(f"\n→ {label}")
    print(f"  $ {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=str(cwd) if cwd else None, text=True)
    if result.returncode != 0:
        print(f"  ✗ {label} 실패 (returncode={result.returncode})", file=sys.stderr)
        return False
    print(f"  ✓ {label} 완료")
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--commit", action="store_true", help="git commit 실행")
    ap.add_argument("--push", action="store_true", help="git push 실행 (외부영향 7종)")
    ap.add_argument("--message", "-m", default="", help="commit 메시지")
    ap.add_argument("--skip-validate", action="store_true")
    ap.add_argument("--skip-render", action="store_true")
    args = ap.parse_args()

    # 1. Validate
    if not args.skip_validate:
        if not run("Validate feed.json", ["python3", str(VALIDATE)]):
            return 1

    # 2. Render
    if not args.skip_render:
        if not run("Render all resources", ["python3", str(RENDER_ALL)], cwd=ROOT / "resources"):
            return 1

    # 3. Commit
    if args.commit or args.push:
        # 변경사항 있는지 확인
        check = subprocess.run(
            ["git", "status", "--porcelain"], cwd=str(ROOT), capture_output=True, text=True
        )
        if not check.stdout.strip():
            print("\n(변경사항 없음 — commit 스킵)")
        else:
            if not run("Git add resources/ blog/ assets/ _build/ .moai/",
                       ["git", "add", "resources/", "blog/", "assets/", "_build/", ".moai/"],
                       cwd=ROOT):
                return 1
            msg = args.message or f"chore(publish): {datetime.now().strftime('%Y-%m-%d %H:%M')} 자료실·관점 노트 일괄"
            if not run(f"Git commit", ["git", "commit", "-m", msg], cwd=ROOT):
                return 1

    # 4. Push (외부영향 — 명시 옵션 필요)
    if args.push:
        print("\n⚠ 외부영향 7종(공개 게시) — git push origin main")
        if not run("Git push origin main", ["git", "push", "origin", "main"], cwd=ROOT):
            return 1

    print("\n✅ 발행 흐름 완료")
    return 0


if __name__ == "__main__":
    sys.exit(main())
