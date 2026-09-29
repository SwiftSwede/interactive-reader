-- Run only against a disposable test database after applying
-- supabase/migrations/20260928_slice68_word_flag_rollup.sql.
-- Fixture changes are rolled back.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000691', 'slice69-student@example.com'),
  ('00000000-0000-0000-0000-000000000692', 'slice69-teacher@example.com');

insert into public.profiles (id, email, role)
values
  ('00000000-0000-0000-0000-000000000691', 'slice69-student@example.com', 'student-classroom'),
  ('00000000-0000-0000-0000-000000000692', 'slice69-teacher@example.com', 'teacher')
on conflict (id) do update
  set email = excluded.email,
      role = excluded.role;

insert into public.stories (id, title, slug, body_text)
values (
  '00000000-0000-0000-0000-000000000693',
  'Slice 69 fixture',
  'slice69-rollup-fixture',
  'depend on it'
);

insert into public.courses (id, name, level, teacher_id)
values (
  '00000000-0000-0000-0000-000000000694',
  'Slice 69 fixture',
  'intermediate',
  '00000000-0000-0000-0000-000000000692'
);

insert into public.course_enrollments (course_id, student_id, display_name)
values (
  '00000000-0000-0000-0000-000000000694',
  '00000000-0000-0000-0000-000000000691',
  'Slice 69'
);

insert into public.course_sessions (
  id,
  course_id,
  story_id,
  session_date,
  session_start_time,
  session_end_time,
  session_type
) values
  (
    '00000000-0000-0000-0000-000000000695',
    '00000000-0000-0000-0000-000000000694',
    '00000000-0000-0000-0000-000000000693',
    '2026-09-01',
    '2026-09-01 15:00:00+00',
    '2026-09-01 16:30:00+00',
    'story'
  ),
  (
    '00000000-0000-0000-0000-000000000696',
    '00000000-0000-0000-0000-000000000694',
    '00000000-0000-0000-0000-000000000693',
    '2026-09-15',
    '2026-09-15 15:00:00+00',
    '2026-09-15 16:30:00+00',
    'story'
  );

insert into public.word_flag_requests (
  story_id,
  course_session_id,
  user_id,
  flag_text,
  occurrence_index,
  created_at
) values (
  '00000000-0000-0000-0000-000000000693',
  '00000000-0000-0000-0000-000000000695',
  '00000000-0000-0000-0000-000000000691',
  'depend',
  0,
  '2026-09-01 15:10:00+00'
);

delete from public.course_sessions
where id = '00000000-0000-0000-0000-000000000695';

do $$
declare
  p_student constant uuid := '00000000-0000-0000-0000-000000000691';
  p_story constant uuid := '00000000-0000-0000-0000-000000000693';
  tapped_at constant timestamptz := '2026-09-01 15:10:00+00';
  rollup_row public.word_flag_request_rollup%rowtype;
  event_row public.learning_events%rowtype;
begin
  select * into strict rollup_row
  from public.word_flag_request_rollup
  where user_id = p_student
    and story_id = p_story
    and flag_text = 'depend'
    and occurrence_index = 0;

  assert rollup_row.times_requested = 1, 'Session delete must record one request';
  assert rollup_row.first_requested_at = tapped_at, 'First tap must be the request time';
  assert rollup_row.last_requested_at = tapped_at, 'Last tap must be the request time';

  select * into strict event_row
  from public.learning_events
  where user_id = p_student
    and event_type = 'word_flag_request';

  assert event_row.occurred_at = tapped_at, 'Event time must be when the student asked';
  assert event_row.course_session_id is null, 'Session delete must leave course_session_id null';
  assert event_row.detail = jsonb_build_object(
    'story_id', p_story,
    'flag_text', 'depend',
    'occurrence_index', 0
  ), 'Event detail must keep the anchor';
end;
$$;

insert into public.word_flag_requests (
  story_id,
  course_session_id,
  user_id,
  flag_text,
  occurrence_index,
  created_at
) values (
  '00000000-0000-0000-0000-000000000693',
  '00000000-0000-0000-0000-000000000696',
  '00000000-0000-0000-0000-000000000691',
  'depend',
  0,
  '2026-09-15 15:10:00+00'
);

delete from public.word_flag_requests
where course_session_id = '00000000-0000-0000-0000-000000000696'
  and flag_text = 'depend'
  and occurrence_index = 0;

do $$
declare
  p_student constant uuid := '00000000-0000-0000-0000-000000000691';
  p_story constant uuid := '00000000-0000-0000-0000-000000000693';
  p_session constant uuid := '00000000-0000-0000-0000-000000000696';
  first_tap constant timestamptz := '2026-09-01 15:10:00+00';
  second_tap constant timestamptz := '2026-09-15 15:10:00+00';
  rollup_row public.word_flag_request_rollup%rowtype;
  event_row public.learning_events%rowtype;
begin
  assert exists (
    select 1 from public.course_sessions where id = p_session
  ), 'Targeted delete must leave the session in place';

  select * into strict rollup_row
  from public.word_flag_request_rollup
  where user_id = p_student
    and story_id = p_story
    and flag_text = 'depend'
    and occurrence_index = 0;

  assert rollup_row.times_requested = 2, 'Second request must increment the rollup';
  assert rollup_row.first_requested_at = first_tap, 'First tap must stay the earlier time';
  assert rollup_row.last_requested_at = second_tap, 'Last tap must become the later time';

  select * into strict event_row
  from public.learning_events
  where user_id = p_student
    and event_type = 'word_flag_request'
    and occurred_at = second_tap;

  assert event_row.course_session_id = p_session,
    'Targeted delete must keep course_session_id';
end;
$$;

do $$
declare
  role_name text;
  privilege_name text;
  table_name text;
begin
  foreach table_name in array array[
    'public.word_flag_request_rollup',
    'public.learning_events'
  ] loop
    assert (select relrowsecurity from pg_class where oid = table_name::regclass),
      'RLS must be enabled';
    assert has_table_privilege('authenticated', table_name, 'SELECT'),
      'Teachers read through the authenticated role';
    foreach role_name in array array['anon', 'authenticated'] loop
      foreach privilege_name in array array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] loop
        assert not has_table_privilege(role_name, table_name, privilege_name),
          'Clients must not write deficiency rows';
      end loop;
    end loop;
    assert not has_table_privilege('anon', table_name, 'SELECT'),
      'Anon must not read deficiency rows';
  end loop;

  assert not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('word_flag_request_rollup', 'learning_events')
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ), 'No write policies on deficiency tables';

  assert not has_function_privilege(
    'anon',
    'public.rollup_word_flag_request()',
    'EXECUTE'
  ), 'Anon must not call the rollup function';
  assert not has_function_privilege(
    'authenticated',
    'public.rollup_word_flag_request()',
    'EXECUTE'
  ), 'Authenticated must not call the rollup function';
end;
$$;

rollback;
