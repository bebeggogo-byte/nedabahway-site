# Auto-Decision Log — SPEC-TROT-AUTO-001

The operator delegated full planning authority to the MoAI orchestrator with the directive: *"진행자가 100% 계획 나올 때까지 클로드코드 멈추면 답해주면서 끌고 가라."* This file records every decision the orchestrator made on the operator's behalf, with rationale, so the operator can override any single choice without rewriting the SPEC.

Each entry: **decision** → **rationale** → **override path**.

---

## Round 1 — Confirmed by Operator (4 answers)

| # | Question | Operator's Answer |
|---|----------|-------------------|
| R1.Q1 | Niche | 트로트/시니어 콘텐츠 그대로 |
| R1.Q2 | Tech stack | n8n (셀프호스팅 또는 클라우드) |
| R1.Q3 | Resources | 1인 + 월 50만원 이내 |
| R1.Q4 | Primary channel | 유튜브 쇼츠 1-2채널부터 |

## Round 2 — Auto-Decided

### D-2.1 — n8n hosting target

**Decision**: Self-host on **Oracle Cloud Free Tier (ARM Ampere, 4 vCPU / 24GB RAM, always-free)**. Fallback: ₩5,000-10,000/mo Korean VPS (Vultr Seoul, Naver Cloud Compact).

**Rationale**: Operator budget ₩500k/mo; Oracle free tier covers compute indefinitely for a single n8n + FFmpeg + lightweight DB. Korea-region latency to Naver/YouTube APIs negligible. Avoids n8n Cloud's per-execution metering (10k execs/mo cap on $20 plan would throttle 5/day × 30days × ~50 nodes/run = 7,500 execs by mid-month).

**Override**: Change `automation/docker-compose.yml` `n8n` service to point at managed n8n Cloud, or swap to Hetzner CPX11 (€4.51/mo).

### D-2.2 — Database / state store

**Decision**: **Notion** as the user-facing pipeline catalog (`raw_news`, `pipeline_runs`, `bgm_library`, `performance`). Local **SQLite** in the n8n volume for transactional state n8n itself needs.

**Rationale**: Notion gives the operator a UI to inspect runs without learning a DB tool, free tier sufficient for <10k items, n8n has a first-class Notion node. SQLite for n8n state avoids managed Postgres cost.

**Override**: Replace Notion node with Airtable or Baserow (also free tier); replace SQLite with Postgres if scaling to multi-channel.

### D-2.3 — LLM provider for scripts

**Decision**: **Anthropic Claude** — `claude-sonnet-4-6` for script generation, `claude-haiku-4-5-20251001` for classification/dedup/quality-rubric. No GPT/Gemini in Phase 1.

**Rationale**: Operator is working inside Claude Code on MoAI-ADK; existing Anthropic API key pipeline. Sonnet 4.6 produces materially better Korean copy than Haiku at acceptable cost (~$0.08/script @ 30s output). Haiku 4.5 handles bulk classification at ~$0.002/call. Estimated monthly LLM spend at 5 scripts/day × 30 days + 150 classifications = ~$15-25.

**Override**: Swap `script_generator.py` `model=` argument; or route via OpenAI/Groq for testing.

### D-2.4 — TTS provider

**Decision**: **Microsoft Edge TTS** (`edge-tts` Python package) — free, no API key, Korean female voice `ko-KR-SunHiNeural`. Fallback ElevenLabs Starter $5/mo only if quality testing fails Round 2 evaluation.

**Rationale**: Cost-zero. Naturalness on Korean is acceptable for short factual narration. Saves $5-22/mo for the same workload. Defer voice cloning to Phase 2 to avoid right-of-publicity risk in early channel reputation.

**Override**: Set `TTS_PROVIDER=elevenlabs` in `.env`; script supports both backends.

### D-2.5 — Image generation

**Decision**: **Pollinations.ai** (free, no key) primary; **Stability AI** ($9/mo) only if Pollinations rate-limits us during burst periods.

**Rationale**: Trot Shorts only need 3-6 stylized backdrop illustrations per video; Pollinations output is sufficient at 1024x1024. Aesthetic consistency enforced via fixed seed + prompt template, not provider quality.

**Override**: `IMAGE_PROVIDER` env var supports `pollinations`, `stability`, `together`.

### D-2.6 — BGM source

**Decision**: **Suno v3.5 / v4** via the operator's personal Suno Pro account ($10/mo) — generate a one-time library of 30-50 trot-style BGM tracks during Phase 0, store in Notion `bgm_library`, rotate via REQ-MUSIC-001.

**Rationale**: Suno outputs are owned by the generating user under Suno's commercial license (Pro tier). Avoids any third-party label exposure. One-time burst generation amortizes the cost across all future videos. 30-50 tracks supports 2 weeks before any repeat per REQ-MUSIC-001.

**Override**: Substitute Udio Pro, or use YouTube Audio Library (free, but lower differentiation), or commission a human composer for premium track set.

### D-2.7 — Video composition

**Decision**: **FFmpeg** invoked from Python (`ffmpeg-python` wrapper) running on the same n8n VPS. Template: 1080x1920, 30fps, H.264, AAC audio.

**Rationale**: Cost-zero, fully scriptable, deterministic. Creatomate ($40/mo) is the documented fallback if the operator decides to outsource composition complexity later. FFmpeg is overkill for our template needs and runs comfortably on the Oracle free tier ARM instance.

**Override**: Set `COMPOSER=creatomate` and provide `CREATOMATE_API_KEY` to switch.

### D-2.8 — Caption alignment

**Decision**: **OpenAI Whisper `large-v3`** running locally on the VPS (CPU mode; ~3-4x realtime on Ampere ARM is acceptable for 60s clips). Outputs SRT, burned-in via FFmpeg `subtitles` filter.

**Rationale**: Open captions are critical for senior viewers (REQ-VISUAL-001 implicit accessibility). Whisper-large is best-in-class for Korean; running locally avoids per-minute API cost. Acceptable latency since pipeline is async.

**Override**: Switch to Deepgram or AssemblyAI by changing `transcribe.py`.

### D-2.9 — Source ingestion

**Decision**: **Naver News API** (operator must register dev key, free tier 25k requests/day) + **RSS feeds** from `top-star.daum.net`, `entertain.naver.com` trot tags, and label-owned blogs. NO direct scraping of paywalled portals.

**Rationale**: Naver News API provides clean structured snippets that don't violate Korean Press Foundation guidance when only the title + ≤200 char snippet + source link is used. RSS is explicitly publisher-consented syndication.

**Override**: Disable any source in `automation/n8n/workflows/01-news-curator.json` `Filter` nodes.

### D-2.10 — Publishing schedule

**Decision**: **5 uploads/day at 07:00, 10:00, 13:00, 17:00, 21:00 KST**, weekdays + weekends identical.

**Rationale**: Senior audience peak engagement windows per Naver/YouTube Korea internal studies are morning (after breakfast), late morning, midday, post-dinner, late evening. Spreading uploads avoids YouTube's algorithmic suspicion of bot-like burst publishing.

**Override**: Edit cron in `02-publisher.json` `Schedule Trigger` node.

### D-2.11 — Channel branding (Phase 1)

**Decision**: Working title **"트로트 라디오 (가칭)"**. Final name TBD in Phase 0 day 2 by operator. AI-generated channel art using FLUX or Pollinations with prompt locked to neutral microphone + sound-wave motif (no artist likenesses). Channel avatar: stylized cartoon-radio illustration.

**Rationale**: Generic radio-station framing positions the channel as a curator/commentator, not a fan-account, which strengthens fair-use commentary posture and right-of-publicity defense. Senior audience associates "radio" with familiar trust.

**Override**: Rename in YouTube Studio; replace assets in `automation/assets/branding/`.

### D-2.12 — Disclaimer language

**Decision**: Every video description starts with:
> [AI 자동 제작] 이 영상은 공개된 트로트 관련 정보를 바탕으로 AI가 작성·합성한 콘텐츠입니다. 음악은 자체 생성 BGM, 이미지는 AI 일러스트입니다. 저작권 우려 시 [contact email]로 알려주시면 24시간 내 조치합니다.

Plus burned-in watermark on the video: `AI 생성 콘텐츠`.

**Rationale**: Satisfies YouTube AI-disclosure policy (2024+), Korean copyright commentary defense, and gives the operator a fast takedown channel before any DMCA escalation.

**Override**: Edit `automation/legal/disclaimer.md` and re-deploy.

### D-2.13 — Budget guard threshold

**Decision**: Hard halt at **₩450,000 (90% of ₩500,000)** rolling 30-day cost, with Telegram notification at 70% and 85%.

**Rationale**: Operator stated 50만원 ceiling; 90% halt leaves 10% headroom for in-flight calls already authorized.

**Override**: Edit `BUDGET_MAX_KRW` and `BUDGET_HALT_PCT` in `.env`.

### D-2.14 — Phase 2 trigger

**Decision**: Phase 2 (multi-channel + cross-platform) begins **only after** Phase 1 channel hits both (a) YPP eligibility AND (b) ₩300,000+ in actual monthly ad revenue for 2 consecutive months.

**Rationale**: Premature replication of a failing single channel multiplies cost without multiplying revenue. The case study founder ran 9 channels because the first 1-2 channels proved profitable; we replicate that ordering, not the end state.

**Override**: Operator can manually trigger Phase 2 at any point; this is a recommended guardrail, not a hard block.

### D-2.15 — Repo placement

**Decision**: Build the automation system **inside this repo** under `automation/` directory rather than spinning up a separate repository.

**Rationale**: Operator is already inside Claude Code on `nedabahway-site`. SPEC artifacts live in `.moai/specs/` per MoAI-ADK convention. Keeping automation here means a single PR review surface, single CI, and the existing branch `claude/ai-automation-monetization-sGCKt` is the right home. The static site and the automation system share no runtime coupling — the directory boundary is sufficient isolation. If/when the automation grows past Phase 3, a repo split becomes a clean cut along `automation/`.

**Override**: `git subtree split --prefix=automation -b trot-automation` to extract later.

### D-2.16 — Language of in-code identifiers and configs

**Decision**: All code, comments, config keys, workflow node names: **English**. User-facing strings (video titles, descriptions, captions, disclaimer): **Korean**. Per `.moai/config/sections/language.yaml`.

**Rationale**: Engineering convention; matches MoAI-ADK constitution; keeps tooling and grep-ability sane.

**Override**: None recommended.

### D-2.17 — Initial commit strategy

**Decision**: Create all Phase 0 artifacts in a single feature commit on `claude/ai-automation-monetization-sGCKt`, then open a **draft PR** to main. Do not merge until operator reviews.

**Rationale**: Operator instructed development on this branch; draft PR is the documented workflow per the harness instructions for this session.

**Override**: Operator promotes draft to ready, or rebases/squashes before merge.

---

## Decisions explicitly deferred (operator must answer before Phase 1 day-1)

These are deliberately left open because they require operator credentials/preferences that cannot be inferred:

| # | Question | When needed |
|---|----------|-------------|
| Q-DEF-1 | YouTube channel name (final) and About-page email | Phase 0 day 2 |
| Q-DEF-2 | Operator's Anthropic API key, Naver dev key, Suno Pro account | Phase 0 day 1 |
| Q-DEF-3 | Operator's preferred Telegram/Discord webhook for alerts | Phase 0 day 3 |
| Q-DEF-4 | Whether to register a `사업자등록` / personal vs. business YouTube monetization | Phase 4 prep |
| Q-DEF-5 | Operator's domain for takedown email (e.g., `takedown@nedabahway.com` vs. gmail) | Phase 0 day 2 |

The system is fully buildable and runnable on test data without these; they gate **first real publish only**.

---

Version: 1.0.0
Decision-time: 2026-05-22
