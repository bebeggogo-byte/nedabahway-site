# DEPLOYMENT — Vercel 배포 절차

## 사전 조건

- [ ] Supabase 프로젝트 생성 완료 + 키 4개 회전됨
- [ ] 도메인 결정 (예: `nedabahway.com`, 서브도메인 `app.nedabahway.com`)
- [ ] 사장님 GitHub 계정으로 Vercel 가입 (vercel.com)
- [ ] Vercel CLI 설치: `npm i -g vercel`

---

## Step 1 — Vercel 프로젝트 생성

### 옵션 A: 웹 콘솔 (권장)

1. https://vercel.com/new 접속
2. **Import Git Repository** → `bebeggogo-byte/nedabahway-site` 선택
3. 다음 설정:
   - **Project Name**: `nedabah-app`
   - **Framework Preset**: `Next.js` (자동 감지)
   - **Root Directory**: `app` ← **중요**
   - **Build Command**: `pnpm build` (자동)
   - **Output Directory**: `.next` (자동)
   - **Install Command**: `pnpm install --no-frozen-lockfile`
4. **Environment Variables** 섹션은 일단 비워두고 **Deploy** 클릭
5. 첫 빌드는 환경변수 누락으로 실패 — 정상

### 옵션 B: CLI

```bash
cd ~/Desktop/nedabah/app
vercel link  # 프로젝트 선택 또는 생성
```

---

## Step 2 — 환경변수 등록 (vercel-env-sync.sh)

`.env.local` 파일이 채워진 상태에서:

```bash
cd ~/Desktop/nedabah/app
chmod +x scripts/vercel-env-sync.sh   # 최초 1회
./scripts/vercel-env-sync.sh
```

**자동 등록되는 14개 키:**

클라이언트 (브라우저 노출):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_TOSS_CLIENT_KEY`
- `NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED`
- `NEXT_PUBLIC_OAUTH_KAKAO_ENABLED`

서버 (Vercel Functions에서만 사용):
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `TOSS_SECRET_KEY`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `VOYAGE_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

검증:
```bash
vercel env ls
```

또는 Vercel 콘솔: Settings → Environment Variables.

---

## Step 3 — `NEXT_PUBLIC_SITE_URL` 운영용으로 변경

`.env.local`은 `http://localhost:3000`으로 둠 (로컬 개발용).
Vercel Production만 별도 값으로 덮어쓰기:

```bash
echo "https://app.nedabahway.com" | vercel env add NEXT_PUBLIC_SITE_URL production --force
```

또는 콘솔에서 해당 키만 production 환경값을 수정.

---

## Step 4 — 첫 배포

```bash
vercel --prod
```

또는 GitHub `main` 브랜치에 push (자동 배포 트리거).

빌드 로그에서:
- Build succeeded
- Deployment URL 발급 (`*.vercel.app`)

---

## Step 5 — 도메인 연결

1. Vercel 콘솔 → Settings → Domains
2. **Add Domain** → `app.nedabahway.com` 입력
3. Vercel이 안내하는 DNS 레코드를 도메인 등록업체(가비아·후이즈)에 추가:
   - `app` (CNAME) → `cname.vercel-dns.com`
4. DNS 전파 후 SSL 자동 발급 (~10분)

---

## Step 6 — 배포 검증 체크리스트

배포 직후 5분 안에 점검:

```bash
# 1) 헬스체크 200 응답
curl https://app.nedabahway.com/api/health
# 출력: {"ok":true,"db":"ok",...}

# 2) 메인 페이지 SSR
curl -I https://app.nedabahway.com/
# 200 OK + Strict-Transport-Security 헤더

# 3) 보안 헤더 확인
curl -I https://app.nedabahway.com/ | grep -i "x-frame\|x-content\|strict-transport"
```

브라우저:
- https://app.nedabahway.com/ → 5트랙 카드 + 헤더(로그인) 표시
- https://app.nedabahway.com/login → 로그인 폼
- https://app.nedabahway.com/terms · /privacy · /business-info → 약관 페이지
- 푸터에 사업자정보 + 약관 4종 링크 모두 클릭 가능

---

## 롤백 절차

문제 발생 시 1초 안에 이전 배포로 전환:

1. Vercel 콘솔 → Deployments → 정상 동작했던 직전 배포 선택
2. **··· (메뉴) → Promote to Production** 클릭
3. 즉시 트래픽 전환

---

## 모니터링 설정 (별도 SPEC, 권장)

### UptimeRobot (무료)
- https://uptimerobot.com 가입
- New Monitor → HTTP(s) → URL: `https://app.nedabahway.com/api/health`
- Interval: 5분
- 다운 시 사장님 메일·SMS 알림

### Vercel Analytics (무료)
- 콘솔 → Analytics → Enable
- Web Vitals · 페이지뷰 자동 수집

### Sentry (옵션)
- 별도 SPEC에서 처리 (SPEC-MONITORING-001 예정)

---

## 트러블슈팅

| 증상 | 원인 | 대응 |
|------|------|------|
| 빌드 실패 — `module not found` | pnpm-lock.yaml 누락 | `cd app && pnpm install` 후 재배포 |
| 빌드 성공, 런타임 500 | 환경변수 누락 | `vercel env ls`로 확인, 누락분 등록 후 redeploy |
| `/api/health` → 503 | DB URL 오타 또는 비번 인코딩 문제 | `.env.local`에서 SUPABASE_DB_URL 점검 |
| 정적 사이트도 함께 빌드됨 | `.vercelignore` 누락 | 루트 `.vercelignore` 확인 |
| 도메인 연결 안 됨 | DNS 미전파 | `dig app.nedabahway.com` → CNAME 확인. 24h 대기 |
| 주말 배포 후 에러 | 코드 문제 | 즉시 롤백 (위 절차) |

---

## 비용 가이드 (Vercel Hobby vs Pro)

**Hobby (무료)**:
- 100GB 대역폭/월
- 1000 분 빌드/월
- Vercel Functions 100시간/월
- **결제 가능 사이트로 사용 시 ToS 위반** — 1기 모집 시작 시 Pro 필수

**Pro ($20/월)**:
- 1TB 대역폭
- 6000 분 빌드
- Functions 1000시간
- 상업 사용 가능
- 팀 접근 권한

1기 모집 시작 직전 Pro 업그레이드 권장.
