begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(24);

select has_table('public','upgrade_waitlist','waitlist table exists');
select has_table('public','product_events','privacy-safe analytics table exists');
select has_table('public','app_user_roles','admin role table exists');
select has_function('public','join_upgrade_waitlist',array['text','boolean','uuid'],'waitlist RPC exists');
select has_function('public','admin_dashboard',array[]::text[],'admin dashboard RPC exists');
select has_function('public','request_account_deletion',array['text','uuid'],'account deletion RPC exists');
select ok(not has_table_privilege('anon','public.product_events','SELECT'),'anonymous cannot read analytics rows');
select ok(not has_table_privilege('authenticated','public.app_user_roles','SELECT'),'users cannot enumerate admin roles');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','19000000-0000-0000-0000-000000000001','authenticated','authenticated','g9-admin@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','19000000-0000-0000-0000-000000000002','authenticated','authenticated','g9-user@example.test','',now(),'{}','{}',now(),now());
insert into public.app_users(id,email,display_name) values('29000000-0000-0000-0000-000000000001','g9-admin@example.test','G9 Admin'),('29000000-0000-0000-0000-000000000002','g9-user@example.test','G9 User');
insert into public.auth_bindings(app_user_id,auth_user_id,provider,provider_subject) values('29000000-0000-0000-0000-000000000001','19000000-0000-0000-0000-000000000001','google','g9-admin'),('29000000-0000-0000-0000-000000000002','19000000-0000-0000-0000-000000000002','google','g9-user');
insert into public.app_user_roles(app_user_id,role) values('29000000-0000-0000-0000-000000000001','admin');
insert into public.events(id,owner_app_user_id,template_id,category,lifecycle,public_code) values('49000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000002','vow-editorial','wedding','published','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
insert into public.guest_slots(id,event_id,allocation_number,allocation_source,display_name) values('69000000-0000-0000-0000-000000000001','49000000-0000-0000-0000-000000000001',1,'personalized','Khách thử');
insert into public.invitation_tokens(guest_slot_id,token_hash) values('69000000-0000-0000-0000-000000000001','g9-token-hash');

set local role authenticated;
set local "request.jwt.claim.sub"='19000000-0000-0000-0000-000000000002';
select throws_ok($$select public.join_upgrade_waitlist('pro',false,'99000000-0000-0000-0000-000000000001')$$,'22023','CONSENT_REQUIRED','waitlist requires separate consent');
select is(public.join_upgrade_waitlist('pro',true,'99000000-0000-0000-0000-000000000002')->>'planInterest','pro','user can join Pro waitlist');
select is(public.join_upgrade_waitlist('premium',true,'99000000-0000-0000-0000-000000000003')->>'planInterest','premium','repeat join updates one record idempotently by user');
select is((select count(*)::integer from public.upgrade_waitlist where app_user_id='29000000-0000-0000-0000-000000000002'),1,'waitlist keeps one record per user');
select throws_ok($$select public.admin_dashboard()$$,'42501','FORBIDDEN','regular user cannot access admin dashboard');

set local "request.jwt.claim.sub"='19000000-0000-0000-0000-000000000001';
select is((public.admin_dashboard()#>>'{counts,users}')::integer,2,'admin can read operational summary');
select ok(public.admin_action('template.enabled','vow-editorial','false','99000000-0000-0000-0000-000000000004'),'admin can disable template for new events');
select ok(not (select enabled_for_new from public.templates where id='vow-editorial'),'disabled template state is persisted');
select ok(public.admin_action('event.lifecycle','49000000-0000-0000-0000-000000000001','hidden','99000000-0000-0000-0000-000000000005'),'admin can hide an event');
reset role;
select is((select lifecycle from public.events where id='49000000-0000-0000-0000-000000000001'),'hidden','event is hidden immediately');

set local role authenticated;
set local "request.jwt.claim.sub"='19000000-0000-0000-0000-000000000002';
select ok(public.request_account_deletion('XOA TAI KHOAN','99000000-0000-0000-0000-000000000006'),'owner can request account deletion');
reset role;
select is((select status from public.app_users where id='29000000-0000-0000-0000-000000000002'),'deletion_requested','account access is disabled immediately');
select is((select lifecycle from public.events where id='49000000-0000-0000-0000-000000000001'),'deleted','owned events are removed from public access');
select ok((select revoked_at is not null from public.invitation_tokens where guest_slot_id='69000000-0000-0000-0000-000000000001'),'guest token is revoked immediately');

set local role anon;
select ok(public.track_product_event('template_viewed','anonymous-session-key-1234567890',null,'vow-editorial'),'anonymous funnel event can be recorded');
reset role;
select ok((select anonymous_hash<>'anonymous-session-key-1234567890' and char_length(anonymous_hash)=64 from public.product_events where event_name='template_viewed' order by id desc limit 1),'analytics stores only a one-way hash');

select * from finish();
rollback;
