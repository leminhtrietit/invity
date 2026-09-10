-- Supabase projects may auto-grant newly created public functions to API roles.
-- Revoke role-specific grants explicitly, then restore only the intended callers.
revoke execute on function public.current_app_user_id() from anon;
revoke execute on function public.ensure_current_app_user() from anon;
revoke execute on function public.vietnam_month_key(timestamptz) from anon;

revoke execute on function public.create_event_draft(text, text, uuid) from anon;
revoke execute on function public.save_event_draft(uuid, integer, jsonb, uuid) from anon;
revoke execute on function public.allocate_personal_guest_slot(uuid, text, text, text, text, uuid) from anon;
revoke execute on function public.activate_event_version(uuid, uuid, uuid) from anon;

revoke execute on function public.claim_jobs(text, integer, integer) from anon, authenticated;
revoke execute on function public.finish_job(uuid, text, boolean, text) from anon, authenticated;

grant execute on function public.current_app_user_id() to authenticated, service_role;
grant execute on function public.ensure_current_app_user() to authenticated, service_role;
grant execute on function public.vietnam_month_key(timestamptz) to authenticated, service_role;
grant execute on function public.create_event_draft(text, text, uuid) to authenticated;
grant execute on function public.save_event_draft(uuid, integer, jsonb, uuid) to authenticated;
grant execute on function public.allocate_personal_guest_slot(uuid, text, text, text, text, uuid) to authenticated;
grant execute on function public.activate_event_version(uuid, uuid, uuid) to authenticated;
grant execute on function public.claim_jobs(text, integer, integer) to service_role;
grant execute on function public.finish_job(uuid, text, boolean, text) to service_role;
