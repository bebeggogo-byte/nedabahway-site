# 사장님 5분 부팅 가이드 (그림으로)

> 사장님 컴퓨터에서 **딱 한 번만** 하면 끝납니다.
> 명령어는 그대로 복사해서 붙여넣기 하시면 됩니다.

---

## 0단계 — 도구 3개 깔려 있는지 확인

### 0-1. Node.js (필수)

터미널 열고:
```bash
node -v
```

`v20.x.x` 또는 `v22.x.x` 보이면 OK.
없으면 → https://nodejs.org → "LTS" 버튼 다운로드 → 설치.

### 0-2. pnpm (있으면 좋음, 없어도 setup.sh가 자동 설치)

```bash
pnpm -v
```

### 0-3. Supabase CLI (있으면 좋음, 없어도 setup.sh가 자동 설치)

```bash
supabase --version
```

---

## 1단계 — 코드 받기

터미널에서:

```bash
# Desktop 또는 원하는 폴더로 이동
cd ~/Desktop

# repo 클론
git clone https://github.com/bebeggogo-byte/nedabahway-site.git
cd nedabahway-site/app
```

또는 이미 클론돼 있으면:
```bash
cd ~/Desktop/nedabahway-site
git fetch origin
git checkout claude/saas-app-baseline    # PR #55 브랜치
git pull
cd app
```

---

## 2단계 — DB 비밀번호 1개만 가져오기

이게 사장님이 직접 해야 할 **유일한** 작업입니다.

### 2-1. 브라우저에서 이 링크 열기

👉 https://supabase.com/dashboard/project/wdxzndgbowigicbjsnbi/settings/database

### 2-2. 페이지 중간 "Connection string" 카드 찾기

아래처럼 보입니다:

```
┌──────────────────────────────────────────────┐
│  Connection string                           │
│  ┌──────────────────────────────────┐        │
│  │ URI                              │        │
│  └──────────────────────────────────┘        │
│  ☑ Use connection pooling                    │
│                                              │
│  postgresql://postgres.wdxzn..............   │
│  [복사 버튼]                                  │
└──────────────────────────────────────────────┘
```

### 2-3. 다음 두 가지 확인:
1. **"URI"** 탭 선택 (psql 아니라 URI)
2. **"Use connection pooling"** 토글 ON ✅

### 2-4. 복사 버튼 누르고 메모장에 붙여넣기

붙여넣은 문자열은 이런 모양입니다:
```
postgresql://postgres.wdxzndgbowigicbjsnbi:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
```

**`[YOUR-PASSWORD]`** 가 바로 사장님 DB 비밀번호 자리입니다.

### 2-5. 비밀번호 모르면 재설정

기억 안 나시면:
- 같은 페이지 위쪽 "Database password" 섹션 → "Reset database password" 버튼
- 새 비번 받아서 메모

---

## 3단계 — setup.sh 한 줄로 끝

터미널에서 (지금 `app/` 폴더에 있어야 함):

```bash
./setup.sh
```

처음 실행하면:
1. 도구 자동 설치 (pnpm·supabase CLI)
2. `.env.local` 자동 생성 (사장님 키 이미 박혀 있음)
3. **"비밀번호 입력하세요"** 안내가 뜸

이 때:
- 다른 창에서 `app/.env.local` 파일 열기 (메모장·VSCode 아무거나)
- `[YOUR-PASSWORD]` 글자를 찾아서 → 위 2단계에서 메모한 **실제 DB 비밀번호**로 바꿔서 저장
- 터미널로 돌아와 엔터

그 다음은 자동:
- pnpm 의존성 설치 (1~2분)
- DB 마이그레이션 적용 (23개 테이블 + RLS 정책 자동 생성)
- seed.sql 적용 (5트랙·세션·할인코드)
- 테스트 계정 4명 자동 생성
- 개발 서버 시작 → 브라우저 자동 열림

---

## 4단계 — http://localhost:3000 에서 확인

브라우저 자동으로 열림. 안 열리면 직접 주소창에 입력.

랜딩 페이지에 5트랙 카드 보이면 **셋업 완료**.

### 테스트 로그인 (비번 공통: `nedabah1!`)

| 이메일 | 보이는 화면 |
|--------|----|
| `[email protected]` | 코치 대시보드 + 학생 명단 + 환불 요청 처리 |
| `[email protected]` | 학생 — 25h 전 결제 → 환불 미리보기 50% |
| `[email protected]` | 학생 — 2h 전 결제 → 환불 미리보기 100% |
| `[email protected]` | IDEN 교사 + 분석 페이지 + 학교/반/학생 |

### 환불 흐름 시나리오

1. `student.pivot@`로 로그인 → `/dashboard` → "내 등록" → "관리"
2. "환불 신청" 버튼 → 100% 미리보기 확인 → 사유 적고 신청
3. 로그아웃 → `coach@`로 로그인 → `/coach/refunds`
4. "검토 대기" 카드 보임 → "승인 + 환불" 클릭
5. mock 토스 환불 처리됨 → 학생 `/refunds`에서 "완료" 확인

---

## 문제 생기면 (자주 있는 4가지)

### "permission denied: ./setup.sh"

```bash
chmod +x setup.sh
./setup.sh
```

### "command not found: supabase"

```bash
npm i -g supabase
./setup.sh
```

### 마이그레이션 실패 (DB URL 잘못 입력)

```bash
# .env.local 다시 열어서 SUPABASE_DB_URL 확인
# pooled URL인지 (포트 6543), 비번 자리 안에 [YOUR-PASSWORD] 안 남아있는지
nano .env.local
./setup.sh
```

### 테이블 충돌 (이미 일부 만들어졌다면)

```bash
# Supabase Studio → SQL Editor 에서 한 번 리셋
# https://supabase.com/dashboard/project/wdxzndgbowigicbjsnbi/sql/new
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

# 그리고 다시
./setup.sh
```

---

## 작업 끝나면 ⚠️ **꼭** 키 회전 (보안)

지금 채팅창에 `sb_secret_*` 키가 노출됐습니다. **작업 끝나는 즉시**:

1. https://supabase.com/dashboard/project/wdxzndgbowigicbjsnbi/settings/api
2. "Reveal new key" 또는 "Roll secret key" 버튼
3. 새 키 받아서 사장님 컴퓨터의 `app/.env.local` 만 갱신
4. 코드는 안 건드려도 됨

DB 비번도 같이 갱신하면 더 안전합니다.

**키는 코드(setup.sh·README·뭐든)에 절대 박지 마세요** — 공개 GitHub 레포라 즉시 노출됩니다. `.env.local`은 `.gitignore`에 있어 안전합니다.

---

## 한 줄 요약

```bash
cd app && ./setup.sh
```

DB 비번 한 번 붙여넣으면 끝.
