create policy public_published_media_read on storage.objects for select to anon
using (
  bucket_id = 'event-media'
  and exists (
    select 1
    from public.media_assets ma
    join public.events e on e.id = ma.event_id and e.lifecycle = 'published'
    join public.event_versions ev on ev.id = e.published_version_id and ev.event_id = e.id
    where ma.status = 'ready'
      and (ma.storage_key = name or ma.variants @> jsonb_build_object('w640', name) or ma.variants @> jsonb_build_object('w1280', name) or ma.variants @> jsonb_build_object('w1920', name) or ma.variants @> jsonb_build_object('original', name))
      and ev.content::text like '%' || ma.id::text || '%'
  )
);
