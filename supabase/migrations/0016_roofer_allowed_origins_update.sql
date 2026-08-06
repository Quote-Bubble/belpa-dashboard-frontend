-- Let a roofer manage their own embed domain allowlist.
--
-- 0014 added `allowed_origins` and a `grant update (allowed_origins)`, but no
-- RLS UPDATE policy for members — only SELECT (0001) and the admin catch-all
-- (0009). RLS denies by default, so that grant has been dead since it shipped
-- and a roofer could not write the column at all.
--
-- The obvious fix — an UPDATE policy scoped to is_roofer_member() — is WRONG,
-- and was applied and reverted while building this. `authenticated` does not
-- only hold UPDATE on allowed_origins; it holds it on every column of
-- public.roofers, including id, slug, name and deploy_status. RLS restricts
-- rows, never columns, so a member UPDATE policy would also let any roofer
-- rewrite their own slug and break or squat widget URLs.
--
-- Those grants can't just be revoked: admin console edits run as the signed-in
-- operator, who is also `authenticated`, and depend on them via
-- roofers_admin_all.
--
-- So members get no table UPDATE at all — one narrow function instead, which
-- can only ever touch allowed_origins on the caller's own roofer.

drop policy if exists "roofers_update_member" on public.roofers;

create or replace function public.set_allowed_origins(p_origins text[])
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_roofer_id uuid;
  v_clean text[];
begin
  -- Same membership check the SELECT policy uses.
  select r.id into v_roofer_id
  from public.roofers r
  where public.is_roofer_member(r.id)
  order by r.created_at
  limit 1;

  if v_roofer_id is null then
    raise exception 'Not linked to a roofer.' using errcode = '42501';
  end if;

  -- Scheme + host (+ optional port), never a path. The client normalises too,
  -- but a client is not a boundary: anything that isn't a bare origin would
  -- land straight in a frame-ancestors header and silently fail to match.
  select coalesce(array_agg(distinct o order by o), '{}')
  into v_clean
  from unnest(coalesce(p_origins, '{}'::text[])) as o
  where o ~ '^https?://[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:[0-9]{1,5})?$';

  if coalesce(array_length(v_clean, 1), 0) > 20 then
    raise exception 'Too many domains (max 20).' using errcode = '22023';
  end if;

  update public.roofers set allowed_origins = v_clean where id = v_roofer_id;
  return v_clean;
end;
$$;

-- `revoke ... from public` does NOT undo Supabase's default grant to anon, so
-- anon has to be revoked by name. It could not do anything useful either way
-- (no auth.uid() means the membership lookup finds nothing and it raises), but
-- it should not be reachable.
revoke all on function public.set_allowed_origins(text[]) from public;
revoke all on function public.set_allowed_origins(text[]) from anon;
grant execute on function public.set_allowed_origins(text[]) to authenticated;

comment on column public.roofers.allowed_origins is
  'Embed domain allowlist. Empty = the widget may be framed anywhere (the '
  'default, so a fresh install works before setup). Non-empty = the widget '
  'route serves frame-ancestors naming exactly these origins, which the '
  'BROWSER enforces. Only constrains framing: the hosted /l/<slug> link is a '
  'top-level page and stays reachable by anyone holding the URL, which is the '
  'point of the QR code.';
