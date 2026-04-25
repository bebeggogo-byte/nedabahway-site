from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests

from config import KisConfig, ROOT

log = logging.getLogger(__name__)

TOKEN_CACHE_PATH = ROOT / "data" / "cache" / "kis_token.json"


@dataclass
class OrderResult:
    success: bool
    order_id: str | None
    raw: dict[str, Any]


class KisClient:
    """한국투자증권 KIS Open API 클라이언트 (모의투자 우선).

    실전과 모의의 차이는 base_url과 일부 tr_id 접두어(T→V, J→V)뿐이다.
    아래 헬퍼들이 is_paper에 따라 자동으로 매핑한다.
    """

    def __init__(self, cfg: KisConfig):
        self.cfg = cfg
        self._access_token: str | None = None
        self._token_expires_at: float = 0.0
        self._session = requests.Session()

    # ---------- 인증 ----------
    def _load_cached_token(self) -> None:
        if not TOKEN_CACHE_PATH.exists():
            return
        try:
            data = json.loads(TOKEN_CACHE_PATH.read_text())
            if data.get("base_url") != self.cfg.base_url:
                return
            if data["expires_at"] - 60 > time.time():
                self._access_token = data["access_token"]
                self._token_expires_at = data["expires_at"]
        except (json.JSONDecodeError, KeyError):
            return

    def _save_token_cache(self) -> None:
        TOKEN_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        TOKEN_CACHE_PATH.write_text(
            json.dumps(
                {
                    "base_url": self.cfg.base_url,
                    "access_token": self._access_token,
                    "expires_at": self._token_expires_at,
                }
            )
        )

    def _ensure_token(self) -> str:
        if self._access_token and self._token_expires_at - 60 > time.time():
            return self._access_token

        self._load_cached_token()
        if self._access_token and self._token_expires_at - 60 > time.time():
            return self._access_token

        url = f"{self.cfg.base_url}/oauth2/tokenP"
        payload = {
            "grant_type": "client_credentials",
            "appkey": self.cfg.app_key,
            "appsecret": self.cfg.app_secret,
        }
        resp = self._session.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        body = resp.json()
        self._access_token = body["access_token"]
        self._token_expires_at = time.time() + int(body.get("expires_in", 86400))
        self._save_token_cache()
        return self._access_token

    def _headers(self, tr_id: str) -> dict[str, str]:
        return {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {self._ensure_token()}",
            "appkey": self.cfg.app_key,
            "appsecret": self.cfg.app_secret,
            "tr_id": tr_id,
            "custtype": "P",
        }

    def _tr(self, real: str, paper: str) -> str:
        return paper if self.cfg.is_paper else real

    def _request(self, method: str, path: str, tr_id: str, **kwargs) -> dict[str, Any]:
        url = f"{self.cfg.base_url}{path}"
        headers = self._headers(tr_id)
        for attempt in range(3):
            resp = self._session.request(method, url, headers=headers, timeout=10, **kwargs)
            if resp.status_code == 429:
                time.sleep(0.5 * (attempt + 1))
                continue
            resp.raise_for_status()
            return resp.json()
        resp.raise_for_status()
        return resp.json()

    # ---------- 시세 ----------
    def get_current_price(self, ticker: str) -> int:
        body = self._request(
            "GET",
            "/uapi/domestic-stock/v1/quotations/inquire-price",
            tr_id="FHKST01010100",
            params={"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": ticker},
        )
        return int(body["output"]["stck_prpr"])

    # ---------- 잔고 ----------
    def get_balance(self) -> dict[str, Any]:
        cano, prdt = self._account_split()
        tr_id = self._tr(real="TTTC8434R", paper="VTTC8434R")
        body = self._request(
            "GET",
            "/uapi/domestic-stock/v1/trading/inquire-balance",
            tr_id=tr_id,
            params={
                "CANO": cano,
                "ACNT_PRDT_CD": prdt,
                "AFHR_FLPR_YN": "N",
                "OFL_YN": "",
                "INQR_DVSN": "02",
                "UNPR_DVSN": "01",
                "FUND_STTL_ICLD_YN": "N",
                "FNCG_AMT_AUTO_RDPT_YN": "N",
                "PRCS_DVSN": "01",
                "CTX_AREA_FK100": "",
                "CTX_AREA_NK100": "",
            },
        )
        positions = []
        for row in body.get("output1", []):
            qty = int(row.get("hldg_qty", "0"))
            if qty <= 0:
                continue
            positions.append(
                {
                    "ticker": row["pdno"],
                    "name": row["prdt_name"],
                    "qty": qty,
                    "avg_price": float(row.get("pchs_avg_pric", "0") or 0),
                    "current_price": int(row.get("prpr", "0") or 0),
                    "eval_amount": int(row.get("evlu_amt", "0") or 0),
                    "pnl": int(row.get("evlu_pfls_amt", "0") or 0),
                }
            )
        summary = body.get("output2", [{}])[0]
        return {
            "positions": positions,
            "cash": int(summary.get("dnca_tot_amt", "0") or 0),
            "total_eval": int(summary.get("tot_evlu_amt", "0") or 0),
        }

    # ---------- 주문 ----------
    def place_order(
        self,
        ticker: str,
        qty: int,
        side: str,
        price: int = 0,
        order_type: str = "01",
    ) -> OrderResult:
        """side: 'buy' | 'sell'. order_type '01'=시장가, '00'=지정가."""
        if qty <= 0:
            raise ValueError(f"qty must be positive, got {qty}")
        if side == "buy":
            tr_id = self._tr(real="TTTC0802U", paper="VTTC0802U")
        elif side == "sell":
            tr_id = self._tr(real="TTTC0801U", paper="VTTC0801U")
        else:
            raise ValueError(f"unknown side: {side}")

        cano, prdt = self._account_split()
        payload = {
            "CANO": cano,
            "ACNT_PRDT_CD": prdt,
            "PDNO": ticker,
            "ORD_DVSN": order_type,
            "ORD_QTY": str(int(qty)),
            "ORD_UNPR": str(int(price)) if order_type == "00" else "0",
        }
        body = self._request(
            "POST",
            "/uapi/domestic-stock/v1/trading/order-cash",
            tr_id=tr_id,
            data=json.dumps(payload),
        )
        rt_cd = body.get("rt_cd")
        success = rt_cd == "0"
        order_id = body.get("output", {}).get("ODNO") if success else None
        if not success:
            log.error("KIS order failed: %s", body.get("msg1"))
        return OrderResult(success=success, order_id=order_id, raw=body)

    def _account_split(self) -> tuple[str, str]:
        if "-" not in self.cfg.account_no:
            raise ValueError("KIS_ACCOUNT_NO must be 'xxxxxxxx-xx' format")
        head, tail = self.cfg.account_no.split("-", 1)
        return head, tail
