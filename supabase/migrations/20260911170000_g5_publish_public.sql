create or replace function public.publish_event_draft(
  p_event_id uuid,
  p_expected_revision integer,
  p_idempotency_key uuid
)
returns table(version_id uuid, version_number integer, public_code text, first_publication boolean, replayed boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  app_id uuid := public.current_app_user_id();
  actor text;
  route text := '/api/v1/events/' || p_event_id::text || '/publish';
  payload_hash text := encode(extensions.digest(jsonb_build_object('eventId', p_event_id, 'revision', p_expected_revision)::text, 'sha256'), 'hex');
  prior jsonb;
  current_event public.events;
  current_draft public.event_drafts;
  template_row public.templates;
  next_version integer;
  new_version_id uuid;
  is_first boolean;
  month_key date := public.vietnam_month_key(now());
  media_total integer;
  media_ready integer;
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode = '28000'; end if;
  actor := 'owner:' || app_id::text;
  prior := private.begin_idempotency(actor, app_id, route, p_idempotency_key, payload_hash);
  if prior is not null then
    return query select
      (prior #>> '{body,versionId}')::uuid,
      (prior #>> '{body,versionNumber}')::integer,
      prior #>> '{body,publicCode}',
      (prior #>> '{body,firstPublication}')::boolean,
      true;
    return;
  end if;

  select * into current_event from public.events where id = p_event_id for update;
  if current_event.id is null or current_event.owner_app_user_id <> app_id then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if current_event.lifecycle in ('cancelled', 'archived', 'deleted') then raise exception 'INVALID_EVENT_TRANSITION' using errcode = 'P0001'; end if;
  select * into current_draft from public.event_drafts where event_id = p_event_id;
  if current_draft.revision <> p_expected_revision then raise exception 'REVISION_CONFLICT' using errcode = 'P0001'; end if;
  if nullif(trim(current_draft.content->>'title'), '') is null
    or jsonb_array_length(coalesce(current_draft.content->'hosts', '[]'::jsonb)) = 0
    or nullif(trim(current_draft.content#>>'{venue,name}'), '') is null
    or nullif(trim(current_draft.content->>'startsAt'), '') is null then
    raise exception 'PREFLIGHT_FAILED' using errcode = '22023';
  end if;

  with requested as (
    select distinct (item #>> '{}')::uuid id
    from jsonb_path_query(current_draft.content, 'strict $.**.mediaAssetId') item
  )
  select count(*), count(ma.id) filter (where ma.status = 'ready' and ma.event_id = p_event_id and ma.owner_app_user_id = app_id)
  into media_total, media_ready
  from requested r left join public.media_assets ma on ma.id = r.id;
  if media_total <> media_ready then raise exception 'MEDIA_NOT_READY' using errcode = 'P0001'; end if;

  select * into template_row from public.templates where id = current_event.template_id;
  select coalesce(max(ev.version_number), 0) + 1 into next_version from public.event_versions ev where ev.event_id = p_event_id;
  insert into public.event_versions (event_id, version_number, template_id, renderer_version, content_schema_version, content)
  values (p_event_id, next_version, current_event.template_id, template_row.renderer_version, template_row.content_schema_version, current_draft.content)
  returning id into new_version_id;

  is_first := current_event.first_published_at is null;
  if is_first then
    begin
      insert into public.publication_usage (app_user_id, event_id, vietnam_month) values (app_id, p_event_id, month_key);
    exception when unique_violation then
      raise exception 'EVENT_QUOTA_EXCEEDED' using errcode = 'P0001';
    end;
  end if;

  update public.events set
    lifecycle = 'published', published_version_id = new_version_id,
    first_published_at = coalesce(first_published_at, now()),
    starts_at = (current_draft.content->>'startsAt')::timestamptz,
    ends_at = nullif(current_draft.content->>'endsAt', '')::timestamptz,
    rsvp_deadline = nullif(current_draft.content#>>'{rsvp,closesAt}', '')::timestamptz,
    companion_limit = coalesce((current_draft.content#>>'{rsvp,maxCompanions}')::smallint, 0),
    updated_at = now()
  where id = p_event_id;

  perform private.complete_idempotency(actor, route, p_idempotency_key, 200, jsonb_build_object(
    'versionId', new_version_id, 'versionNumber', next_version, 'publicCode', current_event.public_code, 'firstPublication', is_first
  ));
  insert into public.audit_logs (event_id, actor_type, actor_ref, action, request_id, metadata)
  values (p_event_id, 'owner', app_id::text, 'event.published', p_idempotency_key, jsonb_build_object('versionId', new_version_id, 'versionNumber', next_version, 'firstPublication', is_first));
  return query select new_version_id, next_version, current_event.public_code, is_first, false;
end
$$;

create or replace function public.change_event_lifecycle(p_event_id uuid, p_target text, p_request_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare app_id uuid := public.current_app_user_id(); current_state text;
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode = '28000'; end if;
  select lifecycle into current_state from public.events where id=p_event_id and owner_app_user_id=app_id for update;
  if current_state is null then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if not ((current_state='published' and p_target in ('hidden','cancelled','archived'))
    or (current_state='hidden' and p_target in ('published','cancelled','archived'))
    or (current_state='cancelled' and p_target='archived')) then
    raise exception 'INVALID_EVENT_TRANSITION' using errcode = 'P0001';
  end if;
  update public.events set lifecycle=p_target, updated_at=now() where id=p_event_id;
  insert into public.audit_logs(event_id,actor_type,actor_ref,action,request_id,metadata)
  values(p_event_id,'owner',app_id::text,'event.lifecycle_changed',p_request_id,jsonb_build_object('from',current_state,'to',p_target));
  return p_target;
end
$$;

create or replace function public.get_public_event(p_public_code text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'publicCode', e.public_code,
    'eventVersion', v.version_number,
    'templateId', v.template_id,
    'content', v.content
  )
  from public.events e join public.event_versions v on v.id=e.published_version_id and v.event_id=e.id
  where e.public_code=p_public_code and e.lifecycle='published'
$$;

create or replace function public.resolve_public_media(p_public_code text, p_media_asset_id uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select coalesce(ma.variants->>'w1280', ma.variants->>'w640', ma.variants->>'original', ma.storage_key)
  from public.events e
  join public.event_versions v on v.id=e.published_version_id and v.event_id=e.id
  join public.media_assets ma on ma.id=p_media_asset_id and ma.event_id=e.id and ma.status='ready'
  where e.public_code=p_public_code and e.lifecycle='published' and v.content::text like '%' || p_media_asset_id::text || '%'
$$;

revoke execute on function public.publish_event_draft(uuid,integer,uuid) from public, anon;
revoke execute on function public.change_event_lifecycle(uuid,text,uuid) from public, anon;
grant execute on function public.publish_event_draft(uuid,integer,uuid) to authenticated;
grant execute on function public.change_event_lifecycle(uuid,text,uuid) to authenticated;
revoke execute on function public.get_public_event(text) from public;
revoke execute on function public.resolve_public_media(text,uuid) from public;
grant execute on function public.get_public_event(text) to anon, authenticated;
grant execute on function public.resolve_public_media(text,uuid) to anon, authenticated;
