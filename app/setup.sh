#!/usr/bin/env bash
# ============================================================
# nedabah-app 5분 부팅 스크립트
# 사장님 컴퓨터에서 한 번만 실행. 사용법:
#
#   1. 터미널 열고 이 폴더로 이동
#   2. ./setup.sh 입력 후 엔터
#
# 키는 코드에 안 박아둡니다. 처음 실행 시 .env.local 템플릿이 생성되며,
# 사장님이 4개 값(URL · anon · service_role · DB URL)을 채우면 끝.
# 키 출처: https://supabase.com/dashboard/project/wdxzndgbowigicbjsnbi/settings/api
# ============================================================
set -e

cd "$(dirname "$0")"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

step() { echo -e "\n${GREEN}━━━ $1 ━━━${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
err()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ── 1. 도구 점검 ─────────────────────────────────────────────
step "1) 필수 도구 점검"

command -v node >/dev/null 2>&1 || err "node 미설치. https://nodejs.org 에서 LTS 받으십시오."
command -v pnpm >/dev/null 2>&1 || { warn "pnpm 미설치 — 자동 설치 시도"; npm i -g pnpm@9 || err "pnpm 설치 실패"; }
command -v supabase >/dev/null 2>&1 || { warn "supabase CLI 미설치 — 자동 설치 시도"; npm i -g supabase || err "supabase CLI 설치 실패"; }

echo "  node $(node -v)"
echo "  pnpm $(pnpm -v)"
echo "  supabase $(supabase --version | head -1)"

# ── 2. .env.local 점검 ──────────────────────────────────────
step "2) .env.local 점검"

if [ ! -f .env.local ]; then
  warn ".env.local 없음 → 템플릿 생성"
  cp .env.example .env.local 2>/dev/null || cat > .env.local <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development
EOF

  echo ""
  echo "${YELLOW}.env.local 템플릿 생성됨. 4개 값을 채워주십시오:${NC}"
  echo ""
  echo "  ${YELLOW}1. NEXT_PUBLIC_SUPABASE_URL${NC}"
  echo "     → 대시보드 → Settings → API → 'Project URL'"
  echo "     예: https://wdxzndgbowigicbjsnbi.supabase.co"
  echo ""
  echo "  ${YELLOW}2. NEXT_PUBLIC_SUPABASE_ANON_KEY${NC}"
  echo "     → 같은 페이지의 'anon public' 키 (sb_publishable_... 또는 eyJ... 형식)"
  echo ""
  echo "  ${YELLOW}3. SUPABASE_SERVICE_ROLE_KEY${NC}"
  echo "     → 같은 페이지의 'service_role' 키 (sb_secret_... 또는 eyJ... 형식)"
  echo ""
  echo "  ${YELLOW}4. SUPABASE_DB_URL${NC}"
  echo "     → Settings → Database → Connection string → URI 탭 + 'Use connection pooling' 체크"
  echo "     → 비번 자리에 실제 DB 비밀번호 입력해서 한 줄 복사"
  echo "     예: postgresql://postgres.xxx:비번@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
  echo ""
  echo "편집기로 .env.local 열어서 4개 값 채우고 저장 후 엔터:"
  read -p "" _
fi

# 핵심 4개 키가 채워졌는지 확인
set -a; source .env.local; set +a
[ -n "$NEXT_PUBLIC_SUPABASE_URL" ] || err ".env.local의 NEXT_PUBLIC_SUPABASE_URL 비었습니다."
[ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] || err ".env.local의 NEXT_PUBLIC_SUPABASE_ANON_KEY 비었습니다."
[ -n "$SUPABASE_SERVICE_ROLE_KEY" ] || err ".env.local의 SUPABASE_SERVICE_ROLE_KEY 비었습니다."
[ -n "$SUPABASE_DB_URL" ] || err ".env.local의 SUPABASE_DB_URL 비었습니다."

echo "  ✓ 4개 키 모두 입력됨"

# ── 3. 의존성 설치 ──────────────────────────────────────────
step "3) pnpm install (1~2분)"
pnpm install --no-frozen-lockfile

# ── 4. DB 마이그레이션 ──────────────────────────────────────
step "4) Supabase DB 마이그레이션 적용 (23개 테이블 + RLS)"

# project ref 추출
PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -E 's|https?://([^.]+)\.supabase\.co.*|\1|')
echo "  project ref: $PROJECT_REF"

# 마이그레이션 직접 적용 (db push가 안 되면 psql로)
if command -v psql >/dev/null 2>&1; then
  echo "  psql로 마이그레이션 + 시드 한 번에 적용"
  psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql 2>&1 | tail -5
  psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_rls.sql 2>&1 | tail -5
  psql "$SUPABASE_DB_URL" -f supabase/seed.sql 2>&1 | tail -5
else
  warn "psql 미설치 — Supabase Studio에서 수동 적용 필요"
  echo "  아래 3개 파일을 순서대로 https://supabase.com/dashboard/project/$PROJECT_REF/sql/new 에 붙여넣고 Run:"
  echo "    1. supabase/migrations/0001_init.sql"
  echo "    2. supabase/migrations/0002_rls.sql"
  echo "    3. supabase/seed.sql"
  echo ""
  read -p "위 3개 SQL 모두 Studio에서 실행 끝났으면 엔터" _
fi

# ── 5. 테스트 계정 시드 ─────────────────────────────────────
step "5) 테스트 계정 4명 + 결제 시나리오 row 시드"
pnpm seed:users 2>&1 | tail -10

# ── 6. 개발 서버 시작 ───────────────────────────────────────
step "6) pnpm dev (Ctrl+C 누르면 종료)"
echo ""
echo -e "${GREEN}🎉 셋업 완료. 잠시 후 브라우저에서 http://localhost:3000 열립니다.${NC}"
echo ""
echo "테스트 계정 (비번 공통: nedabah1!):"
echo "  · [email protected] (코치/사장님 — 환불 승인 권한)"
echo "  · [email protected] (STARCP, 25h 전 결제 → 50% 환불 시나리오)"
echo "  · [email protected] (이직, 2h 전 결제 → 100% 환불 시나리오)"
echo "  · [email protected] (IDEN 교사 + 학교·반·학생 더미)"
echo ""

# 5초 후 브라우저 자동 열기 (선택, OS별)
(sleep 5 && (xdg-open http://localhost:3000 2>/dev/null || open http://localhost:3000 2>/dev/null || start http://localhost:3000 2>/dev/null)) &

pnpm dev
