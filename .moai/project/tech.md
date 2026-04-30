# tech.md — nedabah.org 기술 스택·제약·Constitution

## 1. 호스팅·배포

| 항목 | 값 |
|---|---|
| 호스팅 | GitHub Pages (정적) |
| 도메인 | `nedabah.org` (CNAME) |
| 배포 | `git push origin main` (자동) |
| CDN | GitHub Pages 기본 |
| HTTPS | GitHub 자동 |

## 2. 코드 베이스

| 영역 | 기술 |
|---|---|
| 페이지 | 정적 HTML5 + 인라인 CSS + Vanilla JS |
| 빌드 | Python 3.9.6 (`_build/render_all.py`) |
| 템플릿 | Jinja2 (선택) / Python f-string |
| 데이터 | JSON (`feed.json` SSoT) |
| 콘솔 | Python `http.server` 로컬 (127.0.0.1:8765) |

## 3. 자동화·인프라 (Mac M4 32GB)

| 영역 | 기술 |
|---|---|
| OS | macOS Darwin 25.3.0 |
| Python | 3.9.6 (system) |
| LaunchAgent | `com.nedabah.agent.*` (10+ 등록) |
| Whisper | `whisper.cpp` large-v3 |
| AI 도구 | Claude Code 구독 (CLI), Claude Desktop |
| MoAI-ADK | 2.14.0 (Go 단일 바이너리, ~/.local/bin/moai) |

## 4. 개발 도구 — 관리자 모드 (이번 도입)

### 4.1 MoAI-ADK Constitution
SPEC 작성 시 모든 기능은 다음을 준수해야 한다:

```yaml
language: ko-KR
tech_stack:
  hosting: github-pages
  static_runtime: html5+vanilla-js
  build: python3.9
  ai_runtime: claude-code-cli
naming_conventions:
  files: kebab-case (예: search-index-builder.py)
  python_functions: snake_case
  js_functions: camelCase
  yaml_keys: snake_case
forbidden:
  - 외부 유료 API (구독 외 일체 금지)
  - 서버사이드 의존성
  - 트래커·광고 SDK
  - 외부 폰트 호스팅 (CDN 외)
  - 동적 import 라이브러리 (Webpack 등)
architectural_patterns:
  data_flow: SSoT (feed.json 단일 진실 원천)
  build_pattern: render_all.py 단일 진입점
  visibility_layers: public / internal / draft (절대 혼용 금지)
  classifier_gate: publisher classifier 통과 필수
security:
  external_api_calls: 0 (정적 사이트)
  pii_handling: 클라이언트 정보 인덱싱·노출 차단
  hag_required: 외부영향 7종 (이메일·메시지·공개게시·결제·계약·실물·공유)
  private_keyword_blocklist:
    - 클라이언트명 (예: 제주광역자활센터)
    - 금액·견적·계약·수임료
    - 운영 약점 키워드 (미인증·실패·오류·리스크)
logging:
  format: 구조화 JSON 로그 (LaunchAgent 로그)
  pii: 0 (IP·세션·쿠키 0건)
```

## 5. 의존성 (Allowed Libraries)

### 5.1 Python (`_build/`)
- `json`, `pathlib`, `datetime`, `re`, `gzip` (stdlib)
- `Jinja2` (템플릿, 선택)
- `python-frontmatter` (markdown 메타 파싱)
- ❌ `requests`, `beautifulsoup4`, `lxml` (외부 API 금지·정적이라 불필요)

### 5.2 JavaScript (클라이언트)
- **Vanilla JS** (의존성 0 우선)
- 허용: `MiniSearch` (~10KB, 단일 의존성, SPEC-SEARCH-001)
- 허용 (선택): `hangul-js` (~3KB, REQ-O-1)
- ❌ React·Vue·Angular (정적 사이트 부적합)
- ❌ jQuery (의존성 부담)

### 5.3 폰트
- 시스템 폰트 우선
- 허용: GitHub 호스팅 webfont (CDN 의존성 0)
- ❌ Google Fonts CDN (개인정보 우려)

## 6. 보안 표준

### 6.1 OWASP 적용
- **A01 권한 깨짐**: SSoT visibility 게이트 (3계층)
- **A02 암호화 실패**: 외부 폼은 HTTPS만, 결제·계약은 외부 시스템 위임
- **A03 인젝션**: 검색 입력 escape (XSS 방어 — AC-S-4)
- **A07 인증 실패**: 사이트는 인증 없음 (정적 공개), 콘솔만 로컬 바인딩

### 6.2 비공개 키워드 자동 차단
publisher classifier가 다음을 자동 검출하여 internal 분류:
- 클라이언트·기관명
- 금액·견적·계약·수임료
- "미인증·실패·오류·리스크" 등 운영 약점
- 미발행 자료·내부 회의록·KPI 수치

### 6.3 PII 보호
- 검색·분석 로그에 PII 0건
- IP·세션ID·쿠키 사용 금지
- 클라이언트사이드 분석은 익명 카운트만

## 7. 성능 표준

| 지표 | 목표 |
|---|---|
| Lighthouse Performance | ≥ 90 |
| First Contentful Paint | ≤ 1.5s |
| Largest Contentful Paint | ≤ 2.5s |
| Cumulative Layout Shift | ≤ 0.1 |
| 검색 응답 P95 | ≤ 300ms (SPEC-SEARCH-001) |
| 인덱스 파일 (gzip) | ≤ 200KB |

## 8. 접근성 (WCAG 2.1 AA)

- 키보드 내비게이션 100% 지원
- ARIA 라벨·랜드마크
- 색 대비 ≥ 4.5:1 (텍스트), ≥ 3:1 (UI)
- 폼 라벨 명시
- 스크린 리더 호환

## 9. Git 컨벤션 (Conventional Commits)

```
feat(search): SPEC-SEARCH-001 자료실 통합 검색 추가
fix(resources): feed.json 스키마 검증 누락 수정
docs(spec): SPEC-SEARCH-001 acceptance criteria 보강
chore(build): render_all.py 검색 인덱스 빌더 통합
```

## 10. 빌드·검증 게이트 (TRUST 5)

신규 기능 추가 시 다음을 모두 통과해야 머지 가능:

- **T (Test)**: 단위 테스트 80%↑, E2E 핵심 시나리오 8개↑
- **R (Readable)**: 함수당 ≤30줄, 타입 힌트, docstring
- **U (Unified)**: 기존 _build·SSoT 패턴 준수
- **S (Secure)**: OWASP·PII·비공개 키워드 게이트 통과
- **T (Trackable)**: 모든 commit·PR에 SPEC-XXX 참조

## 11. 외부 시스템 통합

| 시스템 | 용도 | 비밀번호·키 처리 |
|---|---|---|
| GitHub | 소스·Pages | gh CLI OAuth |
| Cloudflare DNS | 도메인 | 외부 API 호출 0 |
| Google Calendar | 강의 일정 | 사용자 직접 로그인 (Claude 자동 로그인 금지) |
| Gmail | 사업 메일 | Chrome MCP 탭 |
| Whisper | 전사 | 로컬 실행 (외부 전송 0) |
| Obsidian Vault | 비공개 자료 | 로컬 + iCloud 동기화 |

## 12. 절대 금지 (Forbidden)

| 금지 | 이유 |
|---|---|
| 외부 유료 API (Anthropic API 키 포함) | 구독 외 사용 금지 |
| 서버사이드 로직 | GitHub Pages 정적 |
| 트래커·광고 SDK | 사용자 프라이버시 |
| 클라이언트 정보 사이트 게시 | D25 비공개 키워드 차단 |
| 동적 import 라이브러리 (Webpack·Rollup 등) | 정적 빌드 단순성 |
| Playwright/Chromium NLM 자동화 | 영구 금지 (2026-04-17) |
| 임의 계정 전환·자동 로그인 | 사용자 직접 로그인 원칙 |

## 13. 진행 중 결정 사항 (Open Questions)

- [ ] MoAI `.moai/` 디렉터리 .gitignore 등록 여부 (SPEC·내부 메모는 비공개 가능성)
- [ ] 검색 인덱스 분할 임계 (자료 1만 건 도달 시 페이지네이션)
- [ ] 한글 자모 검색 라이브러리 (hangul-js vs 자체 구현) — REQ-O-1

## 14. References

- D25 자료실 IA v1 운영 룰: `CLAUDE.md`
- 글로벌 영구 지침: `~/.claude/CLAUDE.md`, `~/.claude/projects/-Users-thxjx365/memory/MEMORY.md`
- MoAI-ADK 문서: <https://github.com/modu-ai/moai-adk>
- EARS Format: <https://alistairmavin.com/ears/>
- TRUST 5 Framework: MoAI-ADK foundation-quality
