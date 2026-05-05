#!/usr/bin/env bash
# ============================================================
# vercel-env-sync.sh — .env.local의 환경변수를 Vercel에 일괄 등록
#
# 사용법 (사장님 머신, app/ 디렉토리에서):
#   chmod +x scripts/vercel-env-sync.sh   # 최초 1회
#   ./scripts/vercel-env-sync.sh
#
# 전제:
#   1) vercel CLI 설치: npm i -g vercel
#   2) vercel login 완료
#   3) vercel link 완료 (현재 디렉토리를 Vercel 프로젝트와 연결)
#   4) .env.local 파일 존재 + 4개 키 채워짐
# ============================================================
set -e

cd "$(dirname "$0")/.."

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

if ! command -v vercel >/dev/null 2>&1; then
  echo -e "${RED}vercel CLI 미설치.${NC} 다음 명령으로 설치:"
  echo "  npm i -g vercel"
  exit 1
fi

if [ ! -f .env.local ]; then
  echo -e "${RED}.env.local 파일 없음.${NC} 먼저 setup.sh를 실행하십시오."
  exit 1
fi

if [ ! -f .vercel/project.json ]; then
  echo -e "${YELLOW}vercel link 가 안 됐습니다. 진행하기 전에:${NC}"
  echo "  vercel link"
  echo "  (Vercel 프로젝트를 선택하거나 생성)"
  exit 1
fi

echo -e "${GREEN}━━━ Vercel 환경변수 동기화 시작 ━━━${NC}"

# 클라이언트 노출 가능한 키 (NEXT_PUBLIC_) + 서버 전용 분리
CLIENT_KEYS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "NEXT_PUBLIC_SITE_URL"
  "NEXT_PUBLIC_TOSS_CLIENT_KEY"
  "NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED"
  "NEXT_PUBLIC_OAUTH_KAKAO_ENABLED"
)

SERVER_KEYS=(
  "SUPABASE_SERVICE_ROLE_KEY"
  "SUPABASE_DB_URL"
  "TOSS_SECRET_KEY"
  "ANTHROPIC_API_KEY"
  "ANTHROPIC_MODEL"
  "VOYAGE_API_KEY"
  "RESEND_API_KEY"
  "RESEND_FROM_EMAIL"
)

# .env.local 파싱
declare -A env_map
while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" =~ ^# ]] && continue
  # value에 등호 있으면 join 다시
  env_map["$key"]="$value"
done < .env.local

# 등록 함수
register_key() {
  local key="$1"
  local value="${env_map[$key]:-}"
  if [ -z "$value" ]; then
    echo -e "  ${YELLOW}skip${NC} $key (.env.local에 없음)"
    return
  fi
  echo -e "  ${GREEN}↗${NC} $key → production + preview"
  # Vercel CLI: 기존 값 있으면 덮어쓰기 (--force)
  printf '%s' "$value" | vercel env add "$key" production --force >/dev/null 2>&1 || true
  printf '%s' "$value" | vercel env add "$key" preview --force >/dev/null 2>&1 || true
}

echo ""
echo "1) 클라이언트 키 (브라우저 노출됨)"
for k in "${CLIENT_KEYS[@]}"; do
  register_key "$k"
done

echo ""
echo "2) 서버 키 (서버에서만 사용)"
for k in "${SERVER_KEYS[@]}"; do
  register_key "$k"
done

echo ""
echo -e "${GREEN}━━━ 동기화 완료 ━━━${NC}"
echo ""
echo "확인:"
echo "  vercel env ls"
echo "또는 https://vercel.com/[your-team]/[project]/settings/environment-variables"
echo ""
echo "다음 배포부터 적용됩니다. 즉시 반영 원하시면:"
echo "  vercel --prod"
