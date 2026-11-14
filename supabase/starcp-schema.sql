-- STARCP essay tool — aggregate records only (no names, no essay text).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE.
--
-- Access model
--   * RLS is on for every table and there are NO policies, so the anon key can
--     neither read nor write the tables directly.
--   * Students write through starcp_submit / starcp_review (security definer).
--     One row per draft: the browser makes a random uuid per draft and a repeat
--     submit overwrites the same row. The uuid is never linked to a person.
--   * The coach screen reads through starcp_coach_* functions, which check the
--     coach password on the server and return aggregates only.
--   * Set the coach password once in the SQL editor (never commit it):
--       select public.starcp_set_coach_password('choose-a-long-password');
--   * Register a course code before sharing its link:
--       insert into public.starcp_courses (code, name) values ('halla-2026-11', '...');

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table if not exists public.starcp_courses (
  code text primary key check (code ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table if not exists public.starcp_sessions (
  session_id uuid primary key,
  course_code text not null references public.starcp_courses(code) on update cascade,
  question_type text not null check (char_length(question_type) between 1 and 40),
  main_value text not null check (char_length(main_value) between 1 and 20),
  main_strength text not null check (char_length(main_strength) between 1 and 20),
  char_count integer not null check (char_count between 1 and 5000),
  st_ratio smallint not null check (st_ratio between 0 and 100),
  ar_ratio smallint not null check (ar_ratio between 0 and 100),
  use_cp boolean not null,
  checks_passed smallint not null check (checks_passed between 0 and 5),
  minutes smallint not null check (minutes between 0 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (st_ratio + ar_ratio <= 100)
);
create index if not exists starcp_sessions_course_idx on public.starcp_sessions (course_code);

create table if not exists public.starcp_reviews (
  session_id uuid primary key,
  course_code text not null references public.starcp_courses(code) on update cascade,
  body text not null check (char_length(btrim(body)) between 5 and 100),
  created_at timestamptz not null default now()
);
create index if not exists starcp_reviews_course_idx on public.starcp_reviews (course_code);

-- Single-row table: coach password hash + failed-attempt window.
create table if not exists public.starcp_secrets (
  id smallint primary key check (id = 1),
  pass_hash text not null,
  fail_count integer not null default 0,
  fail_window timestamptz not null default now()
);

insert into public.starcp_courses (code, name) values ('default', '과정 코드 없음')
on conflict (code) do nothing;
insert into public.starcp_courses (code, name) values ('halla-2026-11', '한라대 2026년 11월 과정(임시 이름)')
on conflict (code) do nothing;

-- ---------- row level security: no policies on purpose ----------
alter table public.starcp_courses enable row level security;
alter table public.starcp_sessions enable row level security;
alter table public.starcp_reviews enable row level security;
alter table public.starcp_secrets enable row level security;
revoke all on public.starcp_courses, public.starcp_sessions, public.starcp_reviews, public.starcp_secrets
  from anon, authenticated;

-- ---------- student writes ----------
create or replace function public.starcp_submit(
  p_session uuid, p_course text, p_question text, p_value text, p_strength text,
  p_chars integer, p_st integer, p_ar integer, p_cp boolean, p_checks integer, p_minutes integer
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.starcp_courses where code = p_course) then
    raise exception 'unknown_course' using errcode = '22023';
  end if;
  insert into public.starcp_sessions as s
    (session_id, course_code, question_type, main_value, main_strength,
     char_count, st_ratio, ar_ratio, use_cp, checks_passed, minutes)
  values
    (p_session, p_course, btrim(p_question), btrim(p_value), btrim(p_strength),
     p_chars, p_st, p_ar, p_cp, p_checks, least(greatest(p_minutes, 0), 1440))
  on conflict (session_id) do update set
    course_code = excluded.course_code,
    question_type = excluded.question_type,
    main_value = excluded.main_value,
    main_strength = excluded.main_strength,
    char_count = excluded.char_count,
    st_ratio = excluded.st_ratio,
    ar_ratio = excluded.ar_ratio,
    use_cp = excluded.use_cp,
    checks_passed = excluded.checks_passed,
    minutes = excluded.minutes,
    updated_at = now();
end $$;

create or replace function public.starcp_review(p_session uuid, p_course text, p_body text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.starcp_courses where code = p_course) then
    raise exception 'unknown_course' using errcode = '22023';
  end if;
  insert into public.starcp_reviews (session_id, course_code, body)
  values (p_session, p_course, btrim(p_body))
  on conflict (session_id) do update set
    course_code = excluded.course_code, body = excluded.body, created_at = now();
end $$;

-- ---------- coach password ----------
create or replace function public.starcp_set_coach_password(p_pass text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if char_length(coalesce(p_pass, '')) < 10 then
    raise exception 'password must be at least 10 characters';
  end if;
  insert into public.starcp_secrets (id, pass_hash) values (1, crypt(p_pass, gen_salt('bf', 10)))
  on conflict (id) do update set pass_hash = excluded.pass_hash, fail_count = 0, fail_window = now();
end $$;

-- Returns 'ok', 'bad_password', 'locked' or 'not_set'.
-- Ten wrong attempts inside ten minutes lock the coach screen until the window ends.
-- It returns a status instead of raising so the failure counter is committed.
create or replace function public.starcp_check_pass(p_pass text)
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare r public.starcp_secrets%rowtype;
begin
  select * into r from public.starcp_secrets where id = 1 for update;
  if not found then return 'not_set'; end if;
  if r.fail_window < now() - interval '10 minutes' then
    r.fail_count := 0;
    update public.starcp_secrets set fail_count = 0, fail_window = now() where id = 1;
  end if;
  if r.fail_count >= 10 then return 'locked'; end if;
  if r.pass_hash = crypt(coalesce(p_pass, ''), r.pass_hash) then
    return 'ok';
  end if;
  update public.starcp_secrets set fail_count = fail_count + 1 where id = 1;
  return 'bad_password';
end $$;

-- ---------- coach reads (aggregates only) ----------
create or replace function public.starcp_coach_courses(p_pass text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v text := public.starcp_check_pass(p_pass);
begin
  if v <> 'ok' then return jsonb_build_object('ok', false, 'reason', v); end if;
  return jsonb_build_object('ok', true, 'courses', coalesce((
    select jsonb_agg(jsonb_build_object('code', c.code, 'name', c.name, 'n',
             (select count(*) from public.starcp_sessions s where s.course_code = c.code))
           order by c.created_at desc)
    from public.starcp_courses c), '[]'::jsonb));
end $$;

create or replace function public.starcp_coach_summary(p_course text, p_pass text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v text := public.starcp_check_pass(p_pass);
  n integer;
  n_other integer;
  base jsonb;
  reviews jsonb;
begin
  if v <> 'ok' then return jsonb_build_object('ok', false, 'reason', v); end if;

  select count(*) into n from public.starcp_sessions where course_code = p_course;
  select count(*) into n_other from public.starcp_sessions where course_code <> p_course;
  select coalesce(jsonb_agg(body order by created_at desc), '[]'::jsonb) into reviews
    from public.starcp_reviews where course_code = p_course;

  base := jsonb_build_object(
    'ok', true, 'course', p_course,
    'name', (select name from public.starcp_courses where code = p_course),
    'n', n, 'reviews', reviews,
    'avg_checks', (select round(avg(checks_passed), 1) from public.starcp_sessions where course_code = p_course));

  -- Fewer than five people: rankings and distributions would reveal who chose what.
  if n < 5 then
    return base || jsonb_build_object('masked', true);
  end if;

  return base || jsonb_build_object(
    'masked', false,
    'avg_st', (select round(avg(st_ratio)) from public.starcp_sessions where course_code = p_course),
    'avg_ar', (select round(avg(ar_ratio)) from public.starcp_sessions where course_code = p_course),
    'avg_chars', (select round(avg(char_count)) from public.starcp_sessions where course_code = p_course),
    'avg_minutes', (select round(avg(minutes)) from public.starcp_sessions where course_code = p_course),
    'cp_count', (select count(*) from public.starcp_sessions where course_code = p_course and use_cp),
    'st_ok_count', (select count(*) from public.starcp_sessions where course_code = p_course and st_ratio <= 25),
    'st_dist', (select jsonb_build_object(
        'b0_15', count(*) filter (where st_ratio <= 15),
        'b16_25', count(*) filter (where st_ratio between 16 and 25),
        'b26_35', count(*) filter (where st_ratio between 26 and 35),
        'b36', count(*) filter (where st_ratio >= 36))
      from public.starcp_sessions where course_code = p_course),
    'top_values', (select coalesce(jsonb_agg(jsonb_build_object('word', w, 'count', c) order by c desc, w), '[]'::jsonb)
      from (select main_value w, count(*) c from public.starcp_sessions where course_code = p_course
            group by 1 order by 2 desc, 1 limit 5) t),
    'top_strengths', (select coalesce(jsonb_agg(jsonb_build_object('word', w, 'count', c) order by c desc, w), '[]'::jsonb)
      from (select main_strength w, count(*) c from public.starcp_sessions where course_code = p_course
            group by 1 order by 2 desc, 1 limit 5) t),
    -- Words whose share in this course is highest above their share in all other courses.
    -- Needs at least five records elsewhere to compare against.
    'other_n', n_other,
    'distinct_words', case when n_other < 5 then '[]'::jsonb else (
      select coalesce(jsonb_agg(jsonb_build_object('word', w, 'kind', kind, 'count', c,
                 'share', round(100.0 * c / n), 'other_share', round(100.0 * oc / n_other))
               order by diff desc, w), '[]'::jsonb)
      from (
        select m.w, m.kind, m.c, coalesce(o.oc, 0) oc,
               (m.c::numeric / n) - (coalesce(o.oc, 0)::numeric / n_other) diff
        from (select main_value w, 'value' kind, count(*) c from public.starcp_sessions
                where course_code = p_course group by 1
              union all
              select main_strength, 'strength', count(*) from public.starcp_sessions
                where course_code = p_course group by 1) m
        left join (select main_value w, 'value' kind, count(*) oc from public.starcp_sessions
                     where course_code <> p_course group by 1
                   union all
                   select main_strength, 'strength', count(*) from public.starcp_sessions
                     where course_code <> p_course group by 1) o
          on o.w = m.w and o.kind = m.kind
        where m.c >= 2
          and (m.c::numeric / n) - (coalesce(o.oc, 0)::numeric / n_other) >= 0.10
        order by diff desc, m.w limit 3) d)
    end);
end $$;

-- ---------- grants ----------
revoke all on function public.starcp_submit(uuid, text, text, text, text, integer, integer, integer, boolean, integer, integer) from public;
revoke all on function public.starcp_review(uuid, text, text) from public;
revoke all on function public.starcp_set_coach_password(text) from public, anon, authenticated;
revoke all on function public.starcp_check_pass(text) from public, anon, authenticated;
revoke all on function public.starcp_coach_courses(text) from public;
revoke all on function public.starcp_coach_summary(text, text) from public;

grant execute on function public.starcp_submit(uuid, text, text, text, text, integer, integer, integer, boolean, integer, integer) to anon, authenticated;
grant execute on function public.starcp_review(uuid, text, text) to anon, authenticated;
grant execute on function public.starcp_coach_courses(text) to anon, authenticated;
grant execute on function public.starcp_coach_summary(text, text) to anon, authenticated;
