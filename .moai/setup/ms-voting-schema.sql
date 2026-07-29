-- 중등부(전도학생회장단 1차/2차) — 학교 소개 투표 + 발표 점수
-- Supabase SQL Editor 에 전체 붙여넣고 RUN (한 번만). round 컬럼으로 1차/2차 분리.

-- 1) 학교 소개 투표 -----------------------------------------------------------
create table if not exists public.school_votes (
  id           uuid primary key default gen_random_uuid(),
  round        text not null,            -- 'm1'(1차) | 'm2'(2차)
  voter_uuid   text not null,
  voter_school text,
  choices      text[] not null,
  created_at   timestamptz not null default now(),
  unique (round, voter_uuid),
  constraint sv_choices_len check (array_length(choices,1) between 1 and 3)
);
alter table public.school_votes enable row level security;
drop policy if exists sv_insert on public.school_votes;
create policy sv_insert on public.school_votes for insert to anon, authenticated
  with check (array_length(choices,1) between 1 and 3);
drop policy if exists sv_read on public.school_votes;
create policy sv_read on public.school_votes for select to anon, authenticated using (true);
drop policy if exists sv_delete on public.school_votes;
create policy sv_delete on public.school_votes for delete to anon, authenticated using (true);
do $$ begin alter publication supabase_realtime add table public.school_votes;
exception when duplicate_object then null; end $$;

-- 2) 발표 점수 (6항목) --------------------------------------------------------
create table if not exists public.ms_scores (
  id          uuid primary key default gen_random_uuid(),
  round       text not null,             -- 'm1' | 'm2'
  judge_uuid  text not null,
  judge_role  text not null,             -- 'student' | 'teacher'
  judge_name  text,                      -- 선생님 이름(학생 null), 결과 비공개
  judge_team  text,
  team        text not null,
  s_problem   int check (s_problem  between 1 and 10),
  s_status    int check (s_status   between 1 and 10),
  s_idea      int check (s_idea     between 1 and 10),
  s_plan      int check (s_plan     between 1 and 10),
  s_present   int check (s_present  between 1 and 10),
  s_attitude  int check (s_attitude between 1 and 10),
  updated_at  timestamptz not null default now(),
  unique (round, judge_uuid, team)
);
alter table public.ms_scores enable row level security;
drop policy if exists ms_insert on public.ms_scores;
create policy ms_insert on public.ms_scores for insert to anon, authenticated with check (true);
drop policy if exists ms_update on public.ms_scores;
create policy ms_update on public.ms_scores for update to anon, authenticated using (true) with check (true);
drop policy if exists ms_read on public.ms_scores;
create policy ms_read on public.ms_scores for select to anon, authenticated using (true);
drop policy if exists ms_delete on public.ms_scores;
create policy ms_delete on public.ms_scores for delete to anon, authenticated using (true);
do $$ begin alter publication supabase_realtime add table public.ms_scores;
exception when duplicate_object then null; end $$;

-- 초기화 예시 (필요 시):
--   delete from public.school_votes where round = 'm1';         -- 1차 투표만
--   delete from public.ms_scores    where round = 'm2';         -- 2차 채점만
--   delete from public.ms_scores    where round='m1' and team='3조';  -- 특정 조만
