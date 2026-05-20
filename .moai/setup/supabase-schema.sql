-- nedabahway-site Supabase schema
-- Run this entire file in Supabase Dashboard → SQL Editor → New query
-- 한 번에 전체를 실행하면 됩니다.

-- =====================================================================
-- 1. Tables
-- =====================================================================

-- 사역/강의/코칭 세션 기록
create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  photo_url    text,
  tags         text[] default '{}',
  location     text,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists sessions_started_at_idx
  on public.sessions (started_at desc);

-- 추천글 (QR 폼으로 들어옴, 본인 승인 후 공개)
create table if not exists public.testimonials (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid references public.sessions(id) on delete set null,
  name         text not null,
  role         text,
  content      text not null,
  status       text not null default 'pending'
               check (status in ('pending','approved','rejected')),
  created_at   timestamptz not null default now(),
  approved_at  timestamptz
);
create index if not exists testimonials_status_idx
  on public.testimonials (status, created_at desc);

-- 소개 페이지의 코칭/강의 전문성 블록 (선택적)
create table if not exists public.bio_blocks (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('coaching','teaching')),
  title      text not null,
  body       text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 2. Row Level Security
-- =====================================================================

alter table public.sessions      enable row level security;
alter table public.testimonials  enable row level security;
alter table public.bio_blocks    enable row level security;

-- sessions: 누구나 읽기, 인증된 사용자(=본인)만 쓰기
drop policy if exists sessions_select_public on public.sessions;
create policy sessions_select_public
  on public.sessions for select
  using (true);

drop policy if exists sessions_write_auth on public.sessions;
create policy sessions_write_auth
  on public.sessions for all
  to authenticated
  using (true)
  with check (true);

-- testimonials: 누구나 pending 으로 insert 가능, 읽기는 approved 만 공개
drop policy if exists testimonials_insert_anyone on public.testimonials;
create policy testimonials_insert_anyone
  on public.testimonials for insert
  to anon, authenticated
  with check (status = 'pending');

drop policy if exists testimonials_select_approved on public.testimonials;
create policy testimonials_select_approved
  on public.testimonials for select
  using (status = 'approved');

drop policy if exists testimonials_admin_all on public.testimonials;
create policy testimonials_admin_all
  on public.testimonials for all
  to authenticated
  using (true)
  with check (true);

-- bio_blocks: 누구나 읽기, 인증된 사용자만 쓰기
drop policy if exists bio_select_public on public.bio_blocks;
create policy bio_select_public
  on public.bio_blocks for select
  using (true);

drop policy if exists bio_write_auth on public.bio_blocks;
create policy bio_write_auth
  on public.bio_blocks for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================================
-- 3. Storage bucket
-- =====================================================================

-- Run this in Storage → Create new bucket, OR via SQL:
insert into storage.buckets (id, name, public)
values ('session-photos', 'session-photos', true)
on conflict (id) do update set public = true;

-- Storage policies: 공개 읽기, 인증된 사용자만 업로드
drop policy if exists "photos public read" on storage.objects;
create policy "photos public read"
  on storage.objects for select
  using (bucket_id = 'session-photos');

drop policy if exists "photos auth write" on storage.objects;
create policy "photos auth write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'session-photos');

drop policy if exists "photos auth update" on storage.objects;
create policy "photos auth update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'session-photos');

drop policy if exists "photos auth delete" on storage.objects;
create policy "photos auth delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'session-photos');

-- =====================================================================
-- 4. Realtime
-- =====================================================================

alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.testimonials;
