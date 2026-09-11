create or replace function private.rsvp_fingerprint(p_client_fingerprint text)
returns text language sql stable security definer set search_path=''
as $$
  select encode(extensions.digest(convert_to(
    coalesce(p_client_fingerprint,'') || '|' || coalesce(current_setting('request.headers',true),'{}'),
    'utf8'
  ),'sha256'),'hex')
$$;

create or replace function public.submit_shared_rsvp(p_public_code text,p_display_name text,p_phone text,p_response text,p_companion_count integer,p_wish text,p_consent_public boolean,p_fingerprint_hash text,p_idempotency_key uuid)
returns table(rsvp_id uuid, allocation_number integer, edit_secret text, replayed boolean) language plpgsql security definer set search_path=''
as $$
declare event_row public.events; content jsonb; new_guest_id uuid; next_number integer; result_id uuid; raw_edit text; prior jsonb; canonical text; actor text;
  effective_fingerprint text:=private.rsvp_fingerprint(p_fingerprint_hash);
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
  insert into public.rsvp_rate_limits(event_id,fingerprint_hash,window_started_at) values(event_row.id,effective_fingerprint,bucket)
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

revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.submit_shared_rsvp(text,text,text,text,integer,text,boolean,text,uuid) from public;
grant execute on function public.submit_shared_rsvp(text,text,text,text,integer,text,boolean,text,uuid) to anon,authenticated;
