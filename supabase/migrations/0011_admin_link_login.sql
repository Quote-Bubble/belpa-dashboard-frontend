-- Operators link a roofer's login (by email) to their roofer record, so the
-- roofer sees their leads. Security-definer + is_admin() gated, so no
-- service-role key is needed in the dashboard. Applied via the MCP.

create or replace function public.admin_link_user_to_roofer(
  p_roofer_id uuid,
  p_email text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  select id into v_user_id from auth.users
  where lower(email) = lower(trim(p_email)) limit 1;
  if v_user_id is null then
    return 'not_found';
  end if;
  insert into public.roofer_members (roofer_id, user_id)
  values (p_roofer_id, v_user_id)
  on conflict do nothing;
  return 'linked';
end;
$$;
revoke all on function public.admin_link_user_to_roofer(uuid, text) from public;
grant execute on function public.admin_link_user_to_roofer(uuid, text) to authenticated;

create or replace function public.admin_roofer_members(p_roofer_id uuid)
returns table (email text)
language sql
security definer
set search_path = public
as $$
  select u.email::text
  from public.roofer_members m
  join auth.users u on u.id = m.user_id
  where m.roofer_id = p_roofer_id and public.is_admin();
$$;
revoke all on function public.admin_roofer_members(uuid) from public;
grant execute on function public.admin_roofer_members(uuid) to authenticated;
