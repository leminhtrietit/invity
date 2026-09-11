create or replace function public.claim_media_jobs(
  p_worker_id text,
  p_limit integer default 3,
  p_lease_seconds integer default 120
)
returns setof public.jobs
language plpgsql security definer set search_path = ''
as $$
begin
  if char_length(trim(p_worker_id)) < 3 or p_limit not between 1 and 10 or p_lease_seconds not between 30 and 900 then
    raise exception 'INVALID_JOB_CLAIM' using errcode = '22023';
  end if;
  update public.jobs set
    status = 'failed', locked_by = null, locked_until = null,
    last_error_code = coalesce(last_error_code, 'LEASE_EXPIRED_MAX_ATTEMPTS')
  where kind = 'media.process' and status = 'running' and locked_until < now() and attempts >= max_attempts;
  return query
  with candidates as (
    select id from public.jobs
    where kind = 'media.process'
      and attempts < max_attempts
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

revoke execute on function public.claim_media_jobs(text, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_media_jobs(text, integer, integer) to service_role;
