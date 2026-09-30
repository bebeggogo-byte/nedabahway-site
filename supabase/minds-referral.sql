-- 6 MINDS referral card unlocks
-- One diagnosis = one card box (ref). The box owner shares /diagnosis/minds/?f=<ref>.
-- Each distinct visitor (random browser id, not a person) who opens that link counts once.
-- Each counted visit lets the owner open one more locked card of their choice (max 5).
-- No answers, names or results are stored here. Tables have RLS on and no policies:
-- the browser (publishable key, role anon) can only call the functions below.

create table if not exists public.minds_ref (
  ref        text primary key check (ref ~ '^[a-z0-9]{10}$'),
  owner_key  text not null check (owner_key ~ '^[a-z0-9]{16}$'),
  owner_vid  text check (owner_vid ~ '^[a-z0-9]{12}$'),
  created_at timestamptz not null default now()
);
create table if not exists public.minds_ref_visit (
  ref        text not null references public.minds_ref(ref) on delete cascade,
  vid        text not null check (vid ~ '^[a-z0-9]{12}$'),
  created_at timestamptz not null default now(),
  primary key (ref, vid)
);
create table if not exists public.minds_ref_pick (
  ref        text not null references public.minds_ref(ref) on delete cascade,
  mind       text not null check (mind in ('explorer','maker','connector','supporter','thinker','enjoyer')),
  created_at timestamptz not null default now(),
  primary key (ref, mind)
);
alter table public.minds_ref       enable row level security;
alter table public.minds_ref_visit enable row level security;
alter table public.minds_ref_pick  enable row level security;
revoke all on public.minds_ref, public.minds_ref_visit, public.minds_ref_pick from anon, authenticated;

create or replace function public.minds_ref_state(p_ref text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'visits', (select count(*) from minds_ref_visit v where v.ref = p_ref),
    'picks',  coalesce((select json_agg(p.mind order by p.created_at) from minds_ref_pick p where p.ref = p_ref), '[]'::json)
  );
$$;

create or replace function public.minds_ref_register(p_ref text, p_key text, p_vid text)
returns json language plpgsql security definer set search_path = public as $$
begin
  insert into minds_ref(ref, owner_key, owner_vid) values (p_ref, p_key, p_vid) on conflict (ref) do nothing;
  return minds_ref_state(p_ref);
end $$;

-- counts a visit unless it is the owner's own browser; stops counting at 50 per box
create or replace function public.minds_ref_visit(p_ref text, p_vid text)
returns json language plpgsql security definer set search_path = public as $$
declare o text;
begin
  select owner_vid into o from minds_ref where ref = p_ref;
  if found and o is distinct from p_vid and (select count(*) from minds_ref_visit where ref = p_ref) < 50 then
    insert into minds_ref_visit(ref, vid) values (p_ref, p_vid) on conflict do nothing;
  end if;
  return json_build_object('ok', found);
end $$;

-- opens one locked card if the owner has an unused visit
create or replace function public.minds_ref_pick(p_ref text, p_key text, p_mind text)
returns json language plpgsql security definer set search_path = public as $$
declare v int; n int;
begin
  if not exists (select 1 from minds_ref where ref = p_ref and owner_key = p_key) then
    raise exception 'not owner';
  end if;
  select count(*) into v from minds_ref_visit where ref = p_ref;
  select count(*) into n from minds_ref_pick where ref = p_ref;
  if n < least(v, 5) then
    insert into minds_ref_pick(ref, mind) values (p_ref, p_mind) on conflict do nothing;
  end if;
  return minds_ref_state(p_ref);
end $$;

revoke all on function public.minds_ref_state(text), public.minds_ref_register(text, text, text),
  public.minds_ref_visit(text, text), public.minds_ref_pick(text, text, text) from public;
grant execute on function public.minds_ref_state(text), public.minds_ref_register(text, text, text),
  public.minds_ref_visit(text, text), public.minds_ref_pick(text, text, text) to anon, authenticated;
