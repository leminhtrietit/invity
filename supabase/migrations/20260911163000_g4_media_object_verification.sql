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
  if not exists (select 1 from storage.objects so where so.bucket_id = 'event-media' and so.name = p_storage_key) then
    raise exception 'MEDIA_OBJECT_MISSING' using errcode = 'P0002';
  end if;
  select pe.storage_bytes into storage_limit from public.plan_entitlements pe where pe.plan_code = 'free';
  select coalesce(sum(ma.byte_size), 0) into used_bytes from public.media_assets ma
  where ma.owner_app_user_id = app_id and ma.status <> 'failed';
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

revoke execute on function public.register_media_upload(uuid, text, text, text, bigint, uuid) from public, anon;
grant execute on function public.register_media_upload(uuid, text, text, text, bigint, uuid) to authenticated;
