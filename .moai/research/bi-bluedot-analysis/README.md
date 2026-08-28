# bi.bluedot.so 분석 보고서

> AI 검색 최적화 SaaS '블루닷 인텔리전스'에 대한 풀스택 클론·차별화 분석.
> 작성일: 2026-05-21 / 작성자: MoAI Orchestrator + expert-backend/expert-frontend/manager-strategy 병렬 실행

## 한 문장 요약

bi.bluedot.so는 전통 BI가 아니라 **"AI 검색 시대의 SEO"** — ChatGPT/Perplexity/Gemini/Google AI Mode 등이 우리 브랜드를 얼마나 어떻게 언급·인용하는지 일 단위로 측정하고, 사각지대 프롬프트를 콘텐츠로 메우는 GEO/AEO SaaS다.

## 본 보고서 구성

| 파일 | 내용 | 분량 |
|---|---|---|
| [00-executive-summary.md](./00-executive-summary.md) | 전체 요약 + 출처 인덱스 | 약 4,000자 |
| [01-product-anatomy.md](./01-product-anatomy.md) | 제품 해부: 3-Pillar 기능·KPI·UI·온보딩·자매제품 통합 | 약 5,500자 |
| [02-backend-architecture.md](./02-backend-architecture.md) | 백엔드 청사진: 프롬프트·쿼리·추출·메트릭·스토리지·비용 | 약 9,500자 |
| [03-frontend-blueprint.md](./03-frontend-blueprint.md) | 프론트 청사진: 라우트·차트·디자인 토큰·접근성·V1/V2/V3 컷 | 약 8,000자 |
| [04-build-strategy.md](./04-build-strategy.md) | 전략 로드맵: 시장·MVP·Build vs Buy·가격·팀·런웨이·GTM | 약 9,000자 |
| [05-competitive-landscape.md](./05-competitive-landscape.md) | 글로벌 8사 + 한국 2사 매트릭스, 포지셔닝, 가격 전략 | 약 4,000자 |
| [06-implementation-kickstart.md](./06-implementation-kickstart.md) | Day 0~30 즉시 실행 가이드 + 실제 코드 스니펫 + 디렉토리 구조 | 약 9,000자 |

**총 분량: 약 49,000자 / 12 페이지 분량 (PDF 환산)**

## 빠른 의사결정 흐름

### "할까 말까" 결정자라면 → 먼저 읽을 것

1. [00-executive-summary.md](./00-executive-summary.md) (5분)
2. [04-build-strategy.md](./04-build-strategy.md) §3 MVP 정의 + §6 가격 + §8 런웨이 (10분)
3. [05-competitive-landscape.md](./05-competitive-landscape.md) §5.5 비교 우위 + §5.6 가격 전략 (5분)

### "어떻게 만들지" 설계자라면 → 먼저 읽을 것

1. [01-product-anatomy.md](./01-product-anatomy.md) (10분)
2. [02-backend-architecture.md](./02-backend-architecture.md) (20분)
3. [03-frontend-blueprint.md](./03-frontend-blueprint.md) (15분)

### "지금 키보드를 두드린다" 실행자라면 → 먼저 읽을 것

1. [06-implementation-kickstart.md](./06-implementation-kickstart.md) §6.1 Day 0 체크리스트 (지금)
2. [02-backend-architecture.md](./02-backend-architecture.md) §1~§3 (오늘 밤)
3. 나머지는 작업하면서 참조

## 핵심 발견 5가지

1. **bi.bluedot.so는 "BI 도구"가 아닌 "GEO SaaS"** — 카테고리 혼동 자체가 진입 기회. 한국어 검색 시 "BI = Business Intelligence" 인지 가설이 깨지면 잠재 시장 확장.

2. **3-Pillar 구조 (공식)**: ① 가시성·감성 ② 인용 출처 ③ 검색의도. 이 위에 BII 종합 인덱스 + 사각지대 점수가 얹혀 있고, 실행 레이어로 블루닷CMS가 닫는다.

3. **추적 엔진 5+**: ChatGPT, Perplexity, Gemini, Google AI Overviews, **Google AI Mode (프로 한정)**. 한국 LLM(HyperCLOVA/Solar/A.X)은 **글로벌 도구 어디도 안 함** = 영구적 모트 후보.

4. **변동비 추정**: 고객 1명당 풀 스택(7엔진·5천 프롬프트·일 1회) = **월 $2K**. 저가형(3엔진·100 프롬프트) = **월 $38**. 가격은 ₩99K~₩790K + Enterprise.

5. **6개월 BEP 230 고객**: 한국 GEO SaaS 시장의 LTV/CAC가 검증된 분포는 ₩99K Starter → ₩299K Growth 전환. 12~18개월 안에 도달 가능하나 **에이전시 화이트라벨** 한 곳이 SMB 10곳분.

## 다음 7일 액션 (Quick Win 우선순위)

```
🟢 Day 1: 도메인 확보 + API 키 일괄 발급 (반나절)
🟡 Day 2-3: 친구 회사 5곳 수동 GEO 리포트 작성 (Google Sheets)
🟡 Day 4: LinkedIn에 "한국 GEO 무료 진단" 포스트 + Typeform
⏸️ Day 5-7: 인터뷰 5건 + 사전등록 20건 게이트
```

게이트 통과 시 Phase 1 진입 → 4주 안에 알파 5명 활성.

## 본 보고서가 다루지 않은 것

- bi.bluedot.so의 정확한 가격 (직접 데모 신청 필요)
- 블루닷 회사의 투자/매출 (THE VC에 공개 안 됨)
- DUCA 프레임워크 상세 (블루닷 내부 명명, 비공개)
- 한국 LLM API 단가 (제휴 협상 필요)
- 법무 자문 결과 (전문가 필요)

이 갭들은 본 보고서 [00 §9](./00-executive-summary.md)의 "권장 다음 단계"에 명시.

## 분석 방법론

1. **직접 접근 시도**: bi.bluedot.so에 HTTP 요청 → IP allowlist 차단(403). WebFetch도 동일.
2. **간접 데이터 수집**: 검색엔진 스니펫, 한국 IT 미디어 보도, 블루닷 자체 블로그 인덱스, 글로벌 경쟁사 공개 자료.
3. **병렬 전문가 분석**: backend·frontend·strategy 에이전트 동시 가동 (총 8분 30초 vs 순차 25분+).
4. **합성 + 비판적 통합**: 에이전트 산출물을 그대로 옮기지 않고 본 보고서 문맥에 맞춰 재구성.

## 라이선스

본 보고서는 본 저장소(`nedabahway-site`)의 라이선스를 따른다. 외부 인용 시 출처 명시 권장.
