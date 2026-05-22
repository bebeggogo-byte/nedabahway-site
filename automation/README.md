# Trot Content Automation Factory

End-to-end pipeline that ingests Korean trot news, generates original Shorts scripts with Claude, synthesizes Korean TTS narration, produces AI illustrations + operator-owned BGM, composes vertical video with FFmpeg, and publishes to YouTube — all orchestrated by n8n on a single-VPS deployment.

Reference: [SPEC-TROT-AUTO-001](../.moai/specs/SPEC-TROT-AUTO-001/spec.md).

## Quickstart (Phase 0)

```bash
# 1. Clone and enter
cd automation

# 2. Configure
cp .env.example .env
$EDITOR .env   # fill in API keys per .env.example comments

# 3. Bring up n8n + supporting services
docker compose up -d

# 4. Open n8n
open http://localhost:5678
# First-time: create owner account, then import workflows from n8n/workflows/

# 5. Generate first BGM library (manual, Phase 0)
#    See docs/runbook-first-video.md
```

## Directory layout

```
automation/
  docker-compose.yml            # n8n + sqlite + ffmpeg image
  .env.example                  # all configuration (secrets injected at runtime)
  requirements.txt              # Python deps for scripts/
  Makefile                      # common operator commands
  README.md                     # this file
  docs/
    architecture.md             # data + control flow diagrams
    notion-schema.md            # 4 Notion DB schemas
    runbook-first-video.md      # manual Phase 1 walkthrough
  legal/
    disclaimer.md               # YouTube description + on-video text
    content-policy.md           # operator guardrails
    takedown.md                 # DMCA / KORCAB procedure
  n8n/
    workflows/                  # exported n8n JSON workflows (one per pipeline stage)
  scripts/
    llm/
      script_generator.py       # Claude Sonnet 4.6 script production
      tts.py                    # Edge-TTS / ElevenLabs wrapper
    video/
      imagegen.py               # Pollinations / Stability illustration
      transcribe.py             # Whisper caption alignment
      compose.py                # FFmpeg vertical-video composer
    youtube/
      uploader.py               # YouTube Data API v3 upload
  assets/
    branding/                   # channel art + watermark PNG
    fonts/                      # Korean fonts (Noto Sans KR, Pretendard)
```

## Operating modes

- **manual** (Phase 1): run each script via CLI; n8n is observation only.
- **assisted** (Phase 2 ramp): n8n triggers scripts, operator approves each video in Notion before publish.
- **autonomous** (Phase 2 steady-state): operator monitors weekly; budget guard halts on overspend.

## Cost ceiling

Hard halt at 90% of ₩500,000/mo rolling 30-day API spend. Notification at 70% / 85%. See `n8n/workflows/07-budget-guard.json` and `REQ-COST-001` in SPEC.

## Legal posture

- All music: operator-generated via Suno Pro (commercial license inherited).
- All imagery: AI-generated illustrations (no real-person likenesses).
- All scripts: original commentary on public facts; ≤20 contiguous characters from any source.
- Every video carries `[AI 자동 제작]` disclaimer + `altered_content=synthetic` flag.
- Public takedown email maintained per `legal/takedown.md`.

See `legal/` for the full policy set.

## Where things live in the bigger picture

- **SPEC**: `.moai/specs/SPEC-TROT-AUTO-001/`
- **Auto-decisions log**: `.moai/specs/SPEC-TROT-AUTO-001/auto-decisions.md` — every choice the orchestrator made for the operator, with override paths.
- **Implementation plan**: `.moai/specs/SPEC-TROT-AUTO-001/plan.md` — phased delivery.

## Branch & PR

- Development branch: `claude/ai-automation-monetization-sGCKt`
- Draft PR will be opened from this branch upon Phase 0 commit.
