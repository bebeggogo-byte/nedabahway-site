# 자동화 시스템 구성 요약

이 폴더는 활동기록·QR추천글·코칭 자동화를 위한 백엔드(Supabase) 세팅 자산을 담습니다.

## 파일

- `supabase-schema.sql` — 테이블·RLS·Storage 정책 한 번에 실행
- `../../SETUP-SUPABASE.md` — 사용자가 따라 하는 5분 가이드

## 자동화 흐름 요약

```
[강의 시작 전]
studio.html → Ctrl+Shift+R → 제목·장소·태그 입력 (1회)
  → DB: sessions row created, started_at = NOW()

[강의 중]
state = live, localStorage 에 active session 유지 (새로고침 견딤)

[강의 종료]
Ctrl+Shift+S → 사진 드롭 (1회) → ended_at + photo_url 저장
  → 사역앨범(/activities.html)에 즉시 카드로 등장 (Realtime)

[현장 추천 수집]
admin.html → QR 코드 탭 → 강의 QR 표시 (api.qrserver.com)
  → 참여자 스캔 → /recommend.html?s=<id> → 폼 작성 → DB pending row

[추천 승인]
admin.html → 대기 중 탭 → 카드 보기 → "공개로 승인" 한 번 클릭
  → status='approved', approved_at = NOW()
  → voices.html, 임베드 위젯에서 Realtime 갱신

[페이지 어디든 임베드]
<div id="testimonials"></div>
<script src="/assets/js/supabase-config.js"></script>
<script type="module" src="/assets/js/testimonials-widget.js"></script>
```

## 사람 손이 닿는 지점 (자동화의 최소 잔여 인력 행동)

1. 강의 시작: 단축키 1번 + 제목 입력 1회 = 약 5초
2. 강의 종료: 단축키 1번 + 사진 드롭 1회 = 약 5초
3. 추천 승인: 1탭 = 약 1초

이 3가지를 제외한 모든 작업(타임스탬프, photo URL, 실시간 갱신, 사이트 노출)은 자동.

## 페이지 구성

| 파일 | 용도 | 인증 |
|---|---|---|
| `activities.html` | 사역앨범 카드 그리드 (공개) | 공개 |
| `studio.html` | 단축키 기록 도구 | 본인 |
| `recommend.html?s=<id>` | QR로 받는 추천글 폼 | 공개 |
| `admin.html` | 추천글 승인 + QR 코드 | 본인 |
| `voices.html` | 받은 한 마디 모음 | 공개 |
| `assets/js/testimonials-widget.js` | 위젯 (어디든 임베드) | — |

## RLS 정책 요약

- `sessions`: 누구나 읽기, 본인(authenticated)만 쓰기
- `testimonials`: 누구나 pending insert, approved만 공개 읽기, 본인만 update
- `bio_blocks`: 누구나 읽기, 본인만 쓰기
- `session-photos` 버킷: 누구나 읽기 URL, 본인만 업로드
