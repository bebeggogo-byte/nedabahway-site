#!/usr/bin/env bash
# 500-post blog engine 설치 — 이 레포의 모듈을 맥 에이전트(blog_auto)에 얹는다.
# 사용: bash tools/blog_auto_500/install.sh
set -euo pipefail

AGENT_BLOG="${AGENT_BLOG:-$HOME/Scripts/agent/blog_auto}"
HERE="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d "$AGENT_BLOG" ]; then
  echo "❌ blog_auto 디렉터리를 찾을 수 없습니다: $AGENT_BLOG"
  echo "   AGENT_BLOG=/경로 bash install.sh 로 직접 지정하세요."
  exit 1
fi

echo "→ 설치 대상: $AGENT_BLOG"
for f in rubric_scorer.py categorize.py plan_runner.py daily3.py plan_500.json naver_categories.json; do
  cp "$HERE/$f" "$AGENT_BLOG/$f"
  echo "  복사: $f"
done

mkdir -p "$AGENT_BLOG/naver_ready" "$AGENT_BLOG/state"
echo "  생성: naver_ready/ (카테고리 트레이), state/ (진행 기록)"

echo
echo "✅ 설치 완료. 다음으로 검증하세요:"
echo "   cd ~/Scripts"
echo "   python3 -m agent.blog_auto.plan_runner --fill 1 --dry-run   # 1편 생성+채점만(발행X)"
echo "   python3 -m agent.blog_auto.daily3 --dry-run                 # 풀 채우기 리허설"
echo
echo "실제 가동(하루 3편 + 카테고리 분류 + 네이버 초안):"
echo "   python3 -m agent.blog_auto.daily3 --target 3"
echo "   → 결과는 ~/Scripts/agent/blog_auto/naver_ready/<카테고리>/<slug>/naver.html"
