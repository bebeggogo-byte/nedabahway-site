# 02. 백엔드 아키텍처 청사진

> expert-backend 에이전트 산출물 (한국어, 즉시 빌드 가능 수준 구체성). 모든 추천은 2026년 5월 기준 최신 버전.

AI 검색엔진 최적화(GEO/AEO) 분석 플랫폼의 즉시 구현 가능한 기술 설계서. Python/Go 하이브리드가 아닌 **Python 중심** 결정.

---

## 1. Prompt Universe 구축

### 시드 프롬프트 생성 전략

브랜드 X(카테고리 Y, 예: "토스" / "핀테크")에 대해 3-Layer Fan-out 방식으로 5,000개 프롬프트 생성.

**Layer 1: Seed (50개) — 카테고리 기본 의도 템플릿**
- "{category} 추천", "best {category} 2026", "{category} 비교", "{category} 후기"
- 출처: Google Suggest API, Naver 자동완성 스크래핑(`pytrends` 0.9.2 + 자체 셀레니움)

**Layer 2: Expansion (50 → 1,000) — LLM 확장**
- `gpt-4o-mini` (또는 `claude-haiku-4-5`)로 한 시드당 20개 변형 생성
- 비용: 5,000 prompts × 200 tokens × $0.15/1M = **$0.15 / 1회 생성**

```python
EXPANSION_PROMPT = """카테고리 '{category}'에 대한 사용자 검색 의도 20개를 JSON 배열로 생성.
의도 유형 분포: informational 40%, commercial 30%, transactional 20%, navigational 10%.
언어: {lang}. 브랜드명은 절대 포함하지 말 것."""
```

**Layer 3: Long-tail (1,000 → 5,000) — 경쟁사/이슈 주입**
- 경쟁사명, 가격대, 지역(서울/부산), 시기("2026", "최신") 조합

### 토픽 클러스터링 & 의도 분류

- **임베딩**: `text-embedding-3-small` (1536d, $0.02/1M tokens) 또는 `BAAI/bge-m3` (다국어, 자체 호스팅)
- **클러스터링**: `hdbscan` 0.8.40 + UMAP 0.5.7 (min_cluster_size=15)
- **의도 분류**: `xlm-roberta-base` fine-tuned (informational/commercial/transactional/navigational 4-class) — 자체 학습 2,000건이면 F1 0.88 도달
- **다국어**: KR/EN 분리 파이프라인 (langdetect 1.0.9로 라우팅), 동의어는 KR↔EN 사전(`.moai/data/aliases.yaml`) 수동 큐레이션

### 갱신 주기 & 중복 제거

- **갱신**: 주 1회 Layer 2-3 재생성 (트렌드 키워드 반영), Layer 1은 월 1회
- **중복 제거**: MinHash LSH (`datasketch` 1.6.5, threshold=0.85) — 5,000개 → 평균 4,200개로 압축
- **저장**: `prompts` 테이블에 `prompt_hash = sha256(normalized_text)` UNIQUE 인덱스

---

## 2. Multi-Engine Query Pipeline

### 엔진별 접근 방식

| 엔진 | 방식 | 라이브러리/엔드포인트 | 단가 (1k 쿼리) |
|---|---|---|---|
| ChatGPT | Official API | `openai` 1.55+, `gpt-4o` + `web_search` tool | $5.00 (input) + $15.00 (output) |
| Perplexity | Sonar API | `sonar-pro` (`pplx-api`) | $3 + $15 (with citations) |
| Gemini | Official API | `google-genai` 0.3+, `gemini-2.5-pro` + Grounding | $1.25 + $5.00 |
| Claude | Official API | `anthropic` 0.40+, `claude-opus-4-5` + `web_search_20250305` | $15 + $75 |
| Google AI Overviews | SERP API | SerpAPI `google_ai_overview` engine | $5.00 / 1k searches |
| Copilot | Browser automation | `playwright` 1.49 + 계정 로테이션 | 인프라 비용만 |
| Grok | xAI API | `xai-sdk` 0.5+, `grok-4` | $5 + $15 |

### 추천 스택 (최종 선택)

**Python 3.13 + FastAPI 0.115 + Celery 5.4 + Redis 7.4 + Postgres 16 + ClickHouse 24.10**

선택 이유 (4줄):
1. LLM SDK 생태계가 Python에 압도적으로 집중 (anthropic, openai, google-genai 모두 1st-class)
2. NER/sentiment 추론(transformers 4.46)과 동일 런타임 공유로 직렬화 비용 제거
3. Celery는 long-tail retry/rate-limit 핸들링이 BullMQ보다 성숙 (`acks_late=True`, `autoretry_for`)
4. ClickHouse는 메트릭 시계열 집계에서 Postgres보다 50-100배 빠름 (CTR 검증된 패턴)

### 레이트 리미팅 & 캐싱

- **Token Bucket**: Redis 기반 (`redis-py` 5.2의 `Lua script`), 엔진별 RPS 설정 (Anthropic 4000 RPM, OpenAI Tier 4 기준 10000 RPM)
- **Retry**: `tenacity` 9.0, exponential backoff (1s → 2s → 4s → 8s, max 5회), `RateLimitError`/`APITimeoutError`만 retry
- **Idempotency Key**: `sha256(f"{engine}:{prompt_id}:{date_kst}")` — 같은 날 재실행 시 캐시 hit
- **Cache TTL**: 답변 본문 24h (Redis), raw response는 S3에 영구 (cold storage)

### 일간 스냅샷 스케줄러

**Celery Beat + Redbeat 2.2** (Redis 백엔드, 분산 lock 보장). Temporal/Airflow는 오버스펙.

```python
# celery_app.py
from celery import Celery
from celery.schedules import crontab

app = Celery('geo', broker='redis://...', backend='redis://...')
app.conf.beat_scheduler = 'redbeat.RedBeatScheduler'

app.conf.beat_schedule = {
    'daily-snapshot': {
        'task': 'tasks.run_daily_snapshot',
        'schedule': crontab(hour=3, minute=0),  # KST 03:00
        'options': {'queue': 'orchestrator'}
    }
}

@app.task(bind=True, acks_late=True, autoretry_for=(RateLimitError,),
          retry_backoff=True, retry_kwargs={'max_retries': 5})
def query_engine(self, engine: str, prompt_id: int, run_id: str):
    # idempotency check
    if redis.set(f"lock:{run_id}:{engine}:{prompt_id}", "1", nx=True, ex=86400) is None:
        return  # already executed today
    # ... actual API call
```

큐 분리: `orchestrator` (1 worker), `engine:openai` / `engine:anthropic` / ... (각 5-10 workers, 엔진별 RPS 격리)

---

## 3. Citation & Entity 추출

### 답변 파싱 파이프라인

답변 1건당 4단계 추출:

**Step 1: 브랜드 멘션 스팬 (Aho-Corasick)**
- `pyahocorasick` 2.1로 alias dict 매칭 (브랜드별 평균 20개 별칭: "토스", "Toss", "비바리퍼블리카")
- 정확도 0.95+, 100KB 답변 5ms 처리
- LLM-as-judge는 비싸므로 ambiguous case에만 폴백 (`gpt-4o-mini`, $0.0001/case)

**Step 2: Position-in-answer**
- `mention_position = first_mention_char_offset / total_chars` (0.0 = top, 1.0 = bottom)
- Top-position: `position < 0.15` (상위 15% 구간 = "최상단")

**Step 3: 인용 URL 추출**

```python
import re
# Perplexity/Claude 스타일: [1], [2] + footnotes
FOOTNOTE_RE = re.compile(r'\[(\d+)\]\s*(https?://\S+)', re.MULTILINE)
# Inline markdown: [text](url)
INLINE_RE = re.compile(r'\[([^\]]+)\]\(((?:https?://)[^\s)]+)\)')
# Bare URLs
BARE_RE = re.compile(r'(?<![\(\[])(https?://[^\s\)\]]+)')

def extract_citations(text: str, engine: str) -> list[Citation]:
    cites = []
    if engine in ('perplexity', 'claude'):
        cites += [Citation(idx=int(m[1]), url=m[2]) for m in FOOTNOTE_RE.findall(text)]
    cites += [Citation(anchor=m[0], url=m[1]) for m in INLINE_RE.findall(text)]
    cites += [Citation(url=m) for m in BARE_RE.findall(text)]
    return dedupe_by_canonical(cites)
```

엔진별 구조화 응답이 있으면 우선 사용 (Perplexity `citations` 필드, Gemini `groundingMetadata.groundingChunks`).

**Step 4: 감성 분석**
- **한국어**: `snunlp/KR-FinBert-SC` 또는 `monologg/koelectra-base-v3-finetuned-nsmc` (3-class, F1 0.91)
- **영어**: `cardiffnlp/twitter-roberta-base-sentiment-latest`
- **컨텍스트 윈도우**: 멘션 spans ±150자 (전체 답변이 아닌 멘션 주변만 분석)
- 비용: 자체 호스팅 (g5.xlarge GPU 1대, $0.85/h, 시간당 50,000건 처리)
- 점수: positive=1.0, neutral=0.5, negative=0.0

### URL 정규화 & 도메인 어소리티

- **정규화**: `w3lib.url.canonicalize_url` + UTM 파라미터 제거 + `tldextract` 5.1로 registered domain 추출
- **도메인 어소리티**:
  - 1차: **Moz Links API** ($500/mo, 200k lookups) — `domain_authority` 0-100
  - 대안: Ahrefs API (더 비쌈), Majestic Trust Flow
  - 자체 크롤러는 6개월+ 구축 시간 필요 — MVP에서는 비추천
- **캐시**: 도메인당 30일 TTL (Redis), DA는 천천히 변함

---

## 4. Metric Computation Layer

### 핵심 메트릭 공식

```
N_brand_mentions(brand, engine, day) = COUNT(mentions where brand=B AND engine=E AND date=D)
N_total_mentions(engine, day)        = COUNT(all brand mentions for category)

# 1. Mention Rate (브랜드별 출현률)
mention_rate = prompts_with_brand_mention / total_prompts_queried

# 2. Share of Voice (SoV)
sov_mention   = N_brand_mentions / N_total_mentions_in_category
sov_position  = SUM(1/rank_of_mention) / SUM(1/rank for all brands)  # 1st cited = 1.0, 2nd = 0.5

# 3. Top-Position Share (최상단 노출률)
top_position_share = COUNT(mentions where position < 0.15) / N_brand_mentions

# 4. Citation Rate
citation_rate = prompts_citing_brand_domain / total_prompts_queried
citation_share = brand_citations / total_citations_in_category

# 5. Visibility-Citation Gap
vc_gap = mention_rate - citation_rate  # 양수면 "언급은 되나 출처로 인용 안됨" (위험 신호)

# 6. Blind Spot Score (0-100, 낮을수록 더 큰 사각지대)
blind_spot = 100 * (1 - mention_rate_for_prompt_cluster)
# 클러스터 단위. 1.0이면 절대 안 나옴 → 100점 사각지대

# 7. BII (Bluedot Intelligence Index, 0-100)
BII = 100 * (w1 * visibility + w2 * sentiment + w3 * citation + w4 * top_position)
# 기본 가중치: w1=0.40, w2=0.20, w3=0.25, w4=0.15
# visibility = sov_mention, sentiment = avg sentiment_score, citation = citation_share, top_position = top_position_share
```

가중치는 `metric_config` 테이블에 저장 (고객별 커스터마이즈 가능).

### 집계 그레인

- **per_prompt**: `prompt_id × engine × date` (raw)
- **per_topic**: `topic_cluster_id × engine × date` (HDBSCAN 클러스터 기반)
- **per_engine_day**: `brand × engine × date`
- **per_day_rollup**: `brand × date` (모든 엔진 가중평균; 가중치는 엔진별 사용자 비중 — ChatGPT 0.45, Google AI 0.30, Perplexity 0.10, Gemini 0.08, Claude 0.04, Copilot 0.02, Grok 0.01)

ClickHouse `MATERIALIZED VIEW`로 자동 롤업:

```sql
CREATE MATERIALIZED VIEW metrics_daily_mv
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(date)
ORDER BY (customer_id, brand_id, engine, date)
AS SELECT
  customer_id, brand_id, engine, date,
  countIf(mentioned = 1) AS mentions,
  count() AS prompts_queried,
  avg(sentiment_score) AS avg_sentiment,
  countIf(position < 0.15) AS top_positions
FROM answers_raw GROUP BY customer_id, brand_id, engine, date;
```

---

## 5. Data Storage & Query Layer

### OLTP/OLAP 분리

- **Postgres 16**: 운영 데이터 (customers, prompts, configs, auth) — row 단위 트랜잭션
- **ClickHouse 24.10**: 답변 raw 데이터 + 메트릭 시계열 — column-store, 집계 쿼리 50배 빠름
- **Redis 7.4**: 캐시, rate-limit, Celery broker, 도메인 어소리티 캐시
- **S3 (또는 R2)**: raw API response JSON 영구 보관 (gzip, ~$0.023/GB/mo)

### 스키마 (핵심만)

```sql
-- Postgres (운영)
CREATE TABLE customers (
  id UUID PRIMARY KEY, name TEXT, plan TEXT, brand_id UUID, created_at TIMESTAMPTZ);
CREATE TABLE brands (
  id UUID PRIMARY KEY, customer_id UUID, name TEXT, aliases JSONB,
  domain TEXT, category TEXT, competitors JSONB);
CREATE TABLE prompts (
  id BIGSERIAL PRIMARY KEY, customer_id UUID, text TEXT, prompt_hash BYTEA UNIQUE,
  topic_cluster_id INT, intent TEXT, lang CHAR(2), created_at TIMESTAMPTZ);
CREATE INDEX idx_prompts_cluster ON prompts(customer_id, topic_cluster_id);

CREATE TABLE runs (
  id UUID PRIMARY KEY, customer_id UUID, run_date DATE,
  status TEXT, started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  prompts_total INT, prompts_done INT);
```

```sql
-- ClickHouse (분석)
CREATE TABLE answers (
  customer_id UUID, run_id UUID, prompt_id UInt64, engine LowCardinality(String),
  date Date, raw_text String, latency_ms UInt32,
  s3_key String  -- raw response location
) ENGINE = MergeTree PARTITION BY toYYYYMM(date)
  ORDER BY (customer_id, date, engine, prompt_id);

CREATE TABLE mentions (
  customer_id UUID, prompt_id UInt64, engine LowCardinality(String), date Date,
  brand_id UUID, position Float32, sentiment_score Float32, mention_count UInt16
) ENGINE = MergeTree PARTITION BY toYYYYMM(date)
  ORDER BY (customer_id, brand_id, date, engine);

CREATE TABLE citations (
  customer_id UUID, prompt_id UInt64, engine LowCardinality(String), date Date,
  url String, domain String, domain_authority UInt8, citation_rank UInt8
) ENGINE = MergeTree PARTITION BY toYYYYMM(date)
  ORDER BY (customer_id, domain, date);
```

### 볼륨 추정

고객 1명, 일간 1회 스냅샷, 5,000 prompts × 7 engines = **35,000 answers/day**
- 월: ~1,050,000 answers, ~3,000,000 mentions/citations rows
- 저장: ClickHouse 압축 후 ~500MB/month, S3 raw ~15GB/month

---

## 6. API & Dashboard Backend

- **API 스택**: **FastAPI 0.115** + **Pydantic v2** + **strawberry-graphql 0.250** (대시보드 dependency-heavy 쿼리용)
  - REST: 단순 CRUD (`/brands`, `/prompts`, `/runs`)
  - GraphQL: 대시보드 복합 쿼리 (one round-trip로 BII+SoV+CompetitorComparison)
- **인증**: **Clerk** (B2B SaaS 1순위, SSO/SCIM/조직 관리 무료 티어 10,000 MAU)
  - 대안: Supabase Auth (RLS 기반, Postgres 통합 시 강력)
- **멀티테넌시**: **Schema-level isolation은 과함**. `customer_id` column + Postgres RLS + ClickHouse row policy 조합

```sql
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON prompts
  USING (customer_id = current_setting('app.current_customer')::uuid);
```

  - 모든 API 요청 시 `SET app.current_customer = '<jwt.customer_id>'` 주입 (FastAPI dependency)
- **레이트 리미트**: `slowapi` 0.1.9 (per-customer, plan별 차등)

---

## 7. Cost Model

고객 1명, 5,000 prompts × 7 engines × 30일 = **1,050,000 API calls/month** 기준:

| 항목 | 단가 | 월 비용 |
|---|---|---|
| OpenAI (gpt-4o, 150k calls, 평균 1k token in/out) | $5+$15 per 1M | $300 |
| Anthropic Claude (60k calls) | $15+$75 per 1M (Opus) → Sonnet $3+$15 권장 | $135 |
| Perplexity Sonar Pro (150k) | $3+$15 per 1M | $135 |
| Gemini 2.5 Pro (120k) | $1.25+$5 per 1M | $47 |
| SerpAPI Google AI Overviews (150k) | $5/1k searches | $750 |
| xAI Grok (15k, 우선순위 낮음) | $5+$15 per 1M | $15 |
| Copilot (browser, 30k via proxy) | 프록시+인프라 | $50 |
| **LLM 합계** | | **~$1,432** |
| Sentiment 모델 (g5.xlarge GPU, 공유) | $0.85/h × 200h 분할 | $50 |
| Moz Links API | $500 / 200k lookups (5 고객 공유) | $100 |
| Infra: ECS Fargate + ClickHouse Cloud + RDS | | $400 |
| S3 + CloudFront + Redis Cloud | | $80 |
| **고객 1명 총 변동비** | | **~$2,062/mo** |

### Break-even 분석

- **고정비** (엔지니어 2명 + 오버헤드): ~$30,000/mo
- **고객 1명 변동비**: $2,062
- **Gross margin 60% 목표 → 판매가 $5,150/mo**
- 손익분기점: 30,000 / (5,150 - 2,062) = **약 10명 고객**
- 실제 bi.bluedot.so 추정 가격대: $2,000-$10,000/mo (Enterprise tier)

**비용 절감 옵션** (Phase 2 이후):
- prompt 샘플링: 5,000 → 1,000 daily + 5,000 weekly (비용 −60%)
- `gpt-4o-mini` / `claude-haiku-4-5` 로 다운그레이드 (정확도 −5%, 비용 −80%)
- 자체 크롤링으로 SerpAPI 대체 (가장 큰 항목, $750 → $100)

---

## 8. MVP vs Full-Product Phasing

### Phase 1 — MVP (4주)
**목표**: 한 브랜드, 한 엔진(Perplexity)로 가치 시연

- 프롬프트 500개 (수동 큐레이션 + 50개 LLM 확장)
- Perplexity Sonar API 단일 연동, 일 1회 cron 실행
- 메트릭: mention_rate, sov_mention, citation_rate, top_position_share만
- 스택: FastAPI + Postgres + Redis + Celery (ClickHouse 없이 Postgres만)
- 대시보드: Next.js 16 + shadcn/ui + Recharts (3개 차트만)
- 인증: Clerk dev plan

### Phase 2 — Competitive Parity (8주)
**목표**: bi.bluedot.so 기능 동등

- 7개 엔진 전체 연동 (Copilot/Grok 포함)
- 프롬프트 5,000개, HDBSCAN 토픽 클러스터링, 의도 분류
- 감성 분석, BII, blind spot, competitor comparison
- ClickHouse 도입, 메트릭 materialized views
- 멀티테넌시 RLS, plan-based rate limit
- Moz API 연동, 도메인 어소리티 통합

### Phase 3 — Differentiation (12주+)
**목표**: 모방 가능한 영역 넘어서기

- **Alert engine**: 메트릭 anomaly detection (Prophet 1.1.6 또는 ADTK)
- **Recommendation engine**: blind spot → 추천 콘텐츠 outline 자동 생성 (`gpt-4o` few-shot)
- **A/B simulation**: "이런 콘텐츠를 발행하면 BII가 얼마나 오를까?" 시뮬레이션 (RAG + 답변 재생성)
- **Citation Trace**: 인용된 URL의 콘텐츠 분석 → 어떤 H2/표 구조가 LLM에 인용되는지 패턴 학습
- **Real-time 모드**: 일 1회 → 시간 단위 ("이슈 발생 시" 트리거)
- **LLM optimizer**: 자체 llms.txt 자동 생성, schema.org 마크업 추천

---

## 부록: 핵심 기술 결정 요약

| 결정 항목 | 선택 | 거부한 대안 |
|---|---|---|
| 언어/프레임워크 | Python 3.13 + FastAPI 0.115 | Go (LLM SDK 빈약), Node (NER 약함) |
| Queue | Celery 5.4 + RedBeat | Temporal (오버스펙), BullMQ (Python 통합 약함) |
| OLAP | ClickHouse 24.10 | BigQuery (vendor lock), DuckDB (분산 불가) |
| Sentiment | KoElectra + Twitter-RoBERTa 자체 호스팅 | GPT-4o judge (10배 비쌈) |
| NER | Aho-Corasick + alias dict | spaCy NER (도메인 적응 비용), LLM judge (느림) |
| Auth | Clerk | Supabase Auth (Postgres 락인), NextAuth (B2B 약함) |
| API 스타일 | REST + GraphQL 하이브리드 | tRPC (Python 미지원), pure GraphQL (CRUD에 과함) |
| 도메인 어소리티 | Moz Links API | Ahrefs (2배 비쌈), 자체 크롤러 (6개월 +) |

---

## 잠재 이슈 & 추가 검증 필요사항

1. **Copilot/ChatGPT 웹 자동화 ToS 위반 리스크** — Phase 2 진입 전 법률 검토 필수. API 가능한 엔진만으로 가는 것도 옵션
2. **답변 비결정성** — 같은 프롬프트도 매번 다른 응답. `temperature=0` 가능한 엔진만 결정적이며, 통계적 안정화를 위해 프롬프트당 N=3 샘플링 권장 (비용 3배)
3. **다국어 감성 정확도** — KoElectra가 도메인(핀테크/이커머스)에 따라 성능 편차 큼. 고객별 fine-tune 데이터셋 큐레이션 필요
4. **SerpAPI 의존도** — Google AI Overviews 가장 큰 비용 항목. 자체 크롤러 구축 시 captcha/IP 차단 위험
5. **BII 가중치 검증** — 가중치 w1-w4가 실제 비즈니스 성과와 상관관계 있는지 백테스트 필요
6. **GDPR/개인정보** — 답변에 사용자명/이메일 우연 포함 시 PII 스크러빙 파이프라인 필요 (`presidio-analyzer` 2.2)
