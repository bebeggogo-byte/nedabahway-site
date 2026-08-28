# Architecture — Trot Content Automation Factory

## Control flow

```mermaid
flowchart TD
    A[Cron: every 4h] -->|01-news-curator| B[Naver News API + RSS]
    B --> C{Dedup by URL hash}
    C -->|new| D[(Notion: raw_news)]
    C -->|seen| X1[Skip]

    D --> E[02-filter-classify]
    E -->|confidence >= 0.75| F[03-script-gen]
    E -->|low| X2[Drop]

    F -->|Claude Sonnet 4.6| G[Original Korean script]
    G --> H[04-asset-gen parallel]

    H -->|TTS| I[Edge TTS audio]
    H -->|Image| J[Pollinations illustrations]
    H -->|BGM picker| K[Notion bgm_library rotation]

    I & J & K --> L[05-video-compose]
    L -->|FFmpeg| M[1080x1920 mp4 + open captions]
    M -->|Whisper| N[Burned-in captions + AI watermark]

    N --> O[06-publish]
    O -->|YouTube Data API v3| P[YouTube Channel]
    O --> Q[(Notion: pipeline_runs)]

    P -->|+48h| R[09-performance]
    R -->|YouTube Analytics| S[(Notion: performance)]
    S -->|monthly| T[Prompt re-training]

    U[07-budget-guard] -.->|halt at 90%| F
    U -.-> H
    U -.-> L
    U -.-> O
```

## Data flow

```mermaid
flowchart LR
    Sources[Naver News API\nRSS Feeds] --> Raw[Notion raw_news]
    Raw --> Pipeline[pipeline_runs row created]
    Pipeline --> Script[script.md artifact]
    Script --> Audio[audio.mp3]
    Script --> Captions[captions.srt]
    Pipeline --> Images[image_01..06.png]
    BGMLib[Notion bgm_library] --> BGM[bgm.mp3]
    Audio & Captions & Images & BGM --> Final[short.mp4]
    Final --> YT[YouTube]
    YT --> Perf[Notion performance]
```

## Deployment topology

```mermaid
flowchart TB
    subgraph "Oracle Cloud Free Tier (ARM Ampere, 4vCPU/24GB)"
        n8n[n8n container :5678]
        worker[Python worker container]
        sqlite[(n8n SQLite)]
        media[(media volume)]
        n8n --- sqlite
        n8n -->|exec| worker
        worker --> media
        n8n --> media
    end

    subgraph "External services"
        Anthropic[Anthropic API]
        Naver[Naver News API]
        Polli[Pollinations]
        Edge[Edge TTS]
        Notion[Notion API]
        YT[YouTube Data API v3]
        Suno[Suno Pro<br/>manual library gen]
    end

    worker -->|REST| Anthropic
    worker -->|REST| Naver
    worker -->|REST| Polli
    worker -->|WSS| Edge
    worker -->|REST| Notion
    worker -->|REST| YT
    operator((Operator)) -->|browser| n8n
    operator -.->|periodic library refresh| Suno
```

## Why this shape

1. **n8n as orchestration, Python as muscle**: n8n handles cron, retries, conditional branching, credential storage, and operator UI. Python scripts handle the actual API work because (a) FFmpeg/Whisper need a real process, (b) Anthropic SDK lives in Python, (c) keeping logic in code beats keeping it in dragged-and-dropped nodes.
2. **Single VPS, single channel**: per auto-decision D-2.1 and D-2.14. Multi-channel parallelism is deferred until Phase 1 economics prove out.
3. **Notion as the operator console**: per D-2.2. Gives the human a no-code view of every pipeline run, scripted approvals, and a budget dashboard without standing up a Grafana stack.
4. **Idempotency by URL hash**: dedup at ingestion + status state machine in `pipeline_runs` lets the pipeline crash and resume without producing duplicate uploads (SC-7).
5. **Disclosure baked into the composer, not the publisher**: the watermark is burned into the video frame so it survives re-uploads, scrapes, and re-encoding by third parties — important for the right-of-publicity defense.

## State machine — `pipeline_runs.status`

```
pending → script_done → assets_done → composed → uploaded
                                                      ↓
                                                  measured (+48h)
                                                      ↓
                                                  archived
```

Failure paths: any step → `failed` (with `failed_at_step` recorded). Operator runs `make resume RUN=<id>` to retry from the last successful step.
