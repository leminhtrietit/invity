create table public.app_user_roles (
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now(),
  primary key(app_user_id,role)
);

update public.templates set name=case id
  when 'silk-promise' then 'Trầu Cau' when 'garden-vow' then 'Modern Romance'
  when 'midnight-toast' then 'Evening Toast' when 'little-orbit' then 'Little Cloud'
  when 'confetti-club' then 'Birthday Studio' when 'linen-table' then 'Warm Gathering'
  when 'afterglow' then 'The Promise' when 'reunion-notes' then 'Class of Us' else name end,
  category=case when id='reunion-notes' then 'graduation' else category end;

create table public.upgrade_waitlist (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null unique references public.app_users(id) on delete cascade,
  plan_interest text not null check (plan_interest in ('pro','premium')),
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_events (
  id bigint generated always as identity primary key,
  event_name text not null check (event_name in ('template_viewed','template_selected','draft_created','event_published','invitation_opened','rsvp_submitted','qr_generated')),
  actor_app_user_id uuid references public.app_users(id) on delete set null,
  anonymous_hash text check (anonymous_hash is null or char_length(anonymous_hash)=64),
  event_id uuid references public.events(id) on delete set null,
  template_id text,
  occurred_at timestamptz not null default now(),
  check (actor_app_user_id is not null or anonymous_hash is not null)
);
create index product_events_funnel_idx on public.product_events(event_name,occurred_at desc);

alter table public.app_user_roles enable row level security;
alter table public.upgrade_waitlist enable row level security;
alter table public.product_events enable row level security;
revoke all on public.app_user_roles,public.upgrade_waitlist,public.product_events from public,anon,authenticated;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.app_user_roles where app_user_id=public.current_app_user_id() and role='admin') $$;

create policy own_waitlist_read on public.upgrade_waitlist for select to authenticated using(app_user_id=public.current_app_user_id());
grant select on public.upgrade_waitlist to authenticated;

create or replace function public.join_upgrade_waitlist(p_plan_interest text,p_consent boolean,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare app_id uuid:=public.current_app_user_id(); result public.upgrade_waitlist;
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if not p_consent or p_plan_interest not in ('pro','premium') then raise exception 'CONSENT_REQUIRED' using errcode='22023'; end if;
  insert into public.upgrade_waitlist(app_user_id,plan_interest,consent_at) values(app_id,p_plan_interest,now())
  on conflict(app_user_id) do update set plan_interest=excluded.plan_interest,consent_at=excluded.consent_at,updated_at=now()
  returning * into result;
  insert into public.audit_logs(actor_type,actor_ref,action,request_id,metadata) values('owner',app_id::text,'waitlist.joined',p_request_id,jsonb_build_object('planInterest',p_plan_interest));
  return jsonb_build_object('planInterest',result.plan_interest,'consentAt',result.consent_at);
end $$;

create or replace function public.track_product_event(p_event_name text,p_anonymous_key text,p_event_id uuid,p_template_id text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare app_id uuid:=public.current_app_user_id(); safe_event_id uuid;
begin
  if p_event_name not in ('template_viewed','template_selected','draft_created','event_published','invitation_opened','rsvp_submitted','qr_generated') then raise exception 'VALIDATION_ERROR' using errcode='22023'; end if;
  if app_id is null and (p_anonymous_key is null or char_length(p_anonymous_key) not between 20 and 100) then raise exception 'VALIDATION_ERROR' using errcode='22023'; end if;
  if p_event_id is not null and (private.is_event_owner(p_event_id) or exists(select 1 from public.events where id=p_event_id and lifecycle='published')) then safe_event_id:=p_event_id; end if;
  insert into public.product_events(event_name,actor_app_user_id,anonymous_hash,event_id,template_id)
  values(p_event_name,app_id,case when app_id is null then private.hash_secret('analytics:'||p_anonymous_key) end,safe_event_id,
    case when p_template_id in (select id from public.templates) then p_template_id end);
  return true;
end $$;

create or replace function public.request_account_deletion(p_confirmation text,p_request_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare app_id uuid:=public.current_app_user_id();
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if p_confirmation<>'XOA TAI KHOAN' then raise exception 'CONFIRMATION_REQUIRED' using errcode='22023'; end if;
  update public.events set lifecycle='deleted',deleted_at=coalesce(deleted_at,now()) where owner_app_user_id=app_id and lifecycle<>'deleted';
  update public.invitation_tokens t set revoked_at=coalesce(t.revoked_at,now()) from public.guest_slots g,public.events e where t.guest_slot_id=g.id and g.event_id=e.id and e.owner_app_user_id=app_id;
  insert into public.jobs(kind,payload,max_attempts) values('account.delete',jsonb_build_object('appUserId',app_id),5);
  insert into public.audit_logs(actor_type,actor_ref,action,request_id) values('owner',app_id::text,'account.deletion_requested',p_request_id);
  update public.app_users set status='deletion_requested',updated_at=now() where id=app_id;
  return true;
end $$;

create or replace function public.admin_dashboard()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
  if not private.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return jsonb_build_object(
    'counts',jsonb_build_object('users',(select count(*) from public.app_users),'events',(select count(*) from public.events where lifecycle<>'deleted'),'openReports',(select count(*) from public.abuse_reports where status in ('open','reviewing')),'failedJobs',(select count(*) from public.jobs where status='failed')),
    'templates',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'enabled',enabled_for_new) order by name),'[]'::jsonb) from public.templates),
    'reports',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'eventId',event_id,'reason',reason,'status',status,'createdAt',created_at) order by created_at desc),'[]'::jsonb) from (select * from public.abuse_reports order by created_at desc limit 30) r),
    'jobs',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'status',status,'attempts',attempts,'maxAttempts',max_attempts,'lastErrorCode',last_error_code,'createdAt',created_at) order by created_at desc),'[]'::jsonb) from (select * from public.jobs order by created_at desc limit 30) j),
    'users',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'email',email,'displayName',display_name,'status',status,'createdAt',created_at) order by created_at desc),'[]'::jsonb) from (select * from public.app_users order by created_at desc limit 30) u),
    'events',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'ownerId',owner_app_user_id,'lifecycle',lifecycle,'publicCode',public_code,'updatedAt',updated_at) order by updated_at desc),'[]'::jsonb) from (select * from public.events where lifecycle<>'deleted' order by updated_at desc limit 30) e),
    'funnel',(select coalesce(jsonb_object_agg(event_name,total),'{}'::jsonb) from (select event_name,count(*) total from public.product_events where occurred_at>=now()-interval '30 days' group by event_name) f)
  );
end $$;

create or replace function public.admin_action(p_action text,p_target_id text,p_value text,p_request_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare app_id uuid:=public.current_app_user_id(); target_event uuid;
begin
  if not private.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_action='template.enabled' then
    update public.templates set enabled_for_new=(p_value='true') where id=p_target_id;if not found then raise exception 'NOT_FOUND' using errcode='P0002';end if;
  elsif p_action='report.status' and p_value in ('reviewing','resolved','dismissed') then
    update public.abuse_reports set status=p_value,resolved_at=case when p_value in ('resolved','dismissed') then now() end where id=p_target_id::uuid;if not found then raise exception 'NOT_FOUND' using errcode='P0002';end if;
  elsif p_action='event.lifecycle' and p_value in ('hidden','cancelled') then
    update public.events set lifecycle=p_value where id=p_target_id::uuid and lifecycle<>'deleted' returning id into target_event;if target_event is null then raise exception 'NOT_FOUND' using errcode='P0002';end if;
  elsif p_action='user.status' and p_value in ('active','suspended') then
    update public.app_users set status=p_value,updated_at=now() where id=p_target_id::uuid and id<>app_id;if not found then raise exception 'NOT_FOUND' using errcode='P0002';end if;
  elsif p_action='job.retry' then
    update public.jobs set status='queued',available_at=now(),locked_by=null,locked_until=null,last_error_code=null,updated_at=now() where id=p_target_id::uuid and status='failed';if not found then raise exception 'NOT_FOUND' using errcode='P0002';end if;
  else raise exception 'VALIDATION_ERROR' using errcode='22023';
  end if;
  insert into public.audit_logs(event_id,actor_type,actor_ref,action,request_id,metadata) values(target_event,'admin',app_id::text,'admin.'||p_action,p_request_id,jsonb_build_object('targetId',p_target_id,'value',p_value));
  return true;
end $$;

revoke all on function private.is_admin() from public,anon,authenticated;
revoke all on function public.join_upgrade_waitlist(text,boolean,uuid) from public,anon;
revoke all on function public.track_product_event(text,text,uuid,text) from public;
revoke all on function public.request_account_deletion(text,uuid) from public,anon;
revoke all on function public.admin_dashboard() from public,anon;
revoke all on function public.admin_action(text,text,text,uuid) from public,anon;
grant execute on function public.join_upgrade_waitlist(text,boolean,uuid) to authenticated;
grant execute on function public.track_product_event(text,text,uuid,text) to anon,authenticated;
grant execute on function public.request_account_deletion(text,uuid) to authenticated;
grant execute on function public.admin_dashboard() to authenticated;
grant execute on function public.admin_action(text,text,text,uuid) to authenticated;

create or replace function public.submit_abuse_report(p_public_code text,p_reason text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare target_event uuid; result uuid;
begin
  if char_length(trim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'VALIDATION_ERROR' using errcode='22023';end if;
  select id into target_event from public.events where public_code=p_public_code and lifecycle='published';
  if target_event is null then raise exception 'NOT_FOUND' using errcode='P0002';end if;
  insert into public.abuse_reports(event_id,reason) values(target_event,trim(p_reason)) returning id into result;
  return result;
end $$;
revoke all on function public.submit_abuse_report(text,text) from public;
grant execute on function public.submit_abuse_report(text,text) to anon,authenticated;
