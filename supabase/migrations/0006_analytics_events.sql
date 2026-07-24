-- Funnel analytics sink used by quoter-backend POST /api/event.
-- Service role bypasses RLS; anon/authenticated get no policies → no access.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  roofer_slug text,
  session_id text,
  source_url text,
  request_origin text,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_roofer_slug_created_at_idx
  on public.analytics_events (roofer_slug, created_at desc);

alter table public.analytics_events enable row level security;

-- No policies for anon or authenticated. Writes use the service role.
