# Korean Stock Quant Trading (Paper)

한국주식 퀀트 자동매매 v0.1 — KIS Open API 모의투자 + Cross-sectional Momentum.

## 구조

```
trading/
├── config.py                   # KisConfig / StrategyConfig / CostConfig
├── requirements.txt
├── .env.example
├── src/
│   ├── broker/kis_client.py    # 한국투자증권 KIS REST 클라이언트
│   ├── data/market_data.py     # pykrx OHLCV / 시총 (parquet 캐시)
│   ├── data/universe.py        # KOSPI 시총 상위 N (우선주·스팩·리츠 제외)
│   ├── strategies/momentum.py  # 12-1 cross-sectional momentum
│   ├── backtest/engine.py      # 일봉 백테스트 (수수료 0.015% + 거래세 0.18%)
│   ├── risk/sizing.py          # 호가단위 라운딩 + 종목당 비중 캡
│   └── logger.py               # SQLite 거래/잔고 로그
├── scripts/
│   ├── backtest.py
│   └── run_paper.py            # 페이퍼 리밸런서 (cron)
└── logs/                       # SQLite DB 저장 (gitignore)
```

## 셋업

```bash
cd trading
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### KIS Open API 모의투자 신청

1. [KIS 개발자센터](https://apiportal.koreainvestment.com) 가입 → 앱 등록
2. 모의투자 계좌 신청 (한국투자증권 앱에서 "모의투자" 메뉴 → 무료)
3. `.env` 에 입력:
   - `KIS_APP_KEY`, `KIS_APP_SECRET` — 앱 등록 후 발급
   - `KIS_ACCOUNT_NO` — `xxxxxxxx-01` 형식
   - `KIS_BASE_URL=https://openapivts.koreainvestment.com:29443` (모의)
   - `KIS_PAPER=true`

## 사용

### 1. 백테스트

```bash
python -m scripts.backtest --start 2020-01-01 --end 2024-12-31 \
       --top-n 10 --rebalance-freq W-MON
```

출력: total_return / CAGR / sharpe / max_drawdown / 거래 내역.

먼저 백테스트로 전략에 양의 기댓값이 있는지 확인하고, 파라미터(`top_n`, `lookback_months`)를 조정한다.

### 2. 페이퍼 트레이딩 (의도만 보기)

```bash
python -m scripts.run_paper --dry-run
```

### 3. 페이퍼 트레이딩 (실행)

```bash
python -m scripts.run_paper
```

cron 예 (매주 월 09:30 KST):

```cron
30 9 * * 1 cd /path/to/trading && /path/to/.venv/bin/python -m scripts.run_paper >> logs/cron.log 2>&1
```

### 4. 로그 확인

```bash
sqlite3 logs/trades.db
> .tables
> SELECT * FROM rebalance_runs ORDER BY id DESC LIMIT 5;
> SELECT * FROM orders WHERE success = 0;
> SELECT snapshot_at, cash, total_eval FROM equity_snapshots;
```

## 파라미터 (config.py)

| 항목 | 기본값 | 설명 |
|---|---|---|
| `universe_size` | 50 | 시총 상위 N |
| `lookback_months` | 12 | 모멘텀 측정 기간 |
| `skip_recent_months` | 1 | 직전 1개월 제외 (단기 반전 회피) |
| `top_n` | 10 | 매수 종목 수 |
| `cash_buffer` | 0.05 | 현금 버퍼 비율 |
| `commission_rate` | 0.00015 | 수수료 |
| `tax_rate_sell` | 0.0018 | 매도 거래세 |

## 다음 단계

- [ ] 모의투자 계좌로 8~12주 운용 → 백테스트 vs 실집행 슬리피지 측정
- [ ] 추가 전략: mean reversion, low-vol, dual momentum
- [ ] 위험관리: 트레일링 스톱, 시장 레짐 필터 (KOSPI 200일선 이탈 시 현금화)
- [ ] 종목별 메타데이터 (섹터, 업종) 기반 분산
- [ ] 실거래 전환 체크리스트

## 주의

- 본 코드는 학습/연구용. 백테스트 결과가 미래 수익을 보장하지 않는다.
- 실거래 전환 전 최소 3개월 이상 페이퍼 운용 + 백테스트 vs 실거래 갭 검증.
- 한 번도 본 적 없는 시나리오(거래정지, VI, 상장폐지)에 대한 처리는 점진적으로 보강.
