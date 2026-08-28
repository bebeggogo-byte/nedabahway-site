"""AI illustration generator — Pollinations primary, Stability fallback.

Phase 1 skeleton. Writes `media/<run_id>/image_NN.png`.
See SPEC-TROT-AUTO-001 REQ-VISUAL-001.

Operator constraints:
- No real-person likenesses.
- No trademarked elements.
- Stylized illustration aesthetic, consistent across the channel.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.parse
from pathlib import Path

import requests

MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", "/media"))
PROVIDER = os.environ.get("IMAGE_PROVIDER", "pollinations")

NEGATIVE_TERMS = (
    "photo, photograph, realistic face, real person, celebrity likeness, logo, watermark, "
    "text, signature, copyrighted character"
)

STYLE_TEMPLATE = (
    "Korean traditional trot music themed editorial illustration, warm pastel palette, "
    "soft watercolor texture, microphone and music notes motif, no people faces visible, "
    "stylized cartoon, vertical composition, --no {neg}"
)


def prompt_from_tags(tags: list[str]) -> str:
    base = STYLE_TEMPLATE.format(neg=NEGATIVE_TERMS)
    if tags:
        base = f"{', '.join(tags)} — {base}"
    return base


def gen_pollinations(prompt: str, out_path: Path, seed: int) -> None:
    encoded = urllib.parse.quote(prompt)
    url = (
        f"https://image.pollinations.ai/prompt/{encoded}"
        f"?width=1024&height=1820&seed={seed}&nologo=true"
    )
    resp = requests.get(url, timeout=180)
    resp.raise_for_status()
    out_path.write_bytes(resp.content)


def gen_stability(prompt: str, out_path: Path, seed: int) -> None:
    key = os.environ["STABILITY_API_KEY"]
    resp = requests.post(
        "https://api.stability.ai/v2beta/stable-image/generate/core",
        headers={"authorization": f"Bearer {key}", "accept": "image/*"},
        files={"prompt": (None, prompt)},
        data={"aspect_ratio": "9:16", "seed": str(seed), "output_format": "png"},
        timeout=180,
    )
    resp.raise_for_status()
    out_path.write_bytes(resp.content)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--run", required=True)
    p.add_argument("--count", type=int, default=5)
    args = p.parse_args()

    run_dir = MEDIA_ROOT / args.run
    script_path = run_dir / "script.json"
    if not script_path.exists():
        print(f"missing {script_path}", file=sys.stderr)
        return 2
    script = json.loads(script_path.read_text(encoding="utf-8"))
    tags = script.get("tags", [])
    prompt = prompt_from_tags(tags)

    gen = gen_pollinations if PROVIDER == "pollinations" else gen_stability

    for i in range(1, args.count + 1):
        out = run_dir / f"image_{i:02d}.png"
        seed = abs(hash((args.run, i))) % (2**31)
        gen(prompt, out, seed)
        print(str(out))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
