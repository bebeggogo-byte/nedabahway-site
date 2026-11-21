-- Civil-service interview answer note (/edu/gongmuwon/) — coach screen storage.
-- Safe to re-run. Depends on public.starcp_check_pass (supabase/starcp-schema.sql):
-- the coach screen uses the same coach password as the STARCP coach screen.
--
-- Access model
--   * RLS on, no policies, all table privileges revoked: the anon key can neither
--     read nor write the tables directly.
--   * Students write their own draft through gm_save (one row per device). The row
--     carries an alias the student types (not a real name) and the draft JSON.
--     Students are asked not to write names, schools or contact details.
--   * The coach screen reads through gm_coach_* functions, which check the coach
--     password on the server.
--   * Register a class code before sharing its link:
--       insert into public.gm_classes (code, name) values ('gm-2026-11', '...');

create table if not exists public.gm_classes (
  code text primary key check (code ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table if not exists public.gm_notes (
  device_id uuid primary key,
  class_code text not null references public.gm_classes(code) on update cascade on delete cascade,
  alias text not null check (char_length(btrim(alias)) between 1 and 20),
  track text not null default '' check (char_length(track) <= 40),
  step smallint not null default 0 check (step between 0 and 6),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pg_column_size(data) <= 60000)
);
create index if not exists gm_notes_class_idx on public.gm_notes (class_code, updated_at desc);

alter table public.gm_classes enable row level security;
alter table public.gm_notes enable row level security;
revoke all on public.gm_classes, public.gm_notes from anon, authenticated;

insert into public.gm_classes (code, name) values ('gm-2026-11', '특성화고 공무원 면접 대비반 (2026.11.)')
on conflict (code) do nothing;

-- ---------- student write ----------
create or replace function public.gm_save(
  p_device uuid, p_class text, p_alias text, p_track text, p_step integer, p_data jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.gm_classes where code = p_class) then
    raise exception 'unknown_class' using errcode = '22023';
  end if;
  insert into public.gm_notes as n (device_id, class_code, alias, track, step, data)
  values (p_device, p_class, btrim(p_alias), coalesce(btrim(p_track), ''), p_step, p_data)
  on conflict (device_id) do update set
    class_code = excluded.class_code, alias = excluded.alias, track = excluded.track,
    step = excluded.step, data = excluded.data, updated_at = now();
end $$;

-- ---------- coach reads ----------
create or replace function public.gm_coach_classes(p_pass text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v text := public.starcp_check_pass(p_pass);
begin
  if v <> 'ok' then return jsonb_build_object('ok', false, 'reason', v); end if;
  return jsonb_build_object('ok', true, 'classes', coalesce((
    select jsonb_agg(jsonb_build_object('code', c.code, 'name', c.name,
             'n', (select count(*) from public.gm_notes n where n.class_code = c.code)) order by c.created_at desc)
    from public.gm_classes c), '[]'::jsonb));
end $$;

create or replace function public.gm_coach_notes(p_class text, p_pass text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v text := public.starcp_check_pass(p_pass);
begin
  if v <> 'ok' then return jsonb_build_object('ok', false, 'reason', v); end if;
  return jsonb_build_object('ok', true, 'now', now(), 'notes', coalesce((
    select jsonb_agg(jsonb_build_object('id', n.device_id, 'alias', n.alias, 'track', n.track, 'step', n.step,
             'data', n.data, 'updated_at', n.updated_at) order by n.alias, n.updated_at desc)
    from public.gm_notes n where n.class_code = p_class), '[]'::jsonb));
end $$;

create or replace function public.gm_coach_delete(p_class text, p_device uuid, p_pass text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v text := public.starcp_check_pass(p_pass);
begin
  if v <> 'ok' then return jsonb_build_object('ok', false, 'reason', v); end if;
  delete from public.gm_notes where class_code = p_class and device_id = p_device;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.gm_save(uuid, text, text, text, integer, jsonb) from public;
revoke all on function public.gm_coach_classes(text) from public;
revoke all on function public.gm_coach_notes(text, text) from public;
revoke all on function public.gm_coach_delete(text, uuid, text) from public;
grant execute on function public.gm_save(uuid, text, text, text, integer, jsonb) to anon, authenticated;
grant execute on function public.gm_coach_classes(text) to anon, authenticated;
grant execute on function public.gm_coach_notes(text, text) to anon, authenticated;
grant execute on function public.gm_coach_delete(text, uuid, text) to anon, authenticated;
