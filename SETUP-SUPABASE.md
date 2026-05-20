# Supabase 세팅 가이드 (5분)

사역앨범·추천글·코칭기록 자동화를 위한 백엔드 세팅.

## 1. 프로젝트 만들기

1. https://supabase.com 에서 GitHub 계정으로 로그인
2. **New project** 클릭
   - **Name**: `nedabahway` (자유)
   - **Database Password**: 강력한 비밀번호 (저장 필수)
   - **Region**: `Northeast Asia (Seoul)`
   - **Pricing Plan**: Free
3. 프로젝트 생성 완료까지 약 2분

## 2. 스키마 적용

1. 좌측 메뉴 **SQL Editor → New query**
2. `.moai/setup/supabase-schema.sql` 전체를 복사해서 붙여넣기
3. **Run** 클릭 (오른쪽 아래 녹색 버튼)
4. 결과창에 `Success. No rows returned` 가 나오면 완료

## 3. 본인 계정(관리자) 만들기

`studio.html`(기록)과 `admin.html`(추천글 승인)에 접근하려면 인증된 계정이 필요합니다.

1. 좌측 메뉴 **Authentication → Users → Add user → Create new user**
2. **Email**: 본인 이메일 (예: nedabah.way@gmail.com)
3. **Password**: 강력한 비밀번호
4. **Auto Confirm User**: 체크
5. **Create user**

> 추가로 다른 사람이 가입하지 못하게 막으려면 **Authentication → Providers → Email** 에서 `Confirm email` 만 켜고, 다른 회원가입 옵션은 모두 꺼두세요. 본인은 위에서 수동 생성했으므로 영향 없음.

## 4. 사이트에 키 연결

1. **Settings → API** 에서 두 값 복사:
   - `Project URL`
   - `anon public` (긴 JWT 토큰)
2. 다음 명령으로 설정 파일 생성:

```bash
cp assets/js/supabase-config.example.js assets/js/supabase-config.js
```

3. `assets/js/supabase-config.js` 열어서 두 값을 채워 넣습니다:

```js
window.__SUPABASE_URL__  = 'https://xxxxxxxx.supabase.co';
window.__SUPABASE_ANON__ = 'eyJhbGciOi...';
```

이 파일은 `.gitignore` 에 들어가 있어서 git에 올라가지 않습니다.

> ⚠️ **anon public** 키는 클라이언트에 노출되는 것이 정상입니다. RLS(Row Level Security)로 안전하게 보호됩니다.
> `service_role` 키는 절대 클라이언트에 넣지 마세요.

## 5. (선택) Vercel 자동 배포에 키 주입

Vercel에서 빌드할 때 환경변수 → HTML 주입 방식을 쓰려면:

1. Vercel 프로젝트 → Settings → Environment Variables
2. `SUPABASE_URL`, `SUPABASE_ANON_KEY` 추가
3. `vercel.json` 빌드 단계에서 `supabase-config.js` 생성 (별도 작업 필요시 안내)

당분간은 로컬에 `supabase-config.js` 만 두고 GitHub Actions로 배포할 때 secret으로 주입하는 방식을 권장합니다.

## 6. 동작 확인

1. 사이트 띄우기: `python3 -m http.server 8000`
2. http://localhost:8000/activities.html — 빈 사역앨범 페이지 보임
3. http://localhost:8000/studio.html — 로그인 화면 → 본인 계정으로 로그인 → 단축키 안내 표시

문제가 생기면 브라우저 콘솔(F12)에서 `[supabase]` 로그 확인.

---

## 백엔드 비용 (참고)

Supabase 무료 티어:
- DB: 500MB
- Storage: 1GB
- Auth: 50,000 MAU
- Realtime: 무제한

월 100개 강의 + 1000개 추천글 + 500MB 사진 기준 — 충분.
