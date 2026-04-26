#!/bin/bash
# CEO 콘솔 로컬 서버 — 본인 Mac에서만 접근 가능
# 사용: bash resources/_build/open_console.sh
#       또는 ~/Desktop/nedabahway-site/resources/_build/open_console.sh
set -e

SITE_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${PORT:-8765}"
URL="http://127.0.0.1:${PORT}/resources/_console/"

cd "$SITE_ROOT"

# 빌드 최신화
echo "▶ render_all.py 실행..."
python3 resources/_build/render_all.py

# 이미 떠있으면 죽임
if lsof -nP -iTCP:${PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  echo "▶ 포트 ${PORT} 사용 중 — 종료 후 재시작"
  lsof -nP -iTCP:${PORT} -sTCP:LISTEN -t | xargs kill -9 || true
  sleep 1
fi

# 127.0.0.1만 바인딩 → LAN/외부 노출 0
echo "▶ 로컬 서버 기동: ${URL}"
( python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/nedabah_console.log 2>&1 & )
sleep 1
open "$URL"
echo "✓ 콘솔 열림. 종료: lsof -nP -iTCP:${PORT} -sTCP:LISTEN -t | xargs kill"
