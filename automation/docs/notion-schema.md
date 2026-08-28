# Notion Database Schemas

Four databases live in the operator's Notion workspace. Create them manually in Phase 0 and paste their database IDs into `.env` per `.env.example`.

## DB 1 — `raw_news`

Source of truth for ingested news items.

| Property | Type | Notes |
|----------|------|-------|
| Title | Title | News headline |
| URL | URL | Canonical source URL |
| URLHash | Text | SHA256 of canonical URL (dedup key) |
| Source | Select | naver / rss-daum / rss-naver-ent / ... |
| Snippet | Text | ≤ 200 chars |
| PublishedAt | Date | Source-reported timestamp |
| IngestedAt | Date | When pipeline picked it up |
| Status | Select | pending / classified / used / dropped |
| GenreConfidence | Number | LLM trot-relevance score 0.0-1.0 |
| Tags | Multi-select | Auto-tagged: artist names, chart events, comeback, concert |

## DB 2 — `pipeline_runs`

One row per video attempt. Lifecycle audit per SPEC REQ-LOG-001.

| Property | Type | Notes |
|----------|------|-------|
| RunID | Title | UUID7 |
| SourceURL | URL | Reference to raw_news row |
| Status | Select | pending / script_done / assets_done / composed / uploaded / measured / archived / failed |
| FailedAtStep | Select | (nullable) script / tts / image / compose / upload |
| ScriptSHA | Text | SHA256 of generated script for tamper-evidence |
| ScriptModel | Text | e.g. claude-sonnet-4-6 |
| QualityScore | Number | LLM rubric 0.0-1.0 |
| AudioPath | Text | media/{run_id}/audio.mp3 |
| ImagePaths | Text | Newline-separated paths |
| BGMTrackID | Relation | → bgm_library row |
| VideoPath | Text | media/{run_id}/short.mp4 |
| YouTubeVideoID | Text | After upload |
| CostUSD | Number | Sum of API costs for this run |
| CreatedAt | Date | |
| PublishedAt | Date | |
| MeasuredAt | Date | T+48h analytics pull |

## DB 3 — `bgm_library`

Operator-owned BGM tracks generated via Suno Pro. Rotation enforced by REQ-MUSIC-001.

| Property | Type | Notes |
|----------|------|-------|
| TrackID | Title | UUID |
| FileName | Text | bgm/{track_id}.mp3 |
| Mood | Select | upbeat / mellow / dramatic / nostalgic |
| Tempo | Number | BPM |
| LengthSec | Number | |
| SunoPromptHash | Text | SHA256 of generation prompt (for re-generation reproducibility) |
| CreatedAt | Date | Generation date |
| UsageCount | Number | Increment on each video use |
| LastUsedAt | Date | Updated on each video use |
| Disabled | Checkbox | Operator can soft-disable any track |

## DB 4 — `performance`

T+48h analytics pulls and downstream feedback.

| Property | Type | Notes |
|----------|------|-------|
| YouTubeVideoID | Title | |
| Run | Relation | → pipeline_runs |
| Views48h | Number | |
| Impressions48h | Number | |
| AvgViewDurationSec | Number | |
| RetentionPct | Number | 0-100 |
| CTRPct | Number | 0-100 |
| Subscribers48h | Number | Net delta in 48h after publish |
| Decile | Select | top / mid / bottom — assigned monthly batch |
| FeedbackNotes | Text | Operator or LLM-generated retro |
