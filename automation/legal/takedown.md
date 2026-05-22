# Takedown Procedure

Any inbound complaint — copyright, right-of-publicity, defamation, factual error — is handled under this procedure. Target resolution: under 24 hours from receipt.

## Channels

- Primary: `{TAKEDOWN_EMAIL}` (configured per `.env`).
- Secondary: YouTube channel "Contact" form.
- Tertiary: YouTube DMCA / copyright takedown queue (filed by claimant directly).

## Triage SLA

| Severity | Response time | Action |
|----------|---------------|--------|
| Copyright strike filed | Within 6 hours | Unlist immediately; investigate; counter-notice only if confident; otherwise full takedown. |
| Right-of-publicity / defamation claim | Within 24 hours | Unlist; investigate; if claim is substantiated, full takedown + apology + future block on artist. |
| Factual error reported | Within 24 hours | Add correction to description; if material, unlist and re-publish corrected version. |
| Generic complaint | Within 72 hours | Acknowledge; if specific grievance is identifiable, route to one of the above. |

## Operator action sequence

1. Receive complaint.
2. Locate `pipeline_runs` row by `YouTubeVideoID`.
3. Run `make takedown VIDEO_ID=...` → n8n workflow `08-takedown.json` sets video to private + writes a takedown audit row.
4. Reply to claimant within SLA confirming action.
5. Open a post-mortem note in `.moai/specs/SPEC-TROT-AUTO-001/takedowns/` referencing the run ID, root cause, and any prompt/policy change needed.
6. If a category of complaint repeats (≥3 instances of same root cause): pause publishing, update `content-policy.md`, update script-generation prompt, resume.

## Counter-notice

The operator does **not** issue counter-notices in Phase 1-3 unless:
- The claim is provably false (e.g., claimant does not own the asserted copyright).
- Operator has legal counsel review.
- Operator has personal capacity to litigate.

Default posture: comply, learn, improve. The channel's economic value is the system, not any individual video.

## Records retention

All takedown correspondence and operator actions are logged to `automation/legal/takedowns/{yyyy-mm-dd-{video_id}}.md` for at least 3 years per Korean civil-claim statute of limitations.
