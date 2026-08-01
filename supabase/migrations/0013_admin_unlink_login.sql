-- Unlink a login from a roofer + return user_id with member emails for the UI.

create or replace function public.admin_unlink_user_from_roofer(
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
  v_deleted int;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  select id into v_user_id from auth.users
  where lower(email) = lower(trim(p_email)) limit 1;
  if v_user_id is null then
    return 'not_found';
  end if;
  delete from public.roofer_members
  where roofer_id = p_roofer_id and user_id = v_user_id;
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    return 'not_linked';
  end if;
  return 'unlinked';
end;
$$;
revoke all on function public.admin_unlink_user_from_roofer(uuid, text) from public;
grant execute on function public.admin_unlink_user_from_roofer(uuid, text) to authenticated;

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
