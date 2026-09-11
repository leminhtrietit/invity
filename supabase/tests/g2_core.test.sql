begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(25);

select has_table('public', 'events', 'events table exists');
select has_table('public', 'event_drafts', 'event drafts table exists');
select has_table('public', 'event_quota_counters', 'event quota counters table exists');
select has_table('public', 'idempotency_requests', 'idempotency ledger exists');
select has_table('public', 'jobs', 'jobs table exists');

select is(
  public.vietnam_month_key('2026-12-31 16:59:59+00'::timestamptz),
  '2026-12-01'::date,
  '23:59:59 Vietnam stays in December'
);
select is(
  public.vietnam_month_key('2026-12-31 17:00:00+00'::timestamptz),
  '2027-01-01'::date,
  'midnight Vietnam enters January'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'owner-a@example.test', '', now(), '{"provider":"google","providers":["google"]}', '{"name":"Owner A"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'owner-b@example.test', '', now(), '{"provider":"google","providers":["google"]}', '{"name":"Owner B"}', now(), now());

insert into public.app_users (id, email, display_name) values
  ('20000000-0000-0000-0000-000000000001', 'owner-a@example.test', 'Owner A'),
  ('20000000-0000-0000-0000-000000000002', 'owner-b@example.test', 'Owner B');
insert into public.auth_bindings (app_user_id, auth_user_id, provider, provider_subject) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'google', 'google-owner-a'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'google', 'google-owner-b');
insert into public.templates (id, name, category, renderer_version, content_schema_version)
values ('vow-editorial', 'Vow Editorial', 'wedding', 1, 1)
on conflict (id) do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';

select is(
  (select revision from public.create_event_draft(
    'vow-editorial', 'wedding', '30000000-0000-0000-0000-000000000001'
  )),
  1,
  'owner can create a draft event'
);
select is(
  (select replayed from public.create_event_draft(
    'vow-editorial', 'wedding', '30000000-0000-0000-0000-000000000001'
  )),
  true,
  'same idempotency key and payload replays'
);
select throws_ok(
  $$ select * from public.create_event_draft(
    'vow-editorial', 'other', '30000000-0000-0000-0000-000000000001'
  ) $$,
  'P0001', 'IDEMPOTENCY_CONFLICT',
  'same idempotency key with another payload is rejected'
);

select is(
  (select revision from public.save_event_draft(
    (select id from public.events where owner_app_user_id = '20000000-0000-0000-0000-000000000001' order by created_at limit 1),
    1, '{"title":"A wedding"}', '30000000-0000-0000-0000-000000000002'
  )),
  2,
  'saving a current draft increments its revision'
);
select throws_ok(
  format(
    $$ select * from public.save_event_draft(%L, 1, '{"title":"stale"}', '30000000-0000-0000-0000-000000000003') $$,
    (select id from public.events where owner_app_user_id = '20000000-0000-0000-0000-000000000001' order by created_at limit 1)
  ),
  'P0001', 'REVISION_CONFLICT',
  'stale draft revision is rejected'
);

reset role;
update public.event_quota_counters set guest_slots_used = 49;
insert into public.guest_slots (event_id, allocation_number, allocation_source, display_name)
select e.id, n, 'personalized', 'Guest ' || n
from public.events e cross join generate_series(1, 49) n
where e.owner_app_user_id = '20000000-0000-0000-0000-000000000001';
set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';

select is(
  (select allocation_number from public.allocate_personal_guest_slot(
    (select id from public.events where owner_app_user_id = '20000000-0000-0000-0000-000000000001' order by created_at limit 1),
    'Last Guest', null, null, null, '30000000-0000-0000-0000-000000000004'
  )),
  50,
  'the last guest slot can be allocated'
);
select throws_ok(
  format(
    $$ select * from public.allocate_personal_guest_slot(%L, 'Overflow Guest', null, null, null, '30000000-0000-0000-0000-000000000005') $$,
    (select id from public.events where owner_app_user_id = '20000000-0000-0000-0000-000000000001' order by created_at limit 1)
  ),
  'P0001', 'GUEST_QUOTA_EXCEEDED',
  'the 51st guest slot is rejected'
);
select is(
  (select guest_slots_used from public.event_quota_counters limit 1),
  50,
  'failed allocation leaves counter at 50'
);

reset role;
insert into public.events (id, owner_app_user_id, template_id, category)
values
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'vow-editorial', 'wedding'),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'vow-editorial', 'wedding');
insert into public.event_drafts (event_id) values
  ('40000000-0000-0000-0000-000000000002'), ('40000000-0000-0000-0000-000000000003');
insert into public.event_quota_counters (event_id) values
  ('40000000-0000-0000-0000-000000000002'), ('40000000-0000-0000-0000-000000000003');
insert into public.event_versions (
  id, event_id, version_number, template_id, renderer_version, content_schema_version, content
) values
  ('50000000-0000-0000-0000-000000000001', (select id from public.events where owner_app_user_id = '20000000-0000-0000-0000-000000000001' and id <> '40000000-0000-0000-0000-000000000002'), 1, 'vow-editorial', 1, 1, '{}'),
  ('50000000-0000-0000-0000-000000000002', (select id from public.events where owner_app_user_id = '20000000-0000-0000-0000-000000000001' and id <> '40000000-0000-0000-0000-000000000002'), 2, 'vow-editorial', 1, 1, '{}'),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', 1, 'vow-editorial', 1, 1, '{}');

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';
select is(
  (select first_publication from public.activate_event_version(
    (select id from public.events where owner_app_user_id = '20000000-0000-0000-0000-000000000001' and id <> '40000000-0000-0000-0000-000000000002'),
    '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000006'
  )),
  true,
  'first activation consumes publication quota'
);
select is(
  (select first_publication from public.activate_event_version(
    (select id from public.events where owner_app_user_id = '20000000-0000-0000-0000-000000000001' and id <> '40000000-0000-0000-0000-000000000002'),
    '50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000007'
  )),
  false,
  'updating the published event does not consume another quota unit'
);
select throws_ok(
  $$ select * from public.activate_event_version(
    '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000008'
  ) $$,
  'P0001', 'EVENT_QUOTA_EXCEEDED',
  'another event in the same Vietnam month is rejected'
);

set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000002';
select is(
  (select count(*)::integer from public.events where owner_app_user_id = '20000000-0000-0000-0000-000000000001'),
  0,
  'RLS hides another owner events'
);
select throws_ok(
  $$ select * from public.save_event_draft(
    '40000000-0000-0000-0000-000000000002', 1, '{}',
    '30000000-0000-0000-0000-000000000009'
  ) $$,
  'P0002', 'NOT_FOUND',
  'owner cannot mutate another owner event'
);

reset role;
set local role anon;
select throws_ok(
  $$ select count(*) from public.guest_slots $$,
  '42501', 'permission denied for table guest_slots',
  'anonymous users cannot query private guest rows'
);
reset role;
select ok(
  not has_function_privilege('authenticated', 'public.claim_jobs(text,integer,integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.claim_jobs(text,integer,integer)', 'EXECUTE'),
  'only service role can claim jobs'
);

insert into public.jobs (id, kind, max_attempts) values
  ('60000000-0000-0000-0000-000000000001', 'test', 1);
set local role service_role;
select is(
  (select status from public.claim_jobs('worker-a', 1, 10) limit 1),
  'running',
  'worker claims an available job with a lease'
);
select lives_ok(
  $$ select public.finish_job('60000000-0000-0000-0000-000000000001', 'worker-a', false, 'TEST_FAILURE') $$,
  'lease owner can finish its job'
);
reset role;
select is(
  (select status from public.jobs where id = '60000000-0000-0000-0000-000000000001'),
  'failed',
  'job reaches failed after its final allowed attempt'
);

select * from finish();
rollback;
