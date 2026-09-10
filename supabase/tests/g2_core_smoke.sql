-- Plain PostgreSQL smoke test used when pgTAP/Supabase CLI is unavailable.
-- Run after bootstrap_plain_postgres.sql and all migrations. Every failure aborts the transaction.
begin;

insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'owner-a@example.test', '{"provider":"google"}', '{"name":"Owner A"}'),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'owner-b@example.test', '{"provider":"google"}', '{"name":"Owner B"}');
insert into public.app_users (id, email, display_name) values
  ('20000000-0000-0000-0000-000000000001', 'owner-a@example.test', 'Owner A'),
  ('20000000-0000-0000-0000-000000000002', 'owner-b@example.test', 'Owner B');
insert into public.auth_bindings (app_user_id, auth_user_id, provider, provider_subject) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'google', 'google-owner-a'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'google', 'google-owner-b');
insert into public.templates (id, name, category, renderer_version, content_schema_version)
values ('vow-editorial', 'Vow Editorial', 'wedding', 1, 1);

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';

do $$
declare
  created record;
  replay record;
  saved record;
begin
  select * into created from public.create_event_draft(
    'vow-editorial', 'wedding', '30000000-0000-0000-0000-000000000001'
  );
  if created.revision <> 1 or created.replayed then raise exception 'create event assertion failed'; end if;

  select * into replay from public.create_event_draft(
    'vow-editorial', 'wedding', '30000000-0000-0000-0000-000000000001'
  );
  if replay.event_id <> created.event_id or not replay.replayed then raise exception 'idempotent replay assertion failed'; end if;

  begin
    perform public.create_event_draft('vow-editorial', 'other', '30000000-0000-0000-0000-000000000001');
    raise exception 'expected IDEMPOTENCY_CONFLICT';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'IDEMPOTENCY_CONFLICT' then raise; end if;
  end;

  select * into saved from public.save_event_draft(
    created.event_id, 1, '{"title":"A wedding"}', '30000000-0000-0000-0000-000000000002'
  );
  if saved.revision <> 2 then raise exception 'draft revision assertion failed'; end if;

  begin
    perform public.save_event_draft(
      created.event_id, 1, '{"title":"stale"}', '30000000-0000-0000-0000-000000000003'
    );
    raise exception 'expected REVISION_CONFLICT';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'REVISION_CONFLICT' then raise; end if;
  end;
end
$$;

reset role;
update public.event_quota_counters set guest_slots_used = 49;
insert into public.guest_slots (event_id, allocation_number, allocation_source, display_name)
select e.id, n, 'personalized', 'Guest ' || n
from public.events e cross join generate_series(1, 49) n;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';
do $$
declare
  target_event_id uuid := (select id from public.events limit 1);
  allocated record;
begin
  select * into allocated from public.allocate_personal_guest_slot(
    target_event_id, 'Last Guest', null, null, null, '30000000-0000-0000-0000-000000000004'
  );
  if allocated.allocation_number <> 50 then raise exception 'last guest allocation assertion failed'; end if;
  begin
    perform public.allocate_personal_guest_slot(
      target_event_id, 'Overflow Guest', null, null, null, '30000000-0000-0000-0000-000000000005'
    );
    raise exception 'expected GUEST_QUOTA_EXCEEDED';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'GUEST_QUOTA_EXCEEDED' then raise; end if;
  end;
  if (select guest_slots_used from public.event_quota_counters where event_quota_counters.event_id = target_event_id) <> 50 then
    raise exception 'guest counter assertion failed';
  end if;
end
$$;

reset role;
insert into public.events (id, owner_app_user_id, template_id, category)
values
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'vow-editorial', 'wedding'),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'vow-editorial', 'wedding');
insert into public.event_drafts (event_id) values
  ('40000000-0000-0000-0000-000000000002'), ('40000000-0000-0000-0000-000000000003');
insert into public.event_quota_counters (event_id) values
  ('40000000-0000-0000-0000-000000000002'), ('40000000-0000-0000-0000-000000000003');
insert into public.event_versions (id, event_id, version_number, template_id, renderer_version, content_schema_version, content)
values
  ('50000000-0000-0000-0000-000000000001', (select id from public.events where id <> '40000000-0000-0000-0000-000000000002' and id <> '40000000-0000-0000-0000-000000000003'), 1, 'vow-editorial', 1, 1, '{}'),
  ('50000000-0000-0000-0000-000000000002', (select id from public.events where id <> '40000000-0000-0000-0000-000000000002' and id <> '40000000-0000-0000-0000-000000000003'), 2, 'vow-editorial', 1, 1, '{}'),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', 1, 'vow-editorial', 1, 1, '{}');

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';
do $$
declare
  original_event uuid := (select id from public.events where id <> '40000000-0000-0000-0000-000000000002' and id <> '40000000-0000-0000-0000-000000000003');
  activation record;
begin
  select * into activation from public.activate_event_version(
    original_event, '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000006'
  );
  if not activation.first_publication then raise exception 'first publication assertion failed'; end if;
  select * into activation from public.activate_event_version(
    original_event, '50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000007'
  );
  if activation.first_publication then raise exception 'update publication assertion failed'; end if;
  begin
    perform public.activate_event_version(
      '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003',
      '30000000-0000-0000-0000-000000000008'
    );
    raise exception 'expected EVENT_QUOTA_EXCEEDED';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'EVENT_QUOTA_EXCEEDED' then raise; end if;
  end;
end
$$;

set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000002';
do $$
begin
  if (select count(*) from public.events where owner_app_user_id = '20000000-0000-0000-0000-000000000001') <> 0 then
    raise exception 'RLS isolation assertion failed';
  end if;
  begin
    perform public.save_event_draft(
      '40000000-0000-0000-0000-000000000002', 1, '{}', '30000000-0000-0000-0000-000000000009'
    );
    raise exception 'expected NOT_FOUND';
  exception when sqlstate 'P0002' then
    if sqlerrm <> 'NOT_FOUND' then raise; end if;
  end;
end
$$;

reset role;
do $$
begin
  if public.vietnam_month_key('2026-12-31 16:59:59+00') <> '2026-12-01' then
    raise exception 'Vietnam December boundary assertion failed';
  end if;
  if public.vietnam_month_key('2026-12-31 17:00:00+00') <> '2027-01-01' then
    raise exception 'Vietnam January boundary assertion failed';
  end if;
end
$$;

insert into public.jobs (id, kind, max_attempts)
values ('60000000-0000-0000-0000-000000000001', 'test', 1);
set local role service_role;
do $$
declare claimed record;
begin
  select * into claimed from public.claim_jobs('worker-a', 1, 10);
  if claimed.id <> '60000000-0000-0000-0000-000000000001' or claimed.status <> 'running' then
    raise exception 'job claim assertion failed';
  end if;
  perform public.finish_job(claimed.id, 'worker-a', false, 'TEST_FAILURE');
end
$$;
reset role;
do $$
begin
  if (select status from public.jobs where id = '60000000-0000-0000-0000-000000000001') <> 'failed' then
    raise exception 'job terminal failure assertion failed';
  end if;
end
$$;

rollback;
