-- Manual approval for new signups.
--
-- Signup is open — anyone can create an account — but onboarding is done by
-- hand, so an account that nobody asked for should not reach the dashboard.
-- Two strangers signed up on 2026-08-11 and both landed in the app.
--
-- This records a decision per user and gates the app on it. Closing signup
-- outright was the alternative, but a roofer being walked through setup on the
-- phone still needs to be able to create their own account — the answer is a
-- gate, not a locked door.

create table if not exists public.signup_reviews (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  status      text not null check (status in ('approved', 'denied')),
  reviewed_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null
);

alter table public.signup_reviews enable row level security;

-- No policies: only the SECURITY DEFINER functions below touch this table, and
-- they run as the owner. RLS on with zero policies denies anon/authenticated
-- outright, which is exactly right — nobody should read or write their own
-- approval state directly.

-- There is deliberately no 'pending' status. Absence of a row IS pending, so
-- a new signup needs no row created for it and cannot arrive half-reviewed.

-- Grandfather everyone who was already legitimately in: linked to a roofer, or
-- an admin. Without this the migration locks out the existing users, including
-- whoever runs it.
insert into public.signup_reviews (user_id, status)
select distinct u.id, 'approved'
from auth.users u
where exists (select 1 from public.roofer_members m where m.user_id = u.id)
   or exists (select 1 from public.admins a where a.user_id = u.id)
on conflict (user_id) do nothing;

/**
 * Can the calling user use the dashboard?
 *
 * Order matters. A denial always wins, so revoking access cannot be undone by
 * someone later linking that user to a roofer. Below that, roofer membership
 * counts as approval on its own: an admin linking a login to a roofer is the
 * approval act, and requiring a second click elsewhere is how someone ends up
 * locked out of a workspace an admin believes they granted.
 */
create or replace function public.is_approved()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case
    when public.is_admin() then true
    when exists (
      select 1 from public.signup_reviews
      where user_id = auth.uid() and status = 'denied'
    ) then false
    when exists (
      select 1 from public.roofer_members where user_id = auth.uid()
    ) then true
    when exists (
      select 1 from public.signup_reviews
      where user_id = auth.uid() and status = 'approved'
    ) then true
    else false
  end;
$$;
revoke all on function public.is_approved() from public, anon;
grant execute on function public.is_approved() to authenticated;

/**
 * Every signup with its review state, for the admin console.
 *
 * SECURITY DEFINER because auth.users is not readable by `authenticated` —
 * same reason admin_roofer_members exists.
 */
create or replace function public.admin_list_signups()
returns table (
  user_id       uuid,
  email         text,
  created_at    timestamptz,
  last_sign_in  timestamptz,
  status        text,
  roofers       text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    coalesce(sr.status, 'pending') as status,
    (
      select string_agg(r.name, ', ' order by r.name)
      from public.roofer_members m
      join public.roofers r on r.id = m.roofer_id
      where m.user_id = u.id
    ) as roofers
  from auth.users u
  left join public.signup_reviews sr on sr.user_id = u.id
  where public.is_admin()          -- empty result rather than an error for non-admins
  order by u.created_at desc;
$$;
revoke all on function public.admin_list_signups() from public, anon;
grant execute on function public.admin_list_signups() to authenticated;

/**
 * Approve or deny a signup. Passing 'pending' clears the decision.
 */
create or replace function public.admin_set_signup_status(
  p_user_id uuid,
  p_status  text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  -- An admin denying themselves would lock the console behind a decision only
  -- that console can change.
  if p_user_id = auth.uid() then
    raise exception 'cannot review your own account';
  end if;

  if p_status = 'pending' then
    delete from public.signup_reviews where user_id = p_user_id;
    return 'pending';
  end if;

  if p_status not in ('approved', 'denied') then
    raise exception 'invalid status';
  end if;

  insert into public.signup_reviews (user_id, status, reviewed_at, reviewed_by)
  values (p_user_id, p_status, now(), auth.uid())
  on conflict (user_id) do update
    set status = excluded.status,
        reviewed_at = now(),
        reviewed_by = excluded.reviewed_by;

  return p_status;
end;
$$;
revoke all on function public.admin_set_signup_status(uuid, text) from public, anon;
grant execute on function public.admin_set_signup_status(uuid, text) to authenticated;
