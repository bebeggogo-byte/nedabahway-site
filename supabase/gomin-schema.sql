-- 방구석고민, 바닷가코칭 — 고민 포스트잇 벽 스키마 (Supabase / Postgres)
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여 넣고 Run 한 번이면 끝납니다.
-- 다시 실행해도 안전하도록 IF NOT EXISTS / CREATE OR REPLACE 로 씁니다.

create extension if not exists pgcrypto;

-- 보드: 상시 벽(MAIN)과 현장용 보드
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null check (char_length(title) between 1 and 80),
  place text default '' check (char_length(place) <= 80),
  audience text default '' check (char_length(audience) <= 80),
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

-- 보드 비밀(운영자 PIN 해시). anon 은 절대 읽지 못합니다.
create table if not exists public.board_secrets (
  board_id uuid primary key references public.boards(id) on delete cascade,
  pin_hash text not null
);

-- 메모(포스트잇)
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 2 and 200),
  nick text default '' check (char_length(nick) <= 20),
  hearts integer not null default 0,
  hidden boolean not null default false,
  device_id text not null check (char_length(device_id) between 8 and 64),
  created_at timestamptz not null default now()
);
create index if not exists notes_board_idx on public.notes (board_id, hidden, hearts desc, created_at desc);

-- 하트: 같은 기기는 같은 메모에 한 번만
create table if not exists public.hearts (
  note_id uuid not null references public.notes(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  primary key (note_id, device_id)
);

-- 상시 벽
insert into public.boards (code, title, place, audience)
values ('MAIN', '방구석고민, 바닷가코칭', '온라인 · 유튜브', '누구나')
on conflict (code) do nothing;

-- ---------- 행 수준 보안 ----------
alter table public.boards enable row level security;
alter table public.board_secrets enable row level security;
alter table public.notes enable row level security;
alter table public.hearts enable row level security;

drop policy if exists boards_read on public.boards;
create policy boards_read on public.boards for select to anon, authenticated using (true);

drop policy if exists notes_read on public.notes;
create policy notes_read on public.notes for select to anon, authenticated using (hidden = false);

drop policy if exists notes_insert on public.notes;
create policy notes_insert on public.notes for insert to anon, authenticated
  with check (
    hidden = false and hearts = 0
    and exists (select 1 from public.boards b where b.id = board_id and b.is_open)
  );
-- board_secrets, hearts: 정책 없음 = anon 직접 접근 불가. 아래 함수로만 다룹니다.

-- 같은 기기에서 15초 안에 연속 게시 금지 (도배 방지)
create or replace function public.notes_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.notes n
    where n.device_id = new.device_id and n.created_at > now() - interval '15 seconds'
  ) then
    raise exception 'too_fast' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists notes_rate_limit_trg on public.notes;
create trigger notes_rate_limit_trg before insert on public.notes
  for each row execute function public.notes_rate_limit();

-- ---------- 함수 (anon 이 호출) ----------

-- 보드 만들기: 4글자 코드 자동 생성, PIN 은 해시로만 저장
create or replace function public.create_board(p_title text, p_place text, p_audience text, p_pin text)
returns table (code text, title text, place text, audience text)
language plpgsql security definer set search_path = public as $$
declare
  v_code text; v_id uuid; v_try int := 0;
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if p_pin is null or char_length(p_pin) < 4 or char_length(p_pin) > 12 then
    raise exception 'pin_length';
  end if;
  loop
    v_code := '';
    for i in 1..4 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * char_length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.boards b where b.code = v_code);
    v_try := v_try + 1;
    if v_try > 20 then raise exception 'code_exhausted'; end if;
  end loop;
  insert into public.boards (code, title, place, audience)
  values (v_code, btrim(p_title), coalesce(btrim(p_place), ''), coalesce(btrim(p_audience), ''))
  returning id into v_id;
  insert into public.board_secrets (board_id, pin_hash) values (v_id, crypt(p_pin, gen_salt('bf')));
  return query select b.code, b.title, b.place, b.audience from public.boards b where b.id = v_id;
end $$;

-- 하트: 기기당 메모 1회. 이미 눌렀으면 취소(토글). 현재 하트 수를 돌려줍니다.
create or replace function public.heart_note(p_note uuid, p_device text)
returns table (hearts integer, mine boolean)
language plpgsql security definer set search_path = public as $$
declare v_exists boolean;
begin
  if p_device is null or char_length(p_device) < 8 then raise exception 'device'; end if;
  select exists (select 1 from public.hearts h where h.note_id = p_note and h.device_id = p_device) into v_exists;
  if v_exists then
    delete from public.hearts h where h.note_id = p_note and h.device_id = p_device;
  else
    insert into public.hearts (note_id, device_id) values (p_note, p_device);
  end if;
  update public.notes n set hearts = (select count(*) from public.hearts h where h.note_id = p_note) where n.id = p_note;
  return query select n.hearts, (not v_exists) from public.notes n where n.id = p_note;
end $$;

-- 내가 하트 누른 메모 목록(기기 기준) — 새로고침 후에도 표시를 맞추기 위해
create or replace function public.my_hearts(p_board_code text, p_device text)
returns setof uuid
language sql security definer set search_path = public stable as $$
  select h.note_id from public.hearts h
  join public.notes n on n.id = h.note_id
  join public.boards b on b.id = n.board_id
  where b.code = p_board_code and h.device_id = p_device;
$$;

-- 운영자: PIN 확인
create or replace function public.check_pin(p_code text, p_pin text)
returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.boards b join public.board_secrets s on s.board_id = b.id
    where b.code = p_code and s.pin_hash = crypt(p_pin, s.pin_hash)
  );
$$;

-- 운영자: 숨긴 메모까지 전부 (CSV 내보내기용)
create or replace function public.board_notes_admin(p_code text, p_pin text)
returns table (id uuid, text text, nick text, hearts integer, hidden boolean, created_at timestamptz)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.check_pin(p_code, p_pin) then raise exception 'pin'; end if;
  return query select n.id, n.text, n.nick, n.hearts, n.hidden, n.created_at
    from public.notes n join public.boards b on b.id = n.board_id
    where b.code = p_code order by n.hidden, n.hearts desc, n.created_at desc;
end $$;

-- 운영자: 메모 숨기기/되살리기
create or replace function public.set_note_hidden(p_code text, p_pin text, p_note uuid, p_hidden boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.check_pin(p_code, p_pin) then raise exception 'pin'; end if;
  update public.notes n set hidden = p_hidden
    where n.id = p_note and n.board_id = (select b.id from public.boards b where b.code = p_code);
  return found;
end $$;

-- 운영자: 보드 열기/닫기 (닫으면 새 메모를 받지 않음)
create or replace function public.set_board_open(p_code text, p_pin text, p_open boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.check_pin(p_code, p_pin) then raise exception 'pin'; end if;
  update public.boards b set is_open = p_open where b.code = p_code;
  return found;
end $$;

grant execute on function public.create_board(text, text, text, text) to anon, authenticated;
grant execute on function public.heart_note(uuid, text) to anon, authenticated;
grant execute on function public.my_hearts(text, text) to anon, authenticated;
grant execute on function public.check_pin(text, text) to anon, authenticated;
grant execute on function public.board_notes_admin(text, text) to anon, authenticated;
grant execute on function public.set_note_hidden(text, text, uuid, boolean) to anon, authenticated;
grant execute on function public.set_board_open(text, text, boolean) to anon, authenticated;
