#!/usr/bin/env python3
"""Daily content watchdog.

Inspects 4 daily-work tracks and reports staleness:

- 학습노트 (learning notes): latest date in learning/_data/notes.json entries
- SBM:                       updated field in sbm-progress.json
- 관점노트 (perspective):     newest mtime among blog/drafts/* and blog/perspective/*
- AI작업실 (ai-studio):       newest mtime among assets/ai-studio/* and ai.html

Usage:
    python3 scripts/check_daily_progress.py [--threshold-hours N] [--json]

Exit code:
    0 — all tracks healthy
    1 — at least one track stale (only when --strict given; default returns 0)

The script is read-only. The companion workflow daily-content-watchdog.yml uses
the JSON output to open / update a GitHub issue mentioning @claude when stale.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Per-track staleness thresholds in hours. Different tracks have different cadences.
DEFAULT_THRESHOLDS = {
    "learning":    48,   # 학습노트 — daily/2-day cadence
    "sbm":         48,   # SBM — daily cadence
    "perspective": 168,  # 관점노트 — weekly cadence (scheduled posts run far ahead)
    "ai_studio":   336,  # AI작업실 — bi-weekly cadence (UI assets, not strict daily)
}


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def hours_since(when: dt.datetime) -> float:
    if when.tzinfo is None:
        when = when.replace(tzinfo=dt.timezone.utc)
    return (utc_now() - when).total_seconds() / 3600.0


def _git_last_commit_ts(rel_path: str) -> dt.datetime | None:
    """Most recent commit unix-time for a path. Stable across CI checkouts.
    Falls back to filesystem mtime when not in a git repo."""
    try:
        out = subprocess.run(
            ["git", "-C", str(REPO_ROOT), "log", "-1", "--format=%ct", "--", rel_path],
            capture_output=True, text=True, check=False, timeout=15,
        )
        ts_str = out.stdout.strip()
        if ts_str.isdigit():
            return dt.datetime.fromtimestamp(int(ts_str), tz=dt.timezone.utc)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return None


def newest_git_commit(rel_paths: list[str]) -> dt.datetime | None:
    """Newest git commit timestamp across given repo-relative paths."""
    best: dt.datetime | None = None
    for rp in rel_paths:
        ts = _git_last_commit_ts(rp)
        if ts and (best is None or ts > best):
            best = ts
    return best


def newest_mtime(paths: list[Path]) -> dt.datetime | None:
    """Filesystem mtime fallback. Only reliable in non-CI contexts."""
    best: dt.datetime | None = None
    for p in paths:
        if not p.exists():
            continue
        if p.is_file():
            ts = dt.datetime.fromtimestamp(p.stat().st_mtime, tz=dt.timezone.utc)
            if best is None or ts > best:
                best = ts
        elif p.is_dir():
            for child in p.rglob("*"):
                if child.is_file():
                    ts = dt.datetime.fromtimestamp(child.stat().st_mtime, tz=dt.timezone.utc)
                    if best is None or ts > best:
                        best = ts
    return best


def parse_iso_loose(value: str) -> dt.datetime | None:
    """Parse common ISO / fragment date formats. Return UTC-aware datetime."""
    if not value:
        return None
    fmts = (
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
    )
    for fmt in fmts:
        try:
            d = dt.datetime.strptime(value, fmt)
            if d.tzinfo is None:
                d = d.replace(tzinfo=dt.timezone.utc)
            return d
        except ValueError:
            continue
    return None


def check_learning() -> dict:
    notes_path = REPO_ROOT / "learning" / "_data" / "notes.json"
    if not notes_path.exists():
        return {"track": "learning", "status": "unknown", "reason": "notes.json missing"}
    data = json.loads(notes_path.read_text(encoding="utf-8"))
    entries = data.get("entries") or data.get("notes") or []
    latest_date: dt.datetime | None = None
    latest_slug: str | None = None
    for e in entries:
        d = parse_iso_loose(e.get("date") or e.get("published") or "")
        if d and (latest_date is None or d > latest_date):
            latest_date = d
            latest_slug = e.get("slug") or e.get("id")
    return {
        "track": "learning",
        "latest_date": latest_date.isoformat() if latest_date else None,
        "latest_slug": latest_slug,
        "hours_since": round(hours_since(latest_date), 1) if latest_date else None,
        "total_entries": len(entries),
    }


def check_sbm() -> dict:
    sbm_path = REPO_ROOT / "sbm-progress.json"
    if not sbm_path.exists():
        return {"track": "sbm", "status": "unknown", "reason": "sbm-progress.json missing"}
    data = json.loads(sbm_path.read_text(encoding="utf-8"))
    updated = parse_iso_loose(data.get("updated", ""))
    return {
        "track": "sbm",
        "latest_date": updated.isoformat() if updated else None,
        "hours_since": round(hours_since(updated), 1) if updated else None,
        "completed_chapters": data.get("completed_chapters"),
        "total_chapters": data.get("total_chapters"),
    }


def check_perspective() -> dict:
    # Use git log timestamps so CI checkouts don't reset mtimes.
    latest = newest_git_commit(["blog/drafts", "blog/perspective"])
    return {
        "track": "perspective",
        "latest_date": latest.isoformat() if latest else None,
        "hours_since": round(hours_since(latest), 1) if latest else None,
    }


def check_ai_studio() -> dict:
    latest = newest_git_commit(["assets/ai-studio", "ai.html"])
    return {
        "track": "ai_studio",
        "latest_date": latest.isoformat() if latest else None,
        "hours_since": round(hours_since(latest), 1) if latest else None,
    }


def evaluate(report: dict, thresholds: dict) -> dict:
    stale = []
    healthy = []
    for track, info in report["tracks"].items():
        threshold = thresholds.get(track, 48)
        hs = info.get("hours_since")
        if hs is None:
            info["status"] = "unknown"
            stale.append(track)
        elif hs > threshold:
            info["status"] = "stale"
            info["threshold_hours"] = threshold
            stale.append(track)
        else:
            info["status"] = "healthy"
            info["threshold_hours"] = threshold
            healthy.append(track)
    report["stale_tracks"] = stale
    report["healthy_tracks"] = healthy
    report["overall"] = "stale" if stale else "healthy"
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="Print JSON only")
    parser.add_argument("--strict", action="store_true",
                        help="Exit 1 when any track is stale (default: always exit 0)")
    parser.add_argument("--threshold-hours", type=int, default=None,
                        help="Override every track's threshold (hours)")
    args = parser.parse_args()

    thresholds = dict(DEFAULT_THRESHOLDS)
    if args.threshold_hours is not None:
        thresholds = {k: args.threshold_hours for k in thresholds}

    tracks = {
        "learning":    check_learning(),
        "sbm":         check_sbm(),
        "perspective": check_perspective(),
        "ai_studio":   check_ai_studio(),
    }
    report = {
        "checked_at": utc_now().isoformat(),
        "tracks": tracks,
        "thresholds_hours": thresholds,
    }
    evaluate(report, thresholds)

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(f"checked_at: {report['checked_at']}")
        print(f"overall:    {report['overall']}")
        for track, info in tracks.items():
            print(f"  [{info['status']:7}] {track:11} hours_since={info.get('hours_since')} "
                  f"latest={info.get('latest_date')}")
        if report["stale_tracks"]:
            print(f"\nstale tracks: {', '.join(report['stale_tracks'])}")

    if args.strict and report["stale_tracks"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
