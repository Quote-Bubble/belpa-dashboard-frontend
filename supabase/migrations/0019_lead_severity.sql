-- Photo-derived damage severity, plus the private bucket holding the photos
-- it was graded from.
--
-- Written by the backend (service role) from POST /api/severity; the dashboard
-- only reads it, so there is deliberately no `grant update` here — 0004 revoked
-- blanket UPDATE on leads and grants only (status, archived) to members, and
-- severity must stay outside that set.
--
-- Null means "no usable severity" and is the norm, not an error: the job type
-- never offered photos, the customer skipped them, the grader was unavailable,
-- or it returned low confidence. In every one of those cases the estimate was
-- priced exactly as it would have been with no photos at all.
--
-- Idempotent so it's safe whether applied via `supabase db push` or directly.

alter table public.leads add column if not exists severity smallint;

-- No backfill. Historical leads have no photos, so null is the honest value —
-- inventing a severity for them would corrupt the calibration data we intend
-- to derive from actual_price_ex_vat later.

alter table public.leads drop constraint if exists leads_severity_check;
alter table public.leads
  add constraint leads_severity_check
  check (severity is null or severity between 1 and 5);

-- ---------------------------------------------------------------------------
-- lead-photos bucket
-- ---------------------------------------------------------------------------
-- Private. These are photographs of a private individual's home, so they are
-- never served from a public URL — the dashboard mints short-lived signed URLs.

insert into storage.buckets (id, name, public)
values ('lead-photos', 'lead-photos', false)
on conflict (id) do update set public = false;

-- Paths are `{roofer_slug}/{submission_id}/{n}.jpg`, so the leading segment is
-- the tenant key. Note it is the SLUG, not leads.roofer_id: the widget only
-- ever knows the slug, and the backend resolves it to a uuid later inside
-- persistLead — by which point the photos have already been uploaded. Hence
-- the join through roofers rather than a `::uuid` cast, which would simply
-- error on a slug like "belpa-landing-demo".
--
-- This policy MUST mirror the leads select policy. Without the
-- is_roofer_member check, any authenticated roofer could read every other
-- roofer's customer photos.

drop policy if exists "lead_photos_select_member" on storage.objects;
create policy "lead_photos_select_member"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'lead-photos'
    and exists (
      select 1
      from public.roofers r
      where r.slug = (storage.foldername(name))[1]
        and public.is_roofer_member(r.id)
    )
  );

-- Writes are service-role only (the backend uploads before the lead exists).
-- No insert/update/delete policy for `authenticated` is intentional: with RLS
-- enabled and no permissive policy, those operations are denied.
