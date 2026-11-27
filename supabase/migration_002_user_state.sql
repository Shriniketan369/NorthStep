-- NorthStep migration 002: one saved copy of each person's app data, so every device shows the same thing.
-- Run once in the Supabase SQL editor, AFTER schema.sql. Safe to read: it only ADDS things.
--
-- What it does, in plain words
--   * public.user_state: one row per person holding their reports, progress, saved details, theme and photo.
--     The app merges this with what is on each device, so nothing is overwritten and nothing is lost.
--   * Row-level security: a person can only read and change their OWN row.
--   * app.user_state_history: before every change the old copy is kept (last 15 per person). If a bug ever
--     writes bad data, the previous copy can be restored from here. People cannot read or change it.
--   * export_my_data() now includes the saved copy. delete_my_account() already removes everything,
--     because both new tables delete along with the person.

create table public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null default '{}'::jsonb
             check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 1500000),
  rev        integer not null default 1 check (rev >= 1),
  updated_at timestamptz not null default now()
);

create table app.user_state_history (
  id       bigserial primary key,
  user_id  uuid not null references auth.users (id) on delete cascade,
  rev      integer not null,
  state    jsonb not null,
  saved_at timestamptz not null default now()
);
create index user_state_history_user_idx on app.user_state_history (user_id, id desc);

-- Database clock for updated_at, and: a change must move the revision forward by exactly one.
-- (The app uses this to notice when another device saved first, then merges and tries again.)
create function app.user_state_guard() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and auth.uid() is not null and new.rev <> old.rev + 1 then
    raise exception 'stale revision' using errcode = '40001';
  end if;
  return new;
end $$;

create trigger user_state_guard before insert or update on public.user_state
  for each row execute function app.user_state_guard();

-- Keep the previous copy before each change; prune to the newest 15 per person.
create function app.user_state_keep() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into app.user_state_history (user_id, rev, state) values (old.user_id, old.rev, old.state);
  delete from app.user_state_history h
   where h.user_id = old.user_id
     and h.id not in (select id from app.user_state_history where user_id = old.user_id order by id desc limit 15);
  return new;
end $$;

create trigger user_state_keep before update on public.user_state
  for each row execute function app.user_state_keep();

-- Access rules.
alter table public.user_state enable row level security;
alter table app.user_state_history enable row level security;   -- no policy: only the server can touch it

create policy user_state_select on public.user_state for select to authenticated using (user_id = auth.uid());
create policy user_state_insert on public.user_state for insert to authenticated with check (user_id = auth.uid());
create policy user_state_update on public.user_state for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.user_state from anon, authenticated, public;
revoke all on app.user_state_history from anon, authenticated, public;
revoke all on sequence app.user_state_history_id_seq from anon, authenticated, public;
revoke all on function app.user_state_guard(), app.user_state_keep() from public, anon, authenticated;
grant select on public.user_state to authenticated;
grant insert (user_id, state, rev) on public.user_state to authenticated;
grant update (state, rev) on public.user_state to authenticated;

-- "Download my data" now includes the saved copy (same function as before, one extra line).
create or replace function public.export_my_data() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'profile',    (select to_jsonb(p) from public.profiles p where p.user_id = auth.uid()),
    'answers',    coalesce((select jsonb_agg(to_jsonb(a) order by a.id) from public.answers a where a.user_id = auth.uid()), '[]'),
    'scores',     coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from public.scores s
                            where s.user_id = auth.uid() and (s.kind <> 'fit' or app.fit_visible(auth.uid()))), '[]'),
    'roadmaps',   coalesce((select jsonb_agg(to_jsonb(r)) from public.roadmaps r where r.user_id = auth.uid()), '[]'),
    'step_events',coalesce((select jsonb_agg(to_jsonb(e) order by e.id) from public.step_events e where e.user_id = auth.uid()), '[]'),
    'checkins',   coalesce((select jsonb_agg(to_jsonb(c) order by c.id) from public.checkins c where c.user_id = auth.uid()), '[]'),
    'pivots',     coalesce((select jsonb_agg(to_jsonb(v) order by v.id) from public.pivots v where v.user_id = auth.uid()), '[]'),
    'saved_state',(select u.state from public.user_state u where u.user_id = auth.uid()))
$$;
