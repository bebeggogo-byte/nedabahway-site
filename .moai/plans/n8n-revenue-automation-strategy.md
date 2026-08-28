# n8n 수익 자동화 전략 — 영상 분석 → nedabah.org 적용

Status: DRAFT
작성일: 2026-05-22
브랜치: claude/n8n-automation-revenue-vRfi4
대상 프로젝트: nedabahway-site (nedabah.org)
근거 출처:
- 영상: "현장속으로" 채널, 남시우 ('백수 아빠') 운영자 — 사용자가 제공한 요약본 (영상 직접 페치 불가, YouTube 403)
- 사이트 컨텍스트: `.moai/project/product.md`, `.moai/project/tech.md`, `.moai/strategy/site-strategy.yaml`, `.moai/plans/funnel-100-master-plan.md`

이 문서는 영상 인사이트를 nedabah.org의 제약·정체성·펀넬 위에 정직하게 매핑한 plan-레벨 전략서다. 코드 구현·SPEC 작성은 포함하지 않는다. 후속 단계에서 `/moai plan` → SPEC 도출 → `/moai run` 구현으로 이어진다.

---

## 0. 사전 정직성 (Honesty Pre-amble)

이 문서가 의존하는 정보의 출처와 한계를 먼저 명시한다.

| 항목 | 상태 | 비고 |
|---|---|---|
| 영상 직접 페치 | ❌ 실패 | YouTube `HTTP 403 Forbidden` — WebFetch 차단. WebSearch로 영상 ID `_E7uNuZ8m8g` 직접 매칭도 실패 |
| 영상 내용 출처 | 사용자 제공 요약본 (1차 검증된 텍스트) | 영상에서 "n8n"이라는 특정 툴명은 미언급. 사용자는 "AI 자동화 프로그램"으로 서술 |
| "n8n" 도구 선택 | 사용자 의도에 따라 매핑 | 영상의 일반 자동화 패턴 → n8n 셀프호스트로 구체화한 것은 본 문서의 결정 |
| nedabah.org 제약 | `.moai/project/tech.md` Constitution + `product.md` HAG 7종 | 단단한 fixed input |
| 영상의 수익 수치 (1,500만/월 등) | 영상 출연자 자가 신고치 | 본 전략에서는 참고용 직관일 뿐, KPI 목표로 차용하지 않음 |

**판단 원칙**: 영상 인사이트와 nedabah.org 제약·정체성이 충돌할 때, 항상 **사이트 제약·정체성 우선**한다. 영상은 자극·발상의 재료이지 청사진이 아니다.

---

## 1. 영상 분석 요약

### 1.1 영상의 핵심 주장 (한 줄)

자본력과 시간이 많은 5070 세대를 정확히 타게팅하고, AI 자동화로 트로트 콘텐츠를 9개 YouTube 채널 + 인터넷 신문사 + 네이버 블로그 + Instagram + TikTok에 동시 발행하여 1인 운영으로 월 3,000만 원 이상의 순수익을 발생시킨다.

### 1.2 영상의 운영 모델 (출연자 자가 신고치)

| 항목 | 영상 신고치 |
|---|---|
| 운영 채널 | YouTube 9개 + 인터넷 신문사 1개 + 네이버 블로그 + Instagram + TikTok |
| 일일 발행량 | 쇼츠 50개 + 기사·블로그·SNS 포함 **총 200개/일** |
| 일일 작업 시간 | **2시간** |
| 월 AdSense 수익 | 약 1,500만 원 |
| 월 총 순수익 | 최소 3,000만 원 |
| 타겟 시장 규모 | 5070 시니어 16.8조 원 |
| 수강생 평균 성과 | 채널당 90~120만 원/월 (한 달 안에) |
| 지인 부업 성과 | 골프 프로 200~300만 원/월 |

### 1.3 영상에서 식별된 워크플로우 3종

**WF-A. 뉴스 기사 자동화**
```
스케줄·키워드 입력
  → AI 뉴스 수집·정리
  → Notion 저장
  → 인터넷 신문사 자동 등록
  → 네이버 블로그 자동 포스팅
```

**WF-B. 유튜브 쇼츠 자동화**
```
Notion 기사 데이터
  → AI 쇼츠 스크립트 작성
  → AI 썸네일·음원 생성
  → CapCut 자동 편집 (효과·가사 싱크)
  → YouTube 자동 업로드
```

**WF-C. SNS 카드뉴스 자동화**
```
이슈 클릭 (사람 트리거)
  → AI 텍스트 정리·이미지 생성
  → Instagram·TikTok 카드뉴스 변환
  → 자동 배포 (약 21초)
```

### 1.4 영상에서 식별된 외부 서비스

Notion · CapCut · Naver · Instagram · TikTok · YouTube · 인터넷 신문사 플랫폼 · (이름 미언급) AI 텍스트·이미지·음원 API.

### 1.5 영상의 수익 모델 분류

- 콘텐츠 자동화 (AdSense + 광고 협찬)
- 강의·교육 (자동화 노하우, 프롬프트 판매)
- (예정) K-트로트 전문 앱 플랫폼 (2026)

---

## 2. 호환성 매트릭스 (영상 ↔ nedabah.org)

영상의 각 요소를 nedabah.org의 6대 제약과 정면 충돌·정합·중립으로 분류한다.

### 2.1 nedabah.org 6대 제약 (요약)

| # | 제약 | 출처 |
|---|---|---|
| C1 | GitHub Pages 정적 사이트 — 서버 사이드 없음 | tech.md §1 |
| C2 | 외부 유료 API 금지 (구독 외 일체) | tech.md §4.1 forbidden |
| C3 | 트래커·광고 SDK 금지 | tech.md §4.1 forbidden |
| C4 | 외부영향 7종 (이메일·메시지·공개게시·결제·계약·실물·공유) HAG 승인 필수 | product.md §6 |
| C5 | 비공개 키워드 자동 차단 (클라이언트명·금액·계약·운영 약점) | tech.md §4.1 security |
| C6 | 신뢰의 두께 정체성 — 양보다 결, 박리다매 금지 | product.md §3 핵심 가치 |

### 2.2 항목별 판정

| 영상 요소 | 판정 | 사유 |
|---|---|---|
| 원소스 멀티유즈 (1 입력 → N 채널) | 🟢 GREEN | 이미 `feed.json` SSoT + `render_all.py` 1회 호출이 동일 철학. 강화·확장만 하면 됨 |
| 페르소나 × 그 세대 채널 정확 매칭 | 🟢 GREEN (원리 차용) | nedabah 페르소나마다 매체 다름: 진로교사→공문·교육청·교사커뮤니티, 30-40대 이직자→LinkedIn·블라인드, 1인 사업자→네이버블로그·브런치 |
| 중앙 큐 = Notion | 🟢 GREEN (대체) | `resources/_data/feed.json`이 이미 그 역할. 별도 Notion 도입 불필요 |
| AI 자동 변환 (1편 → 쇼츠/카드뉴스) | 🟡 AMBER | Claude Code CLI 구독 안에서만 가능. 외부 AI 유료 API는 C2 위반 |
| n8n 셀프호스트 on Mac M4 | 🟢 GREEN | OSS, 비용 0. LaunchAgent 10+ 인프라와 자연 통합 |
| YouTube/Instagram/TikTok 자동 업로드 | 🟡 AMBER | C4 "공개 게시" HAG 게이트 필수. **자동 초안 생성**까지만 OK, **자동 발행**은 금지. 사람 승인 후 발송 |
| 자동 이메일 발송 (구독자 follow-up) | 🟡 AMBER | C4 "이메일 발송" HAG 게이트 필수. 자동 초안 + 인간 승인 패턴만 가능 |
| 자동 결제·정산 연동 | 🟡 AMBER | C4 "결제·정산" HAG 게이트 필수. 자동 신청 접수까지만 OK, 자동 청구는 금지 |
| 트로트 매거진 박리다매 모델 | 🔴 RED | C6 정체성 정반대. nedabah는 "신뢰 두께 → 고가 코칭 전환" |
| AdSense / 광고 협찬 수익 | 🔴 RED | C3 광고 SDK 금지. 광고 협찬도 사이트 정체성 외 (1인 교육 작업실) |
| 인터넷 신문사 운영 | 🔴 RED | 비즈니스 정체성 불일치 (교육·코칭 1인) |
| 하루 200개 콘텐츠 발행 | 🔴 RED | C6 "신뢰 두께 = 한 편 한 편의 결" 가치관과 정면 충돌 |
| 클라이언트명·금액 자동 노출 | 🔴 RED | C5 비공개 키워드 자동 차단 (publisher classifier 통과 필수) |
| Notion에 클라이언트 데이터 저장 | 🟡 AMBER | 비공개 데이터는 로컬·암호화·private layer만 허용. Notion 클라우드 동기화 시 PII 유출 위험 |
| CapCut 영상 자동 편집 | ⚪ 중립 (현재 비적용) | nedabah 현재 영상 콘텐츠 없음. 미래 도입 시 재검토 |
| 캡션 자동 SNS 카드뉴스 | 🟡 AMBER | 매거진 1편 → 카드뉴스 초안 생성까지 GREEN. 자동 발행은 C4 HAG 필요 |

### 2.3 핵심 한 줄 변환

영상의 본질은 *"AI 자동화 = 콘텐츠 박리다매 광고 수익"* — nedabah의 본질은 *"AI 자동화 = 신뢰 두께 누적 → 고가 코칭 전환 펀넬"*. 영상의 **기술 구조는 차용 가능**, **수익 모델은 폐기**한다.

---

## 3. 차용 가능한 5가지 원리

영상에서 nedabah.org에 옮겨도 정합한 원리만 추출한다.

### 원리 1. 원소스 멀티유즈 (One-Source Multi-Use)

영상: 1 트로트 이슈 → 9 채널 동시 발행.

nedabah 적용: 매거진 1편 (= 신뢰 두께의 기본 단위) → **자체 사이트 매거진 페이지 + 뉴스레터 + 네이버 블로그 초안 + LinkedIn 초안 + 카드뉴스 초안 + llms.txt 색인**. 발행은 사람 승인.

기존 자산과의 정합: `feed.json` SSoT + `render_all.py` 1회 호출 패턴이 이미 같은 철학. 본 전략은 그 출력 채널 수를 늘리는 일.

### 원리 2. 페르소나 × 매체 정확 일치

영상: 5070 → YouTube·트로트.

nedabah 적용: 다섯 코칭 페르소나별 매체 분리 발행.

| 프로그램 | 페르소나 | 우선 매체 |
|---|---|---|
| STARCP 마스터 | 현직 취업 컨설턴트 | LinkedIn 게시물 + 자체 뉴스레터 |
| IDEN 좌표 마스터 (진로교사) | 진로전담교사 | 교사 커뮤니티·교육청 공문 양식 + 네이버 블로그 |
| IDEN 진로 재설계 (이직·전직) | 30-40대 직장인 | LinkedIn + 브런치 + 뉴스레터 |
| 창직·1인 사업자 1:1 | 자기 길 찾는 30-50대 | 네이버 블로그 + 카카오 오픈채팅 + 자체 매거진 |
| 5S 리더십 마스터 | 팀장·신임 임원 | LinkedIn + 자체 뉴스레터 (B2B 톤) |

원리: 같은 매거진 1편이라도 매체별로 다른 톤·길이·CTA를 가진 초안을 자동 생성한다. **자동 발행은 안 함**.

### 원리 3. 중앙 큐 (Notion 역할 = `feed.json` SSoT)

영상: Notion이 모든 콘텐츠의 중앙 데이터베이스.

nedabah 적용: 별도 Notion 도입 **금지**. `resources/_data/feed.json` 이 이미 SSoT이며, `_build/render_all.py`가 인덱스를 재생성한다. n8n 워크플로우는 **이 파일을 트리거·입력·출력**으로 사용한다. 새 큐 도입은 SSoT 원칙 위반.

### 원리 4. AI 자동 변환 (텍스트 → 다형식)

영상: AI 텍스트 작성·이미지 생성·음원·영상 편집.

nedabah 적용: **Claude Code CLI 구독 안에서만** AI 호출. 외부 OpenAI/Anthropic 직접 API 호출 금지 (C2).
- 매거진 1편 (long-form) → 쇼츠 스크립트 초안 (60초 분량)
- 매거진 1편 → 카드뉴스 5장 텍스트 초안
- 매거진 1편 → LinkedIn 포스트 초안 (3가지 톤)
- 자료실 신규 자료 → 자료 설명문 초안 + 메타 태그

이미지·음원·영상 생성은 **현 단계 도입 제외** (외부 API 비용 + C2 위반 위험). 텍스트 변환만 우선.

### 원리 5. 2시간 운영 = 자동 잡 + 인간 승인 게이트

영상: 하루 2시간 작업.

nedabah 적용: **이미 그 구조**다. LaunchAgent 10+가 자동 잡, publisher classifier가 게이트, HAG 7종이 사람 승인 지점. n8n은 그 위에 **시각화 + 다채널 초안 생성 + KPI 집계** 역할로 들어간다.

원리 운영: 1인 운영자가 하루 2시간 안에 처리해야 하는 결정 (게시 승인·이메일 승인·새 SPEC 작성) **외에 모든 결정 가지 치기**는 n8n 자동 잡으로 떨어진다.

---

## 4. nedabah 맞춤 n8n 워크플로우 5종

영상의 패턴에서 nedabah 제약을 통과하는 것만 골라 5종 워크플로우로 구체화한다. 각 워크플로우는 **트리거 → 노드 흐름 → 출력 → HAG 게이트 → 의존 → 평가 기준** 형식.

### W1. 매거진 신규 발행 → 다채널 초안 자동 생성

**목적**: 매거진 1편이 추가되면 5개 매체의 게시 초안을 자동 생성하여 사람 승인 큐에 올린다. 발행은 사람 승인.

**트리거**: `magazine/` 디렉토리에 새 `.html` 또는 `.md` 추가 (파일 시스템 watcher 노드).

**노드 흐름**:
```
[Local File Watch: magazine/*.{html,md}]
  → [Read File + Front-matter Parse]
  → [Validate via publisher classifier]
      └─ 비공개 키워드 검출 시 [STOP + Log]
  → [Branch by Persona Tag]
      ├─ teacher → [Generate: 네이버 블로그 초안 + 교사 커뮤니티 포스트 톤]
      ├─ career → [Generate: LinkedIn 초안 3안 + 브런치 톤]
      ├─ consultant → [Generate: LinkedIn 톤 + 뉴스레터 섹션]
      ├─ founder → [Generate: 네이버 블로그 초안 + 카카오 오픈채팅 안내문]
      └─ leadership → [Generate: LinkedIn B2B 톤 + 뉴스레터 헤드라인]
  → [Write Drafts to `.moai/drafts/{date}/{persona}/`]
  → [Append to HAG-pending queue: `.moai/state/hag-pending.json`]
  → [Local Notification: 'N drafts ready for review']
```

**출력**: `.moai/drafts/YYYY-MM-DD/{persona}/{channel}.md` 파일 N개 + HAG 큐 엔트리.

**HAG 게이트**: 모든 외부 매체 게시는 사람이 `.moai/drafts/` 검토 후 `moai-hag approve <draft-id>` CLI로 승인. 자동 발행 금지.

**의존**:
- Claude Code CLI 구독 (텍스트 생성)
- 기존 publisher classifier (Python, 이미 존재)
- LaunchAgent `com.nedabah.agent.site_publisher`와 충돌 없음 (n8n은 별도 큐에 쌓기만)

**평가 기준 (DoD)**:
- 새 매거진 1편 추가 후 5분 안에 5개 채널 초안 생성
- 비공개 키워드 포함 시 100% 차단
- 초안 품질: 사람이 5분 내 검토·승인 가능한 수준 (수정 < 30%)

**S 펀넬 매핑**: S2 (무료 가치) + S3 (무료 홍보 확산) — funnel-100 가중치 0.15+0.15 = 0.30 영향.

### W2. 자료실 신규 자료 → 검색·색인·llms.txt 자동 동기화

**목적**: 신규 자료가 `resources/` 에 추가되면 검색 인덱스·sitemap·llms.txt·feed.json 메타를 단일 트리거로 일관 갱신.

**현재 상태**: `_build/render_all.py` 1회 호출이 이미 그 일을 한다. 본 워크플로우는 **그 호출을 자동 트리거화**하고 **검증 게이트**를 덧붙인다.

**트리거**: `resources/` 디렉토리 변경 (파일 추가·메타 변경).

**노드 흐름**:
```
[Local File Watch: resources/**/*.{json,md}]
  → [Debounce 60s] (다중 변경 묶음 처리)
  → [Run: python _build/render_all.py]
      └─ exit code != 0 → [STOP + Log + Notify operator]
  → [Validate: sitemap.xml well-formed]
  → [Validate: llms.txt under size budget]
  → [Validate: feed.json schema check]
  → [Diff: changed URLs since last run]
  → [Update: search index incremental]
  → [Git commit + push] (LaunchAgent site_publisher 흐름 재사용)
  → [Local KPI: 자료 카운터 +1]
```

**출력**: sitemap.xml, llms.txt, llms-full.txt, feed.json, search index — 일관 갱신. git commit 1건.

**HAG 게이트**: 없음. 내부 빌드 결과물은 외부영향 7종 외.

**의존**:
- `_build/render_all.py` (이미 존재, 수정 없음)
- LaunchAgent `com.nedabah.agent.site_publisher` (1시간 catch-up — n8n과 이중 안전망)

**평가 기준 (DoD)**:
- 자료 추가 후 90초 안에 sitemap·llms.txt 반영
- render_all 실패 시 사이트는 이전 상태 유지 (no broken state)
- 한 트리거 = 한 커밋 (atomic)

**S 펀넬 매핑**: S1 (발견 가능성) — funnel-100 가중치 0.20 직접 기여. SEO·AI 크롤러·sitemap·llms.txt 모두 S1 자산.

### W3. 무료 코칭 진단 신청자 알림 + 24h Follow-up 초안

**목적**: 다섯 코칭 랜딩 페이지의 무료 30분 진단 신청이 들어오면 운영자에게 즉시 알림 + 24시간 후 follow-up 이메일 **초안**을 자동 생성.

**현실 제약**: nedabah는 정적 사이트 (C1). 신청 form은 외부 폼 서비스 (Tally·Google Forms 등 구독제) 또는 mailto 링크 사용 중일 가능성. 본 워크플로우는 **그 결과를 받아서 처리**하는 후속 단계.

**트리거**: 폼 서비스 webhook → n8n incoming webhook (Tally·Google Forms·Formspree 모두 지원).

**노드 흐름**:
```
[Webhook: form submission]
  → [Validate: required fields present, no spam keywords]
  → [Branch by program]
      ├─ STARCP → [Load: program brief from site-strategy.yaml]
      ├─ IDEN-teacher → [Load: program brief]
      ├─ IDEN-career → [Load: program brief]
      ├─ Changjig → [Load: program brief]
      └─ Leadership → [Load: program brief]
  → [Generate: 신청 확인 메일 초안] (HAG: 이메일 발송 승인 필요)
  → [Wait 24h]
  → [Generate: 24h follow-up 초안]
      ├─ 신청 시 응답 본문 키워드 추출
      ├─ 해당 프로그램의 deliverable·cta_secondary 매핑
      └─ 1차 진단 통화 일정 후보 3건 제안
  → [Append to HAG-pending queue]
  → [Local Notification: 'New consult lead — review in 운영 콘솔']
```

**출력**:
- 신청 확인 메일 초안 (HAG 승인 후 발송)
- 24h follow-up 초안 (HAG 승인 후 발송)
- 신청자 메타데이터 (로컬 암호화 저장, Notion·클라우드 금지)

**HAG 게이트** (이 워크플로우의 핵심):
1. 이메일 발송 — C4 "이메일 발송" 게이트
2. 신청자 명단을 콘솔에 띄우는 것은 자동, **외부 노출은 절대 금지** (private layer)

**의존**:
- 외부 폼 서비스 (현재 사이트가 어떤 폼을 쓰는지 미확인 — 별도 조사 필요)
- 신청자 데이터 저장소: 로컬 SQLite 또는 암호화 JSON. 클라우드 금지 (C5)
- 이메일 발송 채널: 운영자 직접 발송 (Gmail 사용자 클라이언트)

**평가 기준 (DoD)**:
- 폼 제출 5분 안에 운영자 알림
- 24h 후 정확히 follow-up 초안 생성
- 비공개 정보 외부 유출 0건 (감사 로그 검증)
- 신청 → 1차 통화 예약 전환율 측정 (S5 → S6 변환)

**S 펀넬 매핑**: S5 (유입 전환) 0.20 + S6 (수익 전환) 0.15 = **0.35 — 펀넬 전체 가중치 중 가장 큰 단일 기여**. 따라서 본 워크플로우가 5종 중 우선순위 최고.

### W4. 매거진 1편 → AI 변환 콘텐츠 초안 (쇼츠 스크립트·카드뉴스·요약)

**목적**: 매거진 long-form 1편을 short-form 4종 (쇼츠 스크립트·카드뉴스 5장·LinkedIn 3안·뉴스레터 요약)으로 자동 변환. **Claude Code CLI 구독 안에서만** 호출.

**트리거**: W1과 동일 (매거진 신규) 또는 운영자 수동 트리거 (이미 발행된 과거 매거진 100편 일괄 변환).

**노드 흐름**:
```
[Trigger: new magazine OR manual select]
  → [Read full magazine markdown]
  → [Parse: 핵심 주장 1줄 + 근거 3개 + 결론 + CTA]
  → [Branch in parallel]
      ├─ [Claude CLI: 쇼츠 60초 스크립트] (영상 제작 자체는 미실시)
      ├─ [Claude CLI: 카드뉴스 5장 텍스트]
      ├─ [Claude CLI: LinkedIn 포스트 3안 (1줄 후킹·5줄 본문·CTA)]
      └─ [Claude CLI: 뉴스레터 섹션 요약 (200자)]
  → [Write 4 drafts to `.moai/drafts/{magazine-slug}/`]
  → [Append HAG-pending]
```

**출력**: 매거진 1편당 4개 초안 파일.

**HAG 게이트**: 외부 게시 시 W1과 동일.

**의존**:
- Claude Code CLI 구독 (한 호출 = 4개 변환 = 토큰 사용량 측정 필요)
- 매거진 파일 (이미 존재, 100편)

**평가 기준 (DoD)**:
- 변환 1편당 토큰 사용량 < 5,000 (Claude CLI 구독 한도 내)
- 초안 품질: 사람 수정 < 30%
- 100편 일괄 변환 시 (마이그레이션 모드) Claude 구독 일일 한도 초과 방지 (배치 분할)

**S 펀넬 매핑**: S2 (무료 가치) + S3 (무료 홍보 확산). W1과 묶음으로 운영 가능.

### W5. 일일 KPI 스냅샷 → 운영 콘솔 대시보드

**목적**: 매일 정해진 시각에 사이트의 핵심 KPI (구독자·검색 도착·매거진 수·신청 건수·자료 다운로드)를 1개 JSON 스냅샷으로 정리하여 운영 콘솔 (127.0.0.1:8765) 에 노출.

**트리거**: 매일 06:00 cron (n8n 자체 cron 노드).

**노드 흐름**:
```
[Cron: daily 06:00]
  → [Collect in parallel]
      ├─ Magazine count (filesystem)
      ├─ Subscriber count (subscriber file, if exists)
      ├─ Consult requests today (W3 큐 집계)
      ├─ Resource downloads (server log 없음 → 클라이언트 측정 불가)
      ├─ Search queries (자료실 검색 로그, 로컬)
      └─ Sitemap URL count
  → [Diff vs. yesterday's snapshot]
  → [Write: `.moai/state/kpi-{YYYY-MM-DD}.json`]
  → [Update: console dashboard view (HTML 정적 갱신)]
  → [Quiet notification if anomaly] (전일 대비 ±50% 이상)
```

**출력**: 일별 KPI 스냅샷 JSON + 콘솔 대시보드 갱신.

**HAG 게이트**: 없음. 내부 측정.

**의존**:
- 운영 콘솔 (`_console/`, 이미 존재)
- KPI 수집기 (자료별 로컬 측정만, 외부 트래커 금지 — C3)

**평가 기준 (DoD)**:
- 매일 06:00 ± 5분 안에 스냅샷 생성
- 30일치 추세 그래프 콘솔에서 확인 가능
- 비공개 키워드 노출 0건

**S 펀넬 매핑**: process/meta — 직접 펀넬 단계 아님. 그러나 funnel-100 채점의 artifact-evidence 요구를 충족하는 운영 근거 (commit, file path, passing test) 데이터 소스.

### 4.6 5개 워크플로우 우선순위

| # | 워크플로우 | 펀넬 가중 | 구현 난이도 | 우선순위 |
|---|---|---|---|---|
| W3 | 무료 진단 follow-up | **0.35** (최대) | 중 (폼 외부 의존) | **Priority High #1** |
| W1 | 매거진 → 다채널 초안 | 0.30 | 중 | **Priority High #2** |
| W2 | 자료실 색인 자동화 | 0.20 | 저 (기존 스크립트 재활용) | Priority Medium |
| W4 | 매거진 → 4종 short-form | 0.30 (W1과 묶음) | 저~중 (Claude CLI 호출만) | Priority Medium |
| W5 | 일일 KPI 스냅샷 | 메타 | 저 | Priority Low (선택) |

---

## 5. n8n 셀프호스트 도입 청사진

n8n을 어떤 형태로 nedabah 환경에 올릴지의 운영 청사진. 비용 0, 외부 의존 0 원칙.

### 5.1 호스팅 결정

| 옵션 | 채택 여부 | 사유 |
|---|---|---|
| n8n Cloud (유료) | ❌ | C2 외부 유료 API 금지 |
| n8n Cloud (free tier) | ❌ | 워크플로우 수 제한·이용약관 변경 위험 |
| Self-hosted Docker on Mac M4 | ⚠ 비채택 | Docker Desktop 라이선스 정책 변화 (상용 사용) |
| **Self-hosted npm + LaunchAgent on Mac M4** | ✅ **채택** | OSS, 비용 0, 기존 LaunchAgent 패턴과 일관 |

**채택 형태**: `npm install -g n8n` → LaunchAgent `com.nedabah.agent.n8n` 등록 → 127.0.0.1:5678 로컬 바인딩 (외부 노출 금지).

### 5.2 LaunchAgent 통합

기존 10+ LaunchAgent와 n8n의 역할 분리:

| 항목 | 담당 |
|---|---|
| 1시간 catch-up 사이트 빌드 | LaunchAgent `com.nedabah.agent.site_publisher` (유지) |
| 일일 quant snapshot | LaunchAgent `com.nedabah.agent.quant_snapshot` (유지) |
| 매거진·자료·KPI 워크플로우 (W1~W5) | n8n |

원칙: **LaunchAgent = 결정론적·idempotent 단일 잡, n8n = 다단계 분기·인간 게이트가 있는 잡**.

### 5.3 데이터 경계

| 데이터 | 저장소 | 외부 노출 여부 |
|---|---|---|
| `feed.json`, 빌드 산출물 | 사이트 repo (git) | 공개 |
| 매거진·자료 초안 (`.moai/drafts/`) | 로컬 | 비공개 (HAG 승인 전) |
| HAG 큐 상태 (`.moai/state/hag-pending.json`) | 로컬 | 비공개 |
| 신청자 PII | 로컬 암호화 (SQLite + sqlcipher 또는 평문 금지) | 절대 비공개 |
| n8n 워크플로우 정의 (.json) | 사이트 repo `.moai/workflows/n8n/` | 공개 (구조만, 자격증명 분리) |
| n8n credentials | macOS Keychain (n8n 자체 암호화) | 절대 비공개 |

### 5.4 보안

- n8n 인스턴스: `--tunnel` 금지, `--listen-address 127.0.0.1` 강제
- Basic Auth + 강한 패스워드 (Keychain 저장)
- 외부 webhook 수신 시 (W3): ngrok·cloudflare tunnel 대신 **Tally·Formspree 같은 외부 폼 서비스가 정적 webhook URL을 받지 못함** → 대안: 폼 서비스가 이메일을 발송 → 로컬 IMAP 폴링 → 이메일을 트리거로 사용

위 W3의 webhook 부분은 **단순 webhook이 안 됨** 사실을 인정한다. 대안 두 가지:
- (a) IMAP 폴링: Gmail에 폼 결과 수신 → n8n IMAP 노드가 5분 폴링 → 새 메일이 W3 트리거
- (b) 외부 게이트웨이 없는 경우: 운영자가 폼 결과 메일을 받고 운영 콘솔에서 수동 입력 — 자동화 가치 절반 손실

**채택 권장**: (a) IMAP 폴링. Gmail 구독은 운영자 개인 계정으로 이미 존재 (C2 통과 — 구독 인터넷 서비스).

### 5.5 백업 정책

- 워크플로우 정의: git 추적 (사이트 repo)
- credentials: Keychain → Time Machine 백업 (이미 mac 기본)
- 신청자 DB: 외부 클라우드 백업 금지. 외장 디스크 암호화 백업 권장

---

## 6. S1~S6 펀넬 매핑

5개 워크플로우를 funnel-100-master-plan.md의 S1~S6 단계에 정합 매핑.

### 6.1 매핑 표

| 워크플로우 | S1 | S2 | S3 | S4 | S5 | S6 | 합산 영향 |
|---|---|---|---|---|---|---|---|
| W1. 다채널 초안 | | ●● | ●●● | ● | | | S2+S3 직격 |
| W2. 자료실 색인 | ●●● | ● | | | | | S1 직격 |
| W3. 진단 follow-up | | | | | ●●● | ●●● | S5+S6 직격 (최대 펀넬) |
| W4. short-form 변환 | | ●● | ●●● | | | | S2+S3 보조 |
| W5. KPI 스냅샷 | meta | meta | meta | meta | meta | meta | 운영 근거 |

(●●● = 핵심 기여, ●● = 보조 기여, ● = 약한 기여)

### 6.2 funnel-100 채점 영향 추정

가설: 5개 워크플로우가 정상 운영되면 funnel-100의 **수익 기여 축**이 다음만큼 상승한다.

| 펀넬 단계 | 가중치 | 워크플로우 기여 | 예상 상승폭 |
|---|---|---|---|
| S1 | 0.20 | W2 | +0.10~+0.15 (이미 SSoT 구조라 큰 새 기여는 아님) |
| S2 | 0.15 | W1, W4 | +0.15~+0.20 |
| S3 | 0.15 | W1, W4 | +0.20~+0.25 (현재 다채널 발행 부재 → 가장 큰 신규 가치) |
| S4 | 0.15 | (없음) | 0 — 본 전략 미커버. 별도 PWA·뉴스레터 cadence 작업 필요 |
| S5 | 0.20 | W3 | +0.10~+0.15 |
| S6 | 0.15 | W3 | +0.10~+0.15 |

**추정 총합**: 5개 워크플로우 도입으로 funnel-100 수익 기여 축 +0.65~+0.95점 (100점 만점 기준). 정확한 채점은 artifact-evidence 검증 후 가능.

---

## 7. HAG 승인 게이트 5개

이 전략이 외부영향 7종 (product.md §6) 중 어디에 걸리는지 명시한다. 모든 자동 발행·발송·결제 가지는 게이트 통과 필수.

| 게이트 | 외부영향 종류 | 워크플로우 | 정지점 |
|---|---|---|---|
| G1 | 1. 이메일 발송 (구독자·외부) | W3 신청 확인 메일·24h follow-up | 초안 생성까지 자동, 발송 사람 승인 |
| G2 | 3. 공개 게시 (블로그·SNS) | W1 다채널 초안, W4 short-form | 초안 생성까지 자동, 게시 사람 승인 |
| G3 | 4. 결제·정산 | (현재 본 전략 미포함) | — |
| G4 | 5. 계약·협약 | W3 follow-up 이후 1:1 미팅 → 계약 단계 | n8n 자동화 종료 지점 (사람 100%) |
| G5 | 7. 공유 (문서 권한·SSO) | (현재 본 전략 미포함) | — |

게이트 통과 패턴: `.moai/state/hag-pending.json`에 큐 적재 → 운영자가 운영 콘솔에서 검토 → `moai-hag approve <id>` 또는 `moai-hag reject <id>` CLI → 통과 시 발송·게시 잡 자동 실행, 거부 시 폐기.

---

## 8. 도입 단계 (Roadmap)

시간 추정 없음. 우선순위 라벨만 명시 (Constitution: "프로페셔널 시간 추정 금지").

### Milestone M0. 인프라 도입 (Priority High)

- M0-1: n8n npm 설치 + LaunchAgent 등록 (`com.nedabah.agent.n8n`)
- M0-2: 127.0.0.1:5678 로컬 바인딩 + Basic Auth + Keychain 자격증명 저장
- M0-3: 워크플로우 정의 저장소 `.moai/workflows/n8n/` 생성 (.gitignore에 credentials 제외)
- M0-4: HAG 큐 데이터 모델 정의 (`.moai/state/hag-pending.json` 스키마)
- M0-5: `moai-hag approve|reject|list` CLI 정의 (별도 SPEC 도출 필요)

### Milestone M1. 우선 워크플로우 2종 (Priority High)

- M1-1: W3 진단 follow-up — IMAP 폴링 트리거 + 초안 생성 + HAG 큐 + 운영자 알림
- M1-2: W1 매거진 다채널 초안 — file watch + persona 분기 + 초안 작성 + HAG 큐

### Milestone M2. 자동화 강화 2종 (Priority Medium)

- M2-1: W2 자료실 색인 자동화 — render_all.py 트리거 + 검증 게이트
- M2-2: W4 short-form 변환 — Claude CLI 호출 + 4종 초안

### Milestone M3. 측정 (Priority Low / 선택)

- M3-1: W5 일일 KPI 스냅샷 — 운영 콘솔 대시보드 연동

### Milestone M4. 회고 + funnel-100 채점 (Priority Medium)

- M4-1: 도입 30일 후 펀넬 채점 재실행 (`.moai/plans/funnel-100-master-plan.md` 기준)
- M4-2: artifact-evidence 검증 (commit hash, 파일 경로, 통과 테스트)
- M4-3: 본 전략의 RED/AMBER 판정 재검토

각 마일스톤은 별도 SPEC (`SPEC-N8N-W{1,2,3,4,5}-001`)으로 발급 후 `/moai run` 진입.

---

## 9. 폐기한 영상 패턴 (왜 안 쓰는지 명시)

영상에서 본 패턴 중 nedabah에 부적합하여 명시적으로 폐기한 것들. 향후 사정이 바뀌면 재검토 가능한 트리거.

### 폐기 1. AdSense / 광고 협찬 수익

- **사유**: tech.md §4.1 forbidden — 트래커·광고 SDK 금지. 사이트 정체성과도 충돌 (1인 교육 작업실, 신뢰 두께).
- **재검토 트리거**: nedabah가 비영리에서 영리 법인으로 전환 + Constitution 개정 + 사용자가 광고를 능동적으로 허용할 때.

### 폐기 2. 다채널 콘텐츠 박리다매 (200개/일)

- **사유**: product.md §3 핵심 가치 — "신뢰의 두께 = 한 편 한 편의 결". 양적 박리다매는 정체성 정반대.
- **재검토 트리거**: 정체성 자체가 바뀌면. 현재는 영구 폐기.

### 폐기 3. 인터넷 신문사 운영

- **사유**: 1인 교육·코칭 작업실 비즈니스 모델과 불일치.
- **재검토 트리거**: 영구 폐기.

### 폐기 4. 클라이언트명·금액 자동 노출

- **사유**: tech.md §4.1 security — 비공개 키워드 자동 차단. publisher classifier가 이미 이를 enforce.
- **재검토 트리거**: 절대 폐기. Constitution 수준의 안전장치.

### 폐기 5. 외부 AI API 직접 호출 (OpenAI·Anthropic·Stability 등)

- **사유**: C2 외부 유료 API 금지. Claude Code CLI 구독 안에서만 호출.
- **재검토 트리거**: Constitution이 외부 API 허용으로 개정될 때. 그 시점에 영상의 이미지·음원 생성 워크플로우 재검토 가능.

### 폐기 6. Notion 클라우드 데이터베이스 도입

- **사유**: SSoT 원칙 위반 (이미 feed.json 있음) + PII 클라우드 저장 위험 (C5).
- **재검토 트리거**: 영구 폐기. nedabah의 SSoT는 feed.json.

### 폐기 7. CapCut 영상 자동 편집

- **사유**: 현재 nedabah는 영상 콘텐츠 라인업 없음. 도입 시 외부 유료 도구 의존 + C2 위반 위험.
- **재검토 트리거**: 영상 콘텐츠 라인업이 사이트 전략에 추가될 때. 현재는 보류.

### 폐기 8. 자동 SNS 발행 (Instagram·TikTok·YouTube auto-upload)

- **사유**: C4 "공개 게시" HAG 게이트 통과 의무. 본 전략은 **초안 생성까지만 자동**.
- **재검토 트리거**: HAG가 특정 매체의 자동 발행을 사전 승인할 때. 현재는 매 건 사람 승인.

---

## 10. 위험·미해결 사항

본 전략의 약점·아직 답이 없는 질문.

### 미해결 1. 폼 webhook 수신 인프라

W3의 webhook 수신을 위해 IMAP 폴링을 차선책으로 제안했으나, 검증 안 됨. 검증 작업:
- 현재 사이트가 어떤 폼을 쓰는지 조사 (`contact.html`, `coaching.html`, `programs.html` 검토)
- 폼 결과를 어디로 보내는지 확인 (이메일·외부 서비스·없음)
- 답에 따라 W3의 트리거 부분 재설계

### 미해결 2. Claude CLI 토큰 한도

W4 100편 일괄 변환 시 Claude 구독 일일 토큰 한도 초과 가능성. 측정 안 됨. 검증 작업:
- 매거진 1편 (평균 1,500자) 변환 시 토큰 사용량 측정
- 한도 도달 시 배치 분할 + 며칠 분산 처리

### 미해결 3. 운영자 알림 채널

5개 워크플로우 모두 "운영자 알림"을 요구. 현재 채널 미지정. 옵션:
- macOS native notification (terminal-notifier)
- Slack 개인 워크스페이스 webhook (구독 외부 서비스 — C2 검토 필요)
- 이메일 자동 발송 (자기 자신에게 — C4 통과)

### 미해결 4. n8n 학습 곡선

1인 운영자가 n8n 노드 시스템·credential·트리거 학습이 필요. 본 문서는 그 학습을 전제로 함. 학습 자료 큐레이션 별도 필요.

### 미해결 5. 영상의 "n8n" 명시 부재

영상 자체에서 n8n이 명시되지 않았으므로, 영상의 실제 도구는 Make.com·Zapier·또는 자체 개발 일 수 있다. 본 문서는 n8n으로 매핑했으나, 다른 도구가 더 적합한지 별도 검토 가능 (Make.com은 유료 제약 — 폐기, Zapier는 유료 — 폐기, 자체 Python = LaunchAgent 확장 — 가능). **현재 권장 순위**: n8n (시각화 + 무료 + 셀프호스트) > 자체 Python (이미 구조 있음) > Make/Zapier (제외).

---

## 11. 후속 행동 (Hand-off)

본 plan-레벨 문서가 승인되면 다음 단계로 진입.

| 단계 | 명령 | 산출물 |
|---|---|---|
| Phase 1 | `/moai plan SPEC-N8N-W3-001` (진단 follow-up) | SPEC-N8N-W3-001 EARS 요구사항 |
| Phase 1 | `/moai plan SPEC-N8N-W1-001` (다채널 초안) | SPEC-N8N-W1-001 |
| Phase 1 | `/moai plan SPEC-N8N-HAG-001` (HAG 큐 + CLI) | SPEC-N8N-HAG-001 (M0 인프라) |
| Phase 2 | `/moai run SPEC-N8N-HAG-001` | n8n 인프라 + HAG CLI |
| Phase 2 | `/moai run SPEC-N8N-W3-001` | W3 워크플로우 가동 |
| Phase 2 | `/moai run SPEC-N8N-W1-001` | W1 워크플로우 가동 |
| Phase 3 | M2~M4 마일스톤 후속 SPEC | W2·W4·W5 + 회고 |

각 SPEC은 manager-spec 에이전트가 작성하며, EARS 양식 + acceptance criteria + 본 문서의 평가 기준 (DoD)을 그대로 인수 조건으로 사용한다.

---

## 12. 변경 이력

| 일자 | 변경 | 작성자 |
|---|---|---|
| 2026-05-22 | 최초 작성 (DRAFT) — 영상 분석 + nedabah 매핑 + 5개 워크플로우 도출 | MoAI Orchestrator (claude-opus-4-7) |

---

## Sources

- 영상 분석: 사용자 제공 요약본 (출처: "현장속으로" 채널, 남시우 운영자, 영상 ID `_E7uNuZ8m8g`). 본 사이트에서 직접 페치는 YouTube 403으로 차단되었으므로 사용자 제공 요약을 1차 자료로 사용했다.
- WebSearch 보조 자료 (영상 ID 직접 매칭은 실패하였으나 일반 n8n 수익 패턴 확인용):
  - [자동화(n8n 워크플로우) 날먹하는법 - YouTube](https://www.youtube.com/watch?v=uAIgNkr0dsc)
  - [n8n AI Workflow Builder - YouTube](https://www.youtube.com/watch?v=W-S9g1VKyLA)
  - [n8n 노코드 자동화 한글 가이드북](https://wikidocs.net/312074)
  - [$2,700 Passive Income with This n8n Automation - YouTube](https://www.youtube.com/watch?v=BRP3SPi78Yw)
  - [This n8n Sales Automation Won $5,000 in Just 14 days - YouTube](https://www.youtube.com/watch?v=Z46F8ZiHZJo)
- 사이트 내부 근거 (변경 시 본 문서 재검토 필요):
  - `.moai/project/product.md` — 5단계 수익 사다리, HAG 7종, KPI 정의
  - `.moai/project/tech.md` — Constitution forbidden 목록, security 규약
  - `.moai/strategy/site-strategy.yaml` — 5개 코칭 프로그램 가격·페르소나·deliverable
  - `.moai/plans/funnel-100-master-plan.md` — S1~S6 펀넬 정의·가중치
