alter table public.auth_bindings
  drop constraint if exists auth_bindings_provider_check;

alter table public.auth_bindings
  add constraint auth_bindings_provider_check
  check (provider in ('email', 'google', 'leminhtriet_oidc'));

create or replace function public.ensure_current_app_user()
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  auth_id uuid := auth.uid();
  auth_record auth.users;
  identity_record auth.identities;
  binding public.auth_bindings;
  stable_app_user_id uuid;
  raw_provider text;
  binding_provider text;
  identity_subject text;
  binding_subject text;
  identity_issuer constant text := 'https://jebsmjfrbdxdtdeikkus.supabase.co/auth/v1';
begin
  if auth_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(auth_id::text, 0));

  select * into auth_record from auth.users where id = auth_id;
  raw_provider := coalesce(auth_record.raw_app_meta_data ->> 'provider', '');

  if auth_record.id is null or raw_provider not in ('email', 'google', 'custom:leminhtriet') then
    raise exception 'trusted identity required' using errcode = '28000';
  end if;

  if auth_record.email is null or auth_record.email = '' then
    raise exception 'verified email required' using errcode = '22023';
  end if;

  if raw_provider = 'email' and auth_record.email_confirmed_at is null then
    raise exception 'verified email required' using errcode = '22023';
  end if;

  select * into identity_record
  from auth.identities
  where user_id = auth_id and provider = raw_provider
  order by created_at asc
  limit 1;

  if identity_record.id is null then
    raise exception 'provider identity missing' using errcode = '22023';
  end if;

  if raw_provider = 'custom:leminhtriet'
     and coalesce(identity_record.identity_data ->> 'email_verified', 'false') not in ('true', '1') then
    raise exception 'verified email required' using errcode = '22023';
  end if;

  identity_subject := coalesce(identity_record.identity_data ->> 'sub', identity_record.provider_id);
  if identity_subject is null or identity_subject = '' then
    raise exception 'provider subject missing' using errcode = '22023';
  end if;

  if raw_provider = 'custom:leminhtriet' then
    binding_provider := 'leminhtriet_oidc';
    binding_subject := identity_issuer || '|' || identity_subject;
  else
    binding_provider := raw_provider;
    binding_subject := identity_subject;
  end if;

  select * into binding
  from public.auth_bindings
  where auth_user_id = auth_id
  for update;

  if binding.id is not null then
    if not exists (
      select 1 from public.app_users
      where id = binding.app_user_id and status = 'active'
    ) then
      raise exception 'account is not active' using errcode = '28000';
    end if;

    update public.app_users set
      email = coalesce(auth_record.email, email),
      display_name = coalesce(
        nullif(auth_record.raw_user_meta_data ->> 'full_name', ''),
        nullif(auth_record.raw_user_meta_data ->> 'name', ''),
        display_name
      ),
      avatar_url = coalesce(coalesce(auth_record.raw_user_meta_data ->> 'avatar_url', auth_record.raw_user_meta_data ->> 'picture'), avatar_url),
      updated_at = now()
    where id = binding.app_user_id;

    update public.auth_bindings
    set last_seen_at = now()
    where id = binding.id;

    return binding.app_user_id;
  end if;

  select app_user_id into stable_app_user_id
  from public.auth_bindings
  where provider = binding_provider and provider_subject = binding_subject
  for update;

  if stable_app_user_id is null then
    insert into public.app_users (email, display_name, avatar_url)
    values (
      auth_record.email,
      coalesce(
        nullif(auth_record.raw_user_meta_data ->> 'full_name', ''),
        nullif(auth_record.raw_user_meta_data ->> 'name', ''),
        split_part(auth_record.email, '@', 1),
        'Chủ tiệc'
      ),
      coalesce(auth_record.raw_user_meta_data ->> 'avatar_url', auth_record.raw_user_meta_data ->> 'picture')
    )
    returning id into stable_app_user_id;
  end if;

  insert into public.auth_bindings (
    app_user_id,
    auth_user_id,
    provider,
    provider_subject
  )
  values (
    stable_app_user_id,
    auth_id,
    binding_provider,
    binding_subject
  )
  on conflict (auth_user_id) do update
    set last_seen_at = now();

  if raw_provider = 'custom:leminhtriet' then
    insert into public.external_identities (app_user_id, issuer, subject)
    values (stable_app_user_id, identity_issuer, identity_subject)
    on conflict (issuer, subject) do nothing;
  end if;

  return stable_app_user_id;
end
$$;

revoke all on function public.ensure_current_app_user() from public;
grant execute on function public.ensure_current_app_user() to authenticated, service_role;
