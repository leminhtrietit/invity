create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.templates (
  id text primary key,
  name text not null,
  category text not null check (category in ('wedding', 'engagement', 'birthday_baby', 'graduation', 'other')),
  renderer_version integer not null check (renderer_version > 0),
  content_schema_version integer not null check (content_schema_version > 0),
  enabled_for_new boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_app_user_id uuid not null references public.app_users(id) on delete restrict,
  template_id text not null references public.templates(id) on delete restrict,
  category text not null check (category in ('wedding', 'engagement', 'birthday_baby', 'graduation', 'other')),
  lifecycle text not null default 'draft' check (lifecycle in ('draft', 'published', 'hidden', 'cancelled', 'archived', 'deleted')),
  public_code text not null default encode(extensions.gen_random_bytes(18), 'hex') unique,
  published_version_id uuid,
  first_published_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  rsvp_deadline timestamptz,
  companion_limit smallint not null default 3 check (companion_limit between 0 and 10),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (rsvp_deadline is null or ends_at is null or rsvp_deadline <= ends_at)
);

create index events_owner_lifecycle_idx on public.events (owner_app_user_id, lifecycle, created_at desc);

create table public.event_drafts (
  event_id uuid primary key references public.events(id) on delete cascade,
  revision integer not null default 1 check (revision > 0),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  updated_at timestamptz not null default now()
);

create table public.event_versions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  template_id text not null references public.templates(id) on delete restrict,
  renderer_version integer not null check (renderer_version > 0),
  content_schema_version integer not null check (content_schema_version > 0),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  og_storage_key text,
  created_at timestamptz not null default now(),
  unique (event_id, version_number),
  unique (id, event_id)
);

alter table public.events
  add constraint events_published_version_fk
  foreign key (published_version_id, id)
  references public.event_versions(id, event_id)
  deferrable initially deferred;

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  owner_app_user_id uuid not null references public.app_users(id) on delete cascade,
  kind text not null check (kind in ('cover', 'album', 'audio', 'og')),
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'ready', 'failed')),
  storage_key text not null unique,
  original_filename text,
  detected_mime_type text,
  byte_size bigint not null check (byte_size >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  variants jsonb not null default '{}'::jsonb check (jsonb_typeof(variants) = 'object'),
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'failed' or failure_code is not null)
);

create index media_assets_event_status_idx on public.media_assets (event_id, status);

create table public.plan_entitlements (
  plan_code text primary key,
  events_per_vietnam_month integer not null check (events_per_vietnam_month > 0),
  guest_slots_per_event integer not null check (guest_slots_per_event > 0),
  drafts_per_account integer not null check (drafts_per_account > 0),
  storage_bytes bigint not null check (storage_bytes > 0),
  updated_at timestamptz not null default now()
);

insert into public.plan_entitlements (
  plan_code, events_per_vietnam_month, guest_slots_per_event, drafts_per_account, storage_bytes
) values ('free', 1, 50, 3, 524288000);

create table public.publication_usage (
  id uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references public.app_users(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  vietnam_month date not null,
  created_at timestamptz not null default now(),
  unique (app_user_id, vietnam_month),
  unique (event_id),
  check (extract(day from vietnam_month) = 1)
);

create table public.event_quota_counters (
  event_id uuid primary key references public.events(id) on delete cascade,
  guest_slots_used integer not null default 0 check (guest_slots_used between 0 and 50),
  updated_at timestamptz not null default now()
);

create table public.guest_slots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  allocation_number integer not null check (allocation_number between 1 and 50),
  allocation_source text not null check (allocation_source in ('personalized', 'shared_rsvp')),
  display_name text not null check (char_length(display_name) between 2 and 100),
  salutation text check (salutation is null or char_length(salutation) <= 40),
  phone_canonical text check (phone_canonical is null or char_length(phone_canonical) between 7 and 20),
  guest_group text check (guest_group is null or char_length(guest_group) <= 80),
  owner_note text check (owner_note is null or char_length(owner_note) <= 1000),
  sent_at timestamptz,
  revoked_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, allocation_number)
);

create index guest_slots_event_active_idx on public.guest_slots (event_id, created_at desc)
  where revoked_at is null and deleted_at is null;
create index guest_slots_event_phone_idx on public.guest_slots (event_id, phone_canonical)
  where phone_canonical is not null;

create table public.invitation_tokens (
  id uuid primary key default gen_random_uuid(),
  guest_slot_id uuid not null references public.guest_slots(id) on delete cascade,
  token_hash text not null unique,
  token_ciphertext bytea,
  key_version smallint,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check ((token_ciphertext is null) = (key_version is null))
);

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  guest_slot_id uuid not null unique references public.guest_slots(id) on delete cascade,
  response text not null check (response in ('attending', 'declined')),
  companion_count smallint not null default 0 check (companion_count between 0 and 10),
  revision integer not null default 1 check (revision > 0),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (response <> 'declined' or companion_count = 0)
);

create table public.rsvp_edit_tokens (
  id uuid primary key default gen_random_uuid(),
  rsvp_id uuid not null references public.rsvps(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_slot_id uuid not null unique references public.guest_slots(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  consent_public boolean not null default false,
  moderation_status text not null default 'private' check (moderation_status in ('private', 'pending', 'approved', 'hidden')),
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (moderation_status <> 'approved' or consent_public)
);

create table public.gift_accounts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  bank_id text not null check (char_length(bank_id) between 2 and 30),
  account_number_ciphertext bytea not null,
  account_number_last4 text not null check (account_number_last4 ~ '^[0-9]{1,4}$'),
  account_name text not null check (char_length(account_name) between 2 and 120),
  position smallint not null check (position between 1 and 2),
  enabled boolean not null default true,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, position)
);

create table public.idempotency_requests (
  id uuid primary key default gen_random_uuid(),
  actor_key text not null,
  app_user_id uuid references public.app_users(id) on delete cascade,
  route text not null,
  idempotency_key uuid not null,
  payload_hash text not null check (char_length(payload_hash) between 32 and 128),
  completed boolean not null default false,
  response_status integer check (response_status between 100 and 599),
  response_body jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  unique (actor_key, route, idempotency_key),
  check (not completed or (response_status is not null and response_body is not null))
);

create index idempotency_expiry_idx on public.idempotency_requests (expires_at);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  available_at timestamptz not null default now(),
  locked_by text,
  locked_until timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'running' or (locked_by is not null and locked_until is not null))
);

create index jobs_claim_idx on public.jobs (status, available_at, created_at);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  event_id uuid references public.events(id) on delete set null,
  actor_type text not null check (actor_type in ('owner', 'guest', 'admin', 'worker', 'system')),
  actor_ref text,
  action text not null,
  request_id uuid not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index audit_logs_event_time_idx on public.audit_logs (event_id, created_at desc);

create table public.event_metrics_daily (
  event_id uuid not null references public.events(id) on delete cascade,
  metric_date date not null,
  invitation_opens integer not null default 0 check (invitation_opens >= 0),
  filtered_bot_opens integer not null default 0 check (filtered_bot_opens >= 0),
  primary key (event_id, metric_date)
);

create table public.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  reporter_contact text,
  reason text not null check (char_length(reason) between 3 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create or replace function public.vietnam_month_key(p_at timestamptz)
returns date
language sql immutable parallel safe set search_path = ''
as $$
  select date_trunc('month', p_at at time zone 'Asia/Ho_Chi_Minh')::date
$$;

revoke all on function public.vietnam_month_key(timestamptz) from public;
grant execute on function public.vietnam_month_key(timestamptz) to authenticated, service_role;

create or replace function private.is_event_owner(p_event_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and e.owner_app_user_id = (select public.current_app_user_id())
  )
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger templates_touch_updated_at before update on public.templates
for each row execute function private.touch_updated_at();
create trigger events_touch_updated_at before update on public.events
for each row execute function private.touch_updated_at();
create trigger media_assets_touch_updated_at before update on public.media_assets
for each row execute function private.touch_updated_at();
create trigger guest_slots_touch_updated_at before update on public.guest_slots
for each row execute function private.touch_updated_at();
create trigger rsvps_touch_updated_at before update on public.rsvps
for each row execute function private.touch_updated_at();
create trigger wishes_touch_updated_at before update on public.wishes
for each row execute function private.touch_updated_at();
create trigger gift_accounts_touch_updated_at before update on public.gift_accounts
for each row execute function private.touch_updated_at();
create trigger jobs_touch_updated_at before update on public.jobs
for each row execute function private.touch_updated_at();

create or replace function private.assert_event_child_ownership()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  expected_owner uuid;
begin
  select owner_app_user_id into expected_owner from public.events where id = new.event_id;
  if expected_owner is null or new.owner_app_user_id <> expected_owner then
    raise exception 'MEDIA_EVENT_OWNER_MISMATCH' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger media_assets_owner_check before insert or update on public.media_assets
for each row execute function private.assert_event_child_ownership();

create or replace function private.reject_event_version_mutation()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'EVENT_VERSION_IMMUTABLE' using errcode = '55000';
end
$$;

create trigger event_versions_immutable before update on public.event_versions
for each row execute function private.reject_event_version_mutation();

create or replace function private.assert_wish_event()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.guest_slots g where g.id = new.guest_slot_id and g.event_id = new.event_id
  ) then
    raise exception 'WISH_EVENT_MISMATCH' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger wishes_event_check before insert or update on public.wishes
for each row execute function private.assert_wish_event();

create or replace function private.assert_guest_companion_limit()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  allowed smallint;
begin
  select e.companion_limit into allowed
  from public.guest_slots g join public.events e on e.id = g.event_id
  where g.id = new.guest_slot_id;
  if allowed is null or new.companion_count > allowed then
    raise exception 'COMPANION_LIMIT_EXCEEDED' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger rsvps_companion_limit_check before insert or update on public.rsvps
for each row execute function private.assert_guest_companion_limit();

create or replace function private.begin_idempotency(
  p_actor_key text,
  p_app_user_id uuid,
  p_route text,
  p_key uuid,
  p_payload_hash text
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  inserted_id uuid;
  stored public.idempotency_requests;
begin
  if p_key is null or p_payload_hash is null or char_length(p_payload_hash) < 32 then
    raise exception 'INVALID_IDEMPOTENCY_INPUT' using errcode = '22023';
  end if;

  insert into public.idempotency_requests (actor_key, app_user_id, route, idempotency_key, payload_hash)
  values (p_actor_key, p_app_user_id, p_route, p_key, p_payload_hash)
  on conflict (actor_key, route, idempotency_key) do nothing
  returning id into inserted_id;

  if inserted_id is not null then
    return null;
  end if;

  select * into stored from public.idempotency_requests
  where actor_key = p_actor_key and route = p_route and idempotency_key = p_key
  for update;

  if stored.payload_hash <> p_payload_hash then
    raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
  end if;
  if not stored.completed then
    raise exception 'IDEMPOTENCY_IN_PROGRESS' using errcode = 'P0001';
  end if;
  return jsonb_build_object('status', stored.response_status, 'body', stored.response_body);
end
$$;

create or replace function private.complete_idempotency(
  p_actor_key text,
  p_route text,
  p_key uuid,
  p_status integer,
  p_body jsonb
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.idempotency_requests
  set completed = true, response_status = p_status, response_body = p_body
  where actor_key = p_actor_key and route = p_route and idempotency_key = p_key and not completed;
  if not found then
    raise exception 'IDEMPOTENCY_COMPLETION_MISSING' using errcode = 'P0001';
  end if;
end
$$;

create or replace function public.create_event_draft(
  p_template_id text,
  p_category text,
  p_idempotency_key uuid
)
returns table(event_id uuid, revision integer, replayed boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  app_id uuid := public.current_app_user_id();
  actor text;
  prior jsonb;
  new_event_id uuid;
  max_drafts integer;
  payload_hash text := encode(extensions.digest(jsonb_build_object(
    'templateId', p_template_id, 'eventCategory', p_category
  )::text, 'sha256'), 'hex');
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode = '28000'; end if;
  actor := 'owner:' || app_id::text;
  prior := private.begin_idempotency(actor, app_id, '/api/v1/events', p_idempotency_key, payload_hash);
  if prior is not null then
    return query select (prior #>> '{body,eventId}')::uuid, (prior #>> '{body,revision}')::integer, true;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('drafts:' || app_id::text, 0));
  select drafts_per_account into max_drafts from public.plan_entitlements where plan_code = 'free';
  if (select count(*) from public.events where owner_app_user_id = app_id and lifecycle = 'draft') >= max_drafts then
    raise exception 'DRAFT_LIMIT_EXCEEDED' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.templates where id = p_template_id and enabled_for_new) then
    raise exception 'TEMPLATE_NOT_AVAILABLE' using errcode = '22023';
  end if;
  if p_category not in ('wedding', 'engagement', 'birthday_baby', 'graduation', 'other') then
    raise exception 'INVALID_EVENT_CATEGORY' using errcode = '22023';
  end if;

  insert into public.events (owner_app_user_id, template_id, category)
  values (app_id, p_template_id, p_category) returning id into new_event_id;
  insert into public.event_drafts (event_id) values (new_event_id);
  insert into public.event_quota_counters (event_id) values (new_event_id);
  perform private.complete_idempotency(
    actor, '/api/v1/events', p_idempotency_key, 201,
    jsonb_build_object('eventId', new_event_id, 'revision', 1)
  );
  insert into public.audit_logs (event_id, actor_type, actor_ref, action, request_id)
  values (new_event_id, 'owner', app_id::text, 'event.draft_created', p_idempotency_key);
  return query select new_event_id, 1, false;
end
$$;

create or replace function public.save_event_draft(
  p_event_id uuid,
  p_expected_revision integer,
  p_content jsonb,
  p_idempotency_key uuid
)
returns table(revision integer, replayed boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  app_id uuid := public.current_app_user_id();
  actor text;
  route text := '/api/v1/events/' || p_event_id::text || '/draft';
  prior jsonb;
  next_revision integer;
  payload_hash text := encode(extensions.digest(jsonb_build_object(
    'eventId', p_event_id, 'expectedRevision', p_expected_revision, 'content', p_content
  )::text, 'sha256'), 'hex');
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode = '28000'; end if;
  if not private.is_event_owner(p_event_id) then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if jsonb_typeof(p_content) <> 'object' then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  actor := 'owner:' || app_id::text;
  prior := private.begin_idempotency(actor, app_id, route, p_idempotency_key, payload_hash);
  if prior is not null then
    return query select (prior #>> '{body,revision}')::integer, true;
    return;
  end if;

  update public.event_drafts
  set content = p_content, revision = event_drafts.revision + 1, updated_at = now()
  where event_id = p_event_id and event_drafts.revision = p_expected_revision
  returning event_drafts.revision into next_revision;
  if next_revision is null then raise exception 'REVISION_CONFLICT' using errcode = 'P0001'; end if;

  perform private.complete_idempotency(actor, route, p_idempotency_key, 200, jsonb_build_object('revision', next_revision));
  insert into public.audit_logs (event_id, actor_type, actor_ref, action, request_id, metadata)
  values (p_event_id, 'owner', app_id::text, 'event.draft_saved', p_idempotency_key, jsonb_build_object('revision', next_revision));
  return query select next_revision, false;
end
$$;

create or replace function public.allocate_personal_guest_slot(
  p_event_id uuid,
  p_display_name text,
  p_salutation text,
  p_guest_group text,
  p_owner_note text,
  p_idempotency_key uuid
)
returns table(guest_slot_id uuid, allocation_number integer, replayed boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  app_id uuid := public.current_app_user_id();
  actor text;
  route text := '/api/v1/events/' || p_event_id::text || '/guests';
  prior jsonb;
  next_number integer;
  new_guest_id uuid;
  payload_hash text := encode(extensions.digest(jsonb_build_object(
    'eventId', p_event_id, 'displayName', p_display_name, 'salutation', p_salutation,
    'guestGroup', p_guest_group, 'ownerNote', p_owner_note
  )::text, 'sha256'), 'hex');
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode = '28000'; end if;
  if not private.is_event_owner(p_event_id) then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if char_length(trim(p_display_name)) not between 2 and 100 then
    raise exception 'VALIDATION_ERROR' using errcode = '22023';
  end if;
  actor := 'owner:' || app_id::text;
  prior := private.begin_idempotency(actor, app_id, route, p_idempotency_key, payload_hash);
  if prior is not null then
    return query select (prior #>> '{body,guestSlotId}')::uuid, (prior #>> '{body,allocationNumber}')::integer, true;
    return;
  end if;

  update public.event_quota_counters
  set guest_slots_used = guest_slots_used + 1, updated_at = now()
  where event_id = p_event_id and guest_slots_used < 50
  returning guest_slots_used into next_number;
  if next_number is null then raise exception 'GUEST_QUOTA_EXCEEDED' using errcode = 'P0001'; end if;

  insert into public.guest_slots (
    event_id, allocation_number, allocation_source, display_name, salutation, guest_group, owner_note
  ) values (
    p_event_id, next_number, 'personalized', trim(p_display_name), nullif(trim(p_salutation), ''),
    nullif(trim(p_guest_group), ''), nullif(trim(p_owner_note), '')
  ) returning id into new_guest_id;

  perform private.complete_idempotency(
    actor, route, p_idempotency_key, 201,
    jsonb_build_object('guestSlotId', new_guest_id, 'allocationNumber', next_number)
  );
  insert into public.audit_logs (event_id, actor_type, actor_ref, action, request_id, metadata)
  values (p_event_id, 'owner', app_id::text, 'guest.slot_allocated', p_idempotency_key, jsonb_build_object('source', 'personalized'));
  return query select new_guest_id, next_number, false;
end
$$;

create or replace function public.activate_event_version(
  p_event_id uuid,
  p_version_id uuid,
  p_idempotency_key uuid
)
returns table(version_id uuid, first_publication boolean, replayed boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  app_id uuid := public.current_app_user_id();
  actor text;
  route text := '/api/v1/events/' || p_event_id::text || '/publish';
  prior jsonb;
  current_event public.events;
  is_first boolean;
  month_key date := public.vietnam_month_key(now());
  payload_hash text := encode(extensions.digest(jsonb_build_object(
    'eventId', p_event_id, 'versionId', p_version_id
  )::text, 'sha256'), 'hex');
begin
  if app_id is null then raise exception 'UNAUTHENTICATED' using errcode = '28000'; end if;
  actor := 'owner:' || app_id::text;
  prior := private.begin_idempotency(actor, app_id, route, p_idempotency_key, payload_hash);
  if prior is not null then
    return query select (prior #>> '{body,versionId}')::uuid, (prior #>> '{body,firstPublication}')::boolean, true;
    return;
  end if;

  select * into current_event from public.events where id = p_event_id for update;
  if current_event.id is null or current_event.owner_app_user_id <> app_id then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if current_event.lifecycle in ('cancelled', 'archived', 'deleted') then
    raise exception 'INVALID_EVENT_TRANSITION' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.event_versions where id = p_version_id and event_id = p_event_id) then
    raise exception 'EVENT_VERSION_NOT_FOUND' using errcode = 'P0002';
  end if;

  is_first := current_event.first_published_at is null;
  if is_first then
    begin
      insert into public.publication_usage (app_user_id, event_id, vietnam_month)
      values (app_id, p_event_id, month_key);
    exception when unique_violation then
      raise exception 'EVENT_QUOTA_EXCEEDED' using errcode = 'P0001';
    end;
  end if;

  update public.events set
    lifecycle = 'published',
    published_version_id = p_version_id,
    first_published_at = coalesce(first_published_at, now())
  where id = p_event_id;
  perform private.complete_idempotency(
    actor, route, p_idempotency_key, 200,
    jsonb_build_object('versionId', p_version_id, 'firstPublication', is_first)
  );
  insert into public.audit_logs (event_id, actor_type, actor_ref, action, request_id, metadata)
  values (p_event_id, 'owner', app_id::text, 'event.version_activated', p_idempotency_key,
    jsonb_build_object('versionId', p_version_id, 'firstPublication', is_first));
  return query select p_version_id, is_first, false;
end
$$;

create or replace function public.claim_jobs(p_worker_id text, p_limit integer default 10, p_lease_seconds integer default 60)
returns setof public.jobs
language plpgsql security definer set search_path = ''
as $$
begin
  if char_length(trim(p_worker_id)) < 3 or p_limit not between 1 and 50 or p_lease_seconds not between 10 and 900 then
    raise exception 'INVALID_JOB_CLAIM' using errcode = '22023';
  end if;
  update public.jobs set
    status = 'failed', locked_by = null, locked_until = null,
    last_error_code = coalesce(last_error_code, 'LEASE_EXPIRED_MAX_ATTEMPTS')
  where status = 'running' and locked_until < now() and attempts >= max_attempts;
  return query
  with candidates as (
    select id from public.jobs
    where attempts < max_attempts
      and available_at <= now()
      and (status = 'queued' or (status = 'running' and locked_until < now()))
    order by available_at, created_at
    for update skip locked
    limit p_limit
  )
  update public.jobs j set
    status = 'running', attempts = attempts + 1,
    locked_by = p_worker_id, locked_until = now() + make_interval(secs => p_lease_seconds)
  from candidates c where j.id = c.id
  returning j.*;
end
$$;

create or replace function public.finish_job(p_job_id uuid, p_worker_id text, p_succeeded boolean, p_error_code text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.jobs set
    status = case when p_succeeded then 'succeeded' when attempts >= max_attempts then 'failed' else 'queued' end,
    available_at = case when not p_succeeded and attempts < max_attempts then now() + make_interval(secs => least(300, 5 * attempts * attempts)) else available_at end,
    locked_by = null, locked_until = null,
    last_error_code = case when p_succeeded then null else coalesce(p_error_code, 'UNKNOWN') end
  where id = p_job_id and status = 'running' and locked_by = p_worker_id;
  if not found then raise exception 'JOB_LEASE_NOT_OWNED' using errcode = 'P0001'; end if;
end
$$;

alter table public.templates enable row level security;
alter table public.events enable row level security;
alter table public.event_drafts enable row level security;
alter table public.event_versions enable row level security;
alter table public.media_assets enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.publication_usage enable row level security;
alter table public.event_quota_counters enable row level security;
alter table public.guest_slots enable row level security;
alter table public.invitation_tokens enable row level security;
alter table public.rsvps enable row level security;
alter table public.rsvp_edit_tokens enable row level security;
alter table public.wishes enable row level security;
alter table public.gift_accounts enable row level security;
alter table public.idempotency_requests enable row level security;
alter table public.jobs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.event_metrics_daily enable row level security;
alter table public.abuse_reports enable row level security;

create policy templates_authenticated_read on public.templates for select to authenticated using (true);
create policy owner_events_read on public.events for select to authenticated
  using (owner_app_user_id = (select public.current_app_user_id()));
create policy owner_event_drafts_read on public.event_drafts for select to authenticated
  using (private.is_event_owner(event_id));
create policy owner_event_versions_read on public.event_versions for select to authenticated
  using (private.is_event_owner(event_id));
create policy owner_media_assets_read on public.media_assets for select to authenticated
  using (owner_app_user_id = (select public.current_app_user_id()) and private.is_event_owner(event_id));
create policy owner_publication_usage_read on public.publication_usage for select to authenticated
  using (app_user_id = (select public.current_app_user_id()));
create policy owner_event_quota_read on public.event_quota_counters for select to authenticated
  using (private.is_event_owner(event_id));
create policy owner_guest_slots_read on public.guest_slots for select to authenticated
  using (private.is_event_owner(event_id));
create policy owner_invitation_tokens_read on public.invitation_tokens for select to authenticated
  using (exists (select 1 from public.guest_slots g where g.id = guest_slot_id and private.is_event_owner(g.event_id)));
create policy owner_rsvps_read on public.rsvps for select to authenticated
  using (exists (select 1 from public.guest_slots g where g.id = guest_slot_id and private.is_event_owner(g.event_id)));
create policy owner_rsvp_edit_tokens_read on public.rsvp_edit_tokens for select to authenticated
  using (exists (
    select 1 from public.rsvps r join public.guest_slots g on g.id = r.guest_slot_id
    where r.id = rsvp_id and private.is_event_owner(g.event_id)
  ));
create policy owner_wishes_read on public.wishes for select to authenticated using (private.is_event_owner(event_id));
create policy owner_gift_accounts_read on public.gift_accounts for select to authenticated using (private.is_event_owner(event_id));
create policy owner_idempotency_read on public.idempotency_requests for select to authenticated
  using (app_user_id = (select public.current_app_user_id()));
create policy owner_metrics_read on public.event_metrics_daily for select to authenticated using (private.is_event_owner(event_id));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.templates, public.events, public.event_drafts, public.event_versions,
  public.media_assets, public.publication_usage, public.event_quota_counters, public.guest_slots,
  public.invitation_tokens, public.rsvps, public.rsvp_edit_tokens, public.wishes, public.gift_accounts,
  public.idempotency_requests, public.event_metrics_daily to authenticated;
grant select on public.app_users, public.auth_bindings, public.external_identities to authenticated;

revoke all on function public.create_event_draft(text, text, uuid) from public;
revoke all on function public.save_event_draft(uuid, integer, jsonb, uuid) from public;
revoke all on function public.allocate_personal_guest_slot(uuid, text, text, text, text, uuid) from public;
revoke all on function public.activate_event_version(uuid, uuid, uuid) from public;
revoke all on function public.claim_jobs(text, integer, integer) from public;
revoke all on function public.finish_job(uuid, text, boolean, text) from public;
grant execute on function public.create_event_draft(text, text, uuid) to authenticated;
grant execute on function public.save_event_draft(uuid, integer, jsonb, uuid) to authenticated;
grant execute on function public.allocate_personal_guest_slot(uuid, text, text, text, text, uuid) to authenticated;
grant execute on function public.activate_event_version(uuid, uuid, uuid) to authenticated;
grant execute on function public.claim_jobs(text, integer, integer) to service_role;
grant execute on function public.finish_job(uuid, text, boolean, text) to service_role;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_event_owner(uuid) to authenticated;
