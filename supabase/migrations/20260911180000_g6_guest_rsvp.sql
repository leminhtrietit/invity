create table if not exists private.runtime_secrets (
  name text primary key,
  value bytea not null,
  created_at timestamptz not null default now()
);

insert into private.runtime_secrets(name, value)
values ('guest-token-hmac-v1', extensions.gen_random_bytes(32))
on conflict (name) do nothing;

create table public.rsvp_rate_limits (
  event_id uuid not null references public.events(id) on delete cascade,
  fingerprint_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count between 1 and 1000),
  primary key (event_id, fingerprint_hash, window_started_at)
);

alter table public.rsvp_rate_limits enable row level security;
revoke all on public.rsvp_rate_limits from public, anon, authenticated;

create or replace function private.derive_secret(p_scope text, p_subject uuid, p_nonce uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select encode(extensions.hmac(
    convert_to(p_scope || ':' || p_subject::text || ':' || p_nonce::text, 'utf8'),
    value,
    'sha256'
  ), 'hex')
  from private.runtime_secrets where name = 'guest-token-hmac-v1'
$$;

create or replace function private.hash_secret(p_secret text)
returns text language sql immutable parallel safe set search_path = ''
as $$ select encode(extensions.digest(convert_to(p_secret, 'utf8'), 'sha256'), 'hex') $$;

create or replace function private.canonical_phone(p_phone text)
returns text language plpgsql immutable set search_path = ''
as $$
declare normalized text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
begin
  if normalized like '+84%' then normalized := '0' || substring(normalized from 4); end if;
  if normalized like '84%' then normalized := '0' || substring(normalized from 3); end if;
  if normalized !~ '^0[0-9]{8,10}$' then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  return normalized;
end
$$;

create or replace function private.assert_rsvp_open(p_event public.events, p_content jsonb)
returns void language plpgsql stable set search_path = ''
as $$
begin
  if p_event.id is null or p_event.lifecycle <> 'published' or coalesce((p_content#>>'{rsvp,enabled}')::boolean, false) is false then
    raise exception 'RSVP_CLOSED' using errcode = 'P0001';
  end if;
  if now() > coalesce(p_event.rsvp_deadline, p_event.starts_at) then
    raise exception 'RSVP_CLOSED' using errcode = 'P0001';
  end if;
end
$$;

create or replace function private.upsert_guest_rsvp(
  p_event_id uuid, p_guest_slot_id uuid, p_response text, p_companion_count integer,
  p_wish text, p_consent_public boolean
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare result_id uuid;
begin
  if p_response not in ('attending', 'declined') then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  if p_response = 'declined' then p_companion_count := 0; end if;
  insert into public.rsvps(guest_slot_id, response, companion_count)
  values (p_guest_slot_id, p_response, p_companion_count)
  on conflict (guest_slot_id) do update set response=excluded.response, companion_count=excluded.companion_count,
    revision=public.rsvps.revision+1, updated_at=now()
  returning id into result_id;
  if nullif(trim(coalesce(p_wish,'')), '') is null then
    delete from public.wishes where guest_slot_id=p_guest_slot_id;
  else
    insert into public.wishes(event_id,guest_slot_id,content,consent_public,moderation_status)
    values(p_event_id,p_guest_slot_id,trim(p_wish),p_consent_public,case when p_consent_public then 'pending' else 'private' end)
    on conflict(guest_slot_id) do update set content=excluded.content, consent_public=excluded.consent_public,
      moderation_status=case when excluded.consent_public then 'pending' else 'private' end, moderated_at=null, updated_at=now();
  end if;
  return result_id;
end
$$;

create or replace function public.create_personal_invitation(
  p_event_id uuid, p_display_name text, p_salutation text, p_guest_group text,
  p_owner_note text, p_idempotency_key uuid
) returns table(guest_slot_id uuid, allocation_number integer, invitation_token text, replayed boolean)
language plpgsql security definer set search_path = ''
as $$
declare app_id uuid := public.current_app_user_id(); actor text; route text := '/api/v1/events/'||p_event_id::text||'/guests';
  prior jsonb; next_number integer; new_guest_id uuid; raw_token text;
  payload_hash text := encode(extensions.digest(jsonb_build_object('eventId',p_event_id,'displayName',p_display_name,'salutation',p_salutation,'guestGroup',p_guest_group,'ownerNote',p_owner_note)::text,'sha256'),'hex');
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if not private.is_event_owner(p_event_id) then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if char_length(trim(coalesce(p_display_name,''))) not between 2 and 100 then raise exception 'VALIDATION_ERROR' using errcode='22023'; end if;
  if exists(select 1 from public.events where id=p_event_id and lifecycle in ('cancelled','archived','deleted')) then raise exception 'INVALID_EVENT_TRANSITION' using errcode='P0001'; end if;
  actor := 'owner:'||app_id::text;
  prior := private.begin_idempotency(actor,app_id,route,p_idempotency_key,payload_hash);
  if prior is not null then
    new_guest_id := (prior#>>'{body,guestSlotId}')::uuid; next_number := (prior#>>'{body,allocationNumber}')::integer;
    raw_token := private.derive_secret('invitation',new_guest_id,p_idempotency_key);
    return query select new_guest_id,next_number,raw_token,true; return;
  end if;
  update public.event_quota_counters set guest_slots_used=guest_slots_used+1,updated_at=now()
    where event_id=p_event_id and guest_slots_used<50 returning guest_slots_used into next_number;
  if next_number is null then raise exception 'GUEST_QUOTA_EXCEEDED' using errcode='P0001'; end if;
  insert into public.guest_slots(event_id,allocation_number,allocation_source,display_name,salutation,guest_group,owner_note)
  values(p_event_id,next_number,'personalized',trim(p_display_name),nullif(trim(p_salutation),''),nullif(trim(p_guest_group),''),nullif(trim(p_owner_note),'')) returning id into new_guest_id;
  raw_token := private.derive_secret('invitation',new_guest_id,p_idempotency_key);
  insert into public.invitation_tokens(guest_slot_id,token_hash) values(new_guest_id,private.hash_secret(raw_token));
  perform private.complete_idempotency(actor,route,p_idempotency_key,201,jsonb_build_object('guestSlotId',new_guest_id,'allocationNumber',next_number));
  insert into public.audit_logs(event_id,actor_type,actor_ref,action,request_id,metadata) values(p_event_id,'owner',app_id::text,'guest.invitation_created',p_idempotency_key,jsonb_build_object('source','personalized'));
  return query select new_guest_id,next_number,raw_token,false;
end $$;

create or replace function public.rotate_personal_invitation(p_event_id uuid,p_guest_slot_id uuid,p_request_id uuid)
returns text language plpgsql security definer set search_path=''
as $$
declare app_id uuid:=public.current_app_user_id(); raw_token text;
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if not exists(select 1 from public.guest_slots g where g.id=p_guest_slot_id and g.event_id=p_event_id and g.allocation_source='personalized' and g.deleted_at is null and private.is_event_owner(g.event_id)) then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  update public.invitation_tokens set revoked_at=now() where guest_slot_id=p_guest_slot_id and revoked_at is null;
  raw_token:=private.derive_secret('invitation-rotate',p_guest_slot_id,p_request_id);
  insert into public.invitation_tokens(guest_slot_id,token_hash) values(p_guest_slot_id,private.hash_secret(raw_token));
  insert into public.audit_logs(event_id,actor_type,actor_ref,action,request_id) values(p_event_id,'owner',app_id::text,'guest.invitation_rotated',p_request_id);
  return raw_token;
end $$;

create or replace function public.set_guest_invitation_state(p_event_id uuid,p_guest_slot_id uuid,p_target text,p_request_id uuid)
returns text language plpgsql security definer set search_path=''
as $$
declare app_id uuid:=public.current_app_user_id();
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if p_target not in ('sent','revoked') then raise exception 'VALIDATION_ERROR' using errcode='22023'; end if;
  update public.guest_slots set sent_at=case when p_target='sent' then coalesce(sent_at,now()) else sent_at end,
    revoked_at=case when p_target='revoked' then coalesce(revoked_at,now()) else revoked_at end
  where id=p_guest_slot_id and event_id=p_event_id and private.is_event_owner(event_id);
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if p_target='revoked' then update public.invitation_tokens set revoked_at=coalesce(revoked_at,now()) where guest_slot_id=p_guest_slot_id; end if;
  insert into public.audit_logs(event_id,actor_type,actor_ref,action,request_id) values(p_event_id,'owner',app_id::text,'guest.invitation_'||p_target,p_request_id);
  return p_target;
end $$;

create or replace function public.resolve_personal_invitation(p_invitation_token text)
returns jsonb language sql stable security definer set search_path=''
as $$
  select jsonb_build_object('publicCode',e.public_code,'guestName',g.display_name,'salutation',g.salutation,
    'rsvp',case when r.id is null then null else jsonb_build_object('response',r.response,'companionCount',r.companion_count,'wish',w.content,'consentPublicWish',coalesce(w.consent_public,false)) end)
  from public.invitation_tokens t join public.guest_slots g on g.id=t.guest_slot_id
  join public.events e on e.id=g.event_id left join public.rsvps r on r.guest_slot_id=g.id left join public.wishes w on w.guest_slot_id=g.id
  where t.token_hash=private.hash_secret(p_invitation_token) and t.revoked_at is null and (t.expires_at is null or t.expires_at>now())
    and g.revoked_at is null and g.deleted_at is null and e.lifecycle='published'
$$;

create or replace function public.submit_personal_rsvp(p_invitation_token text,p_response text,p_companion_count integer,p_wish text,p_consent_public boolean,p_idempotency_key uuid)
returns table(rsvp_id uuid, revision integer, replayed boolean) language plpgsql security definer set search_path=''
as $$
declare token_row record; event_row public.events; content jsonb; result_id uuid; result_revision integer; actor text; prior jsonb;
  payload_hash text:=encode(extensions.digest(jsonb_build_object('response',p_response,'companionCount',p_companion_count,'wish',p_wish,'consent',p_consent_public)::text,'sha256'),'hex');
begin
  select g.id guest_id,g.event_id into token_row from public.invitation_tokens t join public.guest_slots g on g.id=t.guest_slot_id
    where t.token_hash=private.hash_secret(p_invitation_token) and t.revoked_at is null and (t.expires_at is null or t.expires_at>now()) and g.revoked_at is null and g.deleted_at is null;
  if token_row.guest_id is null then raise exception 'INVALID_INVITATION_TOKEN' using errcode='P0002'; end if;
  actor:='invitation:'||private.hash_secret(p_invitation_token); prior:=private.begin_idempotency(actor,null,'/api/v1/i/rsvp',p_idempotency_key,payload_hash);
  if prior is not null then return query select (prior#>>'{body,rsvpId}')::uuid,(prior#>>'{body,revision}')::integer,true; return; end if;
  select e.* into event_row from public.events e where e.id=token_row.event_id for update;
  select v.content into content from public.event_versions v where v.id=event_row.published_version_id and v.event_id=event_row.id;
  perform private.assert_rsvp_open(event_row,content);
  if p_companion_count<0 or p_companion_count>event_row.companion_limit then raise exception 'VALIDATION_ERROR' using errcode='22023'; end if;
  result_id:=private.upsert_guest_rsvp(event_row.id,token_row.guest_id,p_response,p_companion_count,p_wish,p_consent_public);
  select r.revision into result_revision from public.rsvps r where r.id=result_id;
  perform private.complete_idempotency(actor,'/api/v1/i/rsvp',p_idempotency_key,200,jsonb_build_object('rsvpId',result_id,'revision',result_revision));
  return query select result_id,result_revision,false;
end $$;

create or replace function public.submit_shared_rsvp(p_public_code text,p_display_name text,p_phone text,p_response text,p_companion_count integer,p_wish text,p_consent_public boolean,p_fingerprint_hash text,p_idempotency_key uuid)
returns table(rsvp_id uuid, allocation_number integer, edit_secret text, replayed boolean) language plpgsql security definer set search_path=''
as $$
declare event_row public.events; content jsonb; new_guest_id uuid; next_number integer; result_id uuid; raw_edit text; prior jsonb; canonical text; actor text;
  bucket timestamptz:=date_trunc('hour',now()) + make_interval(mins=>(extract(minute from now())::integer/10)*10);
  payload_hash text:=encode(extensions.digest(jsonb_build_object('event',p_public_code,'name',p_display_name,'phone',p_phone,'response',p_response,'companionCount',p_companion_count,'wish',p_wish,'consent',p_consent_public)::text,'sha256'),'hex');
begin
  if char_length(trim(coalesce(p_display_name,''))) not between 2 and 100 or char_length(coalesce(p_fingerprint_hash,''))<32 then raise exception 'VALIDATION_ERROR' using errcode='22023'; end if;
  canonical:=private.canonical_phone(p_phone);
  select e.* into event_row from public.events e where e.public_code=p_public_code for update;
  select v.content into content from public.event_versions v where v.id=event_row.published_version_id and v.event_id=event_row.id;
  perform private.assert_rsvp_open(event_row,content);
  if p_companion_count<0 or p_companion_count>event_row.companion_limit then raise exception 'VALIDATION_ERROR' using errcode='22023'; end if;
  actor:='shared:'||event_row.id::text; prior:=private.begin_idempotency(actor,null,'/api/v1/public/events/'||p_public_code||'/rsvps',p_idempotency_key,payload_hash);
  if prior is not null then result_id:=(prior#>>'{body,rsvpId}')::uuid; next_number:=(prior#>>'{body,allocationNumber}')::integer; raw_edit:=private.derive_secret('rsvp-edit',result_id,p_idempotency_key); return query select result_id,next_number,raw_edit,true; return; end if;
  insert into public.rsvp_rate_limits(event_id,fingerprint_hash,window_started_at) values(event_row.id,p_fingerprint_hash,bucket)
    on conflict(event_id,fingerprint_hash,window_started_at) do update set request_count=public.rsvp_rate_limits.request_count+1 returning request_count into strict next_number;
  if next_number>8 then raise exception 'RATE_LIMITED' using errcode='P0001'; end if;
  update public.event_quota_counters set guest_slots_used=guest_slots_used+1,updated_at=now() where event_id=event_row.id and guest_slots_used<50 returning guest_slots_used into next_number;
  if next_number is null then raise exception 'GUEST_QUOTA_EXCEEDED' using errcode='P0001'; end if;
  insert into public.guest_slots(event_id,allocation_number,allocation_source,display_name,phone_canonical) values(event_row.id,next_number,'shared_rsvp',trim(p_display_name),canonical) returning id into new_guest_id;
  result_id:=private.upsert_guest_rsvp(event_row.id,new_guest_id,p_response,p_companion_count,p_wish,p_consent_public);
  raw_edit:=private.derive_secret('rsvp-edit',result_id,p_idempotency_key);
  insert into public.rsvp_edit_tokens(rsvp_id,token_hash,expires_at) values(result_id,private.hash_secret(raw_edit),now()+interval '180 days');
  perform private.complete_idempotency(actor,'/api/v1/public/events/'||p_public_code||'/rsvps',p_idempotency_key,201,jsonb_build_object('rsvpId',result_id,'allocationNumber',next_number));
  return query select result_id,next_number,raw_edit,false;
end $$;

create or replace function public.resolve_shared_rsvp_edit(p_edit_secret text)
returns jsonb language sql stable security definer set search_path=''
as $$
 select jsonb_build_object('publicCode',e.public_code,'name',g.display_name,'response',r.response,'companionCount',r.companion_count,'wish',w.content,'consentPublicWish',coalesce(w.consent_public,false))
 from public.rsvp_edit_tokens t join public.rsvps r on r.id=t.rsvp_id join public.guest_slots g on g.id=r.guest_slot_id join public.events e on e.id=g.event_id left join public.wishes w on w.guest_slot_id=g.id
 where t.token_hash=private.hash_secret(p_edit_secret) and t.revoked_at is null and t.expires_at>now() and g.revoked_at is null and g.deleted_at is null and e.lifecycle='published'
$$;

create or replace function public.update_shared_rsvp(p_edit_secret text,p_response text,p_companion_count integer,p_wish text,p_consent_public boolean,p_idempotency_key uuid)
returns table(rsvp_id uuid,revision integer,replayed boolean) language plpgsql security definer set search_path=''
as $$
declare found record; event_row public.events; content jsonb; result_id uuid; result_revision integer; actor text; prior jsonb;
 payload_hash text:=encode(extensions.digest(jsonb_build_object('response',p_response,'companionCount',p_companion_count,'wish',p_wish,'consent',p_consent_public)::text,'sha256'),'hex');
begin
 select r.id rsvp_id,g.id guest_id,g.event_id into found from public.rsvp_edit_tokens t join public.rsvps r on r.id=t.rsvp_id join public.guest_slots g on g.id=r.guest_slot_id where t.token_hash=private.hash_secret(p_edit_secret) and t.revoked_at is null and t.expires_at>now() and g.revoked_at is null and g.deleted_at is null;
 if found.rsvp_id is null then raise exception 'INVALID_EDIT_SESSION' using errcode='P0002'; end if;
 actor:='rsvp-edit:'||private.hash_secret(p_edit_secret); prior:=private.begin_idempotency(actor,null,'/api/v1/public/rsvps/me',p_idempotency_key,payload_hash);
 if prior is not null then return query select (prior#>>'{body,rsvpId}')::uuid,(prior#>>'{body,revision}')::integer,true; return; end if;
 select e.* into event_row from public.events e where e.id=found.event_id for update;
 select v.content into content from public.event_versions v where v.id=event_row.published_version_id and v.event_id=event_row.id;
 perform private.assert_rsvp_open(event_row,content);
 if p_companion_count<0 or p_companion_count>event_row.companion_limit then raise exception 'VALIDATION_ERROR' using errcode='22023'; end if;
 result_id:=private.upsert_guest_rsvp(event_row.id,found.guest_id,p_response,p_companion_count,p_wish,p_consent_public);
 select r.revision into result_revision from public.rsvps r where r.id=result_id;
 perform private.complete_idempotency(actor,'/api/v1/public/rsvps/me',p_idempotency_key,200,jsonb_build_object('rsvpId',result_id,'revision',result_revision));
 return query select result_id,result_revision,false;
end $$;

create or replace function public.record_public_open(p_public_code text,p_is_bot boolean)
returns void language plpgsql security definer set search_path=''
as $$ declare target_event uuid; begin
 select id into target_event from public.events where public_code=p_public_code and lifecycle='published';
 if target_event is null then return; end if;
 insert into public.event_metrics_daily(event_id,metric_date,invitation_opens,filtered_bot_opens)
 values(target_event,current_date,case when p_is_bot then 0 else 1 end,case when p_is_bot then 1 else 0 end)
 on conflict(event_id,metric_date) do update set invitation_opens=public.event_metrics_daily.invitation_opens+excluded.invitation_opens,filtered_bot_opens=public.event_metrics_daily.filtered_bot_opens+excluded.filtered_bot_opens;
end $$;

revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.create_personal_invitation(uuid,text,text,text,text,uuid) from public,anon;
revoke all on function public.rotate_personal_invitation(uuid,uuid,uuid) from public,anon;
revoke all on function public.set_guest_invitation_state(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.create_personal_invitation(uuid,text,text,text,text,uuid) to authenticated;
grant execute on function public.rotate_personal_invitation(uuid,uuid,uuid) to authenticated;
grant execute on function public.set_guest_invitation_state(uuid,uuid,text,uuid) to authenticated;
revoke all on function public.resolve_personal_invitation(text) from public;
revoke all on function public.submit_personal_rsvp(text,text,integer,text,boolean,uuid) from public;
revoke all on function public.submit_shared_rsvp(text,text,text,text,integer,text,boolean,text,uuid) from public;
revoke all on function public.resolve_shared_rsvp_edit(text) from public;
revoke all on function public.update_shared_rsvp(text,text,integer,text,boolean,uuid) from public;
revoke all on function public.record_public_open(text,boolean) from public;
grant execute on function public.resolve_personal_invitation(text),public.submit_personal_rsvp(text,text,integer,text,boolean,uuid),public.submit_shared_rsvp(text,text,text,text,integer,text,boolean,text,uuid),public.resolve_shared_rsvp_edit(text),public.update_shared_rsvp(text,text,integer,text,boolean,uuid),public.record_public_open(text,boolean) to anon,authenticated;
