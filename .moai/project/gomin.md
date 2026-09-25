# 방구석고민, 바닷가코칭 — 고민 포스트잇 벽 운영 안내

공개 페이지: `/gomin/`(소개 + 상시 벽), `/gomin/new/`(현장용 보드 만들기), `/gomin/b/?c=코드`(보드), `/gomin/b/?c=코드&screen=1`(큰 화면용).
데이터는 Supabase(무료 플랜)에 저장되고, 사이트는 anon 키로 REST를 직접 호출합니다. 라이브러리 없이 `assets/gomin.js` 하나입니다.

## 처음 한 번: Supabase 연결

1. supabase.com 에 가입하고 New project 를 만듭니다(지역은 Northeast Asia(Seoul) 권장, DB 비밀번호는 보관).
2. 왼쪽 메뉴 SQL Editor → New query → `supabase/gomin-schema.sql` 파일 내용 전체를 붙여 넣고 Run.
   - 테이블 4개(boards, board_secrets, notes, hearts), 함수 7개, 상시 벽 보드(코드 MAIN)가 만들어집니다.
   - 다시 실행해도 안전합니다.
3. Project Settings → API 에서 **Project URL** 과 **anon public** 키를 복사합니다.
4. `assets/gomin-config.js` 의 `url` 과 `key` 에 넣고 커밋합니다. anon 키는 브라우저에 공개되는 키이며, 보호는 SQL 파일의 행 수준 보안(RLS)이 맡습니다.

## 동작 규칙

- 누구나 메모를 붙일 수 있습니다(2~200자, 닉네임 20자 선택). 같은 기기에서 15초 안에 연속 게시는 막힙니다.
- 하트는 기기당 메모 1회(다시 누르면 취소). 기기 식별자는 브라우저 localStorage 의 무작위 값이라 같은 사람이 다른 기기나 시크릿 창에서 누르면 막지 못합니다.
- 정렬은 하트 많은 순, 같으면 최신순. 상위 3개는 TOP 배지.
- 운영자 PIN 은 bcrypt 해시로만 저장됩니다. 잊으면 되찾을 수 없고, Supabase 대시보드에서 `board_secrets` 행을 지우고 새 보드를 만들면 됩니다.
- 보드를 닫으면(운영자 모드 → 보드 닫기) 새 메모를 받지 않고 하트만 됩니다.

## 현장에서

1. `/gomin/new/` 에서 주제·장소·대상·PIN 을 적고 만들기 → 4글자 코드와 QR.
2. 큰 화면용 보기를 프로젝터에 띄웁니다(헤더·폼 없이 QR·코드·메모만, 5초마다 갱신).
3. 참여자는 QR 또는 `/gomin/b/` 에서 코드 입력.
4. 끝나면 보드 페이지 → 운영자 → PIN → CSV 내보내기(숨긴 메모 포함, 하트순).

## 상시 벽 관리

- `/gomin/` 의 벽은 코드 `MAIN` 보드입니다. 운영자 모드는 `/gomin/b/?c=MAIN` 에서 PIN 으로 들어갑니다.
- MAIN 보드의 PIN 은 SQL 로 한 번 넣어야 합니다(SQL Editor):
  `insert into public.board_secrets (board_id, pin_hash) select id, crypt('원하는PIN', gen_salt('bf')) from public.boards where code='MAIN' on conflict (board_id) do update set pin_hash = excluded.pin_hash;`

## 한계

- 서버 없는 사이트라 anon 키로 할 수 있는 일은 SQL 의 정책·함수가 허용한 것뿐입니다. 정책을 바꿀 때는 `supabase/gomin-schema.sql` 을 고치고 다시 Run.
- 무료 플랜은 프로젝트가 1주일 이상 요청이 없으면 일시 정지될 수 있습니다. 대시보드에서 Restore 하면 됩니다.
- 개인정보: 메모는 공개됩니다. 소개 문구에 실명·연락처를 적지 말라고 안내하고, 운영자가 숨기기로 관리합니다.
