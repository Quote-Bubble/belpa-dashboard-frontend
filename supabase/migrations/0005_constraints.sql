-- Sanity CHECKs on pricing numerics / materials jsonb, and constrained
-- job_type / lead_type on leads (status is already a lead_status enum).

-- ---------------------------------------------------------------------------
-- roofer_pricing
-- ---------------------------------------------------------------------------

alter table public.roofer_pricing
  drop constraint if exists roofer_pricing_labour_per_day_range,
  drop constraint if exists roofer_pricing_minimum_callout_range,
  drop constraint if exists roofer_pricing_skip_hire_range,
  drop constraint if exists roofer_pricing_scaffold_per_week_range,
  drop constraint if exists roofer_pricing_materials_shape;

alter table public.roofer_pricing
  add constraint roofer_pricing_labour_per_day_range
    check (labour_per_day is null or (labour_per_day >= 0 and labour_per_day <= 10000)),
  add constraint roofer_pricing_minimum_callout_range
    check (minimum_callout is null or (minimum_callout >= 0 and minimum_callout <= 50000)),
  add constraint roofer_pricing_skip_hire_range
    check (skip_hire is null or (skip_hire >= 0 and skip_hire <= 10000)),
  add constraint roofer_pricing_scaffold_per_week_range
    check (scaffold_per_week is null or (scaffold_per_week >= 0 and scaffold_per_week <= 50000)),
  add constraint roofer_pricing_materials_shape
    check (
      jsonb_typeof(materials) = 'array'
      and pg_column_size(materials) < 8192
    );

-- ---------------------------------------------------------------------------
-- leads: job_type / lead_type
-- ---------------------------------------------------------------------------

alter table public.leads
  drop constraint if exists leads_job_type_known,
  drop constraint if exists leads_lead_type_known;

alter table public.leads
  add constraint leads_job_type_known
    check (
      job_type is null
      or job_type in (
        'full_replacement',
        'tile_or_slate_repair',
        'flat_roof_replacement',
        'leak_investigation',
        'gutters_fascias_soffits',
        'other'
      )
    ),
  add constraint leads_lead_type_known
    check (
      lead_type is null
      or lead_type in ('quote', 'manual_consultation')
    );
