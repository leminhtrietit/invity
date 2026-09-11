begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(17);

select has_function('public','list_gift_accounts',array['uuid'],'owner gift account resolver exists');
select has_function('public','upsert_gift_account',array['uuid','uuid','integer','text','text','text','text','boolean','uuid'],'gift account writer exists');
select has_function('public','get_public_gift_options',array['text'],'public masked options resolver exists');
select has_function('public','resolve_public_gift_recipient',array['text','uuid'],'deliberate public recipient resolver exists');
select ok(not has_function_privilege('anon','public.list_gift_accounts(uuid)','EXECUTE'),'anonymous cannot list decrypted owner accounts');
select ok(has_function_privilege('anon','public.get_public_gift_options(text)','EXECUTE'),'anonymous can list masked confirmed options');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','18000000-0000-0000-0000-000000000001','authenticated','authenticated','g8-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','18000000-0000-0000-0000-000000000002','authenticated','authenticated','g8-b@example.test','',now(),'{}','{}',now(),now());
insert into public.app_users(id,email,display_name) values('28000000-0000-0000-0000-000000000001','g8-a@example.test','G8 A'),('28000000-0000-0000-0000-000000000002','g8-b@example.test','G8 B');
insert into public.auth_bindings(app_user_id,auth_user_id,provider,provider_subject) values('28000000-0000-0000-0000-000000000001','18000000-0000-0000-0000-000000000001','google','g8-a'),('28000000-0000-0000-0000-000000000002','18000000-0000-0000-0000-000000000002','google','g8-b');
insert into public.templates(id,name,category,renderer_version,content_schema_version) values('g8-template','G8','wedding',1,1) on conflict(id) do nothing;
insert into public.events(id,owner_app_user_id,template_id,category,lifecycle,public_code,first_published_at) values
('48000000-0000-0000-0000-000000000001','28000000-0000-0000-0000-000000000001','g8-template','wedding','published','888888888888888888888888888888888888',now()),
('48000000-0000-0000-0000-000000000002','28000000-0000-0000-0000-000000000002','g8-template','wedding','published','999999999999999999999999999999999999',now());
insert into public.event_versions(id,event_id,version_number,template_id,renderer_version,content_schema_version,content) values
('58000000-0000-0000-0000-000000000001','48000000-0000-0000-0000-000000000001',1,'g8-template',1,1,'{"gift":{"enabled":true}}'),
('58000000-0000-0000-0000-000000000002','48000000-0000-0000-0000-000000000002',1,'g8-template',1,1,'{"gift":{"enabled":true}}');
update public.events set published_version_id=case id when '48000000-0000-0000-0000-000000000001' then '58000000-0000-0000-0000-000000000001'::uuid else '58000000-0000-0000-0000-000000000002'::uuid end where id in ('48000000-0000-0000-0000-000000000001','48000000-0000-0000-0000-000000000002');

set local role authenticated;
set local "request.jwt.claim.sub"='18000000-0000-0000-0000-000000000001';
select set_config('request.jwt.claims',json_build_object('sub','18000000-0000-0000-0000-000000000001','iat',extract(epoch from now())::bigint)::text,true);
select is((public.upsert_gift_account('48000000-0000-0000-0000-000000000001',null,1,'Cô dâu','VCB','0123456789','NGUYEN AN',true,'88000000-0000-0000-0000-000000000001')->>'accountNumber'),'0123456789','owner can save and read back a confirmed account');
select ok((select account_number_ciphertext<>convert_to('0123456789','utf8') and encode(account_number_ciphertext,'escape') not like '%0123456789%' from public.gift_accounts where event_id='48000000-0000-0000-0000-000000000001'),'stored value is encrypted rather than plaintext');
select throws_ok($$select public.upsert_gift_account('48000000-0000-0000-0000-000000000001',null,1,'Duplicate','TCB','9999999999','TEST USER',true,'88000000-0000-0000-0000-000000000002')$$,'23505','GIFT_POSITION_OCCUPIED','only one account can occupy each of the two positions');
select set_config('request.jwt.claims',json_build_object('sub','18000000-0000-0000-0000-000000000001','iat',(extract(epoch from now())-3600)::bigint)::text,true);
select throws_ok($$select public.upsert_gift_account('48000000-0000-0000-0000-000000000001',(select id from public.gift_accounts where event_id='48000000-0000-0000-0000-000000000001'),1,'Cô dâu','VCB','0123456789','NGUYEN AN',true,'88000000-0000-0000-0000-000000000003')$$,'P0001','RECENT_AUTH_REQUIRED','published account edit requires a session issued within 15 minutes');

set local "request.jwt.claim.sub"='18000000-0000-0000-0000-000000000002';
select set_config('request.jwt.claims',json_build_object('sub','18000000-0000-0000-0000-000000000002','iat',extract(epoch from now())::bigint)::text,true);
select is(jsonb_array_length(public.list_gift_accounts('48000000-0000-0000-0000-000000000001')),0,'another owner cannot list decrypted accounts');
select is((public.upsert_gift_account('48000000-0000-0000-0000-000000000002',null,1,'Gia đình','TCB','9876543210','TRAN BINH',true,'88000000-0000-0000-0000-000000000004')->>'bankId'),'TCB','second owner can configure their own event');

reset role;
select is(jsonb_array_length(public.get_public_gift_options('888888888888888888888888888888888888')),1,'public options include confirmed enabled recipient');
select ok(public.get_public_gift_options('888888888888888888888888888888888888')::text not like '%0123456789%','masked public options omit full account number');
select is(public.get_public_gift_options('888888888888888888888888888888888888')->0->>'last4','6789','masked public options expose only last four digits');
select is(public.resolve_public_gift_recipient('888888888888888888888888888888888888',(select id from public.gift_accounts where event_id='48000000-0000-0000-0000-000000000001'))->>'accountNumber','0123456789','deliberate resolver returns the correct recipient');
select is(public.resolve_public_gift_recipient('888888888888888888888888888888888888',(select id from public.gift_accounts where event_id='48000000-0000-0000-0000-000000000002')),null,'recipient id from another event cannot be resolved');

select * from finish();
rollback;
