#!/usr/bin/env bash
# ============================================================================
#  클래식FM 개인용 안드로이드 앱(APK) — 맥에서 한 번만 실행하는 스크립트
#
#  ⚠️ 개인 사용 전용. KBS 클래식FM을 공개 프록시로 수신(재송신)하므로
#     본인 기기에서 본인만 쓰세요. APK를 남에게 보내거나 스토어에 올리지 마세요.
#
#  하는 일:
#    1) 리포를 최신으로 (git pull)
#    2) Capacitor(안드로이드) + 미디어 세션 플러그인 설치
#       → 잠금화면·이어폰 제어 + 백그라운드 재생(포그라운드 서비스)
#    3) 풀기능 라디오 웹 번들 생성 (플러그인 포함)  → radio/.appdist/
#    4) 안드로이드 프로젝트 생성·동기화, 위치 권한 추가
#    5) Gradle로 APK 빌드  → android/app/build/outputs/apk/debug/app-debug.apk
#    6) 폰이 USB로 연결돼 있으면 바로 설치(adb), 아니면 옮겨서 설치하는 법 안내
#
#  준비물: macOS, Android Studio(https://developer.android.com/studio — 설치 후 한 번
#          실행해 SDK 받기), Node.js 18+ (https://nodejs.org)
#  실행:   리포 루트에서   bash radio/store/src/build-personal-android-mac.sh
# ============================================================================
set -euo pipefail

cd "$(cd "$(dirname "$0")/../../.." && pwd)"   # 리포 루트로 이동
echo "▶ 리포 루트: $(pwd)"

# --- 0) 준비물 --------------------------------------------------------------
command -v node >/dev/null 2>&1 || { echo "✖ Node.js가 없습니다. https://nodejs.org 에서 LTS 설치 후 다시 실행하세요."; exit 1; }

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
if [ ! -d "$SDK/platforms" ]; then
  echo "✖ Android SDK를 찾지 못했습니다: $SDK"
  echo "   Android Studio를 설치하고 한 번 실행해 SDK를 받은 뒤(기본 위치 ~/Library/Android/sdk) 다시 실행하세요."
  echo "   다른 위치면:  ANDROID_HOME=/경로/sdk bash $0"
  exit 1
fi
export ANDROID_HOME="$SDK"
# Gradle(AGP 8)은 JDK 17+ 필요 → Android Studio에 포함된 JDK를 우선 사용
if [ -z "${JAVA_HOME:-}" ] || ! "$JAVA_HOME/bin/java" -version 2>&1 | grep -qE 'version "(1[7-9]|2[0-9])'; then
  for J in "/Applications/Android Studio.app/Contents/jbr/Contents/Home" "$(/usr/libexec/java_home -v 17 2>/dev/null || true)"; do
    if [ -n "$J" ] && [ -x "$J/bin/java" ]; then export JAVA_HOME="$J"; break; fi
  done
fi
[ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ] || { echo "✖ JDK 17+가 필요합니다. Android Studio를 설치하면 함께 들어옵니다."; exit 1; }
echo "✔ Node $(node -v) · SDK $SDK · JAVA_HOME $JAVA_HOME"

# --- 1) 최신 소스 ------------------------------------------------------------
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git pull --ff-only || echo "⚠ git pull 실패(로컬 변경 있음?) — 현재 소스로 계속합니다."
fi

# --- 2) Capacitor + 미디어 세션 플러그인 --------------------------------------
npm install --no-audit --no-fund @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6 @jofr/capacitor-media-session@4

# --- 3) 웹 번들 (플러그인 스크립트 포함) --------------------------------------
node radio/store/src/build-personal-app.js
grep -q 'vendor/media-session.js' radio/.appdist/index.html || { echo "✖ 번들에 미디어 세션 플러그인이 포함되지 않았습니다."; exit 1; }

# --- 4) 안드로이드 프로젝트 ---------------------------------------------------
[ -d android ] || npx cap add android
npx cap sync android
MANIFEST="android/app/src/main/AndroidManifest.xml"
if ! grep -q 'ACCESS_FINE_LOCATION' "$MANIFEST"; then
  # 제주시↔서귀포 자동 전환용 위치 권한 (INTERNET 권한은 Capacitor 기본 포함)
  perl -0pi -e 's#</manifest>#    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />\n</manifest>#' "$MANIFEST"
  echo "✔ AndroidManifest: 위치 권한 추가"
fi
if ! grep -q 'FOREGROUND_SERVICE_MEDIA_PLAYBACK' "$MANIFEST"; then
  # 안드로이드 14+(targetSdk 34): 미디어 재생 포그라운드 서비스를 시작하려면 이 타입 권한이
  # 매니페스트에 있어야 함(없으면 재생 시작 시 SecurityException으로 앱 종료).
  # 플러그인(@jofr/capacitor-media-session 4.0.0) 매니페스트에는 FOREGROUND_SERVICE만 있어 앱에서 보강.
  perl -0pi -e 's#</manifest>#    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />\n</manifest>#' "$MANIFEST"
  echo "✔ AndroidManifest: 미디어 재생 포그라운드 서비스 권한 추가 (안드로이드 14+)"
fi
printf 'sdk.dir=%s\n' "$SDK" > android/local.properties

# --- 5) APK 빌드 -------------------------------------------------------------
( cd android && ./gradlew assembleDebug --no-daemon )
APK="$(pwd)/android/app/build/outputs/apk/debug/app-debug.apk"
[ -f "$APK" ] || { echo "✖ APK가 생성되지 않았습니다."; exit 1; }
echo
echo "✅ APK 완성: $APK"

# --- 6) 설치 -----------------------------------------------------------------
ADB="$SDK/platform-tools/adb"
if [ -x "$ADB" ] && "$ADB" devices 2>/dev/null | grep -qE '^[A-Za-z0-9.:_-]+\s+device$'; then
  echo "▶ 연결된 폰에 설치합니다…"
  "$ADB" install -r "$APK" && echo "✅ 설치 완료 — 폰 앱 목록에서 '클래식FM'을 여세요."
else
  cat <<EOF

📱 폰에 설치하는 법 (USB 연결이 없을 때)
  1. 위 APK 파일을 폰으로 옮깁니다 — 카카오톡 '나에게 보내기', Google Drive, 또는 USB(Android File Transfer)
  2. 폰에서 파일을 탭 → "출처를 알 수 없는 앱 허용"을 한 번 켜고 → 설치
  3. 앱 목록/홈 화면의 '클래식FM'을 실행 → 첫 실행 시 위치 권한 '앱 사용 중에만 허용'

📌 참고
  - 코드가 바뀌면:  node radio/store/src/build-personal-app.js && npx cap sync android && (cd android && ./gradlew assembleDebug)
  - android/ 폴더와 package-lock 변경은 커밋하지 않아도 됩니다(개인 빌드 산출물).
  - USB로 연결하고 폰의 '개발자 옵션 > USB 디버깅'을 켜면 다음부터는 이 스크립트가 바로 설치합니다.
EOF
fi
