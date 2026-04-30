# structure.md — nedabah.org 디렉터리 구조

## 1. Top Level

```
nedabahway-site/
├── .moai/                      # MoAI-ADK 프로젝트 메타 (2026-05-01 도입)
├── .claude/                    # Claude Code 설정·스킬
├── .github/                    # GitHub Actions·이슈 템플릿
├── .git/                       # git 메타
├── _build/                     # 빌드 스크립트 (render_all.py 등)
├── _archive_v2/                # 구버전 사이트 아카이브 (정적, 참조 전용)
├── _archive_magazine_old/      # 매거진 v1 아카이브
├── assets/                     # 이미지·폰트·아이콘
├── blog/                       # 블로그 글 (관점 노트 100편)
├── magazine/                   # 매거진 v2
├── resources/                  # 자료실 (자료 585건, SSoT)
├── deck/                       # 슬라이드 데크
├── design-lab/                 # 디자인 실험 결
├── iden/                       # IDEN 책 자료
├── learning/                   # 학습 노트
├── quant/                      # 정량 분석 모듈
├── radio/                      # 라디오 콘텐츠
├── sbm-progress.json           # SBM 관찰 Atlas 진행 상태
├── swarm/                      # 에이전트 스웜 페이지
├── trading/                    # 트레이딩 모듈
├── vault/                      # Obsidian Vault 일부 노출
├── workbook/                   # 워크북 자료
├── *.html                      # 메인 페이지 50+ (index·about·programs·magazine·learning 등)
├── CLAUDE.md                   # 사이트 운영 룰 (D25 자료실 IA·3계층 분리 등)
├── CNAME                       # GitHub Pages 도메인 (nedabah.org)
├── robots.txt                  # _console·_data·_build 차단
├── sitemap.xml                 # public 자료만
└── llms.txt                    # LLM 크롤링 안내
```

## 2. `.moai/` (MoAI-ADK)

```
.moai/
├── config/sections/            # 26개 yaml 섹션 (constitution·gate·security·...)
├── design/                     # 디자인 자산 (handoff bundle 등)
├── docs/                       # 자동 생성 문서
├── evolution/                  # SPEC 변천사·자동화 진화
├── learning/                   # 학습·교훈 누적
├── logs/                       # 빌드·실행 로그
├── manifest.json               # MoAI 매니페스트
├── project/
│   ├── product.md              # 제품 정의·사용자·가치 ✅
│   ├── structure.md            # 이 파일 ✅
│   ├── tech.md                 # 기술 스택·제약 ✅
│   ├── brand/                  # brand-voice·target-audience·visual-identity
│   └── db/                     # ERD·schema·migrations·rls-policies
├── reports/                    # 보안·성능·의존성 리포트
├── specs/
│   └── SPEC-SEARCH-001/        # 자료실 검색 SPEC ✅
│       ├── spec.md
│       ├── plan.md
│       └── acceptance.md
├── state/                      # 세션 상태·체크포인트
└── status_line.sh              # 상태 줄 표시 스크립트
```

## 3. `resources/` (자료실 — D25 SSoT)

```
resources/
├── _build/                     # 빌드 스크립트
│   ├── render_all.py           # 마스터·콘솔·changelog·sitemap·feed 통합 렌더
│   ├── validate.py             # feed.json 스키마 검증
│   ├── open_console.sh         # 로컬 콘솔 (127.0.0.1:8765)
│   └── (예정) search_index_builder.py  # SPEC-SEARCH-001
├── _data/
│   ├── feed.json               # 585건 메타 (SSoT) — public 24, internal 561
│   ├── kpi.json                # 일/주/월 KPI
│   ├── schema.json             # 자료 메타 스키마
│   └── (예정) search-index.json  # SPEC-SEARCH-001 결과물
├── _console/                   # 로컬 전용 (.gitignore + robots.txt 차단)
├── _templates/                 # 카드·페이지 템플릿
├── worksheets/    (wks)        # 활동지
├── templates/     (tpl)        # 제안서 템플릿
├── evidence/      (evd)        # 보고서·근거 자료
├── prompts/       (prm)        # 프롬프트 팩
├── diagnostics/   (dgn)        # 진단 도구
├── guides/        (gid)        # 가이드
├── curations/     (crt)        # 큐레이션
└── media-kit/     (med)        # 미디어 킷
```

## 4. `_build/` (사이트 빌드)

```
_build/
├── render_all.py               # 통합 빌드 (resources·blog·magazine·sitemap)
├── validate.py                 # 검증 게이트
└── (생성물은 각 디렉터리에 inline)
```

## 5. 데이터 흐름

### 5.1 자료 발행 흐름
```
[D1~D25 부서] → 자료 생성
   → publisher.classifier (public/showcase/private)
   → public만 resources/{format}/ + feed.json 업데이트
   → render_all.py → 마스터·콘솔·feed·sitemap 동시 갱신
   → git commit + push (LaunchAgent site_publisher 1시간 catch-up)
```

### 5.2 검색 흐름 (SPEC-SEARCH-001 도입 후)
```
[빌드 시]
feed.json (585건) → filter visibility==public → 24건
   → strip private keywords
   → build _search_text (자모 분해)
   → write search-index.json (gzip 200KB↓)

[런타임]
사용자 → /resources/ 진입
   → fetch search-index.json (≤200KB)
   → MiniSearch 인메모리 검색
   → 결과 카드 그리드 렌더 (P95 ≤300ms)
```

## 6. 외부 시스템 연결

```
[GitHub Pages]   ← git push origin main
   ↑
[로컬 repo nedabahway-site/]
   ↑
[LaunchAgent com.nedabah.agent.site_publisher] (1시간)
   ↑
[~/Scripts/agent/site_publisher/sync_and_push.py]
   ↑
[~/Scripts/agent/{D1~D25}/articles/]
```

## 7. 비공개 결 (사이트 게시 절대 금지)

```
~/Documents/Obsidian Vault/Nedabah-Brain/30_PRIVATE/
├── 클라이언트명·계약·금액
├── Daily Intel
├── KPI 원장
├── Chief 회의록
└── 미발행 자료
```

→ 이 곳에 있는 파일은 publisher.classifier가 강제로 차단함 (publisher_to_site.py 게이트키퍼).

## 8. 차단 항목 (.gitignore + robots.txt)

```
.gitignore:
- private/
- internal/
- resources/daily/
- *_PRIVATE.*
- *.private.md

robots.txt Disallow:
- /resources/_console/
- /resources/_data/
- /resources/_build/
- /resources/_templates/
```

## 9. 디렉터리 책임 매트릭스

| 디렉터리 | 책임 | 갱신 주체 | 외부 노출 |
|---|---|---|---|
| `resources/_data/` | 자료 메타 SSoT | D부서·publisher | 차단 |
| `resources/{format}/` | 공개 자료 HTML | render_all.py | 공개 |
| `magazine/` | 관점 노트 100편 | refinery_squad | 공개 |
| `blog/` | 블로그 | 수동·refinery | 공개 |
| `assets/` | 이미지·폰트 | 수동 | 공개 |
| `.moai/` | SPEC·문서 | MoAI-ADK | 차단 (gitignore 검토 필요) |
| `_archive_*` | 구버전 보존 | 동결 | 공개 (참조용) |
