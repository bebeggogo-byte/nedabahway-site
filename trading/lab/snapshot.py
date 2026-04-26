"""Snapshot exporter — reads SQLite (events + circuit) and writes JSON for the dashboard.

Output: /quant/data/*.json (committed by daily GitHub Action so GitHub Pages auto-deploys).

Files produced:
- meta.json        system status, last update, current phase, version
- latest.json      most recent cycle summary
- equity.json      equity curve time series
- decisions.json   recent N cycles' summaries (orders, signals)
- critiques.json   recent critique reports (worst-verdict surfaced)
"""

from __future__ import annotations

import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

SCHEMA_VERSION = "0.1.0"


@contextmanager
def _ro_conn(db_path: Path):
    if not db_path.exists():
        yield None
        return
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _system_status(circuit_db: Path) -> dict[str, Any]:
    with _ro_conn(circuit_db) as c:
        if c is None:
            return {"trading_allowed": True, "blocked_reason": None, "blocked_until": None}
        row = c.execute("SELECT * FROM circuit_state WHERE id=1").fetchone()
        if not row or not row["blocked_until"]:
            return {"trading_allowed": True, "blocked_reason": None, "blocked_until": None}
        from datetime import date
        blocked_until = row["blocked_until"]
        try:
            allowed = date.fromisoformat(blocked_until) < date.today()
        except ValueError:
            allowed = True
        return {
            "trading_allowed": allowed,
            "blocked_reason": row["reason"],
            "blocked_until": blocked_until,
        }


def export_meta(out_dir: Path, circuit_db: Path, phase: int = 1, phase_name: str = "Infrastructure Build") -> dict:
    meta = {
        "schema_version": SCHEMA_VERSION,
        "last_updated": _utcnow_iso(),
        "phase": phase,
        "phase_name": phase_name,
        "phases_total": 4,
        "system": _system_status(circuit_db),
        "agents": {
            "deterministic_backbone": 7,
            "deterministic_critics": 4,
            "llm_council": 0,
            "total": 11,
            "target": 16,
        },
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))
    return meta


def export_latest_cycle(out_dir: Path, events_db: Path) -> dict:
    with _ro_conn(events_db) as c:
        if c is None:
            data = {"cycle_id": None, "events": [], "started_at": None, "ended_at": None}
            (out_dir / "latest.json").write_text(json.dumps(data, indent=2, ensure_ascii=False))
            return data
        row = c.execute("SELECT * FROM cycles ORDER BY started_at DESC LIMIT 1").fetchone()
        if not row:
            data = {"cycle_id": None, "events": []}
            (out_dir / "latest.json").write_text(json.dumps(data, indent=2, ensure_ascii=False))
            return data
        cycle_id = row["cycle_id"]
        events = c.execute(
            "SELECT ts, agent, payload_type, severity, payload_json FROM events WHERE cycle_id=? ORDER BY id ASC",
            (cycle_id,),
        ).fetchall()
        events_out = []
        for e in events:
            events_out.append({
                "ts": e["ts"], "agent": e["agent"],
                "type": e["payload_type"], "severity": e["severity"],
                "payload": json.loads(e["payload_json"]),
            })
        summary = json.loads(row["summary_json"]) if row["summary_json"] else {}
        data = {
            "cycle_id": cycle_id,
            "started_at": row["started_at"],
            "ended_at": row["ended_at"],
            "summary": summary,
            "events": events_out,
        }
    (out_dir / "latest.json").write_text(json.dumps(data, indent=2, ensure_ascii=False, default=str))
    return data


def export_equity(out_dir: Path, events_db: Path) -> dict:
    """Equity time series from daily_pnl events."""
    points: list[dict] = []
    with _ro_conn(events_db) as c:
        if c is not None:
            rows = c.execute(
                "SELECT ts, payload_json FROM events WHERE payload_type='daily_pnl' ORDER BY ts ASC"
            ).fetchall()
            for r in rows:
                p = json.loads(r["payload_json"])
                points.append({
                    "date": p.get("date"),
                    "equity": p.get("ending_equity"),
                    "pnl": p.get("pnl"),
                    "pnl_pct": p.get("pnl_pct"),
                })
    data = {"updated_at": _utcnow_iso(), "points": points}
    (out_dir / "equity.json").write_text(json.dumps(data, indent=2, ensure_ascii=False, default=str))
    return data


def export_decisions(out_dir: Path, events_db: Path, n: int = 30) -> dict:
    rows_out: list[dict] = []
    with _ro_conn(events_db) as c:
        if c is not None:
            rows = c.execute(
                "SELECT cycle_id, started_at, ended_at, summary_json FROM cycles ORDER BY started_at DESC LIMIT ?",
                (n,),
            ).fetchall()
            for r in rows:
                summary = json.loads(r["summary_json"]) if r["summary_json"] else {}
                rows_out.append({
                    "cycle_id": r["cycle_id"],
                    "started_at": r["started_at"],
                    "ended_at": r["ended_at"],
                    "phases_run": summary.get("phases_run", []),
                    "errors": summary.get("errors", []),
                    "intents_count": summary.get("intents_count", 0),
                    "executions_count": summary.get("executions_count", 0),
                    "success_count": summary.get("success_count", 0),
                })
    data = {"updated_at": _utcnow_iso(), "decisions": rows_out}
    (out_dir / "decisions.json").write_text(json.dumps(data, indent=2, ensure_ascii=False, default=str))
    return data


def export_critiques(out_dir: Path, events_db: Path, n: int = 50) -> dict:
    rows_out: list[dict] = []
    with _ro_conn(events_db) as c:
        if c is not None:
            rows = c.execute(
                """SELECT ts, agent, payload_json FROM events
                   WHERE payload_type='critique_report'
                   ORDER BY id DESC LIMIT ?""",
                (n,),
            ).fetchall()
            for r in rows:
                p = json.loads(r["payload_json"])
                worst = "pass"
                for f in p.get("findings", []):
                    if f.get("verdict") == "fail":
                        worst = "fail"
                        break
                    if f.get("verdict") == "warn":
                        worst = "warn"
                rows_out.append({
                    "ts": r["ts"],
                    "critic": r["agent"],
                    "target": p.get("target"),
                    "worst_verdict": worst,
                    "n_findings": len(p.get("findings", [])),
                    "findings": p.get("findings", []),
                })
    data = {"updated_at": _utcnow_iso(), "critiques": rows_out}
    (out_dir / "critiques.json").write_text(json.dumps(data, indent=2, ensure_ascii=False, default=str))
    return data


def export_today_plan(out_dir: Path, events_db: Path) -> dict:
    """The latest active strategy signal — what the system *intends* to hold."""
    plan: dict = {"updated_at": _utcnow_iso(), "active": None, "sub_strategies": []}
    with _ro_conn(events_db) as c:
        if c is None:
            (out_dir / "today_plan.json").write_text(json.dumps(plan, indent=2, ensure_ascii=False))
            return plan
        rows = c.execute(
            """SELECT ts, agent, payload_json FROM events
               WHERE payload_type='strategy_signal'
               ORDER BY id DESC LIMIT 50"""
        ).fetchall()
        for r in rows:
            p = json.loads(r["payload_json"])
            role = (p.get("metadata") or {}).get("role")
            entry = {
                "ts": r["ts"],
                "strategy": p.get("strategy"),
                "n_picks": len(p.get("target_weights", {})),
                "target_weights": p.get("target_weights", {}),
            }
            if role == "active" and plan["active"] is None:
                plan["active"] = entry
            elif role == "sub_strategy":
                if not any(s["strategy"] == entry["strategy"] for s in plan["sub_strategies"]):
                    plan["sub_strategies"].append(entry)
    (out_dir / "today_plan.json").write_text(json.dumps(plan, indent=2, ensure_ascii=False))
    return plan


def export_recent_trades(out_dir: Path, events_db: Path, sim_state_db: Path | None = None, n: int = 30) -> dict:
    """Recent execution reports + sim trades, unified."""
    trades: list[dict] = []
    with _ro_conn(events_db) as c:
        if c is not None:
            for r in c.execute(
                """SELECT ts, payload_json FROM events
                   WHERE payload_type='execution_report' ORDER BY id DESC LIMIT ?""",
                (n,),
            ).fetchall():
                p = json.loads(r["payload_json"])
                intent = p.get("intent", {})
                trades.append({
                    "ts": r["ts"],
                    "ticker": intent.get("ticker"),
                    "side": intent.get("side"),
                    "qty": intent.get("qty"),
                    "fill_price": p.get("fill_price"),
                    "success": p.get("success"),
                    "broker_order_id": p.get("broker_order_id"),
                    "rationale": intent.get("rationale", ""),
                    "source": "kis_or_dryrun",
                })
    if sim_state_db and sim_state_db.exists():
        with _ro_conn(sim_state_db) as c:
            if c is not None:
                try:
                    for r in c.execute(
                        """SELECT submitted_at as ts, ticker, side, qty, fill_price, fee, notional
                           FROM sim_orders ORDER BY id DESC LIMIT ?""",
                        (n,),
                    ).fetchall():
                        trades.append({
                            "ts": r["ts"],
                            "ticker": r["ticker"],
                            "side": r["side"],
                            "qty": r["qty"],
                            "fill_price": r["fill_price"],
                            "fee": r["fee"],
                            "notional": r["notional"],
                            "success": True,
                            "source": "simulated",
                        })
                except sqlite3.OperationalError:
                    pass
    trades.sort(key=lambda t: t.get("ts") or "", reverse=True)
    trades = trades[:n]
    data = {"updated_at": _utcnow_iso(), "trades": trades}
    (out_dir / "recent_trades.json").write_text(json.dumps(data, indent=2, ensure_ascii=False, default=str))
    return data


def export_strategy_attribution(out_dir: Path, events_db: Path) -> dict:
    """Per-sub-strategy pick frequency + tickers (basic attribution).

    Real per-strategy P&L attribution requires order tagging by source
    strategy (not currently emitted). This file approximates by counting
    how often each sub-strategy proposed a given ticker over the last 30 days.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    by_strategy: dict[str, dict] = {}
    with _ro_conn(events_db) as c:
        if c is not None:
            for r in c.execute(
                """SELECT ts, payload_json FROM events
                   WHERE payload_type='strategy_signal' AND ts >= ?
                   ORDER BY ts ASC""",
                (cutoff,),
            ).fetchall():
                p = json.loads(r["payload_json"])
                role = (p.get("metadata") or {}).get("role")
                if role == "active":
                    continue
                strat = p.get("strategy")
                if not strat:
                    continue
                rec = by_strategy.setdefault(
                    strat, {"strategy": strat, "n_signals": 0, "ticker_counts": {}, "last_picks": []}
                )
                rec["n_signals"] += 1
                for ticker in p.get("target_weights", {}).keys():
                    rec["ticker_counts"][ticker] = rec["ticker_counts"].get(ticker, 0) + 1
                rec["last_picks"] = list(p.get("target_weights", {}).keys())
    rows = sorted(by_strategy.values(), key=lambda x: -x["n_signals"])
    for r in rows:
        r["top_tickers"] = sorted(r["ticker_counts"].items(), key=lambda x: -x[1])[:5]
        del r["ticker_counts"]
    data = {"updated_at": _utcnow_iso(), "by_strategy": rows}
    (out_dir / "attribution.json").write_text(json.dumps(data, indent=2, ensure_ascii=False, default=str))
    return data


def export_heartbeat(out_dir: Path, events_db: Path) -> dict:
    """Heartbeat: timestamps for last successful cycle / snapshot / etc.

    Watchdog reads this to detect staleness; dashboard surfaces it.
    """
    last_cycle_at: str | None = None
    last_cycle_id: str | None = None
    last_cycle_errors: list[str] = []
    n_cycles_total = 0
    inception: str | None = None
    with _ro_conn(events_db) as c:
        if c is not None:
            n_cycles_total = c.execute("SELECT COUNT(*) FROM cycles").fetchone()[0]
            row = c.execute(
                "SELECT cycle_id, ended_at, started_at, summary_json FROM cycles ORDER BY started_at DESC LIMIT 1"
            ).fetchone()
            if row:
                last_cycle_at = row["ended_at"] or row["started_at"]
                last_cycle_id = row["cycle_id"]
                if row["summary_json"]:
                    last_cycle_errors = json.loads(row["summary_json"]).get("errors", [])
            inc = c.execute("SELECT MIN(started_at) FROM cycles").fetchone()
            if inc and inc[0]:
                inception = inc[0]

    now = datetime.now(timezone.utc)
    stale_hours = None
    if last_cycle_at:
        try:
            t = datetime.fromisoformat(last_cycle_at.replace("Z", "+00:00"))
            if t.tzinfo is None:
                t = t.replace(tzinfo=timezone.utc)
            stale_hours = round((now - t).total_seconds() / 3600.0, 2)
        except Exception:
            pass

    uptime_days = None
    if inception:
        try:
            t0 = datetime.fromisoformat(inception.replace("Z", "+00:00"))
            if t0.tzinfo is None:
                t0 = t0.replace(tzinfo=timezone.utc)
            uptime_days = round((now - t0).total_seconds() / 86400.0, 1)
        except Exception:
            pass

    data = {
        "now": _utcnow_iso(),
        "last_cycle_at": last_cycle_at,
        "last_cycle_id": last_cycle_id,
        "last_cycle_errors": last_cycle_errors,
        "stale_hours_since_last_cycle": stale_hours,
        "n_cycles_total": n_cycles_total,
        "inception": inception,
        "uptime_days": uptime_days,
        "is_healthy": (stale_hours is None or stale_hours < 30),  # 30h = ~1 cron + buffer
    }
    (out_dir / "heartbeat.json").write_text(json.dumps(data, indent=2, ensure_ascii=False))
    return data


def export_portfolio_weights(out_dir: Path, events_db: Path, sim_state_db: Path | None) -> dict:
    """Compute and persist current risk-parity + regime-tilted weights snapshot."""
    from src.portfolio.risk_parity import compute_risk_parity_weights
    from src.portfolio.regime_strategies import apply_regime_tilts
    from .analytics.strategy_daily_pnl import compute_daily_pnl_by_strategy

    fallback = {
        "xs_momentum": 0.30, "mean_reversion": 0.15,
        "low_volatility": 0.20, "volatility_breakout": 0.15, "quality_value": 0.20,
    }
    try:
        daily = compute_daily_pnl_by_strategy(events_db, sim_state_db, lookback_days=90)
    except Exception as e:
        log.warning("daily pnl compute failed: %s", e)
        daily = {}
    result = compute_risk_parity_weights(
        daily_pnl_by_strategy=daily,
        fallback_weights=fallback,
    )

    regime_label = None
    regime_path = out_dir / "regime_history.json"
    if regime_path.exists():
        try:
            history = json.loads(regime_path.read_text(encoding="utf-8")).get("history", [])
            if history:
                regime_label = history[-1].get("label")
        except Exception:
            pass
    tilt = apply_regime_tilts(result.weights, regime_label)

    data = {
        "updated_at": _utcnow_iso(),
        "method": result.method,
        "n_eligible": result.n_eligible,
        "risk_parity_weights": result.weights,
        "regime": tilt.regime,
        "regime_multipliers": tilt.multipliers,
        "weights": tilt.weights_after,
        "static_fallback": fallback,
        "realized_vols": result.realized_vols,
        "rationale": result.rationale,
        "tilt_rationale": tilt.rationale,
    }
    (out_dir / "portfolio_weights.json").write_text(json.dumps(data, indent=2, ensure_ascii=False))
    return data


def export_all(out_dir: Path, events_db: Path, circuit_db: Path, sim_state_db: Path | None = None) -> dict[str, Any]:
    from .analytics.per_strategy_pnl import write_per_strategy_pnl
    from .analytics.strategy_health import write_strategy_health
    from .analytics.tca import write_tca_snapshot

    out_dir.mkdir(parents=True, exist_ok=True)
    log.info("exporting snapshot to %s", out_dir)
    meta = export_meta(out_dir, circuit_db)
    latest = export_latest_cycle(out_dir, events_db)
    equity = export_equity(out_dir, events_db)
    decisions = export_decisions(out_dir, events_db)
    critiques = export_critiques(out_dir, events_db)
    heartbeat = export_heartbeat(out_dir, events_db)
    today_plan = export_today_plan(out_dir, events_db)
    recent_trades = export_recent_trades(out_dir, events_db, sim_state_db)
    attribution = export_strategy_attribution(out_dir, events_db)
    pnl = write_per_strategy_pnl(out_dir, events_db, sim_state_db)
    health = write_strategy_health(out_dir, events_db, sim_state_db)
    portfolio_weights = export_portfolio_weights(out_dir, events_db, sim_state_db)
    tca = write_tca_snapshot(out_dir, events_db, sim_state_db)
    log.info(
        "snapshot complete: latest=%s, equity_pts=%d, decisions=%d, critiques=%d, "
        "trades=%d, sub_strategies=%d, heartbeat=%s",
        latest.get("cycle_id"), len(equity["points"]), len(decisions["decisions"]),
        len(critiques["critiques"]), len(recent_trades["trades"]),
        len(attribution["by_strategy"]), heartbeat.get("is_healthy"),
    )
    return {
        "meta": meta, "latest": latest, "equity": equity, "decisions": decisions,
        "critiques": critiques, "heartbeat": heartbeat,
        "today_plan": today_plan, "recent_trades": recent_trades, "attribution": attribution,
        "per_strategy_pnl": pnl, "strategy_health": health,
        "portfolio_weights": portfolio_weights, "tca": tca,
    }
