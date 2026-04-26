# Quant Lab — One-Time Setup Guide

이 문서는 Quant Lab 시스템을 본인의 계정에서 자동 운영하기 위한 **단 한 번** 의 셋업 가이드.
한 번 끝내면 매일 평일 자동 운영됩니다.

---

## 0. 현재 상태

PR #14 머지 후 시스템은 즉시 작동합니다 — **별도 설정 없이도** SimulatedBroker 가 pykrx 가격으로 가상 매매를 진행하고 대시보드에 결과 표시.

**아무것도 안 하면 ↓**
- ✅ 매일 평일 06:30 UTC: SimulatedBroker로 가상 매매
- ✅ 매주 일요일 18:00 KST: 의회 dry-run (LLM 없이 의제만)
- ✅ 4시간마다: 시스템 건강 체크
- ✅ 대시보드 매일 자동 업데이트

**전체 기능 활성화 (KIS 모의투자 + LLM 의회) ↓** 아래 스텝 진행.

---

## 1. KIS 한국투자증권 모의투자 키 발급 (필수, 무료)

**소요 시간: 약 30분 (계좌 신청 1~2일 대기)**

### 1.1 한국투자증권 계좌 (이미 있으면 건너뜀)
- https://securities.koreainvestment.com 또는 한국투자증권 앱
- 비대면 계좌 개설 (10분)

### 1.2 모의투자 계좌 신청
- 한국투자증권 앱 → "모의투자" 메뉴 → 신청
- 가상 자본 1억원 자동 지급
- 계좌번호 `xxxxxxxx-01` 형식 메모

### 1.3 KIS 개발자센터 가입 + 앱 등록
- https://apiportal.koreainvestment.com
- 회원가입 → "신규 앱 등록" → 모의투자 선택
- **APP KEY** 와 **APP SECRET** 발급 (1~2일 심사)

### 1.4 GitHub Secrets 등록
GitHub 레포 → Settings → Secrets and variables → Actions → New repository secret

| Name | Value |
|---|---|
| `KIS_APP_KEY` | (발급된 앱키) |
| `KIS_APP_SECRET` | (발급된 시크릿) |
| `KIS_ACCOUNT_NO` | `xxxxxxxx-01` (모의투자 계좌번호) |
| `KIS_BASE_URL` | `https://openapivts.koreainvestment.com:29443` |

### 1.5 daily 워크플로 KIS 모드로 전환
GitHub → Actions → quant-lab-daily → "Run workflow" → `dry_run = false`

이후로는 매일 평일 자동으로 **KIS 모의투자** 모드로 실행됩니다.

---

## 2. LLM 의회 활성화 (선택, Max 구독 사용)

PR #16 머지 후, 워크플로우는 **CLAUDE_CODE_OAUTH_TOKEN** 또는 **ANTHROPIC_API_KEY** 시크릿이 등록되면 자동으로 LLM 모드로 전환됩니다. 둘 다 없으면 기존 dry-run 모드가 계속 작동합니다 (의제만 생성).

### 옵션 A — Claude Code OAuth (Max 구독 사용, 무료)

1. 로컬에서 Claude Code 로그인 후 토큰 추출:
   ```bash
   # macOS / Linux
   cat ~/.claude/credentials.json
   ```
   `oauth_token` 필드 복사.

2. GitHub → Settings → Secrets → Actions → New
   - Name: `CLAUDE_CODE_OAUTH_TOKEN`
   - Value: (복사한 토큰)

### 옵션 B — Anthropic API Key (사용량 과금)

1. [console.anthropic.com](https://console.anthropic.com) → API Keys → Create
2. GitHub Secrets:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-...`

### 활성화 후 동작

- 매주 일요일 18:00 KST 자동으로 5 LLM 에이전트 의회 개최
  - Researcher → CRO → CTO → CIO → (월 1회 Meta-Optimizer)
- 의회 결과: `quant/data/council/council-<date>.json` 자동 commit
- 대시보드 "Council" 카드에 CIO 의 결정 요약 자동 표시
- Meta 가 프롬프트 개선 제안하면 → **자동으로 draft PR 생성** (`meta/prompts-*` 브랜치)
- 사용자는 PR 검토 후 머지하면 다음 회기부터 개선된 프롬프트 사용

### 수동 실행

```bash
gh workflow run quant-lab-council-weekly --field include_meta=true
gh workflow run quant-lab-council-weekly --field force_dry_run=true   # LLM 끄기
```

---

## 3. 운영 확인

### 대시보드
- **메인 사이트**: https://www.nedabah.org/ → 홈 카드에 라이브 P&L
- **풀 대시보드**: https://www.nedabah.org/quant/

### GitHub Actions
- **Actions 탭** 에서 워크플로 실행 이력 확인
- 실패 시 워치독이 자동으로 issue 오픈

### 이상 알림
- 평일 cron 미실행 30시간 초과 → Watchdog 이 issue 자동 오픈
- 알림 받으려면 본인 GitHub 알림 설정에서 이 레포 issue 구독

---

## 4. 비상 정지

### 거래 즉시 중단
GitHub → Actions → quant-lab-daily → "Disable workflow"

### CircuitBreaker 수동 발동
```bash
sqlite3 trading/logs/lab_circuit.db
> INSERT OR REPLACE INTO circuit_state(id, blocked_until, reason, updated_at)
  VALUES (1, '2099-12-31', 'manual stop by user', datetime('now'));
```

### 포지션 강제 청산
```bash
cd trading
python -m lab.cli daily --simulate  # 또는 KIS 키 있으면 그대로
# RiskAgent 가 다음 cycle 에서 모두 매도하지는 않음 — 직접 KIS 앱에서 청산 권장
```

---

## 5. Phase 3 진입 (실거래)

**자동 검증 시스템 (PR #17)** — 매주 토요일 22:00 KST `quant-lab-gate-weekly`
워크플로가 자동 평가. 6개 기준 모두 통과 시 GitHub issue 자동 생성.

### 6개 진입 기준

| 기준 | 임계값 | 측정 방식 |
|---|---|---|
| Paper trading 일수 | ≥ 60일 | daily_pnl 이벤트 누적 |
| 실현 OOS Sharpe (연환산) | > 0.5 | 페이퍼 매매 결과만 사용 |
| 실현 최대 낙폭 | > -25% | equity 시계열 |
| 실집행 거래 횟수 | ≥ 50 | sim_orders + execution_report |
| 4주간 비판자 FAIL 없음 | 0 FAIL | critique_report 이벤트 |
| 백테스트 vs 실현 갭 | < 30% | OOS Sharpe 비교 |

**대시보드 → "Phase 3 Gate" 카드** 에서 실시간 통과 현황 확인.

### 진입 결정 시 셋업

1. **실거래 계좌** + KIS 실전 키 (모의와 별도 발급 필요)
2. GitHub Secrets 업데이트:
   - `KIS_APP_KEY`, `KIS_APP_SECRET` → 실전 키로 교체
   - `KIS_ACCOUNT_NO` → 실전 계좌
   - `KIS_BASE_URL` → `https://openapi.koreainvestment.com:9443`
   - `KIS_PAPER` → `false`
3. **소액부터**: 의도 자본의 5~10% 만 입금
4. CircuitBreaker 한도 더 보수적으로 (`src/risk/limits.py` 의 `daily_loss_limit_pct=0.01`)
5. 1개월 모니터링 → 문제 없으면 자본 점진 확대 (월 +20% 권장)
6. **자동 전환 절대 안 됨** — 위 6단계는 사용자가 직접 수행 필요

### 비상 정지 (실거래 중)

```bash
# 즉시 모든 신규 주문 중단
gh workflow disable quant-lab-daily

# CircuitBreaker 수동 발동
sqlite3 trading/logs/lab_circuit.db
> INSERT OR REPLACE INTO circuit_state(id, blocked_until, reason, updated_at)
  VALUES (1, '2099-12-31', 'manual stop', datetime('now'));

# KIS 앱에서 직접 청산 (가장 확실)
```

---

## 문제 해결

| 증상 | 해결 |
|---|---|
| Actions 실패: "KIS env missing" | Secrets 등록 확인. 등록 안 했으면 자동으로 SimulatedBroker 모드로 작동 (정상). |
| 대시보드 업데이트 안 됨 | Actions 실행 확인. 워치독 issue 확인. |
| pykrx 데이터 오류 | KRX 사이트 일시 장애. 다음 cron 에서 자동 재시도. |
| 모의투자 주문 거부 | 동시호가 시간대 (08:30~09:00, 15:20~15:30) 회피 필요. workflow cron 시간 조정. |
