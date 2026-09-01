-- Add driveway_cleaning to the job type constraint.
--
-- Applied in the same change as the widget and backend that emit it, rather
-- than after. Migration 0021 exists because the cleaning job types were shipped
-- to the widget and the API without this list being updated: they passed every
-- application check and then died at the database on a 23514, which the route
-- turned into a 502 and the widget showed as "we couldn't send your details".
-- A roofer selling only cleaning lost every lead until it was found.
--
-- This list must stay in step with VALID_JOB_TYPES in the backend's
-- lib/validate.ts and JOB_TYPE_OPTIONS in the widget's lib/quote-flow.ts.
-- The backend's tests/validate.test.ts guards the application half.

alter table public.leads drop constraint if exists leads_job_type_known;

alter table public.leads add constraint leads_job_type_known check (
  job_type is null
  or job_type = any (array[
    'full_replacement',
    'tile_or_slate_repair',
    'flat_roof_replacement',
    'leak_investigation',
    'gutters_fascias_soffits',
    'roof_soft_wash',
    'roof_biocide_treatment',
    'gutter_clearing',
    'driveway_cleaning',
    'other'
  ]::text[])
);
