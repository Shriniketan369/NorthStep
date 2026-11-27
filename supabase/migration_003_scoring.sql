-- NorthStep migration 003: the two database helpers the scoring server (Edge Function "score") uses.
-- Run once in the Supabase SQL editor, AFTER schema.sql and migration_002. Safe to read: it only ADDS two functions.
--
-- What they do, in plain words
--   * score_context(user): says whether this person may see their fit score yet, using the same rule as the
--     database's row-level security (app.fit_visible). If the person has no test-group assignment yet, it says
--     "not known", and the app keeps the score hidden until it is known.
--   * record_score(user, ...): saves one fit score in public.scores, marked with whether it was hidden at the time.
--     It refuses more than 20 in a minute or 500 in total per person, and it skips an exact repeat
--     (same roadmap, same answers, same model version).
--   * Both can ONLY be called by the server (service role). Browsers and signed-in users cannot call them.

create or replace function public.score_context(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare h boolean; ok boolean;
begin
  select a.holdout into h from app.assignments a where a.user_id = p_user;
  if not found then
    return jsonb_build_object('known', false, 'visible', false);
  end if;
  ok := (not h) or exists (select 1 from public.checkins c where c.user_id = p_user);
  return jsonb_build_object('known', true, 'visible', ok);
end $$;

create or replace function public.record_score(p_user uuid, p_version text, p_value numeric, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ctx jsonb; vis boolean; dup boolean;
begin
  if p_value is null or p_value < 0 or p_value > 100 then raise exception 'bad score'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or pg_column_size(p_payload) > 4000 then raise exception 'bad payload'; end if;
  if length(coalesce(p_version, '')) not between 1 and 40 then raise exception 'bad version'; end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then raise exception 'no such user'; end if;

  ctx := public.score_context(p_user);
  vis := (ctx ->> 'visible')::boolean;

  if (select count(*) from public.scores s where s.user_id = p_user and s.created_at > now() - interval '1 minute') >= 20
     or (select count(*) from public.scores s where s.user_id = p_user) >= 500 then
    raise exception 'too many scores';
  end if;

  select exists (
    select 1 from public.scores s
     where s.user_id = p_user and s.kind = 'fit' and s.model_version = p_version
       and s.payload ->> 'cid'   is not distinct from p_payload ->> 'cid'
       and s.payload ->> 'ahash' is not distinct from p_payload ->> 'ahash'
  ) into dup;

  -- Hidden means: no assignment found, or in the test group and no check-in yet. Never guess "visible".
  if not dup then
    insert into public.scores (user_id, kind, model_version, value, payload, hidden_at_creation)
    values (p_user, 'fit', p_version, p_value, p_payload, not vis);
  end if;
  return ctx;
end $$;

revoke all on function public.score_context(uuid) from public, anon, authenticated;
revoke all on function public.record_score(uuid, text, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.score_context(uuid) to service_role;
grant execute on function public.record_score(uuid, text, numeric, jsonb) to service_role;
