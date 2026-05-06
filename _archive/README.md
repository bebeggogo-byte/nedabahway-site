# _archive/

Recoverable archive for content removed from public publication.
Excluded from `sitemap.xml`, `robots.txt`, and all generated feeds.

## Layout

| Path | Origin | Reason archived |
|---|---|---|
| `perspective-future-2026-05-05/` (50 files) | `blog/perspective/2026-05-06_*` ~ `2026-06-24_*` | Future-scheduled posts beyond sustainable weekly cadence. Stage-1 plan (`product.md`: 100편 1단계 완료) reached; weekly pipeline frozen. |
| `blog-drafts/` (5 files) | `blog/drafts/` | Stale English drafts, never published. |
| `blog-perspective_old_129/` (129 files) | `blog/perspective_old_129/` | Pre-reclassification slug scheme. Replaced by current `blog/perspective/` layout. |
| `blog-perspective_archive_v2_20/` (20 files) | `blog/perspective/_archive_v2_20/` | v2 layout snapshot, superseded. |
| `blog-perspective_data-preReclass.json` | `blog/perspective/_data.preReclass.json` | Manifest from pre-reclassification phase, duplicate of `_data.json`. |

## Recovery

To resurrect any archived post:

```
git mv _archive/perspective-future-2026-05-05/<file>.html blog/perspective/<file>.html
# then rebuild manifests:
python3 _build/publish_v2.py
```

To delete permanently (after the human confirms it is no longer needed):

```
git rm -r _archive/<subdir>
```

## Notes

- Files here are kept for traceable, reversible removal — not for active reading.
- Do NOT link to anything under `_archive/` from any production page.
- New `_archive/` entries should be siblings (one folder per migration), not nested.
