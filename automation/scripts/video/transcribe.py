"""Caption alignment via Whisper-large.

Phase 1 skeleton. Reads `media/<run_id>/audio.mp3`, writes `captions.srt`.
See auto-decision D-2.8.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", "/media"))


def format_timestamp(seconds: float) -> str:
    millis = int(seconds * 1000)
    hours, rem = divmod(millis, 3_600_000)
    minutes, rem = divmod(rem, 60_000)
    secs, ms = divmod(rem, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"


def write_srt(segments: list[dict], out_path: Path) -> None:
    lines: list[str] = []
    for idx, seg in enumerate(segments, start=1):
        lines.append(str(idx))
        lines.append(f"{format_timestamp(seg['start'])} --> {format_timestamp(seg['end'])}")
        lines.append(seg["text"].strip())
        lines.append("")
    out_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--run", required=True)
    p.add_argument("--model", default="large-v3")
    args = p.parse_args()

    import whisper

    run_dir = MEDIA_ROOT / args.run
    audio = run_dir / "audio.mp3"
    if not audio.exists():
        print(f"missing {audio}", file=sys.stderr)
        return 2

    model = whisper.load_model(args.model)
    result = model.transcribe(str(audio), language="ko", word_timestamps=False)
    out_path = run_dir / "captions.srt"
    write_srt(result["segments"], out_path)
    print(str(out_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
