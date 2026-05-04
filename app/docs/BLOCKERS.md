# BLOCKERS — 막힌 항목

## Step 0 환경 점검

| 도구 | 상태 | 사장님이 무엇을 하면 풀리는지 |
|------|------|-------------------|
| node 20+ | OK (v20.20.2) | — |
| pnpm 9+ | npm 글로벌 설치 + 심볼릭 링크로 통과 (v9.15.9) | 사장님 환경에서 `npm i -g pnpm@9` 한 번 |
| git | OK (2.43.0) | — |
| supabase CLI | 미설치 | `npm i -g supabase` 한 번. 또는 Supabase Studio SQL Editor에서 마이그레이션 직접 실행 |
| gh CLI | **미설치** | 사장님 환경에서 `brew install gh` 또는 `apt install gh` 후 `gh auth login`. 또는 GitHub 웹에서 빈 repo 생성 → `git remote add origin URL && git push -u origin main` |

## MCP 서버

| MCP | 상태 | 우회 |
|-----|------|------|
| filesystem | 기본 작동 | — |
| github | gh CLI로 직접 처리 | gh CLI 사용 |
| supabase | 미사용 (CLI로 동등) | `pnpm db:push` |
| playwright | 미설치 | e2e는 `pnpm exec playwright install` 먼저 |

## 외부 API 키 미설정

모두 mock fallback 동작. 사장님이 .env.local에 채울 때:

| 서비스 | mock 동작 | 실 키 받는 곳 |
|--------|----------|--------------|
| 토스페이먼츠 | 결제는 console에 [TOSS-MOCK] 로그, 환불은 [TOSS-MOCK-REFUND] | https://docs.tosspayments.com 가맹 신청 |
| Anthropic | AI 가이드 stub 함수 사용 (4분기 분기 응답) | https://console.anthropic.com |
| Voyage AI | 임베딩 스크립트 즉시 종료 | https://www.voyageai.com |
| Resend | 이메일 console.log | https://resend.com |
| Google·카카오 OAuth | 이메일 로그인만 노출 | Supabase Auth → Providers |

## 아직 구현 안 된 기능 (ROADMAP 참조)

- AI 가이드 카드 UI (학생 화면에 표시) — 백엔드 라우트는 동작, 프론트 통합 미완
- Voyage 임베딩 cron 실제 호출 — stub만
- Storage 업로드 UI (산출물 PDF/이미지) — DB 컬럼은 준비, 업로드 폼 미완
- 토스 결제창 v2 클라이언트 SDK 연동 — webhook은 준비, 프론트 결제 버튼 미완
- school_admin 베타 1기에서 비활성 (E-1 결정대로)
- 카카오 알림 — channel enum만 추가
