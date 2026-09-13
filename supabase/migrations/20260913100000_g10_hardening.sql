create table public.public_request_limits (
  scope text not null,
  fingerprint_hash text not null check (char_length(fingerprint_hash)=64),
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count>0),
  primary key(scope,fingerprint_hash,window_started_at)
);
alter table public.public_request_limits enable row level security;
revoke all on public.public_request_limits from public,anon,authenticated;

create or replace function private.consume_public_limit(p_scope text,p_key text,p_max integer,p_window_seconds integer)
returns void language plpgsql security definer set search_path=''
as $$
declare bucket timestamptz; next_count integer; fingerprint text;
begin
  if char_length(p_scope) not between 2 and 100 or char_length(coalesce(p_key,'')) not between 20 and 200 or p_max not between 1 and 1000 or p_window_seconds not between 60 and 86400 then raise exception 'INVALID_RATE_LIMIT' using errcode='22023';end if;
  fingerprint:=private.hash_secret('public-limit:'||p_scope||':'||p_key);
  bucket:=to_timestamp(floor(extract(epoch from now())/p_window_seconds)*p_window_seconds);
  insert into public.public_request_limits(scope,fingerprint_hash,window_started_at) values(p_scope,fingerprint,bucket)
  on conflict(scope,fingerprint_hash,window_started_at) do update set request_count=public.public_request_limits.request_count+1 returning request_count into next_count;
  if next_count>p_max then raise exception 'RATE_LIMITED' using errcode='P0001';end if;
end $$;

create or replace function public.track_product_event(p_event_name text,p_anonymous_key text,p_event_id uuid,p_template_id text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare app_id uuid:=public.current_app_user_id(); safe_event_id uuid; actor_key text;
begin
  if p_event_name not in ('template_viewed','template_selected','draft_created','event_published','invitation_opened','rsvp_submitted','qr_generated') then raise exception 'VALIDATION_ERROR' using errcode='22023';end if;
  if app_id is null and (p_anonymous_key is null or char_length(p_anonymous_key) not between 20 and 100) then raise exception 'VALIDATION_ERROR' using errcode='22023';end if;
  actor_key:=coalesce(app_id::text,p_anonymous_key);
  perform private.consume_public_limit('analytics',actor_key,120,600);
  if p_event_id is not null and (private.is_event_owner(p_event_id) or exists(select 1 from public.events where id=p_event_id and lifecycle='published')) then safe_event_id:=p_event_id;end if;
  insert into public.product_events(event_name,actor_app_user_id,anonymous_hash,event_id,template_id)
  values(p_event_name,app_id,case when app_id is null then private.hash_secret('analytics:'||p_anonymous_key) end,safe_event_id,case when p_template_id in(select id from public.templates) then p_template_id end);
  return true;
end $$;

drop function public.submit_abuse_report(text,text);
create function public.submit_abuse_report(p_public_code text,p_reason text,p_fingerprint_key text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare target_event uuid; result uuid;
begin
  if char_length(trim(coalesce(p_reason,''))) not between 3 and 1000 or char_length(coalesce(p_fingerprint_key,'')) not between 20 and 100 then raise exception 'VALIDATION_ERROR' using errcode='22023';end if;
  select id into target_event from public.events where public_code=p_public_code and lifecycle='published';
  if target_event is null then raise exception 'NOT_FOUND' using errcode='P0002';end if;
  perform private.consume_public_limit('report:'||target_event::text,p_fingerprint_key,5,3600);
  insert into public.abuse_reports(event_id,reason) values(target_event,trim(p_reason)) returning id into result;
  return result;
end $$;
revoke all on function public.submit_abuse_report(text,text,text) from public;
grant execute on function public.submit_abuse_report(text,text,text) to anon,authenticated;

update public.jobs set available_at=greatest(available_at,created_at+interval '30 days') where kind='account.delete' and status='queued';

create or replace function public.request_account_deletion(p_confirmation text,p_request_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare app_id uuid:=public.current_app_user_id();
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode='28000';end if;
  if p_confirmation<>'XOA TAI KHOAN' then raise exception 'CONFIRMATION_REQUIRED' using errcode='22023';end if;
  update public.events set lifecycle='deleted',deleted_at=coalesce(deleted_at,now()) where owner_app_user_id=app_id and lifecycle<>'deleted';
  update public.invitation_tokens t set revoked_at=coalesce(t.revoked_at,now()) from public.guest_slots g,public.events e where t.guest_slot_id=g.id and g.event_id=e.id and e.owner_app_user_id=app_id;
  insert into public.jobs(kind,payload,max_attempts,available_at) values('account.delete',jsonb_build_object('appUserId',app_id),5,now()+interval '30 days');
  insert into public.audit_logs(actor_type,actor_ref,action,request_id) values('owner',app_id::text,'account.deletion_requested',p_request_id);
  update public.app_users set status='deletion_requested',updated_at=now() where id=app_id;
  return true;
end $$;

create or replace function public.run_retention_maintenance()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare expired_limits integer; expired_keys integer; expired_events integer;
begin
  delete from public.public_request_limits where window_started_at<now()-interval '2 days';get diagnostics expired_limits=row_count;
  delete from public.idempotency_requests where expires_at<now();get diagnostics expired_keys=row_count;
  delete from public.product_events where occurred_at<now()-interval '180 days';
  insert into public.jobs(event_id,kind,payload,max_attempts)
  select ma.event_id,'media.cleanup',jsonb_build_object('mediaAssetId',ma.id),5 from public.media_assets ma
  join public.events e on e.id=ma.event_id
  where ((ma.status='failed' and ma.updated_at<now()-interval '7 days') or (e.lifecycle='deleted' and e.deleted_at<now()-interval '30 days'))
    and not exists(select 1 from public.jobs j where j.kind='media.cleanup' and j.payload->>'mediaAssetId'=ma.id::text and j.status in('queued','running'));
  get diagnostics expired_events=row_count;
  return jsonb_build_object('expiredRateLimits',expired_limits,'expiredIdempotencyKeys',expired_keys,'cleanupJobsQueued',expired_events);
end $$;

create or replace function public.claim_media_jobs(p_worker_id text,p_limit integer default 3,p_lease_seconds integer default 120)
returns setof public.jobs language plpgsql security definer set search_path=''
as $$
begin
  if char_length(trim(p_worker_id))<3 or p_limit not between 1 and 10 or p_lease_seconds not between 30 and 900 then raise exception 'INVALID_JOB_CLAIM' using errcode='22023';end if;
  update public.jobs set status='failed',locked_by=null,locked_until=null,last_error_code=coalesce(last_error_code,'LEASE_EXPIRED_MAX_ATTEMPTS') where kind in('media.process','media.cleanup','account.delete') and status='running' and locked_until<now() and attempts>=max_attempts;
  return query with candidates as(
    select id from public.jobs where kind in('media.process','media.cleanup','account.delete') and attempts<max_attempts and available_at<=now() and(status='queued' or(status='running' and locked_until<now())) order by available_at,created_at for update skip locked limit p_limit
  ) update public.jobs j set status='running',attempts=attempts+1,locked_by=p_worker_id,locked_until=now()+make_interval(secs=>p_lease_seconds) from candidates c where j.id=c.id returning j.*;
end $$;

create or replace function public.claim_user_media_jobs(p_auth_user_id uuid,p_worker_id text,p_limit integer default 3,p_lease_seconds integer default 120)
returns setof public.jobs language plpgsql security definer set search_path=''
as $$
declare app_id uuid;
begin
  select app_user_id into app_id from public.auth_bindings where auth_user_id=p_auth_user_id;
  if app_id is null or char_length(trim(p_worker_id))<3 or p_limit not between 1 and 10 or p_lease_seconds not between 30 and 900 then raise exception 'INVALID_JOB_CLAIM' using errcode='22023';end if;
  return query with candidates as(
    select j.id from public.jobs j join public.media_assets ma on ma.id=(j.payload->>'mediaAssetId')::uuid
    where j.kind='media.process' and ma.owner_app_user_id=app_id and j.attempts<j.max_attempts and j.available_at<=now() and(j.status='queued' or(j.status='running' and j.locked_until<now()))
    order by j.available_at,j.created_at for update of j skip locked limit p_limit
  ) update public.jobs j set status='running',attempts=attempts+1,locked_by=p_worker_id,locked_until=now()+make_interval(secs=>p_lease_seconds) from candidates c where j.id=c.id returning j.*;
end $$;

create or replace function public.purge_account_data(p_app_user_id uuid,p_job_id uuid,p_worker_id text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare auth_ids uuid[];
begin
  if not exists(select 1 from public.jobs where id=p_job_id and kind='account.delete' and status='running' and locked_by=p_worker_id and payload->>'appUserId'=p_app_user_id::text) then raise exception 'JOB_LEASE_NOT_OWNED' using errcode='P0001';end if;
  select coalesce(array_agg(auth_user_id),'{}') into auth_ids from public.auth_bindings where app_user_id=p_app_user_id;
  delete from public.publication_usage where app_user_id=p_app_user_id;
  delete from public.events where owner_app_user_id=p_app_user_id;
  delete from public.app_users where id=p_app_user_id and status='deletion_requested';
  delete from auth.users where id=any(auth_ids);
  update public.jobs set status='succeeded',locked_by=null,locked_until=null,last_error_code=null,payload='{"purged":true}'::jsonb where id=p_job_id;
  return true;
end $$;

revoke all on function private.consume_public_limit(text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.run_retention_maintenance() from public,anon,authenticated;
revoke all on function public.claim_media_jobs(text,integer,integer) from public,anon,authenticated;
revoke all on function public.claim_user_media_jobs(uuid,text,integer,integer) from public,anon,authenticated;
revoke all on function public.purge_account_data(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.run_retention_maintenance() to service_role;
grant execute on function public.claim_media_jobs(text,integer,integer) to service_role;
grant execute on function public.claim_user_media_jobs(uuid,text,integer,integer) to service_role;
grant execute on function public.purge_account_data(uuid,uuid,text) to service_role;
