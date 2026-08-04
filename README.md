# quoter-dashboard-frontend

Roofer lead dashboard for Belpa. Next.js 16 + Tailwind, reading leads out of
Supabase under Row Level Security.

Related repos: `quoter-landing`, `quoter-widget-frontend`, `quoter-api-backend`.
Database: Supabase project `https://<YOUR_PROJECT_REF>.supabase.co`.

---

## Where this sits

```
Widget → POST /api/lead → quoter-api-backend → Supabase `leads`
                            (service role)          ↑
                                                    │ anon key + user session
                                          This repo ─┘  (RLS scopes the rows)
```

This repo is **read-side only**. It never writes leads and never uses the
service-role key — a logged-in user sees exactly the leads belonging to roofers
they're a member of, and Postgres enforces that, not the app code.

## Running locally

```bash
npm install
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL=https://<YOUR_PROJECT_REF>.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase>
npm run dev
```

## Access: link your user to a roofer

RLS scopes everything by `roofer_members`. A fresh signup belongs to no roofer
and will legitimately see **zero** leads — the dashboard now says so explicitly
and prints the SQL, rather than showing an empty table.

```sql
insert into public.roofer_members (roofer_id, user_id)
select r.id, '<your-auth-user-uuid>'::uuid
from public.roofers r
where r.slug = 'quoter-landing-demo'
on conflict do nothing;
```

## Migrations

Apply in order in the Supabase SQL Editor:

- `supabase/migrations/0001_init.sql` — roofers, roofer_members, leads, RLS.
  Already applied to the live project.
- `supabase/migrations/0002_roofer_pricing.sql` — per-roofer pricing + RLS.
  Already applied.
- `supabase/migrations/0003_leads_archived.sql` — `archived` column on leads.
  Already applied.
- `supabase/migrations/0004_column_grants.sql` — column-scoped UPDATE grants +
  audit triggers on leads / roofer_pricing. **Needs applying.**
- `supabase/migrations/0005_constraints.sql` — CHECK constraints on pricing
  numerics and leads.job_type / lead_type. **Needs applying.**
- `supabase/migrations/0006_analytics_events.sql` — analytics_events + RLS
  (no anon/authenticated policies). **Needs applying.**

## What's built

- **Auth** — Supabase email/password, session refresh + route gating in
  `src/middleware.ts`, server-side guard in `src/app/(app)/layout.tsx`.
- **Lead inbox** (`/quotes`) — newest first, with status filter, search and
  sort. Status changes persist optimistically with rollback on failure.
- **Lead detail** — expand a row for contact, property, and the survey figures
  from the lead's `payload` jsonb, which is fetched lazily per lead.
- **Roof plan** — `RoofPlan.tsx` draws the roof outline the customer actually
  drew, projected from `payload.polygonCoords`. No API key, no map tiles.
- **Account** (`/account`) — real company identity plus a pricing profile
  persisted to `roofer_pricing`.

## Known gaps

These are deliberate and surfaced in the UI rather than faked:

- **Per-roofer quote config is live.** `roofer_pricing.quote_config` stores
  enabled services + per-service variables; `GET /api/roofer` exposes them;
  the widget merges into its rate table. Admin Setup → Pricing is the call
  playbook; Account uses the same editor.
- **Roof markup is partial.** The widget keeps only the largest roof face and
  stores gutter/obstruction *totals*, not positions
  (`quoter-widget-frontend/lib/quote-flow.ts:532`). So the plan view draws one
  outline, and gutter length / chimney counts appear as figures beside it.
  Replaying the full drawing needs a widget payload change.
- **No distance or access rating.** Neither is stored anywhere; both were
  removed rather than shown as plausible-looking defaults.

## Out of scope

Changing `quoter-api-backend` lead persistence, touching the widget, Vercel team
invites, or using the service-role key in this repo.
