# Operator Onboarding Checklist — Phase 0

Items the operator must complete before the system can run end-to-end. Each row maps to a documented `Q-DEF-*` in `auto-decisions.md` or to a setup step that requires operator credentials/preferences.

## Day 1 — Accounts & Keys

- [ ] **Anthropic Console** — create API key, paste into `.env` as `ANTHROPIC_API_KEY`. Set Sonnet 4.6 + Haiku 4.5 spend cap to `$50/mo`.
  - https://console.anthropic.com/settings/keys
- [ ] **Naver Developers** — register a "검색(News)" app, paste `Client ID` + `Client Secret` into `.env`.
  - https://developers.naver.com/apps/#/register
- [ ] **Notion** — create internal integration, copy token into `.env` as `NOTION_TOKEN`. Share the workspace with the integration.
  - https://www.notion.so/my-integrations
- [ ] **Suno Pro** — subscribe ($10/mo). No API integration needed in Phase 0 — used manually for BGM library generation in Day 3.
  - https://suno.com/account
- [ ] **Google Cloud / YouTube Data API v3** — create project, enable `YouTube Data API v3` + `YouTube Analytics API`, create OAuth 2.0 Desktop credential, download `client_secrets.json` to `automation/secrets/youtube-client-secrets.json`.
  - https://console.cloud.google.com/apis/library/youtube.googleapis.com
- [ ] **Cloud host** — provision one of:
  - Oracle Cloud Always Free ARM Ampere (recommended; 4 vCPU / 24 GB / 200 GB free forever)
  - Vultr Seoul / Hetzner CPX11 (₩5,000-10,000/mo, x86)

## Day 2 — Channel Identity & Communication

- [ ] **YouTube channel** — create new channel under operator's Google account; choose final handle (e.g. `@trot-radio-ai`); upload AI-generated channel art (microphone + sound-wave motif, no faces).
- [ ] **Channel "About" page** — paste the text from `automation/legal/disclaimer.md` "Channel-level About required text", replacing placeholders.
- [ ] **Takedown email** — create dedicated mailbox (e.g. `takedown@yourdomain` or `takedown.trotradio@gmail.com`); set autoresponder confirming receipt within 24h.
- [ ] **Alert webhook** — create a private Telegram or Discord channel; paste webhook URL into `.env` as `ALERT_WEBHOOK`.

## Day 3 — Notion & BGM Library

- [ ] **Notion DBs** — create 4 databases per `automation/docs/notion-schema.md`; copy each database ID into `.env`.
- [ ] **BGM library** — generate 30-50 trot-style BGM tracks on Suno Pro; for each:
  - Download MP3 to `/media/bgm_library/{track_id}.mp3`
  - Add row in Notion `bgm_library` with mood, tempo, length, prompt hash
  - Also append entry to `/media/bgm_library/index.json` for `pick_bgm.py`
- [ ] **Fonts** — download `NotoSansKR-Bold.ttf` + `Pretendard-Bold.ttf` to `automation/assets/fonts/`.

## Day 4 — VPS Provisioning & First Boot

- [ ] On the chosen VPS: install Docker + Docker Compose + git.
- [ ] `git clone` the repo, checkout the `claude/ai-automation-monetization-sGCKt` branch.
- [ ] Generate `N8N_ENCRYPTION_KEY` and `N8N_JWT_SECRET` (each via `openssl rand -hex 32`); paste into `.env`.
- [ ] `docker compose -f automation/docker-compose.yml up -d`.
- [ ] Open `http://<vps-ip>:5678`, create n8n owner account.
- [ ] Import `automation/n8n/workflows/01-news-curator.json` (and 02-09 after the operator confirms the n8n version pin).
- [ ] In n8n credential store, add: Notion token, Naver API client, YouTube OAuth2 client, Anthropic API header auth.

## Day 5 — Authorization Dance

- [ ] Run `docker compose exec worker python /scripts/youtube/uploader.py --run dummy --visibility unlisted` once — it will fail on the missing video file but will complete the OAuth2 flow and write `youtube-token.json` to `automation/secrets/`.
- [ ] Confirm Notion integration sees all 4 databases (run `01-news-curator` once manually; check `raw_news` is populated).
- [ ] Confirm Anthropic key works (run a test `script_generator.py` from CLI on a fake source URL).

## Day 6-7 — Phase 1 Manual MVP

- [ ] Follow `automation/docs/runbook-first-video.md` end-to-end.
- [ ] Publish 1 video as **unlisted** first; review per the runbook rubric; switch to public only if all checks pass.

## After Phase 1 passes

- [ ] Activate workflows 02-06 in n8n (toggle each to "Active").
- [ ] Activate workflow 07 (budget guard) and 09 (performance) — these run on schedule.
- [ ] Leave workflow 08 (takedown) toggled on; it's webhook-triggered.
- [ ] Monitor for 7 days; spot-check 1 video per day.

## Reference

- SPEC: `.moai/specs/SPEC-TROT-AUTO-001/spec.md`
- Plan: `.moai/specs/SPEC-TROT-AUTO-001/plan.md`
- Auto-decisions: `.moai/specs/SPEC-TROT-AUTO-001/auto-decisions.md`
- Architecture: `automation/docs/architecture.md`
- Runbook: `automation/docs/runbook-first-video.md`
