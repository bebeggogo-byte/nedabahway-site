# Disclaimer Templates

These exact strings ship with every video. Do not modify on a per-video basis without operator review.

## Video description prefix (Korean)

```
[AI 자동 제작]
이 영상은 공개된 트로트 관련 정보를 바탕으로 AI가 작성·합성한 콘텐츠입니다.
- 음악: 자체 생성 BGM (Suno Pro 라이선스)
- 이미지: AI 생성 일러스트 (실제 인물 사진 미사용)
- 내레이션: AI 음성 합성
- 정보 출처: {SOURCE_URL}

저작권·초상권 관련 우려가 있으시면 {TAKEDOWN_EMAIL}로 알려주시면 24시간 내 조치하겠습니다.
```

## Burned-in watermark

Position: upper-right, 8% video height, 60% opacity white text with 1px black outline.

Text: `AI 생성 콘텐츠`

## YouTube AI-disclosure toggle

In YouTube Studio upload settings, under "Altered content", select:
- **"Yes — synthetic voice"**
- **"Yes — AI generated or computer modified scenes"**

Set `altered_content=synthetic` in API upload metadata.

## Hashtags (always-on)

`#AI트로트 #AI생성 #쇼츠`

Plus per-video topical hashtags up to a total of 15.

## Title constraints

- Max 100 characters.
- No clickbait verbs ("충격", "단독", "절대 안 본 사람만").
- Artist name use restricted to factual, neutral mentions (no defamatory framing).

## Channel-level "About" required text

```
이 채널은 트로트 관련 공개 정보를 AI로 가공·합성하여 제공합니다.
- 모든 BGM은 자체 생성 (Suno Pro)
- 모든 이미지는 AI 일러스트
- 모든 내레이션은 AI 음성

저작권·초상권 문의: {TAKEDOWN_EMAIL}
운영자: {OPERATOR_NAME}
```

`{...}` placeholders are replaced by `automation/scripts/youtube/uploader.py` at upload time from `.env`.
