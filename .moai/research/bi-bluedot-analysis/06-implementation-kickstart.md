# 06. 즉시 시작 가이드 (Day 0 → Day 30)

> 이 문서는 "이제 키보드를 두드릴 시간"의 사람을 위한 것. 본 보고서 02·03·04를 함께 읽고 시작하라.

## 6.1 Day 0 체크리스트 (반나절)

- [ ] **도메인 확보**
  - 후보: `ai-citation.kr`, `geo-radar.kr`, `aisense.kr`, `ranklytics.ai`, `bracon.io` (브랜드 + Cognition)
  - `whois.co.kr` + Namecheap 동시 확인, ₩15K 이하
- [ ] **회사명 + 슬로건 1차안**
  - 영문 카테고리: GEO Analytics for Korean Brands
  - 국문 카테고리: AI 검색 가시성 측정·실행 SaaS
- [ ] **API 키 일괄 발급** (개인 명의 가능)
  - OpenAI ($5 크레딧)
  - Anthropic ($5 크레딧)
  - Perplexity Sonar ($20 prepaid)
  - Google AI Studio (무료 Gemini)
  - SerpAPI 무료 100회 trial 또는 Serper.dev $50 plan
- [ ] **결제 인프라**
  - TossPayments 가맹점 신청 (개인사업자 등록 + 사업자등록증)
  - Stripe Atlas (해외 결제 대비, 후순위)
- [ ] **인프라 계정**
  - Vercel (Pro $20/mo, ICN1 리전 확보용)
  - Supabase ($25/mo Pro)
  - Upstash Redis (서버리스, 무료 티어)
  - Fly.io (워커 호스팅, $5 크레딧)
  - GitHub 저장소 (private)
- [ ] **법무 1차 검토**
  - 이용약관, 개인정보처리방침 (Termly 또는 한국 변호사 50만원 자문)
  - LLM 답변 저장에 대한 ToS 명시 (개인정보 비식별 약속)

## 6.2 Day 1–7: Phase 0 검증 (코드 0줄)

목표: **5명에게 수동으로 GEO 진단 리포트를 발송하고 가격 반응을 본다.**

```
수동 작업 흐름:
1. 친구·전 동료 회사 5곳 선정 (마케팅 리드 있는 곳)
2. 각 브랜드당 30개 프롬프트 손으로 작성 (카테고리 + 비교 + 추천)
3. 각 프롬프트를 ChatGPT, Perplexity, Gemini에 직접 입력 → 답변 복붙
4. Google Sheets에 정리:
   - 프롬프트 / 엔진 / 답변 원문 / 브랜드 멘션 Y/N / 인용 URL
5. 메트릭 손계산:
   - Mention Rate = 멘션된 답변 수 / 30
   - Citation Rate = 우리 도메인 인용 답변 수 / 30
   - Top Blind Spots = 멘션 안 된 프롬프트 TOP 10
6. PDF 1장 리포트 발송 + 30분 미팅 제안
   - 리포트 마지막에 "월 자동 분석 ₩99K, 사전등록자 6개월 50%"
```

**합격 기준**: 5명 중 3명 이상 "내년 예산 가능" 응답 → Phase 1 진입.

## 6.3 Day 8–35: Phase 1 MVP (4주)

### Week 1: 스켈레톤

```bash
# 프로젝트 생성
pnpm create next-app@latest geo-radar --typescript --tailwind --app --src-dir
cd geo-radar
pnpm dlx shadcn@latest init

# 백엔드 (별도 디렉토리)
mkdir -p ../geo-radar-worker
cd ../geo-radar-worker
uv init                              # Python 3.13 + uv 0.5
uv add fastapi[standard] celery[redis] redis tenacity \
       openai anthropic google-genai \
       sqlmodel pydantic-settings python-dotenv

# 데이터베이스
# Supabase project 생성 → schema.sql 적용
```

`schema.sql` (최소):

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  aliases JSONB NOT NULL DEFAULT '[]',
  domain TEXT,
  category TEXT,
  competitors JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE prompts (
  id BIGSERIAL PRIMARY KEY,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  prompt_hash BYTEA NOT NULL UNIQUE,
  lang CHAR(2) DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id),
  run_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  prompts_total INT NOT NULL,
  prompts_done INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(brand_id, run_date)
);

CREATE TABLE answers (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
  prompt_id BIGINT REFERENCES prompts(id),
  engine TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE mentions (
  id BIGSERIAL PRIMARY KEY,
  answer_id BIGINT REFERENCES answers(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id),
  position FLOAT NOT NULL,
  sentiment FLOAT,
  mention_count INT DEFAULT 1
);

CREATE TABLE citations (
  id BIGSERIAL PRIMARY KEY,
  answer_id BIGINT REFERENCES answers(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  rank INT
);

CREATE INDEX idx_answers_run ON answers(run_id);
CREATE INDEX idx_mentions_brand ON mentions(brand_id);
CREATE INDEX idx_citations_domain ON citations(domain);
```

### Week 2: LLM 쿼리 파이프라인 (단일 엔진부터)

`worker/engines/perplexity.py`:

```python
import os, httpx, asyncio
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

class PerplexityClient:
    URL = "https://api.perplexity.ai/chat/completions"
    def __init__(self):
        self.key = os.environ["PERPLEXITY_API_KEY"]

    @retry(stop=stop_after_attempt(5),
           wait=wait_exponential(multiplier=1, min=1, max=16),
           retry=retry_if_exception_type(httpx.HTTPStatusError))
    async def query(self, prompt: str) -> dict:
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(self.URL,
                headers={"Authorization": f"Bearer {self.key}"},
                json={
                    "model": "sonar-pro",
                    "messages": [{"role": "user", "content": prompt}],
                    "return_citations": True,
                })
            r.raise_for_status()
            d = r.json()
            return {
                "text": d["choices"][0]["message"]["content"],
                "citations": d.get("citations", []),
            }
```

`worker/tasks.py`:

```python
from celery import Celery
from sqlmodel import Session, select
from .engines.perplexity import PerplexityClient
from .extractors import extract_mentions, extract_citations
from .db import engine_db, Run, Answer, Mention, Citation, Prompt, Brand
from datetime import date

celery = Celery("geo", broker=os.environ["REDIS_URL"])

@celery.task
def run_daily_snapshot(brand_id: str):
    today = date.today()
    with Session(engine_db) as s:
        brand = s.get(Brand, brand_id)
        run = Run(brand_id=brand_id, run_date=today, status="running",
                  prompts_total=s.exec(select(Prompt).where(Prompt.brand_id==brand_id)).all().__len__())
        s.add(run); s.commit(); s.refresh(run)

        prompts = s.exec(select(Prompt).where(Prompt.brand_id==brand_id)).all()
        for p in prompts:
            for engine_name in ["perplexity"]:        # MVP: 1 엔진
                process_one.delay(run.id, p.id, engine_name)

@celery.task
def process_one(run_id, prompt_id, engine):
    client = PerplexityClient()
    with Session(engine_db) as s:
        prompt = s.get(Prompt, prompt_id)
        brand = s.exec(select(Brand).where(Brand.id == prompt.brand_id)).first()
        result = asyncio.run(client.query(prompt.text))

        ans = Answer(run_id=run_id, prompt_id=prompt_id, engine=engine,
                     raw_text=result["text"])
        s.add(ans); s.commit(); s.refresh(ans)

        mentions = extract_mentions(result["text"], brand.aliases)
        for m in mentions:
            s.add(Mention(answer_id=ans.id, brand_id=brand.id,
                          position=m["position"], sentiment=m.get("sentiment", 0.5)))

        for rank, url in enumerate(result.get("citations", []), 1):
            domain = canonicalize_domain(url)
            s.add(Citation(answer_id=ans.id, url=url, domain=domain, rank=rank))

        s.commit()
```

`worker/extractors.py`:

```python
import ahocorasick
from urllib.parse import urlparse
import tldextract

def build_automaton(aliases: list[str]) -> ahocorasick.Automaton:
    A = ahocorasick.Automaton()
    for i, a in enumerate(aliases):
        A.add_word(a.lower(), (i, a))
    A.make_automaton()
    return A

def extract_mentions(text: str, aliases: list[str]) -> list[dict]:
    A = build_automaton(aliases)
    text_lower = text.lower()
    hits = []
    for end_idx, (i, alias) in A.iter(text_lower):
        start_idx = end_idx - len(alias) + 1
        hits.append({
            "position": start_idx / max(len(text), 1),
            "alias": alias,
        })
    if not hits:
        return []
    # 가장 처음 등장한 멘션만 카운트 (MVP)
    return [min(hits, key=lambda h: h["position"])]

def canonicalize_domain(url: str) -> str:
    ext = tldextract.extract(url)
    return f"{ext.domain}.{ext.suffix}"
```

### Week 3: 메트릭 + 대시보드

`web/lib/metrics.ts`:

```typescript
import { sql } from '@/lib/db';

export async function getKPIs(brandId: string, runDate: string) {
  const result = await sql`
    SELECT
      COUNT(DISTINCT a.id) AS total_answers,
      COUNT(DISTINCT m.answer_id) AS mentioned_answers,
      COUNT(DISTINCT CASE WHEN c.domain = b.domain THEN c.answer_id END) AS cited_answers,
      AVG(m.sentiment) FILTER (WHERE m.brand_id = ${brandId}) AS avg_sentiment
    FROM brands b
    JOIN runs r ON r.brand_id = b.id AND r.run_date = ${runDate}
    JOIN answers a ON a.run_id = r.id
    LEFT JOIN mentions m ON m.answer_id = a.id AND m.brand_id = b.id
    LEFT JOIN citations c ON c.answer_id = a.id
    WHERE b.id = ${brandId}
    GROUP BY b.id, b.domain
  `;
  const r = result[0];
  return {
    visibility: r.total_answers ? r.mentioned_answers / r.total_answers : 0,
    citationRate: r.total_answers ? r.cited_answers / r.total_answers : 0,
    sentiment: r.avg_sentiment ?? 0.5,
    gap: (r.mentioned_answers - r.cited_answers) / Math.max(r.total_answers, 1),
  };
}
```

`web/app/(dashboard)/dashboard/page.tsx`:

```tsx
import { KPIBigCard } from "@/components/dashboard/kpi-big-card";
import { getKPIs, getKPISparkline } from "@/lib/metrics";

export default async function DashboardPage({ searchParams }: { searchParams: { brand?: string } }) {
  const brandId = searchParams.brand ?? process.env.DEMO_BRAND_ID!;
  const today = new Date().toISOString().slice(0, 10);
  const kpis = await getKPIs(brandId, today);
  const trend = await getKPISparkline(brandId, 7);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      <KPIBigCard
        label="브랜드 가시성"
        value={kpis.visibility * 100}
        unit="%"
        delta={{ value: trend.visibility.delta, period: "wow" }}
        sparklineData={trend.visibility.points}
        tooltip="AI 답변 중 우리 브랜드가 언급된 비율" />
      <KPIBigCard
        label="도메인 인용률"
        value={kpis.citationRate * 100}
        unit="%"
        delta={{ value: trend.citation.delta, period: "wow" }}
        sparklineData={trend.citation.points}
        tooltip="AI 답변이 우리 사이트를 출처로 인용한 비율" />
      <KPIBigCard
        label="가시성·인용률 갭"
        value={kpis.gap * 100}
        unit="%"
        delta={{ value: trend.gap.delta, period: "wow" }}
        sparklineData={trend.gap.points}
        tooltip="양수면 '언급은 되나 출처로 인용 안됨' = 콘텐츠 부재 신호" />
    </div>
  );
}
```

### Week 4: 통합 + 알파 출시

- Fly.io 워커 배포 + Celery Beat 일 1회 KST 03:00 cron
- Vercel 프론트 배포
- Clerk 또는 Supabase Auth 회원가입
- 알파 5명 초대 + 첫 스냅샷 트리거
- Sentry, Axiom 로깅 연결
- "데모 데이터" placeholder로 첫 24h 빈 화면 방지

## 6.4 Day 36–90: Phase 2 베타 (8주)

상세는 본 보고서 04 섹션 Phase 2 참조. 핵심 추가 작업:

1. **엔진 추가**: ChatGPT, Gemini, Google AI Overviews 통합 (각 1주)
2. **프롬프트 자동 생성**: GPT-4o-mini 기반 3-layer fan-out (2주)
3. **감성 분석**: gpt-4o-mini judge MVP → KoElectra 자체 호스팅 검토 (2주)
4. **멀티테넌시**: Postgres RLS + Clerk Org (1주)
5. **결제**: TossPayments 정기결제 + Webhooks (2주)
6. **이메일 알림**: Resend + 첫 스냅샷 완료 알림 (3일)

## 6.5 디렉토리 구조 (권장)

```
geo-radar/                              # 모노레포 권장 (turborepo)
├── apps/
│   ├── web/                            # Next.js 16
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── package.json
│   └── worker/                         # Python FastAPI + Celery
│       ├── src/
│       │   ├── api/                    # FastAPI routes
│       │   ├── engines/                # LLM 클라이언트들
│       │   ├── tasks/                  # Celery tasks
│       │   ├── extractors/             # mention, citation, sentiment
│       │   ├── metrics/                # 메트릭 계산
│       │   └── db/                     # SQLModel models
│       ├── pyproject.toml
│       └── Dockerfile
├── packages/
│   ├── shared-types/                   # zod schemas, 양 앱 공유
│   ├── eslint-config/
│   └── tsconfig/
├── docs/
│   ├── prd.md
│   ├── api.md
│   └── runbook.md
├── infra/
│   ├── supabase/migrations/
│   ├── fly.toml
│   └── vercel.json
├── .env.example
├── turbo.json
└── README.md
```

## 6.6 .env.example

```bash
# Database
DATABASE_URL=postgresql://...supabase.co:6543/postgres
REDIS_URL=rediss://...upstash.io:6379

# LLM APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...
GOOGLE_AI_API_KEY=AIza...
XAI_API_KEY=xai-...
SERPAPI_KEY=...

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Payments
TOSS_SECRET_KEY=test_sk_...
TOSS_CLIENT_KEY=test_ck_...

# Observability
SENTRY_DSN=https://...
AXIOM_TOKEN=xaat-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
WORKER_URL=http://localhost:8000
```

## 6.7 첫 100 프롬프트 시드 (한국 핀테크 예시)

`seeds/prompts-fintech-ko.txt`:

```
한국에서 가장 안전한 간편결제 앱은?
20대가 가장 많이 쓰는 금융 앱 추천해줘
주식 초보자에게 좋은 증권 앱은?
무료로 신용점수 올리는 방법
KB국민카드 vs 신한카드 어떤 게 좋아?
가계부 앱 추천 2026
적금 이자 가장 높은 은행
직장인 자동이체 비교
부모님께 추천할 만한 송금 앱
대학생 첫 카드 추천
이체수수료 없는 은행
달러 환전 가장 저렴한 곳
... (총 100개)
```

생성 명령:

```bash
python tools/expand_prompts.py \
  --category "한국 핀테크" \
  --seed-count 20 \
  --target-count 100 \
  --lang ko \
  --out seeds/prompts-fintech-ko.txt
```

## 6.8 비용 모니터링 알람

```python
# worker/src/monitoring/cost_guard.py
DAILY_BUDGET_USD = 50.0  # MVP

def check_budget() -> bool:
    spent_today = redis.get(f"spent:{date.today()}") or 0
    if float(spent_today) > DAILY_BUDGET_USD * 0.9:
        send_slack_alert(f"⚠️ Daily LLM budget 90% — ${spent_today:.2f}/{DAILY_BUDGET_USD}")
    if float(spent_today) > DAILY_BUDGET_USD:
        send_slack_alert(f"🛑 BUDGET EXCEEDED — halting workers")
        return False
    return True
```

알람은 첫 주에 반드시 켜 두어야 함. 잘못된 fan-out 1번이면 ₩100K 날아갈 수 있음.

## 6.9 도그푸딩 — 자기 검증

자기 사이트를 즉시 모니터링:
1. 본 사이트(`nedabahway-site` 또는 새 회사 도메인)의 도메인을 brand에 등록
2. 카테고리 "AI 검색 최적화", "GEO 도구", "한국 GEO SaaS" 등 30개 프롬프트
3. 첫 스냅샷에서 우리가 안 잡히면 → 그 자체가 첫 콘텐츠 주제 ("우리도 잡혀야 한다")

## 6.10 합격/실패 게이트

| 시점 | 합격 기준 | 실패 시 액션 |
|---|---|---|
| Day 7 | 사전등록 ≥ 20, LOI ≥ 3 | ICP 재정의 1주 |
| Day 35 | 알파 5명, NPS ≥ 30 | 가치 가설 재검토 |
| Day 90 (Phase 2 끝) | 유료 10명, MRR ₩3M | 가격/온보딩 개선 1개월 |
| Day 180 | 유료 30명, MRR ₩10M | 채널 다각화 또는 피벗 |

---

**다음 액션 권장**: 이 보고서를 출력해 두고 Day 0 체크리스트의 첫 항목(도메인 확보)부터 1시간 안에 시작하라. 6개월 후 첫 BEP 고객 230명 도달이 목표라면, 매일 1.3명 사이닝업이 필요하다. 시간을 낭비할 여유가 없다.
