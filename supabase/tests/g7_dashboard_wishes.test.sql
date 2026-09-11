begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(12);

select has_function('public','moderate_wish',array['uuid','uuid','text','uuid'],'wish moderation RPC exists');
select has_function('public','get_public_wishes',array['text'],'public wish resolver exists');
select ok(not has_function_privilege('anon','public.moderate_wish(uuid,uuid,text,uuid)','EXECUTE'),'anonymous cannot moderate wishes');
select ok(has_function_privilege('anon','public.get_public_wishes(text)','EXECUTE'),'anonymous can read approved public wishes');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','17000000-0000-0000-0000-000000000001','authenticated','authenticated','g7-a@example.test','',now(),'{"provider":"google"}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','17000000-0000-0000-0000-000000000002','authenticated','authenticated','g7-b@example.test','',now(),'{"provider":"google"}','{}',now(),now());
insert into public.app_users(id,email,display_name) values('27000000-0000-0000-0000-000000000001','g7-a@example.test','G7 A'),('27000000-0000-0000-0000-000000000002','g7-b@example.test','G7 B');
insert into public.auth_bindings(app_user_id,auth_user_id,provider,provider_subject) values('27000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000001','google','g7-a'),('27000000-0000-0000-0000-000000000002','17000000-0000-0000-0000-000000000002','google','g7-b');
insert into public.templates(id,name,category,renderer_version,content_schema_version) values('g7-template','G7','wedding',1,1) on conflict(id) do nothing;
insert into public.events(id,owner_app_user_id,template_id,category,lifecycle,starts_at,public_code) values('47000000-0000-0000-0000-000000000001','27000000-0000-0000-0000-000000000001','g7-template','wedding','published',now()+interval '10 days','777777777777777777777777777777777777');
insert into public.event_versions(id,event_id,version_number,template_id,renderer_version,content_schema_version,content) values('57000000-0000-0000-0000-000000000001','47000000-0000-0000-0000-000000000001',1,'g7-template',1,1,'{"rsvp":{"enabled":true}}');
update public.events set published_version_id='57000000-0000-0000-0000-000000000001' where id='47000000-0000-0000-0000-000000000001';
insert into public.event_quota_counters(event_id,guest_slots_used) values('47000000-0000-0000-0000-000000000001',3);
insert into public.guest_slots(id,event_id,allocation_number,allocation_source,display_name,phone_canonical,owner_note) values
('67000000-0000-0000-0000-000000000001','47000000-0000-0000-0000-000000000001',1,'shared_rsvp','Khách Riêng Tư','0911111111','secret note'),
('67000000-0000-0000-0000-000000000002','47000000-0000-0000-0000-000000000001',2,'shared_rsvp','Khách Chờ Duyệt','0922222222',null),
('67000000-0000-0000-0000-000000000003','47000000-0000-0000-0000-000000000001',3,'shared_rsvp','Khách Công Khai','0933333333',null);
insert into public.wishes(event_id,guest_slot_id,content,consent_public,moderation_status) values
('47000000-0000-0000-0000-000000000001','67000000-0000-0000-0000-000000000001','Lời riêng tư',false,'private'),
('47000000-0000-0000-0000-000000000001','67000000-0000-0000-0000-000000000002','Lời đang chờ',true,'pending'),
('47000000-0000-0000-0000-000000000001','67000000-0000-0000-0000-000000000003','Trăm năm hạnh phúc',true,'approved');

set local role anon;
select is(jsonb_array_length(public.get_public_wishes('777777777777777777777777777777777777')),1,'only approved and consented wish is public');
select is(public.get_public_wishes('777777777777777777777777777777777777')->0->>'message','Trăm năm hạnh phúc','public resolver returns approved content');
select ok(public.get_public_wishes('777777777777777777777777777777777777')::text not like '%0911111111%' and public.get_public_wishes('777777777777777777777777777777777777')::text not like '%secret note%','public wish DTO contains no phone or owner note');

set local role authenticated;
set local "request.jwt.claim.sub"='17000000-0000-0000-0000-000000000002';
select throws_ok($$select public.moderate_wish('47000000-0000-0000-0000-000000000001','67000000-0000-0000-0000-000000000002','approved','77000000-0000-0000-0000-000000000001')$$,'P0002','NOT_FOUND','another owner cannot moderate the wish');
set local "request.jwt.claim.sub"='17000000-0000-0000-0000-000000000001';
select throws_ok($$select public.moderate_wish('47000000-0000-0000-0000-000000000001','67000000-0000-0000-0000-000000000001','approved','77000000-0000-0000-0000-000000000002')$$,'P0001','WISH_CONSENT_REQUIRED','owner cannot publish a wish without guest consent');
select is(public.moderate_wish('47000000-0000-0000-0000-000000000001','67000000-0000-0000-0000-000000000002','approved','77000000-0000-0000-0000-000000000003'),'approved','owner can approve a consented wish');
reset role;
select is(jsonb_array_length(public.get_public_wishes('777777777777777777777777777777777777')),2,'newly approved wish becomes public immediately');
update public.wishes set consent_public=false,moderation_status='private' where guest_slot_id='67000000-0000-0000-0000-000000000003';
select is(jsonb_array_length(public.get_public_wishes('777777777777777777777777777777777777')),1,'withdrawing consent hides an approved wish immediately');

select * from finish();
rollback;
