# HANDOVER — 사장님이 깨서 5분 안에 동작시키는 절차

> 베타 1기 코칭 SaaS 골격 완성. 환불 정책 v1 포함.
> 이 문서를 위에서 아래로 따라가면 끝.

---

## 사장님이 직접 해야 할 일 (한 번만)

### 1. Supabase 프로젝트 생성 (3분)

1. https://supabase.com 접속 → "New project" 클릭
2. 프로젝트명 `nedabah-app`, 비밀번호 적당히, region `Northeast Asia (Seoul)` 선택
3. 만들고 나면 프로젝트 페이지에서 **Settings → API** 메뉴
4. 아래 3개 값을 복사해 둡니다:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ 외부 노출 금지
5. **Settings → Database → Connection string** → "URI" 탭 → "Use connection pooling" 활성화 → URI 복사
   - `SUPABASE_DB_URL` (예: `postgresql://postgres.xxx:[email protected]:6543/postgres`)

### 2. .env.local 만들기 (1분)

```bash
cd nedabah-app
cp .env.example .env.local
```

`.env.local` 열어서 위에서 복사한 4개 키를 채웁니다. 나머지 토스·Anthropic·Resend 등은 비워둬도 mock fallback으로 동작.

### 3. 한 번에 실행 (1분)

```bash
pnpm install
pnpm db:push        # 마이그레이션 적용 (0001_init.sql + 0002_rls.sql)
psql "$SUPABASE_DB_URL" -f supabase/seed.sql    # 트랙·세션·할인코드 시드
pnpm seed:users     # 테스트 계정 4명 + 결제 row 시드
pnpm dev            # http://localhost:3000
```

> Supabase CLI가 없으면: `npm i -g supabase` 한 줄.
> psql이 없으면: Supabase Studio (https://supabase.com/dashboard/project/_/editor) → SQL Editor → seed.sql 내용 붙여넣고 Run.

### 4. 로그인해서 확인

테스트 계정 (비밀번호 공통 `nedabah1!`):

| 이메일 | 역할 | 시나리오 |
|--------|------|---------|
| `[email protected]` | 코치 (사장님 대역) | 모든 학생·환불 요청 관리 |
| `[email protected]` | 학생 | STARCP 결제 25h 전 → 50% 환불 시나리오 |
| `[email protected]` | 학생 | IDEN 진로 결제 2h 전 → 100% 환불 시나리오 |
| `[email protected]` | 학생 | IDEN 교사 + 학교·반·학생 더미 |

---

## 검증 시나리오 (모두 동작해야 통과)

### 환불 시스템 4분기 검증

1. `[email protected]`으로 로그인 → `/dashboard` → "내 등록" 카드 → "관리"
2. 등록 상세 페이지에서 "환불 신청" 클릭
3. 미리보기에서 **100% 환불 (within_24h)** 표시 확인
4. 사유 입력 → 신청 → `/refunds`로 리다이렉트, "검토 중" 카드 확인

5. 로그아웃 → `[email protected]`으로 로그인 → `/coach/refunds`
6. "검토 대기" 카드에 위 학생 요청 보임 → "승인 + 환불" 클릭
7. mock 모달 확인 → 학생 `/refunds`에서 "환불 완료" 확인
8. 학생 `/dashboard` → 등록 상태 "refunded" 확인

다른 분기:
- `[email protected]` (25h 전) → 50% before_first_session
- 1회차 강제 종료 후 다시 신청 → 30% after_first_session
- 2회차 강제 시작 후 → "환불 불가" + 신청 버튼 비활성

### 학생 워크시트 흐름

1. `[email protected]`로 로그인
2. `/dashboard` → "1회차 워크시트 작성하기"
3. 폼 작성 → 30초 후 자동 저장 표시
4. "제출하기" → 코치 페이지에서 답변 보임

### 코치 검토 흐름

1. `[email protected]` → `/coach/dashboard`
2. 담당 학생 카드 → "코칭 →"
3. 학생 답변 + 코치 메모 작성

---

## 다음 단계 (선택)

### Vercel 배포

```bash
# 1) GitHub repo 만들고 push (gh CLI 인증돼 있을 때)
gh repo create bebeggogo-byte/nedabah-app --public --source=. --remote=origin --push

# 또는 gh CLI 없으면: GitHub 웹에서 nedabah-app repo 만든 뒤
git remote add origin https://github.com/bebeggogo-byte/nedabah-app.git
git push -u origin main

# 2) Vercel 연결
# https://vercel.com/new → import nedabah-app
# Environment Variables에 .env.local 4개 키 그대로 추가

# 3) DNS
# Vercel 프로젝트 → Settings → Domains → app.nedabah.org 추가
# 도메인 DNS 관리에서 CNAME app → cname.vercel-dns.com
```

### 외부 서비스 연동 (선택)

| 서비스 | 키 | 필요한 시점 |
|--------|----|----|
| 토스페이먼츠 sandbox | `NEXT_PUBLIC_TOSS_CLIENT_KEY` · `TOSS_SECRET_KEY` | 실 결제 테스트 |
| Anthropic | `ANTHROPIC_API_KEY` | AI 가이드 실 호출 |
| Voyage AI | `VOYAGE_API_KEY` | 56일 후 임베딩 |
| Resend | `RESEND_API_KEY` | 이메일 알림 |
| Google OAuth | Supabase Auth → Providers | 소셜 로그인 |
| 카카오 OAuth | Supabase Auth → Providers | 소셜 로그인 |

키 미설정이면 모두 mock/fallback으로 동작합니다. 1기 베타에는 토스·Anthropic만 권장.

---

## 환불 정책 요약 (v1)

| 시점 | 비율 | 코드 |
|------|------|------|
| 결제 후 24시간 이내 | 100% | within_24h |
| 24시간 초과 ~ 1회차 시작 전 | 50% | before_first_session |
| 1회차 종료 ~ 2회차 시작 전 | 30% | after_first_session |
| 2회차 시작 이후 | 0% | not_eligible |

**환불 처리 절차** (`/coach/refunds` 페이지):
1. 학생이 신청한 요청이 "검토 대기" 카드로 보임
2. 사유·금액 확인 → 승인 또는 반려
3. 승인 시 토스 환불 API 호출 → payments·enrollments 자동 갱신 → 학생에게 알림

---

## 문제가 생기면

### 마이그레이션 실패

```bash
# 마이그레이션 다시 처음부터
pnpm db:reset
```

### Supabase Studio에서 직접 SQL 실행

https://supabase.com/dashboard/project/{PROJECT_ID}/sql

`supabase/migrations/0001_init.sql` 내용 그대로 붙여넣고 Run.

### 그 외

- `docs/BLOCKERS.md` — 시스템 셋업 중 막힌 항목 표
- `docs/DECISIONS.md` — 본 작업 중 내린 결정 (사장님이 다른 길 원하면 여기 보고 한 곳만 바꾸면 됨)
- `docs/ROADMAP.md` — 다음 Phase 작업

---

## 한 줄 보고

**사장님, 환불 정책 포함 베타 1기 골격 완성. .env 채우고 pnpm db:push 한 번이면 동작합니다.**
