"""Daily non-stop driver — publishes up to N posts/day from the 500-plan and
sorts each generated naver.html into its business-funnel category tray.

Additive: does NOT modify daily_publisher or seed_miner. It fills the pool via
plan_runner, calls daily_publisher.run(force=True) per slot, then copies the
rendered naver.html into naver_ready/<folder>/<slug>/ for manual paste.

Non-stop guarantee: each slot is wrapped in try/except; a failed or blocked
post is logged and the loop moves on. The day stops at <target> published or
when the plan/pool is exhausted.

Usage (launchd points here):
    python3 -m agent.blog_auto.daily3            # publish up to 3 today
    python3 -m agent.blog_auto.daily3 --target 3
    python3 -m agent.blog_auto.daily3 --dry-run  # fill+score only, no publish
"""
from __future__ import annotations

import json
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path

from . import DONE, PUBLISHED_LOG, LOG_DIR  # type: ignore
from . import daily_publisher  # type: ignore
from . import plan_runner  # type: ignore
from .categorize import categorize  # type: ignore

TRAY_ROOT = Path(__file__).resolve().parent / "naver_ready"
DEFAULT_TARGET = 3


def _today() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def _log(msg: str):
    line = f"[{datetime.now().isoformat(timespec='seconds')}] [daily3] {msg}"
    print(line, flush=True)
    try:
        fp = LOG_DIR / f"blog_auto_{_today()}.log"
        with fp.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def published_today() -> int:
    if not PUBLISHED_LOG.exists():
        return 0
    n = 0
    for ln in PUBLISHED_LOG.read_text(encoding="utf-8").splitlines():
        try:
            if json.loads(ln).get("date") == _today():
                n += 1
        except Exception:
            continue
    return n


def _find_done_seed(slug: str) -> dict | None:
    fp = DONE / f"{slug}.json"
    if fp.exists():
        try:
            return json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            pass
    for cand in DONE.glob(f"{slug}*.json"):
        try:
            return json.loads(cand.read_text(encoding="utf-8"))
        except Exception:
            continue
    return None


def organize(res: dict) -> str | None:
    """Copy the published post's naver.html into its business category tray."""
    naver_path = res.get("naver_path")
    slug = res.get("slug", "post")
    if not naver_path:
        _log(f"organize skip — no naver_path for {slug}")
        return None
    seed = _find_done_seed(slug) or {"slug": slug}
    cat = categorize(seed)
    dest = TRAY_ROOT / cat["folder"] / slug
    dest.mkdir(parents=True, exist_ok=True)
    src = Path(naver_path)
    if src.exists():
        shutil.copy2(src, dest / "naver.html")
        meta = src.parent / "naver.meta.json"
        if meta.exists():
            shutil.copy2(meta, dest / "naver.meta.json")
    # human-facing paste note
    (dest / "TO_PASTE.txt").write_text(
        f"네이버 카테고리: {cat['naver_category']}\n"
        f"타깃: {cat.get('target_buyer','')}\n"
        f"CTA: {cat.get('primary_cta','')}\n"
        f"제목: {seed.get('title', slug)}\n"
        f"→ naver.html 내용을 위 카테고리에 붙여넣으세요.\n",
        encoding="utf-8")
    _log(f"organized {slug} → {cat['folder']} ({cat['naver_category']})")
    return cat["folder"]


def run(target: int = DEFAULT_TARGET, *, dry_run: bool = False) -> dict:
    start = published_today()
    _log(f"start: 이미 오늘 {start}편 발행, 목표 {target}편")
    results = []
    slots = max(0, target - start)
    attempts = 0
    while len(results) < slots and attempts < slots + 3:
        attempts += 1
        try:
            plan_runner.fill_pool(target=1, dry_run=dry_run)
            if dry_run:
                _log("[dry-run] fill만 수행, 발행 생략")
                break
            res = daily_publisher.run(force=True)
            if not res.get("ok"):
                _log(f"slot 실패: {res.get('reason')} — 다음 시도")
                if res.get("reason") in ("no_seeds", "no_seeds_after_block"):
                    break  # 플랜/풀 소진 → 오늘은 여기까지
                continue
            if res.get("skipped"):
                break
            folder = organize(res)
            results.append({"slug": res.get("slug"), "folder": folder})
        except Exception as e:  # non-stop: log and continue
            _log(f"slot 예외: {e}")
            continue
    # optional: auto-publish to Naver (browser automation, no LLM cost).
    # enable with NAVER_AUTOPUBLISH=1; requires one-time `naver_publisher --login`.
    if os.environ.get("NAVER_AUTOPUBLISH") == "1" and results and not dry_run:
        try:
            from . import naver_publisher  # type: ignore
            for it in results:
                folder, slug = it.get("folder"), it.get("slug")
                if not folder or not slug:
                    continue
                post_dir = TRAY_ROOT / folder / slug
                if post_dir.exists():
                    naver_publisher.publish_post(post_dir)
        except Exception as e:
            _log(f"naver auto-publish skipped: {e}")

    summary = {"ok": True, "published_now": len(results), "today_total": published_today(),
               "target": target, "items": results}
    _log(f"done: {json.dumps(summary, ensure_ascii=False)}")
    return summary


def main(argv: list[str]) -> int:
    dry = "--dry-run" in argv
    target = DEFAULT_TARGET
    if "--target" in argv:
        try:
            target = int(argv[argv.index("--target") + 1])
        except Exception:
            target = DEFAULT_TARGET
    res = run(target=target, dry_run=dry)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
