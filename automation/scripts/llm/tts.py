"""TTS wrapper — Edge TTS (free) primary, ElevenLabs optional.

Phase 1 skeleton. Reads `media/<run_id>/script.txt`, writes `audio.mp3`.
See SPEC-TROT-AUTO-001 REQ-VOICE-001.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", "/media"))
TTS_PROVIDER = os.environ.get("TTS_PROVIDER", "edge")
EDGE_VOICE = os.environ.get("EDGE_TTS_VOICE", "ko-KR-SunHiNeural")


async def synthesize_edge(text: str, out_path: Path) -> None:
    import edge_tts

    communicate = edge_tts.Communicate(text, EDGE_VOICE)
    await communicate.save(str(out_path))


def synthesize_elevenlabs(text: str, out_path: Path) -> None:
    import requests

    key = os.environ["ELEVENLABS_API_KEY"]
    voice_id = os.environ["ELEVENLABS_VOICE_ID"]
    resp = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        headers={"xi-api-key": key, "accept": "audio/mpeg"},
        json={"text": text, "model_id": "eleven_multilingual_v2"},
        timeout=120,
    )
    resp.raise_for_status()
    out_path.write_bytes(resp.content)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--run", required=True)
    args = p.parse_args()

    run_dir = MEDIA_ROOT / args.run
    text_path = run_dir / "script.txt"
    if not text_path.exists():
        print(f"missing {text_path}", file=sys.stderr)
        return 2
    text = text_path.read_text(encoding="utf-8")
    out_path = run_dir / "audio.mp3"

    if TTS_PROVIDER == "edge":
        asyncio.run(synthesize_edge(text, out_path))
    elif TTS_PROVIDER == "elevenlabs":
        synthesize_elevenlabs(text, out_path)
    else:
        print(f"unknown TTS_PROVIDER={TTS_PROVIDER}", file=sys.stderr)
        return 2

    print(str(out_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
