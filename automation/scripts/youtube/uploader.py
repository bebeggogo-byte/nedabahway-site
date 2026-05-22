"""YouTube Data API v3 uploader.

Phase 1 skeleton. Uploads `media/<run_id>/short.mp4` with operator-default
metadata + AI disclosure flags per SPEC-TROT-AUTO-001 REQ-PUBLISH-001/002.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", "/media"))
SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
CLIENT_SECRETS = os.environ.get("YOUTUBE_CLIENT_SECRETS", "/secrets/youtube-client-secrets.json")
TOKEN_PATH = os.environ.get("YOUTUBE_TOKEN", "/secrets/youtube-token.json")
TAKEDOWN_EMAIL = os.environ.get("TAKEDOWN_EMAIL", "ops@example.com")


DISCLAIMER_TEMPLATE = """\
[AI 자동 제작]
이 영상은 공개된 트로트 관련 정보를 바탕으로 AI가 작성·합성한 콘텐츠입니다.
- 음악: 자체 생성 BGM (Suno Pro 라이선스)
- 이미지: AI 생성 일러스트 (실제 인물 사진 미사용)
- 내레이션: AI 음성 합성
- 정보 출처: {source}

저작권·초상권 관련 우려가 있으시면 {email}로 알려주시면 24시간 내 조치하겠습니다.
"""


def get_service():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    creds = None
    token_path = Path(TOKEN_PATH)
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS, SCOPES)
            creds = flow.run_local_server(port=0)
        token_path.write_text(creds.to_json())
    return build("youtube", "v3", credentials=creds)


def main() -> int:
    from googleapiclient.http import MediaFileUpload

    p = argparse.ArgumentParser()
    p.add_argument("--run", required=True)
    p.add_argument("--visibility", choices=["unlisted", "public", "private"], default="unlisted")
    args = p.parse_args()

    run_dir = MEDIA_ROOT / args.run
    video_path = run_dir / "short.mp4"
    script_path = run_dir / "script.json"
    for required in (video_path, script_path):
        if not required.exists():
            print(f"missing {required}", file=sys.stderr)
            return 2

    script = json.loads(script_path.read_text(encoding="utf-8"))
    title = script["title_candidates"][0] if script.get("title_candidates") else "트로트 소식"
    title = title[:100]
    description = DISCLAIMER_TEMPLATE.format(
        source=script["source_url"], email=TAKEDOWN_EMAIL
    ) + "\n\n#AI트로트 #AI생성 #쇼츠 " + " ".join(f"#{t}" for t in script.get("tags", [])[:8])

    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": ["AI트로트", "AI생성", "쇼츠", *script.get("tags", [])][:15],
            "categoryId": "10",
            "defaultLanguage": "ko",
            "defaultAudioLanguage": "ko",
        },
        "status": {
            "privacyStatus": args.visibility,
            "selfDeclaredMadeForKids": False,
            "containsSyntheticMedia": True,
        },
    }

    service = get_service()
    media = MediaFileUpload(str(video_path), chunksize=-1, resumable=True, mimetype="video/mp4")
    request = service.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"upload progress {int(status.progress() * 100)}%", file=sys.stderr)

    print(json.dumps({"video_id": response["id"], "visibility": args.visibility}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
