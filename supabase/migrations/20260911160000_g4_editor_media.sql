create or replace function public.delete_draft_event(p_event_id uuid, p_request_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  app_id uuid := public.current_app_user_id();
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode = '28000'; end if;
  update public.events
  set lifecycle = 'deleted', deleted_at = now(), updated_at = now()
  where id = p_event_id and owner_app_user_id = app_id and lifecycle = 'draft';
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  insert into public.audit_logs (event_id, actor_type, actor_ref, action, request_id)
  values (p_event_id, 'owner', app_id::text, 'event.draft_deleted', p_request_id);
end
$$;

create or replace function public.switch_event_template(
  p_event_id uuid,
  p_template_id text,
  p_expected_revision integer,
  p_request_id uuid
)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  app_id uuid := public.current_app_user_id();
  next_revision integer;
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode = '28000'; end if;
  if not exists (select 1 from public.templates where id = p_template_id and enabled_for_new) then
    raise exception 'TEMPLATE_NOT_AVAILABLE' using errcode = '22023';
  end if;
  update public.event_drafts d
  set revision = d.revision + 1, updated_at = now()
  from public.events e
  where d.event_id = p_event_id
    and e.id = d.event_id
    and e.owner_app_user_id = app_id
    and e.lifecycle = 'draft'
    and d.revision = p_expected_revision
  returning d.revision into next_revision;
  if next_revision is null then raise exception 'REVISION_CONFLICT' using errcode = 'P0001'; end if;
  update public.events set template_id = p_template_id, updated_at = now() where id = p_event_id;
  insert into public.audit_logs (event_id, actor_type, actor_ref, action, request_id, metadata)
  values (p_event_id, 'owner', app_id::text, 'event.template_changed', p_request_id, jsonb_build_object('templateId', p_template_id, 'revision', next_revision));
  return next_revision;
end
$$;

create or replace function public.register_media_upload(
  p_event_id uuid,
  p_kind text,
  p_storage_key text,
  p_original_filename text,
  p_byte_size bigint,
  p_request_id uuid
)
returns table(media_asset_id uuid, status text)
language plpgsql security definer set search_path = ''
as $$
declare
  app_id uuid := public.current_app_user_id();
  asset_id uuid;
  storage_limit bigint;
  used_bytes bigint;
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode = '28000'; end if;
  if not private.is_event_owner(p_event_id) then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if p_kind not in ('cover', 'album', 'audio') then raise exception 'INVALID_MEDIA_KIND' using errcode = '22023'; end if;
  if p_byte_size <= 0 or p_byte_size > (case when p_kind = 'audio' then 15728640 else 10485760 end) then
    raise exception 'MEDIA_SIZE_INVALID' using errcode = '22023';
  end if;
  if p_storage_key !~ ('^' || app_id::text || '/' || p_event_id::text || '/[0-9a-f-]+\.(jpg|png|webp|mp3|m4a)$') then
    raise exception 'MEDIA_PATH_INVALID' using errcode = '22023';
  end if;
  select storage_bytes into storage_limit from public.plan_entitlements where plan_code = 'free';
  select coalesce(sum(byte_size), 0) into used_bytes from public.media_assets where owner_app_user_id = app_id and status <> 'failed';
  if used_bytes + p_byte_size > storage_limit then raise exception 'STORAGE_QUOTA_EXCEEDED' using errcode = 'P0001'; end if;

  insert into public.media_assets (event_id, owner_app_user_id, kind, storage_key, original_filename, byte_size)
  values (p_event_id, app_id, p_kind, p_storage_key, left(p_original_filename, 255), p_byte_size)
  returning id into asset_id;
  insert into public.jobs (event_id, kind, payload)
  values (p_event_id, 'media.process', jsonb_build_object('mediaAssetId', asset_id));
  insert into public.audit_logs (event_id, actor_type, actor_ref, action, request_id, metadata)
  values (p_event_id, 'owner', app_id::text, 'media.upload_registered', p_request_id, jsonb_build_object('mediaAssetId', asset_id, 'kind', p_kind));
  return query select asset_id, 'uploaded'::text;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-media', 'event-media', false, 15728640, array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy event_media_owner_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'event-media'
  and (storage.foldername(name))[1] = public.current_app_user_id()::text
  and private.is_event_owner(((storage.foldername(name))[2])::uuid)
);

create policy event_media_owner_read on storage.objects for select to authenticated
using (
  bucket_id = 'event-media'
  and (storage.foldername(name))[1] = public.current_app_user_id()::text
  and private.is_event_owner(((storage.foldername(name))[2])::uuid)
);

revoke all on function public.delete_draft_event(uuid, uuid) from public;
revoke all on function public.switch_event_template(uuid, text, integer, uuid) from public;
revoke all on function public.register_media_upload(uuid, text, text, text, bigint, uuid) from public;
grant execute on function public.delete_draft_event(uuid, uuid) to authenticated;
grant execute on function public.switch_event_template(uuid, text, integer, uuid) to authenticated;
grant execute on function public.register_media_upload(uuid, text, text, text, bigint, uuid) to authenticated;
