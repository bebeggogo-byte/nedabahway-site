#!/usr/bin/env python3
"""CEO 콘솔 Quick Approve — internal → public 일괄/개별 전환.

사용:
  python3 resources/_build/approve.py                    # 대화형 메뉴
  python3 resources/_build/approve.py <id>               # 특정 id 승인
  python3 resources/_build/approve.py --reject <id>      # draft로 강등
  python3 resources/_build/approve.py --list             # 검수 대기 목록
  python3 resources/_build/approve.py --batch <format>   # 형식별 일괄 승인 (예: wks)
  python3 resources/_build/approve.py --top <N>          # 최신 N건 승인

승인 후 자동으로 render_all.py 실행 + git add/commit 안내.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FEED = ROOT / "_data" / "feed.json"


def load() -> dict:
    return json.loads(FEED.read_text(encoding="utf-8"))


def save(data: dict) -> None:
    FEED.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def list_internal(items: list[dict]) -> list[dict]:
    return [x for x in items if x["visibility"] == "internal"]


def show_list() -> None:
    data = load()
    queue = list_internal(data["items"])
    print(f"\n검수 대기 큐 — {len(queue)}건\n")
    by_fmt: dict[str, list[dict]] = {}
    for x in queue:
        by_fmt.setdefault(x["format"], []).append(x)
    for fmt, rows in sorted(by_fmt.items()):
        print(f"  [{fmt}] {len(rows)}건")
        for x in rows[:5]:
            print(f"    · {x['id']}")
            print(f"        → {x['title'][:60]}")
        if len(rows) > 5:
            print(f"    ... 외 {len(rows) - 5}건")
    print()


def approve_one(item_id: str) -> bool:
    data = load()
    for x in data["items"]:
        if x["id"] == item_id:
            x["visibility"] = "public"
            save(data)
            print(f"✓ public 승인: {item_id}")
            return True
    print(f"✗ id 없음: {item_id}", file=sys.stderr)
    return False


def reject_one(item_id: str) -> bool:
    data = load()
    for x in data["items"]:
        if x["id"] == item_id:
            x["visibility"] = "draft"
            save(data)
            print(f"✓ draft 강등: {item_id}")
            return True
    print(f"✗ id 없음: {item_id}", file=sys.stderr)
    return False


def batch_format(fmt: str, limit: int = 10) -> int:
    data = load()
    cnt = 0
    for x in sorted(list_internal(data["items"]), key=lambda y: y.get("updated", y["published"]), reverse=True):
        if x["format"] == fmt:
            x["visibility"] = "public"
            cnt += 1
            if cnt >= limit:
                break
    save(data)
    print(f"✓ [{fmt}] {cnt}건 public 승인")
    return cnt


def approve_top(n: int) -> int:
    data = load()
    queue = sorted(list_internal(data["items"]), key=lambda x: x.get("updated", x["published"]), reverse=True)
    cnt = 0
    for x in queue[:n]:
        x["visibility"] = "public"
        cnt += 1
    save(data)
    print(f"✓ 최신 {cnt}건 public 승인")
    return cnt


def render_after() -> None:
    print("\n▶ render_all.py 실행...")
    result = subprocess.run(
        [sys.executable, str(ROOT / "_build" / "render_all.py")],
        capture_output=True, text=True
    )
    print(result.stdout.strip())
    if result.stderr:
        print(result.stderr.strip(), file=sys.stderr)
    print("\n다음 단계: git add resources/ && git commit -m '...' && git push")


def interactive() -> None:
    while True:
        show_list()
        print("\n[a] approve <id>  [r] reject <id>  [b] batch <format>  [t] top <N>  [l] list  [q] quit\n")
        cmd = input("> ").strip()
        if not cmd:
            continue
        if cmd in ("q", "quit"):
            break
        parts = cmd.split()
        if parts[0] == "a" and len(parts) >= 2:
            approve_one(parts[1])
        elif parts[0] == "r" and len(parts) >= 2:
            reject_one(parts[1])
        elif parts[0] == "b" and len(parts) >= 2:
            limit = int(parts[2]) if len(parts) >= 3 else 10
            batch_format(parts[1], limit)
        elif parts[0] == "t" and len(parts) >= 2:
            approve_top(int(parts[1]))
        elif parts[0] == "l":
            continue
        else:
            print("unknown")
    render_after()


def main() -> None:
    args = sys.argv[1:]
    if not args:
        interactive()
        return
    if args[0] == "--list":
        show_list()
        return
    if args[0] == "--reject" and len(args) >= 2:
        if reject_one(args[1]):
            render_after()
        return
    if args[0] == "--batch" and len(args) >= 2:
        if batch_format(args[1], int(args[2]) if len(args) >= 3 else 10):
            render_after()
        return
    if args[0] == "--top" and len(args) >= 2:
        if approve_top(int(args[1])):
            render_after()
        return
    if approve_one(args[0]):
        render_after()


if __name__ == "__main__":
    main()
