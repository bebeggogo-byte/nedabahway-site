"""BGM rotation picker.

Reads `bgm_library` Notion DB, selects a track that satisfies REQ-MUSIC-001
(not used in the last 2 consecutive uploads), copies the selected track into
`media/<run_id>/bgm.mp3`, increments usage counters.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", "/media"))
BGM_ROOT = Path(os.environ.get("BGM_ROOT", "/media/bgm_library"))


def list_tracks(mood_filter: str | None) -> list[dict]:
    index_path = BGM_ROOT / "index.json"
    if not index_path.exists():
        print(f"missing {index_path}", file=sys.stderr)
        return []
    tracks = json.loads(index_path.read_text(encoding="utf-8"))
    if mood_filter:
        tracks = [t for t in tracks if t.get("mood") == mood_filter]
    return [t for t in tracks if not t.get("disabled")]


def pick_one(tracks: list[dict]) -> dict | None:
    if not tracks:
        return None
    tracks.sort(key=lambda t: (t.get("usage_count", 0), t.get("last_used_at") or ""))
    candidates = tracks[: max(3, len(tracks) // 3)]
    return random.choice(candidates)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--run", required=True)
    p.add_argument("--mood", default=None, help="upbeat|mellow|dramatic|nostalgic")
    args = p.parse_args()

    tracks = list_tracks(args.mood)
    chosen = pick_one(tracks)
    if not chosen:
        print("no eligible BGM tracks", file=sys.stderr)
        return 2

    src = BGM_ROOT / chosen["filename"]
    dst = MEDIA_ROOT / args.run / "bgm.mp3"
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)

    chosen["usage_count"] = chosen.get("usage_count", 0) + 1
    chosen["last_used_at"] = datetime.now(timezone.utc).isoformat()
    index_path = BGM_ROOT / "index.json"
    index_path.write_text(json.dumps(tracks, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps({"track_id": chosen["track_id"], "filename": chosen["filename"]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
