-- Lead intent tiering. Distinguishes a genuine quote request from someone who
-- just peeked at a price, so roofers only chase the genuinely interested.
-- Written by the backend (service role) on the widget's behalf; the dashboard
-- only reads it. See quoter-backend/lib/leads.ts and lib/types.ts (LeadIntent).
--
-- Idempotent so it's safe whether applied via `supabase db push` or directly.

alter table public.leads add column if not exists intent text;

-- Backfill: historical leads predate tiering. They came through the old flow,
-- which created the lead the moment someone submitted contact details (an
-- implicit "I want this"), so they're treated as genuine requests rather than
-- cold "priced only" — consultations as callbacks, everything else as quotes.
update public.leads
set intent = case
  when lead_type = 'manual_consultation' then 'callback_requested'
  else 'quote_requested'
end
where intent is null;

alter table public.leads alter column intent set default 'estimate_viewed';
alter table public.leads alter column intent set not null;

alter table public.leads drop constraint if exists leads_intent_check;
alter table public.leads
  add constraint leads_intent_check
  check (intent in ('estimate_viewed', 'quote_requested', 'callback_requested'));
