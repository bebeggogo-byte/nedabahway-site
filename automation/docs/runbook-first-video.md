# Runbook — Phase 1 First Manual Video

Goal: produce one watchable, unlisted YouTube Short end-to-end **without** triggering n8n, validating every component before automation.

## Preconditions

- Phase 0 complete (`docker compose up -d` healthy).
- `.env` fully populated.
- 30+ tracks in `bgm_library` Notion DB.
- YouTube channel created, OAuth completed (token at `/secrets/youtube-token.json`).
- One target news URL chosen manually.

## Steps

### 1. Generate a script

```bash
make script SOURCE="https://entertain.naver.com/read?oid=..."
```

Inspect `media/<run_id>/script.json`:
- `hook`, `summary`, `commentary`, `cta` populated
- `quality_score` >= 0.70

If quality < 0.70: re-run with `--retry 1` flag.

### 2. Synthesize narration

```bash
docker compose exec worker python /scripts/llm/tts.py --run <run_id>
```

Listen to `media/<run_id>/audio.mp3`. Check:
- Pronunciation of artist names acceptable (Edge TTS handles most; flag exceptions).
- Total duration 30-60s.
- Loudness -16 LUFS ± 1.

### 3. Generate illustrations

```bash
docker compose exec worker python /scripts/video/imagegen.py --run <run_id> --count 5
```

Open `media/<run_id>/image_01.png` through `image_05.png`. Reject any image that:
- Contains a recognizable real-person likeness (re-prompt with stronger neutral terms).
- Contains text in any language (re-prompt with "no text" added).

### 4. Pick a BGM track

```bash
docker compose exec worker python /scripts/video/pick_bgm.py --run <run_id> --mood upbeat
```

Records the selected track in `pipeline_runs.BGMTrackID`.

### 5. Transcribe for captions

```bash
docker compose exec worker python /scripts/video/transcribe.py --run <run_id>
```

Inspect `media/<run_id>/captions.srt`. Hand-correct any clearly mis-transcribed name.

### 6. Compose video

```bash
docker compose exec worker python /scripts/video/compose.py --run <run_id>
```

Inspect `media/<run_id>/short.mp4`. Verify:
- Vertical 1080x1920, 30fps, H.264.
- Open captions visible.
- "AI 생성 콘텐츠" watermark visible in upper-right.
- Audio mix: voice -3dB, BGM -18dB.

### 7. Upload as **unlisted**

```bash
docker compose exec worker python /scripts/youtube/uploader.py --run <run_id> --visibility unlisted
```

Open YouTube Studio, find the video, confirm:
- Title in Korean, ≤100 chars, no clickbait.
- Description starts with `[AI 자동 제작]` disclaimer (per `legal/disclaimer.md`).
- `Altered content` toggle set to "Yes — synthetic or AI-generated".
- Hashtags `#AI트로트 #AI생성 #쇼츠`.

### 8. Operator review

Watch the unlisted video twice. Subjective rubric:
- Would a 60-year-old viewer watch to the end? (yes / no)
- Does anything feel deceptive or off-brand? (no / yes — what?)
- Any legal flag? (no / yes — what?)

If all green, switch to **Public** in YouTube Studio. If any concerns, leave unlisted and iterate the script generator prompt.

### 9. Log the run

In Notion `pipeline_runs`, set `Status = uploaded` and `PublishedAt = now`. Record any deviations in the row's comments — these inform Phase 2 automation guardrails.

## Phase 1 exit gate

Operator has uploaded **one** Short publicly, has a personal rubric note recorded, and has logged at least one issue/improvement for the script-generation prompt.
