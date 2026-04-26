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

**현재 PR #14 의 의회는 dry-run 모드** — 의제 markdown 만 생성하고 LLM 호출은 안 함.

다음 PR (#15) 에서 **Claude Code GitHub Action** 통합 예정 — 이것이 머지되면:
- 매주 일요일 자동으로 5 LLM 에이전트 실행
- Max 구독 한도 사용 (별도 비용 없음)
- 의회 결과가 대시보드에 자동 게시

PR #15 머지 후 이 섹션 업데이트 예정.

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

## 5. 다음 단계 (검증된 후)

- **Phase 2 → 3 전환**: 페이퍼 3개월+ 운영 후 OOS Sharpe 검증되면 실거래 전환 검토
- **Phase 3 진입 시 추가 셋업**:
  - 실거래 계좌 + KIS 실전 키 (모의와 별도)
  - `.env` 또는 secrets 의 `KIS_BASE_URL` 을 실전 URL 로 변경
  - **소액부터** (의도자본의 5~10%)
  - CircuitBreaker 한도 더 보수적으로 (`daily_loss_limit_pct=0.01`)

---

## 문제 해결

| 증상 | 해결 |
|---|---|
| Actions 실패: "KIS env missing" | Secrets 등록 확인. 등록 안 했으면 자동으로 SimulatedBroker 모드로 작동 (정상). |
| 대시보드 업데이트 안 됨 | Actions 실행 확인. 워치독 issue 확인. |
| pykrx 데이터 오류 | KRX 사이트 일시 장애. 다음 cron 에서 자동 재시도. |
| 모의투자 주문 거부 | 동시호가 시간대 (08:30~09:00, 15:20~15:30) 회피 필요. workflow cron 시간 조정. |
