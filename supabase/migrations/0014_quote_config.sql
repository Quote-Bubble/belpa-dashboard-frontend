-- Service-first quote config per roofer (unique bubbles).
-- quote_config jsonb holds enabled services + per-service variables.
-- Legacy scalar/materials columns remain for dual-read during rollout.

alter table public.roofer_pricing
  add column if not exists quote_config jsonb;

comment on column public.roofer_pricing.quote_config is
  'Versioned QuoteConfig: enabledServices + per-service rates/access. Widget reads via GET /api/roofer.';

-- Soft shape check: null OR object with version = 1
alter table public.roofer_pricing
  drop constraint if exists roofer_pricing_quote_config_shape;

alter table public.roofer_pricing
  add constraint roofer_pricing_quote_config_shape
  check (
    quote_config is null
    or (
      jsonb_typeof(quote_config) = 'object'
      and (quote_config ? 'version')
      and (quote_config ->> 'version') = '1'
    )
  );

-- Optional embed origin allowlist (empty/null = allow all).
alter table public.roofers
  add column if not exists allowed_origins text[] not null default '{}';

comment on column public.roofers.allowed_origins is
  'If non-empty, GET /api/roofer may require Origin/Referer to match. Empty = unrestricted.';

-- Column grants: allow authenticated members/admins to write quote_config
grant insert (
  roofer_id, materials, labour_per_day, minimum_callout,
  skip_hire, scaffold_per_week, vat_registered, quote_config
) on public.roofer_pricing to authenticated;

grant update (
  materials, labour_per_day, minimum_callout,
  skip_hire, scaffold_per_week, vat_registered, quote_config
) on public.roofer_pricing to authenticated;

grant update (allowed_origins) on public.roofers to authenticated;
