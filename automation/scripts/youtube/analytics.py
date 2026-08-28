"""YouTube Analytics pull for a single video at T+48h.

Used by n8n workflow `09-performance.json`. Returns JSON to stdout.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

SCOPES = ["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/yt-analytics.readonly"]
TOKEN_PATH = os.environ.get("YOUTUBE_TOKEN", "/secrets/youtube-token.json")


def get_services():
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    return (
        build("youtube", "v3", credentials=creds),
        build("youtubeAnalytics", "v2", credentials=creds),
    )


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--video", required=True, help="YouTube video ID")
    args = p.parse_args()

    if not Path(TOKEN_PATH).exists():
        print(json.dumps({"error": f"missing {TOKEN_PATH}"}))
        return 2

    yt, ya = get_services()

    video = yt.videos().list(part="statistics,contentDetails", id=args.video).execute()
    if not video.get("items"):
        print(json.dumps({"error": "video not found"}))
        return 3
    stats = video["items"][0].get("statistics", {})

    analytics = ya.reports().query(
        ids="channel==MINE",
        startDate="2020-01-01",
        endDate="2030-12-31",
        metrics="views,estimatedMinutesWatched,averageViewDuration,subscribersGained,impressions,impressionClickThroughRate,averageViewPercentage",
        filters=f"video=={args.video}",
    ).execute()

    rows = analytics.get("rows", [[]])
    row = rows[0] if rows else [0] * 7
    views, mins_watched, avg_dur, subs, impressions, ctr, retention = (row + [0] * 7)[:7]

    out = {
        "views": int(stats.get("viewCount", views or 0)),
        "impressions": int(impressions or 0),
        "avg_view_duration_sec": int(avg_dur or 0),
        "retention_pct": float(retention or 0),
        "ctr_pct": float((ctr or 0) * 100),
        "subscribers_delta": int(subs or 0),
    }
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
