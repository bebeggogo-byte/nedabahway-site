# Implementation Plan — SPEC-TROT-AUTO-001

Phased delivery plan with explicit deliverables, owner-of-record, and verifiable exit conditions per phase. No time estimates per MoAI rules; phases are ordered, not dated.

---

## Phase 0 — Foundations (Setup)

**Goal**: A running n8n instance, all accounts provisioned, secrets stored, repository scaffold committed.

### Deliverables

| ID | Artifact | Path | Owner |
|----|---------|------|-------|
| P0-1 | SPEC documents | `.moai/specs/SPEC-TROT-AUTO-001/{spec,plan,auto-decisions}.md` | MoAI (this commit) |
| P0-2 | Docker compose | `automation/docker-compose.yml` | MoAI (this commit) |
| P0-3 | Environment template | `automation/.env.example` | MoAI (this commit) |
| P0-4 | Legal disclaimer & content policy | `automation/legal/*.md` | MoAI (this commit) |
| P0-5 | README + architecture diagram | `automation/README.md`, `automation/docs/architecture.md` | MoAI (this commit) |
| P0-6 | n8n credentials & secrets configured | n8n UI | Operator |
| P0-7 | Notion databases created (4 DBs per SPEC) | Notion workspace | Operator |
| P0-8 | YouTube channel created + OAuth client | Google Cloud + YouTube Studio | Operator |
| P0-9 | Naver Developer API app + key | Naver Cloud Platform | Operator |
| P0-10 | Suno Pro account active + first 30 BGM tracks generated | Suno + Notion bgm_library | Operator |

### Exit gate (Phase 0 → Phase 1)

- `docker-compose up -d` on VPS yields healthy n8n at `:5678`.
- Operator can log in to n8n with credential store unlocked.
- All Notion DBs created with the documented schema (see `automation/docs/notion-schema.md`).
- At least 30 BGM tracks tagged and recorded in `bgm_library`.

## Phase 1 — Manual MVP (single video proof)

**Goal**: Produce **one** end-to-end Short manually using the scripts, validating each component before automating.

### Deliverables

| ID | Artifact | Path |
|----|---------|------|
| P1-1 | Script generator CLI | `automation/scripts/llm/script_generator.py` |
| P1-2 | TTS wrapper | `automation/scripts/llm/tts.py` |
| P1-3 | Image generator | `automation/scripts/video/imagegen.py` |
| P1-4 | Video composer | `automation/scripts/video/compose.py` |
| P1-5 | Caption transcriber | `automation/scripts/video/transcribe.py` |
| P1-6 | YouTube uploader | `automation/scripts/youtube/uploader.py` |
| P1-7 | Runbook for first manual run | `automation/docs/runbook-first-video.md` |

### Exit gate (Phase 1 → Phase 2)

- One 30-60s Short visible (unlisted) on the YouTube channel.
- Operator subjectively rates it: viewable, on-brand, AI-disclosed correctly.
- All component logs show zero errors.

## Phase 2 — Single-Channel Automation

**Goal**: All n8n workflows live, 5 Shorts/day produced unattended.

### Deliverables

| ID | Artifact | Path |
|----|---------|------|
| P2-1 | News curator workflow | `automation/n8n/workflows/01-news-curator.json` |
| P2-2 | Filter + dedup workflow | `automation/n8n/workflows/02-filter-classify.json` |
| P2-3 | Script generation workflow | `automation/n8n/workflows/03-script-gen.json` |
| P2-4 | Asset generation workflow | `automation/n8n/workflows/04-asset-gen.json` |
| P2-5 | Video composition workflow | `automation/n8n/workflows/05-video-compose.json` |
| P2-6 | YouTube publish workflow | `automation/n8n/workflows/06-publish.json` |
| P2-7 | Budget guard workflow | `automation/n8n/workflows/07-budget-guard.json` |
| P2-8 | Takedown workflow | `automation/n8n/workflows/08-takedown.json` |
| P2-9 | Performance feedback workflow | `automation/n8n/workflows/09-performance.json` |

### Exit gate (Phase 2 → Phase 3)

- 30 consecutive days at >= 5 Shorts/day.
- Zero copyright strikes.
- LLM quality rubric mean >= 0.75.
- Operator interaction time logged at <= 2h/day (weekly average).

## Phase 3 — Optimization

**Goal**: Improve retention, CTR, and growth velocity using the performance feedback loop.

### Activities

- Monthly prompt re-training using top decile vs bottom decile retention scripts.
- A/B test hook variants (3 variants per week, automated split).
- BGM library expansion to 100 tracks based on retention by track.
- Thumbnail strategy: AI-generated thumbnails with title overlay; A/B 2 variants.

### Exit gate (Phase 3 → Phase 4)

- 30-day average retention >= 50%.
- Subscriber growth slope >= 100/week sustained for 4 weeks.
- Daily impressions trending up.

## Phase 4 — Monetization

**Goal**: Reach YPP eligibility and enable ads.

### Activities

- Apply to YouTube Partner Program.
- Enable mid-roll ads (where eligible).
- Configure AdSense payout.
- Compliance review against AI-content monetization rules.

### Exit gate (Phase 4 → Phase 5)

- Channel monetized.
- ₩300k+ ad revenue for 2 consecutive months (D-2.14).

## Phase 5 — Replication (deferred)

**Goal**: Clone the proven template to a second trot sub-niche channel.

### Notes

- All workflows are parameterized by `CHANNEL_ID`; replication = new Notion workspace + new YouTube channel + new env var set.
- Do not begin until Phase 4 exit gate is met.

## Phase 6 — Adjacent Revenue (long-horizon, optional)

- Naver Blog + Instagram cross-posting (Phase 6a).
- Internet news outlet registration (Phase 6b, requires 사업자등록 review).
- Course/community offering (Phase 6c, requires public track record).
- K-Trot mobile app (Phase 6d, multi-year).

These are sequenced last because the case-study channel built them on top of proven YouTube revenue, not in parallel with it.

---

## Cross-cutting practices

- **Commits**: Conventional commits, one logical unit per commit, linked to SPEC ID in body.
- **PRs**: Draft → review → squash-merge. Required green: existing site lint suite remains green (`npm run lint`).
- **Quality gates**: New Python scripts pass `ruff check` (added to `requirements.txt`); n8n workflow JSON validated via `jq` syntax check in CI.
- **Backup**: weekly `notion-export` + `n8n` workflow JSON export committed to `automation/backups/` (gitignored from public visibility if private repo).
- **Rollback**: every published video has a `takedown` workflow that can delete + log within 60 seconds of operator command.

---

REQ coverage: all requirements in SPEC are addressed across Phases 0-4.
