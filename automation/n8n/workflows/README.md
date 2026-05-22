# n8n Workflow Inventory

Each JSON file is a self-contained, importable n8n workflow. Use n8n's "Import from File" feature; do not edit JSON by hand unless you understand n8n's node version constraints.

## Phase 1 (manual MVP) — not required

n8n is observation-only during Phase 1. Scripts under `automation/scripts/` are invoked directly via the Makefile.

## Phase 2 (automation)

| File | Purpose | SPEC REQ |
|------|---------|----------|
| `01-news-curator.json` | Naver News API + RSS ingest, dedup, write to `raw_news` | REQ-INGEST-001/002 |
| `02-filter-classify.json` | LLM classification, drop low-confidence rows | REQ-FILTER-001 |
| `03-script-gen.json` | Invoke `script_generator.py`, write to `pipeline_runs` | REQ-SCRIPT-001 |
| `04-asset-gen.json` | Parallel call out to `tts.py`, `imagegen.py`, `pick_bgm.py` | REQ-VOICE-001 + REQ-VISUAL-001 + REQ-MUSIC-001 |
| `05-video-compose.json` | Invoke `transcribe.py` + `compose.py` | REQ-COMPOSE-001 |
| `06-publish.json` | Invoke `uploader.py`, schedule by slot | REQ-PUBLISH-001/002 |
| `07-budget-guard.json` | Aggregate `pipeline_runs.CostUSD`, halt + alert at thresholds | REQ-COST-001 |
| `08-takedown.json` | Operator-triggered: set video private + log | REQ-LEGAL-001 |
| `09-performance.json` | T+48h YouTube Analytics pull → `performance` DB | REQ-EVAL-001 |

## Import order

Import dependencies first so node references resolve:
1. 01-news-curator
2. 02-filter-classify
3. 03-script-gen
4. 04-asset-gen
5. 05-video-compose
6. 06-publish
7. 07-budget-guard
8. 08-takedown
9. 09-performance

Workflows 02-09 are deliberately left to be authored against your live n8n instance during Phase 2 because their node-version pins must match your specific n8n release. The shape of each is documented in `docs/architecture.md` and the SPEC.

## Credentials required (n8n credential store)

- Anthropic API (via HTTP Request header auth, or community node)
- Naver API (client id + client secret)
- Notion (internal integration token)
- YouTube OAuth2 (Google OAuth API client)
- Telegram or Discord webhook (alert channel)
- Suno Pro is **not** integrated here — BGM library generation is a one-time manual Phase 0 task (auto-decision D-2.6).
