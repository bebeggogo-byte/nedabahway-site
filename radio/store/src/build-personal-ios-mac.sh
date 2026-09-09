#!/usr/bin/env bash
# ============================================================================
#  클래식FM 개인용 iOS 앱 — 맥에서 한 번만 실행하는 스크립트
#
#  ⚠️ 개인 사용 전용. KBS 클래식FM을 공개 프록시로 수신(재송신)하므로
#     본인 기기에서 본인만 쓰세요. 남에게 배포하거나 스토어에 올리지 마세요.
#
#  하는 일:
#    1) 리포를 최신으로 (git pull)
#    2) 풀기능 라디오 웹 번들 생성  → radio/.appdist/
#    3) Capacitor(iOS) 설치 · iOS 프로젝트 생성 · 번들 동기화
#    4) Info.plist에 백그라운드 오디오(잠금 후에도 재생) + 위치 사용 문구 추가
#    5) Xcode 열기  → Team에 본인 Apple ID 선택 → 아이폰 연결 → ▶ Run
#
#  준비물: macOS, Xcode(App Store), Node.js 18+ (https://nodejs.org)
#  실행:   리포 루트에서   bash radio/store/src/build-personal-ios-mac.sh
# ============================================================================
set -euo pipefail

cd "$(cd "$(dirname "$0")/../../.." && pwd)"   # 리포 루트로 이동
echo "▶ 리포 루트: $(pwd)"

# --- 0) 준비물 확인 ---------------------------------------------------------
command -v node >/dev/null 2>&1 || { echo "✖ Node.js가 없습니다. https://nodejs.org 에서 LTS 설치 후 다시 실행하세요."; exit 1; }
command -v xcodebuild >/dev/null 2>&1 || { echo "✖ Xcode가 없습니다. App Store에서 Xcode 설치 후 한 번 실행해 약관 동의하고 다시 실행하세요."; exit 1; }
if ! xcode-select -p >/dev/null 2>&1; then
  echo "✖ Xcode 커맨드라인 도구가 설정되지 않았습니다. 실행:  sudo xcode-select -s /Applications/Xcode.app"; exit 1
fi
echo "✔ Node $(node -v) · Xcode $(xcodebuild -version | head -1)"

# --- 1) 최신 소스 ------------------------------------------------------------
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git pull --ff-only || echo "⚠ git pull 실패(로컬 변경 있음?) — 현재 소스로 계속합니다."
fi

# --- 2) 웹 번들 --------------------------------------------------------------
node radio/store/src/build-personal-app.js

# --- 3) Capacitor iOS --------------------------------------------------------
[ -f package.json ] || npm init -y >/dev/null
npm install --no-audit --no-fund --save-dev @capacitor/core@latest @capacitor/cli@latest @capacitor/ios@latest
[ -d ios ] || npx cap add ios
npx cap sync ios

# --- 4) Info.plist: 백그라운드 오디오 + 위치 문구 -----------------------------
PLIST="ios/App/App/Info.plist"
PB=/usr/libexec/PlistBuddy
if [ -f "$PLIST" ]; then
  # 잠금/백그라운드에서도 재생이 이어지려면 필수
  if ! $PB -c "Print :UIBackgroundModes" "$PLIST" >/dev/null 2>&1; then
    $PB -c "Add :UIBackgroundModes array" "$PLIST"
  fi
  if ! $PB -c "Print :UIBackgroundModes" "$PLIST" 2>/dev/null | grep -q "audio"; then
    $PB -c "Add :UIBackgroundModes:0 string audio" "$PLIST"
  fi
  # 제주시↔서귀포 자동 전환용 위치 권한 문구
  if ! $PB -c "Print :NSLocationWhenInUseUsageDescription" "$PLIST" >/dev/null 2>&1; then
    $PB -c "Add :NSLocationWhenInUseUsageDescription string 제주시·서귀포 이동 시 주파수를 자동으로 고르기 위해 위치를 사용합니다." "$PLIST"
  fi
  echo "✔ Info.plist: UIBackgroundModes=audio, 위치 문구 설정"
else
  echo "⚠ $PLIST 를 찾지 못했습니다. Xcode에서 Signing & Capabilities → + Capability → Background Modes → Audio 를 직접 켜 주세요."
fi

# --- 5) Xcode ----------------------------------------------------------------
npx cap open ios
cat <<'EOF'

✅ 준비 끝. Xcode에서:
  1. 왼쪽 트리 맨 위 'App' 클릭 → 가운데 'Signing & Capabilities' 탭
  2. 'Team'에서 본인 Apple ID 선택 (없으면 'Add an Account…')
  3. 아이폰을 USB로 연결(또는 같은 Wi-Fi) → 상단 기기 목록에서 내 아이폰 선택
  4. ▶ Run  → 아이폰 설정 > 일반 > VPN 및 기기 관리에서 개발자 앱 '신뢰' 한 번

📌 참고
  - 무료 Apple ID 서명은 7일마다 다시 Run 해야 합니다(유료 개발자 계정은 1년).
  - 코드가 바뀌면:  node radio/store/src/build-personal-app.js && npx cap sync ios  후 Xcode ▶ Run
  - ios/ 폴더와 package.json 변경은 커밋하지 않아도 됩니다(개인 빌드 산출물).
EOF
