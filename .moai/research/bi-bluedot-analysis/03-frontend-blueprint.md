# 03. 프론트엔드 대시보드 청사진 (V1 즉시 빌드 가능)

> expert-frontend 에이전트 산출물 (한국어, 즉시 빌드 가능 수준). 2026년 5월 기준 최신 버전.

## 1. Framework + Tooling Stack

**선택**: Next.js 16.0 App Router + TypeScript 5.7 + Tailwind CSS 4.0 + shadcn/ui (Radix UI 1.x 기반) + TanStack Query 5.62 + Tremor 3.18 (KPI/일반 차트) + Visx 3.12 (히트맵) + AG Grid Community 33.0 (대형 테이블).

**근거 4줄**:
- LLM 백엔드(24h 캐디언스)는 정적 페이지 + 클라이언트 사이드 캐시가 적합 → App Router의 RSC + TanStack Query 하이브리드가 최적
- shadcn/ui는 소스 코드 소유 + Radix 접근성 기본 → 한국어 폰트/다크모드 커스터마이즈 자유도 최고
- Tremor는 SaaS 대시보드 전용 + Recharts 래퍼라 Recharts 직접 호출 가능 (커스텀 차트 시)
- AG Grid Community는 무료 + 대형 시테이션 테이블(수천 행) 가상 스크롤 필수

**상태 관리**: **Zustand 5.0** (글로벌 UI 상태: 사이드바, 필터, 다크모드 토글) + **TanStack Query 5.62** (서버 상태). Jotai는 atom 폭증 위험으로 미채택. Redux Toolkit은 오버킬.

**폼**: react-hook-form 7.54 + zod 3.24 + @hookform/resolvers 3.10.

```ts
// lib/query-client.ts — 24h 스냅샷 캐싱 패턴
import { QueryClient } from "@tanstack/react-query";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60 * 6,   // 6h — 일일 스냅샷의 1/4 주기
      gcTime: 1000 * 60 * 60 * 24,     // 24h
      refetchOnWindowFocus: false,     // 데이터는 일 단위, 포커스 리프레시 불필요
      retry: 2,
    },
  },
});
```

## 2. Information Architecture

**Route Map** (Next.js App Router):

```
app/
  (auth)/login, signup, onboarding
  (dashboard)/
    layout.tsx                  ← Sidebar + TopBar + FilterBar
    dashboard/page.tsx          ← Overview (3 KPI + BII + 엔진 요약)
    dashboard/visibility/page.tsx     ← 가시성 심층 (heatmap, share of voice)
    dashboard/citations/page.tsx      ← 도메인 인용률 + 랭킹 테이블
    dashboard/competitors/page.tsx    ← 경쟁사 비교
    dashboard/blindspots/page.tsx     ← 미노출 프롬프트 + 콘텐츠 기회
    dashboard/content/page.tsx        ← Top-cited 콘텐츠
    dashboard/prompts/[id]/page.tsx   ← 프롬프트 드릴다운
    dashboard/settings/page.tsx       ← 브랜드/별칭/도메인/엔진 설정
  api/                          ← Route handlers (export, webhook)
```

**Layout 구조**:
- **Left Sidebar** (240px, collapsible to 64px on `lg:hidden`): 로고 → 7개 메뉴 항목 → 사용자 프로필
- **TopBar** (64px sticky): 브레드크럼 (shadcn `Breadcrumb`) + 알림 + 다크모드 토글 + 사용자 메뉴
- **FilterBar** (sticky below TopBar, 56px): 날짜 범위 picker + 엔진 필터 (multi-select) + 카테고리 필터 + Export 버튼

**Mobile 전략** (< 768px):
- Sidebar → Drawer (`<Sheet>` from shadcn, 좌측 슬라이드)
- FilterBar → Collapsible 아코디언 + 모달 picker
- 차트 → 가로 스크롤 컨테이너 또는 단일 컬럼 스택
- 테이블 → 카드 뷰로 변환 (CSS Grid `auto-fit`)

## 3. Chart Component Inventory

| Metric | Chart | Library | 이유 |
|---|---|---|---|
| 3 Hero KPI | KPI Card + Sparkline | **Tremor `Card` + `SparkAreaChart`** | KPI + delta + mini chart 일체형 컴포넌트 내장 |
| BII 일별 추이 | Area Chart | **Recharts 2.15 `AreaChart`** | 그라데이션 + 인터랙티브 툴팁 |
| 엔진별 가시성 비교 | Grouped Bar | **Recharts `BarChart`** | 7개 엔진 카테고리 비교 표준 |
| 토픽 × 엔진 가시성 | **Heatmap** | **Visx 3.12 `@visx/heatmap`** | Recharts에 히트맵 없음, Visx가 D3 기반으로 가장 강력 |
| Mention SoV | Donut | **Recharts `PieChart` (innerRadius)** | 5개 이하 카테고리에 최적 |
| Position SoV | Stacked Horizontal Bar | **Recharts `BarChart` layout="vertical" stackId** | 순위 1~10 누적 표현 |
| Sentiment 분포 | Diverging Stacked Bar | **Recharts** (positive 양수, negative 음수 축) | 색맹 안전한 파랑/주황 사용 |
| Citation Rank Table | Sortable Table | **AG Grid Community 33.0** | 수천 도메인 + 가상 스크롤 + 정렬/필터 무료 |
| Competitor Comparison | Grouped Bar + Table | **Recharts + shadcn `Table`** | 5개 이하 경쟁사면 테이블만으로 충분 (3.6절 참조) |
| Blind Spot 프롬프트 | Virtualized List | **TanStack Virtual 3.11 + shadcn `Card`** | 수백 프롬프트 가상 스크롤 |
| Top Position Share | Gauge / Radial | **Tremor `ProgressCircle`** | 단일 % 값 표시 최적 |
| Funnel (선택) | Funnel | **Recharts `FunnelChart`** | 검색→인용→클릭 전환 |

## 4. Design Tokens

**Typography**:
```css
--font-sans: 'Pretendard Variable', Pretendard, -apple-system, 'system-ui',
             'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
--font-mono: 'JetBrains Mono', 'D2Coding', monospace;
```
Pretendard Variable은 한글 가변 폰트 + 영문 Inter 호환. `next/font/local`로 self-host (CDN 미사용, 한국 네트워크 안정성).

**Color Palette** (Tailwind 4 CSS-first config, `@theme` directive):
```css
@theme {
  --color-primary-50:  #eff6ff;
  --color-primary-500: #3b82f6;   /* 블루닷 시그니처 */
  --color-primary-600: #2563eb;
  --color-primary-900: #1e3a8a;

  --color-positive: #10b981;       /* 긍정 (CB 안전: 청록) */
  --color-negative: #f59e0b;       /* 부정 (CB 안전: 주황, 빨강 회피) */
  --color-neutral-sentiment: #94a3b8;

  --color-bg:        oklch(0.99 0 0);
  --color-bg-dark:   oklch(0.15 0.01 240);
  --color-fg:        oklch(0.20 0.01 240);
  --color-fg-dark:   oklch(0.95 0 0);
}
```

**Spacing/Radius**: Tailwind 기본 (`0.25rem` step) + `--radius-card: 0.75rem`, `--radius-pill: 9999px`.

**Motion**: `--duration-fast: 150ms`, `--duration-base: 250ms`, `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`. Framer Motion 11.15는 차트 인터랙션과 Sheet 트랜지션에만 한정 사용.

**Dark Mode**: `class` 전략 + CSS 변수. `next-themes 0.4`로 시스템 동기화. 차트 색상도 `oklch()` 기반으로 라이트/다크 자동 대비 유지.

## 5. Accessibility & Performance

**WCAG 2.1 AA**:
- 모든 색상 대비 4.5:1 이상 (sentiment 색상도 텍스트 라벨 병기, 색만으로 의미 전달 금지)
- Radix UI 기본 키보드 네비게이션 + ARIA 자동 처리
- 차트는 항상 `<table>` 대체 뷰 제공 (스크린리더용, `sr-only` 토글)
- Focus ring 가시화 (`focus-visible:ring-2 ring-primary-500`)

**Color Blindness**: Sentiment에서 빨강/초록 페어링 금지 → **파랑(긍정) / 주황(부정) / 회색(중립)** 사용. Heatmap은 viridis 또는 cividis 컬러스케일 (Visx `@visx/scale`).

**Performance Targets** (Lighthouse ≥ 80):
- LCP < 2.5s: KPI 카드는 RSC로 SSR, 차트는 `next/dynamic({ ssr: false })`
- CLS < 0.1: 모든 차트 컨테이너에 명시적 `aspect-ratio` 또는 `min-height`
- FID < 100ms: AG Grid는 워커 스레드 옵션 활성화 (`suppressRowVirtualisation: false`)

**Skeleton 전략**: shadcn `Skeleton` 컴포넌트로 KPI/차트/테이블별 placeholder. TanStack Query `placeholderData: keepPreviousData`로 필터 변경 시 깜빡임 방지.

## 6. Key Components 사양

**KPIBigCard** (`components/dashboard/kpi-big-card.tsx`):

```tsx
interface KPIBigCardProps {
  label: string;                    // "브랜드 가시성"
  value: number;                    // 47.3
  unit: "%" | "score" | "rank";
  delta: { value: number; period: "wow" | "mom" };
  sparklineData: { date: string; value: number }[];
  tooltip: string;                  // info 아이콘 호버
  loading?: boolean;
}
```
Tremor `Card` + `Metric` + `BadgeDelta` + `SparkAreaChart` 조합. Delta는 색상 + 화살표 + "% 전주 대비" 텍스트 병기 (a11y).

**EngineHeatmap** (`components/charts/engine-heatmap.tsx`):
- Visx `@visx/heatmap/HeatmapRect`
- Row: 토픽 (사용자 정의 카테고리, 5~20개)
- Column: 7개 엔진 (ChatGPT, Perplexity, Gemini, Google AIO, Claude, Grok, Copilot)
- Cell: 0~100 가시성 점수 + cividis 컬러스케일
- 셀 클릭 → `PromptDrilldownDialog` 오픈
- 호버 시 `@radix-ui/react-tooltip`로 정확한 수치 표시

**Competitor: Table vs Radar?** → **Table 채택**.
근거: (1) 경쟁사 5~10개에서 레이더는 가독성 급락, (2) 정확한 수치 비교가 SEO 매니저의 핵심 니즈, (3) 정렬/필터링은 테이블 전용 강점, (4) 보조 차트로 grouped bar는 유지. AG Grid에 sparkline 셀 렌더러 추가 → 추세까지 한 화면.

**BlindSpotPromptList** (`components/blindspots/prompt-list.tsx`):

```tsx
interface BlindSpotItem {
  promptId: string;
  promptText: string;               // "한국 클라우드 보안 솔루션 추천"
  brandMentionRate: number;         // 0.0 ~ 1.0
  opportunityScore: number;         // 0 ~ 100 (검색량 × 미노출 가중)
  topMentionedCompetitors: string[];
  engines: EngineId[];
}
```
- 카드 우측에 "콘텐츠 생성" CTA (`<Button variant="primary">`) → `/dashboard/content/new?promptId=...` 라우팅
- Opportunity score 기준 내림차순 정렬, 사용자가 컬럼 변경 가능
- TanStack Virtual로 1000+ 행 가상 스크롤

**CitationRankTable** (`components/citations/rank-table.tsx`):
- AG Grid 컬럼: 도메인 (favicon + 도메인명), 순위, 점유율 %, 추세 sparkline, 전주 대비 변화 (↑/↓ + 숫자)
- 자사 도메인은 강조 행 (`primary-50` background)
- CSV 익스포트는 AG Grid 내장 + 백엔드 PDF 익스포트 별도 라우트

**PromptDrilldownDialog** (`components/prompts/drilldown-dialog.tsx`):
- shadcn `Dialog` (모달 + ESC 키 닫기 + focus trap)
- 좌측: 전체 LLM 답변 텍스트, 브랜드 멘션을 `<mark>` 하이라이트 (자사: 파랑, 경쟁사: 주황)
- 우측: 인용 URL 리스트, 각 항목 클릭 시 새 탭
- 상단 메타: 엔진, 검색일, 프롬프트 텍스트
- 답변 내 citation 마커는 클릭 시 우측 리스트 해당 항목으로 스크롤

## 7. Onboarding Flow

**5단계 wizard** (`app/(auth)/onboarding/[step]/page.tsx`):
1. **브랜드 기본**: 회사명, 별칭 (예: "블루닷", "Bluedot", "bluedot.so"), 공식 도메인 (멀티)
2. **경쟁사 등록**: 3~10개 경쟁 브랜드 + 도메인 (자동완성 제안)
3. **토픽/카테고리**: 시드 키워드 5~20개 (예: "AI 검색 최적화", "GEO", "LLM SEO") + 언어 (ko-KR 기본, en-US 옵션)
4. **엔진 선택**: 7개 엔진 중 모니터링 대상 선택 (기본 전체)
5. **확인 + 첫 스냅샷 트리거**: "최초 분석은 24~48시간 소요됩니다" + 이메일 알림 옵션

**Empty State 전략**: 첫 스냅샷 완료 전에는 `data/demo-snapshot.json` (실제 익명화된 샘플)을 로드해 모든 차트 렌더링. 상단에 `<Alert>` "데모 데이터입니다 — 실제 분석 완료 시 자동 교체" 표시. 사용자는 0일차부터 UX 학습 가능.

## 8. Build/Deploy

**Vercel 채택**. 근거:
- Next.js 16 App Router의 PPR (Partial Prerendering) + Edge Runtime 1급 지원
- 한국 사용자 대상: ICN1 (Seoul) 리전 + Edge Network 자동 라우팅
- 무료 PR Preview로 디자인 리뷰 가속

**Edge Runtime**: `/api/export/csv`, `/api/auth/session` 같은 경량 핸들러만 Edge. LLM 백엔드 호출은 Node runtime (`export const runtime = 'nodejs'`, 큰 페이로드 + 긴 타임아웃).

**Image**: `next/image` + Vercel Image Optimization (favicon, OG, 차트 캡처). AVIF/WebP 자동 변환.

**Font Preload**: `next/font/local` + `display: 'swap'` + `preload: true` for Pretendard Variable. 첫 페인트 폰트 깜빡임 제거.

**i18n**: `next-intl 3.26`. 라우팅은 `/ko/dashboard`, `/en/dashboard` prefix. 기본 ko-KR, en-US는 export 옵션 (PDF/CSV 라벨만 영어 변환, UI 전체 번역은 V2).

## 9. MVP Cut

**V1 (즉시 출시)**:
- `/dashboard` (Overview: 3 KPI + BII trend + 엔진 요약 bar)
- `/dashboard/visibility` (Heatmap + Mention SoV)
- `/dashboard/citations` (Rank Table + 자사 vs 경쟁사 도메인 비교)
- `/dashboard/blindspots` (Prompt List + Opportunity Score)
- `/dashboard/settings` (브랜드/경쟁사/토픽 관리)
- 온보딩 wizard + 데모 데이터
- CSV Export

**V2**:
- `/dashboard/competitors` (전용 페이지 + grouped bar 추가)
- `/dashboard/content` (Top-cited 콘텐츠 + 인용 트래픽 추정)
- PDF Export (서버측 puppeteer-core)
- 영문 UI (en-US 전체 번역)
- Position SoV 스택 차트
- Sentiment 시계열 추이

**V3**:
- Funnel 분석 (검색→인용→방문 전환)
- Treemap (콘텐츠 카테고리 인용 점유)
- 실시간 알림 (점유율 급변 시 Slack/이메일)
- AI 콘텐츠 추천 (블라인드스팟 → 초안 생성)
- 멀티 브랜드 워크스페이스

**MVP에서 제외**:
- Radar chart (가독성 문제, V1 테이블로 대체)
- Funnel chart (V1 데이터 모델 미수립)
- Treemap (정보 밀도 대비 학습 비용 높음)
- 실시간 WebSocket (일 단위 스냅샷에 불필요)
- 3D 시각화 (모든 케이스에서 부적합)

---

## Recharts/Tremor KPI 카드 핵심 코드

```tsx
// components/dashboard/kpi-big-card.tsx
"use client";
import { Card, Metric, BadgeDelta, SparkAreaChart, Text } from "@tremor/react";
import { InfoIcon } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export function KPIBigCard({ label, value, unit, delta, sparklineData, tooltip }: KPIBigCardProps) {
  const deltaType = delta.value > 0 ? "moderateIncrease" : delta.value < 0 ? "moderateDecrease" : "unchanged";
  return (
    <Card className="rounded-xl border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <Text className="font-medium text-neutral-600 dark:text-neutral-400">{label}</Text>
        <Tooltip>
          <TooltipTrigger aria-label={`${label} 설명`}>
            <InfoIcon className="h-4 w-4 text-neutral-400" />
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <Metric>{value.toFixed(1)}{unit === "%" ? "%" : ""}</Metric>
        <BadgeDelta deltaType={deltaType}>
          {delta.value > 0 ? "+" : ""}{delta.value.toFixed(1)}% {delta.period === "wow" ? "전주 대비" : "전월 대비"}
        </BadgeDelta>
      </div>
      <SparkAreaChart
        data={sparklineData}
        categories={["value"]}
        index="date"
        colors={["blue"]}
        className="mt-4 h-12 w-full"
      />
    </Card>
  );
}
```

이 청사진은 V1 5페이지를 즉시 빌드 가능한 구체성으로 작성됨. 다음 단계는 `npx create-next-app@16 --typescript --tailwind --app` → `npx shadcn@latest init` → 라이브러리 설치 → `components/dashboard/kpi-big-card.tsx` 부터 시작.
