-- ============================================================================
-- 쇼츠 학교 소개 투표 — Supabase 스키마
-- Supabase Dashboard → SQL Editor → New query 에 전체를 붙여넣고 Run 하세요.
-- 결과에 "Success. No rows returned" 가 나오면 완료입니다.
--
-- 핵심 보안 규칙:
--   - 누구나(익명) 투표(INSERT)는 가능
--   - 결과 조회(SELECT)는 로그인한 관리자만 가능  ← "관리자만 현황을 본다"
--   - 한 기기(voter_uuid)당 1표만 허용 (UNIQUE 제약)
-- ============================================================================

-- 1. 투표 테이블 -------------------------------------------------------------
create table if not exists public.shorts_votes (
  id            uuid primary key default gen_random_uuid(),
  voter_uuid    text not null unique,             -- 기기별 1표 보장 (localStorage UUID)
  voter_school  text,                             -- 투표자 소속 학교 (참여율 집계용, 선택)
  choices       text[] not null,                  -- 선택한 학교들 (최대 3곳, 각 1점)
  created_at    timestamptz not null default now(),
  constraint choices_len check (
    array_length(choices, 1) between 1 and 3      -- 1~3곳 선택 강제
  )
);

create index if not exists shorts_votes_created_at_idx
  on public.shorts_votes (created_at desc);

-- 2. Row Level Security ------------------------------------------------------
alter table public.shorts_votes enable row level security;

-- (a) 익명 투표 허용: INSERT 만, 규칙에 맞을 때만
drop policy if exists shorts_votes_insert_anon on public.shorts_votes;
create policy shorts_votes_insert_anon
  on public.shorts_votes for insert
  to anon, authenticated
  with check (
    array_length(choices, 1) between 1 and 3
  );

-- (b) 결과 조회는 로그인한 관리자만 (익명은 SELECT 불가)
drop policy if exists shorts_votes_select_admin on public.shorts_votes;
create policy shorts_votes_select_admin
  on public.shorts_votes for select
  to authenticated
  using (true);

-- (c) 관리자만 초기화(삭제) 가능
drop policy if exists shorts_votes_delete_admin on public.shorts_votes;
create policy shorts_votes_delete_admin
  on public.shorts_votes for delete
  to authenticated
  using (true);

-- 참고: anon 에게는 SELECT/UPDATE/DELETE 정책이 없으므로 자동으로 거부됩니다.
--       투표자는 자기 표조차 다시 읽을 수 없어(설계 의도) 결과가 새어나가지 않습니다.

-- 3. 실시간(Realtime) — 관리자 화면 자동 갱신 --------------------------------
alter publication supabase_realtime add table public.shorts_votes;

-- ============================================================================
-- 초기화(재사용 시): 아래 한 줄만 SQL Editor 에서 실행하면 모든 표가 지워집니다.
--   truncate table public.shorts_votes;
-- 관리자 화면의 "전체 초기화" 버튼으로도 가능합니다.
-- ============================================================================
