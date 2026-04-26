# trading/lab — Multi-Agent Quant Lab

> **PR #2 (현재):** 결정론적 백본만. LLM 호출 0회. Claude Code 구독 한도 영향 없음.
> **PR #3 (다음):** 5개 LLM 에이전트(Researcher/CIO/CRO/CTO/Meta-Optimizer) + Claude Code subagent 통합.

## 무엇인가?

매일 자동으로 돌아가는 한국주식 퀀트 파이프라인. 각 단계를 "에이전트"로 캡슐화하고, 메시지를 SQLite 이벤트 버스에 기록해 **모든 결정의 감사 추적**을 보장한다.

## 16-에이전트 마스터 플랜에서의 위치

| 카테고리 | 에이전트 | 상태 | 비고 |
|---|---|---|---|
| **결정론적 (LLM 무관, PR #2 ✅)** | Universe Curator | ✅ | 시총·거래대금 필터 |
| | Data Engineer | ✅ | pykrx OHLCV 캐시 |
| | Strategy Runner | ✅ | momentum (전략 1호) |
| | Balance Fetcher | ✅ | KIS 잔고/시세 |
| | Risk Manager | ✅ | 사이징 + 일일 한도 |
| | Execution Trader | ✅ | KIS 주문 |
| | Performance Analyst | ✅ | 일일 P&L 기록 |
| **결정론적 비판자 (PR #3-1 ✅)** | Statistical Skeptic | ✅ | block bootstrap, DSR, look-ahead |
| | Regime Skeptic | ✅ | rolling Sharpe, 연도별, drawdown 기간, CVaR |
| | Cost Skeptic | ✅ | turnover, cost-to-alpha, 슬리피지 stress (2x/3x) |
| | Microstructure Skeptic | ✅ | tick/유동성/가격 drift (live, **blocking**) |
| **LLM 의회 (PR #3-2)** | Strategy Researcher | ⏳ | 새 전략 가설 |
| | CIO | ⏳ | 채택/폐기 결정 |
| | CRO | ⏳ | 리스크 거부권 |
| | CTO | ⏳ | 코드 리뷰 |
| | Meta-Optimizer | ⏳ | 프롬프트 자기개선 |

## 실행

```bash
cd trading
pip install -r requirements.txt

# 브로커 없이 (데이터·신호·로그만, 키 없어도 OK)
python -m lab.cli daily --no-broker

# KIS 모의투자 키 설정 후 (.env 채워야 함)
python -m lab.cli daily --dry-run    # 의도만, 주문 안 보냄
python -m lab.cli daily               # 실제 주문 (모의계좌, microstructure gate 작동)

# 백테스트 + 결정론적 비판 (Statistical/Regime/Cost)
python -m lab.cli review --start 2020-01-01 --end 2024-12-31

# 특정 사이클 이벤트 조회
python -m lab.cli inspect daily-20260425T063000-abc123
```

## 데이터 흐름

### Daily 파이프라인 (실거래)
```
UniverseAgent           → ctx["universe"] = ["005930", ...]
DataAgent               → ctx["prices"] = DataFrame
StrategyAgent           → ctx["active_signal"] = StrategySignal(target_weights)
BalanceAgent            → ctx["balance"], ctx["prices_now"]
RiskAgent               → ctx["order_intents"]  (CircuitBreaker 체크)
MicrostructureSkeptic   → ctx["order_intents"] 필터링  (FAIL 인 intent 차단)
ExecutionAgent          → ctx["execution_reports"]
PerformanceAgent        → daily_pnl 테이블 기록
```

### Review 파이프라인 (백테스트 비판)
```
(수동) backtest result   → ctx["backtest_result"]
StatisticalSkeptic      → bootstrap CI, DSR, look-ahead 검사
RegimeSkeptic           → rolling Sharpe, 연도별, drawdown 기간
CostSkeptic             → turnover, slippage stress (2x/3x)
                       → ctx["critiques"] (CritiqueReport 리스트)
```

모든 에이전트는 `AgentContext`를 통해 상태를 주고받고, 모든 출력은 `EventBus`(SQLite)에 영구 기록.

## DB 스키마

| DB | 테이블 | 용도 |
|---|---|---|
| `lab_events.db` | `events` | 모든 에이전트 출력 이벤트 |
| | `cycles` | 사이클 시작/종료/요약 |
| `lab_circuit.db` | `daily_pnl` | 일별 P&L |
| | `circuit_state` | 거래 차단 상태 |
| `trades.db` (PR #8) | `rebalance_runs`, `orders`, `equity_snapshots` | 페이퍼 실행기 (이전 v1) |

## GitHub Actions

`.github/workflows/quant-lab-daily.yml` — 평일 KOSPI 마감 후(15:30 KST) 자동 실행. `--no-broker` 모드로 키 없이도 데이터 수집·신호 생성 가능.

수동 트리거: `gh workflow run quant-lab-daily --field dry_run=false` (실제 주문)

## 일일 위험 한도

`src/risk/limits.py::DailyRiskLimits`:
- `daily_loss_limit_pct=0.02` → 당일 -2% 시 거래 중단
- `max_consecutive_loss_days=3` → 3일 연속 손실 시 차단
- `min_equity_krw=1,000,000` → 자본 100만원 미만 시 차단
- `cooldown_days_after_block=1` → 차단 후 1일 휴지

차단 상태는 `lab_circuit.db::circuit_state` 에 영속화 — 프로세스 재시작 후에도 유지.

## 아키텍처 결정

- **결정론적이 기본**: LLM 호출은 비용·지연·환각 위험. 가능한 한 Python 함수로 처리하고 LLM은 "판단" 영역에만.
- **이벤트 소싱**: 모든 의사결정이 로그에 남아 재현 가능. 디버깅·감사·리뷰 용이.
- **플러그인 전략**: 새 전략은 `src/strategies/base.py::Strategy` 구현 후 `StrategyAgent` 생성자에 추가.
- **무료 인프라**: GitHub Actions(퍼블릭 레포 무제한) + Claude Code 구독 + KIS 무료 모의투자.

## 다음 단계 (PR #3)

1. 4 비판자 에이전트(통계/체제/비용/미시구조) — 백테스트/실집행 결과를 자동 검증
2. 5 LLM 에이전트 — Claude Code subagent로 호출, 주간 의회 사이클
3. 합의 프로토콜(CIO/CRO/CTO 3자) + Meta-Optimizer 자기개선 루프
