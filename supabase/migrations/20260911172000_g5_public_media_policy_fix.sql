create or replace function public.is_public_media_path(p_storage_path text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.media_assets ma
    join public.events e on e.id = ma.event_id and e.lifecycle = 'published'
    join public.event_versions ev on ev.id = e.published_version_id and ev.event_id = e.id
    where ma.status = 'ready'
      and (ma.storage_key = p_storage_path
        or ma.variants @> jsonb_build_object('w640', p_storage_path)
        or ma.variants @> jsonb_build_object('w1280', p_storage_path)
        or ma.variants @> jsonb_build_object('w1920', p_storage_path)
        or ma.variants @> jsonb_build_object('original', p_storage_path))
      and ev.content::text like '%' || ma.id::text || '%'
  )
$$;

revoke execute on function public.is_public_media_path(text) from public;
grant execute on function public.is_public_media_path(text) to anon, authenticated;

drop policy if exists public_published_media_read on storage.objects;
create policy public_published_media_read on storage.objects for select to anon
using (bucket_id = 'event-media' and public.is_public_media_path(name));
