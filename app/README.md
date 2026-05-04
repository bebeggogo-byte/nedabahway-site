# nedabah-app

> 네다바웨이 코칭 SaaS — 5트랙 1:1 플랫폼 (베타 1기)

5분 부팅 절차는 [`docs/HANDOVER.md`](./docs/HANDOVER.md)를 그대로 따라가십시오.

## 5트랙

| 트랙 | 가격 | 정원 | 기간 |
|------|------|------|------|
| STARCP 마스터 | 400만 | 12명 | 12주 |
| IDEN 좌표 마스터 (진로교사) | 350만 | 8명 | 12주 |
| IDEN 진로 재설계 | 250만 | 6명 | 12주 |
| 창직·1인 사업자 | 500만 | 4명 | 12주 |
| 5S 리더십 마스터 | 600만 | 4명 | 6개월 |

## 환불 정책 v1

- 결제 후 24h 이내: 100%
- 24h ~ 1회차 시작 전: 50%
- 1회차 종료 ~ 2회차 시작 전: 30%
- 2회차 시작 이후: 0%

전체 정책 페이지: `/refund-policy`

## 기술 스택

- Next.js 16 + React 19 + TypeScript strict
- Supabase (Auth · Postgres · RLS · Storage · Realtime)
- Tailwind v4 + Pretendard
- Anthropic Claude · Voyage AI 임베딩 (선택)
- 토스페이먼츠 v2 (선택, 미설정 시 mock)
- Resend 이메일 (선택)
- Vercel 배포

## 디렉토리

```
src/
  app/
    (public)/      # 랜딩·로그인·환불정책
    (student)/     # 학생 대시보드·워크시트·환불 신청
    (coach)/       # 코치 대시보드·환불 승인
    (teacher)/     # IDEN 교사 분석 페이지
    api/           # webhooks·refunds·ai/guide
    auth/          # signout·callback
  components/      # Nav·WorksheetForm·CoachNoteForm·RefundRequestForm·CoachRefundActions·ClassChart
  lib/             # env·supabase clients
  server/          # payments·ai
  styles/          # tokens.css
  types/           # database types
supabase/
  migrations/
    0001_init.sql   # 23 tables + 2 views + 4 SQL functions
    0002_rls.sql    # RLS 정책
  seed.sql          # tracks·sessions·worksheets·discount·cohorts
scripts/
  seed-users.ts     # 테스트 계정 4개 + 결제 row
  embed-responses.ts # Voyage 임베딩 cron (stub)
docs/
  HANDOVER.md       # 사장님 5분 부팅 가이드
  DECISIONS.md      # 본 작업 중 내린 결정
  BLOCKERS.md       # 막힌 항목 + 우회
  ROADMAP.md        # 다음 Phase
tests/
  unit/             # vitest
  e2e/              # Playwright (1 플로우)
```

## 명령어

| 명령 | 동작 |
|------|------|
| `pnpm dev` | 로컬 개발 서버 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TS 검증 |
| `pnpm test` | vitest 단위 테스트 |
| `pnpm test:e2e` | Playwright e2e |
| `pnpm db:push` | Supabase 마이그레이션 |
| `pnpm db:reset` | 마이그레이션 + seed.sql 자동 |
| `pnpm seed:users` | 테스트 계정 시드 |

---

🤖 본 골격은 Claude Code로 자율 구축됨. 인계: `docs/HANDOVER.md`.
