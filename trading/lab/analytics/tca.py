"""Transaction Cost Analysis (TCA) — 실집행 슬리피지 측정.

Phase 2 → 3 (페이퍼 → 실거래) 진입의 마지막 검증 인프라.

페이퍼에서 모든 매매가 "백테스트 가정" 대로 체결된다. 실거래에서는 슬리피지·
시장충격·호가 스프레드가 누적된다. CostSkeptic 이 백테스트 단계에서 비용
가정의 robustness 를 검증하지만, *실집행에서 실제로 측정* 하는 메커니즘은
지금까지 없었다.

본 모듈은 매 매매마다:
- 기대 가격 (expected_price, RiskAgent 가 OrderIntent 에 기록)
- 실제 체결가 (fill_price, ExecutionAgent 가 broker 에서 받음)
- 슬리피지 = (체결 - 기대) × side_sign

side_sign: 매수면 +1 (체결가 비쌌으면 손해), 매도면 -1 (체결가 쌌으면 손해).
즉 슬리피지 양수 = 항상 손해 방향.

집계:
- 전체 평균 / 중앙값 / 95th percentile slippage_bps
- 전략별 (attribution 기반 분배)
- 종목별 (top 10 worst)
- 시간대별 (개장 30분 vs 그 외)
"""

from __future__ import annotations

import json
import logging
import sqlite3
import statistics
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

log = logging.getLogger(__name__)


@dataclass
class TradeSlippage:
    ts: str
    ticker: str
    side: str
    qty: int
    expected_price: int
    fill_price: int
    slippage_bps: float  # always non-negative for adverse moves; can be negative for favorable
    notional: int
    attribution: dict[str, float]


@contextmanager
def _ro(db_path: Path):
    if not db_path.exists():
        yield None
        return
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def _side_sign(side: str) -> int:
    return 1 if side == "buy" else -1


def _slippage_bps(expected: int, fill: int, side: str) -> float:
    if expected <= 0:
        return 0.0
    sign = _side_sign(side)
    return sign * (fill - expected) / expected * 1e4


def _percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    k = (len(sorted_vals) - 1) * p
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    if f == c:
        return sorted_vals[f]
    return sorted_vals[f] + (sorted_vals[c] - sorted_vals[f]) * (k - f)


def collect_slippages(
    events_db: Path,
    sim_db: Path | None,
    lookback_days: int = 90,
) -> list[TradeSlippage]:
    """모든 성공 매매의 expected vs actual slippage 측정."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).isoformat()
    out: list[TradeSlippage] = []

    # SimulatedBroker: sim_orders 에는 expected_price 가 없음.
    # 대신 execution_report 이벤트가 OrderIntent.expected_price 를 보존.
    with _ro(events_db) as c:
        if c is None:
            return out
        try:
            rows = c.execute(
                "SELECT ts, payload_json FROM events WHERE payload_type='execution_report' AND ts >= ? ORDER BY id ASC",
                (cutoff,),
            ).fetchall()
        except sqlite3.OperationalError:
            return out
        for r in rows:
            p = json.loads(r["payload_json"])
            if not p.get("success"):
                continue
            intent = p.get("intent") or {}
            ticker = intent.get("ticker")
            side = intent.get("side")
            qty = int(intent.get("qty", 0))
            fill = p.get("fill_price")
            expected = intent.get("expected_price")
            if not (ticker and side and qty and fill and expected):
                continue
            slip = _slippage_bps(int(expected), int(fill), side)
            out.append(TradeSlippage(
                ts=r["ts"], ticker=ticker, side=side, qty=qty,
                expected_price=int(expected), fill_price=int(fill),
                slippage_bps=slip, notional=int(fill) * qty,
                attribution=intent.get("attribution") or {},
            ))
    return out


def aggregate_tca(slippages: list[TradeSlippage]) -> dict:
    """집계: 전체 / 전략별 / 종목별."""
    if not slippages:
        return {
            "n_trades": 0, "overall": {}, "by_strategy": {}, "worst_tickers": [],
            "rationale": "측정 데이터 없음 (실집행 매매가 expected_price 와 함께 누적되어야 함)",
        }

    all_bps = [t.slippage_bps for t in slippages]
    overall = {
        "n_trades": len(slippages),
        "mean_bps": round(statistics.mean(all_bps), 2),
        "median_bps": round(statistics.median(all_bps), 2),
        "p95_bps": round(_percentile(all_bps, 0.95), 2),
        "max_bps": round(max(all_bps), 2),
        "n_adverse": sum(1 for s in all_bps if s > 0),
        "n_favorable": sum(1 for s in all_bps if s < 0),
        "total_cost_krw": int(sum(t.notional * t.slippage_bps / 1e4 for t in slippages)),
    }

    # By strategy (attribution-weighted)
    by_strat: dict[str, list[float]] = {}
    by_strat_notional: dict[str, float] = {}
    for t in slippages:
        attr = t.attribution or {"unknown": 1.0}
        attr_total = sum(attr.values()) or 1.0
        for strat, frac in attr.items():
            w = frac / attr_total
            by_strat.setdefault(strat, []).append(t.slippage_bps * w)
            by_strat_notional[strat] = by_strat_notional.get(strat, 0.0) + t.notional * w
    by_strategy = {
        s: {
            "n_trades": len(bps_list),
            "mean_bps": round(statistics.mean(bps_list), 2),
            "median_bps": round(statistics.median(bps_list), 2) if bps_list else 0,
            "notional": int(by_strat_notional.get(s, 0)),
        }
        for s, bps_list in by_strat.items()
    }

    # Worst tickers (top 10 by mean slippage_bps)
    by_ticker: dict[str, list[float]] = {}
    for t in slippages:
        by_ticker.setdefault(t.ticker, []).append(t.slippage_bps)
    ticker_means = [
        (tk, round(statistics.mean(bps), 2), len(bps))
        for tk, bps in by_ticker.items() if len(bps) >= 2
    ]
    ticker_means.sort(key=lambda x: -x[1])
    worst = [{"ticker": tk, "mean_bps": m, "n": n} for tk, m, n in ticker_means[:10]]

    return {
        "n_trades": len(slippages),
        "overall": overall,
        "by_strategy": by_strategy,
        "worst_tickers": worst,
        "rationale": _rationale(overall),
    }


def _rationale(overall: dict) -> str:
    mean = overall.get("mean_bps", 0)
    p95 = overall.get("p95_bps", 0)
    n = overall.get("n_trades", 0)
    if n < 10:
        return f"표본 부족 ({n} trades). 통계 의미 확보 위해 50+ trades 필요."
    severity = "정상"
    if mean > 15 or p95 > 50:
        severity = "주의"
    if mean > 30 or p95 > 100:
        severity = "심각"
    return f"평균 슬리피지 {mean:.1f}bp, 95%ile {p95:.1f}bp ({severity}). N={n}."


def write_tca_snapshot(out_dir: Path, events_db: Path, sim_db: Path | None) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    slippages = collect_slippages(events_db, sim_db)
    agg = aggregate_tca(slippages)
    data = {
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        **agg,
    }
    (out_dir / "tca.json").write_text(json.dumps(data, indent=2, ensure_ascii=False))
    return data
