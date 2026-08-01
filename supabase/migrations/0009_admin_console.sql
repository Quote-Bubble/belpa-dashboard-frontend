-- Admin ops console: an admin allowlist, roofer deployment fields, and admin RLS.
-- Applied to the live project via the MCP on setup.

-- 1) Admin allowlist + is_admin() helper -----------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

drop policy if exists "admins_select_self" on public.admins;
create policy "admins_select_self"
  on public.admins
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 2) Roofer deployment/ops fields -----------------------------------------
alter table public.roofers
  add column if not exists website text,
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists deploy_status text not null default 'prospect'
    check (deploy_status in ('prospect', 'sent', 'live'));

-- 3) Admin RLS (additive to the existing member policies) -----------------
drop policy if exists "roofers_admin_all" on public.roofers;
create policy "roofers_admin_all"
  on public.roofers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "roofer_members_admin_all" on public.roofer_members;
create policy "roofer_members_admin_all"
  on public.roofer_members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "roofer_pricing_admin_all" on public.roofer_pricing;
create policy "roofer_pricing_admin_all"
  on public.roofer_pricing for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "leads_admin_select" on public.leads;
create policy "leads_admin_select"
  on public.leads for select to authenticated
  using (public.is_admin());

-- 4) Seed the founders as admins ------------------------------------------
insert into public.admins (user_id)
select id from auth.users
where email in ('bobpattack@gmail.com', 'mogonlac@yahoo.com')
on conflict do nothing;
