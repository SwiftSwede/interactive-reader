-- Run only against a disposable test database after applying the migration.
-- All fixture data and timestamp changes are rolled back.
begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');

set local role service_role;
do $$
declare
  user_a constant uuid := '00000000-0000-0000-0000-000000000001';
  user_b constant uuid := '00000000-0000-0000-0000-000000000002';
  i integer;
begin
  for i in 1..10 loop
    assert public.consume_check_answer_request(user_a), 'First ten requests must pass';
  end loop;
  assert not public.consume_check_answer_request(user_a), 'Eleventh request must fail';
  assert public.consume_check_answer_request(user_b), 'Users must have independent quotas';
  assert (select cardinality(request_times) = 10 from public.check_answer_rate_limits
    where user_id = user_a), 'Denied requests must not grow stored history';

  -- Nine recent requests and one expired request: exactly one new slot.
  update public.check_answer_rate_limits
  set request_times = array_fill(clock_timestamp() - interval '30 minutes', array[9])
    || array[clock_timestamp() - interval '1 hour']
  where user_id = user_a;
  assert public.consume_check_answer_request(user_a), 'Expired timestamp must release a slot';
  assert not public.consume_check_answer_request(user_a), 'Rolling window must retain recent requests';

  update public.check_answer_rate_limits
  set request_times = array_fill(clock_timestamp() - interval '61 minutes', array[10])
  where user_id = user_a;
  assert public.consume_check_answer_request(user_a), 'Expired window must allow requests';
  assert (select cardinality(request_times) = 1 from public.check_answer_rate_limits
    where user_id = user_a), 'Expired timestamps must be pruned';
end;
$$;
reset role;

do $$
declare
  role_name text;
  privilege_name text;
begin
  assert (select relrowsecurity from pg_class
    where oid = 'public.check_answer_rate_limits'::regclass), 'RLS must be enabled';
  foreach role_name in array array['anon', 'authenticated'] loop
    foreach privilege_name in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] loop
      assert not has_table_privilege(role_name, 'public.check_answer_rate_limits', privilege_name),
        'Clients must not access rate-limit rows';
    end loop;
    assert not has_function_privilege(role_name, 'public.consume_check_answer_request(uuid)', 'EXECUTE'),
      'Clients must not invoke the service-only RPC';
  end loop;
end;
$$;
rollback;
