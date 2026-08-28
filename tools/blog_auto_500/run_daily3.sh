#!/usr/bin/env bash
# launchd가 매일 호출하는 래퍼. PATH/node(claude CLI) 환경을 갖춘 뒤 daily3 실행.
# 하루 3편, Max 구독(claude CLI, use_api_key:false) 범위 내에서 생성.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
# nvm 사용 시 node 로드
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1

cd "$HOME/Scripts" || exit 1
LOG_DIR="$HOME/Scripts/agent/blog_auto/state"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/daily3.log"

echo "[$(date '+%F %T')] daily3 start" >> "$LOG"
python3 -m agent.blog_auto.daily3 --target 3 >> "$LOG" 2>&1
rc=$?
echo "[$(date '+%F %T')] daily3 done rc=$rc" >> "$LOG"
exit $rc
