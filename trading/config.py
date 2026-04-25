from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")


@dataclass(frozen=True)
class KisConfig:
    app_key: str
    app_secret: str
    account_no: str
    base_url: str
    is_paper: bool

    @classmethod
    def from_env(cls) -> "KisConfig":
        return cls(
            app_key=os.environ["KIS_APP_KEY"],
            app_secret=os.environ["KIS_APP_SECRET"],
            account_no=os.environ["KIS_ACCOUNT_NO"],
            base_url=os.getenv("KIS_BASE_URL", "https://openapivts.koreainvestment.com:29443"),
            is_paper=os.getenv("KIS_PAPER", "true").lower() == "true",
        )


@dataclass(frozen=True)
class StrategyConfig:
    universe_size: int = 50
    lookback_months: int = 12
    skip_recent_months: int = 1
    top_n: int = 10
    rebalance_weekday: int = 0
    cash_buffer: float = 0.05
    min_market_cap_krw: float = 5e11


@dataclass(frozen=True)
class CostConfig:
    commission_rate: float = 0.00015
    tax_rate_sell: float = 0.0018
    slippage_bps: float = 5.0


LOG_DIR = ROOT / "logs"
DATA_CACHE_DIR = ROOT / "data" / "cache"
TRADE_DB_PATH = LOG_DIR / "trades.db"
