# Content & Data Accumulation Strategy

Status: DRAFT
Date: 2026-05-19
Owner: MoAI Orchestrator (on behalf of 김창환 / 네다바웨이)
Scope: nedabah.org — static education-business site, one operator, no paid services

This document defines **how the site continuously accumulates search presence,
content, and structured data — at scale but effectively**. It is a strategy,
not content. It tells future content and agent batches *what* to build, in
*what order*, and *what bar* every piece must clear before it ships.

It does not re-derive business strategy. The five programs, the audience, the
authority assets, the voice rules, and the S1–S6 funnel are fixed inputs from
`.moai/strategy/site-strategy.yaml` and `.moai/plans/funnel-100-master-plan.md`.

---

## 0. Where the site stands today

The accumulation strategy starts from real assets already in the repository.
This is an *additive* plan — it grows what exists, it does not restart.

| Asset | Current state | Accumulation surface |
|-------|--------------|----------------------|
| Perspective notes (`blog/perspective/`) | 100+ short observation essays (관점 노트), WFO tone, dated | Awareness layer — feeds all five programs |
| Topic taxonomy (`topics/`) | 10-area matrix (일·진로·관계·소통·리더십·번아웃·부모자녀·AI 시대·자기이해·창직) | Cluster spine already half-built |
| Magazine (`magazine/`) | Large structured corpus + `feed.xml` | Long-form free-value layer |
| Resources corpus (`resources/`) | 108 guides, 491 curations, 288 evidence, 132 worksheets, 131 diagnostics, 131 prompts; `feed.json`, `search-index.json`, `kpi.json` | Machine-readable data layer + lead magnet |
| Glossary (`glossary.html`) | Single page, domain terms | Structured-data + AI-crawler surface |
| FAQ (`faq.html`) | Single page, schema.org FAQPage | Structured-data + objection-handling surface |
| Knowledge graph (`knowledge-graph.jsonld`) | 7 entities: Person, Organization, WebSite, Book, Blog, Periodical | Entity backbone — under-populated vs the 5 programs |
| Landing pages (`p/`) | 5 program pages built (STARCP, IDEN-Teacher, IDEN-Career, 창직, 5S) | Conversion targets — every cluster must point here |
| CI gate (`.github/workflows/funnel-qa.yml`) | Live S1–S4 funnel gate + HTML lint, runs on push/PR/weekly | Non-regression enforcement — extend, do not replace |

**The gap this strategy closes:** the site has a strong *awareness* layer
(100+ perspective notes) but those notes are not yet organized into
**program-feeding SEO topic clusters**, and the **knowledge graph names only 1
of the 5 programs as entities**. Accumulation from here must be *directed* —
every new piece must feed a named cluster, a named program, and a named funnel
CTA, or it does not ship.

---

## 1. Topic-Cluster Architecture

### 1.1 The model

One **topic cluster per program**. Each cluster has:

- **1 pillar page** — a comprehensive, evergreen hub answering the program's
  central question. Internally links *down* to every supporting article and
  *across* to the program landing page in `p/`.
- **6–10 supporting articles** — long-tail pieces, each targeting one specific
  search intent of the target audience. Each links *up* to the pillar and
  *across* to one funnel CTA.

This is the standard hub-and-spoke SEO architecture. It works on a static site
with zero paid tooling: links are HTML, the pillar is one page, the spokes are
pages. Search engines and AI crawlers read topical authority from the link
graph; the existing `sitemap.xml` and `funnel-qa.yml` already enforce coverage.

**Grounding rule (anti-slop):** topics below are derived from the *real* pain
points in `site-strategy.yaml` (`target_pain` per program) and the lived
situations already written into `blog/perspective/`. They describe search
**intent qualitatively** — what the person types into a search box and why.
**No search-volume numbers are invented.** Where an existing perspective note
already covers a spoke, the spoke is a *consolidation + expansion* job, not a
net-new write.

### 1.2 Cluster 1 — STARCP 마스터 (취업 컨설턴트 양성)

- **Feeds program:** `p/starcp.html` — STARCP 마스터 (4,000,000원, 12주)
- **Audience:** 현직 취업 컨설턴트, 자소서·면접 코치
- **Funnel CTA:** `cta_primary` — "1기 모집 일정·커리큘럼 보기" / `cta_secondary` — 무료 30분 적합도 진단

**Pillar:** "취업 컨설턴트로 차별화하는 법 — 무료 AI 시대의 코칭 단가 설계"
(Intent: a working consultant searches for *how to stay relevant and priced
above free AI tools*. This is the program's core promise.)

**Supporting articles (8):**

1. 사람인 무료 AI 자소서 vs 사람이 하는 코칭 — 무엇이 다른가
   (Intent: consultant comparing their own service against free AI; objection research.)
2. 자소서 첨삭 단가 30만원에 갇히는 이유와 벗어나는 구조
   (Intent: pricing-pain search — exactly `target_pain` for this program.)
3. STARCP 흐름이란 무엇인가 — 합격 트레이닝 코칭의 5단계
   (Intent: branded-method explainer; consolidates method authority.)
4. 똑같은 면접 답변을 만들지 않는 코칭 질문 설계
   (Intent: practitioner searching for a concrete coaching technique.)
5. 취업 컨설턴트가 자기 시그니처 컨설팅을 만드는 절차
   (Intent: maps directly to the program `deliverable` — "본인 시그니처 컨설팅 1개".)
6. AI 코치 도구를 직접 운영해 본 기록 — 자소서코치·면접코치 2종
   (Intent: trust/proof search; grounded in `ai_coaches` authority asset.)
7. 코칭 노하우를 12주 안에 전수받는다는 것의 의미
   (Intent: program-format research — what a cohort actually does.)
8. 강사 노하우와 삶 정리 — 왜 둘을 같이 다루는가
   (Intent: differentiator search; ties STARCP to the WFO thesis.)

### 1.3 Cluster 2 — IDEN 좌표 마스터 (진로교사)

- **Feeds program:** `p/iden-teacher.html` — IDEN 좌표 마스터 (3,500,000원, 12주)
- **Audience:** 중·고교 진로전담교사, 진로상담사, 자유학기제 운영 교사
- **Funnel CTA:** `cta_primary` — "학교 연수예산 활용안 받기" / `cta_secondary` — 교사 무료 30분 상담

**Pillar:** "진로교사를 위한 IDEN 좌표 — 표준 진로교육 자료의 한계를 넘는 법"
(Intent: a career teacher searches for *a better framework than the standard
issued materials*.)

**Supporting articles (8):**

1. 학생 1:1 진로상담 30분 표준형 만들기
   (Intent: practical-procedure search — directly the `target_pain` "30분 안에 끝나지 않음".)
2. 자유학기제·고교학점제에 IDEN 5S 사이클 적용하기
   (Intent: policy-application search — the program's named adaptation.)
3. IDEN 3칸 좌표 도출기 사용법 — 5분 진로 진단
   (Intent: tool-usage search; grounded in `iden_tool` authority asset.)
4. 적성검사가 알려주는 것과 알려주지 못하는 것
   (Intent: high-relevance — an existing perspective note already covers this;
   consolidate `2026-05-02_적성검사가알려주는건사실그반대다`.)
5. 진로교사가 가장 많이 듣는 질문과 그 뒤의 진짜 질문
   (Intent: consolidate `2026-04-25_진로강사가가장많이듣는질문`; expand into teacher context.)
6. 학생이 먼저 질문하지 않는 진로수업 — 두 가지 원인
   (Intent: consolidate `2026-05-22_학생이먼저질문안하는수업의두가지원인`.)
7. 학교 연수예산으로 진로교사 역량을 키우는 설계안
   (Intent: budget-justification search — maps to `cta_primary`.)
8. 본인 학교 진로상담 매뉴얼을 만드는 12주 절차
   (Intent: maps to the program `deliverable`.)

### 1.4 Cluster 3 — IDEN 진로 재설계 (30~40대 이직·전직)

- **Feeds program:** `p/iden-career.html` — IDEN 진로 재설계 (2,500,000원, 12주)
- **Audience:** 이직 고민 30~40대, 경력단절 후 복귀, 번아웃 후 재정렬 직장인
- **Funnel CTA:** `cta_primary` — "12주 일정 + 첫 회기 신청" / `cta_secondary` — 무료 30분 진로 진단

**Pillar:** "30~40대 이직, 무엇이 될까가 아니라 누구를 향할까 — IDEN 진로 재설계"
(Intent: a mid-career professional searches for *how to decide on a career
move when the usual questions stopped working*. Directly the program thesis.)

**Supporting articles (9):**

1. 이력서·자소서가 흔들리는 이유 — 좌표가 없을 때
   (Intent: job-search-doc pain; existing note `2026-05-24_왜자기소개서를쓰면자기가더모호해질까` consolidates here.)
2. 회사가 안 맞는 것 같다는 느낌을 점검하는 법
   (Intent: consolidate `2026-04-21_회사가안맞는것같다는30대`.)
3. 번아웃 후 다시 일을 정렬하는 90일 행동계획
   (Intent: recovery-planning search — maps to program `deliverable`.)
4. 경력단절 후 복귀 6개월의 자리
   (Intent: consolidate `2026-06-03_육아휴직복귀후6개월의자리`; re-entry intent.)
5. 인생 10장면 인터뷰 — 전환점을 찾는 방법
   (Intent: branded-method explainer; the program's signature exercise.)
6. 이직 시나리오 3안을 만드는 법 — 한 길만 보지 않기
   (Intent: decision-architecture search.)
7. 다음 1년의 좌표가 없다고 느낄 때
   (Intent: the program `target_pain` verbatim.)
8. 퇴사를 고민한 지 6개월 — 무엇을 점검할까
   (Intent: consolidate `2026-05-30_퇴사를고민한지6개월된한직장인의메일`.)
9. 자기 진술 한 줄을 만드는 절차
   (Intent: maps to program `deliverable` — "자기 진술 한 줄".)

### 1.5 Cluster 4 — 창직·1인 사업자

- **Feeds program:** `p/changjig.html` — 창직·1인 사업자 (5,000,000원, 12주)
- **Audience:** 회사 그만두고 자기 길 찾는 30~50대, 부캐 키우는 직장인, 1인 컨설팅 시작자
- **Funnel CTA:** `cta_primary` — "12주 창직 트랙 신청" / `cta_secondary` — 무료 30분 사업 진단

**Pillar:** "창직 — 아이디어는 있는데 첫 고객이 없을 때의 12주 절차"
(Intent: an aspiring solo founder searches for *how to go from idea to first
paying customer*.)

**Supporting articles (8):**

1. 창직이라는 말이 갖는 함정
   (Intent: consolidate `2026-05-09_창직이라는말이갖는함정`; reframe the term.)
2. 문제 정의 한 줄 쓰기 — 사업 좌표의 시작
   (Intent: branded-method first step.)
3. 고객 5명 인터뷰로 아이디어를 검증하는 법
   (Intent: validation-procedure search.)
4. 린 캔버스를 1인 사업자가 실제로 쓰는 법 (M7)
   (Intent: branded-tool explainer.)
5. MVP 1주 실험 — 검증 안 된 아이디어를 테스트하기
   (Intent: the program `target_pain` "MVP 검증 안 됨".)
6. 1인 사업자가 자기소개를 못 하는 이유
   (Intent: consolidate `2026-04-10_1인사업자가자기소개를못하는이유`.)
7. 첫 고객 5명 명단을 만드는 절차
   (Intent: maps to program `deliverable`.)
8. 관리자가 창직을 시도할 때 자주 놓치는 것
   (Intent: consolidate `2026-05-19_관리자가창직을시도할때자주놓치는것`; bridges to Cluster 5.)

### 1.6 Cluster 5 — 5S 리더십 마스터

- **Feeds program:** `p/5s-leadership.html` — 5S 리더십 마스터 (6,000,000원, 6개월)
- **Audience:** 팀장 1년 차, 신임 임원, 팀 성과 정체 중간관리자
- **Funnel CTA:** `cta_primary` — "6개월 코칭 일정 받기" / `cta_secondary` — 무료 30분 리더십 진단

**Pillar:** "신임 팀장을 위한 5S 리더십 — 처리하는 팀에서 설계하는 팀으로"
(Intent: a first-year team lead searches for *how to lead well when the team
only executes and never designs*. Directly the program `target_pain`.)

**Supporting articles (8):**

1. 신임 팀장의 첫 후회 — 가장 많이 하는 실수
   (Intent: consolidate `2026-01-11_신임팀장의첫후회` and `2026-05-10_관리자가가장많이실수하는한자리`.)
2. 5S 사이클이란 — See·Speak·Sense·Steer·Sustain
   (Intent: branded-method explainer; grounded in `5s_frame` authority asset.)
3. 팀 1on1을 무겁지 않게, 비지 않게 하는 가이드
   (Intent: the program `target_pain` "1on1·회의·피드백 무게 약함".)
4. 주간 회의를 다시 설계하는 법
   (Intent: maps to program `deliverable` — "주간 회의 재설계".)
5. 회의에서 한마디도 안 하는 팀원을 대하는 자리
   (Intent: consolidate `2026-04-30_회의에서한마디도안하는팀원`.)
6. 팀원이 그만두겠다고 할 때
   (Intent: consolidate `2026-04-20_팀원이그만두겠다고할때`.)
7. 자기 리더십을 진단하는 5S 자기 진단
   (Intent: the program `target_pain` "자기 리더십 진단 부재".)
8. 90일 팀 로드맵을 만드는 절차
   (Intent: maps to program `deliverable`.)

### 1.7 Cluster summary

| # | Cluster | Pillar | Supporting topics | Funnel target |
|---|---------|--------|-------------------|---------------|
| 1 | STARCP 마스터 | 취업 컨설턴트로 차별화하는 법 | 8 | `p/starcp.html` |
| 2 | IDEN 좌표 마스터 (진로교사) | 진로교사를 위한 IDEN 좌표 | 8 | `p/iden-teacher.html` |
| 3 | IDEN 진로 재설계 (이직·전직) | 30~40대 이직 — 누구를 향할까 | 9 | `p/iden-career.html` |
| 4 | 창직·1인 사업자 | 창직 — 첫 고객이 없을 때의 12주 | 8 | `p/changjig.html` |
| 5 | 5S 리더십 마스터 | 신임 팀장을 위한 5S 리더십 | 8 | `p/5s-leadership.html` |

Total: **5 pillars + 41 supporting articles = 46 cluster pages.** Of these, at
least 18 supporting articles are *consolidation + expansion* of existing
perspective notes — accumulation reuses prior work, it does not duplicate it.

### 1.8 The 100+ existing perspective notes

The `blog/perspective/` corpus is the **awareness layer** and must NOT be
forced into clusters. It stays as the daily-observation stream feeding the
`topics/` 10-area matrix. Its accumulation rule: each *new* perspective note,
where its situation matches a cluster, ends with one contextual internal link
to the relevant pillar. This wires the awareness layer into the cluster spine
without rewriting the existing 100+ notes.

---

## 2. Data / Structured-Data Accumulation

Content accumulation without data accumulation produces pages that humans can
read but machines index poorly. The two must grow together.

### 2.1 Knowledge-graph entity expansion

`knowledge-graph.jsonld` currently holds 7 entities. The 5 programs are
business-critical entities and only 1 (the Book) is represented. Plan:

- **Add 5 `Course` / `EducationalOccupationalProgram` entities** — one per
  program, each `@id`-linked to its `p/` landing page, `provider`-linked to the
  `#organization`, `about`-tagged with the program's domain terms.
- **Add 5 `CollectionPage` entities** — one per topic cluster pillar, each
  linking its supporting articles via `hasPart`.
- **Cross-link** every cluster pillar entity to the `Course` entity it feeds
  and to the `Person` (김창환) entity. The graph then expresses the full chain:
  Person → teaches → Course → explained-by → Pillar → contains → Articles.
- **Resolve the two `TBD` fields** on the Book entity (`datePublished`, `isbn`)
  when the 2026 POD launch firms up — tracked, not invented now.

### 2.2 Per-content JSON-LD coverage

Every cluster page ships with a JSON-LD block — this is non-negotiable and the
`funnel-qa.yml` S1 check already fails the build on invalid JSON-LD.

- **Pillar pages:** `Article` + `BreadcrumbList`, `isPartOf` the cluster
  `CollectionPage`, `mentions` the program `Course`.
- **Supporting articles:** `Article` + `BreadcrumbList`, `isPartOf` the pillar.
- **Glossary:** migrate to `DefinedTermSet` with each term a `DefinedTerm`.
- **FAQ:** keep `FAQPage`; every new Q/A pair is a `Question`/`Answer`.
- **Resources items:** `feed.json` items typed as `HowTo`, `Article`, or
  `LearningResource` as appropriate.

### 2.3 The resources/ data corpus

`resources/` is already the richest machine-readable layer: 108 guides, 491
curations, 288 evidence files, 132 worksheets, 131 diagnostics, 131 prompts,
plus `feed.json`, `search-index.json`, and `kpi.json`. Accumulation rule here is
**curation over generation**:

- New resource items must each be tagged to a program/cluster — an untagged
  resource is funnel-orphaned and is rejected by the quality bar (Section 3).
- `search-index.json` is regenerated on every batch so new content is findable.
- `kpi.json` is the repo-local metrics file — Section 6 metrics write here.
- No mass auto-generation of resource files. The corpus is large enough; the
  job is *connecting* it to clusters, not inflating the count.

### 2.4 Glossary and FAQ growth

- **Glossary:** grows with every branded term a cluster introduces (STARCP
  흐름, IDEN 좌표, 5S 사이클, 린 캔버스 M7, WFO, 인생 10장면). One term, one
  definition traced to the SSoT. Target: every proper noun in `voice_rules`
  `required` list has a glossary entry.
- **FAQ:** grows with every *real objection* surfaced by a cluster. Source
  objections from the program landing pages' §10 FAQ sections and from the
  `target_pain` fields. Each FAQ entry maps to one program.

### 2.5 What "data quality" means here

A data artifact is high-quality when it satisfies all four:

1. **Accuracy** — every factual claim traces to `site-strategy.yaml`
   (`authority_assets`, `revenue_lineup`) or `knowledge-graph.jsonld`. No
   invented credentials, dates, or numbers.
2. **Schema conformance** — JSON-LD validates as parseable JSON (enforced by
   `funnel-qa.yml` S1) and uses correct schema.org types.
3. **AI-crawler readability** — the page is reachable from `sitemap.xml`,
   described in `llms.txt`/`llms-full.txt`, not blocked by `robots.txt`, and
   has a single semantic `<main>` and `<header>` (enforced by `funnel-qa.yml`).
4. **Graph connectivity** — the artifact is linked into the knowledge graph or
   the cluster link structure; nothing is an orphan node.

---

## 3. Quality Bar — Anti-Slop Gate

Quantity without this bar is **rejected**. Every accumulated piece — pillar,
supporting article, glossary term, FAQ entry, resource item — must pass **all
seven** criteria. This is a checklist, not a guideline; a batch reviewer marks
each item pass/fail against it.

| # | Criterion | Checkable condition |
|---|-----------|---------------------|
| Q1 | **Brand-voice compliance** | Tone matches `voice_rules` (차분하고 단단한 산문, WFO 톤). None of the `forbidden` terms present (여러분, 다음과 같이, 물론입니다, 글머리표 남발, 강압 어조, 막연한 미사여구). At least one `required` element present (구체 숫자, 고유명사, 단수 호칭). |
| Q2 | **Authority traced to SSoT** | Every factual/credential claim maps to an `authority_assets` id or `revenue_lineup` field in `site-strategy.yaml`. Unsourced claims are deleted, not softened. |
| Q3 | **Real reader takeaway** | The piece answers one concrete question or gives one usable procedure. A reader of the target persona leaves with something they did not have. "Generic encouragement" fails. |
| Q4 | **Minimum substance** | Supporting article: substantive long-form, no thin stub pages. Pillar: comprehensive hub covering the cluster's scope. Glossary term: a real definition, not a one-line gloss. Below-threshold pages are rejected, not padded. |
| Q5 | **No duplicate / thin content** | The topic is not already covered by another cluster page or perspective note. If overlap exists, the pieces are *consolidated* (Section 1 lists 18 such consolidations) — never published twice. |
| Q6 | **Full discoverability metadata** | Title, meta description, canonical, OG tags, valid JSON-LD, semantic `<main>`/`<header>`, manifest link, sitemap entry. This is exactly what `funnel-qa.yml` S1/S4 verifies. |
| Q7 | **Exactly one funnel CTA** | One CTA, placed per `cta_pattern` (본문 끝 자연스러운 1줄 + 푸터 1개; no mid-body repetition). The CTA points to the cluster's assigned program (`p/{slug}.html`) or 무료 30분 상담. `funnel-qa.yml` S2 fails any free-content page with no CTA. |

**Rejection rule:** a piece failing any one of Q1–Q7 does not ship. It is
either fixed or dropped from the batch. A batch is never merged with known
failures "to be fixed later" — that is how slop accumulates.

**Why this bar exists:** the funnel-100 master plan (Risk 7) names voice/brand
drift as a real risk of high content throughput. The bar is the mechanism that
makes throughput safe. The site's goal is *effective* accumulation — a smaller
set of pages that each rank and convert beats a large set of thin pages that
dilute topical authority and waste crawl budget.

---

## 4. Production Cadence & Phasing

Accumulation runs in **batches**, each batch sized for one review pass, each
gated by `funnel-qa.yml` plus the Section 3 quality bar. Clusters are sequenced
by funnel leverage, not by convenience.

### 4.1 Sequencing rationale

Priority follows two signals: (a) which program is rank-1 in the revenue
lineup, and (b) which cluster has the most existing perspective notes to
consolidate (lower marginal cost, faster authority build).

### 4.2 Phases

**Phase A — Cluster spine (priority: Critical, first)**
- Build the 5 pillar pages only. Wire each pillar to its `p/` landing page and
  into the knowledge graph as a `CollectionPage` entity.
- Add the 5 `Course` entities to `knowledge-graph.jsonld`.
- Gate: all 5 pillars pass the quality bar and `funnel-qa.yml`; knowledge graph
  validates; sitemap updated.
- Rationale: the spine must exist before spokes have anything to link up to.

**Phase B — Cluster 3 (IDEN 진로 재설계) supporting articles (priority: Critical)**
- 9 supporting articles. Highest consolidation yield — multiple existing
  perspective notes map directly. Mid-price program, broadest audience.
- Batch into 2 review passes (5 + 4 articles).

**Phase C — Cluster 5 (5S 리더십) supporting articles (priority: High)**
- 8 supporting articles, several consolidations available. Highest-price
  program (6,000,000원) — strong revenue leverage per converted lead.

**Phase D — Cluster 1 (STARCP) supporting articles (priority: High)**
- 8 supporting articles. Rank-1 program; tied to the 2026 book launch
  (`book_launch` in site-strategy.yaml) — STARCP cluster maturity should
  precede the book's D-30 marketing window.

**Phase E — Cluster 2 (IDEN 진로교사) supporting articles (priority: Medium)**
- 8 supporting articles. B2B-flavored (school budget) — longer sales cycle, so
  later, but several consolidations available.

**Phase F — Cluster 4 (창직) supporting articles (priority: Medium)**
- 8 supporting articles. Highest-touch program; smaller addressable audience.

**Phase G — Data layer consolidation (priority: Ongoing, parallel from Phase B)**
- Glossary → `DefinedTermSet` migration; FAQ growth; resources/ tagging;
  `search-index.json` regeneration. Runs as a continuous side-stream, one
  data-tagging batch per content batch.

### 4.3 Batch rules

- A batch is **1 pillar** or **3–5 supporting articles** or **one data-layer
  unit** — small enough for one human/agent review pass.
- Every batch is a single PR. `funnel-qa.yml` runs on the PR (it already
  triggers on `pull_request` to main). The PR does not merge until the gate is
  green AND a reviewer has checked every item against the Section 3 bar.
- No phase starts before the previous phase's gate passes — same discipline as
  the funnel-100 master plan's S1→S6 ordering.

---

## 5. Continuous-Accumulation Machinery

The goal is **sustained** accumulation without unattended AI mass-generation.
The machinery is human/agent-in-the-loop batches, gated by CI.

### 5.1 What already enforces non-regression

`funnel-qa.yml` runs on every push, every PR to main, and weekly (`cron: '0 0 *
* 1'`). It already verifies sitemap coverage, JSON-LD validity, free-content
CTA presence (S2 orphan check), feed validity, PWA wiring, and HTML lint. **Any
new cluster page automatically falls under this gate** — adding a page that
breaks discoverability fails the build. No new enforcement is needed for
non-regression; the existing gate covers it. New cluster pages should be added
to `SPEC-FREEVALUE-001/free-content-corpus.txt` so the S2 CTA check covers them.

### 5.2 Recommended new workflow — scheduled content-health audit

Add **one** new scheduled GitHub Actions workflow (proposal:
`.github/workflows/content-health.yml`). It does **not generate content** — it
*audits* the accumulated corpus on a cadence and flags problems for a human.

Proposed checks (all repo-local, no paid services, no secrets):

1. **Coverage report** — count cluster pillars and supporting articles present
   vs the 5 + 41 target in Section 1; emit the percentage.
2. **Structured-data coverage** — percentage of cluster pages carrying a valid
   JSON-LD `Article`/`CollectionPage` block.
3. **Internal-link depth** — for each supporting article, verify it links up to
   its pillar and out to its program CTA; flag orphans.
4. **Stale-content flag** — flag cluster pages not modified within a long
   window (file `mtime` / git history) for human review — not auto-edit.
5. **Thin-content flag** — flag any cluster page below the Q4 substance
   threshold for human review.
6. **Knowledge-graph drift** — verify every program has a `Course` entity and
   every pillar a `CollectionPage` entity; flag missing entities.

Cadence: weekly `schedule` + `workflow_dispatch`. Output: a job summary the
operator reads. The workflow **flags**; it never commits. This keeps a single
operator informed without requiring constant attention.

### 5.3 The human/agent-in-the-loop loop

```
manager-spec writes a cluster/batch SPEC
   -> web-content-writer / web-magazine-editor drafts the batch
   -> web-copy-proofreader + style-guide-enforcer check against voice_rules
   -> reviewer checks every item against the Section 3 quality bar (Q1-Q7)
   -> PR opened -> funnel-qa.yml gate runs
   -> green + reviewer-approved -> merge
   -> content-health.yml (next scheduled run) confirms coverage rose, nothing regressed
```

This is deliberately **not** unattended. AI/agents draft; CI checks the
mechanical conditions; a human owns the Q1–Q7 judgment calls (voice, takeaway,
substance) that CI cannot make. Realistic for a one-person business: the
operator reviews one small batch at a time, on their own cadence, and the CI
gate guarantees nothing broken ships in between.

---

## 6. Effectiveness Metrics

All metrics are measurable **from the repository**, with no paid tools and no
invented numbers. They are tracked in `resources/_data/kpi.json` (which already
exists) and reported by the `content-health.yml` workflow.

| Metric | Definition | Source | Healthy direction |
|--------|-----------|--------|-------------------|
| **Indexable-page growth** | Count of `<loc>` entries in `sitemap.xml` over time; cluster-page subset tracked separately | `sitemap.xml` | Rising, in step with batches; never falling |
| **Cluster completion %** | Cluster pages present / 46 target (5 pillars + 41 articles) | repo file count vs Section 1 | Rising toward 100% |
| **Structured-data coverage %** | Cluster pages with a valid JSON-LD block / all cluster pages | `funnel-qa.yml` S1 logic, extended | 100% (gate-enforced) |
| **Internal-link depth** | Share of supporting articles correctly linking up to pillar AND out to program CTA | `content-health.yml` check 3 | 100%; orphans = 0 |
| **Funnel-CTA coverage** | Share of free-content pages with exactly one valid CTA | `funnel-qa.yml` S2 orphan check | 100% (gate-enforced) |
| **Knowledge-graph completeness** | Entities present / expected (5 Course + 5 CollectionPage + base 7) | `content-health.yml` check 6 | 100% |
| **Consolidation ratio** | Existing perspective notes folded into cluster articles / 18 planned consolidations | git history / SPEC tracking | Rising toward 18 — confirms reuse over duplication |
| **Stale-page count** | Cluster pages flagged by `content-health.yml` check 4 | `content-health.yml` check 4 | Low and addressed, not ignored |

**What "it is working" looks like:** cluster completion % and indexable-page
count rise batch over batch; structured-data coverage, internal-link depth, and
funnel-CTA coverage hold at 100% (the CI gate guarantees this); stale and thin
flags stay near zero. Crucially — *page count rising while the gate stays
green* is the signal that accumulation is happening **effectively**, not just
quantitatively. If page count rises but flags also rise, the strategy is
failing its own anti-slop bar.

What this strategy deliberately **cannot** measure with repo-only tooling:
actual search rankings, organic traffic, and conversion rates. Those need
external tools (Search Console, analytics). They are out of scope here — but
the repo-local metrics above are leading indicators: a well-structured,
fully-linked, schema-valid cluster is the *precondition* for ranking, and that
precondition is fully measurable from the repo.

---

## 7. Honest Caveats

| # | Caveat |
|---|--------|
| 1 | **One-operator capacity.** 46 cluster pages plus a data layer is a large body of work for a single person. The phasing in Section 4 is built so any partial completion (e.g. Phase A + B) already produces a working, gated cluster — the strategy degrades gracefully. |
| 2 | **The quality bar costs throughput.** Q1–Q7 will slow batch velocity. This is intended. The funnel-100 plan's own thesis is genuine contribution over volume; a slower stream of pages that each clear the bar beats a fast stream that does not. |
| 3 | **Consolidation is real work.** The 18 planned consolidations of existing perspective notes are not free — each is a rewrite/merge job. They are cheaper than net-new writes, not zero-cost. |
| 4 | **Repo metrics are leading, not lagging.** Section 6 metrics prove the site is *structurally* ready to rank. They do not prove it *is* ranking. Treat them as necessary, not sufficient — and revisit if external analytics later contradict them. |
| 5 | **No unattended generation.** This strategy explicitly rejects scheduled AI mass-generation of content. The only scheduled automation is the read-only `content-health.yml` audit. If a future operator wants generation automation, that is a separate decision requiring its own quality-bar enforcement. |

---

## Appendix — Source References

- Strategy SSoT: `.moai/strategy/site-strategy.yaml`
- Funnel master plan: `.moai/plans/funnel-100-master-plan.md`
- CI gate: `.github/workflows/funnel-qa.yml`
- Knowledge graph: `knowledge-graph.jsonld`
- Existing content: `blog/perspective/` (100+ notes), `topics/`, `magazine/`,
  `resources/`, `glossary.html`, `faq.html`
- Landing pages (funnel targets): `p/` (5 program pages)
- Repo metrics file: `resources/_data/kpi.json`
