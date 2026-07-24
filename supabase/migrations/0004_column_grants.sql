-- Column-scoped grants + server-maintained audit columns.
-- RLS cannot restrict columns; without these GRANTs, authenticated members can
-- UPDATE every column on leads / roofer_pricing (quote amounts, payload, PII).

-- ---------------------------------------------------------------------------
-- leads: only status + archived are writable by members
-- ---------------------------------------------------------------------------

alter table public.leads
  add column if not exists updated_at timestamptz,
  add column if not exists updated_by uuid references auth.users (id);

create or replace function public.set_leads_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists leads_set_audit on public.leads;
create trigger leads_set_audit
  before update on public.leads
  for each row
  execute function public.set_leads_audit();

revoke update on public.leads from authenticated;
grant update (status, archived) on public.leads to authenticated;

-- ---------------------------------------------------------------------------
-- roofer_pricing: column grants + DB-owned updated_at / updated_by
-- ---------------------------------------------------------------------------

create or replace function public.set_roofer_pricing_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists roofer_pricing_set_audit on public.roofer_pricing;
create trigger roofer_pricing_set_audit
  before insert or update on public.roofer_pricing
  for each row
  execute function public.set_roofer_pricing_audit();

revoke insert, update on public.roofer_pricing from authenticated;

grant insert (
  roofer_id, materials, labour_per_day, minimum_callout,
  skip_hire, scaffold_per_week, vat_registered
) on public.roofer_pricing to authenticated;

grant update (
  materials, labour_per_day, minimum_callout,
  skip_hire, scaffold_per_week, vat_registered
) on public.roofer_pricing to authenticated;
