# bi.bluedot.so 분석 보고서 — Executive Summary

> 작성일: 2026-05-21 · 대상: 자체 개발(클론·차별화) 의사결정자
> 작성 방식: 다중 소스 크로스-리서치 + 백엔드/프론트엔드/전략 전문 에이전트 병렬 분석
> 직접 접근 차단(IP allowlist)으로 인해 사이트 본문은 미디어·블로그·검색 스니펫 기반으로 재구성

---

## 1. 한 문장 요약

**bi.bluedot.so는 전통적 BI(비즈니스 인텔리전스) 도구가 아니라, "AI 검색(ChatGPT·Perplexity·Gemini·Google AI Mode·Claude)에서 우리 브랜드가 얼마나/어떻게 언급·인용되는지를 일 단위로 측정하고 사각지대를 사라지게 만드는" GEO(Generative Engine Optimization) 전용 SaaS다.** 회사명은 (주)블루닷에이아이, CEO 이성규, 2021년 2월 설립, 본 제품은 2025년 4월 베타 출시.

## 2. 왜 지금 만들 가치가 있는가

| 신호 | 값 |
|---|---|
| Perplexity 월간 검색량 | 약 4억 회 이상 (2026년 기준) |
| ChatGPT가 답변에 외부 링크 인용하는 비율 | 약 31% |
| Perplexity/Copilot의 외부 링크 인용 비율 | 77% 이상 |
| 글로벌 시장 가격대 | $89 ~ $989/월 (Starter ~ Pro), Enterprise는 협의 |
| 한국어 native 측정 도구 공급자 수 | **사실상 블루닷 인텔리전스 단독 + 지오랭크 (에이전시 모델)** |
| 카테고리 영문 명칭 | AEO / GEO / LLMO / AISO — 통일 안 됨 = 진입 여지 |

**핵심 기회: 글로벌 도구(Profound, Otterly, Peec, AthenaHQ)는 한국어 LLM(HyperCLOVA, Solar, Naver Cue, Kakao 등)을 거의 커버하지 않는다.** 블루닷이 1위를 가져갔지만 카테고리 자체가 아직 작고, B2B SaaS · 에이전시 · 화이트라벨 · 헤드리스 API 등으로 분화 가능.

## 3. 제품의 본질 (Product Anatomy)

### 3-Pillar 기능 구조 (공식)

1. **브랜드(제품)의 가시성 및 감성 분석**
   - 하위 지표: 브랜드 언급량 · 언급 위치 · 긍부정 수준 · 언급 점유율 · 위치 점유율
2. **AI 검색 인용 출처 분석**
   - 하위 지표: AI검색별 사이트 인용 순위 · 인용 점유율 · 도메인 권위도
3. **고객의 검색의도 분석**
   - 프롬프트 추천 (4단계 고객여정 기반 잠재 질문 자동 생성)

### 대시보드 메인 KPI 카드 (3종)

- **브랜드 가시성** — 브랜드/제품의 노출 비율
- **도메인 인용률** — 브랜드 웹사이트의 인용 비율
- **가시성-인용률 갭** — "내 브랜드는 언급되는데 내 사이트는 인용 안 됨" = 콘텐츠 부재 신호 = AI SEO 헬스 지표

### 상위 통합 지표

- **BII (Bluedot Intelligence Index)** — 가시성 + 긍부정 종합, 일 단위 추적
- **최상단 노출률 (Top Position Share)** — 답변의 가장 첫 위치에 잡히는 비율
- **사각지대 점수 (0–100)** — 브랜드가 잡혀야 하는데 안 잡히는 프롬프트 우선순위화

### 실행 레이어(액션 엔진)

사각지대 프롬프트 → **블루닷CMS로 원클릭 이동 → AI 최적화 콘텐츠 자동 생성**.
이게 블루닷의 진짜 해자다. "측정"만 하는 글로벌 도구와 달리 **측정→실행→재측정 루프**가 한 회사 안에서 닫힌다.

### 추적 대상 AI 엔진 (확인됨)

ChatGPT · Perplexity · Google Gemini · Google AI Overviews · Google AI Mode · Claude · (Grok/Copilot 글로벌 표준이나 한국 시장 우선순위 낮음)

### 핵심 부가 기능

- **경쟁사 비교 대시보드** — 자체 DUCA 프레임워크 기반 보고서
- **상위 인용 콘텐츠 분석** — 어떤 외부 매체/페이지가 AI 답변의 1차 출처가 되는지
- **프롬프트 추천** — 신규 사용자 온보딩 지원
- **AI Mode 수집** — 프로 플랜 한정

## 4. 비즈니스 모델

| 항목 | 추정 |
|---|---|
| 가격 모델 | 프롬프트 수 × 엔진 수 × 일수 = 크레딧 (Peec 모델과 유사할 가능성) |
| 추정 티어 | Starter(ChatGPT만) / Pro(다중 엔진 + AI Mode) / Enterprise |
| 무료 정책 | "지금 무료 체험하세요" CTA — 카드 없는 트라이얼 추정 |
| 부가 매출 | 자매 제품 묶음 판매(Orwell·Sofos·BluedotCMS) — 측정+실행 번들 |
| 타겟 고객 | 한국 B2B 브랜드 마케터 · 커머스 마케터 · PR/SEO 팀 |

## 5. "직접 만들 수 있는가" 가능성 진단

**짧은 답: 가능, 단 4주 안에 MVP는 어렵고 8~12주가 현실적이다.**

| 영역 | 기술 난이도 | 비용 리스크 | 비고 |
|---|---|---|---|
| 다중 LLM 자동 쿼리 파이프라인 | 중 | **상** | 일 1,000 프롬프트 × 5 엔진 = 월 15만 API콜 → 월 수백만원 가능 |
| 답변에서 브랜드/인용 추출 | 중 | 중 | LLM-as-judge로 단순화 가능 |
| 메트릭 계산 (SoV, BII 등) | 하 | 하 | 공식이 단순 — 점유율 비례식 |
| 대시보드 UI | 중 | 하 | Next.js + Tremor/Recharts + shadcn으로 4주 |
| Google AI Mode 수집 | **상** | **상** | 공식 API 없음 → SERP API 의존 또는 헤드리스 자동화 (ToS 회색지대) |
| 도메인 권위도 | 중 | 중 | Moz API 유료 / 자체 크롤러 빌드 가능 |
| 한국어 NER+감성 | 중 | 하 | KoElectra/KLUE 또는 GPT-4o-mini judge |

**핵심 리스크 3가지**
1. **LLM API 비용** — 무차별 샘플링하면 적자. 프롬프트 큐레이션·캐싱·증분 샘플링 설계가 사업 성패를 가른다.
2. **Google AI Mode·AI Overviews 수집** — 공식 API 부재. 글로벌 도구 대부분 SerpAPI/DataForSEO 의존. 차단 리스크 상시.
3. **데이터 신뢰도** — 한 번 쿼리하면 답변이 출렁인다(temperature·세션). **다회 샘플링 후 평균/분산 노출**이 필수. Frequency-over-ranking 원칙.

## 6. 최소실행가능제품(MVP) 정의 — 4주 컷

- 사용자 1명 / 브랜드 1개 / 엔진 2개(ChatGPT API + Perplexity Sonar API)
- 프롬프트 100개 수동 입력 + 자동 생성 50개
- 일 1회 스냅샷 (서울 새벽 4시)
- 3개 KPI 카드 + 1개 시계열 차트 + 1개 프롬프트별 표
- 단일 페이지 대시보드, 인증은 Clerk 또는 Supabase Auth
- 결제 없음 (예약 신청 폼만)
- 인프라: Vercel(프론트) + Supabase(Postgres+Auth) + Upstash(큐) + GitHub Actions(스케줄러)
- **추정 월 비용: $300~600** (API 콜이 가장 큼)

## 7. 차별화 포지션 (4가지 후보)

1. **한국 LLM 커버리지 1위** — HyperCLOVA, A.X, Solar Pro, Naver Cue, Kakao 인입 도구를 글로벌 도구는 안 한다.
2. **에이전시 화이트라벨** — 광고대행사가 클라이언트별 대시보드를 자기 브랜드로 제공.
3. **헤드리스 API 우선** — 마케팅팀이 자체 BI(Tableau, Power BI)에 우리 데이터를 꽂는 모델.
4. **카테고리별 벤치마크 인덱스 공개** — Profound Index 모방. PR 무료 노출용.

## 8. 권장 다음 단계

| 우선순위 | 액션 |
|---|---|
| P0 | 5명 잠재 고객 인터뷰 — "이걸 월 X만원이면 사겠는가" 검증 |
| P0 | ChatGPT/Perplexity 공식 API 키 발급 + 100 프롬프트 수동 1회 측정해 데이터 모양 체감 |
| P1 | 본 보고서 02~05 섹션의 아키텍처를 그대로 4주 스프린트로 분해 |
| P1 | 도메인 확보, 한국어 브랜드명, 로고 단순 시안 (보고서 06 참조) |
| P2 | 베타 신청 랜딩(이 사이트 자체 활용 가능) — 카피·디자인 패턴은 본 보고서 04 섹션 |

## 9. 본 보고서 구성

| 파일 | 내용 |
|---|---|
| 00-executive-summary.md | (이 문서) 전체 요약 |
| 01-product-anatomy.md | 제품 해부: 기능·지표·UI·온보딩·프라이싱 추정 |
| 02-backend-architecture.md | 백엔드 청사진(쿼리 파이프라인·추출·메트릭·스토리지·비용) |
| 03-frontend-blueprint.md | 프론트엔드 청사진(라우트·차트·디자인 토큰·접근성) |
| 04-build-strategy.md | 빌드 전략(MVP·로드맵·Build vs Buy·팀·런웨이) |
| 05-competitive-landscape.md | 글로벌·한국 경쟁사 매트릭스 |
| 06-implementation-kickstart.md | 실제 시작 코드·체크리스트·도메인·법무 |

---

## 출처

- [블루닷 인텔리전스 공식](https://bi.bluedot.so/) (403 차단, 검색 스니펫 경유)
- [블루닷 블로그 — 인텔리전스 소개](https://blog.bluedot.so/about-bluedot-intelligence/)
- [블루닷 블로그 — AI Mode·프롬프트 추천 업데이트](https://blog.bluedot.so/bluedot-intelligence-update-prompt-recommendations-ai-mode-added/)
- [블루닷 블로그 — 최상단 노출률 추가](https://blog.bluedot.so/update-bluedot-intelligence-addition-of-top-position-share/)
- [블루닷 블로그 — 경쟁사 비교 추가](https://blog.bluedot.so/update-blue-dot-intelligence-dashboard-adds-competitor-comparison-feature-etc/)
- [블루닷 블로그 — 상위 인용 콘텐츠 분석](https://blog.bluedot.so/update-how-to-analyze-top-cited-content-with-bluedot-intelligence/)
- [블루닷 블로그 — 국내 GEO/AEO 플랫폼 3가지](https://blog.bluedot.so/three-types-of-domestic-geo-generative-engine-optimization-platforms-and-their-features/)
- [블루닷에이아이 본사](https://bluedot.so/)
- [블루닷CMS](https://cms.bluedot.so/)
- [Orwell](https://orwell.bluedot.so/) · [Sofos](https://sofos.bluedot.so/register)
- [TechDaily 베타 출시 보도](https://www.techdaily.co.kr/news/articleView.html?idxno=25596)
- [AI타임스 보도](https://www.aitimes.com/news/articleView.html?idxno=169497)
- [플래텀 론칭 보도](https://platum.kr/archives/256942)
- [Wowtale 보도](https://wowtale.net/2025/04/11/239662/)
- [THE VC 기업정보](https://thevc.kr/bluedotai)
- [한국 GEO Top 3 비교](https://snu.re.kr/korea-geo-agency-top3-comparison)
- [Profound 가격 페이지](https://www.tryprofound.com/pricing)
- [Peec.ai 가격 페이지](https://peec.ai/pricing)
- [Otterly.AI](https://otterly.ai/)
- [AthenaHQ vs Profound](https://athenahq.ai/comparison/profound-vs-athenahq-comparison)
- [LLMrefs — SoV 공식](https://llmrefs.com/blog/how-to-calculate-share-of-voice)
- [LLM Pulse — track brand mentions](https://llmpulse.ai/blog/track-brand-mentions/)
- [Top 12 AI 가시성 측정 도구](https://www.trustsignals.com/blog/the-top-12-tools-for-measuring-ai-visibility-and-brand-mentions-in-llms-2026)
