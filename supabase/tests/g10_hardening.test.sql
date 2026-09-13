begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(22);

select has_table('public','public_request_limits','public rate-limit table exists');
select has_function('private','consume_public_limit',array['text','text','integer','integer'],'shared rate limiter exists');
select has_function('public','submit_abuse_report',array['text','text','text'],'report endpoint requires a fingerprint');
select has_function('public','run_retention_maintenance',array[]::text[],'retention maintenance exists');
select has_function('public','purge_account_data',array['uuid','uuid','text'],'leased account purge exists');
select has_function('public','claim_user_media_jobs',array['uuid','text','integer','integer'],'owner-scoped media claim exists');
select ok(not has_table_privilege('anon','public.public_request_limits','SELECT'),'anonymous users cannot inspect rate limits');
select ok(not has_table_privilege('authenticated','public.public_request_limits','SELECT'),'signed-in users cannot inspect rate limits');
select ok(not has_function_privilege('anon','public.run_retention_maintenance()','EXECUTE'),'anonymous users cannot run retention');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','1a000000-0000-0000-0000-000000000001','authenticated','authenticated','g10-user@example.test','',now(),'{}','{}',now(),now());
insert into public.app_users(id,email,display_name) values('2a000000-0000-0000-0000-000000000001','g10-user@example.test','G10 User');
insert into public.auth_bindings(app_user_id,auth_user_id,provider,provider_subject) values('2a000000-0000-0000-0000-000000000001','1a000000-0000-0000-0000-000000000001','google','g10-user');
insert into public.events(id,owner_app_user_id,template_id,category,lifecycle,public_code) values('4a000000-0000-0000-0000-000000000001','2a000000-0000-0000-0000-000000000001','vow-editorial','wedding','published','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');

set local role anon;
select lives_ok($test$do $block$ begin for i in 1..5 loop perform public.submit_abuse_report('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','Nội dung cần kiểm tra','report-fingerprint-key-1234567890');end loop;end $block$;$test$,'first five reports in an hour are accepted');
reset role;
select is((select count(*)::integer from public.abuse_reports where event_id='4a000000-0000-0000-0000-000000000001'),5,'accepted reports are recorded');
set local role anon;
select throws_ok($$select public.submit_abuse_report('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','Báo cáo thứ sáu','report-fingerprint-key-1234567890')$$,'P0001','RATE_LIMITED','sixth report is rate limited');
select lives_ok($test$do $block$ begin for i in 1..120 loop perform public.track_product_event('template_viewed','analytics-fingerprint-key-1234567890',null,'vow-editorial');end loop;end $block$;$test$,'analytics accepts the bounded ten-minute volume');
reset role;
select is((select count(*)::integer from public.product_events where event_name='template_viewed'),120,'analytics stores only accepted events');
set local role anon;
select throws_ok($$select public.track_product_event('template_viewed','analytics-fingerprint-key-1234567890',null,'vow-editorial')$$,'P0001','RATE_LIMITED','analytics rejects excess volume');
reset role;

insert into public.public_request_limits values('expired',repeat('a',64),now()-interval '3 days',1);
insert into public.idempotency_requests(actor_key,route,idempotency_key,payload_hash,expires_at) values('expired','/expired','9a000000-0000-0000-0000-000000000001',repeat('b',64),now()-interval '1 minute');
insert into public.product_events(event_name,anonymous_hash,occurred_at) values('template_viewed',repeat('c',64),now()-interval '181 days');
insert into public.media_assets(id,event_id,owner_app_user_id,kind,status,storage_key,byte_size,failure_code,updated_at) values('7a000000-0000-0000-0000-000000000001','4a000000-0000-0000-0000-000000000001','2a000000-0000-0000-0000-000000000001','cover','failed','g10/failed.webp',1,'TEST',now()-interval '8 days');
set local role service_role;
select lives_ok($$select public.run_retention_maintenance()$$,'service role can run retention maintenance');
reset role;
select is((select count(*)::integer from public.public_request_limits where scope='expired'),0,'old rate limits are removed');
select is((select count(*)::integer from public.idempotency_requests where actor_key='expired'),0,'expired idempotency keys are removed');
select is((select count(*)::integer from public.product_events where anonymous_hash=repeat('c',64)),0,'expired analytics rows are removed');
select is((select count(*)::integer from public.jobs where kind='media.cleanup' and payload->>'mediaAssetId'='7a000000-0000-0000-0000-000000000001'),1,'failed media receives one cleanup job');

set local role authenticated;
set local "request.jwt.claim.sub"='1a000000-0000-0000-0000-000000000001';
select ok(public.request_account_deletion('XOA TAI KHOAN','9a000000-0000-0000-0000-000000000002'),'account deletion request is accepted');
reset role;
select ok((select available_at>=created_at+interval '29 days 23 hours' from public.jobs where kind='account.delete' and payload->>'appUserId'='2a000000-0000-0000-0000-000000000001'),'physical account purge respects the 30-day retention period');

select * from finish();
rollback;
