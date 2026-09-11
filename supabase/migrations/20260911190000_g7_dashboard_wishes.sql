create or replace function public.moderate_wish(
  p_event_id uuid,
  p_guest_slot_id uuid,
  p_target text,
  p_request_id uuid
) returns text
language plpgsql security definer set search_path=''
as $$
declare app_id uuid:=public.current_app_user_id(); current_wish public.wishes;
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if p_target not in ('approved','hidden') then raise exception 'VALIDATION_ERROR' using errcode='22023'; end if;
  select w.* into current_wish from public.wishes w
    where w.event_id=p_event_id and w.guest_slot_id=p_guest_slot_id and private.is_event_owner(w.event_id)
    for update;
  if current_wish.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if p_target='approved' and not current_wish.consent_public then raise exception 'WISH_CONSENT_REQUIRED' using errcode='P0001'; end if;
  update public.wishes set moderation_status=p_target,moderated_at=now(),updated_at=now() where id=current_wish.id;
  insert into public.audit_logs(event_id,actor_type,actor_ref,action,request_id,metadata)
  values(p_event_id,'owner',app_id::text,'wish.moderated',p_request_id,jsonb_build_object('guestSlotId',p_guest_slot_id,'target',p_target));
  return p_target;
end $$;

create or replace function public.get_public_wishes(p_public_code text)
returns jsonb language sql stable security definer set search_path=''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('author',visible.display_name,'message',visible.content) order by visible.updated_at desc),'[]'::jsonb)
  from (
    select g.display_name,w.content,w.updated_at
    from public.events e
    join public.wishes w on w.event_id=e.id and w.consent_public and w.moderation_status='approved'
    join public.guest_slots g on g.id=w.guest_slot_id and g.event_id=e.id and g.revoked_at is null and g.deleted_at is null
    where e.public_code=p_public_code and e.lifecycle='published'
    order by w.updated_at desc limit 30
  ) visible
$$;

revoke all on function public.moderate_wish(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.moderate_wish(uuid,uuid,text,uuid) to authenticated;
revoke all on function public.get_public_wishes(text) from public;
grant execute on function public.get_public_wishes(text) to anon,authenticated;
