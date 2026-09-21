-- Audit Fix 1: persistent rolling-hour quota for /api/check-answer.
-- No student content is stored. One bounded timestamp array per auth user.
begin;

create table if not exists public.check_answer_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  request_times timestamptz[] not null default '{}',
  constraint check_answer_rate_limits_max_requests check (cardinality(request_times) <= 10)
);

alter table public.check_answer_rate_limits enable row level security;
-- Deliberately no client policies: rate-limit state is server-only.
revoke all on table public.check_answer_rate_limits from public, anon, authenticated;
grant select, insert, update on table public.check_answer_rate_limits to service_role;

create or replace function public.consume_check_answer_request(p_user_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  recent_times timestamptz[];
  checked_at timestamptz;
begin
  insert into public.check_answer_rate_limits (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  -- Serialize count + reservation for this user across all serverless instances.
  select request_times into strict recent_times
  from public.check_answer_rate_limits
  where user_id = p_user_id
  for update;

  -- Read the clock after acquiring the lock, not at transaction start.
  checked_at := clock_timestamp();
  select coalesce(array_agg(request_time), '{}'::timestamptz[])
  into recent_times
  from unnest(recent_times) as requests(request_time)
  where request_time > checked_at - interval '1 hour';

  if cardinality(recent_times) >= 10 then
    return false;
  end if;

  update public.check_answer_rate_limits
  set request_times = array_append(recent_times, checked_at)
  where user_id = p_user_id;
  return true;
end;
$$;

-- Functions otherwise grant EXECUTE to PUBLIC by default.
revoke all on function public.consume_check_answer_request(uuid) from public, anon, authenticated;
grant execute on function public.consume_check_answer_request(uuid) to service_role;

commit;
