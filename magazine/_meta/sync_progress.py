#!/usr/bin/env python3
"""SBM 진행 통계 동기화 — magazine/ 완성 장을 스캔해 sbm-progress.json을 갱신한다.
완성 기준: magazine/{CODE}/{N}/index.html 크기 > 40KB (placeholder 15.6KB와 구분).
사용: python3 magazine/_meta/sync_progress.py [--write]
"""
import json, os, glob, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROG = os.path.join(ROOT, "sbm-progress.json")
DONE_BYTES = 40000

def count_done(code):
    base = os.path.join(ROOT, "magazine", code)
    done = 0
    for d in glob.glob(os.path.join(base, "*", "index.html")):
        # only numeric chapter dirs
        ch = os.path.basename(os.path.dirname(d))
        if ch.isdigit() and os.path.getsize(d) > DONE_BYTES:
            done += 1
    return done

def main():
    prog = json.load(open(PROG, encoding="utf-8"))
    total_done = 0
    started = 0
    for code, info in prog.get("books", {}).items():
        d = count_done(code)
        info["completed"] = d
        total_done += d
        if d > 0:
            started += 1
    prog["completed_chapters"] = total_done
    prog["started_books"] = started
    write = "--write" in sys.argv
    if write:
        from datetime import datetime, timezone, timedelta
        kst = timezone(timedelta(hours=9))
        prog["updated"] = datetime.now(kst).isoformat(timespec="seconds")
        json.dump(prog, open(PROG, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"completed_chapters: {total_done} / {prog.get('total_chapters')}")
    print(f"started_books: {started}")
    for code, info in prog["books"].items():
        if info["completed"] > 0:
            print(f"  {code}: {info['completed']}/{info['total']}")
    print("written" if write else "(dry-run; --write 로 반영)")

if __name__ == "__main__":
    main()
