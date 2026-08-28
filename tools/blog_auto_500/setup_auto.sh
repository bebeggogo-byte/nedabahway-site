#!/usr/bin/env bash
# 매일 자동 실행을 launchd에 등록한다. 한 번만 실행하면 이후 매일 자동.
# 기본: 매일 07:10에 daily3 --target 3 (하루 3편, Max 구독 범위 내).
# 시각 변경:  HOUR=21 MINUTE=0 bash setup_auto.sh
set -euo pipefail

HOUR="${HOUR:-7}"
MINUTE="${MINUTE:-10}"
WRAP="$HOME/Scripts/agent/blog_auto/run_daily3.sh"
LABEL="org.nedabah.blogauto"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ ! -f "$WRAP" ]; then
  echo "❌ 래퍼가 없습니다: $WRAP"
  echo "   먼저 'bash tools/blog_auto_500/install.sh' 를 실행하세요."
  exit 1
fi
chmod +x "$WRAP"
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Scripts/agent/blog_auto/state"

cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$WRAP</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>$HOUR</integer>
    <key>Minute</key><integer>$MINUTE</integer>
  </dict>
  <key>StandardOutPath</key><string>$HOME/Scripts/agent/blog_auto/state/launchd.out</string>
  <key>StandardErrorPath</key><string>$HOME/Scripts/agent/blog_auto/state/launchd.err</string>
  <key>RunAtLoad</key><false/>
</dict>
</plist>
PLIST_EOF

launchctl unload "$PLIST" >/dev/null 2>&1 || true
launchctl load -w "$PLIST"

echo "✅ 자동 등록 완료: 매일 $(printf '%02d:%02d' "$HOUR" "$MINUTE")에 daily3 --target 3"
echo "   plist: $PLIST"
echo
echo "지금 바로 1회 테스트(자동 등록과 별개):"
echo "   bash $WRAP && tail -n 20 $HOME/Scripts/agent/blog_auto/state/daily3.log"
echo
echo "해제하려면:  launchctl unload $PLIST && rm $PLIST"
