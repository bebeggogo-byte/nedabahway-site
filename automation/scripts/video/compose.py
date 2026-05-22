"""Final video composer — 1080x1920 vertical Shorts with open captions + watermark.

Phase 1 skeleton. Reads run directory artifacts, writes `short.mp4`.
See SPEC-TROT-AUTO-001 REQ-COMPOSE-001.

Inputs (under `media/<run_id>/`):
  - audio.mp3        narration
  - bgm.mp3          BGM (selected & copied in by pick_bgm.py)
  - image_*.png      illustrations (one per ~8s of audio)
  - captions.srt     burned-in caption track

Output:
  - short.mp4        1080x1920 H.264, AAC, 30fps
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", "/media"))
WATERMARK_TEXT = "AI 생성 콘텐츠"
FONT_PATH = os.environ.get("CAPTION_FONT", "/assets/fonts/NotoSansKR-Bold.ttf")


def probe_duration(path: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        text=True,
    )
    return float(out.strip())


def build_slideshow(images: list[Path], audio_duration: float, out_path: Path) -> None:
    """Equal-share slideshow of images stretched to fill audio duration."""
    per_image = audio_duration / max(len(images), 1)
    concat_list = out_path.with_suffix(".txt")
    with concat_list.open("w") as f:
        for img in images:
            f.write(f"file '{img}'\n")
            f.write(f"duration {per_image:.3f}\n")
        f.write(f"file '{images[-1]}'\n")

    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_list),
            "-vf",
            "scale=1080:1920:force_original_aspect_ratio=cover,crop=1080:1920,fps=30",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(out_path),
        ]
    )


def mix_audio(voice: Path, bgm: Path, duration: float, out_path: Path) -> None:
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(voice),
            "-i",
            str(bgm),
            "-filter_complex",
            "[0:a]loudnorm=I=-16:LRA=11:TP=-1.5[v];"
            "[1:a]volume=0.15,aloop=loop=-1:size=2e9[b];"
            "[v][b]amix=inputs=2:duration=first:dropout_transition=0[a]",
            "-map",
            "[a]",
            "-t",
            f"{duration:.3f}",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            str(out_path),
        ]
    )


def burn_captions_and_watermark(video: Path, audio: Path, srt: Path, out_path: Path) -> None:
    vf = (
        f"subtitles={srt}:force_style='FontName=Noto Sans KR,FontSize=14,Outline=2,"
        "Alignment=2,MarginV=160',"
        f"drawtext=text='{WATERMARK_TEXT}':fontfile={FONT_PATH}:fontcolor=white@0.6:"
        "fontsize=42:x=w-tw-30:y=120:borderw=1:bordercolor=black"
    )
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(video),
            "-i",
            str(audio),
            "-vf",
            vf,
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest",
            str(out_path),
        ]
    )


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--run", required=True)
    args = p.parse_args()

    run_dir = MEDIA_ROOT / args.run
    audio = run_dir / "audio.mp3"
    bgm = run_dir / "bgm.mp3"
    srt = run_dir / "captions.srt"
    images = sorted(run_dir.glob("image_*.png"))

    for required in (audio, bgm, srt):
        if not required.exists():
            print(f"missing {required}", file=sys.stderr)
            return 2
    if not images:
        print("no images found", file=sys.stderr)
        return 2

    duration = probe_duration(audio)
    if duration < 15 or duration > 60:
        print(f"audio duration {duration:.1f}s outside 15-60s window", file=sys.stderr)
        return 3

    slideshow = run_dir / "slideshow.mp4"
    mixed = run_dir / "mixed.mp3"
    final = run_dir / "short.mp4"

    build_slideshow(images, duration, slideshow)
    mix_audio(audio, bgm, duration, mixed)
    burn_captions_and_watermark(slideshow, mixed, srt, final)

    print(json.dumps({"run_id": args.run, "video": str(final), "duration": duration}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
