# 내 폰 전용 앱 빌드 (개인 사용 전용)

> ⚠️ **개인 사용 전용입니다.** 이 앱은 KBS 클래식FM을 공개 프록시로 수신합니다.
> **본인 기기에서 본인만** 쓰세요. **APK를 남에게 배포하거나 스토어에 올리지 마세요** —
> 타인 배포/공개 제공은 무료여도 저작권 침해(재송신 제공)입니다.

스토어에 올리지 않고, 만든 APK를 **내 폰에만 설치(사이드로드)**하는 방법입니다.

## 준비물
- Node.js 18+ (이미 설치돼 있음)
- **Android Studio** (Android SDK 포함) + JDK 17
- USB 케이블(폰 연결) 또는 APK 파일 전송 수단

## 1) 웹 번들 만들기 (자체 완결형)
리포 루트에서:

```bash
node radio/store/src/build-personal-app.js
```

→ `radio/.appdist/` 에 `index.html + stations.json + icons/` 가 자체 완결형으로 생성됩니다.
(코드 수정 후에는 이 명령을 다시 실행)

## 2) Capacitor 설치 (최초 1회)
```bash
npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/android@latest
```
`capacitor.config.json` 은 이미 `webDir: "radio/.appdist"` 로 설정돼 있습니다.

## 3) 안드로이드 프로젝트 생성 + 동기화
```bash
npx cap add android     # 최초 1회 (android/ 폴더 생성)
npx cap sync android    # 웹 번들을 네이티브로 복사 (빌드마다 실행)
```

## 4) 위치 권한 추가
`android/app/src/main/AndroidManifest.xml` 의 `<manifest>` 안에 추가:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
```
(INTERNET 권한은 기본 포함. 앱 첫 실행 시 위치 허용을 눌러주세요.)

## 5) APK 만들어 내 폰에 설치
```bash
npx cap open android    # Android Studio 열기
```
Android Studio에서:
- 폰을 USB로 연결(개발자 옵션·USB 디버깅 켜기) 후 **Run ▶** → 폰에 바로 설치, 또는
- **Build > Build Bundle(s)/APK(s) > Build APK(s)** → 생성된 `app-debug.apk` 를 폰으로 옮겨 설치.

## 다시 빌드할 때
```bash
node radio/store/src/build-personal-app.js && npx cap sync android
```
그리고 Android Studio에서 다시 Run/Build.

## iOS(선택, macOS 필요)
```bash
npm install @capacitor/ios@latest
npx cap add ios && npx cap sync ios && npx cap open ios
```
`ios/App/App/Info.plist` 에 `NSLocationWhenInUseUsageDescription`(위치 사용 이유 문구) 추가.
Xcode에서 본인 Apple ID로 서명해 **본인 기기에만** 설치.

## 참고
- 잠금화면/백그라운드 재생 컨트롤은 MediaSession으로 동작하나, 백그라운드 지속 재생이
  끊기면 Android 포그라운드 서비스 설정이 추가로 필요할 수 있습니다(개인 사용 범위에서 선택).
- 이 앱은 **공식 배포용이 아닙니다.** 남들과 나누려면 재생을 KBS 공식 앱/웹으로 넘기는
  별도 버전이 필요합니다(재송신 없이 배포 안전).
