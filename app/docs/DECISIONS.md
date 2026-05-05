# DECISIONS — 본 작업 중 내린 결정

> 사장님이 다른 길을 원하면 표 마지막 칸의 "변경하려면 어디"만 보면 됨.

## Phase 1 사전 결정 (사장님 직접 지시) — 그대로 구현

| ID | 결정 | 구현 |
|----|------|------|
| D-1 | 워크시트 다형성 = 옵션 C 하이브리드 (JSON Schema + generated column) | `worksheet_templates.schema jsonb` + `worksheet_responses` 의 `iden_one_person/lack/strength/starcp_situation` 평탄화 컬럼 |
| D-2 | 권한 = profiles.role enum, IDEN 교사는 enrollments에서 파생 | `is_iden_teacher(uid)` SQL 함수 |
| D-3 | 학생 식별 = 익명 코드 디폴트 | `schools.identity_policy='pseudonym_only'` 디폴트 |
| D-4 | case_embeddings = 56일 후 활성 | `is_user_visible boolean default false` (cron으로 활성화) |
| D-5 | 산출물 저장소 = Supabase Storage | `outputs.storage_path` 단일 |
| D-6 | 환불 정책 v1 = 24h/before-1st/after-1st/not-eligible | `calculate_refund(p_payment_id)` SQL 함수 |
| E-1 | school_admin 베타 1기 비활성 | role enum에 자리만, RLS는 system_admin만 |
| E-2 | AI 가이드 학생 노출 = next_step·unblocking_hint는 1주차부터 | `profiles.ai_guidance_enabled boolean default true` |

## §4 회색지대 — 본 작업에서 확정

| ID | 결정 | 위치 |
|----|------|------|
| 1 | 패키지 매니저 = pnpm 9 | `package.json` packageManager |
| 2 | Next.js 16 + React 19 + TS strict | `next.config.mjs`, `tsconfig.json` |
| 3 | Tailwind v4 + shadcn 부재 시 손수 토큰 | `src/styles/tokens.css` |
| 4 | DB 클라이언트 = @supabase/ssr | `src/lib/supabase/{client,server}.ts` |
| 5 | 검증 = zod, 폼 = react-hook-form | `package.json` deps |
| 6 | AI = Anthropic claude-opus-4-7 | `src/server/ai/system-prompts.ts`, `/api/ai/guide` |
| 7 | 결제 = 토스페이먼츠 결제창 v2 + mock fallback | `/api/webhooks/toss`, `src/server/payments/toss-refund.ts` |
| 8 | 이메일 = Resend, 미설정 시 console.log | `src/lib/env.ts` resend.isConfigured |
| 9 | 폰트 = Pretendard CDN | `tokens.css` @import |
| 10 | 시간대 = DB UTC, 표시 KST | `date-fns-tz` |
| 11 | 분납 = 베타 1기 단일 결제만 | `payments.installment_*` 컬럼만, UI 비활성 |
| 12 | OAuth = 키 placeholder, 이메일만 노출 | `Nav.tsx` 조건부 |
| 13 | 테스트 = vitest 단위 + Playwright 1 플로우 | `vitest.config.ts`, `playwright.config.ts` |
| 14 | CI = GitHub Actions install·lint·typecheck·test·build | `.github/workflows/ci.yml` |
| 15 | 배포 = vercel.json 까지만, 실제는 사장님 | `vercel.json` |
| 16 | "1회차 종료 이후 30%"의 종결 시점 = 2회차 시작 전까지 | `calculate_refund()` |
| 17 | "1회차 종료" 정의 = seq=1 AND status IN ('closed','reviewed') | 같은 함수 |
| 18 | "2회차 시작" 정의 = seq=2 AND status IN ('open'/'submitted'/'reviewed'/'closed') | 같은 함수 |
| 19 | 환불 승인 = 코치 수동 | `/api/refunds/[id]/approve` 코치 권한 가드 |
| 20 | 환불 가능 금액 = `payments.amount_krw` (할인 적용 후) | `calculate_refund()` |

## 변경하려면 어디

- **환불 정책 비율 조정**: `supabase/migrations/0001_init.sql` 의 `calculate_refund()` 함수 한 곳만 수정 → `pnpm db:push`
- **트랙 가격·정원 조정**: `supabase/seed.sql` 의 tracks INSERT → `psql -f` 재실행 (ON CONFLICT DO UPDATE)
- **회기 수 변경**: 같은 파일의 session_templates INSERT
- **워크시트 폼 변경**: 같은 파일의 worksheet_templates JSON Schema
- **AI 시스템 프롬프트**: `src/server/ai/system-prompts.ts`
- **디자인 색상**: `src/styles/tokens.css` `:root` 변수
- **권한 정책**: `supabase/migrations/0002_rls.sql` 정책 편집 후 `pnpm db:push`

## 향후 정책 v2

환불 정책을 변경할 때:
1. 새로운 함수 `calculate_refund_v2(p_payment_id)` 추가
2. `payments.refund_policy_version` 디폴트 'v2'로 변경
3. 기존 결제는 v1 함수로 처리, 신규 결제는 v2 함수로 처리
4. UI는 `payments.refund_policy_version` 보고 분기

이 구조로 v1·v2 결제가 공존해도 안전합니다.
