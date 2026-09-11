insert into private.runtime_secrets(name, value)
values ('gift-account-pgcrypto-v1', extensions.gen_random_bytes(32))
on conflict (name) do nothing;

create or replace function private.gift_encryption_key()
returns text language sql stable security definer set search_path=''
as $$ select encode(value, 'hex') from private.runtime_secrets where name='gift-account-pgcrypto-v1' $$;

create or replace function private.assert_recent_auth_for_published_event(p_event_id uuid)
returns void language plpgsql stable security definer set search_path=''
as $$
declare published_at timestamptz; issued_at timestamptz;
begin
  select first_published_at into published_at from public.events where id=p_event_id;
  if published_at is null then return; end if;
  begin
    issued_at := to_timestamp((auth.jwt()->>'iat')::double precision);
  exception when others then
    issued_at := null;
  end;
  if issued_at is null or issued_at < now() - interval '15 minutes' then
    raise exception 'RECENT_AUTH_REQUIRED' using errcode='P0001';
  end if;
end $$;

create or replace function public.list_gift_accounts(p_event_id uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',g.id,'label',g.label,'bankId',g.bank_id,
    'accountNumber',extensions.pgp_sym_decrypt(g.account_number_ciphertext,private.gift_encryption_key()),
    'accountName',g.account_name,'position',g.position,'enabled',g.enabled,
    'confirmedAt',g.confirmed_at,'updatedAt',g.updated_at
  ) order by g.position),'[]'::jsonb)
  from public.gift_accounts g
  where g.event_id=p_event_id and private.is_event_owner(g.event_id)
$$;

create or replace function public.upsert_gift_account(
  p_event_id uuid,p_account_id uuid,p_position integer,p_label text,p_bank_id text,
  p_account_number text,p_account_name text,p_confirmed boolean,p_request_id uuid
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare app_id uuid:=public.current_app_user_id(); result public.gift_accounts; normalized_account text:=trim(coalesce(p_account_number,''));
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if not private.is_event_owner(p_event_id) then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  perform private.assert_recent_auth_for_published_event(p_event_id);
  if p_position not between 1 and 2 or char_length(trim(coalesce(p_label,''))) not between 1 and 80
    or upper(trim(coalesce(p_bank_id,''))) !~ '^[A-Z0-9]{2,12}$'
    or normalized_account !~ '^[0-9]{6,19}$'
    or char_length(trim(coalesce(p_account_name,''))) not between 2 and 120 then
    raise exception 'VALIDATION_ERROR' using errcode='22023';
  end if;
  if p_account_id is null then
    insert into public.gift_accounts(event_id,label,bank_id,account_number_ciphertext,account_number_last4,account_name,position,enabled,confirmed_at)
    values(p_event_id,trim(p_label),upper(trim(p_bank_id)),extensions.pgp_sym_encrypt(normalized_account,private.gift_encryption_key(),'cipher-algo=aes256'),right(normalized_account,4),upper(trim(p_account_name)),p_position,true,case when p_confirmed then now() end)
    returning * into result;
  else
    update public.gift_accounts set label=trim(p_label),bank_id=upper(trim(p_bank_id)),
      account_number_ciphertext=extensions.pgp_sym_encrypt(normalized_account,private.gift_encryption_key(),'cipher-algo=aes256'),
      account_number_last4=right(normalized_account,4),account_name=upper(trim(p_account_name)),position=p_position,
      enabled=true,confirmed_at=case when p_confirmed then now() end,updated_at=now()
    where id=p_account_id and event_id=p_event_id and private.is_event_owner(event_id) returning * into result;
    if result.id is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  end if;
  insert into public.audit_logs(event_id,actor_type,actor_ref,action,request_id,metadata)
  values(p_event_id,'owner',app_id::text,'gift.account_saved',p_request_id,jsonb_build_object('giftAccountId',result.id,'position',result.position,'confirmed',p_confirmed));
  return jsonb_build_object('id',result.id,'label',result.label,'bankId',result.bank_id,'accountNumber',normalized_account,
    'accountName',result.account_name,'position',result.position,'enabled',result.enabled,'confirmedAt',result.confirmed_at,'updatedAt',result.updated_at);
exception when unique_violation then
  raise exception 'GIFT_POSITION_OCCUPIED' using errcode='23505';
end $$;

create or replace function public.delete_gift_account(p_event_id uuid,p_account_id uuid,p_request_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare app_id uuid:=public.current_app_user_id();
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if not private.is_event_owner(p_event_id) then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  perform private.assert_recent_auth_for_published_event(p_event_id);
  delete from public.gift_accounts where id=p_account_id and event_id=p_event_id;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  insert into public.audit_logs(event_id,actor_type,actor_ref,action,request_id,metadata)
  values(p_event_id,'owner',app_id::text,'gift.account_deleted',p_request_id,jsonb_build_object('giftAccountId',p_account_id));
  return true;
end $$;

create or replace function public.get_public_gift_options(p_public_code text)
returns jsonb language sql stable security definer set search_path=''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'label',g.label,'bankId',g.bank_id,
    'accountName',g.account_name,'last4',g.account_number_last4) order by g.position),'[]'::jsonb)
  from public.events e join public.event_versions v on v.id=e.published_version_id and v.event_id=e.id
  join public.gift_accounts g on g.event_id=e.id
  where e.public_code=p_public_code and e.lifecycle='published' and g.enabled and g.confirmed_at is not null
    and coalesce((v.content#>>'{gift,enabled}')::boolean,false)
$$;

create or replace function public.resolve_public_gift_recipient(p_public_code text,p_account_id uuid)
returns jsonb language sql stable security definer set search_path=''
as $$
  select jsonb_build_object('id',g.id,'label',g.label,'bankId',g.bank_id,
    'accountNumber',extensions.pgp_sym_decrypt(g.account_number_ciphertext,private.gift_encryption_key()),
    'accountName',g.account_name,'last4',g.account_number_last4)
  from public.events e join public.event_versions v on v.id=e.published_version_id and v.event_id=e.id
  join public.gift_accounts g on g.event_id=e.id
  where e.public_code=p_public_code and e.lifecycle='published' and g.id=p_account_id
    and g.enabled and g.confirmed_at is not null and coalesce((v.content#>>'{gift,enabled}')::boolean,false)
$$;

revoke all on function private.gift_encryption_key() from public,anon,authenticated;
revoke all on function private.assert_recent_auth_for_published_event(uuid) from public,anon,authenticated;
revoke all on function public.list_gift_accounts(uuid) from public,anon;
revoke all on function public.upsert_gift_account(uuid,uuid,integer,text,text,text,text,boolean,uuid) from public,anon;
revoke all on function public.delete_gift_account(uuid,uuid,uuid) from public,anon;
grant execute on function public.list_gift_accounts(uuid) to authenticated;
grant execute on function public.upsert_gift_account(uuid,uuid,integer,text,text,text,text,boolean,uuid) to authenticated;
grant execute on function public.delete_gift_account(uuid,uuid,uuid) to authenticated;
revoke all on function public.get_public_gift_options(text) from public;
revoke all on function public.resolve_public_gift_recipient(text,uuid) from public;
grant execute on function public.get_public_gift_options(text) to anon,authenticated;
grant execute on function public.resolve_public_gift_recipient(text,uuid) to anon,authenticated;
