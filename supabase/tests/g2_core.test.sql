begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(60);

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

select has_function('public', 'delete_draft_event', array['uuid', 'uuid'], 'draft deletion RPC exists');
select has_function('public', 'switch_event_template', array['uuid', 'text', 'integer', 'uuid'], 'template switch RPC exists');
select has_function('public', 'register_media_upload', array['uuid', 'text', 'text', 'text', 'bigint', 'uuid'], 'media registration RPC exists');
select has_function('public', 'claim_media_jobs', array['text', 'integer', 'integer'], 'media worker claim RPC exists');
select ok(
  not has_function_privilege('anon', 'public.delete_draft_event(uuid,uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.delete_draft_event(uuid,uuid)', 'EXECUTE'),
  'only authenticated owners can call draft deletion RPC'
);
select is(
  public.switch_event_template(
    '40000000-0000-0000-0000-000000000003', 'garden-vow', 1,
    '30000000-0000-0000-0000-000000000010'
  ),
  2,
  'switching template increments draft revision'
);
select is(
  (select template_id from public.events where id = '40000000-0000-0000-0000-000000000003'),
  'garden-vow',
  'switching template keeps the event and updates its renderer choice'
);
reset role;
insert into storage.objects (bucket_id, name)
values (
  'event-media',
  '20000000-0000-0000-0000-000000000002/40000000-0000-0000-0000-000000000003/70000000-0000-0000-0000-000000000001.webp'
);
set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000002';
select is(
  (select status from public.register_media_upload(
    '40000000-0000-0000-0000-000000000003', 'cover',
    '20000000-0000-0000-0000-000000000002/40000000-0000-0000-0000-000000000003/70000000-0000-0000-0000-000000000001.webp',
    'cover.webp', 1024, '30000000-0000-0000-0000-000000000011'
  )),
  'uploaded',
  'owner can register a scoped media upload'
);
reset role;
select is(
  (select count(*)::integer from public.jobs where event_id = '40000000-0000-0000-0000-000000000003' and kind = 'media.process'),
  1,
  'media registration queues one processing job'
);
delete from public.jobs
where event_id = '40000000-0000-0000-0000-000000000003' and kind = 'media.process';
set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000002';
select lives_ok(
  $$ select public.delete_draft_event('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000012') $$,
  'owner can soft-delete a draft'
);
select is(
  (select lifecycle from public.events where id = '40000000-0000-0000-0000-000000000003'),
  'deleted',
  'deleted draft no longer counts as an active draft'
);

select has_function('public', 'publish_event_draft', array['uuid', 'integer', 'uuid'], 'publish RPC exists');
select has_function('public', 'change_event_lifecycle', array['uuid', 'text', 'uuid'], 'lifecycle RPC exists');
select has_function('public', 'get_public_event', array['text'], 'public event resolver exists');
select has_function('public', 'resolve_public_media', array['text', 'uuid'], 'public media resolver exists');
select has_function('public', 'is_public_media_path', array['text'], 'public storage policy helper exists');
select ok(
  not has_function_privilege('anon', 'public.publish_event_draft(uuid,integer,uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.publish_event_draft(uuid,integer,uuid)', 'EXECUTE'),
  'only authenticated owners can publish'
);
select ok(
  has_function_privilege('anon', 'public.get_public_event(text)', 'EXECUTE')
  and has_function_privilege('anon', 'public.resolve_public_media(text,uuid)', 'EXECUTE'),
  'anonymous guests can resolve only public DTO and referenced media'
);

reset role;
insert into public.events (id, owner_app_user_id, template_id, category) values
  ('40000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000002','vow-editorial','wedding'),
  ('40000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000002','vow-editorial','wedding');
insert into public.event_drafts(event_id,content) values
  ('40000000-0000-0000-0000-000000000004','{"title":"Public Wedding","hosts":[{"name":"A","role":"Host"}],"startsAt":"2026-12-20T11:00:00+07:00","venue":{"name":"Garden","address":"Saigon","mapUrl":"https://maps.google.com"},"cover":{"mediaAssetId":"70000000-0000-0000-0000-000000000002"},"rsvp":{"maxCompanions":2}}'),
  ('40000000-0000-0000-0000-000000000005','{"title":"Second Wedding","hosts":[{"name":"B","role":"Host"}],"startsAt":"2026-12-21T11:00:00+07:00","venue":{"name":"Hall","address":"Saigon","mapUrl":"https://maps.google.com"},"rsvp":{"maxCompanions":1}}');
insert into public.event_quota_counters(event_id) values
  ('40000000-0000-0000-0000-000000000004'),('40000000-0000-0000-0000-000000000005');
insert into public.media_assets(id,event_id,owner_app_user_id,kind,status,storage_key,byte_size,detected_mime_type,variants)
values('70000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000002','cover','ready','public-test/cover.webp',1024,'image/webp','{"w1280":"public-test/cover-1280.webp"}');
insert into storage.objects(bucket_id,name) values('event-media','public-test/cover-1280.webp');
set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000002';
select is((select version_number from public.publish_event_draft('40000000-0000-0000-0000-000000000004',1,'30000000-0000-0000-0000-000000000013')),1,'first publish creates version one');
select is((select lifecycle from public.events where id='40000000-0000-0000-0000-000000000004'),'published','publish activates event');
select is((public.get_public_event((select public_code from public.events where id='40000000-0000-0000-0000-000000000004'))#>>'{content,title}'),'Public Wedding','public resolver returns active immutable content');
select is(public.resolve_public_media((select public_code from public.events where id='40000000-0000-0000-0000-000000000004'),'70000000-0000-0000-0000-000000000002'),'public-test/cover-1280.webp','public resolver returns only referenced ready media');
select ok(public.is_public_media_path('public-test/cover-1280.webp'),'storage policy recognizes active published media path');
select is((select replayed from public.publish_event_draft('40000000-0000-0000-0000-000000000004',1,'30000000-0000-0000-0000-000000000013')),true,'publish retry replays without another version');
select is((select revision from public.save_event_draft('40000000-0000-0000-0000-000000000004',1,'{"title":"Updated Wedding","hosts":[{"name":"A","role":"Host"}],"startsAt":"2026-12-20T11:00:00+07:00","venue":{"name":"Garden","address":"Saigon","mapUrl":"https://maps.google.com"},"rsvp":{"maxCompanions":2}}','30000000-0000-0000-0000-000000000017')),2,'owner can keep editing draft after publication');
select is((public.get_public_event((select public_code from public.events where id='40000000-0000-0000-0000-000000000004'))#>>'{content,title}'),'Public Wedding','draft edits do not change the active snapshot');
select is(public.change_event_lifecycle('40000000-0000-0000-0000-000000000004','hidden','30000000-0000-0000-0000-000000000014'),'hidden','owner can temporarily hide publication');
select is(public.get_public_event((select public_code from public.events where id='40000000-0000-0000-0000-000000000004')),null,'hidden event has no public DTO');
select ok(not public.is_public_media_path('public-test/cover-1280.webp'),'hidden event media path is revoked immediately');
select is((select version_number from public.publish_event_draft('40000000-0000-0000-0000-000000000004',2,'30000000-0000-0000-0000-000000000015')),2,'republish creates a new active version');
select is((public.get_public_event((select public_code from public.events where id='40000000-0000-0000-0000-000000000004'))#>>'{content,title}'),'Updated Wedding','republish atomically exposes the new snapshot');
select is((select count(*)::integer from public.publication_usage where event_id='40000000-0000-0000-0000-000000000004'),1,'event consumes monthly quota once across updates');
select is((select count(distinct public_code)::integer from public.events where id='40000000-0000-0000-0000-000000000004'),1,'public code remains stable');
select throws_ok(
  $$ select * from public.publish_event_draft('40000000-0000-0000-0000-000000000005',1,'30000000-0000-0000-0000-000000000016') $$,
  'P0001','EVENT_QUOTA_EXCEEDED','second first publication in Vietnam month is rejected'
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
select ok(
  not has_function_privilege('anon', 'public.claim_media_jobs(text,integer,integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.claim_media_jobs(text,integer,integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.claim_media_jobs(text,integer,integer)', 'EXECUTE'),
  'only service role can claim media jobs'
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
