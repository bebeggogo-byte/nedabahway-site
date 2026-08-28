# 05. 경쟁사 매트릭스

## 5.1 전세계 GEO/AEO 분석 도구 풍경 (2026.05 기준)

```
                  엔터프라이즈 ──────────────────────────────────────
                       │                                              │
        Profound ●─────┤        ● AthenaHQ                             │
                       │                          ● Brandlight         │
        Klue ●         │                                                │
                       │     ● Scrunch AI                              │
                       │                                              │
                       │           ● Goodie                            │
                       │                                              │
                       │     ● Peec.ai      ● bi.bluedot ★              │
                       │                                              │
                       │                  ● 지오랭크 (에이전시 모델)   │
                       │                                              │
        Otterly ●──────┴──────────────────────────────────────────────
                  SMB / 솔로                                            
```

(★ bi.bluedot.so는 한국어 SaaS 중 단독 포지션)

## 5.2 가격 / 기능 매트릭스

| 도구 | Starter | Pro | Enterprise | 엔진 수 | 한국어 LLM | 액션 레이어 | 화이트라벨 |
|---|---|---|---|---|---|---|---|
| **Profound** | $99/mo | $399 / $499 | Custom | 10+ | ❌ | Agents (콘텐츠 생성) | ❌ |
| **Otterly.ai** | $29 | $989 (Pro) | Custom | 6, 50+ 국가 | ❌ | GEO Audit | ❌ |
| **Peec.ai** | $89 (25 프롬프트) | $199 (100) / $499 (300+) | Custom | 5 (ChatGPT, Perplexity, Claude, Gemini, DeepSeek) | ❌ | 매트릭스 | ✅ (에이전시 플랜) |
| **AthenaHQ** | Contact | Contact | Contact | 다중 | ❌ | ACE Action Center | 부분 |
| **Goodie** | $199 | $495 | Custom | 다중 | ❌ | "What to write next" | ❌ |
| **Scrunch AI** | Contact | Contact | Contact | 다중 | ❌ | Agentic 시뮬레이션 | ❌ |
| **bi.bluedot.so** | (미공개) | "프로" 확인 | (미공개) | 5+ (ChatGPT, Perplexity, Gemini, AI Overviews, AI Mode) | (한국 자체 NLP) | **블루닷CMS 통합** | ❌ (추정) |
| **지오랭크** | 컨설팅 패키지 | 컨설팅 | 컨설팅 | 분석 + 실행 | 한국 시장 | ✅ (에이전시) | n/a (에이전시) |

## 5.3 차별점 매트릭스 (핵심 9개 도구)

| 차별점 | Profound | Otterly | Peec | AthenaHQ | Goodie | bi.bluedot | 우리 (계획) |
|---|---|---|---|---|---|---|---|
| Agent Analytics (LLM에서 우리 사이트 봇 방문 추적) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Phase 3 |
| Conversation Explorer (실제 사용자 대화 데이터) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Snowflake/BI 연동 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Phase 3 |
| 자체 인덱스 (카테고리별 벤치마크) | ✅ Profound Index | ❌ | ❌ | ❌ | ❌ | ❌ | Phase 3 (PR 무료) |
| Prompt Volume 추정 | ✅ | ✅ | 부분 | ✅ ACE | ❌ | (정보 부족) | Phase 2 |
| AI 콘텐츠 자동 생성 | ✅ (Agents) | ❌ | ❌ | ✅ (ACE Actions) | ✅ | ✅ (BluedotCMS) | Phase 4 |
| 경쟁사 임퍼소네이션 탐지 | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 한국 LLM 커버 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **Phase 4 (핵심)** |
| 한국어 NER·감성 정확도 | 낮음 | 낮음 | 낮음 | 낮음 | 낮음 | **높음** | 높음 (목표) |
| 한국 결제(TossPayments) | ❌ | ❌ | ❌ | ❌ | ❌ | (추정) ✅ | ✅ |
| 다국어 UI (ko/en 병행) | ❌ (영어만) | ❌ | ❌ | ❌ | ❌ | ko | ko + en |

## 5.4 시장 진입 포지셔닝

```
┌─────────────────────────────────────────────────────────┐
│ 가로축: 영어권 ←──────────────────→ 한국어권             │
│ 세로축: 측정 only ←──────────────→ 측정+실행            │
└─────────────────────────────────────────────────────────┘

  측정+실행 │                              ● bi.bluedot
            │                                ●(우리)   
            │  ● Goodie                                    
            │  ● AthenaHQ                                  
            │  ● Profound                                  
            │                                              
  측정 only │  ● Peec, Otterly                            
            │                              ● (한국 신규)  
            └──────────────────────────────────────────────
              영어권                          한국어권
```

**우리의 포지션**: bi.bluedot 옆 + 한 단계 위 (한국 LLM 커버 + 에이전시 화이트라벨).

## 5.5 비교 우위 도출

### 우리가 bi.bluedot보다 잘할 수 있는 것

1. **한국 LLM 4종 커버** (HyperCLOVA X, Solar Pro, A.X, Naver Cue) — 현재 어디도 안 함
2. **에이전시 화이트라벨** — bi.bluedot은 인하우스 직접 판매 추정, 에이전시 채널 비어 있음
3. **헤드리스 API 우선** — 기존 BI 도구(Tableau, Looker)에 우리 데이터 꽂는 모델, 엔터프라이즈에 어필
4. **공개 카테고리 인덱스** — Profound Index 모방. PR 무료 노출
5. **TossPayments 한국 결제 일급 지원** — 글로벌 도구는 Stripe만, 한국 SMB의 카드 결제 마찰

### 우리가 따라잡아야 할 것 (Phase 2)

1. 사각지대 자동 탐지의 신뢰도 (bi.bluedot의 0~100점 스코어링)
2. CMS 액션 레이어 (콘텐츠 자동 생성) — Phase 4까지
3. 경쟁사 비교 리포트 (자체 프레임워크 필요)

### 우리가 절대 흉내내지 말아야 할 것

1. Profound Conversation Explorer — 실제 사용자 대화 수집은 LLM 회사 파트너십 필요, 솔로/소규모 불가
2. AthenaHQ Agent Analytics — 고객 사이트 로그 분석은 별도 SDK 설치 필요, 진입장벽 큼

## 5.6 가격 전략 (경쟁사 가격에 대응)

```
한국 시장 ARPU 분포 (추정)

  ₩2M+  │ ┌─────────┐   ←  Enterprise (당사) = Profound Enterprise
        │ │ Custom  │
  ₩790K │ │         │   ←  Agency (당사) = Peec Pro 수준
        │ │         │
  ₩299K │ │         │   ←  Growth (당사) = Peec Starter ~ Pro 중간
        │ │         │
  ₩99K  │ │         │   ←  Starter (당사) = Profound Starter, Otterly Pro
        │ │         │
  ₩0    │ │         │   ←  Free Trial (당사) = 7일 무카드
        └─┴─────────┘
            한국 SMB SaaS는 ₩100K–₩500K 구간이 가장 두텁다 (KISA 조사)
```

**핵심 인사이트**: 한국 SMB는 **무카드 7일 → ₩99K Starter 전환**이 표준. ₩299K Growth가 마진 sweet spot. ₩790K Agency가 cash flow 가속기.

## 5.7 직접 인터뷰 가치 있는 도구 (벤치마크)

| 도구 | 인터뷰 가치 | 액션 |
|---|---|---|
| bi.bluedot | ★★★★★ | 잠재 고객으로 데모 신청 → 30분 영업 미팅 |
| Profound | ★★★★ | 무료 트라이얼 가입 → 30일 사용 후 UX 캡처 |
| Peec.ai | ★★★ | Starter 1개월 가입($89) → 한국 SERP 결과 확인 |
| 지오랭크 | ★★★ | 컨설팅 문의 → 패키지 가격 + 방법론 청취 |

**총 벤치마킹 예산**: ₩300K (Peec 1개월 + Profound 1개월 + 데모 미팅 출장비) — 한 달 안에 완료.

---

**출처**: 본 보고서 00 섹션 참조.
