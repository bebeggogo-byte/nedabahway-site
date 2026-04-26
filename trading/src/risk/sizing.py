from __future__ import annotations

from dataclasses import dataclass


# KRX 가격대별 호가 단위 (KOSPI 기준, 2023년 개정 후)
_TICK_TABLE = [
    (2_000, 1),
    (5_000, 5),
    (20_000, 10),
    (50_000, 50),
    (200_000, 100),
    (500_000, 500),
    (float("inf"), 1000),
]


def tick_size(price: float) -> int:
    for upper, tick in _TICK_TABLE:
        if price < upper:
            return tick
    return 1000


def round_to_tick(price: float, side: str = "buy") -> int:
    """호가단위에 맞춰 가격 라운딩. 매수는 내림, 매도는 올림(체결성↑)."""
    t = tick_size(price)
    if side == "buy":
        return int(price // t) * t
    return int(-(-price // t)) * t


@dataclass
class TradeIntent:
    ticker: str
    side: str
    qty: int
    target_price: int


def compute_orders(
    target_weights: dict[str, float],
    current_positions: dict[str, int],
    prices: dict[str, int],
    total_equity: float,
    max_position_pct: float = 0.15,
) -> list[TradeIntent]:
    """현재 포지션과 목표 비중의 차이를 매수/매도 주문으로 변환.

    - 정수 주식수 단위 라운딩 (한국주식은 1주 단위)
    - 종목당 max_position_pct 캡
    - 매도가 매수보다 먼저 실행되도록 정렬
    """
    intents: list[TradeIntent] = []
    target_qty: dict[str, int] = {}

    for ticker, weight in target_weights.items():
        capped = min(weight, max_position_pct)
        price = prices.get(ticker)
        if not price or price <= 0:
            continue
        target_value = total_equity * capped
        target_qty[ticker] = int(target_value // price)

    universe = set(target_qty) | set(current_positions)
    for ticker in universe:
        cur = current_positions.get(ticker, 0)
        tgt = target_qty.get(ticker, 0)
        diff = tgt - cur
        if diff == 0:
            continue
        price = prices.get(ticker)
        if not price:
            continue
        side = "buy" if diff > 0 else "sell"
        intents.append(
            TradeIntent(
                ticker=ticker,
                side=side,
                qty=abs(diff),
                target_price=round_to_tick(price, side=side),
            )
        )

    intents.sort(key=lambda i: 0 if i.side == "sell" else 1)
    return intents
