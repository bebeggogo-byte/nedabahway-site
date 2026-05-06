# SPEC-SEARCH-001 — 자료실 검색 기능

## Metadata
- **SPEC ID**: SPEC-SEARCH-001
- **Title**: 자료실 통합 검색 (Resources Search)
- **Created**: 2026-05-01
- **Status**: in-progress (live-index)
- **Status Audit**: 2026-05-06
- **Status Note**: 빌드 스크립트(`resources/_build/search_index_builder.py`)와 인덱스 파일(`resources/_data/search-index.json`) 정상 가동. 2026-05-06 재빌드로 532건 인덱싱 완료(31.2KB gzip). 잔여 작업: (1) `generated` 필드가 feed.json 값을 복사하는 버그 — REQ-S-1 stale 인디케이터 정확도 영향, (2) LaunchAgent/cron 자동 재빌드 정책 점검 필요(8일 stale 발생 = 자동 파이프라인 정지 신호), (3) 클라이언트 검색 UI 검증 미완. SPEC §4.4 경로 표기는 `_build/render_all.py`로 되어있으나 실제는 `resources/_build/search_index_builder.py` 별도 스크립트.
- **Priority**: High
- **Lifecycle Level**: spec-anchored (사이트 핵심 기능, 변경 시 동기 갱신)
- **Assigned**: expert-frontend (정적 사이트 클라이언트사이드 구현)
- **Related**: D25 자료실 IA v1, `_data/feed.json` SSoT
- **Epic**: 자료실 v2 (검색·필터·구독)

---

## 1. Environment (실행 환경)

### 1.1 기술 제약
- **GitHub Pages 정적 사이트** — 서버사이드 검색 인덱서 사용 불가
- **Python 3.9.6 + 정적 HTML/JS** — 빌드 시 검색 인덱스 사전 생성
- **외부 API 의존 금지** (구독·OAuth 외 유료 서비스 금지)
- **저용량 우선** — 인덱스 파일 ≤ 200KB gzipped

### 1.2 데이터 환경
- **소스**: `resources/_data/feed.json` (현재 585건, 6개 형식 wks·prm·gid·evd·dgn·crt)
- **공개 자료**: 24건 (visibility: public)
- **비공개**: 561건 (visibility: internal — 검색 결과에서 자동 제외)
- **갱신 주기**: 1시간 (LaunchAgent `com.nedabah.agent.site_publisher`)

---

## 2. Assumptions (가정 분석)

### 2.1 기술적 가정
| 가정 | 신뢰도 | 근거 | 위험 시 대응 |
|---|---|---|---|
| feed.json 585건 → 1만 건까지 클라이언트 검색 가능 | High | lunr.js·MiniSearch 벤치마크상 1만 건 ≤ 100ms | 5천 건 초과 시 페이지네이션 도입 |
| 한글 자모 분해 검색 필요 | High | 사용자 검색 패턴 (예: "ㄹㄷ" → "리더십") | hangul-js 라이브러리 (3KB) 사용 |
| public만 검색 (internal 자동 제외) | High | D25 운영 룰 "3계층 분리 절대 혼용 금지" | render_all.py가 build 시 internal 필터링 |
| 모바일에서도 빠른 검색 필요 | Medium | 매거진 구독자 모바일 비율 추정 60%↑ | 디바운스 200ms·결과 50건 제한 |

### 2.2 사용자 행동 가정
- 검색어 길이: 2~5자 (한글 단어)
- 핵심 검색 의도: "리더십 활동지", "AI 강의 진단지" 같은 **주제+형식 결합**
- 페이지 이탈률 임계: 결과 0건 시 50% 이탈 → 추천 자료 노출 필요

---

## 3. Requirements (EARS 형식)

### 3.1 Ubiquitous (항상 적용)

**REQ-U-1**: The system SHALL index only resources with `visibility: public` in the search index.
- 근거: D25 운영 룰 "internal·draft 자료 외부 노출 절대 금지"
- 검증: 빌드 결과 `search-index.json`에 internal 자료 0건

**REQ-U-2**: The system SHALL log all search queries to client-side analytics without PII.
- 근거: 검색 패턴 학습 → 자료 발행 우선순위 결정
- 검증: 로그에 IP·세션ID·쿠키 0건

**REQ-U-3**: The system SHALL render search UI within 100ms on initial page load.
- 근거: 사용자 이탈 방지·CLS(Cumulative Layout Shift) 최소화
- 검증: Lighthouse Performance ≥ 90

### 3.2 Event-Driven (트리거-응답)

**REQ-E-1**: WHEN user types in search input AND input length ≥ 2 characters, THEN the system SHALL display matching results within 200ms.
- 디바운스: 200ms (입력 멈춤 후 검색 실행)
- 검증: 키스트로크 → 결과 표시 P95 ≤ 300ms

**REQ-E-2**: WHEN user clicks a category filter chip, THEN the system SHALL re-filter results within 50ms without page reload.
- 8개 카테고리: ai-literacy·career·leadership·communication·burnout·parent·self-understanding·creation
- 검증: 클릭 → 결과 갱신 P95 ≤ 100ms

**REQ-E-3**: WHEN search returns 0 results, THEN the system SHALL display 3 recommended public resources sorted by `published` desc.
- 근거: 0건 이탈 방지
- 검증: 빈 결과 화면에 추천 카드 3개 노출

**REQ-E-4**: WHEN user submits search via Enter key, THEN the system SHALL update URL with `?q=검색어` query parameter for shareability.
- 근거: 검색 결과 공유·SEO 도착
- 검증: URL `/resources/?q=리더십` 직접 접근 시 결과 자동 표시

### 3.3 State-Driven (조건부)

**REQ-S-1**: IF the search index file `search-index.json` is older than 1 hour, THEN the system SHALL display a "최근 갱신: N분 전" indicator.
- 근거: 사용자 신뢰·SSoT 동기화 가시성
- 검증: 인덱스 timestamp vs 현재 시각 비교

**REQ-S-2**: IF user device is mobile (viewport width < 768px), THEN the system SHALL collapse category filters to a dropdown.
- 근거: 모바일 화면 효율
- 검증: 768px 이하 viewport에서 dropdown 노출

### 3.4 Unwanted (금지)

**REQ-N-1**: The system SHALL NOT index or display any resource with `visibility: internal` or `visibility: draft`.
- 근거: D25 비공개 결 외부 노출 차단
- 검증: 모든 internal·draft 자료 검색 결과 0건

**REQ-N-2**: The system SHALL NOT include client names, financial figures, or contract terms in indexed text.
- 근거: 비공개 키워드 자동 차단 (publisher classifier 룰 동일)
- 검증: build 시 키워드 검출기 통과

**REQ-N-3**: The system SHALL NOT make external API calls during search execution.
- 근거: 정적 사이트·구독 외 유료 서비스 금지
- 검증: Network 탭 외부 호출 0건

### 3.5 Optional (선택)

**REQ-O-1**: WHERE possible, the system SHOULD support hangul jamo search (예: "ㄹㄷㅅ" → "리더십").
- 우선순위: Medium (있으면 좋지만 1차 출시 필수 아님)
- 라이브러리: hangul-js 또는 자체 구현

**REQ-O-2**: WHERE possible, the system SHOULD highlight matched keywords in result snippets.
- 우선순위: Medium
- 구현: `<mark>` 태그 사용

---

## 4. Specifications (기술 명세)

### 4.1 검색 인덱스 구조

```json
{
  "generated": "2026-05-01T00:00:00Z",
  "schema_version": "1.0",
  "items": [
    {
      "id": "wks-2026-04-26-public-ai-1st-session",
      "title": "공공기관 AI 강의 1차시 활동지 v1",
      "summary": "...",
      "format": "wks",
      "topics": ["ai-literacy", "governance"],
      "audiences": ["instructor", "public-sector"],
      "published": "2026-04-26",
      "url": "/resources/worksheets/2026-04-26_public-ai-1st-session.html",
      "_search_text": "공공기관 AI 강의 1차시 활동지 v1 ㄱㄱㄱㄱ AI ㄱㅇ ㅇㅎㅈ ..."
    }
  ]
}
```

- `_search_text`: 한글 자모 분해 결과 사전 포함 (선택 REQ-O-1)
- 파일: `/resources/_data/search-index.json` (gzip ≤ 200KB)

### 4.2 클라이언트 검색 라이브러리
- **MiniSearch** (단일 의존성, ~10KB gzipped)
- 또는 자체 구현 (의존성 0)

### 4.3 UI 위치
- `/resources/` 페이지 상단 검색 박스 + 카테고리 칩 8개
- 결과 영역: 기존 카드 그리드 재사용

### 4.4 빌드 통합
- `_build/render_all.py`에 `build_search_index()` 함수 추가
- feed.json public 자료만 추출 → `_search_text` 생성 → `search-index.json` 출력
- LaunchAgent site_publisher가 1시간마다 재생성

---

## 5. Non-Goals (범위 외)

이번 SPEC에서 **하지 않는 것** 명시 (스코프 크리프 방지):

- ❌ 풀텍스트 자료 본문 검색 (메타·요약만 인덱싱)
- ❌ 추천 알고리즘 (단순 published desc 정렬)
- ❌ 사용자 검색 히스토리 저장
- ❌ 다국어 검색 (한국어 전용)
- ❌ 자료실 페이지네이션 변경 (별도 SPEC)
- ❌ internal/draft 자료 검색 (영구 금지)

---

## 6. Dependencies

- **선행**: 없음 (feed.json SSoT 이미 정착)
- **후속**: SPEC-SUBSCRIBE-001 (메일 구독), SPEC-RECOMMEND-001 (추천 알고리즘)
- **충돌**: render_all.py 빌드 시간 증가 (현재 ~5초 → 예상 ~7초)

---

## 7. References

- D25 자료실 IA v1 (`CLAUDE.md`)
- 자료 메타 스키마: `resources/_data/schema.json`
- EARS Format: <https://alistairmavin.com/ears/>
- MiniSearch: <https://lucaong.github.io/minisearch/>
