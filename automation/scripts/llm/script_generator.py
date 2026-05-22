"""Trot Shorts script generator.

Reads a curated news item, produces an original Korean Shorts script (hook +
summary + commentary + CTA) using Claude, scores it against the operator's
rubric, and writes the result to `media/<run_id>/script.json`.

Phase 1 critical path. See SPEC-TROT-AUTO-001 REQ-SCRIPT-001 and
auto-decisions D-2.3.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path

import anthropic
import requests

MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", "/media"))
SCRIPT_MODEL = os.environ.get("CLAUDE_SCRIPT_MODEL", "claude-sonnet-4-6")
CLASSIFY_MODEL = os.environ.get("CLAUDE_CLASSIFY_MODEL", "claude-haiku-4-5-20251001")
MAX_OVERLAP_CHARS = 20

SYSTEM_PROMPT = """\
You are a senior Korean trot-music content writer producing YouTube Shorts scripts for a 50-70 year-old audience.

Hard rules:
1. Output ORIGINAL Korean. Do not reuse more than 20 contiguous characters from the source.
2. Stick to publicly verifiable facts. No speculation, no rumors, no fabricated quotes.
3. No defamatory or sensationalist framing. No clickbait verbs like 충격, 단독, 절대.
4. Warm, neutral, senior-friendly vocabulary. No internet slang.
5. Structure: hook (3-5s) → summary (10-20s) → commentary (10-25s) → cta (3-5s).
6. Total spoken duration must fit between 30 and 60 seconds at ko-KR-SunHiNeural pace (about 250-450 Korean characters total).
7. Names: stage name first reference, real name only if publicly used by the artist.

Return STRICT JSON only, no prose. Schema:
{
  "hook": "string",
  "summary": "string",
  "commentary": "string",
  "cta": "string",
  "tags": ["string", ...],
  "title_candidates": ["string", "string", "string"]
}
"""

RUBRIC_PROMPT = """\
Score the following Korean trot-Shorts script on a 0.0-1.0 rubric across these dimensions, then return the unweighted mean as `quality_score`.

Dimensions (each 0.0-1.0):
- factual_grounding: every claim traceable to the source snippet
- originality: phrasing diverges from the source (no >20 char overlap)
- senior_friendliness: vocabulary and sentence length suit 50-70 year-old viewer
- structural_compliance: hook/summary/commentary/cta present and proportioned
- tone_neutrality: no clickbait, no defamation, no sensationalism
- duration_fit: estimated TTS duration within 30-60s

Return STRICT JSON: {"factual_grounding": float, "originality": float, "senior_friendliness": float, "structural_compliance": float, "tone_neutrality": float, "duration_fit": float, "quality_score": float, "notes": "short string"}
"""


@dataclass
class ScriptResult:
    run_id: str
    source_url: str
    source_sha: str
    model: str
    hook: str
    summary: str
    commentary: str
    cta: str
    tags: list[str]
    title_candidates: list[str]
    quality_score: float
    rubric_detail: dict
    full_text_sha: str


def fetch_source_snippet(url: str) -> str:
    """Best-effort fetch of an open snippet from the source URL.

    We deliberately keep only the title + first 200 chars to stay within
    Korean Press Foundation fair-use guidance.
    """
    headers = {"User-Agent": "TrotAutoBot/1.0 (+takedown contact in description)"}
    resp = requests.get(url, headers=headers, timeout=15)
    resp.raise_for_status()
    text = resp.text
    title_match = re.search(r"<title[^>]*>([^<]+)</title>", text, re.IGNORECASE)
    title = title_match.group(1).strip() if title_match else ""
    body = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r"<style[^>]*>.*?</style>", "", body, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r"<[^>]+>", " ", body)
    body = re.sub(r"\s+", " ", body).strip()
    return f"{title}\n\n{body[:200]}"


def overlap_check(script_text: str, source_text: str) -> int:
    """Return the longest contiguous character run shared by both inputs.

    Linear-time sliding scan tuned for the small inputs we deal with.
    """
    longest = 0
    src = source_text
    for i in range(len(script_text) - MAX_OVERLAP_CHARS):
        window = script_text[i : i + MAX_OVERLAP_CHARS + 1]
        if window in src:
            longest = max(longest, len(window))
    return longest


def generate_script(client: anthropic.Anthropic, source_url: str, source_snippet: str) -> dict:
    user_msg = (
        f"Source URL: {source_url}\n\n"
        f"Source snippet (title + opening, do not copy verbatim):\n{source_snippet}\n\n"
        "Produce the script JSON now."
    )
    resp = client.messages.create(
        model=SCRIPT_MODEL,
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    raw = resp.content[0].text.strip()
    return json.loads(raw)


def grade_script(client: anthropic.Anthropic, script: dict, source_snippet: str) -> dict:
    full = "\n".join([script["hook"], script["summary"], script["commentary"], script["cta"]])
    user_msg = f"Source snippet:\n{source_snippet}\n\nScript:\n{full}\n\nReturn the rubric JSON now."
    resp = client.messages.create(
        model=CLASSIFY_MODEL,
        max_tokens=400,
        system=RUBRIC_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    return json.loads(resp.content[0].text.strip())


def write_artifacts(run_dir: Path, result: ScriptResult) -> None:
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "script.json").write_text(
        json.dumps(asdict(result), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    spoken = "\n".join([result.hook, result.summary, result.commentary, result.cta])
    (run_dir / "script.txt").write_text(spoken, encoding="utf-8")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--source", required=True, help="News source URL")
    p.add_argument("--run-id", default=str(uuid.uuid4()))
    p.add_argument("--quality-floor", type=float, default=0.70)
    p.add_argument("--retry", type=int, default=0, help="Re-generate if quality below floor")
    args = p.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY missing", file=sys.stderr)
        return 2

    client = anthropic.Anthropic(api_key=api_key)
    snippet = fetch_source_snippet(args.source)
    source_sha = hashlib.sha256(snippet.encode("utf-8")).hexdigest()

    best: ScriptResult | None = None
    for attempt in range(args.retry + 1):
        script = generate_script(client, args.source, snippet)
        full_text = "\n".join(
            [script["hook"], script["summary"], script["commentary"], script["cta"]]
        )

        overlap = overlap_check(full_text, snippet)
        if overlap > MAX_OVERLAP_CHARS:
            print(
                f"attempt {attempt}: overlap {overlap}>{MAX_OVERLAP_CHARS} chars, regenerating",
                file=sys.stderr,
            )
            continue

        rubric = grade_script(client, script, snippet)
        result = ScriptResult(
            run_id=args.run_id,
            source_url=args.source,
            source_sha=source_sha,
            model=SCRIPT_MODEL,
            hook=script["hook"],
            summary=script["summary"],
            commentary=script["commentary"],
            cta=script["cta"],
            tags=script.get("tags", []),
            title_candidates=script.get("title_candidates", []),
            quality_score=float(rubric.get("quality_score", 0.0)),
            rubric_detail=rubric,
            full_text_sha=hashlib.sha256(full_text.encode("utf-8")).hexdigest(),
        )
        if best is None or result.quality_score > best.quality_score:
            best = result
        if result.quality_score >= args.quality_floor:
            break

    if best is None:
        print("no acceptable script produced", file=sys.stderr)
        return 1

    run_dir = MEDIA_ROOT / args.run_id
    write_artifacts(run_dir, best)
    print(json.dumps({"run_id": args.run_id, "quality_score": best.quality_score, "path": str(run_dir)}))
    return 0 if best.quality_score >= args.quality_floor else 3


if __name__ == "__main__":
    raise SystemExit(main())
