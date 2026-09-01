-- Let the cleaning job types actually be saved.
--
-- leads_job_type_known listed the six job types that existed when it was
-- written. The widget has offered soft wash, biocide treatment and gutter
-- clearing for a while, and the backend's lib/validate.ts accepts all three —
-- so they passed every check the application makes and then died at the
-- database with a 23514 check violation.
--
-- The lead route turns that into a 502, and the widget renders it as
-- "We couldn't send your details. Please try again." Trying again fails
-- identically. For a roofer selling nothing but cleaning, every single lead
-- was lost, silently, behind an error that reads like a temporary glitch.
--
-- It stayed invisible because the failure was logged through redact(), which
-- drops the message when a code is present (PostgrestError.details prints the
-- offending row, customer details included). That is the right call for
-- privacy, but it reduced the log line to "insert_failed" with no mention of a
-- constraint. logged-fetch.ts now also records the SQLSTATE and the constraint
-- name, both of which are facts about the schema rather than the customer.
--
-- This list must stay in step with VALID_JOB_TYPES in the backend's
-- lib/validate.ts and JOB_TYPE_OPTIONS in the widget's lib/quote-flow.ts.
-- tests/validate.test.ts guards the application half.

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
    'other'
  ]::text[])
);
