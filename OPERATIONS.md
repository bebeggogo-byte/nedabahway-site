# OPERATIONS — 운영 기준서

이 문서는 nedabahway-site의 **자동 루틴(일일/주간/월간)과 콘텐츠 업로드 구조**를
한눈에 관리하기 위한 기준서입니다. "앞으로 기능을 계속 발전시키고 콘텐츠를
지속적으로 올리는 구조"의 단일 출처(single source of truth) 역할을 합니다.

> 갱신 규칙: 워크플로(`.github/workflows/`)나 데이터 스키마(`quant/data/*.json`)를
> 바꾸면 이 문서의 해당 표도 같은 PR에서 함께 갱신합니다.

---

## 1. "일일 포함 루틴 실행 횟수"란

퀀트 자동매매 랩의 **일일 사이클 누적 실행 횟수**입니다.

| 항목 | 단일 출처 | 화면 표시 |
|---|---|---|
| 실행 횟수 (cycles) | `quant/data/heartbeat.json` → `n_cycles_total` | 대시보드 상단 KPI "Cycles" + 하단 heartbeat |
| 가동 시작 | `heartbeat.json` → `inception` | 하단 heartbeat "Nd · N cycles" |
| 가동 일수 | `heartbeat.json` → `uptime_days` | 동일 |
| 마지막 사이클 시각/ID | `last_cycle_at` / `last_cycle_id` | "last" 표시 |
| 마지막 사이클 오류 | `last_cycle_errors` (에이전트명 배열) | 의사결정 테이블 "N err" 뱃지 |

렌더링 코드: `quant/app.js`의 `renderKpis()` / `renderHeartbeat()`.

> 주의: "Cycles" KPI의 단일 출처는 `n_cycles_total`입니다. (과거에는 equity
> 포인트 수를 표시해 값이 어긋날 수 있었음 — 2026-06 수정.)

---

## 2. 자동 루틴 맵 (GitHub Actions)

모든 시각은 cron(UTC) 기준이며 KST 환산을 병기합니다.

| 워크플로 | 주기 | KST | 하는 일 | 산출물 / 커밋 |
|---|---|---|---|---|
| `quant-lab-daily.yml` | 평일 06:30 UTC | 15:30 (장 마감 후) | **일일 사이클 실행** → `n_cycles_total` 증가 | `chore(quant): daily snapshot` |
| `quant-lab-daily-brief.yml` | 일~목 23:00 UTC | 익일 08:00 | 일일 브리핑 + 대시보드 스냅샷 | `chore(brief): daily` |
| `quant-lab-watchdog.yml` | 4시간마다 | — | heartbeat 점검, 이상 시 이슈 자동 생성 | (이슈) |
| `quant-lab-report-weekly.yml` | 일 10:30 UTC | 19:30 | 주간 리포트 | `quant/reports/weekly-*.md` |
| `quant-lab-gate-weekly.yml` | 토 13:00 UTC | 22:00 | 주간 페이즈 게이트 평가 | `phase-gate.json` |
| `quant-lab-council-weekly.yml` | 일 09:00 UTC | 18:00 | LLM 카운슬 심의 | `council-latest.json` |
| `quant-lab-health-monthly.yml` | 매월 1일 14:00 UTC | 23:00 | 월간 헬스체크 | — |
| `funnel-qa.yml` | 월 00:00 UTC | 09:00 | 퍼널 QA | — |

품질/배포 워크플로(`quality-check`, `lighthouse`, `pages-deploy`, `app-ci`,
`swarm-validate`, `agent-quality`)는 push/PR 트리거이며 일일 루틴과 별개입니다.

---

## 3. 데이터 흐름 (퀀트 일일 사이클)

```
quant-lab-daily.yml (평일 15:30 KST)
  └─ python -m lab.cli daily --no-broker      # trading/ 에서 실행
       └─ 오케스트레이터가 15개 에이전트 순차 실행
            1) universe_curator  → 거래 후보 종목 선정 (pykrx → KRX 데이터)
            2) data_engineer     → OHLCV 적재
            ... (regime/portfolio/risk/execution/performance ...)
  └─ python -m lab.cli snapshot --output ../quant/data
       └─ quant/data/*.json 갱신 (heartbeat, equity, decisions, ...)
  └─ git commit "chore(quant): daily snapshot"
       └─ GitHub Pages 배포로 대시보드 반영
```

핵심: **1번 `universe_curator`가 실패하면 거래 후보가 비어 이후 단계가 모두
no-op이 됩니다** (`intents_count: 0`, `executions_count: 0`).

---

## 4. 헬스 모니터링 기준

| 신호 | 출처 | 정상 기준 |
|---|---|---|
| staleness | `heartbeat.stale_hours_since_last_cycle` | < 30h (watchdog 임계값) |
| 사이클 오류 | `heartbeat.last_cycle_errors` | 빈 배열 `[]` |
| 헬스 플래그 | `heartbeat.is_healthy` | `true` |

> 주의(알려진 한계): `is_healthy`는 **staleness만** 본다. 매 사이클
> `universe_curator`가 실패해도 stale하지 않으면 `is_healthy=true`로 표시된다.
> 즉 "✓ healthy"가 "거래 파이프라인 정상"을 보장하지 않는다. 실제 정상 여부는
> `last_cycle_errors`와 `decisions.json`의 `executions_count`로 확인할 것.

watchdog는 `last_cycle_errors`가 있으면 `last-cycle-errors` 상태로 자동 이슈를
연다(`quant-lab-watchdog.yml`). 따라서 미해결 자동 이슈가 있으면 먼저 확인.

---

## 5. 알려진 이슈

### universe_curator 매 사이클 실패 (2026-05 이후 지속)

- 증상: `last_cycle_errors: ["universe_curator"]`, 모든 사이클 `executions_count: 0`
- 예외: `KeyError: None of [Index(['종가','시가총액','거래량','거래대금'])] are in the [columns]`
- 발생 지점: `trading/src/data/market_data.py::get_market_cap_snapshot()` →
  `pykrx.stock.get_market_cap_by_ticker()`가 **빈 DataFrame**을 반환할 때
- 추정 원인: GitHub Actions 러너(비-국내 데이터센터 IP)에서 KRX
  (`data.krx.co.kr`) 접근이 차단/제한됨. watchdog 안내문에도
  "If pykrx data issue, check KRX accessibility" 명시.
- 영향: 일일 루틴이 29회 "실행"됐지만 실거래 신호는 0건. 대시보드 수치는
  시드/빈 상태.

대응 방향은 [ROADMAP](#6-개선-로드맵) 참고.

---

## 6. 개선 로드맵

1. **데이터 소스 견고화** (최우선): `get_market_cap_snapshot`이 빈 응답일 때
   명시적 예외/폴백(캐시·대체 소스)을 두어 opaque KeyError 제거. KRX 접근 가능한
   self-hosted 러너 또는 데이터 캐시 커밋 전략 검토.
2. **헬스 정의 보강**: `is_healthy`에 `last_cycle_errors` 비어있음 조건 추가해
   "healthy"가 실제 파이프라인 상태를 반영하도록.
3. **콘텐츠 파이프라인 확장**: magazine/blog/resources 등 비-퀀트 콘텐츠의
   업로드 루틴도 본 문서 2장 표에 편입해 단일 관리.
4. **관측성**: 사이클 성공/실패 추세를 대시보드에 시계열로 노출.

---

최종 갱신: 2026-06-05
