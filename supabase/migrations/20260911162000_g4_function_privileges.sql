-- Hosted Supabase projects grant new public functions to API roles by default.
-- Remove the anonymous grants explicitly and retain the authenticated API surface.
revoke execute on function public.delete_draft_event(uuid, uuid) from anon;
revoke execute on function public.switch_event_template(uuid, text, integer, uuid) from anon;
revoke execute on function public.register_media_upload(uuid, text, text, text, bigint, uuid) from anon;

grant execute on function public.delete_draft_event(uuid, uuid) to authenticated;
grant execute on function public.switch_event_template(uuid, text, integer, uuid) to authenticated;
grant execute on function public.register_media_upload(uuid, text, text, text, bigint, uuid) to authenticated;
