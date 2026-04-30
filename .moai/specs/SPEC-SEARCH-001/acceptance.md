# SPEC-SEARCH-001 — Acceptance Criteria

## 검증 형식
모든 시나리오는 **Given-When-Then** 형식이며 객관적·관찰 가능한 결과만 기준으로 한다.

---

## A. Normal Cases (정상 흐름)

### AC-N-1: 기본 검색
- **Given** 자료실 마스터 페이지(`/resources/`)가 로드되어 있고
- **When** 사용자가 검색 박스에 "리더십"을 입력하면
- **Then** 200ms 이내에 `topics: leadership` 또는 title/summary에 "리더십" 포함 자료 카드가 표시된다.
- **검증**: Playwright 측정, P95 ≤ 300ms

### AC-N-2: 카테고리 필터
- **Given** 검색 결과 12건이 표시된 상태에서
- **When** 사용자가 "ai-literacy" 카테고리 칩을 클릭하면
- **Then** 50ms 이내에 ai-literacy topic 자료만 남는다.
- **검증**: 클릭 → DOM 갱신 P95 ≤ 100ms

### AC-N-3: URL 공유
- **Given** 사용자가 `/resources/?q=리더십` URL로 직접 접근하면
- **When** 페이지 로드가 완료되면
- **Then** 검색 박스에 "리더십"이 자동 입력되고 결과가 표시된다.
- **검증**: 직접 접근 시 검색 박스 value="리더십" + 결과 ≥ 1건

### AC-N-4: Enter 키 검색
- **Given** 사용자가 검색 박스에 "AI 진단"을 입력하고
- **When** Enter 키를 누르면
- **Then** URL이 `?q=AI+%EC%A7%84%EB%8B%A8`으로 갱신되고 결과가 표시된다.
- **검증**: `window.location.search` === expected query string

---

## B. Error Cases (오류 흐름)

### AC-E-1: 0건 결과 추천
- **Given** 자료에 없는 단어 "양자물리학"을 검색하면
- **When** 결과 0건이 반환되면
- **Then** "검색 결과가 없습니다" 메시지 + 추천 자료 3건(published desc)이 표시된다.
- **검증**: DOM에 `.empty-state` + `.recommendation-card` × 3

### AC-E-2: 짧은 검색어
- **Given** 사용자가 검색 박스에 "리"(1글자)를 입력하면
- **When** 200ms 디바운스가 끝나면
- **Then** 검색이 실행되지 않고 "2글자 이상 입력해주세요" 안내가 표시된다.
- **검증**: 검색 실행 0회 + hint 메시지 노출

### AC-E-3: 인덱스 로드 실패
- **Given** `search-index.json` 네트워크 오류 발생 시
- **When** 사용자가 검색을 시도하면
- **Then** "검색 인덱스를 불러오지 못했습니다. 새로고침해주세요" 메시지가 표시된다.
- **검증**: fetch 실패 → fallback UI 노출 + 페이지 크래시 0건

---

## C. Edge Cases (경계 조건)

### AC-EC-1: 특수문자 검색
- **Given** 사용자가 "C++" 또는 "@자활" 같은 특수문자 검색어를 입력하면
- **When** 검색이 실행되면
- **Then** 정규식 에러 없이 안전하게 처리된다.
- **검증**: 콘솔 에러 0건 + 결과 정상 반환 또는 0건 화면

### AC-EC-2: 매우 긴 검색어
- **Given** 사용자가 100자 이상의 문자열을 입력하면
- **When** 검색이 실행되면
- **Then** 50자에서 truncate되고 "검색어가 너무 깁니다" 안내가 표시된다.
- **검증**: 검색어 길이 ≤ 50자

### AC-EC-3: 빈 입력
- **Given** 사용자가 검색 박스를 비우면
- **When** 검색 상태가 초기화되면
- **Then** 전체 카테고리 카드 그리드가 다시 표시된다.
- **검증**: 결과 카드 = public 자료 전체 또는 카테고리 페이지 기본 상태

### AC-EC-4: 모바일 반응형
- **Given** viewport 너비가 360px(아이폰 SE)인 환경에서
- **When** 자료실 페이지를 열면
- **Then** 카테고리 칩이 dropdown으로 변환되어 화면 밖으로 넘치지 않는다.
- **검증**: `<select>` 또는 collapsed UI 노출 + 가로 스크롤 0px

---

## D. Security Cases (보안)

### AC-S-1: internal 자료 노출 차단
- **Given** feed.json에 visibility=internal 자료 561건이 있을 때
- **When** 빌드된 `search-index.json`을 검사하면
- **Then** internal 자료의 id·title·content가 0건 포함된다.
- **검증**: `python3 _build/check_index_visibility.py` 통과 (internal count == 0)

### AC-S-2: 클라이언트 정보 노출 차단
- **Given** 비공개 키워드 (예: "제주광역자활센터", "₩500,000", "계약")가 자료 메타에 포함될 때
- **When** 빌드 키워드 검출기가 실행되면
- **Then** 해당 자료는 자동 internal 분류되어 인덱스에서 제외된다.
- **검증**: 키워드 검출기 통과 + 인덱스 매칭 0건

### AC-S-3: 외부 API 호출 0건
- **Given** 사용자가 검색을 실행할 때
- **When** Network 탭을 모니터링하면
- **Then** 외부 도메인 호출이 0건이며 자체 도메인 fetch만 발생한다.
- **검증**: Chrome DevTools Network 탭 외부 호출 = 0

### AC-S-4: XSS 방어
- **Given** 사용자가 `<script>alert(1)</script>` 검색어를 입력하면
- **When** 결과가 렌더링되면
- **Then** 스크립트가 실행되지 않고 안전하게 escape된 문자열로 표시된다.
- **검증**: 스크립트 실행 0건 + 화면에 텍스트로 표시

---

## E. Performance Cases (성능)

### AC-P-1: 초기 로드
- **Given** 새로운 사용자가 자료실에 처음 접근하면
- **When** 페이지 로드가 완료되면
- **Then** Lighthouse Performance Score ≥ 90이다.
- **검증**: Lighthouse CI Performance ≥ 90

### AC-P-2: 검색 응답 시간
- **Given** 인덱스가 메모리에 로드된 상태에서
- **When** 100회 검색을 반복하면
- **Then** P95 응답 시간 ≤ 300ms이다.
- **검증**: Playwright 시나리오로 측정

### AC-P-3: 인덱스 파일 크기
- **Given** public 자료 1,000건 확장 가정에서
- **When** `search-index.json`을 빌드하면
- **Then** gzip 후 파일 크기 ≤ 200KB이다.
- **검증**: `wc -c < search-index.json.gz` ≤ 200000

---

## F. Quality Gates

### Build-time 검증
- [ ] `_build/render_all.py` 1회 실행 → search-index.json 자동 생성
- [ ] internal·draft 자료 인덱스에 0건
- [ ] 비공개 키워드 검출기 통과
- [ ] 인덱스 schema_version 명시

### Runtime 검증
- [ ] 모든 EARS REQ 자동 테스트 통과
- [ ] 콘솔 에러 0건
- [ ] 외부 API 호출 0건

### TRUST 5 검증
- [ ] **T**est: 단위 테스트 80%↑ + E2E 시나리오 8개 이상
- [ ] **R**eadable: 함수당 ≤30줄·docstring·타입 힌트
- [ ] **U**nified: 기존 _build 패턴 준수
- [ ] **S**ecure: AC-S-1~S-4 모두 통과
- [ ] **T**rackable: 모든 commit에 SPEC-SEARCH-001 참조

---

## G. Definition of Done

이 SPEC은 다음을 모두 만족할 때 **DONE**으로 간주한다:

1. ✅ 모든 EARS 요구사항(REQ-U-1~3, E-1~4, S-1~2, N-1~3) 자동 테스트 통과
2. ✅ Acceptance Criteria A·B·C·D·E 시나리오 100% 통과
3. ✅ Quality Gates F 항목 모두 체크
4. ✅ `/moai:3-sync SPEC-SEARCH-001` 실행 → CHANGELOG·README 동기화
5. ✅ PR 머지·main 배포·실제 사이트 검색 동작 확인
