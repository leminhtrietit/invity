begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(21);

select has_function('public','create_personal_invitation',array['uuid','text','text','text','text','uuid'],'personal invitation RPC exists');
select has_function('public','submit_shared_rsvp',array['text','text','text','text','integer','text','boolean','text','uuid'],'shared RSVP RPC exists');
select has_function('public','submit_personal_rsvp',array['text','text','integer','text','boolean','uuid'],'personal RSVP RPC exists');
select has_function('public','update_shared_rsvp',array['text','text','integer','text','boolean','uuid'],'shared edit RPC exists');
select ok(not has_function_privilege('anon','public.create_personal_invitation(uuid,text,text,text,text,uuid)','EXECUTE'),'anonymous cannot create personal invitations');
select ok(has_function_privilege('anon','public.submit_shared_rsvp(text,text,text,text,integer,text,boolean,text,uuid)','EXECUTE'),'anonymous can submit shared RSVP through guarded RPC');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','16000000-0000-0000-0000-000000000001','authenticated','authenticated','g6-owner@example.test','',now(),'{"provider":"google"}','{"name":"G6 Owner"}',now(),now());
insert into public.app_users(id,email,display_name) values('26000000-0000-0000-0000-000000000001','g6-owner@example.test','G6 Owner');
insert into public.auth_bindings(app_user_id,auth_user_id,provider,provider_subject) values('26000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','google','g6-owner');
insert into public.templates(id,name,category,renderer_version,content_schema_version) values('g6-template','G6','wedding',1,1) on conflict(id) do nothing;
insert into public.events(id,owner_app_user_id,template_id,category,lifecycle,starts_at,companion_limit,public_code)
values('46000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000001','g6-template','wedding','published',now()+interval '10 days',3,'111111111111111111111111111111111111');
insert into public.event_versions(id,event_id,version_number,template_id,renderer_version,content_schema_version,content)
values('56000000-0000-0000-0000-000000000001','46000000-0000-0000-0000-000000000001',1,'g6-template',1,1,'{"rsvp":{"enabled":true}}');
update public.events set published_version_id='56000000-0000-0000-0000-000000000001' where id='46000000-0000-0000-0000-000000000001';
insert into public.event_quota_counters(event_id) values('46000000-0000-0000-0000-000000000001');

set local role authenticated;
set local "request.jwt.claim.sub"='16000000-0000-0000-0000-000000000001';
create temp table g6_personal as select * from public.create_personal_invitation('46000000-0000-0000-0000-000000000001','Khách Riêng','Bạn thân','Đồng nghiệp',null,'66000000-0000-0000-0000-000000000001');
select is((select length(invitation_token) from g6_personal),64,'personal token has 256 bits encoded as hex');
select isnt((select token_hash from public.invitation_tokens where guest_slot_id=(select guest_slot_id from g6_personal)),(select invitation_token from g6_personal),'database does not store raw invitation token');
select is((select guest_slots_used from public.event_quota_counters where event_id='46000000-0000-0000-0000-000000000001'),1,'personal invitation consumes one slot');
select is((select invitation_token from public.create_personal_invitation('46000000-0000-0000-0000-000000000001','Khách Riêng','Bạn thân','Đồng nghiệp',null,'66000000-0000-0000-0000-000000000001')),(select invitation_token from g6_personal),'idempotent replay returns the same usable token');
create temp table g6_personal_rsvp as select * from public.submit_personal_rsvp((select invitation_token from g6_personal),'attending',2,'Chúc mừng',true,'66000000-0000-0000-0000-000000000002');
select is((select guest_slots_used from public.event_quota_counters where event_id='46000000-0000-0000-0000-000000000001'),1,'personal RSVP does not consume another slot');
select is((select companion_count::integer from public.rsvps where id=(select rsvp_id from g6_personal_rsvp)),2,'personal RSVP is attached to its guest');
create temp table g6_rotated as select public.rotate_personal_invitation('46000000-0000-0000-0000-000000000001',(select guest_slot_id from g6_personal),'66000000-0000-0000-0000-000000000003') token;
select isnt((select token from g6_rotated),(select invitation_token from g6_personal),'rotation issues a different token');
select is(public.resolve_personal_invitation((select invitation_token from g6_personal)),null,'rotated old token no longer resolves');

reset role;
insert into public.events(id,owner_app_user_id,template_id,category,lifecycle,starts_at,companion_limit,public_code)
values('46000000-0000-0000-0000-000000000002','26000000-0000-0000-0000-000000000001','g6-template','wedding','published',now()+interval '10 days',3,'222222222222222222222222222222222222');
insert into public.event_versions(id,event_id,version_number,template_id,renderer_version,content_schema_version,content)
values('56000000-0000-0000-0000-000000000002','46000000-0000-0000-0000-000000000002',1,'g6-template',1,1,'{"rsvp":{"enabled":true}}');
update public.events set published_version_id='56000000-0000-0000-0000-000000000002' where id='46000000-0000-0000-0000-000000000002';
insert into public.event_quota_counters(event_id,guest_slots_used) values('46000000-0000-0000-0000-000000000002',49);
insert into public.guest_slots(event_id,allocation_number,allocation_source,display_name)
select '46000000-0000-0000-0000-000000000002',n,'personalized','Seed '||n from generate_series(1,49)n;

set local role anon;
create temp table g6_shared as select * from public.submit_shared_rsvp('222222222222222222222222222222222222','Khách Chung','+84 912-345-678','attending',1,'Hạnh phúc nhé',false,repeat('a',64),'66000000-0000-0000-0000-000000000004');
select is((select allocation_number from g6_shared),50,'shared RSVP atomically receives the last slot');
reset role;
select is((select phone_canonical from public.guest_slots where event_id='46000000-0000-0000-0000-000000000002' and allocation_number=50),'0912345678','Vietnam phone is canonicalized');
set local role anon;
select is((select revision from public.update_shared_rsvp((select edit_secret from g6_shared),'declined',0,'Hẹn dịp khác',false,'66000000-0000-0000-0000-000000000005')),2,'shared edit succeeds after quota is full');
select throws_ok(format($q$select * from public.submit_shared_rsvp('222222222222222222222222222222222222','Người Mới','0911111111','attending',0,'',false,%L,'66000000-0000-0000-0000-000000000006')$q$,repeat('b',64)),'P0001','GUEST_QUOTA_EXCEEDED','a new shared RSVP is blocked at 50');
reset role;
select is((select count(*)::integer from public.guest_slots where event_id='46000000-0000-0000-0000-000000000002'),50,'failed shared RSVP creates no partial guest');
select is((select guest_slots_used from public.event_quota_counters where event_id='46000000-0000-0000-0000-000000000002'),50,'failed shared RSVP leaves quota at 50');
select is((select count(*)::integer from public.idempotency_requests where response_body::text like '%edit_secret%' or response_body::text like '%invitation_token%'),0,'idempotency responses contain no raw token fields');

select * from finish();
rollback;
