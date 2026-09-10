create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $$
begin
  if exists (
    select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pgcrypto' and n.nspname <> 'extensions'
  ) then
    alter extension pgcrypto set schema extensions;
  end if;
end
$$;

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text not null,
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'suspended', 'deletion_requested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.auth_bindings (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider = 'google'),
  provider_subject text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (auth_user_id),
  unique (provider, provider_subject)
);

create table public.external_identities (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  issuer text not null,
  subject text not null,
  created_at timestamptz not null default now(),
  unique (issuer, subject)
);

alter table public.app_users enable row level security;
alter table public.auth_bindings enable row level security;
alter table public.external_identities enable row level security;

create or replace function public.current_app_user_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select b.app_user_id
  from public.auth_bindings b
  join public.app_users u on u.id = b.app_user_id
  where b.auth_user_id = (select auth.uid()) and u.status = 'active'
  limit 1
$$;

revoke all on function public.current_app_user_id() from public;
grant execute on function public.current_app_user_id() to authenticated;

create policy "owners can read their profile" on public.app_users
for select to authenticated using (id = (select public.current_app_user_id()));
create policy "owners can read their auth binding" on public.auth_bindings
for select to authenticated using (app_user_id = (select public.current_app_user_id()));
create policy "owners can read their external identities" on public.external_identities
for select to authenticated using (app_user_id = (select public.current_app_user_id()));

create or replace function public.ensure_current_app_user()
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  auth_id uuid := auth.uid();
  auth_record auth.users;
  binding public.auth_bindings;
  stable_app_user_id uuid;
  subject text;
begin
  if auth_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  -- Serialize first-time bootstrap requests for the same Supabase identity.
  perform pg_advisory_xact_lock(hashtextextended(auth_id::text, 0));

  select * into auth_record from auth.users where id = auth_id;
  if auth_record.id is null or coalesce(auth_record.raw_app_meta_data ->> 'provider', '') <> 'google' then
    raise exception 'google identity required' using errcode = '28000';
  end if;

  if auth_record.email is null or auth_record.email = '' then
    raise exception 'verified email required' using errcode = '22023';
  end if;

  select * into binding from public.auth_bindings where auth_user_id = auth_id for update;
  if binding.id is not null then
    if not exists (select 1 from public.app_users where id = binding.app_user_id and status = 'active') then
      raise exception 'account is not active' using errcode = '28000';
    end if;
    update public.app_users set
      email = coalesce(auth_record.email, email),
      display_name = coalesce(nullif(auth_record.raw_user_meta_data ->> 'full_name', ''), nullif(auth_record.raw_user_meta_data ->> 'name', ''), display_name),
      avatar_url = coalesce(auth_record.raw_user_meta_data ->> 'avatar_url', avatar_url),
      updated_at = now()
    where id = binding.app_user_id;
    update public.auth_bindings set last_seen_at = now() where id = binding.id;
    return binding.app_user_id;
  end if;

  select coalesce(identity_data ->> 'sub', provider_id)
    into subject
    from auth.identities
    where user_id = auth_id and provider = 'google'
    order by created_at asc
    limit 1;
  if subject is null then
    raise exception 'provider subject missing' using errcode = '22023';
  end if;

  select app_user_id into stable_app_user_id from public.auth_bindings
  where provider = 'google' and provider_subject = subject for update;

  if stable_app_user_id is null then
    insert into public.app_users (email, display_name, avatar_url)
    values (
      auth_record.email,
      coalesce(nullif(auth_record.raw_user_meta_data ->> 'full_name', ''), nullif(auth_record.raw_user_meta_data ->> 'name', ''), 'Chủ tiệc'),
      auth_record.raw_user_meta_data ->> 'avatar_url'
    ) returning id into stable_app_user_id;
  end if;

  insert into public.auth_bindings (app_user_id, auth_user_id, provider, provider_subject)
  values (stable_app_user_id, auth_id, 'google', subject)
  on conflict (auth_user_id) do update set last_seen_at = now();

  return stable_app_user_id;
end
$$;

revoke all on function public.ensure_current_app_user() from public;
grant execute on function public.ensure_current_app_user() to authenticated;
grant select on public.app_users, public.auth_bindings, public.external_identities to authenticated;
