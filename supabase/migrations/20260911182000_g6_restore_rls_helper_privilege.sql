-- G6 revokes private helper execution by default. RLS owner policies invoke this
-- single reviewed helper as the authenticated role, so restore its narrow grant.
grant usage on schema private to authenticated;
grant execute on function private.is_event_owner(uuid) to authenticated;
